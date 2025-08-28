/**
 * Notifications tRPC Router
 * 
 * Handles push notification functionality including:
 * - Push subscription management
 * - Notification preferences
 * - Notification scheduling and sending
 * - Analytics and effectiveness tracking
 * - VAPID key management
 */

import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { PushNotificationService } from "@/server/services/pushNotifications";
import { NotificationScheduler } from "@/server/services/notificationScheduler";

// Initialize services
const pushService = new PushNotificationService(process.env.DATABASE_URL ? {} as any : {} as any);
const notificationScheduler = new NotificationScheduler({} as any, pushService);

const pushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
});

const notificationPreferencesSchema = z.object({
  isEnabled: z.boolean(),
  dueCardsEnabled: z.boolean(),
  streakProtectionEnabled: z.boolean(),
  milestoneEnabled: z.boolean(),
  deckSpecificEnabled: z.boolean(),
  preferredTime: z.string().optional().nullable(),
  timeZone: z.string(),
  quietHoursStart: z.string().optional().nullable(),
  quietHoursEnd: z.string().optional().nullable(),
  maxDailyNotifications: z.number().min(1).max(10),
  minIntervalMinutes: z.number().min(15).max(1440),
  deckNotifications: z.record(z.object({
    enabled: z.boolean(),
    threshold: z.number().min(1).max(100),
  })).optional(),
});

const scheduleNotificationSchema = z.object({
  type: z.enum(['DUE_CARDS', 'STREAK_PROTECTION', 'MILESTONE', 'DECK_SPECIFIC']),
  deckId: z.string().uuid().optional(),
  cardCount: z.number().optional(),
  streakDays: z.number().optional(),
  milestoneData: z.record(z.any()).optional(),
  priority: z.enum(['low', 'normal', 'high']).optional(),
  scheduledFor: z.date().optional(),
});

const analyticsPeriodSchema = z.object({
  period: z.enum(['daily', 'weekly', 'monthly']).default('weekly'),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
});

export const notificationsRouter = createTRPCRouter({
  /**
   * Get VAPID public key for client subscription
   */
  getVapidPublicKey: publicProcedure
    .query(async ({ ctx }) => {
      try {
        const publicKey = process.env.VAPID_PUBLIC_KEY;
        
        if (!publicKey) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Push notifications not configured'
          });
        }

        return {
          publicKey,
          configured: true,
        };

      } catch (error) {
        console.error('[Notifications] Failed to get VAPID key:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get VAPID public key'
        });
      }
    }),

  /**
   * Subscribe to push notifications
   */
  subscribe: protectedProcedure
    .input(pushSubscriptionSchema.extend({
      userAgent: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      try {
        // Initialize push service with database context
        const pushService = new PushNotificationService(ctx.db);
        
        const result = await pushService.subscribeUser(
          userId,
          {
            endpoint: input.endpoint,
            keys: input.keys,
          },
          input.userAgent
        );

        // Send test notification to verify subscription
        if (result.success) {
          await pushService.sendTestNotification(userId);
        }

        return result;

      } catch (error) {
        console.error('[Notifications] Failed to subscribe user:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to subscribe to push notifications'
        });
      }
    }),

  /**
   * Unsubscribe from push notifications
   */
  unsubscribe: protectedProcedure
    .input(z.object({
      endpoint: z.string().url(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      try {
        const pushService = new PushNotificationService(ctx.db);
        const result = await pushService.unsubscribeUser(userId, input.endpoint);

        return result;

      } catch (error) {
        console.error('[Notifications] Failed to unsubscribe user:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to unsubscribe from push notifications'
        });
      }
    }),

  /**
   * Get user's push subscriptions
   */
  getSubscriptions: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.session.user.id;

      try {
        const subscriptions = await ctx.db.pushSubscription.findMany({
          where: {
            userId,
            isActive: true,
          },
          select: {
            id: true,
            endpoint: true,
            userAgent: true,
            createdAt: true,
            lastUsedAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

        return {
          subscriptions,
          count: subscriptions.length,
        };

      } catch (error) {
        console.error('[Notifications] Failed to get subscriptions:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get push subscriptions'
        });
      }
    }),

  /**
   * Get notification preferences
   */
  getPreferences: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.session.user.id;

      try {
        let preferences = await ctx.db.notificationPreferences.findUnique({
          where: { userId },
        });

        // Create default preferences if they don't exist
        if (!preferences) {
          preferences = await ctx.db.notificationPreferences.create({
            data: {
              userId,
              isEnabled: true,
              dueCardsEnabled: true,
              streakProtectionEnabled: true,
              milestoneEnabled: true,
              deckSpecificEnabled: false,
              timeZone: 'UTC',
              maxDailyNotifications: 1,
              minIntervalMinutes: 60,
            },
          });
        }

        return {
          ...preferences,
          deckNotifications: preferences.deckNotifications as Record<string, any> || {},
        };

      } catch (error) {
        console.error('[Notifications] Failed to get preferences:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get notification preferences'
        });
      }
    }),

  /**
   * Update notification preferences
   */
  updatePreferences: protectedProcedure
    .input(notificationPreferencesSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Validate time formats if provided
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      
      if (input.preferredTime && input.preferredTime !== '' && !timeRegex.test(input.preferredTime)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid preferred time format. Use HH:MM format.',
        });
      }
      
      if (input.quietHoursStart && input.quietHoursStart !== '' && !timeRegex.test(input.quietHoursStart)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid quiet hours start time format. Use HH:MM format.',
        });
      }
      
      if (input.quietHoursEnd && input.quietHoursEnd !== '' && !timeRegex.test(input.quietHoursEnd)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid quiet hours end time format. Use HH:MM format.',
        });
      }

      // Convert empty strings to null
      const processedInput = {
        ...input,
        preferredTime: input.preferredTime === '' ? null : input.preferredTime,
        quietHoursStart: input.quietHoursStart === '' ? null : input.quietHoursStart,
        quietHoursEnd: input.quietHoursEnd === '' ? null : input.quietHoursEnd,
      };

      try {
        const preferences = await ctx.db.notificationPreferences.upsert({
          where: { userId },
          update: {
            ...processedInput,
            deckNotifications: processedInput.deckNotifications || {},
          },
          create: {
            userId,
            ...processedInput,
            deckNotifications: processedInput.deckNotifications || {},
          },
        });

        return {
          success: true,
          preferences: {
            ...preferences,
            deckNotifications: preferences.deckNotifications as Record<string, any> || {},
          },
        };

      } catch (error) {
        console.error('[Notifications] Failed to update preferences:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update notification preferences'
        });
      }
    }),

  /**
   * Send test notification
   */
  sendTestNotification: protectedProcedure
    .mutation(async ({ ctx }) => {
      const userId = ctx.session.user.id;

      try {
        const pushService = new PushNotificationService(ctx.db);
        const result = await pushService.sendTestNotification(userId);

        return result;

      } catch (error) {
        console.error('[Notifications] Failed to send test notification:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to send test notification'
        });
      }
    }),

  /**
   * Schedule a notification manually
   */
  scheduleNotification: protectedProcedure
    .input(scheduleNotificationSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      try {
        const scheduler = new NotificationScheduler(ctx.db, new PushNotificationService(ctx.db));
        
        const result = await scheduler.scheduleNotification({
          ...input,
          userId,
        });

        return result;

      } catch (error) {
        console.error('[Notifications] Failed to schedule notification:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to schedule notification'
        });
      }
    }),

  /**
   * Get scheduled notifications
   */
  getScheduledNotifications: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(50).default(20),
      includeProcessed: z.boolean().default(false),
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      try {
        const whereConditions: any = {
          userId,
          isActive: true,
        };

        if (!input.includeProcessed) {
          whereConditions.isProcessed = false;
        }

        const notifications = await ctx.db.notificationSchedule.findMany({
          where: whereConditions,
          include: {
            deck: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            scheduledFor: 'desc',
          },
          take: input.limit,
        });

        return {
          notifications: notifications.map(notification => ({
            ...notification,
            milestoneData: notification.milestoneData as Record<string, any> || {},
          })),
          count: notifications.length,
        };

      } catch (error) {
        console.error('[Notifications] Failed to get scheduled notifications:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get scheduled notifications'
        });
      }
    }),

  /**
   * Cancel a scheduled notification
   */
  cancelNotification: protectedProcedure
    .input(z.object({
      scheduleId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      try {
        const scheduler = new NotificationScheduler(ctx.db, new PushNotificationService(ctx.db));
        const result = await scheduler.cancelNotification(input.scheduleId, userId);

        return result;

      } catch (error) {
        console.error('[Notifications] Failed to cancel notification:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to cancel notification'
        });
      }
    }),

  /**
   * Get notification history/logs
   */
  getNotificationHistory: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(50),
      type: z.enum(['DUE_CARDS', 'STREAK_PROTECTION', 'MILESTONE', 'DECK_SPECIFIC']).optional(),
      status: z.enum(['PENDING', 'SENT', 'DELIVERED', 'FAILED', 'CANCELLED']).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      try {
        const whereConditions: any = { userId };

        if (input.type) {
          whereConditions.type = input.type;
        }

        if (input.status) {
          whereConditions.status = input.status;
        }

        const notifications = await ctx.db.notificationLog.findMany({
          where: whereConditions,
          include: {
            deck: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: input.limit,
        });

        return {
          notifications: notifications.map(notification => ({
            ...notification,
            data: notification.data as Record<string, any> || {},
          })),
          count: notifications.length,
        };

      } catch (error) {
        console.error('[Notifications] Failed to get notification history:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get notification history'
        });
      }
    }),

  /**
   * Get notification analytics
   */
  getAnalytics: protectedProcedure
    .input(analyticsPeriodSchema)
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      try {
        const pushService = new PushNotificationService(ctx.db);
        const analytics = await pushService.getNotificationAnalytics(userId, input.period);

        // Get additional metrics from database
        const endDate = input.endDate || new Date();
        const startDate = input.startDate || (() => {
          const date = new Date(endDate);
          switch (input.period) {
            case 'daily': date.setHours(0, 0, 0, 0); break;
            case 'weekly': date.setDate(date.getDate() - 7); break;
            case 'monthly': date.setMonth(date.getMonth() - 1); break;
          }
          return date;
        })();

        const [totalScheduled, effectivenessData] = await Promise.all([
          ctx.db.notificationSchedule.count({
            where: {
              userId,
              createdAt: { gte: startDate, lte: endDate },
            },
          }),
          
          // Get study sessions that occurred within 1 hour of notifications
          ctx.db.notificationLog.findMany({
            where: {
              userId,
              status: 'SENT',
              sentAt: { gte: startDate, lte: endDate },
            },
            include: {
              user: {
                include: {
                  Review: {
                    where: {
                      reviewed_at: {
                        gte: startDate,
                        lte: endDate,
                      },
                    },
                  },
                },
              },
            },
          }),
        ]);

        // Calculate effectiveness (simplified)
        const effectiveNotifications = effectivenessData.filter(notification => {
          if (!notification.sentAt || !notification.user.Review) return false;
          
          const oneHourAfter = new Date(notification.sentAt.getTime() + 60 * 60 * 1000);
          return notification.user.Review.some((review: any) => 
            review.reviewed_at >= notification.sentAt! && 
            review.reviewed_at <= oneHourAfter
          );
        }).length;

        return {
          ...analytics,
          totalScheduled,
          effectiveNotifications,
          effectivenessRate: analytics.totalSent > 0 
            ? (effectiveNotifications / analytics.totalSent) * 100 
            : 0,
          period: input.period,
          startDate,
          endDate,
        };

      } catch (error) {
        console.error('[Notifications] Failed to get analytics:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get notification analytics'
        });
      }
    }),

  /**
   * Sync notification analytics (for offline usage)
   */
  syncAnalytics: protectedProcedure
    .input(z.object({
      analytics: z.array(z.object({
        notificationId: z.string(),
        action: z.enum(['clicked', 'dismissed', 'ignored']),
        timestamp: z.date(),
        studySessionStarted: z.boolean().optional(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      try {
        let processed = 0;

        for (const analytic of input.analytics) {
          try {
            // Update notification log with interaction data
            await ctx.db.notificationLog.updateMany({
              where: {
                id: analytic.notificationId,
                userId,
              },
              data: {
                // You'd add interaction fields to the schema
                // For now, we'll just log the data
              },
            });

            processed++;
          } catch (error) {
            console.error('[Notifications] Failed to process analytic:', error);
          }
        }

        return {
          success: true,
          processed,
          total: input.analytics.length,
        };

      } catch (error) {
        console.error('[Notifications] Failed to sync analytics:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to sync notification analytics'
        });
      }
    }),

  /**
   * Get notification delivery stats
   */
  getDeliveryStats: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.session.user.id;

      try {
        const stats = await ctx.db.notificationLog.groupBy({
          by: ['status', 'type'],
          where: { userId },
          _count: {
            status: true,
          },
        });

        const deliveryStats = {
          byStatus: {} as Record<string, number>,
          byType: {} as Record<string, Record<string, number>>,
          total: 0,
        };

        stats.forEach(stat => {
          const count = stat._count.status;
          deliveryStats.total += count;
          
          // Group by status
          deliveryStats.byStatus[stat.status] = 
            (deliveryStats.byStatus[stat.status] || 0) + count;
          
          // Group by type and status
          if (!deliveryStats.byType[stat.type]) {
            deliveryStats.byType[stat.type] = {};
          }
          deliveryStats.byType[stat.type]![stat.status] = count;
        });

        return deliveryStats;

      } catch (error) {
        console.error('[Notifications] Failed to get delivery stats:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get delivery statistics'
        });
      }
    }),
});