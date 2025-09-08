import { NextResponse } from "next/server";
import { withAuthAndRateLimit, createErrorResponse } from "../middleware";
import type { AuthenticatedRequest } from "../middleware";
import { db } from "@/server/db";
import { z } from "zod";

// Validation schemas
const listDecksQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  offset: z.coerce.number().min(0).optional().default(0),
  organizationId: z.string().uuid().optional(),
});

const createDeckSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  isPublic: z.boolean().optional().default(false),
  organizationId: z.string().uuid().optional(),
});

// GET /api/v1/decks - List user's decks
export const GET = withAuthAndRateLimit(
  async (request: AuthenticatedRequest) => {
    try {
      // Parse query parameters
      const searchParams = Object.fromEntries(request.nextUrl.searchParams);
      const query = listDecksQuerySchema.parse(searchParams);

      // Build where clause
      const where: {
        user_id: string;
        organization_id?: string;
      } = {
        user_id: request.user!.id,
      };

      if (query.organizationId) {
        // Verify user has access to this organization
        const membership = await db.organizationMember.findFirst({
          where: {
            organization_id: query.organizationId,
            user_id: request.user!.id,
          },
        });

        if (!membership) {
          return createErrorResponse(
            "PERMISSION_DENIED",
            "You do not have access to this organization",
            403,
          );
        }

        where.organization_id = query.organizationId;
      }

      // Get total count
      const total = await db.deck.count({ where });

      // Get decks with card count
      const decks = await db.deck.findMany({
        where,
        select: {
          id: true,
          name: true,
          description: true,
          is_public: true,
          created_at: true,
          updated_at: true,
          _count: {
            select: {
              cards: true,
            },
          },
        },
        orderBy: { created_at: "desc" },
        skip: query.offset,
        take: query.limit,
      });

      // Format response
      const formattedDecks = decks.map((deck) => ({
        id: deck.id,
        name: deck.name,
        description: deck.description,
        cardCount: deck._count.cards,
        isPublic: deck.is_public,
        createdAt: deck.created_at.toISOString(),
        updatedAt: deck.updated_at.toISOString(),
      }));

      return NextResponse.json({
        decks: formattedDecks,
        total,
        hasMore: query.offset + query.limit < total,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return createErrorResponse(
          "VALIDATION_ERROR",
          "Invalid query parameters",
          400,
          { errors: error.errors },
        );
      }

      console.error("List decks error:", error);
      return createErrorResponse("INTERNAL_ERROR", "Failed to list decks", 500);
    }
  },
);

// POST /api/v1/decks - Create a new deck
export const POST = withAuthAndRateLimit(
  async (request: AuthenticatedRequest) => {
    try {
      // Parse request body
      const body = await request.json();
      const data = createDeckSchema.parse(body);

      // Verify organization access if specified
      if (data.organizationId) {
        const membership = await db.organizationMember.findFirst({
          where: {
            organization_id: data.organizationId,
            user_id: request.user!.id,
          },
        });

        if (!membership) {
          return createErrorResponse(
            "PERMISSION_DENIED",
            "You do not have access to this organization",
            403,
          );
        }
      }

      // Create deck
      const deck = await db.deck.create({
        data: {
          name: data.name,
          description: data.description,
          is_public: data.isPublic,
          user_id: request.user!.id,
          organization_id: data.organizationId,
        },
        select: {
          id: true,
          name: true,
          description: true,
          is_public: true,
          created_at: true,
          updated_at: true,
          _count: {
            select: {
              cards: true,
            },
          },
        },
      });

      // Format response
      return NextResponse.json({
        id: deck.id,
        name: deck.name,
        description: deck.description,
        cardCount: deck._count.cards,
        isPublic: deck.is_public,
        createdAt: deck.created_at.toISOString(),
        updatedAt: deck.updated_at.toISOString(),
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

      console.error("Create deck error:", error);
      return createErrorResponse(
        "INTERNAL_ERROR",
        "Failed to create deck",
        500,
      );
    }
  },
);
