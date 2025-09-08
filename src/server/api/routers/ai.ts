import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { getAIService } from "@/server/services/ai";
import { TRPCError } from "@trpc/server";
import { env } from "@/env";

export const aiRouter = createTRPCRouter({

  // Check grammar and spelling
  checkGrammar: protectedProcedure
    .input(
      z.object({
        text: z.string().min(1, "Text cannot be empty"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!env.GOOGLE_GENERATIVE_AI_API_KEY) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "AI features are not configured.",
        });
      }

      // Get user's organization
      const userOrg = await ctx.db.organizationMember.findFirst({
        where: { user_id: ctx.session.user.id },
        select: { organization_id: true }
      });
      
      const aiService = getAIService(ctx.session.user.id, userOrg?.organization_id);
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
      }),
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

      // Get user's organization
      const userOrg = await ctx.db.organizationMember.findFirst({
        where: { user_id: ctx.session.user.id },
        select: { organization_id: true }
      });
      
      const aiService = getAIService(ctx.session.user.id, userOrg?.organization_id);
      const result = await aiService.improveCard({
        front: input.front,
        back: input.back,
      });

      return result;
    }),


  // Explain answer for a card
  explainAnswer: protectedProcedure
    .input(
      z.object({
        cardId: z.string().uuid(),
        questionType: z.enum(["eli5", "example", "importance", "breakdown", "custom"]),
        customQuestion: z.string().max(500).optional(),
        conversationHistory: z.array(z.object({
          question: z.string(),
          answer: z.string(),
        })).max(5).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check if AI is configured
      if (!env.GOOGLE_GENERATIVE_AI_API_KEY) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "AI features are not configured. Please add your Google AI API key.",
        });
      }

      // Rate limiting check
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const recentExplanations = await ctx.db.cardExplanation.count({
        where: {
          user_id: ctx.session.user.id,
          created_at: {
            gte: oneHourAgo,
          },
        },
      });

      const rateLimit = parseInt(env.AI_RATE_LIMIT || "100");
      if (recentExplanations >= rateLimit) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: `Rate limit exceeded. You can generate up to ${rateLimit} explanations per hour.`,
        });
      }

      // Get the card with deck ownership check
      const card = await ctx.db.card.findFirst({
        where: {
          id: input.cardId,
          deck: {
            OR: [
              { user_id: ctx.session.user.id },
              {
                organization: {
                  OrganizationMember: {
                    some: {
                      user_id: ctx.session.user.id,
                    },
                  },
                },
              },
            ],
          },
        },
        select: {
          id: true,
          front: true,
          back: true,
          cloze_text: true,
          card_type: true,
        },
      });

      if (!card) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Card not found or you don't have permission to access it.",
        });
      }

      // Get user's organization
      const userOrg = await ctx.db.organizationMember.findFirst({
        where: { user_id: ctx.session.user.id },
        select: { organization_id: true },
      });

      const aiService = getAIService(ctx.session.user.id, userOrg?.organization_id);
      const result = await aiService.explainAnswer(
        {
          front: card.front,
          back: card.back,
          clozeText: card.cloze_text || undefined,
        },
        input.questionType,
        input.customQuestion,
        input.conversationHistory,
      );

      // Store the explanation in the database
      const explanation = await ctx.db.cardExplanation.create({
        data: {
          card_id: input.cardId,
          user_id: ctx.session.user.id,
          question_type: input.questionType,
          question: input.customQuestion,
          explanation: result.explanation,
          tokens_used: Math.ceil(result.explanation.length / 4), // rough estimate
        },
      });

      return {
        id: explanation.id,
        explanation: result.explanation,
        suggestedFollowUps: result.suggestedFollowUps,
        confidence: result.confidence,
      };
    }),

  // Save an explanation for later reference
  saveExplanation: protectedProcedure
    .input(
      z.object({
        explanationId: z.string().uuid(),
        tags: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const explanation = await ctx.db.cardExplanation.findFirst({
        where: {
          id: input.explanationId,
          user_id: ctx.session.user.id,
        },
      });

      if (!explanation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Explanation not found.",
        });
      }

      const updated = await ctx.db.cardExplanation.update({
        where: { id: input.explanationId },
        data: {
          is_saved: true,
          tags: input.tags || [],
        },
      });

      return { success: true, id: updated.id };
    }),

  // Get saved explanations for a card
  getCardExplanations: protectedProcedure
    .input(
      z.object({
        cardId: z.string().uuid(),
        savedOnly: z.boolean().default(false),
      }),
    )
    .query(async ({ ctx, input }) => {
      const explanations = await ctx.db.cardExplanation.findMany({
        where: {
          card_id: input.cardId,
          user_id: ctx.session.user.id,
          ...(input.savedOnly ? { is_saved: true } : {}),
        },
        orderBy: {
          created_at: "desc",
        },
        select: {
          id: true,
          question_type: true,
          question: true,
          explanation: true,
          is_saved: true,
          tags: true,
          created_at: true,
        },
      });

      return explanations;
    }),

  // Get user's explanation history
  getExplanationHistory: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(10),
        cursor: z.string().optional(),
        savedOnly: z.boolean().default(false),
      }),
    )
    .query(async ({ ctx, input }) => {
      const explanations = await ctx.db.cardExplanation.findMany({
        where: {
          user_id: ctx.session.user.id,
          ...(input.savedOnly ? { is_saved: true } : {}),
        },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: {
          created_at: "desc",
        },
        select: {
          id: true,
          question_type: true,
          question: true,
          explanation: true,
          is_saved: true,
          tags: true,
          created_at: true,
          card: {
            select: {
              id: true,
              front: true,
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

      let nextCursor: typeof input.cursor | undefined = undefined;
      if (explanations.length > input.limit) {
        const nextItem = explanations.pop();
        nextCursor = nextItem!.id;
      }

      return {
        items: explanations,
        nextCursor,
      };
    }),

  // Get available AI providers
  getAvailableProviders: protectedProcedure.query(async ({ ctx }) => {
    const providers = [];
    
    if (env.GOOGLE_GENERATIVE_AI_API_KEY) {
      providers.push({
        id: "google",
        name: "Google AI",
        models: ["gemini-2.0-flash-experimental", "gemini-1.5-pro"],
        default: env.AI_PROVIDER === "google",
      });
    }
    
    if (env.OPENAI_API_KEY) {
      providers.push({
        id: "openai",
        name: "OpenAI",
        models: ["gpt-4o", "gpt-4o-mini", "gpt-3.5-turbo"],
        default: env.AI_PROVIDER === "openai",
      });
    }
    
    if (env.ANTHROPIC_API_KEY) {
      providers.push({
        id: "anthropic",
        name: "Anthropic",
        models: ["claude-3-opus-20240229", "claude-3-sonnet-20240229", "claude-3-haiku-20240307"],
        default: env.AI_PROVIDER === "anthropic",
      });
    }
    
    return {
      providers,
      currentProvider: env.AI_PROVIDER || "google",
      currentModel: env.AI_MODEL,
    };
  }),

  // Bulk explain multiple cards
  bulkExplainCards: protectedProcedure
    .input(
      z.object({
        cardIds: z.array(z.string().uuid()).min(1).max(10),
        questionType: z.enum(["eli5", "example", "importance", "breakdown"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check if AI is configured
      if (!env.GOOGLE_GENERATIVE_AI_API_KEY && !env.OPENAI_API_KEY && !env.ANTHROPIC_API_KEY) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "AI features are not configured.",
        });
      }

      // Rate limiting check for bulk operations
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const recentExplanations = await ctx.db.cardExplanation.count({
        where: {
          user_id: ctx.session.user.id,
          created_at: {
            gte: oneHourAgo,
          },
        },
      });

      const rateLimit = parseInt(env.AI_RATE_LIMIT || "100");
      const remainingQuota = rateLimit - recentExplanations;
      
      if (remainingQuota <= 0) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: `Rate limit exceeded. You can generate up to ${rateLimit} explanations per hour.`,
        });
      }

      if (input.cardIds.length > remainingQuota) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: `You can only generate ${remainingQuota} more explanations this hour. Please reduce the number of cards or try again later.`,
        });
      }

      // Get all cards with ownership check
      const cards = await ctx.db.card.findMany({
        where: {
          id: { in: input.cardIds },
          deck: {
            OR: [
              { user_id: ctx.session.user.id },
              {
                organization: {
                  OrganizationMember: {
                    some: {
                      user_id: ctx.session.user.id,
                    },
                  },
                },
              },
            ],
          },
        },
        select: {
          id: true,
          front: true,
          back: true,
          cloze_text: true,
          card_type: true,
        },
      });

      if (cards.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No cards found or you don't have permission to access them.",
        });
      }

      // Get user's organization
      const userOrg = await ctx.db.organizationMember.findFirst({
        where: { user_id: ctx.session.user.id },
        select: { organization_id: true },
      });

      const aiService = getAIService(ctx.session.user.id, userOrg?.organization_id);
      
      // Process cards in parallel (but with a limit to avoid rate limiting)
      const results = await Promise.allSettled(
        cards.map(async (card) => {
          try {
            const result = await aiService.explainAnswer(
              {
                front: card.front,
                back: card.back,
                clozeText: card.cloze_text || undefined,
              },
              input.questionType,
            );

            // Store the explanation in the database
            const explanation = await ctx.db.cardExplanation.create({
              data: {
                card_id: card.id,
                user_id: ctx.session.user.id,
                question_type: input.questionType,
                explanation: result.explanation,
                tokens_used: Math.ceil(result.explanation.length / 4),
              },
            });

            return {
              cardId: card.id,
              explanationId: explanation.id,
              explanation: result.explanation,
              status: "success" as const,
            };
          } catch (error) {
            return {
              cardId: card.id,
              status: "error" as const,
              error: error instanceof Error ? error.message : "Unknown error",
            };
          }
        }),
      );

      // Process results
      const successful = results.filter(
        (r): r is PromiseFulfilledResult<any> => r.status === "fulfilled",
      ).map(r => r.value);
      
      const failed = results.filter(
        (r): r is PromiseRejectedResult => r.status === "rejected",
      ).map((r, index) => ({
        cardId: cards[index]?.id || "unknown",
        status: "error" as const,
        error: r.reason?.message || "Unknown error",
      }));

      return {
        successful,
        failed,
        totalProcessed: results.length,
        successCount: successful.filter(s => s.status === "success").length,
        failureCount: failed.length + successful.filter(s => s.status === "error").length,
      };
    }),

  // Export saved explanations
  exportExplanations: protectedProcedure
    .input(
      z.object({
        format: z.enum(["json", "csv", "markdown"]),
        deckId: z.string().uuid().optional(),
        savedOnly: z.boolean().default(true),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Build query
      const where: any = {
        user_id: ctx.session.user.id,
      };
      
      if (input.savedOnly) {
        where.is_saved = true;
      }
      
      if (input.deckId) {
        where.card = {
          deck_id: input.deckId,
        };
      }

      const explanations = await ctx.db.cardExplanation.findMany({
        where,
        include: {
          card: {
            select: {
              front: true,
              back: true,
              cloze_text: true,
              deck: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          created_at: "desc",
        },
      });

      if (explanations.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No explanations found to export.",
        });
      }

      // Format the data based on requested format
      switch (input.format) {
        case "json":
          return {
            format: "json",
            filename: `explanations-${new Date().toISOString().split("T")[0]}.json`,
            content: JSON.stringify(
              explanations.map(e => ({
                deck: e.card.deck.name,
                question: e.card.cloze_text || e.card.front,
                answer: e.card.cloze_text 
                  ? e.card.cloze_text.replace(/\{\{c\d+::([^}]+)\}\}/g, '$1')
                  : e.card.back,
                questionType: e.question_type,
                customQuestion: e.question,
                explanation: e.explanation,
                tags: e.tags,
                createdAt: e.created_at,
              })),
              null,
              2,
            ),
          };

        case "csv":
          // Create CSV content
          const csvRows = [
            ["Deck", "Question", "Answer", "Question Type", "Custom Question", "Explanation", "Tags", "Created At"],
            ...explanations.map(e => [
              e.card.deck.name,
              e.card.cloze_text || e.card.front,
              e.card.cloze_text 
                ? e.card.cloze_text.replace(/\{\{c\d+::([^}]+)\}\}/g, '$1')
                : e.card.back,
              e.question_type,
              e.question || "",
              e.explanation,
              e.tags.join(", "),
              e.created_at.toISOString(),
            ]),
          ];
          
          const csvContent = csvRows
            .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
            .join("\n");
            
          return {
            format: "csv",
            filename: `explanations-${new Date().toISOString().split("T")[0]}.csv`,
            content: csvContent,
          };

        case "markdown":
          // Create Markdown content
          const mdContent = explanations.map(e => {
            const question = e.card.cloze_text || e.card.front;
            const answer = e.card.cloze_text 
              ? e.card.cloze_text.replace(/\{\{c\d+::([^}]+)\}\}/g, '$1')
              : e.card.back;
              
            return `## ${e.card.deck.name} - Card

**Question:** ${question}

**Answer:** ${answer}

${e.question ? `**Custom Question:** ${e.question}\n\n` : ""}**Explanation Type:** ${e.question_type}

**AI Explanation:**
${e.explanation}

${e.tags.length > 0 ? `**Tags:** ${e.tags.join(", ")}\n\n` : ""}**Date:** ${e.created_at.toLocaleDateString()}

---
`;
          }).join("\n");
          
          return {
            format: "markdown",
            filename: `explanations-${new Date().toISOString().split("T")[0]}.md`,
            content: `# AI Answer Explanations Export

Generated on ${new Date().toLocaleDateString()}

Total explanations: ${explanations.length}

---

${mdContent}`,
          };

        default:
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid export format.",
          });
      }
    }),

  // Get explanation usage analytics
  getExplanationAnalytics: protectedProcedure
    .input(
      z.object({
        period: z.enum(["day", "week", "month", "all"]).default("month"),
      }),
    )
    .query(async ({ ctx, input }) => {
      const now = new Date();
      let startDate: Date;
      
      switch (input.period) {
        case "day":
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case "week":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "month":
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case "all":
          startDate = new Date(0); // Beginning of time
          break;
      }

      // Get explanation usage from AIUsageLog
      const usageLogs = await ctx.db.aIUsageLog.findMany({
        where: {
          user_id: ctx.session.user.id,
          feature: "answer_explanation",
          created_at: {
            gte: startDate,
          },
        },
        orderBy: {
          created_at: "desc",
        },
      });

      // Get saved explanations count
      const savedExplanations = await ctx.db.cardExplanation.count({
        where: {
          user_id: ctx.session.user.id,
          is_saved: true,
          created_at: {
            gte: startDate,
          },
        },
      });

      // Get total explanations count
      const totalExplanations = await ctx.db.cardExplanation.count({
        where: {
          user_id: ctx.session.user.id,
          created_at: {
            gte: startDate,
          },
        },
      });

      // Get question type distribution
      const questionTypeStats = await ctx.db.cardExplanation.groupBy({
        by: ["question_type"],
        where: {
          user_id: ctx.session.user.id,
          created_at: {
            gte: startDate,
          },
        },
        _count: {
          id: true,
        },
      });

      // Calculate costs and tokens
      const totalCost = usageLogs.reduce((sum, log) => 
        sum + parseFloat(log.total_cost.toString()), 0
      );
      const totalTokens = usageLogs.reduce((sum, log) => 
        sum + log.total_tokens, 0
      );
      const successfulRequests = usageLogs.filter(log => 
        log.status === "success"
      ).length;
      const failedRequests = usageLogs.filter(log => 
        log.status === "error"
      ).length;

      // Get average latency
      const avgLatency = usageLogs.length > 0
        ? usageLogs.reduce((sum, log) => sum + log.latency_ms, 0) / usageLogs.length
        : 0;

      // Get daily usage for charts
      const dailyUsage = await ctx.db.$queryRaw<Array<{
        date: Date;
        count: bigint;
        tokens: bigint;
        cost: number;
      }>>`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as count,
          SUM(total_tokens) as tokens,
          SUM(total_cost) as cost
        FROM "AIUsageLog"
        WHERE user_id = ${ctx.session.user.id}
          AND feature = 'answer_explanation'
          AND created_at >= ${startDate}
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `;

      return {
        summary: {
          totalExplanations,
          savedExplanations,
          totalRequests: usageLogs.length,
          successfulRequests,
          failedRequests,
          successRate: usageLogs.length > 0 
            ? (successfulRequests / usageLogs.length) * 100 
            : 0,
          totalCost,
          totalTokens,
          avgLatency: Math.round(avgLatency),
          avgTokensPerRequest: usageLogs.length > 0 
            ? Math.round(totalTokens / usageLogs.length)
            : 0,
        },
        questionTypes: questionTypeStats.map(stat => ({
          type: stat.question_type,
          count: stat._count.id,
        })),
        dailyUsage: dailyUsage.map(day => ({
          date: day.date,
          count: Number(day.count),
          tokens: Number(day.tokens),
          cost: day.cost || 0,
        })),
      };
    }),

  // Get rate limit status
  getRateLimitStatus: protectedProcedure.query(async ({ ctx }) => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentExplanations = await ctx.db.cardExplanation.count({
      where: {
        user_id: ctx.session.user.id,
        created_at: {
          gte: oneHourAgo,
        },
      },
    });

    const rateLimit = parseInt(env.AI_RATE_LIMIT || "100");
    const remaining = Math.max(0, rateLimit - recentExplanations);
    const resetTime = new Date(oneHourAgo.getTime() + 60 * 60 * 1000);

    return {
      limit: rateLimit,
      used: recentExplanations,
      remaining,
      resetTime,
      isLimited: remaining === 0,
    };
  }),
});
