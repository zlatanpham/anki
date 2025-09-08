import { NextResponse } from 'next/server';
import { withAuthAndRateLimit, createErrorResponse, type AuthenticatedRequest } from '../../middleware';
import { db } from '@/server/db';
import { z } from 'zod';

// Validation schema
const getReviewQueueSchema = z.object({
  deckId: z.string().uuid().optional(),
  limit: z.coerce.number().min(1).max(50).optional().default(20),
  includeNew: z.coerce.boolean().optional().default(true),
  includeLearning: z.coerce.boolean().optional().default(true),
  includeReview: z.coerce.boolean().optional().default(true),
});

// GET /api/v1/study/queue - Get cards due for review
export const GET = withAuthAndRateLimit(async (request: AuthenticatedRequest) => {
  try {
    // Parse query parameters
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const query = getReviewQueueSchema.parse(searchParams);
    
    // Build state filter
    const stateFilter = [];
    if (query.includeNew) stateFilter.push('NEW');
    if (query.includeLearning) stateFilter.push('LEARNING');
    if (query.includeReview) stateFilter.push('REVIEW');
    
    if (stateFilter.length === 0) {
      return NextResponse.json({
        cards: [],
        totalDue: 0,
      });
    }
    
    // Build where clause
    const where: Record<string, unknown> = {
      user_id: request.user!.id,
      state: { in: stateFilter },
      due_date: { lte: new Date() },
    };
    
    // If deckId is specified, verify access and filter
    if (query.deckId) {
      const deck = await db.deck.findFirst({
        where: {
          id: query.deckId,
          user_id: request.user!.id,
        },
      });
      
      if (!deck) {
        return createErrorResponse(
          'RESOURCE_NOT_FOUND',
          'Deck not found or you do not have access to it',
          404
        );
      }
      
      where.card = { deck_id: query.deckId };
    }
    
    // Get total count of due cards
    const totalDue = await db.cardState.count({ where });
    
    // Get cards with priority ordering
    const cardStates = await db.cardState.findMany({
      where,
      include: {
        card: {
          include: {
            deck: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: [
        // Priority: NEW > LEARNING > REVIEW
        {
          state: 'asc', // This works because enum order is NEW, LEARNING, REVIEW
        },
        {
          due_date: 'asc',
        },
      ],
      take: query.limit,
    });
    
    // Format response
    const cards = cardStates.map(cs => ({
      id: cs.card.id,
      deckId: cs.card.deck.id,
      deckName: cs.card.deck.name,
      front: cs.card.front,
      back: cs.card.back,
      cardType: cs.card.card_type,
      state: cs.state,
      dueDate: cs.due_date.toISOString(),
      interval: cs.interval,
      easinessFactor: cs.easiness_factor,
    }));
    
    return NextResponse.json({
      cards,
      totalDue,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse(
        'VALIDATION_ERROR',
        'Invalid query parameters',
        400,
        { errors: error.errors }
      );
    }
    
    console.error('Get review queue error:', error);
    return createErrorResponse(
      'INTERNAL_ERROR',
      'Failed to get review queue',
      500
    );
  }
});