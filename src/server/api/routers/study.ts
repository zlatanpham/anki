import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import {
  SuperMemo2Algorithm,
  createCardStateFromPrisma,
} from "@/server/services/spacedRepetition";
import { type ReviewRating } from "@prisma/client";

const reviewCardSchema = z.object({
  cardId: z.string().uuid(),
  rating: z.enum(["AGAIN", "HARD", "GOOD", "EASY"]),
  responseTime: z.number().min(0), // milliseconds
});

const reviewQueueSchema = z.object({
  deckId: z.string().uuid().optional(),
  limit: z.number().min(1).max(50).default(20),
  includeNew: z.boolean().default(true),
  includeLearning: z.boolean().default(true),
  includeReview: z.boolean().default(true),
});

const studyStatsSchema = z.object({
  deckId: z.string().uuid().optional(),
  period: z.enum(["today", "week", "month", "all"]).default("today"),
});

const suspendCardSchema = z.object({
  cardId: z.string().uuid(),
});

export const studyRouter = createTRPCRouter({
  // Get review queue for study session
  getReviewQueue: protectedProcedure
    .input(reviewQueueSchema)
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { deckId, limit, includeNew, includeLearning, includeReview } =
        input;
      const now = new Date();

      try {
        const whereConditions: any = {
          user_id: userId,
          due_date: { lte: now },
          state: { not: "SUSPENDED" },
        };

        // Filter by deck if specified
        if (deckId) {
          whereConditions.card = {
            deck_id: deckId,
          };
        } else {
          // Ensure user has access to the deck
          whereConditions.card = {
            deck: {
              OR: [{ user_id: userId }, { is_public: true }],
            },
          };
        }

        // Filter by card states
        const stateFilters = [];
        if (includeNew) stateFilters.push("NEW");
        if (includeLearning) stateFilters.push("LEARNING");
        if (includeReview) stateFilters.push("REVIEW");

        if (stateFilters.length > 0) {
          whereConditions.state = { in: stateFilters };
        }

        const cardStates = await ctx.db.cardState.findMany({
          where: whereConditions,
          include: {
            card: {
              include: {
                deck: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
          orderBy: [
            { state: "asc" }, // NEW first, then LEARNING, then REVIEW
            { due_date: "asc" },
          ],
          take: limit,
        });

        // Transform to include algorithm insights
        const reviewQueue = cardStates.map((cardState) => {
          const state = createCardStateFromPrisma(cardState);
          return {
            ...cardState,
            card: cardState.card,
            isOverdue: SuperMemo2Algorithm.isCardDue(state, now),
            stateDescription:
              SuperMemo2Algorithm.getCardStateDescription(state),
          };
        });

        return {
          cards: reviewQueue,
          totalDue: reviewQueue.length,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch review queue",
          cause: error,
        });
      }
    }),

  // Submit a card review
  submitReview: protectedProcedure
    .input(reviewCardSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { cardId, rating, responseTime } = input;

      try {
        const result = await ctx.db.$transaction(async (tx) => {
          // Get current card state
          const currentCardState = await tx.cardState.findFirst({
            where: {
              card_id: cardId,
              user_id: userId,
            },
            include: {
              card: {
                include: {
                  deck: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          });

          if (!currentCardState) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Card state not found",
            });
          }

          // Convert to algorithm format
          const algorithmState = createCardStateFromPrisma(currentCardState);

          // Calculate next review using SuperMemo 2
          const reviewResult = SuperMemo2Algorithm.calculateNextReviewResult(
            rating as ReviewRating,
            algorithmState,
          );

          // Update card state
          const updatedCardState = await tx.cardState.update({
            where: {
              id: currentCardState.id,
            },
            data: {
              state: reviewResult.newState,
              due_date: reviewResult.newDueDate,
              interval: reviewResult.newInterval,
              repetitions: reviewResult.newRepetitions,
              easiness_factor: reviewResult.newEasinessFactor,
              lapses: reviewResult.newLapses,
              last_reviewed: new Date(),
            },
          });

          // Record the review
          const review = await tx.review.create({
            data: {
              card_id: cardId,
              user_id: userId,
              rating: rating as ReviewRating,
              response_time: responseTime,
              previous_interval: algorithmState.interval,
              new_interval: reviewResult.newInterval,
              easiness_factor: reviewResult.newEasinessFactor,
            },
          });

          return {
            cardState: updatedCardState,
            review,
            nextDueDate: reviewResult.newDueDate,
            newInterval: reviewResult.newInterval,
            card: currentCardState.card,
          };
        });

        return result;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to submit review",
          cause: error,
        });
      }
    }),

  // Get study statistics
  getStudyStats: protectedProcedure
    .input(studyStatsSchema)
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { deckId, period } = input;

      try {
        // Calculate date range based on period
        const now = new Date();
        let startDate: Date;

        switch (period) {
          case "today":
            startDate = new Date(now);
            startDate.setHours(0, 0, 0, 0);
            break;
          case "week":
            startDate = new Date(now);
            startDate.setDate(now.getDate() - 7);
            startDate.setHours(0, 0, 0, 0);
            break;
          case "month":
            startDate = new Date(now);
            startDate.setMonth(now.getMonth() - 1);
            startDate.setHours(0, 0, 0, 0);
            break;
          case "all":
            startDate = new Date(0); // Beginning of time
            break;
        }

        const whereConditions: any = {
          user_id: userId,
          reviewed_at: { gte: startDate },
        };

        if (deckId) {
          whereConditions.card = {
            deck_id: deckId,
          };
        }

        const [
          totalReviews,
          reviewsByRating,
          averageResponseTime,
          studyStreak,
        ] = await Promise.all([
          // Total reviews in period
          ctx.db.review.count({
            where: whereConditions,
          }),

          // Reviews grouped by rating
          ctx.db.review.groupBy({
            by: ["rating"],
            where: whereConditions,
            _count: {
              rating: true,
            },
          }),

          // Average response time
          ctx.db.review.aggregate({
            where: whereConditions,
            _avg: {
              response_time: true,
            },
          }),

          // Calculate study streak (days)
          ctx.db.review.findMany({
            where: {
              user_id: userId,
            },
            select: {
              reviewed_at: true,
            },
            orderBy: {
              reviewed_at: "desc",
            },
            take: 365, // Look at last year for streak calculation
          }),
        ]);

        // Calculate study streak
        let currentStreak = 0;
        const reviewDates = studyStreak.map((r) =>
          new Date(r.reviewed_at).toDateString(),
        );
        const uniqueDates = [...new Set(reviewDates)].sort().reverse();

        const today = new Date().toDateString();
        const checkDate = new Date();

        for (const dateStr of uniqueDates) {
          if (dateStr === checkDate.toDateString()) {
            currentStreak++;
            checkDate.setDate(checkDate.getDate() - 1);
          } else {
            break;
          }
        }

        // Transform rating counts for easier consumption
        const ratingCounts = {
          AGAIN: 0,
          HARD: 0,
          GOOD: 0,
          EASY: 0,
        };

        reviewsByRating.forEach((rating) => {
          ratingCounts[rating.rating] = rating._count.rating;
        });

        // Calculate accuracy (GOOD + EASY / total)
        const successfulReviews = ratingCounts.GOOD + ratingCounts.EASY;
        const accuracy =
          totalReviews > 0 ? (successfulReviews / totalReviews) * 100 : 0;

        return {
          totalReviews,
          accuracy: Math.round(accuracy * 100) / 100, // Round to 2 decimal places
          averageResponseTime: averageResponseTime._avg.response_time || 0,
          studyStreak: currentStreak,
          ratingBreakdown: ratingCounts,
          period,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch study statistics",
          cause: error,
        });
      }
    }),

  // Get due cards count
  getDueCardsCount: protectedProcedure
    .input(
      z.object({
        deckId: z.string().uuid().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const now = new Date();

      try {
        const whereConditions: any = {
          user_id: userId,
          due_date: { lte: now },
          state: { not: "SUSPENDED" },
        };

        if (input.deckId) {
          whereConditions.card = {
            deck_id: input.deckId,
          };
        } else {
          whereConditions.card = {
            deck: {
              OR: [{ user_id: userId }, { is_public: true }],
            },
          };
        }

        const [newCards, learningCards, reviewCards] = await Promise.all([
          ctx.db.cardState.count({
            where: { ...whereConditions, state: "NEW" },
          }),
          ctx.db.cardState.count({
            where: { ...whereConditions, state: "LEARNING" },
          }),
          ctx.db.cardState.count({
            where: { ...whereConditions, state: "REVIEW" },
          }),
        ]);

        const totalDue = newCards + learningCards + reviewCards;

        return {
          totalDue,
          newCards,
          learningCards,
          reviewCards,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch due cards count",
          cause: error,
        });
      }
    }),

  // Suspend a card
  suspendCard: protectedProcedure
    .input(suspendCardSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      try {
        const cardState = await ctx.db.cardState.findFirst({
          where: {
            card_id: input.cardId,
            user_id: userId,
          },
        });

        if (!cardState) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Card state not found",
          });
        }

        const updatedCardState = await ctx.db.cardState.update({
          where: {
            id: cardState.id,
          },
          data: {
            state: "SUSPENDED",
          },
        });

        return { success: true, cardState: updatedCardState };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to suspend card",
          cause: error,
        });
      }
    }),

  // Unsuspend a card
  unsuspendCard: protectedProcedure
    .input(suspendCardSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      try {
        const cardState = await ctx.db.cardState.findFirst({
          where: {
            card_id: input.cardId,
            user_id: userId,
            state: "SUSPENDED",
          },
        });

        if (!cardState) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Suspended card state not found",
          });
        }

        // Reset to NEW state when unsuspending
        const updatedCardState = await ctx.db.cardState.update({
          where: {
            id: cardState.id,
          },
          data: {
            state: "NEW",
            due_date: new Date(), // Available immediately
          },
        });

        return { success: true, cardState: updatedCardState };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to unsuspend card",
          cause: error,
        });
      }
    }),

  // Get review queue for a specific deck
  getDeckReviewQueue: protectedProcedure
    .input(
      z.object({
        deckId: z.string().uuid(),
        limit: z.number().min(1).max(50).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { deckId, limit } = input;
      const now = new Date();

      try {
        const whereConditions = {
          user_id: userId,
          due_date: { lte: now },
          state: { not: "SUSPENDED" as const },
          card: {
            deck_id: deckId,
            deck: {
              OR: [
                { user_id: userId },
                {
                  organization: {
                    OrganizationMember: {
                      some: {
                        user_id: userId,
                      },
                    },
                  },
                },
              ],
            },
          },
        };

        const cardStates = await ctx.db.cardState.findMany({
          where: whereConditions,
          include: {
            card: {
              include: {
                deck: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
          orderBy: [
            { state: "asc" }, // NEW, LEARNING, REVIEW
            { due_date: "asc" },
          ],
          take: limit,
        });

        return cardStates.map((cardState) => ({
          ...cardState.card,
          cardState,
        }));
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch deck review queue",
          cause: error,
        });
      }
    }),

  // Get due cards count for a specific deck
  getDeckDueCardsCount: protectedProcedure
    .input(
      z.object({
        deckId: z.string().uuid(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { deckId } = input;
      const now = new Date();

      try {
        const whereConditions = {
          user_id: userId,
          due_date: { lte: now },
          state: { not: "SUSPENDED" as const },
          card: {
            deck_id: deckId,
            deck: {
              OR: [
                { user_id: userId },
                {
                  organization: {
                    OrganizationMember: {
                      some: {
                        user_id: userId,
                      },
                    },
                  },
                },
              ],
            },
          },
        };

        const [due, new_, learning] = await Promise.all([
          ctx.db.cardState.count({
            where: whereConditions,
          }),
          ctx.db.cardState.count({
            where: { ...whereConditions, state: "NEW" },
          }),
          ctx.db.cardState.count({
            where: { ...whereConditions, state: "LEARNING" },
          }),
        ]);

        return {
          due,
          new: new_,
          learning,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch deck due cards count",
          cause: error,
        });
      }
    }),

  // Get comprehensive deck statistics
  getDeckStats: protectedProcedure
    .input(
      z.object({
        deckId: z.string().uuid(),
        period: z.enum(["today", "week", "month", "all"]).default("week"),
      }),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { deckId, period } = input;
      const now = new Date();

      let startDate: Date;
      switch (period) {
        case "today":
          startDate = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
          );
          break;
        case "week":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "month":
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case "all":
        default:
          startDate = new Date(0);
          break;
      }

      try {
        const [reviews, cardStates] = await Promise.all([
          ctx.db.review.findMany({
            where: {
              user_id: userId,
              reviewed_at: { gte: startDate },
              card: {
                deck_id: deckId,
                deck: {
                  OR: [
                    { user_id: userId },
                    {
                      organization: {
                        OrganizationMember: {
                          some: { user_id: userId },
                        },
                      },
                    },
                  ],
                },
              },
            },
            include: { card: true },
          }),
          ctx.db.cardState.findMany({
            where: {
              user_id: userId,
              card: {
                deck_id: deckId,
                deck: {
                  OR: [
                    { user_id: userId },
                    {
                      organization: {
                        OrganizationMember: {
                          some: { user_id: userId },
                        },
                      },
                    },
                  ],
                },
              },
            },
          }),
        ]);

        const totalReviews = reviews.length;
        const totalTimeMs = reviews.reduce(
          (sum, review) => sum + (review.response_time || 0),
          0,
        );
        const totalTimeMinutes = totalTimeMs / (1000 * 60);
        const averageResponseTime =
          totalReviews > 0 ? totalTimeMs / totalReviews : 0;

        const successfulReviews = reviews.filter(
          (r) => r.rating === "GOOD" || r.rating === "EASY",
        ).length;
        const accuracy =
          totalReviews > 0 ? (successfulReviews / totalReviews) * 100 : 0;

        const masteredCards = cardStates.filter(
          (cs) => cs.state === "REVIEW" && cs.interval >= 21,
        ).length;
        const learningCards = cardStates.filter(
          (cs) => cs.state === "LEARNING" || cs.state === "NEW",
        ).length;

        // Calculate streak (simplified - just days with reviews)
        const reviewDays = new Set(
          reviews.map((r) => r.reviewed_at.toDateString()),
        ).size;

        return {
          totalReviews,
          totalTimeMinutes,
          averageResponseTime,
          accuracy,
          masteredCards,
          learningCards,
          currentStreak: reviewDays, // Simplified streak calculation
          bestStreak: reviewDays, // Would need more complex logic for actual best streak
          studyDays: reviewDays,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch deck statistics",
          cause: error,
        });
      }
    }),

  // Get deck activity data for charts
  getDeckActivity: protectedProcedure
    .input(
      z.object({
        deckId: z.string().uuid(),
        period: z.enum(["today", "week", "month", "all"]).default("week"),
      }),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { deckId, period } = input;
      const now = new Date();

      let startDate: Date;
      let days: number;
      switch (period) {
        case "today":
          startDate = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
          );
          days = 1;
          break;
        case "week":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          days = 7;
          break;
        case "month":
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          days = 30;
          break;
        case "all":
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // Last 30 days for chart
          days = 30;
          break;
      }

      try {
        const reviews = await ctx.db.review.findMany({
          where: {
            user_id: userId,
            reviewed_at: { gte: startDate },
            card: {
              deck_id: deckId,
              deck: {
                OR: [
                  { user_id: userId },
                  {
                    organization: {
                      OrganizationMember: {
                        some: { user_id: userId },
                      },
                    },
                  },
                ],
              },
            },
          },
        });

        // Group reviews by date
        const dailyData: Record<
          string,
          { reviews: number; totalTime: number }
        > = {};

        for (let i = 0; i < days; i++) {
          const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
          const dateKey = date.toISOString().split("T")[0]!;
          dailyData[dateKey] = { reviews: 0, totalTime: 0 };
        }

        reviews.forEach((review) => {
          const dateKey = review.reviewed_at.toISOString().split("T")[0]!;
          if (dailyData[dateKey]) {
            dailyData[dateKey].reviews++;
            dailyData[dateKey].totalTime += review.response_time || 0;
          }
        });

        return Object.entries(dailyData).map(([date, data]) => ({
          date,
          reviews: data.reviews,
          averageTime: data.reviews > 0 ? data.totalTime / data.reviews : 0,
        }));
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch deck activity",
          cause: error,
        });
      }
    }),

  // Get deck review distribution (Again, Hard, Good, Easy)
  getDeckReviewDistribution: protectedProcedure
    .input(
      z.object({
        deckId: z.string().uuid(),
        period: z.enum(["today", "week", "month", "all"]).default("week"),
      }),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { deckId, period } = input;
      const now = new Date();

      let startDate: Date;
      switch (period) {
        case "today":
          startDate = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
          );
          break;
        case "week":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "month":
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case "all":
        default:
          startDate = new Date(0);
          break;
      }

      try {
        const reviews = await ctx.db.review.findMany({
          where: {
            user_id: userId,
            reviewed_at: { gte: startDate },
            card: {
              deck_id: deckId,
              deck: {
                OR: [
                  { user_id: userId },
                  {
                    organization: {
                      OrganizationMember: {
                        some: { user_id: userId },
                      },
                    },
                  },
                ],
              },
            },
          },
        });

        const distribution = {
          again: reviews.filter((r) => r.rating === "AGAIN").length,
          hard: reviews.filter((r) => r.rating === "HARD").length,
          good: reviews.filter((r) => r.rating === "GOOD").length,
          easy: reviews.filter((r) => r.rating === "EASY").length,
        };

        return distribution;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch deck review distribution",
          cause: error,
        });
      }
    }),

  // Get card performance data (placeholder for future enhancement)
  getDeckCardPerformance: protectedProcedure
    .input(
      z.object({
        deckId: z.string().uuid(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { deckId } = input;

      try {
        // This could be expanded to show individual card performance
        // For now, returning basic data
        const cardStates = await ctx.db.cardState.findMany({
          where: {
            user_id: userId,
            card: {
              deck_id: deckId,
              deck: {
                OR: [
                  { user_id: userId },
                  {
                    organization: {
                      OrganizationMember: {
                        some: { user_id: userId },
                      },
                    },
                  },
                ],
              },
            },
          },
          include: {
            card: {
              select: {
                id: true,
                front: true,
                card_type: true,
              },
            },
          },
        });

        return cardStates.map((cs) => ({
          cardId: cs.card.id,
          cardType: cs.card.card_type,
          state: cs.state,
          interval: cs.interval,
          easinessFactor: cs.easiness_factor,
          lapses: cs.lapses,
        }));
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch card performance data",
          cause: error,
        });
      }
    }),
});
