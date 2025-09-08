import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { ApiKeyService } from "@/server/services/apiKey";

export const apiKeyRouter = createTRPCRouter({
  /**
   * Generate a new API key
   */
  generate: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        expiresAt: z.date().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { apiKey, plainKey } = await ApiKeyService.generateApiKey(
        ctx.session.user.id,
        input.name,
        input.expiresAt,
      );

      return {
        id: apiKey.id,
        name: apiKey.name,
        key: plainKey,
        createdAt: apiKey.createdAt,
        expiresAt: apiKey.expiresAt,
      };
    }),

  /**
   * List all API keys for the current user
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    const apiKeys = await ApiKeyService.listUserApiKeys(ctx.session.user.id);

    return apiKeys.map((key) => ({
      id: key.id,
      name: key.name,
      createdAt: key.createdAt,
      lastUsedAt: key.lastUsedAt,
      expiresAt: key.expiresAt,
      isActive: key.isActive,
      usageCount: key.usageCount,
      revokedAt: key.revokedAt,
      isExpired: key.expiresAt ? key.expiresAt < new Date() : false,
    }));
  }),

  /**
   * Revoke an API key
   */
  revoke: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const success = await ApiKeyService.revokeApiKey(
        ctx.session.user.id,
        input.id,
      );

      if (!success) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "API key not found or already revoked",
        });
      }

      return { success: true };
    }),

  /**
   * Get usage statistics for API keys
   */
  usageStats: protectedProcedure
    .input(
      z.object({
        days: z.number().min(1).max(90).optional().default(30),
      }),
    )
    .query(async ({ ctx, input }) => {
      const stats = await ApiKeyService.getUserApiUsageStats(
        ctx.session.user.id,
        input.days,
      );

      return stats;
    }),

  /**
   * Rotate an API key (revoke old, generate new)
   */
  rotate: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        newName: z.string().min(1).max(255).optional(),
        expiresAt: z.date().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Get the old key to use its name if not provided
      const oldKey = await ctx.db.apiKey.findFirst({
        where: {
          id: input.id,
          userId: ctx.session.user.id,
          isActive: true,
        },
      });

      if (!oldKey) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "API key not found",
        });
      }

      // Revoke the old key
      await ApiKeyService.revokeApiKey(ctx.session.user.id, input.id);

      // Generate new key
      const { apiKey, plainKey } = await ApiKeyService.generateApiKey(
        ctx.session.user.id,
        input.newName || oldKey.name,
        input.expiresAt,
      );

      return {
        id: apiKey.id,
        name: apiKey.name,
        key: plainKey,
        createdAt: apiKey.createdAt,
        expiresAt: apiKey.expiresAt,
      };
    }),
});
