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
  searchFields: z.array(z.enum(["front", "back", "cloze_text", "tags"])).optional(),
  createdAfter: z.date().optional(),
  createdBefore: z.date().optional(),
  sortBy: z.enum(["created_at", "updated_at", "front"]).default("created_at"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

const globalSearchSchema = z.object({
  search: z.string().min(1),
  cardType: z.enum(["BASIC", "CLOZE"]).optional(),
  tags: z.array(z.string()).optional(),
  deckIds: z.array(z.string().uuid()).optional(),
  searchFields: z.array(z.enum(["front", "back", "cloze_text", "tags"])).optional(),
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
      const { 
        deckId, 
        cardType, 
        tags, 
        search, 
        searchFields,
        createdAfter,
        createdBefore,
        sortBy,
        sortOrder,
        limit, 
        offset 
      } = input;

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

        // Enhanced search functionality
        if (search) {
          const searchConditions = [];
          const fieldsToSearch = searchFields || ["front", "back", "cloze_text", "tags"];
          
          if (fieldsToSearch.includes("front")) {
            searchConditions.push({ front: { contains: search, mode: "insensitive" } });
          }
          if (fieldsToSearch.includes("back")) {
            searchConditions.push({ back: { contains: search, mode: "insensitive" } });
          }
          if (fieldsToSearch.includes("cloze_text")) {
            searchConditions.push({ cloze_text: { contains: search, mode: "insensitive" } });
          }
          if (fieldsToSearch.includes("tags")) {
            searchConditions.push({ tags: { hasSome: [search] } });
          }
          
          whereConditions.OR = searchConditions;
        }

        // Date range filtering
        if (createdAfter || createdBefore) {
          whereConditions.created_at = {};
          if (createdAfter) {
            whereConditions.created_at.gte = createdAfter;
          }
          if (createdBefore) {
            whereConditions.created_at.lte = createdBefore;
          }
        }

        // Dynamic sorting
        const orderBy: any = {};
        orderBy[sortBy] = sortOrder;

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
            orderBy,
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

        // Validate all cards before creating
        for (const cardData of input.cards) {
          if (cardData.cardType === "CLOZE" && !cardData.clozeText) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Cloze text is required for cloze deletion cards",
            });
          }
        }

        // Use createMany for better performance in serverless
        const createdCards = await ctx.db.$transaction(async (tx) => {
          // Prepare card data for bulk creation
          const cardsToCreate = input.cards.map(cardData => ({
            deck_id: input.deckId,
            card_type: cardData.cardType as CardType,
            front: cardData.front,
            back: cardData.back,
            cloze_text: cardData.clozeText,
            tags: cardData.tags,
          }));

          // Bulk create all cards at once
          await tx.card.createMany({
            data: cardsToCreate,
          });

          // Fetch the created cards to get their IDs
          const cards = await tx.card.findMany({
            where: {
              deck_id: input.deckId,
              created_at: {
                gte: new Date(Date.now() - 1000), // Cards created in the last second
              },
            },
            orderBy: {
              created_at: 'desc',
            },
            take: input.cards.length,
          });

          // Prepare card states for bulk creation
          const cardStates = cards.map(card => {
            const initialState = SuperMemo2Algorithm.createInitialCardState(
              card.id,
              userId,
            );
            
            return {
              card_id: initialState.cardId,
              user_id: initialState.userId,
              state: initialState.state,
              due_date: initialState.dueDate,
              interval: initialState.interval,
              repetitions: initialState.repetitions,
              easiness_factor: initialState.easinessFactor,
              lapses: initialState.lapses,
              last_reviewed: initialState.lastReviewed,
            };
          });

          // Bulk create all card states at once
          await tx.cardState.createMany({
            data: cardStates,
          });

          return cards;
        }, {
          maxWait: 50000, // 50 seconds max wait
          timeout: 60000, // 60 seconds timeout
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
        // First check if user owns the deck containing the card or is a member of the organization
        const existingCard = await ctx.db.card.findFirst({
          where: {
            id: input.id,
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

  // Global search across all accessible decks
  globalSearch: protectedProcedure
    .input(globalSearchSchema)
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { search, cardType, tags, deckIds, searchFields, limit, offset } = input;

      try {
        const whereConditions: any = {
          deck: {
            OR: [
              { user_id: userId },
              { is_public: true },
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
        };

        // Card type filter
        if (cardType) {
          whereConditions.card_type = cardType;
        }

        // Tags filter
        if (tags && tags.length > 0) {
          whereConditions.tags = {
            hasEvery: tags,
          };
        }

        // Deck filter
        if (deckIds && deckIds.length > 0) {
          whereConditions.deck_id = { in: deckIds };
        }

        // Enhanced search functionality
        const searchConditions = [];
        const fieldsToSearch = searchFields || ["front", "back", "cloze_text", "tags"];
        
        if (fieldsToSearch.includes("front")) {
          searchConditions.push({ front: { contains: search, mode: "insensitive" } });
        }
        if (fieldsToSearch.includes("back")) {
          searchConditions.push({ back: { contains: search, mode: "insensitive" } });
        }
        if (fieldsToSearch.includes("cloze_text")) {
          searchConditions.push({ cloze_text: { contains: search, mode: "insensitive" } });
        }
        if (fieldsToSearch.includes("tags")) {
          searchConditions.push({ tags: { hasSome: [search] } });
        }
        
        whereConditions.OR = searchConditions;

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
              updated_at: "desc",
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
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR", 
          message: "Failed to perform global search",
          cause: error,
        });
      }
    }),

  // Get popular tags across user's cards
  getPopularTags: protectedProcedure
    .input(z.object({
      deckId: z.string().uuid().optional(),
      limit: z.number().min(1).max(50).default(20),
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { deckId, limit } = input;

      try {
        const whereConditions: any = {
          deck: {
            OR: [
              { user_id: userId },
              { is_public: true },
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
        };

        if (deckId) {
          whereConditions.deck_id = deckId;
        }

        const cards = await ctx.db.card.findMany({
          where: whereConditions,
          select: {
            tags: true,
          },
        });

        // Count tag frequency
        const tagCounts: Record<string, number> = {};
        cards.forEach(card => {
          card.tags.forEach(tag => {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
          });
        });

        // Sort by frequency and return top tags
        const popularTags = Object.entries(tagCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, limit)
          .map(([tag, count]) => ({ tag, count }));

        return popularTags;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get popular tags",
          cause: error,
        });
      }
    }),
});