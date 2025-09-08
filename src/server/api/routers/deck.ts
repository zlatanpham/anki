import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

const createDeckSchema = z.object({
  name: z
    .string()
    .min(1, "Deck name is required")
    .max(255, "Deck name too long"),
  description: z.string().optional(),
  organizationId: z.string().uuid().optional(),
  isPublic: z.boolean().default(false),
  settings: z.record(z.any()).optional(),
});

const updateDeckSchema = z.object({
  id: z.string().uuid(),
  name: z
    .string()
    .min(1, "Deck name is required")
    .max(255, "Deck name too long")
    .optional(),
  description: z.string().optional(),
  isPublic: z.boolean().optional(),
  settings: z.record(z.any()).optional(),
});

const deckParamsSchema = z.object({
  id: z.string().uuid(),
});

const deckQuerySchema = z.object({
  organizationId: z.string().uuid().optional(),
  includePublic: z.boolean().default(false),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
  includeStats: z.boolean().default(false),
});

export const deckRouter = createTRPCRouter({
  // Get all decks for the current user
  getAll: protectedProcedure
    .input(deckQuerySchema)
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { organizationId, includePublic, limit, offset, includeStats } =
        input;

      try {
        const whereConditions: any = {
          OR: [
            { user_id: userId },
            ...(includePublic ? [{ is_public: true }] : []),
          ],
        };

        if (organizationId) {
          whereConditions.organization_id = organizationId;
        }

        const [decks, totalCount] = await Promise.all([
          ctx.db.deck.findMany({
            where: whereConditions,
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
              organization: {
                select: {
                  id: true,
                  name: true,
                },
              },
              _count: {
                select: {
                  cards: true,
                },
              },
            },
            orderBy: {
              updated_at: "desc",
            },
            take: limit,
            skip: offset,
          }),
          ctx.db.deck.count({
            where: whereConditions,
          }),
        ]);

        // If stats are requested, fetch them for all decks
        let decksWithStats = decks;
        if (includeStats) {
          const now = new Date();
          const todayStart = new Date(now);
          todayStart.setHours(0, 0, 0, 0);

          const deckIds = decks.map((d) => d.id);

          // Batch fetch all stats for performance
          const [cardStates, todayReviews] = await Promise.all([
            // Get card states for all decks
            ctx.db.cardState
              .groupBy({
                by: ["card_id"],
                where: {
                  user_id: userId,
                  card: {
                    deck_id: { in: deckIds },
                  },
                },
                _count: true,
              })
              .then(async (groups) => {
                // Get the actual card states with deck info
                return ctx.db.cardState.findMany({
                  where: {
                    user_id: userId,
                    card: {
                      deck_id: { in: deckIds },
                    },
                  },
                  include: {
                    card: {
                      select: {
                        deck_id: true,
                      },
                    },
                  },
                });
              }),

            // Get today's reviews for all decks
            ctx.db.review.findMany({
              where: {
                user_id: userId,
                reviewed_at: { gte: todayStart },
                card: {
                  deck_id: { in: deckIds },
                },
              },
              include: {
                card: {
                  select: {
                    deck_id: true,
                  },
                },
              },
            }),
          ]);

          // Process stats for each deck
          decksWithStats = decks.map((deck) => {
            const deckCardStates = cardStates.filter(
              (cs) => cs.card.deck_id === deck.id,
            );
            const deckTodayReviews = todayReviews.filter(
              (r) => r.card.deck_id === deck.id,
            );

            // Calculate due cards
            const dueCards = deckCardStates.filter(
              (cs) => cs.state !== "SUSPENDED" && cs.due_date <= now,
            ).length;

            // Calculate card state breakdown
            const newCards = deckCardStates.filter(
              (cs) => cs.state === "NEW",
            ).length;
            const learningCards = deckCardStates.filter(
              (cs) => cs.state === "LEARNING",
            ).length;
            const reviewCards = deckCardStates.filter(
              (cs) => cs.state === "REVIEW",
            ).length;
            const suspendedCards = deckCardStates.filter(
              (cs) => cs.state === "SUSPENDED",
            ).length;

            // Calculate today's activity
            const reviewedToday = deckTodayReviews.length;
            const successfulToday = deckTodayReviews.filter(
              (r) => r.rating === "GOOD" || r.rating === "EASY",
            ).length;
            const todayAccuracy =
              reviewedToday > 0
                ? Math.round((successfulToday / reviewedToday) * 100)
                : 0;

            // Calculate 30-day retention rate
            const thirtyDaysAgo = new Date(now);
            thirtyDaysAgo.setDate(now.getDate() - 30);

            return {
              ...deck,
              stats: {
                due: dueCards,
                new: newCards,
                learning: learningCards,
                review: reviewCards,
                suspended: suspendedCards,
                reviewedToday,
                todayAccuracy,
                retentionRate: 0, // Will be implemented in phase 6
                currentStreak: 0, // Will be implemented in phase 4
                estimatedMinutes: 0, // Will be implemented in phase 7
              },
            };
          });
        }

        return {
          decks: decksWithStats,
          totalCount,
          hasMore: offset + limit < totalCount,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch decks",
          cause: error,
        });
      }
    }),

  // Get a single deck by ID
  getById: protectedProcedure
    .input(deckParamsSchema)
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      try {
        const deck = await ctx.db.deck.findFirst({
          where: {
            id: input.id,
            OR: [{ user_id: userId }, { is_public: true }],
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            organization: {
              select: {
                id: true,
                name: true,
              },
            },
            cards: {
              include: {
                card_states: {
                  where: {
                    user_id: userId,
                  },
                  take: 1,
                },
              },
            },
            _count: {
              select: {
                cards: true,
              },
            },
          },
        });

        if (!deck) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Deck not found",
          });
        }

        return deck;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch deck",
          cause: error,
        });
      }
    }),

  // Create a new deck
  create: protectedProcedure
    .input(createDeckSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      try {
        const deck = await ctx.db.deck.create({
          data: {
            name: input.name,
            description: input.description,
            user_id: userId,
            organization_id: input.organizationId,
            is_public: input.isPublic,
            settings: input.settings,
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            organization: {
              select: {
                id: true,
                name: true,
              },
            },
            _count: {
              select: {
                cards: true,
              },
            },
          },
        });

        return deck;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create deck",
          cause: error,
        });
      }
    }),

  // Update an existing deck
  update: protectedProcedure
    .input(updateDeckSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      try {
        // First check if user owns the deck
        const existingDeck = await ctx.db.deck.findFirst({
          where: {
            id: input.id,
            user_id: userId,
          },
        });

        if (!existingDeck) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Deck not found or you don't have permission to edit it",
          });
        }

        const updateData: any = {};
        if (input.name !== undefined) updateData.name = input.name;
        if (input.description !== undefined)
          updateData.description = input.description;
        if (input.isPublic !== undefined) updateData.is_public = input.isPublic;
        if (input.settings !== undefined) updateData.settings = input.settings;

        const deck = await ctx.db.deck.update({
          where: {
            id: input.id,
          },
          data: updateData,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            organization: {
              select: {
                id: true,
                name: true,
              },
            },
            _count: {
              select: {
                cards: true,
              },
            },
          },
        });

        return deck;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update deck",
          cause: error,
        });
      }
    }),

  // Delete a deck
  delete: protectedProcedure
    .input(deckParamsSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      try {
        // First check if user owns the deck
        const existingDeck = await ctx.db.deck.findFirst({
          where: {
            id: input.id,
            user_id: userId,
          },
        });

        if (!existingDeck) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Deck not found or you don't have permission to delete it",
          });
        }

        await ctx.db.deck.delete({
          where: {
            id: input.id,
          },
        });

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete deck",
          cause: error,
        });
      }
    }),

  // Get deck statistics
  getStats: protectedProcedure
    .input(deckParamsSchema)
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      try {
        // First check if user has access to the deck
        const deck = await ctx.db.deck.findFirst({
          where: {
            id: input.id,
            OR: [{ user_id: userId }, { is_public: true }],
          },
        });

        if (!deck) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Deck not found",
          });
        }

        const now = new Date();

        const [
          totalCards,
          newCards,
          learningCards,
          reviewCards,
          dueCards,
          suspendedCards,
        ] = await Promise.all([
          ctx.db.card.count({
            where: { deck_id: input.id },
          }),
          ctx.db.cardState.count({
            where: {
              user_id: userId,
              card: { deck_id: input.id },
              state: "NEW",
            },
          }),
          ctx.db.cardState.count({
            where: {
              user_id: userId,
              card: { deck_id: input.id },
              state: "LEARNING",
            },
          }),
          ctx.db.cardState.count({
            where: {
              user_id: userId,
              card: { deck_id: input.id },
              state: "REVIEW",
            },
          }),
          ctx.db.cardState.count({
            where: {
              user_id: userId,
              card: { deck_id: input.id },
              due_date: { lte: now },
              state: { not: "SUSPENDED" },
            },
          }),
          ctx.db.cardState.count({
            where: {
              user_id: userId,
              card: { deck_id: input.id },
              state: "SUSPENDED",
            },
          }),
        ]);

        return {
          totalCards,
          newCards,
          learningCards,
          reviewCards,
          dueCards,
          suspendedCards,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch deck statistics",
          cause: error,
        });
      }
    }),

  // Get quick statistics for multiple decks
  getQuickStats: protectedProcedure
    .input(
      z.object({
        deckIds: z.array(z.string().uuid()),
      }),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { deckIds } = input;

      try {
        const now = new Date();
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);

        // Batch fetch all data
        const [cardStates, todayReviews] = await Promise.all([
          ctx.db.cardState.findMany({
            where: {
              user_id: userId,
              card: {
                deck_id: { in: deckIds },
              },
            },
            include: {
              card: {
                select: {
                  deck_id: true,
                },
              },
            },
          }),
          ctx.db.review.findMany({
            where: {
              user_id: userId,
              reviewed_at: { gte: todayStart },
              card: {
                deck_id: { in: deckIds },
              },
            },
            include: {
              card: {
                select: {
                  deck_id: true,
                },
              },
            },
          }),
        ]);

        // Process stats by deck
        const statsByDeck: Record<string, any> = {};

        for (const deckId of deckIds) {
          const deckCardStates = cardStates.filter(
            (cs) => cs.card.deck_id === deckId,
          );
          const deckTodayReviews = todayReviews.filter(
            (r) => r.card.deck_id === deckId,
          );

          // Calculate due cards
          const dueCards = deckCardStates.filter(
            (cs) => cs.state !== "SUSPENDED" && cs.due_date <= now,
          ).length;

          // Calculate card state breakdown
          const newCards = deckCardStates.filter(
            (cs) => cs.state === "NEW" && cs.due_date <= now,
          ).length;
          const learningCards = deckCardStates.filter(
            (cs) => cs.state === "LEARNING" && cs.due_date <= now,
          ).length;
          const reviewCards = deckCardStates.filter(
            (cs) => cs.state === "REVIEW" && cs.due_date <= now,
          ).length;

          // Calculate today's activity
          const reviewedToday = deckTodayReviews.length;
          const successfulToday = deckTodayReviews.filter(
            (r) => r.rating === "GOOD" || r.rating === "EASY",
          ).length;
          const todayAccuracy =
            reviewedToday > 0
              ? Math.round((successfulToday / reviewedToday) * 100)
              : 0;

          statsByDeck[deckId] = {
            due: dueCards,
            new: newCards,
            learning: learningCards,
            review: reviewCards,
            reviewedToday,
            todayAccuracy,
          };
        }

        return statsByDeck;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch quick statistics",
          cause: error,
        });
      }
    }),
});
