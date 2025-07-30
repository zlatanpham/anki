import { type PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { SuperMemo2Algorithm } from "./spacedRepetition";

export interface DeckExportData {
  version: string;
  exportedAt: string;
  deck: {
    name: string;
    description?: string;
    settings?: any;
  };
  cards: Array<{
    cardType: "BASIC" | "CLOZE";
    front: string;
    back: string;
    clozeText?: string;
    tags: string[];
    noteId?: string;
  }>;
}

export interface ImportResult {
  success: boolean;
  deckId?: string;
  cardsImported: number;
  errors: string[];
  warnings: string[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  cardCount: number;
}

export class DeckImportService {
  constructor(private db: PrismaClient) {}

  /**
   * Export a deck to JSON format
   */
  async exportDeck(deckId: string, userId: string): Promise<DeckExportData> {
    try {
      // Get deck with cards
      const deck = await this.db.deck.findFirst({
        where: {
          id: deckId,
          user_id: userId,
        },
        include: {
          cards: {
            orderBy: {
              created_at: 'asc',
            },
          },
        },
      });

      if (!deck) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Deck not found or you don't have permission to export it",
        });
      }

      // Transform to export format
      const exportData: DeckExportData = {
        version: "1.0.0",
        exportedAt: new Date().toISOString(),
        deck: {
          name: deck.name,
          description: deck.description || undefined,
          settings: deck.settings as any,
        },
        cards: deck.cards.map(card => ({
          cardType: card.card_type,
          front: card.front,
          back: card.back,
          clozeText: card.cloze_text || undefined,
          tags: card.tags,
          noteId: card.note_id || undefined,
        })),
      };

      return exportData;
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
  }

  /**
   * Validate JSON import data
   */
  validateImportData(data: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check basic structure
    if (!data || typeof data !== 'object') {
      errors.push("Invalid JSON format");
      return { isValid: false, errors, warnings, cardCount: 0 };
    }

    // Check version
    if (!data.version) {
      warnings.push("No version specified, assuming compatible format");
    } else if (typeof data.version !== 'string') {
      errors.push("Version must be a string");
    }

    // Check deck data
    if (!data.deck || typeof data.deck !== 'object') {
      errors.push("Missing or invalid deck information");
    } else {
      if (!data.deck.name || typeof data.deck.name !== 'string') {
        errors.push("Deck name is required and must be a string");
      } else if (data.deck.name.length > 255) {
        errors.push("Deck name is too long (max 255 characters)");
      }

      if (data.deck.description && typeof data.deck.description !== 'string') {
        errors.push("Deck description must be a string");
      }
    }

    // Check cards data
    if (!Array.isArray(data.cards)) {
      errors.push("Cards must be an array");
      return { isValid: false, errors, warnings, cardCount: 0 };
    }

    if (data.cards.length === 0) {
      warnings.push("No cards found in import data");
    }

    if (data.cards.length > 10000) {
      errors.push("Too many cards (max 10,000 per import)");
    }

    // Validate each card
    data.cards.forEach((card: any, index: number) => {
      const cardNum = index + 1;

      if (!card || typeof card !== 'object') {
        errors.push(`Card ${cardNum}: Invalid card format`);
        return;
      }

      // Check card type
      if (!card.cardType || !['BASIC', 'CLOZE'].includes(card.cardType as string)) {
        errors.push(`Card ${cardNum}: Invalid card type (must be BASIC or CLOZE)`);
      }

      // Check front content
      if (!card.front || typeof card.front !== 'string') {
        errors.push(`Card ${cardNum}: Front content is required and must be a string`);
      } else if (card.front.length > 10000) {
        warnings.push(`Card ${cardNum}: Front content is very long`);
      }

      // Check back content
      if (!card.back || typeof card.back !== 'string') {
        errors.push(`Card ${cardNum}: Back content is required and must be a string`);
      } else if (card.back.length > 10000) {
        warnings.push(`Card ${cardNum}: Back content is very long`);
      }

      // Check cloze text for cloze cards
      if (card.cardType === 'CLOZE') {
        if (!card.clozeText || typeof card.clozeText !== 'string') {
          errors.push(`Card ${cardNum}: Cloze text is required for cloze deletion cards`);
        } else {
          // Basic cloze validation
          const clozeRegex = /\{\{c\d+::[^}]+\}\}/;
          if (!clozeRegex.test(String(card.clozeText))) {
            errors.push(`Card ${cardNum}: Invalid cloze deletion format`);
          }
        }
      }

      // Check tags
      if (card.tags && !Array.isArray(card.tags)) {
        errors.push(`Card ${cardNum}: Tags must be an array`);
      } else if (card.tags) {
        card.tags.forEach((tag: any, tagIndex: number) => {
          if (typeof tag !== 'string') {
            errors.push(`Card ${cardNum}, Tag ${tagIndex + 1}: Tags must be strings`);
          }
        });
      }

      // Check noteId
      if (card.noteId && typeof card.noteId !== 'string') {
        errors.push(`Card ${cardNum}: Note ID must be a string`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      cardCount: data.cards.length,
    };
  }

  /**
   * Import a deck from JSON data
   */
  async importDeck(
    data: DeckExportData,
    userId: string,
    organizationId?: string
  ): Promise<ImportResult> {
    const result: ImportResult = {
      success: false,
      cardsImported: 0,
      errors: [],
      warnings: [],
    };

    try {
      // Validate the data first
      const validation = this.validateImportData(data);
      result.errors = validation.errors;
      result.warnings = validation.warnings;

      if (!validation.isValid) {
        return result;
      }

      // Import within a transaction
      const importResult = await this.db.$transaction(async (tx) => {
        // Create the deck
        const deck = await tx.deck.create({
          data: {
            name: String(data.deck.name),
            description: data.deck.description ? String(data.deck.description) : null,
            user_id: userId,
            organization_id: organizationId,
            settings: data.deck.settings,
          },
        });

        // Import cards
        let cardsCreated = 0;
        for (const cardData of data.cards) {
          try {
            // Create the card
            const card = await tx.card.create({
              data: {
                deck_id: deck.id,
                card_type: cardData.cardType,
                front: String(cardData.front),
                back: String(cardData.back),
                cloze_text: cardData.clozeText ? String(cardData.clozeText) : null,
                tags: cardData.tags || [],
                note_id: cardData.noteId,
              },
            });

            // Create initial card state for the user
            const initialState = SuperMemo2Algorithm.createInitialCardState(
              card.id,
              userId
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

            cardsCreated++;
          } catch (error) {
            console.error(`Failed to import card: ${error}`);
            result.warnings.push(`Failed to import one card: ${error}`);
          }
        }

        return { deck, cardsCreated };
      });

      result.success = true;
      result.deckId = importResult.deck.id;
      result.cardsImported = importResult.cardsCreated;

      if (result.cardsImported < data.cards.length) {
        result.warnings.push(
          `Only ${result.cardsImported} of ${data.cards.length} cards were imported successfully`
        );
      }

      return result;
    } catch (error) {
      result.errors.push(`Import failed: ${error}`);
      return result;
    }
  }

  /**
   * Parse JSON file buffer
   */
  parseJsonFile(fileBuffer: Buffer): DeckExportData {
    try {
      const jsonString = fileBuffer.toString('utf-8');
      const data = JSON.parse(jsonString);
      return data as DeckExportData;
    } catch (error) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Invalid JSON file format",
        cause: error,
      });
    }
  }
}