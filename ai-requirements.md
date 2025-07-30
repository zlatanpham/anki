# AI Integration Requirements for Anki Clone

## Executive Summary

This document outlines a comprehensive AI integration roadmap to enhance the Anki Clone application with intelligent features that improve the user experience, particularly in deck and card creation. The integration will leverage Google's Gemini 1.5 Flash model through Vercel AI SDK to automate content generation, provide intelligent suggestions, and enhance the learning experience through personalized recommendations.

## Current State Analysis

### Existing Infrastructure

- **Tech Stack**: Next.js 15, tRPC, PostgreSQL, Prisma ORM
- **Authentication**: NextAuth with multi-tenant support
- **Card Types**: Basic (front/back) and Cloze deletion cards
- **Import/Export**: JSON format support with validation
- **Study System**: Spaced repetition algorithm with rating-based intervals

### Key Opportunities for AI Enhancement

1. **Content Creation**: Manual card creation is time-consuming
2. **Study Optimization**: Fixed algorithm parameters don't adapt to individual learning patterns
3. **Content Discovery**: No recommendations for related learning materials
4. **Language Support**: Limited assistance for language learners
5. **Multimedia Processing**: No support for generating cards from PDFs, videos, or audio

## Proposed AI Integration Roadmap

### Phase 1: MVP Features (2-3 months)

#### 1.1 Smart Card Generation from Text

**Description**: Generate flashcards automatically from pasted text or notes
**Implementation**:

- Add AI service integration layer with Google Gemini API via Vercel AI SDK
- Create new tRPC endpoints for AI card generation
- Add UI components for text input and card preview/editing
- Store AI usage metrics for billing and optimization

**Technical Requirements**:

```typescript
// New environment variables needed
GOOGLE_GENERATIVE_AI_API_KEY="..."
AI_MODEL="gemini-2.5-flash" // Gemini Flash 2.5
AI_RATE_LIMIT="100" // requests per minute

// New package dependencies
// pnpm add ai @ai-sdk/google

// New database schema additions
model AIGeneration {
  id              String   @id @default(uuid())
  user_id         String
  deck_id         String
  input_text      String   @db.Text
  generated_cards Json
  tokens_used     Int
  model_used      String
  created_at      DateTime @default(now())
}
```

**User Flow**:

1. User navigates to deck and clicks "Generate Cards with AI"
2. User pastes text or types notes
3. AI analyzes content and suggests cards
4. User reviews, edits, and confirms cards
5. Cards are added to deck

#### 1.2 Intelligent Cloze Suggestions

**Description**: Automatically identify key concepts for cloze deletions
**Implementation**:

- Analyze text to identify important terms, definitions, dates, numbers
- Suggest multiple cloze variations for the same content
- Allow user to accept/reject suggestions

**Example**:

```
Input: "The mitochondria is the powerhouse of the cell"
Suggestions:
- "The {{c1::mitochondria}} is the powerhouse of the cell"
- "The mitochondria is the {{c1::powerhouse}} of the cell"
- "The {{c1::mitochondria}} is the {{c2::powerhouse}} of the {{c3::cell}}"
```

#### 1.3 Basic Grammar and Spelling Correction

**Description**: Automatically fix errors in card content
**Implementation**:

- Integrate grammar checking API
- Show corrections inline with accept/reject options
- Maintain user preferences for auto-correction

### Phase 2: Enhanced Features (3-4 months)

#### 2.1 Advanced Content Processing

**Description**: Generate cards from various content types
**Features**:

- **PDF Processing**: Extract text and create structured cards from textbooks/documents
- **Image OCR**: Extract text from images and screenshots
- **YouTube Integration**: Generate cards from video transcripts
- **Web Article Import**: Create cards from web pages with smart summarization

**Technical Architecture**:

```typescript
// Content processor interface
interface ContentProcessor {
  type: 'pdf' | 'image' | 'video' | 'webpage';
  process(input: File | URL): Promise<ProcessedContent>;
  generateCards(content: ProcessedContent): Promise<Card[]>;
}

// New UI components needed
- FileUploadZone with drag-and-drop
- ContentPreview with highlighting
- BatchCardEditor for bulk operations
```

#### 2.2 Personalized Learning Optimization

**Description**: Adapt spaced repetition parameters based on user performance
**Features**:

- Track learning patterns per user and subject
- Adjust ease factors dynamically
- Predict optimal review times
- Identify struggling concepts for additional practice

**Implementation**:

```typescript
// Learning analytics schema
model LearningAnalytics {
  id              String   @id @default(uuid())
  user_id         String
  card_id         String
  difficulty_score Float
  retention_rate  Float
  optimal_interval Int
  last_analyzed   DateTime
}
```

#### 2.3 Multi-language Support

**Description**: Enhanced features for language learning
**Features**:

- Automatic translation for card backs
- Pronunciation guides with IPA
- Example sentences generation
- Context-aware definitions

### Phase 3: Advanced Features (4-6 months)

#### 3.1 AI Study Assistant

**Description**: Interactive AI tutor for difficult concepts
**Features**:

- Chat interface for asking questions about cards
- Generate explanations for wrong answers
- Provide hints without revealing answers
- Create practice exercises

#### 3.2 Smart Deck Recommendations

**Description**: Suggest related learning materials
**Features**:

- Analyze user's learning history
- Recommend public decks on similar topics
- Suggest knowledge prerequisites
- Create learning paths

#### 3.3 Collaborative AI Features

**Description**: AI-powered collaboration tools
**Features**:

- Auto-merge similar cards from different users
- Quality scoring for shared decks
- AI moderation for inappropriate content
- Smart deck combinations

## Technical Architecture

### API Integration Strategy

```typescript
// src/server/services/ai/index.ts
import { google } from "@ai-sdk/google";
import { generateText, generateObject } from "ai";
import { z } from "zod";

// Card generation schema for structured output
const cardSchema = z.object({
  cards: z.array(
    z.object({
      type: z.enum(["BASIC", "CLOZE"]),
      front: z.string(),
      back: z.string().optional(),
      clozeText: z.string().optional(),
      tags: z.array(z.string()).optional(),
    }),
  ),
});

// AI service using Vercel AI SDK
export class AICardService {
  private model = google("gemini-2.5-flash");

  async generateCards(input: string, deckContext?: string) {
    const { object } = await generateObject({
      model: this.model,
      schema: cardSchema,
      prompt: `Generate flashcards from the following text. Create both basic and cloze cards where appropriate:

        ${input}

        ${deckContext ? `Deck context: ${deckContext}` : ""}

        Return high-quality educational flashcards.`,
    });

    return object.cards;
  }

  async suggestClozes(text: string) {
    const { text: suggestions } = await generateText({
      model: this.model,
      prompt: `Identify key concepts in this text for cloze deletions: ${text}`,
    });

    return this.parseClozesSuggestions(suggestions);
  }

  async improveCard(card: Card) {
    const { object } = await generateObject({
      model: this.model,
      schema: z.object({
        improved: z.object({
          front: z.string(),
          back: z.string(),
          suggestions: z.array(z.string()),
        }),
      }),
      prompt: `Improve this flashcard for better learning:
        Front: ${card.front}
        Back: ${card.back}

        Make it clearer, more concise, and educationally effective.`,
    });

    return object.improved;
  }
}

// tRPC router integration
export const aiRouter = createTRPCRouter({
  generateCards: protectedProcedure
    .input(
      z.object({
        text: z.string().min(10),
        deckId: z.string().uuid().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const aiService = new AICardService();
      const cards = await aiService.generateCards(input.text);

      // Track usage
      await ctx.db.aIGeneration.create({
        data: {
          user_id: ctx.session.user.id,
          deck_id: input.deckId,
          input_text: input.text,
          generated_cards: cards,
          tokens_used: input.text.length / 4, // rough estimate
          model_used: "gemini-2.5-flash",
        },
      });

      return cards;
    }),
});
```

### Security and Privacy Considerations

1. **Data Protection**:

   - Encrypt API keys using existing ENCRYPTION_KEY
   - Never send personal data to AI providers
   - Allow users to opt-out of AI features
   - Implement data retention policies

2. **Rate Limiting**:

   - Per-user quotas for AI generation
   - Implement token counting and billing
   - Cache common AI responses

3. **Content Moderation**:
   - Filter inappropriate content
   - Review AI-generated content before saving
   - Allow user reporting of problematic content

### UI/UX Enhancements

1. **AI Generation Workflow**:

   ```tsx
   // New components structure
   components / ai / CardGenerator.tsx; // Main generation interface
   AISettingsPanel.tsx; // User preferences
   GenerationPreview.tsx; // Review AI output
   TokenUsageIndicator.tsx; // Show usage/costs
   ```

2. **Progressive Enhancement**:
   - AI features as optional add-ons
   - Graceful fallback when AI unavailable
   - Clear labeling of AI-generated content

## Implementation Timeline

### Month 1-2: Foundation

- Set up AI provider integrations
- Implement basic card generation
- Create UI components
- Add usage tracking

### Month 3-4: Content Processing

- PDF and image processing
- Batch generation features
- Grammar checking integration

### Month 5-6: Personalization

- Learning analytics system
- Dynamic algorithm adjustments
- Multi-language features

### Month 7-8: Advanced Features

- AI study assistant
- Recommendation engine
- Collaborative features

## Success Metrics

### Quantitative Metrics

- **Adoption Rate**: % of users using AI features
- **Card Generation Speed**: 10x faster than manual creation
- **Study Performance**: 20% improvement in retention rates
- **User Engagement**: 30% increase in daily active users

### Qualitative Metrics

- User satisfaction surveys
- Feature request tracking
- Community feedback
- Error rate monitoring

## Budget Considerations

### API Costs (Monthly Estimates)

Google Gemini 1.5 Flash pricing (as of 2024):

- Input: $0.075 per 1M tokens
- Output: $0.30 per 1M tokens
- Free tier: 1,500 requests/day

### Usage Estimates

- **Small Plan** (1,000 users): ~$50-100/month
- **Medium Plan** (10,000 users): ~$300-500/month
- **Large Plan** (100,000 users): ~$2,000-3,000/month

### Cost Optimization Strategies

1. Leverage Gemini Flash's efficiency for lower costs
2. Implement response caching for common queries
3. Use batch processing where possible
4. Set per-user daily limits
5. Offer premium tiers for heavy users
6. Use streaming responses to reduce token usage

## Risks and Mitigation

### Technical Risks

- **API Reliability**: Multi-provider fallback system
- **Cost Overruns**: Strict rate limiting and monitoring
- **Quality Issues**: Human review and feedback loops
- **Performance**: Async processing and queuing

### Business Risks

- **User Privacy Concerns**: Clear data policies and opt-in features
- **Competitive Pressure**: Rapid feature iteration
- **Regulatory Compliance**: GDPR/CCPA compliance built-in

## Next Steps

1. **Stakeholder Approval**: Review and approve roadmap
2. **Technical Spike**: POC for OpenAI integration
3. **Design Mockups**: UI/UX for AI features
4. **Development Sprint Planning**: Break down Phase 1 into sprints
5. **Community Feedback**: Survey users on desired AI features

## Appendix: Competition Analysis

### Existing AI-Powered Learning Tools

- **Anki with Add-ons**: Limited AI via community plugins
- **RemNote**: AI-powered references and auto-generation
- **Zorbi**: AI explanations and card suggestions
- **Neuracache**: AI-optimized spaced repetition

### Our Differentiation

- Seamless integration (not add-ons)
- Multi-modal content processing
- Personalized learning algorithms
- Open-source community features
- Privacy-first approach

---

_Document Version: 1.0_
_Last Updated: 2025-07-30_
_Author: Business Analyst Team_
