import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { DeckImportService } from "@/server/services/deckImport";

const exportDeckSchema = z.object({
  deckId: z.string().uuid(),
});

const importDeckSchema = z.object({
  jsonData: z.string(),
  organizationId: z.string().uuid().optional(),
});

const validateImportSchema = z.object({
  jsonData: z.string(),
});

export const importRouter = createTRPCRouter({
  // Export a deck to JSON
  exportDeck: protectedProcedure
    .input(exportDeckSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const importService = new DeckImportService(ctx.db);

      try {
        const exportData = await importService.exportDeck(input.deckId, userId);
        return {
          success: true,
          data: exportData,
          filename: `${exportData.deck.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${new Date().getTime()}.json`,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to export deck",
          cause: error,
        });
      }
    }),

  // Validate import data without importing
  validateImport: protectedProcedure
    .input(validateImportSchema)
    .mutation(async ({ ctx, input }) => {
      const importService = new DeckImportService(ctx.db);

      try {
        // Parse the JSON
        const jsonBuffer = Buffer.from(input.jsonData, 'utf-8');
        const data = importService.parseJsonFile(jsonBuffer);
        
        // Validate the data
        const validation = importService.validateImportData(data);
        
        return {
          isValid: validation.isValid,
          errors: validation.errors,
          warnings: validation.warnings,
          cardCount: validation.cardCount,
          deckName: data.deck?.name || 'Unknown',
          preview: {
            deckInfo: {
              name: data.deck?.name || 'Unknown',
              description: data.deck?.description || undefined,
              cardCount: validation.cardCount,
            },
            sampleCards: data.cards?.slice(0, 3).map((card, index) => ({
              index: index + 1,
              cardType: card.cardType,
              front: card.front?.substring(0, 100) + (card.front?.length > 100 ? '...' : ''),
              back: card.back?.substring(0, 100) + (card.back?.length > 100 ? '...' : ''),
              tags: card.tags?.slice(0, 3) || [],
            })) || [],
          },
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        
        return {
          isValid: false,
          errors: [`Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown error'}`],
          warnings: [],
          cardCount: 0,
          deckName: 'Unknown',
          preview: {
            deckInfo: {
              name: 'Unknown',
              description: undefined,
              cardCount: 0,
            },
            sampleCards: [],
          },
        };
      }
    }),

  // Import a deck from JSON
  importDeck: protectedProcedure
    .input(importDeckSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const importService = new DeckImportService(ctx.db);

      try {
        // Parse the JSON
        const jsonBuffer = Buffer.from(input.jsonData, 'utf-8');
        const data = importService.parseJsonFile(jsonBuffer);
        
        // Import the deck
        const result = await importService.importDeck(
          data,
          userId,
          input.organizationId
        );

        if (!result.success) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Import failed: ${result.errors.join(', ')}`,
          });
        }

        return result;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to import deck",
          cause: error,
        });
      }
    }),

  // Get import/export history (placeholder for future feature)
  getImportHistory: protectedProcedure
    .query(async ({ ctx }) => {
      // This could be implemented to track import/export history
      // For now, return empty array
      return [];
    }),
});