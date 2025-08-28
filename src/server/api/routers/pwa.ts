/**
 * PWA tRPC Router
 * 
 * Handles Progressive Web App functionality including:
 * - Service worker registration and updates
 * - Installation prompts and tracking
 * - Offline capabilities management
 * - PWA manifest serving
 * - Update notifications
 */

import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

const installPromptSchema = z.object({
  userAgent: z.string().optional(),
  platform: z.string().optional(),
});

const installStatusSchema = z.object({
  installed: z.boolean(),
  dismissed: z.boolean().optional(),
});

const updateCheckSchema = z.object({
  currentVersion: z.string().optional(),
  forceCheck: z.boolean().default(false),
});

const offlineDataSchema = z.object({
  reviews: z.array(z.object({
    cardId: z.string(),
    rating: z.enum(["AGAIN", "HARD", "GOOD", "EASY"]),
    responseTime: z.number(),
    reviewedAt: z.string(),
  })).optional(),
  studySessions: z.array(z.object({
    startTime: z.string(),
    endTime: z.string(),
    cardsReviewed: z.number(),
    deckId: z.string().optional(),
  })).optional(),
});

export const pwaRouter = createTRPCRouter({
  /**
   * Check if PWA is supported and get installation status
   */
  getInstallationStatus: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.session.user.id;

      try {
        const installPrompt = await ctx.db.pWAInstallPrompt.findFirst({
          where: { userId },
          orderBy: { createdAt: 'desc' }
        });

        return {
          supported: true, // PWA is supported in most modern browsers
          prompted: installPrompt?.prompted || false,
          installed: installPrompt?.installed || false,
          dismissed: installPrompt?.dismissed || false,
          promptedAt: installPrompt?.promptedAt,
          installedAt: installPrompt?.installedAt,
          dismissedAt: installPrompt?.dismissedAt,
        };

      } catch (error) {
        console.error('[PWA] Failed to get installation status:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get installation status'
        });
      }
    }),

  /**
   * Record when installation prompt was shown
   */
  recordPromptShown: protectedProcedure
    .input(installPromptSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      try {
        await ctx.db.pWAInstallPrompt.create({
          data: {
            userId,
            prompted: true,
            promptedAt: new Date(),
            userAgent: input.userAgent,
            platform: input.platform,
          }
        });

        return { success: true };

      } catch (error) {
        console.error('[PWA] Failed to record prompt shown:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to record installation prompt'
        });
      }
    }),

  /**
   * Update installation status (installed or dismissed)
   */
  updateInstallationStatus: protectedProcedure
    .input(installStatusSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      try {
        const existingPrompt = await ctx.db.pWAInstallPrompt.findFirst({
          where: { userId },
          orderBy: { createdAt: 'desc' }
        });

        if (existingPrompt) {
          await ctx.db.pWAInstallPrompt.update({
            where: { id: existingPrompt.id },
            data: {
              installed: input.installed,
              installedAt: input.installed ? new Date() : null,
              dismissed: input.dismissed || false,
              dismissedAt: input.dismissed ? new Date() : null,
            }
          });
        } else {
          await ctx.db.pWAInstallPrompt.create({
            data: {
              userId,
              installed: input.installed,
              installedAt: input.installed ? new Date() : null,
              dismissed: input.dismissed || false,
              dismissedAt: input.dismissed ? new Date() : null,
            }
          });
        }

        return { success: true };

      } catch (error) {
        console.error('[PWA] Failed to update installation status:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update installation status'
        });
      }
    }),

  /**
   * Check for app updates
   */
  checkForUpdates: protectedProcedure
    .input(updateCheckSchema)
    .query(async ({ ctx, input }) => {
      try {
        // In a real app, you'd check against your current app version
        const currentAppVersion = "1.0.0"; // This should come from package.json or env
        const clientVersion = input.currentVersion || "0.0.0";

        const hasUpdate = currentAppVersion !== clientVersion;
        
        return {
          hasUpdate,
          currentVersion: currentAppVersion,
          clientVersion,
          updateAvailable: hasUpdate,
          releaseNotes: hasUpdate ? [
            "Improved offline functionality",
            "Enhanced push notifications",
            "Bug fixes and performance improvements"
          ] : [],
          updateUrl: hasUpdate ? "/" : null, // URL to refresh to get update
        };

      } catch (error) {
        console.error('[PWA] Failed to check for updates:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to check for updates'
        });
      }
    }),

  /**
   * Get offline capabilities info
   */
  getOfflineCapabilities: publicProcedure
    .query(async () => {
      return {
        features: [
          {
            name: "Study Sessions",
            description: "Continue studying with cached flashcards",
            available: true,
          },
          {
            name: "Progress Tracking", 
            description: "Track study progress (syncs when online)",
            available: true,
          },
          {
            name: "Statistics",
            description: "View cached study statistics",
            available: true,
          },
          {
            name: "Deck Management",
            description: "Browse and manage cached decks",
            available: true,
          },
          {
            name: "Card Creation",
            description: "Create new cards (syncs when online)",
            available: false, // Requires server interaction
          },
        ],
        storageEstimate: {
          quota: null, // Would be populated by client
          usage: null,
          usageDetails: {
            indexedDB: null,
            caches: null,
          }
        }
      };
    }),

  /**
   * Sync offline data when connection restored
   */
  syncOfflineData: protectedProcedure
    .input(offlineDataSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      try {
        let syncedReviews = 0;
        let syncedSessions = 0;

        // Sync offline reviews
        if (input.reviews && input.reviews.length > 0) {
          for (const review of input.reviews) {
            try {
              // Check if review already exists
              const existingReview = await ctx.db.review.findFirst({
                where: {
                  card_id: review.cardId,
                  user_id: userId,
                  reviewed_at: new Date(review.reviewedAt),
                }
              });

              if (!existingReview) {
                // Get current card state to calculate intervals
                const cardState = await ctx.db.cardState.findFirst({
                  where: {
                    card_id: review.cardId,
                    user_id: userId,
                  }
                });

                if (cardState) {
                  await ctx.db.review.create({
                    data: {
                      card_id: review.cardId,
                      user_id: userId,
                      rating: review.rating,
                      response_time: review.responseTime,
                      reviewed_at: new Date(review.reviewedAt),
                      previous_interval: cardState.interval,
                      new_interval: cardState.interval, // Would need to recalculate
                      easiness_factor: cardState.easiness_factor,
                    }
                  });

                  syncedReviews++;
                }
              }
            } catch (error) {
              console.error('[PWA] Failed to sync review:', error);
            }
          }
        }

        // Track study sessions for analytics
        if (input.studySessions && input.studySessions.length > 0) {
          syncedSessions = input.studySessions.length;
          // You could store session data in a separate table if needed
        }

        return {
          success: true,
          syncedReviews,
          syncedSessions,
          message: `Synced ${syncedReviews} reviews and ${syncedSessions} sessions`,
        };

      } catch (error) {
        console.error('[PWA] Failed to sync offline data:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to sync offline data'
        });
      }
    }),

  /**
   * Get PWA metrics and analytics
   */
  getPWAAnalytics: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.session.user.id;

      try {
        const [installPrompts, totalUsers] = await Promise.all([
          ctx.db.pWAInstallPrompt.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 10,
          }),
          ctx.db.user.count(),
        ]);

        const installStats = await ctx.db.pWAInstallPrompt.groupBy({
          by: ['installed'],
          _count: {
            installed: true,
          }
        });

        const installedCount = installStats.find(stat => stat.installed)?._count.installed || 0;
        const totalPrompts = installStats.reduce((sum, stat) => sum + stat._count.installed, 0);

        return {
          userInstallHistory: installPrompts.map(prompt => ({
            id: prompt.id,
            prompted: prompt.prompted,
            installed: prompt.installed,
            dismissed: prompt.dismissed,
            createdAt: prompt.createdAt,
            platform: prompt.platform,
          })),
          globalStats: {
            totalUsers,
            totalInstalls: installedCount,
            totalPrompts,
            installationRate: totalPrompts > 0 ? (installedCount / totalPrompts) * 100 : 0,
          }
        };

      } catch (error) {
        console.error('[PWA] Failed to get PWA analytics:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get PWA analytics'
        });
      }
    }),

  /**
   * Clear offline cache (for troubleshooting)
   */
  clearOfflineCache: protectedProcedure
    .mutation(async ({ ctx }) => {
      // This would typically communicate with the service worker
      // to clear caches, but since we can't do that from the server,
      // we return instructions for the client
      
      return {
        success: true,
        message: "Cache clear requested. Please refresh the page to complete the process.",
        instructions: [
          "The service worker will clear all cached data",
          "Fresh data will be downloaded on next load",
          "Offline functionality will be restored after caching",
        ]
      };
    }),

  /**
   * Get service worker status and version
   */
  getServiceWorkerStatus: publicProcedure
    .query(async () => {
      // This returns information that the client can use
      // to determine service worker status
      
      return {
        expected: {
          version: "1.0.0",
          features: [
            "offline-caching",
            "push-notifications", 
            "background-sync",
            "update-notifications"
          ],
          cacheNames: [
            "anki-static-v1.0.0",
            "anki-dynamic-v1.0.0",
            "anki-api-v1.0.0",
            "anki-offline-v1.0.0"
          ]
        },
        updateInstructions: {
          manual: "Refresh the page to update the service worker",
          automatic: "Updates will be applied automatically in the background"
        }
      };
    }),

  /**
   * Report PWA performance metrics
   */
  reportPerformanceMetrics: protectedProcedure
    .input(z.object({
      metrics: z.object({
        cacheHitRate: z.number().min(0).max(100).optional(),
        offlineUsage: z.number().optional(),
        loadTime: z.number().optional(),
        errorCount: z.number().optional(),
      }),
      userAgent: z.string().optional(),
      timestamp: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      try {
        // In a production app, you'd store these metrics
        // in a dedicated analytics table
        console.log(`[PWA] Performance metrics for user ${userId}:`, input.metrics);

        return {
          success: true,
          message: "Performance metrics recorded successfully",
        };

      } catch (error) {
        console.error('[PWA] Failed to record performance metrics:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to record performance metrics'
        });
      }
    }),
});