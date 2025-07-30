import { SuperMemo2Algorithm, createCardStateFromPrisma } from '../server/services/spacedRepetition';
import { type CardState as PrismaCardState } from '@prisma/client';

describe('SuperMemo2Algorithm', () => {
  describe('New card scheduling', () => {
    test('should schedule new card with correct initial values', () => {
      const newCardState = SuperMemo2Algorithm.scheduleNewCard();
      
      expect(newCardState.state).toBe('NEW');
      expect(newCardState.interval).toBe(0);
      expect(newCardState.repetitions).toBe(0);
      expect(newCardState.easinessFactor).toBe(2.5);
      expect(newCardState.lapses).toBe(0);
      expect(newCardState.dueDate).toBeInstanceOf(Date);
    });

    test('should set due date to now for new cards', () => {
      const before = new Date();
      const newCardState = SuperMemo2Algorithm.scheduleNewCard();
      const after = new Date();
      
      expect(newCardState.dueDate.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(newCardState.dueDate.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('Rating progression', () => {
    test('AGAIN rating should reset card to learning', () => {
      const mockPrismaState: PrismaCardState = {
        id: '1',
        card_id: '1',
        user_id: '1',
        state: 'REVIEW',
        due_date: new Date(),
        interval: 10,
        repetitions: 3,
        easiness_factor: 2.5,
        lapses: 0,
        last_reviewed: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      };

      const cardState = createCardStateFromPrisma(mockPrismaState);
      const result = SuperMemo2Algorithm.calculateNextReview('AGAIN', cardState);

      expect(result.state).toBe('LEARNING');
      expect(result.interval).toBe(0);
      expect(result.lapses).toBe(1);
      expect(result.easinessFactor).toBeLessThan(2.5);
      expect(result.repetitions).toBe(0);
    });

    test('HARD rating should reduce easiness factor', () => {
      const mockPrismaState: PrismaCardState = {
        id: '1',
        card_id: '1',
        user_id: '1',
        state: 'REVIEW',
        due_date: new Date(),
        interval: 10,
        repetitions: 3,
        easiness_factor: 2.5,
        lapses: 0,
        last_reviewed: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      };

      const cardState = createCardStateFromPrisma(mockPrismaState);
      const result = SuperMemo2Algorithm.calculateNextReview('HARD', cardState);

      expect(result.easinessFactor).toBeLessThan(2.5);
      expect(result.easinessFactor).toBeGreaterThanOrEqual(1.3); // Minimum EF
      expect(result.interval).toBeGreaterThan(0);
    });

    test('GOOD rating should maintain normal progression', () => {
      const mockPrismaState: PrismaCardState = {
        id: '1',
        card_id: '1',
        user_id: '1',
        state: 'REVIEW',
        due_date: new Date(),
        interval: 10,
        repetitions: 3,
        easiness_factor: 2.5,
        lapses: 0,
        last_reviewed: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      };

      const cardState = createCardStateFromPrisma(mockPrismaState);
      const result = SuperMemo2Algorithm.calculateNextReview('GOOD', cardState);

      expect(result.easinessFactor).toBe(2.5);
      expect(result.interval).toBeGreaterThan(10);
      expect(result.repetitions).toBe(4);
      expect(result.state).toBe('REVIEW');
    });

    test('EASY rating should increase easiness factor and interval', () => {
      const mockPrismaState: PrismaCardState = {
        id: '1',
        card_id: '1',
        user_id: '1',
        state: 'REVIEW',
        due_date: new Date(),
        interval: 10,
        repetitions: 3,
        easiness_factor: 2.5,
        lapses: 0,
        last_reviewed: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      };

      const cardState = createCardStateFromPrisma(mockPrismaState);
      const result = SuperMemo2Algorithm.calculateNextReview('EASY', cardState);

      expect(result.easinessFactor).toBeGreaterThan(2.5);
      expect(result.interval).toBeGreaterThan(10);
      expect(result.repetitions).toBe(4);
    });
  });

  describe('Learning progression', () => {
    test('should progress from NEW to REVIEW on first GOOD review', () => {
      const mockPrismaState: PrismaCardState = {
        id: '1',
        card_id: '1',
        user_id: '1',
        state: 'NEW',
        due_date: new Date(),
        interval: 0,
        repetitions: 0,
        easiness_factor: 2.5,
        lapses: 0,
        last_reviewed: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const cardState = createCardStateFromPrisma(mockPrismaState);
      const result = SuperMemo2Algorithm.calculateNextReview('GOOD', cardState);

      expect(result.state).toBe('REVIEW');
      expect(result.repetitions).toBe(1);
      expect(result.interval).toBe(1);
    });

    test('should progress from LEARNING to REVIEW after sufficient repetitions', () => {
      const mockPrismaState: PrismaCardState = {
        id: '1',
        card_id: '1',
        user_id: '1',
        state: 'LEARNING',
        due_date: new Date(),
        interval: 0,
        repetitions: 1, // At final learning step
        easiness_factor: 2.5,
        lapses: 0,
        last_reviewed: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      };

      const cardState = createCardStateFromPrisma(mockPrismaState);
      const result = SuperMemo2Algorithm.calculateNextReview('GOOD', cardState);

      expect(result.state).toBe('REVIEW');
      expect(result.repetitions).toBe(1);
      expect(result.interval).toBe(1); // Should graduate to review with 1 day interval
    });
  });

  describe('Easiness factor constraints', () => {
    test('should not allow easiness factor below 1.3', () => {
      const mockPrismaState: PrismaCardState = {
        id: '1',
        card_id: '1',
        user_id: '1',
        state: 'REVIEW',
        due_date: new Date(),
        interval: 10,
        repetitions: 3,
        easiness_factor: 1.3, // Already at minimum
        lapses: 0,
        last_reviewed: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      };

      const cardState = createCardStateFromPrisma(mockPrismaState);
      const result = SuperMemo2Algorithm.calculateNextReview('AGAIN', cardState);

      expect(result.easinessFactor).toBe(1.3);
    });

    test('should not allow easiness factor above reasonable maximum', () => {
      const mockPrismaState: PrismaCardState = {
        id: '1',
        card_id: '1',
        user_id: '1',
        state: 'REVIEW',
        due_date: new Date(),
        interval: 10,
        repetitions: 3,
        easiness_factor: 4.0, // Very high
        lapses: 0,
        last_reviewed: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      };

      const cardState = createCardStateFromPrisma(mockPrismaState);
      const result = SuperMemo2Algorithm.calculateNextReview('EASY', cardState);

      expect(result.easinessFactor).toBeLessThanOrEqual(5.0); // Reasonable maximum
    });
  });

  describe('Due date calculation', () => {
    test('should set due date based on interval', () => {
      const mockPrismaState: PrismaCardState = {
        id: '1',
        card_id: '1',
        user_id: '1',
        state: 'REVIEW',
        due_date: new Date(),
        interval: 10,
        repetitions: 3,
        easiness_factor: 2.5,
        lapses: 0,
        last_reviewed: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      };

      const cardState = createCardStateFromPrisma(mockPrismaState);
      const result = SuperMemo2Algorithm.calculateNextReview('GOOD', cardState);

      const expectedDueDate = new Date();
      expectedDueDate.setDate(expectedDueDate.getDate() + result.interval);

      // Allow for small time differences in test execution
      const timeDiff = Math.abs(result.dueDate.getTime() - expectedDueDate.getTime());
      expect(timeDiff).toBeLessThan(1000); // Less than 1 second difference
    });

    test('should set immediate due date for learning cards with short intervals', () => {
      const mockPrismaState: PrismaCardState = {
        id: '1',
        card_id: '1',
        user_id: '1',
        state: 'LEARNING',
        due_date: new Date(),
        interval: 0,
        repetitions: 0,
        easiness_factor: 2.5,
        lapses: 0,
        last_reviewed: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      };

      const cardState = createCardStateFromPrisma(mockPrismaState);
      const result = SuperMemo2Algorithm.calculateNextReview('AGAIN', cardState);

      const now = new Date();
      const timeDiff = result.dueDate.getTime() - now.getTime();
      
      // Should be due soon (within 10 minutes for AGAIN rating)
      expect(timeDiff).toBeLessThan(10 * 60 * 1000);
    });
  });

  describe('Lapse handling', () => {
    test('should increase lapse count on AGAIN rating', () => {
      const mockPrismaState: PrismaCardState = {
        id: '1',
        card_id: '1',
        user_id: '1',
        state: 'REVIEW',
        due_date: new Date(),
        interval: 10,
        repetitions: 3,
        easiness_factor: 2.5,
        lapses: 2,
        last_reviewed: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      };

      const cardState = createCardStateFromPrisma(mockPrismaState);
      const result = SuperMemo2Algorithm.calculateNextReview('AGAIN', cardState);

      expect(result.lapses).toBe(3);
    });

    test('should not increase lapse count on non-AGAIN ratings', () => {
      const mockPrismaState: PrismaCardState = {
        id: '1',
        card_id: '1',
        user_id: '1',
        state: 'REVIEW',
        due_date: new Date(),
        interval: 10,
        repetitions: 3,
        easiness_factor: 2.5,
        lapses: 2,
        last_reviewed: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      };

      const cardState = createCardStateFromPrisma(mockPrismaState);
      const result = SuperMemo2Algorithm.calculateNextReview('GOOD', cardState);

      expect(result.lapses).toBe(2); // Should remain unchanged
    });
  });

  describe('Edge cases', () => {
    test('should handle suspended cards', () => {
      const mockPrismaState: PrismaCardState = {
        id: '1',
        card_id: '1',
        user_id: '1',
        state: 'SUSPENDED',
        due_date: new Date(),
        interval: 10,
        repetitions: 3,
        easiness_factor: 2.5,
        lapses: 0,
        last_reviewed: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      };

      const cardState = createCardStateFromPrisma(mockPrismaState);
      
      // Suspended cards should be treated as new cards when reviewed
      const result = SuperMemo2Algorithm.calculateNextReview('GOOD', cardState);
      
      expect(result.state).toBe('REVIEW');
      expect(result.interval).toBe(1);
      expect(result.repetitions).toBe(1);
    });

    test('should handle very high repetition counts', () => {
      const mockPrismaState: PrismaCardState = {
        id: '1',
        card_id: '1',
        user_id: '1',
        state: 'REVIEW',
        due_date: new Date(),
        interval: 100,
        repetitions: 50, // Very high repetition count
        easiness_factor: 2.5,
        lapses: 0,
        last_reviewed: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      };

      const cardState = createCardStateFromPrisma(mockPrismaState);
      const result = SuperMemo2Algorithm.calculateNextReview('GOOD', cardState);

      expect(result.repetitions).toBe(51);
      expect(result.interval).toBeGreaterThan(100);
      expect(result.interval).toBeLessThan(1000); // Should have reasonable upper bound
    });
  });

  describe('Interval progression', () => {
    test('should follow SuperMemo 2 interval progression', () => {
      // Start with a new card
      let currentState = SuperMemo2Algorithm.scheduleNewCard();
      
      // First review (NEW -> REVIEW)
      currentState = SuperMemo2Algorithm.calculateNextReview('GOOD', currentState);
      expect(currentState.state).toBe('REVIEW');
      expect(currentState.interval).toBe(1);
      
      // Second review (should be 6 days)
      currentState = SuperMemo2Algorithm.calculateNextReview('GOOD', currentState);
      expect(currentState.state).toBe('REVIEW');
      expect(currentState.interval).toBe(6);
      
      // Third review (should follow EF * previous interval)
      const previousInterval = currentState.interval;
      const easinessFactor = currentState.easinessFactor;
      currentState = SuperMemo2Algorithm.calculateNextReview('GOOD', currentState);
      
      const expectedInterval = Math.round(previousInterval * easinessFactor);
      expect(currentState.interval).toBeCloseTo(expectedInterval, 0);
    });
  });
});

describe('createCardStateFromPrisma', () => {
  test('should convert Prisma CardState to internal format', () => {
    const mockPrismaState: PrismaCardState = {
      id: '1',
      card_id: '1',
      user_id: '1',
      state: 'REVIEW',
      due_date: new Date('2023-12-01'),
      interval: 10,
      repetitions: 3,
      easiness_factor: 2.5,
      lapses: 1,
      last_reviewed: new Date('2023-11-21'),
      created_at: new Date('2023-10-01'),
      updated_at: new Date('2023-11-21'),
    };

    const cardState = createCardStateFromPrisma(mockPrismaState);

    expect(cardState.state).toBe('REVIEW');
    expect(cardState.dueDate).toEqual(new Date('2023-12-01'));
    expect(cardState.interval).toBe(10);
    expect(cardState.repetitions).toBe(3);
    expect(cardState.easinessFactor).toBe(2.5);
    expect(cardState.lapses).toBe(1);
    expect(cardState.lastReviewed).toEqual(new Date('2023-11-21'));
  });

  test('should handle null last_reviewed date', () => {
    const mockPrismaState: PrismaCardState = {
      id: '1',
      card_id: '1',
      user_id: '1',
      state: 'NEW',
      due_date: new Date(),
      interval: 0,
      repetitions: 0,
      easiness_factor: 2.5,
      lapses: 0,
      last_reviewed: null,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const cardState = createCardStateFromPrisma(mockPrismaState);

    expect(cardState.lastReviewed).toBeNull();
  });
});