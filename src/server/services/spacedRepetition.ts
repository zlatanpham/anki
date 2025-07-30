import { type ReviewRating, type CardStateEnum } from "@prisma/client";

export interface CardState {
  id: string;
  cardId: string;
  userId: string;
  state: CardStateEnum;
  dueDate: Date;
  interval: number;
  repetitions: number;
  easinessFactor: number;
  lapses: number;
  lastReviewed: Date | null;
}

export interface ReviewResult {
  newState: CardStateEnum;
  newInterval: number;
  newRepetitions: number;
  newEasinessFactor: number;
  newLapses: number;
  newDueDate: Date;
}

/**
 * SuperMemo 2 Spaced Repetition Algorithm Implementation
 * Based on the original algorithm by Piotr Wozniak
 * 
 * This implementation handles the core spaced repetition calculations
 * for optimizing long-term memory retention.
 */
export class SuperMemo2Algorithm {
  private static readonly MIN_EASINESS_FACTOR = 1.3;
  private static readonly INITIAL_EASINESS_FACTOR = 2.5;
  private static readonly LEARNING_STEPS = [1, 10]; // minutes for learning cards
  private static readonly RELEARNING_STEPS = [10]; // minutes for relearning after lapses

  /**
   * Calculate the next review state based on user's rating
   */
  static calculateNextReview(
    rating: ReviewRating,
    currentState: CardState,
  ): ReviewResult {
    const now = new Date();
    
    switch (currentState.state) {
      case "NEW":
        return this.handleNewCard(rating, currentState, now);
      case "LEARNING":
        return this.handleLearningCard(rating, currentState, now);
      case "REVIEW":
        return this.handleReviewCard(rating, currentState, now);
      case "SUSPENDED":
        return this.handleSuspendedCard(rating, currentState, now);
      default:
        throw new Error(`Unknown card state: ${currentState.state}`);
    }
  }

  /**
   * Handle new cards that haven't been studied yet
   */
  private static handleNewCard(
    rating: ReviewRating,
    currentState: CardState,
    now: Date,
  ): ReviewResult {
    if (rating === "AGAIN") {
      // Start learning process
      return {
        newState: "LEARNING",
        newInterval: 0,
        newRepetitions: 0,
        newEasinessFactor: currentState.easinessFactor,
        newLapses: currentState.lapses,
        newDueDate: this.addMinutes(now, this.LEARNING_STEPS[0]!),
      };
    } else {
      // Skip learning, go directly to review
      const interval = rating === "EASY" ? 4 : 1;
      return {
        newState: "REVIEW",
        newInterval: interval,
        newRepetitions: 1,
        newEasinessFactor: this.adjustEasinessFactor(
          currentState.easinessFactor,
          rating,
        ),
        newLapses: currentState.lapses,
        newDueDate: this.addDays(now, interval),
      };
    }
  }

  /**
   * Handle cards in the learning phase
   */
  private static handleLearningCard(
    rating: ReviewRating,
    currentState: CardState,
    now: Date,
  ): ReviewResult {
    if (rating === "AGAIN") {
      // Reset to first learning step
      return {
        newState: "LEARNING",
        newInterval: 0,
        newRepetitions: 0,
        newEasinessFactor: currentState.easinessFactor,
        newLapses: currentState.lapses + 1,
        newDueDate: this.addMinutes(now, this.LEARNING_STEPS[0]!),
      };
    }

    // Determine if we should graduate to review or continue learning
    const currentStepIndex = Math.min(
      currentState.repetitions,
      this.LEARNING_STEPS.length - 1,
    );
    
    if (currentStepIndex >= this.LEARNING_STEPS.length - 1) {
      // Graduate to review
      const interval = rating === "EASY" ? 4 : 1;
      return {
        newState: "REVIEW",
        newInterval: interval,
        newRepetitions: 1,
        newEasinessFactor: this.adjustEasinessFactor(
          currentState.easinessFactor,
          rating,
        ),
        newLapses: currentState.lapses,
        newDueDate: this.addDays(now, interval),
      };
    } else {
      // Continue learning
      const nextStep = this.LEARNING_STEPS[currentStepIndex + 1]!;
      return {
        newState: "LEARNING",
        newInterval: 0,
        newRepetitions: currentState.repetitions + 1,
        newEasinessFactor: currentState.easinessFactor,
        newLapses: currentState.lapses,
        newDueDate: this.addMinutes(now, nextStep),
      };
    }
  }

  /**
   * Handle cards in the review phase (main SuperMemo 2 algorithm)
   */
  private static handleReviewCard(
    rating: ReviewRating,
    currentState: CardState,
    now: Date,
  ): ReviewResult {
    if (rating === "AGAIN") {
      // Card lapses, go back to relearning
      return {
        newState: "LEARNING",
        newInterval: 0,
        newRepetitions: 0,
        newEasinessFactor: Math.max(
          currentState.easinessFactor - 0.2,
          this.MIN_EASINESS_FACTOR,
        ),
        newLapses: currentState.lapses + 1,
        newDueDate: this.addMinutes(now, this.RELEARNING_STEPS[0]!),
      };
    }

    // Calculate new easiness factor
    const newEasinessFactor = this.adjustEasinessFactor(
      currentState.easinessFactor,
      rating,
    );

    // Calculate new interval using SuperMemo 2 formula
    let newInterval: number;
    
    if (currentState.repetitions === 0) {
      newInterval = 1;
    } else if (currentState.repetitions === 1) {
      newInterval = 6;
    } else {
      newInterval = Math.round(currentState.interval * newEasinessFactor);
    }

    // Apply rating-specific modifiers
    switch (rating) {
      case "HARD":
        newInterval = Math.max(1, Math.round(newInterval * 1.2));
        break;
      case "GOOD":
        // Use calculated interval as-is
        break;
      case "EASY":
        newInterval = Math.round(newInterval * 1.3);
        break;
    }

    return {
      newState: "REVIEW",
      newInterval,
      newRepetitions: currentState.repetitions + 1,
      newEasinessFactor,
      newLapses: currentState.lapses,
      newDueDate: this.addDays(now, newInterval),
    };
  }

  /**
   * Handle suspended cards
   */
  private static handleSuspendedCard(
    rating: ReviewRating,
    currentState: CardState,
    now: Date,
  ): ReviewResult {
    // Unsuspend and treat as new card
    return this.handleNewCard(rating, currentState, now);
  }

  /**
   * Adjust easiness factor based on rating (SuperMemo 2 formula)
   */
  private static adjustEasinessFactor(
    currentEF: number,
    rating: ReviewRating,
  ): number {
    let q: number;
    
    switch (rating) {
      case "AGAIN":
        q = 0;
        break;
      case "HARD":
        q = 3;
        break;
      case "GOOD":
        q = 4;
        break;
      case "EASY":
        q = 5;
        break;
    }

    const newEF = currentEF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
    
    return Math.max(newEF, this.MIN_EASINESS_FACTOR);
  }

  /**
   * Create initial card state for a new card
   */
  static createInitialCardState(cardId: string, userId: string): Omit<CardState, 'id'> {
    return {
      cardId,
      userId,
      state: "NEW",
      dueDate: new Date(), // Available immediately
      interval: 0,
      repetitions: 0,
      easinessFactor: this.INITIAL_EASINESS_FACTOR,
      lapses: 0,
      lastReviewed: null,
    };
  }

  /**
   * Determine if a card is due for review
   */
  static isCardDue(cardState: CardState, currentTime = new Date()): boolean {
    return cardState.dueDate <= currentTime;
  }

  /**
   * Calculate the number of days until a card is due
   */
  static daysUntilDue(cardState: CardState, currentTime = new Date()): number {
    const msPerDay = 24 * 60 * 60 * 1000;
    const timeDiff = cardState.dueDate.getTime() - currentTime.getTime();
    return Math.ceil(timeDiff / msPerDay);
  }

  /**
   * Get human-readable description of card state
   */
  static getCardStateDescription(cardState: CardState): string {
    const now = new Date();
    
    switch (cardState.state) {
      case "NEW":
        return "New";
      case "LEARNING":
        const minutesUntilDue = Math.ceil(
          (cardState.dueDate.getTime() - now.getTime()) / (1000 * 60)
        );
        return `Learning (${minutesUntilDue}m)`;
      case "REVIEW":
        const daysUntilDue = this.daysUntilDue(cardState, now);
        if (daysUntilDue <= 0) {
          return "Due";
        } else if (daysUntilDue === 1) {
          return "Due tomorrow";
        } else {
          return `Due in ${daysUntilDue} days`;
        }
      case "SUSPENDED":
        return "Suspended";
      default:
        return "Unknown";
    }
  }

  /**
   * Helper function to add minutes to a date
   */
  private static addMinutes(date: Date, minutes: number): Date {
    return new Date(date.getTime() + minutes * 60 * 1000);
  }

  /**
   * Helper function to add days to a date
   */
  private static addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }
}

/**
 * Factory function to create card state from Prisma model
 */
export function createCardStateFromPrisma(prismaCardState: any): CardState {
  return {
    id: prismaCardState.id,
    cardId: prismaCardState.card_id,
    userId: prismaCardState.user_id,
    state: prismaCardState.state,
    dueDate: prismaCardState.due_date,
    interval: prismaCardState.interval,
    repetitions: prismaCardState.repetitions,
    easinessFactor: prismaCardState.easiness_factor,
    lapses: prismaCardState.lapses,
    lastReviewed: prismaCardState.last_reviewed,
  };
}