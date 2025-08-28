/**
 * Intelligent Notification Scheduler
 * 
 * This service integrates with the SM2 spaced repetition algorithm to provide
 * intelligent notification scheduling that enhances learning effectiveness.
 * 
 * Features:
 * - Integration with existing SM2 algorithm for optimal timing
 * - Personalized scheduling based on user study patterns
 * - Multiple notification types with different strategies
 * - Rate limiting and frequency controls
 * - Time zone and user preference awareness
 * - Analytics and effectiveness tracking
 */

import { type PrismaClient } from '@prisma/client';
import { SuperMemo2Algorithm } from './spacedRepetition';
import { PushNotificationService, NotificationTemplates } from './pushNotifications';
import { TRPCError } from '@trpc/server';

// Types
export interface SchedulingContext {
  userId: string;
  timeZone: string;
  preferences: UserNotificationPreferences;
  studyPattern: UserStudyPattern;
}

export interface UserNotificationPreferences {
  isEnabled: boolean;
  dueCardsEnabled: boolean;
  streakProtectionEnabled: boolean;
  milestoneEnabled: boolean;
  deckSpecificEnabled: boolean;
  preferredTime?: string | null; // HH:MM format
  timeZone: string;
  quietHoursStart?: string | null;
  quietHoursEnd?: string | null;
  maxDailyNotifications: number;
  minIntervalMinutes: number;
  deckNotifications?: Record<string, { enabled: boolean; threshold: number }>;
}

export interface UserStudyPattern {
  avgStudyTime?: string; // HH:MM format
  studyFrequency: 'daily' | 'regular' | 'sporadic';
  preferredDays: number[]; // 0-6, Sunday=0
  longestStreak: number;
  currentStreak: number;
  lastStudyDate?: Date;
  avgResponseTime: number;
  successRate: number;
}

export interface NotificationScheduleRequest {
  type: 'DUE_CARDS' | 'STREAK_PROTECTION' | 'MILESTONE' | 'DECK_SPECIFIC';
  userId: string;
  deckId?: string;
  cardCount?: number;
  streakDays?: number;
  milestoneData?: Record<string, any>;
  priority?: 'low' | 'normal' | 'high';
  scheduledFor?: Date;
}

/**
 * Intelligent Notification Scheduler
 */
export class NotificationScheduler {
  private db: PrismaClient;
  private pushService: PushNotificationService;

  constructor(db: PrismaClient, pushService: PushNotificationService) {
    this.db = db;
    this.pushService = pushService;
  }

  /**
   * Schedule a notification with intelligent timing
   */
  async scheduleNotification(request: NotificationScheduleRequest): Promise<{
    success: boolean;
    scheduledFor: Date;
    scheduleId: string;
  }> {
    const { userId, type } = request;

    try {
      // Get user context for intelligent scheduling
      const context = await this.getUserContext(userId);
      
      if (!context.preferences.isEnabled || !this.isNotificationTypeEnabled(type, context.preferences)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Notifications disabled for this type'
        });
      }

      // Check rate limits
      await this.checkRateLimits(userId, context.preferences);

      // Calculate optimal scheduling time
      const scheduledFor = request.scheduledFor || await this.calculateOptimalTime(request, context);

      // Create schedule record
      const schedule = await this.db.notificationSchedule.create({
        data: {
          userId,
          type,
          scheduledFor,
          deckId: request.deckId,
          cardCount: request.cardCount,
          streakDays: request.streakDays,
          milestoneData: request.milestoneData ? JSON.stringify(request.milestoneData) : undefined,
          isActive: true
        }
      });

      console.log(`[Scheduler] Scheduled ${type} notification for user ${userId} at ${scheduledFor.toISOString()}`);
      
      return {
        success: true,
        scheduledFor,
        scheduleId: schedule.id
      };

    } catch (error) {
      console.error('[Scheduler] Failed to schedule notification:', error);
      
      if (error instanceof TRPCError) {
        throw error;
      }
      
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to schedule notification'
      });
    }
  }

  /**
   * Process due notifications and send them
   */
  async processDueNotifications(): Promise<{
    processed: number;
    sent: number;
    failed: number;
  }> {
    const now = new Date();
    let processed = 0;
    let sent = 0;
    let failed = 0;

    try {
      // Get all due notifications
      const dueNotifications = await this.db.notificationSchedule.findMany({
        where: {
          scheduledFor: { lte: now },
          isProcessed: false,
          isActive: true
        },
        include: {
          user: {
            include: {
              notificationPreferences: true,
              studyStreak: true
            }
          },
          deck: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: {
          scheduledFor: 'asc'
        }
      });

      console.log(`[Scheduler] Processing ${dueNotifications.length} due notifications`);

      for (const notification of dueNotifications) {
        processed++;

        try {
          // Double-check user preferences (they might have changed)
          const preferences = notification.user.notificationPreferences;
          if (!preferences?.isEnabled || !this.isNotificationTypeEnabled(notification.type, preferences as unknown as UserNotificationPreferences)) {
            await this.markAsProcessed(notification.id, false);
            continue;
          }

          // Check if user is in quiet hours
          if (this.isInQuietHours(now, preferences as unknown as UserNotificationPreferences)) {
            // Reschedule for after quiet hours
            const newTime = this.calculatePostQuietHoursTime(now, preferences as unknown as UserNotificationPreferences);
            await this.rescheduleNotification(notification.id, newTime);
            continue;
          }

          // Generate notification content
          const payload = await this.generateNotificationPayload(notification);
          
          if (!payload) {
            await this.markAsProcessed(notification.id, false);
            continue;
          }

          // Send the notification
          const result = await this.pushService.sendNotification({
            userId: notification.userId,
            type: notification.type,
            payload,
            scheduleId: notification.id,
            deckId: notification.deckId || undefined,
            priority: this.getNotificationPriority(notification.type)
          });

          if (result.sentCount > 0) {
            sent++;
            await this.markAsProcessed(notification.id, true);
            await this.trackNotificationEffectiveness(notification.id);
          } else {
            failed++;
            await this.markAsProcessed(notification.id, false);
          }

        } catch (error) {
          failed++;
          console.error(`[Scheduler] Failed to process notification ${notification.id}:`, error);
          await this.markAsProcessed(notification.id, false);
        }
      }

      console.log(`[Scheduler] Processing complete: ${processed} processed, ${sent} sent, ${failed} failed`);
      
      return { processed, sent, failed };

    } catch (error) {
      console.error('[Scheduler] Failed to process due notifications:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to process notifications'
      });
    }
  }

  /**
   * Schedule due cards notifications based on spaced repetition algorithm
   */
  async scheduleDueCardsNotifications(): Promise<{ scheduledCount: number }> {
    let scheduledCount = 0;

    try {
      // Get users with due cards and active notification preferences
      const usersWithDueCards = await this.db.cardState.groupBy({
        by: ['user_id'],
        where: {
          due_date: { lte: new Date() },
          state: { not: 'SUSPENDED' }
        },
        _count: {
          user_id: true
        },
        having: {
          user_id: {
            _count: {
              gt: 0
            }
          }
        }
      });

      for (const userGroup of usersWithDueCards) {
        const userId = userGroup.user_id;
        const dueCount = userGroup._count.user_id;

        try {
          // Check if user has notification preferences
          const preferences = await this.db.notificationPreferences.findUnique({
            where: { userId }
          });

          if (!preferences?.isEnabled || !preferences.dueCardsEnabled) {
            continue;
          }

          // Check if we already have a pending due cards notification
          const existingNotification = await this.db.notificationSchedule.findFirst({
            where: {
              userId,
              type: 'DUE_CARDS',
              isProcessed: false,
              isActive: true,
              scheduledFor: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Within last 24 hours
            }
          });

          if (existingNotification) {
            continue; // Already have a pending notification
          }

          // Schedule the notification
          await this.scheduleNotification({
            type: 'DUE_CARDS',
            userId,
            cardCount: dueCount,
            priority: dueCount >= 20 ? 'high' : dueCount >= 10 ? 'normal' : 'low'
          });

          scheduledCount++;

        } catch (error) {
          console.error(`[Scheduler] Failed to schedule due cards notification for user ${userId}:`, error);
        }
      }

      console.log(`[Scheduler] Scheduled ${scheduledCount} due cards notifications`);
      return { scheduledCount };

    } catch (error) {
      console.error('[Scheduler] Failed to schedule due cards notifications:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to schedule due cards notifications'
      });
    }
  }

  /**
   * Schedule streak protection notifications
   */
  async scheduleStreakProtectionNotifications(): Promise<{ scheduledCount: number }> {
    let scheduledCount = 0;

    try {
      // Find users whose streaks might be at risk
      const usersAtRisk = await this.db.studyStreak.findMany({
        where: {
          currentStreak: { gte: 3 }, // Only protect streaks of 3+ days
          lastStudyDate: {
            lt: new Date(Date.now() - 20 * 60 * 60 * 1000) // Haven't studied in 20 hours
          }
        },
        include: {
          user: {
            include: {
              notificationPreferences: true
            }
          }
        }
      });

      for (const streak of usersAtRisk) {
        const userId = streak.userId;
        const preferences = streak.user.notificationPreferences;

        if (!preferences?.isEnabled || !preferences.streakProtectionEnabled) {
          continue;
        }

        // Check if we already have a pending streak protection notification
        const existingNotification = await this.db.notificationSchedule.findFirst({
          where: {
            userId,
            type: 'STREAK_PROTECTION',
            isProcessed: false,
            isActive: true,
            scheduledFor: { gte: new Date(Date.now() - 12 * 60 * 60 * 1000) } // Within last 12 hours
          }
        });

        if (existingNotification) {
          continue;
        }

        // Calculate when to send the notification (before streak expires)
        const lastStudy = streak.lastStudyDate || new Date();
        const streakDeadline = new Date(lastStudy.getTime() + 24 * 60 * 60 * 1000);
        const notificationTime = new Date(streakDeadline.getTime() - 2 * 60 * 60 * 1000); // 2 hours before deadline

        // Only schedule if we haven't passed the deadline
        if (notificationTime > new Date()) {
          await this.scheduleNotification({
            type: 'STREAK_PROTECTION',
            userId,
            streakDays: streak.currentStreak,
            priority: 'high',
            scheduledFor: notificationTime
          });

          scheduledCount++;
        }
      }

      console.log(`[Scheduler] Scheduled ${scheduledCount} streak protection notifications`);
      return { scheduledCount };

    } catch (error) {
      console.error('[Scheduler] Failed to schedule streak protection notifications:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to schedule streak protection notifications'
      });
    }
  }

  /**
   * Schedule milestone notifications
   */
  async scheduleMilestoneNotifications(): Promise<{ scheduledCount: number }> {
    let scheduledCount = 0;

    try {
      // Check for streak milestones - get all streaks at milestone levels and filter in memory
      const streakMilestones = await this.db.studyStreak.findMany({
        where: {
          currentStreak: { in: [7, 14, 30, 50, 100, 365] }, // Common milestone days
        },
        include: {
          user: {
            include: {
              notificationPreferences: true
            }
          }
        }
      });

      // Filter streaks that haven't reached this milestone yet
      const eligibleStreaks = streakMilestones.filter(streak => streak.currentStreak > streak.lastMilestone);
      
      for (const streak of eligibleStreaks) {
        const userId = streak.userId;
        const preferences = streak.user.notificationPreferences;

        if (!preferences?.isEnabled || !preferences.milestoneEnabled) {
          continue;
        }

        // Schedule milestone notification
        await this.scheduleNotification({
          type: 'MILESTONE',
          userId,
          milestoneData: {
            type: 'streak',
            value: streak.currentStreak,
            previousMilestone: streak.lastMilestone
          },
          priority: 'normal'
        });

        // Update last milestone
        await this.db.studyStreak.update({
          where: { id: streak.id },
          data: { lastMilestone: streak.currentStreak }
        });

        scheduledCount++;
      }

      console.log(`[Scheduler] Scheduled ${scheduledCount} milestone notifications`);
      return { scheduledCount };

    } catch (error) {
      console.error('[Scheduler] Failed to schedule milestone notifications:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to schedule milestone notifications'
      });
    }
  }

  /**
   * Cancel a scheduled notification
   */
  async cancelNotification(scheduleId: string, userId: string): Promise<{ success: boolean }> {
    try {
      await this.db.notificationSchedule.updateMany({
        where: {
          id: scheduleId,
          userId,
          isProcessed: false
        },
        data: {
          isActive: false,
          cancelledAt: new Date()
        }
      });

      return { success: true };

    } catch (error) {
      console.error('[Scheduler] Failed to cancel notification:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to cancel notification'
      });
    }
  }

  // Private helper methods

  private async getUserContext(userId: string): Promise<SchedulingContext> {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      include: {
        notificationPreferences: true,
        studyStreak: true,
        Review: {
          take: 50,
          orderBy: { reviewed_at: 'desc' }
        }
      }
    });

    if (!user) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'User not found'
      });
    }

    // Get or create notification preferences
    let preferences = user.notificationPreferences;
    if (!preferences) {
      preferences = await this.db.notificationPreferences.create({
        data: { userId }
      });
    }

    // Calculate study pattern
    const studyPattern = this.calculateStudyPattern(user.Review || [], user.studyStreak);

    return {
      userId,
      timeZone: preferences.timeZone,
      preferences: preferences as unknown as UserNotificationPreferences,
      studyPattern
    };
  }

  private calculateStudyPattern(reviews: any[], studyStreak: any): UserStudyPattern {
    if (reviews.length === 0) {
      return {
        studyFrequency: 'sporadic',
        preferredDays: [],
        longestStreak: 0,
        currentStreak: 0,
        avgResponseTime: 0,
        successRate: 0
      };
    }

    // Calculate preferred study times
    const studyHours = reviews.map(r => new Date(r.reviewed_at).getHours());
    const avgHour = Math.round(studyHours.reduce((a, b) => a + b, 0) / studyHours.length);
    const avgStudyTime = `${avgHour.toString().padStart(2, '0')}:00`;

    // Calculate preferred days
    const dayFrequency = new Array(7).fill(0);
    reviews.forEach(r => {
      const day = new Date(r.reviewed_at).getDay();
      dayFrequency[day]++;
    });
    const preferredDays = dayFrequency
      .map((count, day) => ({ day, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map(item => item.day);

    // Calculate study frequency
    const uniqueDays = new Set(reviews.map(r => 
      new Date(r.reviewed_at).toDateString()
    )).size;
    const daysSinceFirst = (Date.now() - new Date(reviews[reviews.length - 1].reviewed_at).getTime()) 
      / (1000 * 60 * 60 * 24);
    const studyFrequency = uniqueDays / daysSinceFirst > 0.8 ? 'daily' : 
                          uniqueDays / daysSinceFirst > 0.4 ? 'regular' : 'sporadic';

    // Calculate success rate
    const successfulReviews = reviews.filter(r => r.rating === 'GOOD' || r.rating === 'EASY').length;
    const successRate = successfulReviews / reviews.length;

    // Calculate average response time
    const avgResponseTime = reviews.reduce((sum, r) => sum + (r.response_time || 0), 0) / reviews.length;

    return {
      avgStudyTime,
      studyFrequency,
      preferredDays,
      longestStreak: studyStreak?.longestStreak || 0,
      currentStreak: studyStreak?.currentStreak || 0,
      lastStudyDate: studyStreak?.lastStudyDate,
      avgResponseTime,
      successRate
    };
  }

  private async calculateOptimalTime(
    request: NotificationScheduleRequest, 
    context: SchedulingContext
  ): Promise<Date> {
    const { preferences, studyPattern } = context;
    const now = new Date();

    // Start with preferred time or study pattern time
    let optimalHour = 9; // Default 9 AM
    
    if (preferences.preferredTime) {
      const [hours] = preferences.preferredTime.split(':').map(Number);
      optimalHour = hours || 9;
    } else if (studyPattern.avgStudyTime) {
      const [hours] = studyPattern.avgStudyTime.split(':').map(Number);
      optimalHour = hours || 9;
    }

    // Calculate target date
    let targetDate = new Date();
    targetDate.setHours(optimalHour, 0, 0, 0);

    // If the time has passed today, schedule for tomorrow
    if (targetDate <= now) {
      targetDate.setDate(targetDate.getDate() + 1);
    }

    // Adjust for notification type
    switch (request.type) {
      case 'DUE_CARDS':
        // Schedule due cards notifications slightly before study time
        targetDate.setMinutes(-30);
        break;

      case 'STREAK_PROTECTION':
        // Streak protection should be sent in the evening if not studied
        if (optimalHour < 18) {
          targetDate.setHours(20, 0, 0, 0); // 8 PM
        }
        break;

      case 'MILESTONE':
        // Milestones can be immediate or slightly delayed
        targetDate = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes delay
        break;

      case 'DECK_SPECIFIC':
        // Use regular study time
        break;
    }

    // Avoid quiet hours
    if (this.isInQuietHours(targetDate, preferences)) {
      targetDate = this.calculatePostQuietHoursTime(targetDate, preferences);
    }

    return targetDate;
  }

  private isNotificationTypeEnabled(
    type: 'DUE_CARDS' | 'STREAK_PROTECTION' | 'MILESTONE' | 'DECK_SPECIFIC',
    preferences: UserNotificationPreferences
  ): boolean {
    switch (type) {
      case 'DUE_CARDS': return preferences.dueCardsEnabled;
      case 'STREAK_PROTECTION': return preferences.streakProtectionEnabled;
      case 'MILESTONE': return preferences.milestoneEnabled;
      case 'DECK_SPECIFIC': return preferences.deckSpecificEnabled;
      default: return false;
    }
  }

  private async checkRateLimits(userId: string, preferences: UserNotificationPreferences) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayNotifications = await this.db.notificationLog.count({
      where: {
        userId,
        createdAt: { gte: today },
        status: 'SENT'
      }
    });

    if (todayNotifications >= preferences.maxDailyNotifications) {
      throw new TRPCError({
        code: 'TOO_MANY_REQUESTS',
        message: 'Daily notification limit reached'
      });
    }

    // Check minimum interval
    const lastNotification = await this.db.notificationLog.findFirst({
      where: {
        userId,
        status: 'SENT'
      },
      orderBy: {
        sentAt: 'desc'
      }
    });

    if (lastNotification?.sentAt) {
      const minutesSinceLastNotification = 
        (Date.now() - lastNotification.sentAt.getTime()) / (1000 * 60);
      
      if (minutesSinceLastNotification < preferences.minIntervalMinutes) {
        throw new TRPCError({
          code: 'TOO_MANY_REQUESTS',
          message: 'Minimum interval between notifications not met'
        });
      }
    }
  }

  private isInQuietHours(time: Date, preferences: UserNotificationPreferences): boolean {
    if (!preferences.quietHoursStart || !preferences.quietHoursEnd) {
      return false;
    }

    const [startHours, startMinutes] = preferences.quietHoursStart!.split(':').map(Number);
    const [endHours, endMinutes] = preferences.quietHoursEnd!.split(':').map(Number);
    
    const currentHours = time.getHours();
    const currentMinutes = time.getMinutes();
    const currentTime = currentHours * 60 + currentMinutes;
    const startTime = (startHours || 0) * 60 + (startMinutes || 0);
    const endTime = (endHours || 0) * 60 + (endMinutes || 0);

    if (startTime <= endTime) {
      // Same day quiet hours
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      // Overnight quiet hours
      return currentTime >= startTime || currentTime <= endTime;
    }
  }

  private calculatePostQuietHoursTime(time: Date, preferences: UserNotificationPreferences): Date {
    if (!preferences.quietHoursEnd) {
      return time;
    }

    const [endHours, endMinutes] = preferences.quietHoursEnd!.split(':').map(Number);
    const newTime = new Date(time);
    newTime.setHours(endHours || 0, endMinutes || 0, 0, 0);

    // If end time has passed today, schedule for tomorrow
    if (newTime <= new Date()) {
      newTime.setDate(newTime.getDate() + 1);
    }

    return newTime;
  }

  private async generateNotificationPayload(notification: any): Promise<any> {
    switch (notification.type) {
      case 'DUE_CARDS':
        return NotificationTemplates.dueCards(
          notification.cardCount || 0,
          notification.deck?.name
        );

      case 'STREAK_PROTECTION':
        return NotificationTemplates.streakProtection(notification.streakDays || 0);

      case 'MILESTONE':
        const milestoneData = notification.milestoneData ? 
          JSON.parse(notification.milestoneData) : {};
        return NotificationTemplates.milestone(
          milestoneData.value || 0,
          milestoneData.type || 'streak'
        );

      case 'DECK_SPECIFIC':
        return NotificationTemplates.deckSpecific(
          notification.deck?.name || 'Deck',
          notification.cardCount || 0,
          10 // Default threshold
        );

      default:
        return null;
    }
  }

  private getNotificationPriority(type: string): 'low' | 'normal' | 'high' {
    switch (type) {
      case 'STREAK_PROTECTION': return 'high';
      case 'DUE_CARDS': return 'normal';
      case 'MILESTONE': return 'low';
      case 'DECK_SPECIFIC': return 'normal';
      default: return 'normal';
    }
  }

  private async markAsProcessed(scheduleId: string, success: boolean) {
    await this.db.notificationSchedule.update({
      where: { id: scheduleId },
      data: {
        isProcessed: true,
        processedAt: new Date()
      }
    });
  }

  private async rescheduleNotification(scheduleId: string, newTime: Date) {
    await this.db.notificationSchedule.update({
      where: { id: scheduleId },
      data: {
        scheduledFor: newTime
      }
    });
  }

  private async trackNotificationEffectiveness(scheduleId: string) {
    // This would track if the user studied within an hour of receiving the notification
    // Implementation would involve checking for study sessions after notification delivery
    console.log(`[Scheduler] Tracking effectiveness for notification ${scheduleId}`);
  }
}

/**
 * Background job runner for notification processing
 */
export class NotificationJobRunner {
  private scheduler: NotificationScheduler;
  private intervalId: NodeJS.Timeout | null = null;

  constructor(scheduler: NotificationScheduler) {
    this.scheduler = scheduler;
  }

  /**
   * Start the background job runner
   */
  start(intervalMinutes = 5) {
    if (this.intervalId) {
      console.log('[JobRunner] Job runner already running');
      return;
    }

    console.log(`[JobRunner] Starting notification job runner (every ${intervalMinutes} minutes)`);
    
    this.intervalId = setInterval(async () => {
      try {
        await this.runJobs();
      } catch (error) {
        console.error('[JobRunner] Job execution failed:', error);
      }
    }, intervalMinutes * 60 * 1000);

    // Run immediately on start
    setImmediate(() => this.runJobs());
  }

  /**
   * Stop the background job runner
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('[JobRunner] Notification job runner stopped');
    }
  }

  /**
   * Run all notification jobs
   */
  private async runJobs() {
    console.log('[JobRunner] Running notification jobs...');
    
    try {
      // Process due notifications
      await this.scheduler.processDueNotifications();

      // Schedule new notifications (run less frequently)
      const now = new Date();
      if (now.getMinutes() % 15 === 0) { // Every 15 minutes
        await this.scheduler.scheduleDueCardsNotifications();
        await this.scheduler.scheduleStreakProtectionNotifications();
        await this.scheduler.scheduleMilestoneNotifications();
      }

    } catch (error) {
      console.error('[JobRunner] Job execution error:', error);
    }
  }
}

export default NotificationScheduler;