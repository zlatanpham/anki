import { google } from '@ai-sdk/google';
import { generateText, generateObject } from 'ai';
import { z } from 'zod';
import { env } from '@/env';
import { TRPCError } from '@trpc/server';

// Card generation schema for structured output
const cardSchema = z.object({
  cards: z.array(z.object({
    type: z.enum(['BASIC', 'CLOZE']),
    front: z.string(),
    back: z.string().optional(),
    clozeText: z.string().optional(),
    tags: z.array(z.string()).optional(),
  }))
  .refine((cards) => 
    cards.every(card => {
      if (card.type === 'BASIC') {
        return card.front && card.back && !card.clozeText;
      } else if (card.type === 'CLOZE') {
        return card.clozeText && card.clozeText.includes('{{c') && card.clozeText.includes('}}');
      }
      return false;
    }),
    {
      message: "Invalid card format. BASIC cards need front/back, CLOZE cards need clozeText with {{c1::text}} syntax"
    }
  )
});

// Cloze suggestion schema
const clozeSuggestionSchema = z.object({
  suggestions: z.array(z.object({
    text: z.string(),
    clozeVersions: z.array(z.string()),
    explanation: z.string(),
  }))
});

// Grammar correction schema
const grammarCorrectionSchema = z.object({
  corrected: z.object({
    text: z.string(),
    corrections: z.array(z.object({
      original: z.string(),
      suggestion: z.string(),
      type: z.enum(['spelling', 'grammar', 'punctuation', 'style']),
      explanation: z.string(),
    })),
    overallQuality: z.enum(['excellent', 'good', 'fair', 'needs_improvement']),
  })
});

// Card improvement schema
const cardImprovementSchema = z.object({
  improved: z.object({
    front: z.string(),
    back: z.string(),
    suggestions: z.array(z.string()),
    qualityScore: z.number().min(0).max(10),
  })
});

export interface GeneratedCard {
  type: 'BASIC' | 'CLOZE';
  front: string;
  back?: string;
  clozeText?: string;
  tags?: string[];
}

export interface ClozesSuggestion {
  text: string;
  clozeVersions: string[];
  explanation: string;
}

export interface GrammarCorrection {
  original: string;
  suggestion: string;
  type: 'spelling' | 'grammar' | 'punctuation' | 'style';
  explanation: string;
}

export class AICardService {
  private model;
  
  constructor() {
    if (!env.GOOGLE_GENERATIVE_AI_API_KEY) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Google AI API key not configured',
      });
    }
    
    this.model = google(env.AI_MODEL || 'gemini-1.5-flash');
  }
  
  async generateCards(input: string, deckContext?: string): Promise<GeneratedCard[]> {
    try {
      const { object } = await generateObject({
        model: this.model,
        schema: cardSchema,
        prompt: `You are an expert flashcard creator. Generate high-quality educational flashcards from the following text.
        
IMPORTANT FORMATTING RULES:
1. BASIC cards must have:
   - type: "BASIC"
   - front: A question or prompt
   - back: The answer
   - DO NOT include clozeText for basic cards

2. CLOZE cards must have:
   - type: "CLOZE"
   - clozeText: Full sentence with deletions marked as {{c1::hidden text}} or {{c2::another hidden text}}
   - DO NOT include front/back for cloze cards
   - MUST use the exact format: {{c1::text to hide}} with double curly braces

Examples of valid CLOZE cards:
- "The capital of {{c1::France}} is {{c2::Paris}}"
- "{{c1::Photosynthesis}} is the process by which plants convert light energy into chemical energy"
- "The {{c1::mitochondria}} is known as the {{c2::powerhouse}} of the cell"

Guidelines:
- Create a mix of BASIC and CLOZE cards
- For CLOZE cards, hide key terms, numbers, names, or important concepts
- Use c1, c2, c3 etc. for multiple deletions in the same card
- Add relevant tags based on the content topic
- Keep cards concise and focused on one concept

${deckContext ? `Deck context: ${deckContext}` : ''}

Text to process:
${input}

Generate diverse flashcards following the exact format specified above.`,
        maxRetries: 2, // Reduce retries for overload errors
      });
      
      // Validate and fix cloze cards
      const validatedCards = object.cards.map(card => {
        if (card.type === 'CLOZE' && card.clozeText) {
          // Ensure cloze text has proper format
          if (!card.clozeText.includes('{{c') || !card.clozeText.includes('}}')) {
            console.warn('Invalid cloze format detected:', card.clozeText);
            // Try to fix common issues
            let fixed = card.clozeText;
            // Replace {c1:text} with {{c1::text}}
            fixed = fixed.replace(/\{c(\d+):([^}]+)\}/g, '{{c$1::$2}}');
            // Replace {{c1:text}} with {{c1::text}}
            fixed = fixed.replace(/\{\{c(\d+):([^}]+)\}\}/g, '{{c$1::$2}}');
            // If still no valid format, skip this card
            if (!fixed.includes('{{c') || !fixed.includes('::') || !fixed.includes('}}')) {
              console.error('Could not fix cloze format, skipping card');
              return null;
            }
            card.clozeText = fixed;
          }
          // Clear front/back for cloze cards
          card.front = '';
          card.back = undefined;
        }
        return card;
      }).filter(Boolean) as GeneratedCard[];
      
      return validatedCards;
    } catch (error: any) {
      console.error('Error generating cards:', error);
      
      // Check for specific error types
      if (error.statusCode === 503 || error.message?.includes('overloaded')) {
        throw new TRPCError({
          code: 'TOO_MANY_REQUESTS',
          message: 'The AI service is currently busy. Please try again in a few moments.',
        });
      }
      
      if (error.statusCode === 429) {
        throw new TRPCError({
          code: 'TOO_MANY_REQUESTS',
          message: 'Rate limit exceeded. Please wait a moment before trying again.',
        });
      }
      
      if (error.message?.includes('API key')) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'AI service configuration error. Please check your API key.',
        });
      }
      
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to generate cards. Please try again.',
      });
    }
  }
  
  async suggestClozes(text: string): Promise<ClozesSuggestion[]> {
    try {
      const { object } = await generateObject({
        model: this.model,
        schema: clozeSuggestionSchema,
        prompt: `Analyze this text and suggest multiple cloze deletion variations. Focus on key concepts, definitions, dates, numbers, and important terms.

For each suggestion:
1. Identify the key learning point
2. Create 2-3 different cloze variations
3. Explain why this is a good deletion point

Text: ${text}

Use {{c1::text}} syntax for cloze deletions. Create variations that test different aspects of understanding.`,
        maxRetries: 2,
      });
      
      return object.suggestions;
    } catch (error: any) {
      console.error('Error suggesting clozes:', error);
      
      if (error.statusCode === 503 || error.message?.includes('overloaded')) {
        throw new TRPCError({
          code: 'TOO_MANY_REQUESTS',
          message: 'The AI service is currently busy. Please try again in a few moments.',
        });
      }
      
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to suggest cloze deletions.',
      });
    }
  }
  
  async correctGrammar(text: string): Promise<{
    correctedText: string;
    corrections: GrammarCorrection[];
    overallQuality: string;
  }> {
    try {
      const { object } = await generateObject({
        model: this.model,
        schema: grammarCorrectionSchema,
        prompt: `Check and correct any grammar, spelling, punctuation, or style issues in this text. Maintain the original meaning while improving clarity.

Text: ${text}

Provide the corrected version and list all corrections made with explanations.`,
      });
      
      return {
        correctedText: object.corrected.text,
        corrections: object.corrected.corrections,
        overallQuality: object.corrected.overallQuality,
      };
    } catch (error) {
      console.error('Error correcting grammar:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to check grammar.',
      });
    }
  }
  
  async improveCard(card: { front: string; back: string }): Promise<{
    improved: { front: string; back: string };
    suggestions: string[];
    qualityScore: number;
  }> {
    try {
      const { object } = await generateObject({
        model: this.model,
        schema: cardImprovementSchema,
        prompt: `Improve this flashcard for better learning effectiveness:

Front: ${card.front}
Back: ${card.back}

Guidelines:
1. Make questions clear and unambiguous
2. Ensure answers are concise but complete
3. Remove unnecessary words
4. Fix any factual errors
5. Improve formatting for readability

Provide the improved version, specific suggestions, and a quality score (0-10).`,
      });
      
      return {
        improved: {
          front: object.improved.front,
          back: object.improved.back,
        },
        suggestions: object.improved.suggestions,
        qualityScore: object.improved.qualityScore,
      };
    } catch (error) {
      console.error('Error improving card:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to improve card.',
      });
    }
  }
  
  async analyzeText(text: string): Promise<{
    wordCount: number;
    estimatedCards: number;
    topics: string[];
    difficulty: 'beginner' | 'intermediate' | 'advanced';
  }> {
    try {
      const { text: analysis } = await generateText({
        model: this.model,
        prompt: `Analyze this text for flashcard generation:

${text}

Provide:
1. Approximate number of quality flashcards that can be generated
2. Main topics covered (for tags)
3. Difficulty level
4. Brief summary

Return a JSON object with: estimatedCards (number), topics (array of strings), difficulty (beginner/intermediate/advanced)`,
      });
      
      // Parse the response
      try {
        const parsed = JSON.parse(analysis);
        return {
          wordCount: text.split(/\s+/).length,
          estimatedCards: parsed.estimatedCards || Math.floor(text.length / 200),
          topics: parsed.topics || [],
          difficulty: parsed.difficulty || 'intermediate',
        };
      } catch {
        // Fallback if parsing fails
        return {
          wordCount: text.split(/\s+/).length,
          estimatedCards: Math.floor(text.length / 200),
          topics: [],
          difficulty: 'intermediate',
        };
      }
    } catch (error) {
      console.error('Error analyzing text:', error);
      // Return fallback analysis
      return {
        wordCount: text.split(/\s+/).length,
        estimatedCards: Math.floor(text.length / 200),
        topics: [],
        difficulty: 'intermediate',
      };
    }
  }
}

// Export singleton instance
let aiService: AICardService | null = null;

export function getAIService(): AICardService {
  if (!aiService && env.GOOGLE_GENERATIVE_AI_API_KEY) {
    aiService = new AICardService();
  }
  if (!aiService) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'AI service not available. Please configure Google AI API key.',
    });
  }
  return aiService;
}