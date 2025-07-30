import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { SuperMemo2Algorithm } from "@/server/services/spacedRepetition";
import { type CardType } from "@prisma/client";

const createCardSchema = z.object({
  deckId: z.string().uuid(),
  cardType: z.enum(["BASIC", "CLOZE"]).default("BASIC"),
  front: z.string().min(1, "Front content is required"),
  back: z.string().min(1, "Back content is required"),
  clozeText: z.string().optional(),
  tags: z.array(z.string()).default([]),
  noteId: z.string().uuid().optional(),
});

const updateCardSchema = z.object({
  id: z.string().uuid(),
  cardType: z.enum(["BASIC", "CLOZE"]).optional(),
  front: z.string().min(1, "Front content is required").optional(),
  back: z.string().min(1, "Back content is required").optional(),
  clozeText: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const cardParamsSchema = z.object({
  id: z.string().uuid(),
});

const cardQuerySchema = z.object({
  deckId: z.string().uuid(),
  cardType: z.enum(["BASIC", "CLOZE"]).optional(),
  tags: z.array(z.string()).optional(),
  search: z.string().optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

const bulkCreateCardsSchema = z.object({
  deckId: z.string().uuid(),
  cards: z.array(z.object({
    front: z.string().min(1),
    back: z.string().min(1),
    cardType: z.enum(["BASIC", "CLOZE"]).default("BASIC"),
    clozeText: z.string().optional(),
    tags: z.array(z.string()).default([]),
  })).min(1).max(100), // Limit bulk creation to 100 cards at once
});

export const cardRouter = createTRPCRouter({
  // Get all cards for a specific deck
  getByDeck: protectedProcedure
    .input(cardQuerySchema)
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { deckId, cardType, tags, search, limit, offset } = input;

      try {
        // First verify user has access to the deck
        const deck = await ctx.db.deck.findFirst({
          where: {
            id: deckId,
            OR: [
              { user_id: userId },
              { is_public: true },
            ],
          },
        });

        if (!deck) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Deck not found or you don't have access",
          });
        }

        const whereConditions: any = {
          deck_id: deckId,
        };

        if (cardType) {
          whereConditions.card_type = cardType;
        }

        if (tags && tags.length > 0) {
          whereConditions.tags = {
            hasEvery: tags,
          };
        }

        if (search) {
          whereConditions.OR = [
            { front: { contains: search, mode: "insensitive" } },
            { back: { contains: search, mode: "insensitive" } },
            { cloze_text: { contains: search, mode: "insensitive" } },
          ];
        }

        const [cards, totalCount] = await Promise.all([
          ctx.db.card.findMany({
            where: whereConditions,
            include: {
              deck: {
                select: {
                  id: true,
                  name: true,
                },
              },
              card_states: {
                where: {
                  user_id: userId,
                },
                take: 1,
              },
            },
            orderBy: {
              created_at: "desc",
            },
            take: limit,
            skip: offset,
          }),
          ctx.db.card.count({
            where: whereConditions,
          }),
        ]);

        return {
          cards,
          totalCount,
          hasMore: offset + limit < totalCount,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch cards",
          cause: error,
        });
      }
    }),

  // Get a single card by ID
  getById: protectedProcedure
    .input(cardParamsSchema)
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      try {
        const card = await ctx.db.card.findFirst({
          where: {
            id: input.id,
            deck: {
              OR: [
                { user_id: userId },
                { is_public: true },
              ],
            },
          },
          include: {
            deck: {
              select: {
                id: true,
                name: true,
                user_id: true,
              },
            },
            card_states: {
              where: {
                user_id: userId,
              },
              take: 1,
            },
          },
        });

        if (!card) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Card not found",
          });
        }

        return card;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch card",
          cause: error,
        });
      }
    }),

  // Create a new card
  create: protectedProcedure
    .input(createCardSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      try {
        // First verify user owns the deck
        const deck = await ctx.db.deck.findFirst({
          where: {
            id: input.deckId,
            user_id: userId,
          },
        });

        if (!deck) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Deck not found or you don't have permission to add cards",
          });
        }

        // Validate cloze content for cloze cards
        if (input.cardType === "CLOZE" && !input.clozeText) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cloze text is required for cloze deletion cards",
          });
        }

        const card = await ctx.db.$transaction(async (tx) => {
          // Create the card
          const newCard = await tx.card.create({
            data: {
              deck_id: input.deckId,
              card_type: input.cardType,
              front: input.front,
              back: input.back,
              cloze_text: input.clozeText,
              tags: input.tags,
              note_id: input.noteId,
            },
            include: {
              deck: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          });

          // Create initial card state for the user
          const initialState = SuperMemo2Algorithm.createInitialCardState(
            newCard.id,
            userId,
          );

          await tx.cardState.create({
            data: {
              card_id: initialState.cardId,
              user_id: initialState.userId,
              state: initialState.state,
              due_date: initialState.dueDate,
              interval: initialState.interval,
              repetitions: initialState.repetitions,
              easiness_factor: initialState.easinessFactor,
              lapses: initialState.lapses,
              last_reviewed: initialState.lastReviewed,
            },
          });

          return newCard;
        });

        return card;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create card",
          cause: error,
        });
      }
    }),

  // Bulk create cards
  bulkCreate: protectedProcedure
    .input(bulkCreateCardsSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      try {
        // First verify user owns the deck
        const deck = await ctx.db.deck.findFirst({
          where: {
            id: input.deckId,
            user_id: userId,
          },
        });

        if (!deck) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Deck not found or you don't have permission to add cards",
          });
        }

        const createdCards = await ctx.db.$transaction(async (tx) => {
          const cards = [];

          for (const cardData of input.cards) {
            // Validate cloze content for cloze cards
            if (cardData.cardType === "CLOZE" && !cardData.clozeText) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: "Cloze text is required for cloze deletion cards",
              });
            }

            // Create the card
            const newCard = await tx.card.create({
              data: {
                deck_id: input.deckId,
                card_type: cardData.cardType,
                front: cardData.front,
                back: cardData.back,
                cloze_text: cardData.clozeText,
                tags: cardData.tags,
              },
            });

            // Create initial card state for the user
            const initialState = SuperMemo2Algorithm.createInitialCardState(
              newCard.id,
              userId,
            );

            await tx.cardState.create({
              data: {
                card_id: initialState.cardId,
                user_id: initialState.userId,
                state: initialState.state,
                due_date: initialState.dueDate,
                interval: initialState.interval,
                repetitions: initialState.repetitions,
                easiness_factor: initialState.easinessFactor,
                lapses: initialState.lapses,
                last_reviewed: initialState.lastReviewed,
              },
            });

            cards.push(newCard);
          }

          return cards;
        });

        return {
          success: true,
          count: createdCards.length,
          cards: createdCards,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create cards",
          cause: error,
        });
      }
    }),

  // Update an existing card
  update: protectedProcedure
    .input(updateCardSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      try {
        // First check if user owns the deck containing the card
        const existingCard = await ctx.db.card.findFirst({
          where: {
            id: input.id,
            deck: {
              user_id: userId,
            },
          },
        });

        if (!existingCard) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Card not found or you don't have permission to edit it",
          });
        }

        // Validate cloze content for cloze cards
        if (input.cardType === "CLOZE" && input.clozeText === undefined) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cloze text is required for cloze deletion cards",
          });
        }

        const updateData: any = {};
        if (input.cardType !== undefined) updateData.card_type = input.cardType;
        if (input.front !== undefined) updateData.front = input.front;
        if (input.back !== undefined) updateData.back = input.back;
        if (input.clozeText !== undefined) updateData.cloze_text = input.clozeText;
        if (input.tags !== undefined) updateData.tags = input.tags;

        const card = await ctx.db.card.update({
          where: {
            id: input.id,
          },
          data: updateData,
          include: {
            deck: {
              select: {
                id: true,
                name: true,
              },
            },
            card_states: {
              where: {
                user_id: userId,
              },
              take: 1,
            },
          },
        });

        return card;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update card",
          cause: error,
        });
      }
    }),

  // Delete a card
  delete: protectedProcedure
    .input(cardParamsSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      try {
        // First check if user owns the deck containing the card
        const existingCard = await ctx.db.card.findFirst({
          where: {
            id: input.id,
            deck: {
              user_id: userId,
            },
          },
        });

        if (!existingCard) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Card not found or you don't have permission to delete it",
          });
        }

        await ctx.db.card.delete({
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
          message: "Failed to delete card",
          cause: error,
        });
      }
    }),

  // Search cards across all user's decks
  search: protectedProcedure
    .input(z.object({
      query: z.string().min(1, "Search query is required"),
      deckIds: z.array(z.string().uuid()).optional(),
      cardType: z.enum(["BASIC", "CLOZE"]).optional(),
      tags: z.array(z.string()).optional(),
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { query, deckIds, cardType, tags, limit, offset } = input;

      try {
        const whereConditions: any = {
          deck: {
            OR: [
              { user_id: userId },
              { is_public: true },
            ],
          },
          OR: [
            { front: { contains: query, mode: "insensitive" } },
            { back: { contains: query, mode: "insensitive" } },
            { cloze_text: { contains: query, mode: "insensitive" } },
          ],
        };

        if (deckIds && deckIds.length > 0) {
          whereConditions.deck_id = { in: deckIds };
        }

        if (cardType) {
          whereConditions.card_type = cardType;
        }

        if (tags && tags.length > 0) {
          whereConditions.tags = {
            hasEvery: tags,
          };
        }

        const [cards, totalCount] = await Promise.all([
          ctx.db.card.findMany({
            where: whereConditions,
            include: {
              deck: {
                select: {
                  id: true,
                  name: true,
                },
              },
              card_states: {
                where: {
                  user_id: userId,
                },
                take: 1,
              },
            },
            orderBy: [
              { updated_at: "desc" },
              { created_at: "desc" },
            ],
            take: limit,
            skip: offset,
          }),
          ctx.db.card.count({
            where: whereConditions,
          }),
        ]);

        return {
          cards,
          totalCount,
          hasMore: offset + limit < totalCount,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to search cards",
          cause: error,
        });
      }
    }),
});