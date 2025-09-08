import { env } from "@/env";

export interface GenerationSuggestion {
  type: "reduce-quantity" | "use-categories" | "import-list" | "community-deck";
  title: string;
  description: string;
  cardCount: number;
  estimatedTime: number;
  action: string;
  priority: number;
}

export interface RequestValidation {
  isRealistic: boolean;
  detectedPattern?: "numeric-quantity" | "all-of-category" | "minimal-input";
  estimatedCards: number;
  estimatedTime: number;
  estimatedCost: number;
  warnings: string[];
  suggestions: GenerationSuggestion[];
}

export class RequestValidationService {
  private maxCards: number;

  constructor() {
    this.maxCards = parseInt(env.AI_MAX_CARDS_PER_GENERATION ?? "100");
  }

  // Simplified validation - only check for explicit number requests
  detectExplicitNumberRequest(prompt: string): number | null {
    // Check for explicit number patterns like "generate 1000 cards" or "create 500 words"
    const patterns = [
      /generate\s+(\d+)\s+(?:cards?|words?|items?)/i,
      /create\s+(\d+)\s+(?:cards?|words?|items?)/i,
      /make\s+(\d+)\s+(?:cards?|words?|items?)/i,
      /(\d+)\s+(?:cards?|words?)\s+(?:for|about|on)/i,
    ];

    for (const pattern of patterns) {
      const match = prompt.match(pattern);
      if (match?.[1]) {
        return parseInt(match[1]);
      }
    }

    return null;
  }

  async validateRequest(prompt: string): Promise<RequestValidation> {
    // Simple validation without LLM for performance
    const explicitNumber = this.detectExplicitNumberRequest(prompt);

    const validation: RequestValidation = {
      isRealistic: true,
      estimatedCards: 50, // Default estimate
      estimatedTime: 60,
      estimatedCost: 0.05,
      warnings: [],
      suggestions: [],
    };

    if (explicitNumber && explicitNumber > this.maxCards) {
      validation.isRealistic = false;
      validation.warnings.push(
        `You requested ${explicitNumber} cards, but we limit each generation to ${this.maxCards} cards for optimal quality and performance.`,
      );
      validation.suggestions = [
        {
          type: "reduce-quantity",
          title: `Generate Top ${this.maxCards} Most Important`,
          description: "We'll focus on the most essential items",
          cardCount: this.maxCards,
          estimatedTime: 120,
          action: "generate-max",
          priority: 1,
        },
      ];
    }

    return validation;
  }

  async analyzeText(text: string): Promise<{
    wordCount: number;
    estimatedCards: number;
    estimatedTime: number;
    recommendedMode: "quick" | "standard" | "comprehensive";
  }> {
    const wordCount = text.split(/\s+/).length;
    const estimatedCards = Math.min(
      Math.floor(wordCount / 50), // Roughly 1 card per 50 words
      this.maxCards,
    );
    const estimatedTime = estimatedCards * 2; // 2 seconds per card

    let recommendedMode: "quick" | "standard" | "comprehensive" = "quick";
    if (estimatedCards > 25) recommendedMode = "comprehensive";
    else if (estimatedCards > 10) recommendedMode = "standard";

    return {
      wordCount,
      estimatedCards,
      estimatedTime,
      recommendedMode,
    };
  }
}

// Export singleton instance
let validationService: RequestValidationService | null = null;

export function getValidationService(): RequestValidationService {
  if (!validationService && env.GOOGLE_GENERATIVE_AI_API_KEY) {
    validationService = new RequestValidationService();
  }
  if (!validationService) {
    throw new Error(
      "Validation service not available. Please configure Google AI API key.",
    );
  }
  return validationService;
}
