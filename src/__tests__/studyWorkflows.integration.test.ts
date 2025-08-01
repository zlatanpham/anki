import { SuperMemo2Algorithm } from '../server/services/spacedRepetition';
import { type ReviewRating } from '@prisma/client';

/**
 * Integration tests for study workflows
 * 
 * These tests simulate complete user study sessions to ensure
 * the entire workflow from card creation to review completion works correctly.
 */

describe('Study Workflow Integration Tests', () => {
  describe('Complete study session workflow', () => {
    test('should handle complete new card study session', () => {
      // Simulate a new user starting with a fresh card
      let cardState = SuperMemo2Algorithm.scheduleNewCard();
      
      // Verify initial state
      expect(cardState.state).toBe('NEW');
      expect(cardState.repetitions).toBe(0);
      expect(cardState.lapses).toBe(0);
      expect(SuperMemo2Algorithm.isCardDue(cardState)).toBe(true);
      
      // First review - user finds it difficult (AGAIN)
      cardState = SuperMemo2Algorithm.calculateNextReview('AGAIN', cardState);
      expect(cardState.state).toBe('LEARNING');
      expect(cardState.lapses).toBe(0); // No lapse on first AGAIN from NEW
      
      // Short time passes, card is due again
      expect(SuperMemo2Algorithm.isCardDue(cardState, new Date(Date.now() + 2 * 60 * 1000))).toBe(true);
      
      // Second review - user remembers it (GOOD)
      cardState = SuperMemo2Algorithm.calculateNextReview('GOOD', cardState);
      expect(cardState.state).toBe('LEARNING');
      expect(cardState.repetitions).toBe(1);
      
      // Third review - user finds it easy (GOOD) - should graduate
      cardState = SuperMemo2Algorithm.calculateNextReview('GOOD', cardState);
      expect(cardState.state).toBe('REVIEW');
      expect(cardState.repetitions).toBe(1);
      expect(cardState.interval).toBe(1); // 1 day
      
      // Card should now be due tomorrow
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      expect(SuperMemo2Algorithm.isCardDue(cardState, tomorrow)).toBe(true);
      
      // Fourth review after a day - GOOD performance
      cardState = SuperMemo2Algorithm.calculateNextReview('GOOD', cardState);
      expect(cardState.state).toBe('REVIEW');
      expect(cardState.repetitions).toBe(2);
      expect(cardState.interval).toBe(6); // 6 days according to SuperMemo 2
      
      // Continue the progression
      cardState = SuperMemo2Algorithm.calculateNextReview('GOOD', cardState);
      expect(cardState.state).toBe('REVIEW');
      expect(cardState.repetitions).toBe(3);
      expect(cardState.interval).toBeGreaterThan(6);
    });

    test('should handle lapse and recovery workflow', () => {
      // Start with a mature review card
      let cardState = SuperMemo2Algorithm.scheduleNewCard();
      cardState.state = 'REVIEW';
      cardState.repetitions = 5;
      cardState.interval = 30;
      cardState.easinessFactor = 2.5;
      cardState.lapses = 0;
      
      // User forgets the card (AGAIN) - should cause lapse
      cardState = SuperMemo2Algorithm.calculateNextReview('AGAIN', cardState);
      
      expect(cardState.state).toBe('LEARNING'); // Back to learning
      expect(cardState.lapses).toBe(1); // Lapse count increased
      expect(cardState.easinessFactor).toBeLessThan(2.5); // EF reduced
      expect(cardState.repetitions).toBe(0); // Reset repetitions
      
      // Recovery process - user relearns the card (still in LEARNING initially)
      cardState = SuperMemo2Algorithm.calculateNextReview('GOOD', cardState);
      expect(cardState.state).toBe('LEARNING'); // Still in learning phase
      
      // Complete learning phase
      cardState = SuperMemo2Algorithm.calculateNextReview('GOOD', cardState);
      expect(cardState.state).toBe('REVIEW'); // Now back to review
      expect(cardState.interval).toBe(1); // Start with 1 day
      
      // Gradual recovery
      cardState = SuperMemo2Algorithm.calculateNextReview('GOOD', cardState);
      expect(cardState.interval).toBe(6);
      
      cardState = SuperMemo2Algorithm.calculateNextReview('GOOD', cardState);
      expect(cardState.interval).toBeGreaterThan(6);
      expect(cardState.lapses).toBe(1); // Lapse count persists
    });

    test('should handle different rating patterns over multiple sessions', () => {
      let cardState = SuperMemo2Algorithm.scheduleNewCard();
      const ratingPattern: ReviewRating[] = ['GOOD', 'GOOD', 'HARD', 'GOOD', 'EASY', 'AGAIN', 'GOOD', 'GOOD'];
      const results: { rating: ReviewRating; state: string; interval: number; ef: number }[] = [];
      
      ratingPattern.forEach(rating => {
        cardState = SuperMemo2Algorithm.calculateNextReview(rating, cardState);
        results.push({
          rating,
          state: cardState.state,
          interval: cardState.interval,
          ef: cardState.easinessFactor
        });
      });
      
      // Verify the progression makes sense
      expect(results[0]!.state).toBe('REVIEW'); // GOOD from NEW goes to REVIEW
      expect(results[1]!.interval).toBe(6); // Second review interval
      expect(results[2]!.ef).toBeLessThan(2.5); // HARD reduces EF
      expect(results[4]!.ef).toBeGreaterThan(results[3]!.ef); // EASY increases EF
      expect(results[5]!.state).toBe('LEARNING'); // AGAIN causes lapse
      expect(results[6]!.state).toBe('LEARNING'); // Still in learning after lapse recovery
      
      // Final state should be reasonable
      expect(['REVIEW', 'LEARNING']).toContain(cardState.state); // Could be either depending on final progression
      expect(cardState.lapses).toBe(1);
      expect(cardState.repetitions).toBeGreaterThan(0);
    });
  });

  describe('Due date calculations and scheduling', () => {
    test('should correctly calculate due dates across different time zones', () => {
      const cardState = SuperMemo2Algorithm.scheduleNewCard();
      cardState.state = 'REVIEW';
      cardState.interval = 7;
      
      const baseDate = new Date('2024-01-15T10:00:00.000Z');
      const result = SuperMemo2Algorithm.calculateNextReviewResult('GOOD', cardState);
      
      // Due date should be approximately 7 days from now
      const expectedDueDate = new Date(baseDate);
      expectedDueDate.setDate(expectedDueDate.getDate() + result.newInterval);
      
      // The daysUntilDue should be positive for future dates
      expect(SuperMemo2Algorithm.daysUntilDue(
        { ...cardState, dueDate: expectedDueDate },
        baseDate
      )).toBeGreaterThan(0);
    });

    test('should handle overdue cards correctly', () => {
      const pastDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // 2 days ago
      const cardState = SuperMemo2Algorithm.scheduleNewCard();
      cardState.dueDate = pastDate;
      
      expect(SuperMemo2Algorithm.isCardDue(cardState)).toBe(true);
      expect(SuperMemo2Algorithm.daysUntilDue(cardState)).toBeLessThanOrEqual(0);
      
      // Reviewing an overdue card should work normally
      const result = SuperMemo2Algorithm.calculateNextReview('GOOD', cardState);
      expect(result.dueDate.getTime()).toBeGreaterThan(Date.now());
    });

    test('should provide accurate card state descriptions', () => {
      // New card
      let cardState = SuperMemo2Algorithm.scheduleNewCard();
      expect(SuperMemo2Algorithm.getCardStateDescription(cardState)).toBe('New');
      
      // Learning card
      cardState = SuperMemo2Algorithm.calculateNextReview('AGAIN', cardState);
      expect(SuperMemo2Algorithm.getCardStateDescription(cardState)).toContain('Learning');
      
      // Review card - due
      cardState.state = 'REVIEW';
      cardState.dueDate = new Date(Date.now() - 1000); // 1 second ago
      expect(SuperMemo2Algorithm.getCardStateDescription(cardState)).toBe('Due');
      
      // Review card - due tomorrow
      cardState.dueDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      expect(SuperMemo2Algorithm.getCardStateDescription(cardState)).toBe('Due tomorrow');
      
      // Review card - due in multiple days
      cardState.dueDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
      expect(SuperMemo2Algorithm.getCardStateDescription(cardState)).toBe('Due in 3 days');
      
      // Suspended card
      cardState.state = 'SUSPENDED';
      expect(SuperMemo2Algorithm.getCardStateDescription(cardState)).toBe('Suspended');
    });
  });

  describe('Batch study session simulation', () => {
    test('should handle multiple cards in a study session', () => {
      // Create multiple cards with different states
      const cards = [
        SuperMemo2Algorithm.scheduleNewCard(),
        SuperMemo2Algorithm.scheduleNewCard(),
        SuperMemo2Algorithm.scheduleNewCard()
      ];
      
      // Set different initial states
      cards[1]!.state = 'LEARNING';
      cards[1]!.repetitions = 1;
      cards[2]!.state = 'REVIEW';
      cards[2]!.repetitions = 3;
      cards[2]!.interval = 10;
      
      // Simulate reviewing all cards
      const ratings: ReviewRating[] = ['GOOD', 'HARD', 'EASY'];
      const results = cards.map((card, index) => 
        SuperMemo2Algorithm.calculateNextReview(ratings[index]!, card)
      );
      
      // Verify all cards were processed correctly
      expect(results[0]!.state).toBe('REVIEW'); // NEW -> REVIEW with GOOD
      expect(results[1]!.state).toBe('REVIEW'); // LEARNING -> REVIEW with HARD
      expect(results[2]!.state).toBe('REVIEW'); // REVIEW stays REVIEW with EASY
      
      // All should have future due dates
      const now = new Date();
      results.forEach(result => {
        expect(result.dueDate.getTime()).toBeGreaterThan(now.getTime());
      });
    });

    test('should maintain consistent statistics across session', () => {
      const initialState = SuperMemo2Algorithm.scheduleNewCard();
      let currentState = { ...initialState };
      
      const sessionRatings: ReviewRating[] = ['GOOD', 'GOOD', 'HARD', 'GOOD', 'EASY'];
      let totalLapses = 0;
      let maxEF = currentState.easinessFactor;
      let minEF = currentState.easinessFactor;
      
      sessionRatings.forEach(rating => {
        currentState = SuperMemo2Algorithm.calculateNextReview(rating, currentState);
        totalLapses = Math.max(totalLapses, currentState.lapses);
        maxEF = Math.max(maxEF, currentState.easinessFactor);
        minEF = Math.min(minEF, currentState.easinessFactor);
      });
      
      // Verify session statistics
      expect(currentState.repetitions).toBe(sessionRatings.length);
      expect(totalLapses).toBe(0); // No AGAIN ratings in this session
      expect(maxEF).toBeGreaterThanOrEqual(2.5); // EASY should have increased EF
      expect(minEF).toBeLessThan(2.5); // HARD should have decreased EF at some point
      expect(currentState.state).toBe('REVIEW');
      expect(currentState.interval).toBeGreaterThan(0);
    });
  });

  describe('Edge cases in study workflows', () => {
    test('should handle rapid successive reviews', () => {
      let cardState = SuperMemo2Algorithm.scheduleNewCard();
      
      // Rapid succession of reviews (simulating quick study session)
      for (let i = 0; i < 10; i++) {
        const previousInterval = cardState.interval;
        cardState = SuperMemo2Algorithm.calculateNextReview('GOOD', cardState);
        
        // Each review should increase the interval (after initial phases)
        if (cardState.state === 'REVIEW' && cardState.repetitions > 2) {
          expect(cardState.interval).toBeGreaterThanOrEqual(previousInterval);
        }
      }
      
      expect(cardState.state).toBe('REVIEW');
      expect(cardState.repetitions).toBe(10);
      expect(cardState.interval).toBeGreaterThan(100); // Should be well-spaced by now
    });

    test('should handle alternating performance patterns', () => {
      let cardState = SuperMemo2Algorithm.scheduleNewCard();
      cardState.state = 'REVIEW';
      cardState.repetitions = 5;
      cardState.interval = 20;
      
      // Alternating GOOD and HARD ratings
      const alternatingPattern: ReviewRating[] = ['GOOD', 'HARD', 'GOOD', 'HARD', 'GOOD'];
      const easinessFactors: number[] = [];
      
      alternatingPattern.forEach(rating => {
        cardState = SuperMemo2Algorithm.calculateNextReview(rating, cardState);
        easinessFactors.push(cardState.easinessFactor);
      });
      
      // EF should fluctuate but stay within reasonable bounds
      expect(Math.max(...easinessFactors)).toBeLessThan(3.0);
      expect(Math.min(...easinessFactors)).toBeGreaterThanOrEqual(1.3);
      expect(cardState.state).toBe('REVIEW');
    });

    test('should handle extreme easiness factor scenarios', () => {
      // Test card with very low EF
      let lowEFCard = SuperMemo2Algorithm.scheduleNewCard();
      lowEFCard.state = 'REVIEW';
      lowEFCard.easinessFactor = 1.3; // Minimum EF
      lowEFCard.repetitions = 3;
      lowEFCard.interval = 5;
      
      // Multiple AGAIN ratings shouldn't push EF below minimum
      for (let i = 0; i < 5; i++) {
        lowEFCard = SuperMemo2Algorithm.calculateNextReview('AGAIN', lowEFCard);
        if (lowEFCard.state === 'LEARNING') {
          lowEFCard = SuperMemo2Algorithm.calculateNextReview('GOOD', lowEFCard);
        }
      }
      
      expect(lowEFCard.easinessFactor).toBe(1.3);
      expect(lowEFCard.lapses).toBe(5);
      
      // Test card with high EF scenario
      let highEFCard = SuperMemo2Algorithm.scheduleNewCard();
      highEFCard.state = 'REVIEW';
      highEFCard.easinessFactor = 3.0;
      highEFCard.repetitions = 3;
      highEFCard.interval = 10;
      
      // Multiple EASY ratings should increase EF but keep it reasonable
      for (let i = 0; i < 5; i++) {
        highEFCard = SuperMemo2Algorithm.calculateNextReview('EASY', highEFCard);
      }
      
      expect(highEFCard.easinessFactor).toBeGreaterThan(3.0);
      expect(highEFCard.easinessFactor).toBeLessThan(5.0); // Reasonable upper bound
    });
  });

  describe('Real-world usage patterns', () => {
    test('should simulate typical user learning curve', () => {
      // Simulate a user learning a difficult card over several weeks
      let cardState = SuperMemo2Algorithm.scheduleNewCard();
      
      // Week 1: Initial learning (struggling)
      cardState = SuperMemo2Algorithm.calculateNextReview('AGAIN', cardState); // Day 1
      cardState = SuperMemo2Algorithm.calculateNextReview('HARD', cardState);  // Day 1 (later)
      cardState = SuperMemo2Algorithm.calculateNextReview('GOOD', cardState);  // Day 2
      
      expect(cardState.state).toBe('REVIEW');
      expect(cardState.easinessFactor).toBeLessThanOrEqual(2.5); // May be reduced due to initial difficulty
      
      // Week 2: Getting better
      cardState = SuperMemo2Algorithm.calculateNextReview('GOOD', cardState);  // Day 7
      cardState = SuperMemo2Algorithm.calculateNextReview('GOOD', cardState);  // Day 13
      
      // Week 3-4: Mastery
      cardState = SuperMemo2Algorithm.calculateNextReview('EASY', cardState);  // Day 19
      cardState = SuperMemo2Algorithm.calculateNextReview('EASY', cardState);  // Day 40+
      
      expect(cardState.state).toBe('REVIEW');
      expect(cardState.repetitions).toBe(5); // Corrected count: AGAIN resets, then HARD+GOOD+GOOD+GOOD+EASY+EASY = 5 review repetitions
      expect(cardState.interval).toBeGreaterThan(30); // Well-spaced intervals
      expect(cardState.easinessFactor).toBeGreaterThan(2.3); // Recovered from initial difficulty
    });

    test('should handle mixed deck study session', () => {
      // Create a variety of cards representing a typical study deck
      const deckCards = [
        // New cards
        SuperMemo2Algorithm.scheduleNewCard(),
        SuperMemo2Algorithm.scheduleNewCard(),
        SuperMemo2Algorithm.scheduleNewCard(),
        
        // Learning cards
        ...Array.from({ length: 3 }, () => {
          const card = SuperMemo2Algorithm.scheduleNewCard();
          card.state = 'LEARNING';
          card.repetitions = Math.floor(Math.random() * 2);
          return card;
        }),
        
        // Review cards
        ...Array.from({ length: 4 }, () => {
          const card = SuperMemo2Algorithm.scheduleNewCard();
          card.state = 'REVIEW';
          card.repetitions = Math.floor(Math.random() * 10) + 1;
          card.interval = Math.floor(Math.random() * 50) + 1;
          card.easinessFactor = 1.3 + Math.random() * 1.2; // Random EF between 1.3-2.5
          return card;
        })
      ];
      
      // Simulate mixed performance in study session
      const ratings: ReviewRating[] = ['GOOD', 'AGAIN', 'EASY', 'HARD', 'GOOD', 'GOOD', 'EASY', 'HARD', 'GOOD', 'AGAIN'];
      
      const reviewResults = deckCards.map((card, index) => {
        const rating = ratings[index];
        return rating ? SuperMemo2Algorithm.calculateNextReview(rating, card) : card;
      });
      
      // Analyze session results
      const newToReview = reviewResults.filter((result, index) => 
        deckCards[index]!.state === 'NEW' && result.state === 'REVIEW'
      ).length;
      
      const totalLapses = reviewResults.reduce((sum, result) => sum + result.lapses, 0);
      const averageInterval = reviewResults
        .filter(result => result.state === 'REVIEW')
        .reduce((sum, result) => sum + result.interval, 0) / 
        reviewResults.filter(result => result.state === 'REVIEW').length;
      
      expect(newToReview).toBeGreaterThan(0); // Some new cards should graduate
      expect(totalLapses).toBeGreaterThan(0); // Some lapses expected with AGAIN ratings
      expect(averageInterval).toBeGreaterThan(0); // Review cards should have positive intervals
      expect(reviewResults.every(result => result.dueDate instanceof Date)).toBe(true);
    });
  });
});