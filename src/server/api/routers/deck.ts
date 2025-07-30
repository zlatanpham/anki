import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

const createDeckSchema = z.object({
  name: z.string().min(1, "Deck name is required").max(255, "Deck name too long"),
  description: z.string().optional(),
  organizationId: z.string().uuid().optional(),
  isPublic: z.boolean().default(false),
  settings: z.record(z.any()).optional(),
});

const updateDeckSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Deck name is required").max(255, "Deck name too long").optional(),
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
});

export const deckRouter = createTRPCRouter({
  // Get all decks for the current user
  getAll: protectedProcedure
    .input(deckQuerySchema)
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { organizationId, includePublic, limit, offset } = input;

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

        return {
          decks,
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
            OR: [
              { user_id: userId },
              { is_public: true },
            ],
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
        if (input.description !== undefined) updateData.description = input.description;
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
            OR: [
              { user_id: userId },
              { is_public: true },
            ],
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
});