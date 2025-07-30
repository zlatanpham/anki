import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { getAIService } from "@/server/services/ai";
import { TRPCError } from "@trpc/server";
import { env } from "@/env";

export const aiRouter = createTRPCRouter({
  // Generate cards from text
  generateCards: protectedProcedure
    .input(
      z.object({
        text: z.string().min(10, "Text must be at least 10 characters"),
        deckId: z.string().uuid().optional(),
        deckContext: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if AI is configured
      if (!env.GOOGLE_GENERATIVE_AI_API_KEY) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "AI features are not configured. Please add your Google AI API key.",
        });
      }

      // Get deck info if deckId provided
      let deckContext = input.deckContext;
      if (input.deckId && !deckContext) {
        const deck = await ctx.db.deck.findUnique({
          where: { id: input.deckId },
          select: { name: true, description: true },
        });
        if (deck) {
          deckContext = `Deck: ${deck.name}${deck.description ? `. ${deck.description}` : ''}`;
        }
      }

      const aiService = getAIService();
      const cards = await aiService.generateCards(input.text, deckContext);

      // Track usage
      await ctx.db.aIGeneration.create({
        data: {
          user_id: ctx.session.user.id,
          deck_id: input.deckId,
          input_text: input.text,
          generated_cards: cards as any, // Prisma Json type
          tokens_used: Math.ceil(input.text.length / 4), // rough estimate
          model_used: env.AI_MODEL || 'gemini-1.5-flash',
        },
      });

      return { cards };
    }),

  // Suggest cloze deletions
  suggestClozes: protectedProcedure
    .input(
      z.object({
        text: z.string().min(10, "Text must be at least 10 characters"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!env.GOOGLE_GENERATIVE_AI_API_KEY) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "AI features are not configured.",
        });
      }

      const aiService = getAIService();
      const suggestions = await aiService.suggestClozes(input.text);

      return { suggestions };
    }),

  // Check grammar and spelling
  checkGrammar: protectedProcedure
    .input(
      z.object({
        text: z.string().min(1, "Text cannot be empty"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!env.GOOGLE_GENERATIVE_AI_API_KEY) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "AI features are not configured.",
        });
      }

      const aiService = getAIService();
      const result = await aiService.correctGrammar(input.text);

      return result;
    }),

  // Improve existing card
  improveCard: protectedProcedure
    .input(
      z.object({
        cardId: z.string().uuid(),
        front: z.string(),
        back: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!env.GOOGLE_GENERATIVE_AI_API_KEY) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "AI features are not configured.",
        });
      }

      // Verify card ownership
      const card = await ctx.db.card.findFirst({
        where: {
          id: input.cardId,
          deck: {
            user_id: ctx.session.user.id,
          },
        },
      });

      if (!card) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Card not found or you don't have permission to edit it.",
        });
      }

      const aiService = getAIService();
      const result = await aiService.improveCard({
        front: input.front,
        back: input.back,
      });

      return result;
    }),

  // Analyze text before generation
  analyzeText: protectedProcedure
    .input(
      z.object({
        text: z.string().min(10, "Text must be at least 10 characters"),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!env.GOOGLE_GENERATIVE_AI_API_KEY) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "AI features are not configured.",
        });
      }

      const aiService = getAIService();
      const analysis = await aiService.analyzeText(input.text);

      return analysis;
    }),

  // Get AI generation history
  getGenerationHistory: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(10),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const generations = await ctx.db.aIGeneration.findMany({
        where: {
          user_id: ctx.session.user.id,
        },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: {
          created_at: 'desc',
        },
        select: {
          id: true,
          input_text: true,
          generated_cards: true,
          tokens_used: true,
          model_used: true,
          created_at: true,
          deck: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      let nextCursor: typeof input.cursor | undefined = undefined;
      if (generations.length > input.limit) {
        const nextItem = generations.pop();
        nextCursor = nextItem!.id;
      }

      return {
        items: generations,
        nextCursor,
      };
    }),

  // Get AI usage stats
  getUsageStats: protectedProcedure.query(async ({ ctx }) => {
    const stats = await ctx.db.aIGeneration.aggregate({
      where: {
        user_id: ctx.session.user.id,
      },
      _sum: {
        tokens_used: true,
      },
      _count: {
        id: true,
      },
    });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const monthlyStats = await ctx.db.aIGeneration.aggregate({
      where: {
        user_id: ctx.session.user.id,
        created_at: {
          gte: thirtyDaysAgo,
        },
      },
      _sum: {
        tokens_used: true,
      },
      _count: {
        id: true,
      },
    });

    return {
      totalGenerations: stats._count.id,
      totalTokensUsed: stats._sum.tokens_used || 0,
      monthlyGenerations: monthlyStats._count.id,
      monthlyTokensUsed: monthlyStats._sum.tokens_used || 0,
      rateLimit: parseInt(env.AI_RATE_LIMIT || '100'),
    };
  }),
});