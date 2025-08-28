/**
 * VAPID-based Push Notification Service
 * 
 * This service handles all push notification functionality including:
 * - VAPID key generation and management
 * - Push subscription management
 * - Notification sending with Web Push Protocol
 * - Delivery tracking and analytics
 * - Rate limiting and security
 */

import webpush from 'web-push';
import { type PrismaClient } from '@prisma/client';
import { TRPCError } from '@trpc/server';

// Types
export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, any>;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  requireInteraction?: boolean;
  silent?: boolean;
  vibrate?: number[];
  timestamp?: number;
}

export interface NotificationOptions {
  userId: string;
  type: 'DUE_CARDS' | 'STREAK_PROTECTION' | 'MILESTONE' | 'DECK_SPECIFIC';
  payload: NotificationPayload;
  scheduleId?: string;
  deckId?: string;
  priority?: 'low' | 'normal' | 'high';
  ttl?: number; // Time to live in seconds
}

/**
 * Push Notification Service Class
 */
export class PushNotificationService {
  private db: PrismaClient;
  private vapidKeys: { publicKey: string; privateKey: string } | null = null;

  constructor(db: PrismaClient) {
    this.db = db;
    this.initializeVapid();
  }

  /**
   * Initialize VAPID configuration
   */
  private initializeVapid() {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT || process.env.NEXTAUTH_URL || 'mailto:admin@anki.app';

    if (!publicKey || !privateKey) {
      console.warn('[Push] VAPID keys not configured. Push notifications will not work.');
      return;
    }

    this.vapidKeys = { publicKey, privateKey };

    webpush.setVapidDetails(
      subject,
      publicKey,
      privateKey
    );

    console.log('[Push] VAPID configuration initialized');
  }

  /**
   * Get VAPID public key for client-side subscription
   */
  getVapidPublicKey(): string {
    if (!this.vapidKeys) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'VAPID keys not configured'
      });
    }
    return this.vapidKeys.publicKey;
  }

  /**
   * Subscribe user to push notifications
   */
  async subscribeUser(
    userId: string, 
    subscription: PushSubscriptionData,
    userAgent?: string
  ): Promise<{ success: boolean; subscriptionId: string }> {
    try {
      // Check if subscription already exists
      const existingSubscription = await this.db.pushSubscription.findUnique({
        where: { endpoint: subscription.endpoint }
      });

      if (existingSubscription) {
        // Update existing subscription
        const updatedSubscription = await this.db.pushSubscription.update({
          where: { id: existingSubscription.id },
          data: {
            auth: subscription.keys.auth,
            p256dh: subscription.keys.p256dh,
            userAgent,
            isActive: true,
            lastUsedAt: new Date()
          }
        });

        return { success: true, subscriptionId: updatedSubscription.id };
      }

      // Create new subscription
      const newSubscription = await this.db.pushSubscription.create({
        data: {
          userId,
          endpoint: subscription.endpoint,
          auth: subscription.keys.auth,
          p256dh: subscription.keys.p256dh,
          userAgent,
          isActive: true
        }
      });

      console.log(`[Push] User ${userId} subscribed to push notifications`);
      return { success: true, subscriptionId: newSubscription.id };

    } catch (error) {
      console.error('[Push] Failed to subscribe user:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create push subscription'
      });
    }
  }

  /**
   * Unsubscribe user from push notifications
   */
  async unsubscribeUser(userId: string, endpoint: string): Promise<{ success: boolean }> {
    try {
      await this.db.pushSubscription.updateMany({
        where: {
          userId,
          endpoint
        },
        data: {
          isActive: false
        }
      });

      console.log(`[Push] User ${userId} unsubscribed from push notifications`);
      return { success: true };

    } catch (error) {
      console.error('[Push] Failed to unsubscribe user:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to unsubscribe from push notifications'
      });
    }
  }

  /**
   * Send push notification to a specific user
   */
  async sendNotification(options: NotificationOptions): Promise<{
    success: boolean;
    sentCount: number;
    failedCount: number;
  }> {
    if (!this.vapidKeys) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Push notifications not configured'
      });
    }

    const { userId, type, payload, scheduleId, deckId, priority = 'normal', ttl = 86400 } = options;

    try {
      // Get user's active push subscriptions
      const subscriptions = await this.db.pushSubscription.findMany({
        where: {
          userId,
          isActive: true
        }
      });

      if (subscriptions.length === 0) {
        console.log(`[Push] No active subscriptions found for user ${userId}`);
        return { success: true, sentCount: 0, failedCount: 0 };
      }

      let sentCount = 0;
      let failedCount = 0;

      // Send to all user's subscriptions
      for (const subscription of subscriptions) {
        try {
          const pushSubscription = {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth
            }
          };

          const pushOptions = {
            TTL: ttl,
            urgency: priority,
            topic: type.toLowerCase(),
            headers: {
              'Content-Encoding': 'gzip'
            }
          };

          // Send the notification
          await webpush.sendNotification(
            pushSubscription,
            JSON.stringify(payload),
            pushOptions
          );

          // Log successful delivery
          await this.logNotification({
            userId,
            subscriptionId: subscription.id,
            type,
            status: 'SENT',
            title: payload.title,
            body: payload.body,
            data: payload.data,
            deckId,
            scheduleId,
            sentAt: new Date()
          });

          sentCount++;
          console.log(`[Push] Notification sent to user ${userId}, subscription ${subscription.id}`);

        } catch (error) {
          failedCount++;
          console.error(`[Push] Failed to send notification to subscription ${subscription.id}:`, error);

          // Handle different types of errors
          if (error instanceof webpush.WebPushError) {
            // Handle specific push errors
            if (error.statusCode === 410 || error.statusCode === 404) {
              // Subscription is no longer valid, deactivate it
              await this.db.pushSubscription.update({
                where: { id: subscription.id },
                data: { isActive: false }
              });
              console.log(`[Push] Deactivated invalid subscription ${subscription.id}`);
            }
          }

          // Log failed delivery
          await this.logNotification({
            userId,
            subscriptionId: subscription.id,
            type,
            status: 'FAILED',
            title: payload.title,
            body: payload.body,
            data: payload.data,
            deckId,
            scheduleId,
            failedAt: new Date(),
            errorMessage: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      return { success: true, sentCount, failedCount };

    } catch (error) {
      console.error('[Push] Failed to send notifications:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to send push notifications'
      });
    }
  }

  /**
   * Send notification to multiple users
   */
  async sendBulkNotifications(
    notifications: NotificationOptions[]
  ): Promise<{
    success: boolean;
    totalSent: number;
    totalFailed: number;
    results: Array<{ userId: string; sent: number; failed: number }>
  }> {
    const results = [];
    let totalSent = 0;
    let totalFailed = 0;

    for (const notification of notifications) {
      try {
        const result = await this.sendNotification(notification);
        results.push({
          userId: notification.userId,
          sent: result.sentCount,
          failed: result.failedCount
        });
        totalSent += result.sentCount;
        totalFailed += result.failedCount;
      } catch (error) {
        console.error(`[Push] Bulk notification failed for user ${notification.userId}:`, error);
        results.push({
          userId: notification.userId,
          sent: 0,
          failed: 1
        });
        totalFailed += 1;
      }
    }

    return {
      success: true,
      totalSent,
      totalFailed,
      results
    };
  }

  /**
   * Test notification delivery to verify subscription
   */
  async sendTestNotification(userId: string): Promise<{ success: boolean }> {
    const testPayload: NotificationPayload = {
      title: 'Test Notification',
      body: 'Your Anki notifications are working correctly! 🎉',
      icon: '/icon-192x192.png',
      badge: '/icon-72x72.png',
      tag: 'test-notification',
      data: { test: true },
      requireInteraction: false
    };

    const result = await this.sendNotification({
      userId,
      type: 'MILESTONE',
      payload: testPayload,
      priority: 'low',
      ttl: 3600 // 1 hour
    });

    return { success: result.sentCount > 0 };
  }

  /**
   * Get user's active subscriptions
   */
  async getUserSubscriptions(userId: string) {
    return await this.db.pushSubscription.findMany({
      where: {
        userId,
        isActive: true
      },
      select: {
        id: true,
        endpoint: true,
        userAgent: true,
        createdAt: true,
        lastUsedAt: true
      }
    });
  }

  /**
   * Clean up inactive subscriptions
   */
  async cleanupInactiveSubscriptions(daysInactive = 30): Promise<{ cleanedCount: number }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysInactive);

    const result = await this.db.pushSubscription.deleteMany({
      where: {
        OR: [
          { isActive: false },
          { lastUsedAt: { lt: cutoffDate } }
        ]
      }
    });

    console.log(`[Push] Cleaned up ${result.count} inactive subscriptions`);
    return { cleanedCount: result.count };
  }

  /**
   * Log notification delivery
   */
  private async logNotification(data: {
    userId: string;
    subscriptionId: string;
    type: 'DUE_CARDS' | 'STREAK_PROTECTION' | 'MILESTONE' | 'DECK_SPECIFIC';
    status: 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | 'CANCELLED';
    title: string;
    body: string;
    data?: Record<string, any>;
    deckId?: string;
    scheduleId?: string;
    sentAt?: Date;
    deliveredAt?: Date;
    failedAt?: Date;
    errorMessage?: string;
  }) {
    try {
      await this.db.notificationLog.create({
        data: {
          userId: data.userId,
          subscriptionId: data.subscriptionId,
          type: data.type,
          status: data.status,
          title: data.title,
          body: data.body,
          data: data.data ? JSON.stringify(data.data) : undefined,
          deckId: data.deckId,
          scheduleId: data.scheduleId,
          sentAt: data.sentAt,
          deliveredAt: data.deliveredAt,
          failedAt: data.failedAt,
          errorMessage: data.errorMessage
        }
      });
    } catch (error) {
      console.error('[Push] Failed to log notification:', error);
    }
  }

  /**
   * Get notification analytics for a user
   */
  async getNotificationAnalytics(
    userId: string,
    period: 'daily' | 'weekly' | 'monthly' = 'weekly'
  ) {
    const periodStart = new Date();
    const periodEnd = new Date();

    switch (period) {
      case 'daily':
        periodStart.setHours(0, 0, 0, 0);
        break;
      case 'weekly':
        periodStart.setDate(periodStart.getDate() - 7);
        break;
      case 'monthly':
        periodStart.setMonth(periodStart.getMonth() - 1);
        break;
    }

    const logs = await this.db.notificationLog.findMany({
      where: {
        userId,
        createdAt: {
          gte: periodStart,
          lte: periodEnd
        }
      }
    });

    const analytics = {
      totalSent: logs.filter(log => log.status === 'SENT').length,
      totalDelivered: logs.filter(log => log.status === 'DELIVERED').length,
      totalFailed: logs.filter(log => log.status === 'FAILED').length,
      byType: {} as Record<string, number>,
      deliveryRate: 0
    };

    // Calculate by type
    logs.forEach(log => {
      analytics.byType[log.type] = (analytics.byType[log.type] || 0) + 1;
    });

    // Calculate delivery rate
    if (analytics.totalSent > 0) {
      analytics.deliveryRate = (analytics.totalDelivered / analytics.totalSent) * 100;
    }

    return analytics;
  }
}

/**
 * Generate VAPID keys for setup
 */
export function generateVapidKeys() {
  const vapidKeys = webpush.generateVAPIDKeys();
  
  console.log('VAPID Keys Generated:');
  console.log('Public Key:', vapidKeys.publicKey);
  console.log('Private Key:', vapidKeys.privateKey);
  console.log('\nAdd these to your .env file:');
  console.log(`VAPID_PUBLIC_KEY="${vapidKeys.publicKey}"`);
  console.log(`VAPID_PRIVATE_KEY="${vapidKeys.privateKey}"`);
  console.log(`VAPID_SUBJECT="mailto:your-email@domain.com"`);
  
  return vapidKeys;
}

// Helper function to create notification payloads
export const NotificationTemplates = {
  dueCards: (cardCount: number, deckName?: string): NotificationPayload => ({
    title: `📚 Time to Study!`,
    body: deckName 
      ? `You have ${cardCount} cards due in ${deckName}` 
      : `You have ${cardCount} cards ready for review`,
    icon: '/icon-192x192.png',
    badge: '/icon-72x72.png',
    tag: 'due-cards',
    data: { type: 'due_cards', cardCount, deckName },
    actions: [
      { action: 'study-now', title: 'Study Now', icon: '/icons/study-action.png' },
      { action: 'remind-later', title: 'Remind Later', icon: '/icons/remind-action.png' }
    ],
    requireInteraction: true,
    vibrate: [200, 100, 200]
  }),

  streakProtection: (currentStreak: number): NotificationPayload => ({
    title: `🔥 Protect Your Streak!`,
    body: `Don't break your ${currentStreak}-day study streak. Quick review?`,
    icon: '/icon-192x192.png',
    badge: '/icon-72x72.png',
    tag: 'streak-protection',
    data: { type: 'streak_protection', currentStreak },
    actions: [
      { action: 'study-now', title: 'Study Now', icon: '/icons/study-action.png' },
      { action: 'remind-later', title: 'Later', icon: '/icons/remind-action.png' }
    ],
    requireInteraction: true,
    vibrate: [200, 100, 200, 100, 200]
  }),

  milestone: (milestone: number, type: 'streak' | 'reviews' | 'mastered'): NotificationPayload => ({
    title: `🎉 Milestone Achieved!`,
    body: `Congratulations! You've reached ${milestone} ${type === 'streak' ? 'days' : type === 'reviews' ? 'reviews' : 'mastered cards'}!`,
    icon: '/icon-192x192.png',
    badge: '/icon-72x72.png',
    tag: 'milestone',
    data: { type: 'milestone', milestone, milestoneType: type },
    requireInteraction: false,
    vibrate: [200, 100, 200, 100, 200, 100, 200]
  }),

  deckSpecific: (deckName: string, cardCount: number, threshold: number): NotificationPayload => ({
    title: `📖 ${deckName}`,
    body: `${cardCount} cards are due (${cardCount >= threshold ? 'high priority' : 'ready for review'})`,
    icon: '/icon-192x192.png',
    badge: '/icon-72x72.png',
    tag: `deck-${deckName.toLowerCase().replace(/\s+/g, '-')}`,
    data: { type: 'deck_specific', deckName, cardCount, threshold },
    actions: [
      { action: 'study-now', title: 'Study Deck', icon: '/icons/study-action.png' },
      { action: 'remind-later', title: 'Later', icon: '/icons/remind-action.png' }
    ],
    requireInteraction: true,
    vibrate: [200, 100, 200]
  })
};