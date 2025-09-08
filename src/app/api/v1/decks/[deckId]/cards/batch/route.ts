import { NextResponse } from "next/server";
import {
  withAuthAndRateLimit,
  createErrorResponse,
} from "../../../../middleware";
import type { AuthenticatedRequest } from "../../../../middleware";
import { db } from "@/server/db";
import { z } from "zod";
import type { CardType } from "@prisma/client";
import { parseClozeText } from "@/lib/cloze";

// Validation schema
const batchAddCardsSchema = z.object({
  cards: z
    .array(
      z.object({
        front: z.string().min(1),
        back: z.string().min(1),
        cardType: z.enum(["BASIC", "CLOZE"]).optional().default("BASIC"),
        clozeText: z.string().optional(),
        tags: z.array(z.string()).optional().default([]),
      }),
    )
    .min(1)
    .max(100),
});

// POST /api/v1/decks/{deckId}/cards/batch - Add multiple cards to a deck
export const POST = withAuthAndRateLimit(
  async (request: AuthenticatedRequest, _params?: unknown) => {
    try {
      // Extract deckId from URL path
      const url = new URL(request.url);
      const pathSegments = url.pathname.split("/");
      const deckId =
        pathSegments[
          pathSegments.findIndex((segment) => segment === "decks") + 1
        ];

      if (!deckId) {
        return createErrorResponse(
          "INVALID_REQUEST",
          "Deck ID not found in URL",
          400,
        );
      }

      // Verify deck exists and user has access
      const deck = await db.deck.findFirst({
        where: {
          id: deckId,
          user_id: request.user!.id,
        },
      });

      if (!deck) {
        return createErrorResponse(
          "RESOURCE_NOT_FOUND",
          "Deck not found or you do not have access to it",
          404,
        );
      }

      // Parse request body
      const body = await request.json();
      const data = batchAddCardsSchema.parse(body);

      // Validate cards
      const results: Array<{
        success: boolean;
        error?: string;
        cardId?: string;
      }> = [];
      const cardsToCreate: Array<{
        deck_id: string;
        card_type: CardType;
        front: string;
        back: string;
        cloze_text?: string;
        tags?: string[];
      }> = [];

      for (const [index, cardData] of data.cards.entries()) {
        try {
          // Validate cloze cards
          if (cardData.cardType === "CLOZE") {
            if (!cardData.clozeText) {
              results.push({
                success: false,
                error: "Cloze text is required for CLOZE card type",
              });
              continue;
            }

            // Validate cloze syntax
            const clozeCards = parseClozeText(cardData.clozeText);
            if (clozeCards.length === 0) {
              results.push({
                success: false,
                error:
                  "Cloze text must contain at least one {{cloze}} deletion",
              });
              continue;
            }
          }

          cardsToCreate.push({
            deck_id: deckId,
            card_type: cardData.cardType as CardType,
            front: cardData.front,
            back: cardData.back,
            cloze_text: cardData.clozeText,
            tags: cardData.tags,
          });

          results.push({ success: true });
        } catch {
          results.push({
            success: false,
            error: `Invalid card data at index ${index}`,
          });
        }
      }

      // Create cards in a transaction
      await db.$transaction(async (tx) => {
        const cards = [];

        for (const [index, cardData] of cardsToCreate.entries()) {
          const card = await tx.card.create({
            data: cardData,
          });

          // Create initial card state for the user
          await tx.cardState.create({
            data: {
              card_id: card.id,
              user_id: request.user!.id,
              state: "NEW",
              due_date: new Date(),
              interval: 0,
              repetitions: 0,
              easiness_factor: 2.5,
              lapses: 0,
            },
          });

          // Update the result with card ID
          const resultIndex = results.findIndex(
            (r, i) => r.success && i <= index,
          );
          if (resultIndex !== -1 && results[resultIndex]) {
            results[resultIndex].cardId = card.id;
          }

          cards.push(card);
        }

        return cards;
      });

      // Calculate success stats
      const successCount = results.filter((r) => r.success).length;
      const failureCount = results.filter((r) => !r.success).length;

      return NextResponse.json({
        message: `Successfully created ${successCount} cards`,
        created: successCount,
        failed: failureCount,
        results,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return createErrorResponse(
          "VALIDATION_ERROR",
          "Invalid request body",
          400,
          { errors: error.errors },
        );
      }

      console.error("Batch add cards error:", error);
      return createErrorResponse("INTERNAL_ERROR", "Failed to add cards", 500);
    }
  },
  true, // Use batch rate limits
);
