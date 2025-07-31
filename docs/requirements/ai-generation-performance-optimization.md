# AI Generation Performance Optimization Requirements

## Overview

This document outlines the requirements for optimizing AI card generation performance to address latency issues when processing large texts. The goal is to provide a responsive user experience while maintaining high-quality card generation.

### Key Features (v1.2)

1. **Hard limit of 100 cards per generation** - Configurable via `AI_MAX_CARDS_PER_GENERATION` environment variable
2. **LLM-based intent detection** - Smart analysis of user requests to understand actual needs
3. **Intelligent suggestions** - Guide users toward effective learning strategies when requests exceed limits
4. **Progressive generation** - Support for multiple focused batches instead of massive single generations

## Problem Statement

### Current Issues
- Long processing times (30+ seconds) for large text inputs
- No user feedback during generation
- Risk of timeouts for very large texts
- Poor user experience with perceived application freezing
- Unpredictable generation times based on input size

### Root Causes
1. **Unbounded Input Size**: Users can paste texts of any length
2. **Single Request Processing**: Entire text processed in one AI call
3. **Lack of Progress Feedback**: Users have no visibility into generation status
4. **No Optimization Strategy**: Same approach for 100 words vs 10,000 words
5. **Unrealistic User Requests**: Users may request thousands of cards from minimal input (e.g., "generate 10000 English words")

## Functional Requirements

### FR1: Text Analysis and Limits

#### FR1.1 Input Analysis
- Display real-time character and word count as user types/pastes
- Calculate estimated processing time based on text length
- Show visual indicators for text length (green/yellow/red)

#### FR1.2 Generation Limits
- Maximum cards per generation: 100 (configurable via AI_MAX_CARDS_PER_GENERATION env var)
- Soft text limit: 2,000 words (recommended)
- Hard text limit: 5,000 words (requires chunking)
- Maximum single request: 3,000 words

#### FR1.3 Estimation Display
```
Text Statistics:
- Words: 2,547
- Estimated cards: 15-20
- Processing time: ~25 seconds
[!] Text exceeds recommended length
```

### FR2: Request Validation and Smart Handling

#### FR2.1 LLM-Based Intent Detection
- Use LLM to analyze user intent and extract requirements
- Detect if user is requesting specific quantities vs. comprehensive coverage
- Identify topic scope and appropriate generation strategy

#### FR2.2 Smart Request Analysis
```typescript
interface RequestAnalysis {
  intent: 'specific-content' | 'vocabulary-list' | 'comprehensive-topic' | 'unrealistic-quantity';
  detectedQuantity?: number;
  suggestedQuantity: number; // Capped at AI_MAX_CARDS_PER_GENERATION
  topics: string[];
  estimatedCards: number;
  confidence: number;
  reasoning: string;
}

// Example LLM prompt for intent detection
const INTENT_DETECTION_PROMPT = `
Analyze this card generation request and determine:
1. What type of request is this? (specific content, vocabulary list, topic coverage, etc.)
2. How many cards are they expecting? (explicit number or implicit expectation)
3. What topics/areas should be covered?
4. Is this request realistic for a single generation?

Request: "{userInput}"

Respond with a JSON object containing intent analysis.
`;
```

#### FR2.3 User Guidance for Large Requests
When LLM detects request exceeding the 100 card limit:
```
⚠️ Generation Limit Reached
You requested: "Generate 10000 common English words"
Maximum cards per generation: 100

We'll generate the top 100 most important items based on:
• Frequency of use
• Learning value
• Your current level

Want more cards? You can:
• Generate additional batches by topic
• Import pre-made decks from community
• Upload your own word lists

[Generate Top 100] [Browse Topics] [Import Deck]
```

### FR3: Generation Modes

#### FR2.1 Quick Mode
- **Target**: 5-10 cards
- **Max input**: 1,000 words
- **Processing time**: <10 seconds
- **Use case**: Quick study sessions, testing

#### FR2.2 Standard Mode
- **Target**: 15-25 cards
- **Max input**: 2,000 words
- **Processing time**: 15-30 seconds
- **Use case**: Regular study material

#### FR2.3 Comprehensive Mode
- **Target**: 30+ cards
- **Max input**: 5,000 words
- **Processing time**: 60+ seconds
- **Use case**: Detailed learning, textbook chapters
- **Implementation**: Automatic chunking

### FR3: Progress Feedback

#### FR3.1 Progress Stages
1. **Analyzing text** (0-20%)
   - "Understanding content structure..."
2. **Extracting concepts** (20-50%)
   - "Identifying key learning points..."
3. **Generating cards** (50-90%)
   - "Creating flashcards..."
4. **Finalizing** (90-100%)
   - "Optimizing card quality..."

#### FR3.2 Progress UI
- Linear progress bar with percentage
- Current stage description
- Cards generated counter
- Estimated time remaining
- Cancel button

### FR4: Text Chunking Strategy

#### FR4.1 Chunk Configuration
```typescript
interface ChunkConfig {
  maxWordsPerChunk: 2000;
  overlapWords: 100; // Context preservation
  maxChunks: 5;
}
```

#### FR4.2 Chunking Rules
- Break at paragraph boundaries when possible
- Maintain context with overlap
- Process chunks sequentially
- Combine results intelligently

### FR5: Batch Generation for Large Requests

#### FR5.1 Batch Strategy
For quantity-based requests (e.g., "1000 common words"):
```typescript
interface BatchGeneration {
  totalRequested: number;
  batchSize: 50; // Cards per batch
  maxBatches: 20; // Maximum 1000 cards
  delayBetweenBatches: 2000; // 2 seconds
  allowUserInterruption: true;
}
```

#### FR5.2 Progressive Batch UI
```
Generating Common English Words
Batch Progress: 3/20 batches
[████████░░░░░░░░░░░░] 150/1000 cards

Current Batch: Basic Verbs
✓ Batch 1: Numbers (1-50) - Complete
✓ Batch 2: Basic Nouns (51-100) - Complete
➤ Batch 3: Basic Verbs (101-150) - In Progress
○ Batch 4: Adjectives (151-200) - Pending

[Pause After Current Batch] [Stop Now (Keep 150 cards)]
```

#### FR5.3 Smart Batching Rules
- First batch: Most essential/common items
- Subsequent batches: Decreasing frequency/importance
- Allow review between batches
- Save progress after each batch

### FR6: Streaming and Progressive Display

#### FR5.1 Streaming Response
- Display cards as they are generated
- Allow interaction with completed cards
- Continue generation in background

#### FR5.2 Early Termination
- "Stop Generation" button
- Keep cards generated so far
- Option to continue later

## Non-Functional Requirements

### NFR1: Performance
- 95% of standard generations complete within 30 seconds
- Quick mode always completes within 10 seconds
- No single request exceeds 45 seconds

### NFR2: User Experience
- Clear feedback at every stage
- Predictable processing times
- Graceful handling of long texts
- No perceived application freezing

### NFR3: Quality
- Maintain card quality across chunks
- Avoid duplicate concepts
- Preserve context in chunked processing

### NFR4: Scalability
- Handle concurrent generations efficiently
- Queue management for multiple users
- Resource optimization

### FR7: Alternative Solutions for Large Requests

#### FR7.1 Pre-built Content Library
```typescript
interface PrebuiltDeck {
  id: string;
  title: string;
  description: string;
  cardCount: number;
  category: string;
  difficulty: string;
  downloadCount: number;
  rating: number;
}
```

#### FR7.2 Community Deck Suggestions
When detecting large vocabulary requests:
```
Instead of generating 10,000 cards, consider these options:

📚 Recommended Pre-built Decks:
┌─────────────────────────────────────────┐
│ • "5000 Most Common English Words"      │
│   4,987 cards • 4.8★ • 50K downloads    │
│   [Preview] [Import]                    │
│                                         │
│ • "English Vocabulary by Frequency"     │
│   10,000 cards • 4.7★ • 30K downloads   │
│   [Preview] [Import]                    │
│                                         │
│ • "Basic English - First 1000 Words"    │
│   1,000 cards • 4.9★ • 100K downloads   │
│   [Preview] [Import]                    │
└─────────────────────────────────────────┘

Or generate a smaller, customized set:
[Generate Top 100] [Generate by Topic]
```

#### FR7.3 Import from External Sources
- Support CSV/TSV import for word lists
- Integrate with frequency databases
- Allow custom filtering (e.g., "only verbs")

### FR8: Unrealistic Request Detection and Handling

#### FR8.1 Pattern Recognition
```typescript
interface RequestPattern {
  type: 'numeric-quantity' | 'all-of-category' | 'entire-language';
  estimatedCards: number;
  confidence: number;
  detectedPatterns: string[];
}

// Examples of patterns to detect:
const UNREALISTIC_PATTERNS = [
  /generate\s+(\d{4,})\s+(?:words|cards|items)/i,  // "generate 5000 words"
  /all\s+(?:english|spanish|french)\s+(?:words|vocabulary)/i,  // "all English words"
  /every\s+(?:verb|noun|adjective)/i,  // "every verb"
  /complete\s+(?:dictionary|vocabulary)/i,  // "complete dictionary"
  /entire\s+(?:language|course)/i,  // "entire language"
];
```

#### FR8.2 Request Validation Rules
```typescript
interface RequestValidation {
  maxCardsFromMinimalInput: 50;  // Max cards from <50 words input
  warningThreshold: 100;          // Warn if >100 cards requested
  hardLimit: 500;                 // Absolute max for single generation
  inputToOutputRatio: 10;         // Max 10x expansion ratio
}
```

#### FR8.3 Educational Response Strategy
When detecting unrealistic requests, provide educational guidance:
```
📊 Request Analysis
Your request: "Generate 10000 common English words"
Estimated time: 3-5 hours
Estimated cost: ~$15-20

⚡ Smart Alternatives:
1. Start with essentials (Recommended)
   • Top 100 most common words (2 min)
   • Covers 50% of everyday English
   [Generate Top 100]

2. Frequency-based approach
   • First 500 words (10 min)
   • First 1000 words (20 min)
   • First 2000 words (40 min)
   [Choose Frequency Range]

3. Category-based learning
   • Basic nouns (100 cards)
   • Common verbs (100 cards)
   • Essential adjectives (50 cards)
   [Generate by Category]

4. Use curated content
   • Import frequency lists
   • Community decks
   • Professional courses
   [Browse Options]

💡 Why smaller sets work better:
• Better retention with focused study
• Avoid overwhelming your review queue
• Learn in context, not isolation
• Progress tracking is more meaningful
```

### FR9: Smart Content Suggestions

#### FR9.1 Topic Expansion
For minimal input, suggest topic expansion:
```typescript
interface TopicSuggestion {
  originalRequest: string;
  suggestedTopics: Array<{
    topic: string;
    estimatedCards: number;
    difficulty: string;
    relevance: number;
  }>;
  learningPath: Array<{
    stage: string;
    topics: string[];
    cardCount: number;
  }>;
}
```

#### FR9.2 Contextual Generation
```
Your request seems broad. Let's make it more specific:

"Generate English words" → 

Choose a focus area:
┌─────────────────────────────────────────┐
│ 🏠 Daily Life                           │
│    • Home & Family (50 cards)           │
│    • Food & Cooking (75 cards)          │
│    • Shopping & Money (50 cards)        │
│                                         │
│ 💼 Professional                         │
│    • Business Basics (100 cards)        │
│    • Email & Communication (50 cards)   │
│    • Meeting Vocabulary (40 cards)      │
│                                         │
│ 🎓 Academic                             │
│    • Academic Writing (80 cards)        │
│    • Research Terms (60 cards)          │
│    • Subject-Specific (varies)          │
│                                         │
│ 🗣️ Conversation                        │
│    • Greetings & Small Talk (30 cards)  │
│    • Opinions & Emotions (50 cards)     │
│    • Common Phrases (100 cards)         │
└─────────────────────────────────────────┘

[Select Multiple] [Custom Topic]
```

### FR10: Progressive Generation with Save Points

#### FR10.1 Incremental Generation
```typescript
interface ProgressiveGeneration {
  sessionId: string;
  totalRequested: number;
  generated: number;
  batches: Array<{
    batchNumber: number;
    theme: string;
    cards: GeneratedCard[];
    quality: number;
    saved: boolean;
  }>;
  nextBatchSuggestion: string;
  canContinue: boolean;
}
```

#### FR10.2 Session Management UI
```
Generation Session: Learning English Vocabulary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Progress: 250/10000 cards (2.5%)

✅ Completed Batches:
┌─────────────────────────────────────────┐
│ Batch 1: Numbers & Counting (50 cards)  │
│ Quality: ★★★★★ | Study now             │
│                                         │
│ Batch 2: Colors & Shapes (50 cards)     │
│ Quality: ★★★★★ | Study now             │
│                                         │
│ Batch 3: Basic Verbs (50 cards)         │
│ Quality: ★★★★☆ | Study now             │
│                                         │
│ Batch 4: Family & Relations (50 cards)  │
│ Quality: ★★★★★ | Study now             │
│                                         │
│ Batch 5: Time & Calendar (50 cards)     │
│ Quality: ★★★★☆ | Study now             │
└─────────────────────────────────────────┘

📊 Session Stats:
• Total study time saved: 2.5 hours
• Average quality: 4.7/5
• Most difficult category: Basic Verbs

Next suggested batch: Food & Dining (50 cards)
Estimated time: 2 minutes

[Generate Next Batch] [Change Topic] [End Session]

💡 Tip: Master these 250 cards before adding more!
```

## Technical Implementation

### Data Models

```typescript
interface GenerationRequest {
  id: string;
  userId: string;
  deckId: string;
  text: string;
  mode: 'quick' | 'standard' | 'comprehensive';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: GenerationProgress;
  chunks?: TextChunk[];
  createdAt: Date;
  sessionId?: string;
  validationResult?: RequestValidation;
}

interface GenerationProgress {
  stage: 'analyzing' | 'extracting' | 'generating' | 'finalizing';
  percentage: number;
  cardsGenerated: number;
  totalCardsEstimated: number;
  currentChunk?: number;
  totalChunks?: number;
  estimatedTimeRemaining: number;
}

interface TextChunk {
  id: string;
  content: string;
  wordCount: number;
  startIndex: number;
  endIndex: number;
  overlap: string;
  processed: boolean;
}

interface RequestValidation {
  isRealistic: boolean;
  detectedPattern?: 'numeric-quantity' | 'all-of-category' | 'minimal-input';
  estimatedCards: number;
  estimatedTime: number;
  estimatedCost: number;
  warnings: string[];
  suggestions: GenerationSuggestion[];
}

interface GenerationSuggestion {
  type: 'reduce-quantity' | 'use-categories' | 'import-list' | 'community-deck';
  title: string;
  description: string;
  cardCount: number;
  estimatedTime: number;
  action: string;
  priority: number;
}
```

### API Endpoints

```typescript
// Analyze text before generation
POST /api/ai/analyze-text
Request: { text: string }
Response: {
  wordCount: number;
  estimatedCards: number;
  estimatedTime: number;
  recommendedMode: 'quick' | 'standard' | 'comprehensive';
  requiresChunking: boolean;
}

// Validate generation request
POST /api/ai/validate-request
Request: { 
  prompt: string;
  requestedCards?: number;
}
Response: {
  isRealistic: boolean;
  estimatedCards: number;
  estimatedTime: number;
  estimatedCost: number;
  warnings: string[];
  suggestions: Array<{
    type: string;
    description: string;
    cardCount: number;
    action: string;
  }>;
}

// Start generation with mode
POST /api/ai/generate-cards
Request: {
  text: string;
  deckId: string;
  mode: 'quick' | 'standard' | 'comprehensive';
  options?: {
    maxCards?: number;
    focusAreas?: string[];
    sessionId?: string; // For progressive generation
  }
}
Response: {
  generationId: string;
  estimatedTime: number;
  sessionId?: string;
}

// Get generation progress
GET /api/ai/generation/:id/progress
Response: GenerationProgress

// Cancel generation
POST /api/ai/generation/:id/cancel

// Get session status
GET /api/ai/session/:id
Response: ProgressiveGeneration

// Continue session
POST /api/ai/session/:id/continue
Request: {
  batchSize?: number;
  topic?: string;
}
```

### Configuration

```typescript
// Environment variables
// AI_MAX_CARDS_PER_GENERATION=100  # Maximum cards allowed per generation

const GENERATION_CONFIG = {
  modes: {
    quick: {
      maxWords: 1000,
      maxCards: 10,
      timeout: 10000,
      priority: 'high'
    },
    standard: {
      maxWords: 2000,
      maxCards: 25,
      timeout: 30000,
      priority: 'normal'
    },
    comprehensive: {
      maxWords: 5000,
      maxCards: parseInt(process.env.AI_MAX_CARDS_PER_GENERATION || '100'),
      timeout: 90000,
      priority: 'low',
      enableChunking: true
    }
  },
  chunking: {
    maxWordsPerChunk: 2000,
    overlapWords: 100,
    maxConcurrentChunks: 2
  },
  progress: {
    updateInterval: 1000, // ms
    stages: {
      analyzing: { start: 0, end: 20 },
      extracting: { start: 20, end: 50 },
      generating: { start: 50, end: 90 },
      finalizing: { start: 90, end: 100 }
    }
  },
  validation: {
    maxCardsPerGeneration: parseInt(process.env.AI_MAX_CARDS_PER_GENERATION || '100'),
    llmIntentDetection: true, // Use LLM for smart intent analysis
    limits: {
      warningThreshold: 50, // Warn if approaching limit
      minInputLength: 10, // Minimum prompt length for generation
      costWarningThreshold: 2.00 // Warn if estimated cost > $2
    },
    suggestions: {
      defaultBatchSize: 25, // Suggest smaller batches for better learning
      recommendedTopics: ['daily_life', 'business', 'academic', 'conversation'],
      frequencyRanges: [25, 50, 100] // Adjusted for 100 card limit
    }
  },
  sessions: {
    maxBatchesPerSession: 100,
    batchCooldown: 2000, // ms between batches
    sessionTimeout: 86400000, // 24 hours
    maxConcurrentSessions: 3
  }
};
```

## UI/UX Mockups

### Input Analysis Display
```
┌─────────────────────────────────────────┐
│ Paste your text here...                 │
│                                         │
│ [2,547 words pasted]                    │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│ 📊 Text Analysis                        │
│ • Words: 2,547                          │
│ • Estimated cards: 15-20                │
│ • Processing time: ~25 seconds          │
│                                         │
│ ⚠️ Text exceeds recommended length      │
│ Consider using Comprehensive mode       │
└─────────────────────────────────────────┘
```

### Mode Selection
```
┌─────────────────────────────────────────┐
│ Select Generation Mode:                 │
│                                         │
│ [⚡] Quick        [📚] Standard         │
│ 5-10 cards       15-25 cards           │
│ <10 seconds      15-30 seconds         │
│                                         │
│      [📖] Comprehensive                 │
│      30+ cards                          │
│      60+ seconds (chunked)              │
└─────────────────────────────────────────┘
```

### Progress Display
```
┌─────────────────────────────────────────┐
│ Generating Cards...                     │
│                                         │
│ [████████████████░░░░░░░░] 65%         │
│                                         │
│ Stage: Creating flashcards...           │
│ Cards generated: 12/20 (estimated)      │
│ Time remaining: ~10 seconds             │
│                                         │
│ [Cancel Generation]                     │
└─────────────────────────────────────────┘
```

## Success Metrics

1. **Performance Metrics**
   - Average generation time reduced by 40%
   - 95% of generations complete within estimated time
   - Zero timeouts for standard mode

2. **User Experience Metrics**
   - 50% reduction in generation abandonment rate
   - 80% user satisfaction with progress feedback
   - 90% of users understand processing time estimates

3. **Quality Metrics**
   - Maintain 95% card quality score
   - Less than 5% duplicate concepts
   - Context preservation score >90% for chunked texts

4. **Cost Metrics**
   - 30% reduction in API costs through efficient chunking
   - Optimized token usage per card generated

## Implementation Timeline

### Phase 1: Foundation (Week 1)
- [ ] Implement text analysis and word counting
- [ ] Add processing time estimation
- [ ] Create basic progress UI
- [ ] Add request validation for unrealistic queries

### Phase 2: Generation Modes & Smart Detection (Week 2)
- [ ] Implement Quick/Standard/Comprehensive modes
- [ ] Add mode selection UI
- [ ] Configure mode-specific limits
- [ ] Implement pattern detection for large requests
- [ ] Create educational response system

### Phase 3: Chunking & Batch System (Week 3)
- [ ] Implement text chunking algorithm
- [ ] Add chunk processing logic
- [ ] Test context preservation
- [ ] Build progressive generation sessions
- [ ] Create batch management UI

### Phase 4: Progress & Alternative Solutions (Week 4)
- [ ] Implement progress tracking
- [ ] Add streaming response support
- [ ] Create cancellation mechanism
- [ ] Build pre-built deck suggestions
- [ ] Implement topic expansion UI

### Phase 5: Smart Suggestions & Testing (Week 5)
- [ ] Implement contextual generation suggestions
- [ ] Add frequency-based generation options
- [ ] Create import/export for word lists
- [ ] Performance optimization
- [ ] User testing and feedback

### Phase 6: Polish & Integration (Week 6)
- [ ] Session persistence and recovery
- [ ] Cost estimation and warnings
- [ ] Community deck integration
- [ ] Documentation and user guides
- [ ] A/B testing for UI variations

## Environment Configuration

Add to `.env` file:
```bash
# AI Generation Limits
AI_MAX_CARDS_PER_GENERATION=100  # Maximum cards allowed per generation (default: 100)

# Existing AI configuration
GOOGLE_GENERATIVE_AI_API_KEY=your-api-key
AI_MODEL=gemini-2.0-flash
```

## Dependencies

1. **Technical Dependencies**
   - Vercel AI SDK streaming support
   - WebSocket or SSE for progress updates
   - Background job processing system
   - LLM intent analysis capability

2. **Resource Dependencies**
   - UI/UX design resources
   - QA testing resources
   - Performance monitoring tools

### Sample Request Validation Service

```typescript
export class RequestValidationService {
  private aiService: AICardService;
  private maxCards: number;

  constructor() {
    this.aiService = getAIService();
    this.maxCards = parseInt(process.env.AI_MAX_CARDS_PER_GENERATION || '100');
  }

  async validateRequest(prompt: string): Promise<RequestValidation> {
    // Use LLM to analyze the request intent
    const { object: analysis } = await generateObject({
      model: this.aiService.model,
      schema: z.object({
        intent: z.enum(['specific-content', 'vocabulary-list', 'comprehensive-topic', 'unrealistic-quantity']),
        detectedQuantity: z.number().optional(),
        topics: z.array(z.string()),
        estimatedCards: z.number(),
        confidence: z.number().min(0).max(1),
        reasoning: z.string()
      }),
      prompt: `Analyze this flashcard generation request:
        "${prompt}"
        
        Determine:
        1. The user's intent (specific content from text, vocabulary list, comprehensive topic coverage, or unrealistic quantity)
        2. Any specific quantity mentioned or implied
        3. Main topics to cover
        4. Realistic number of cards this would generate
        5. Your confidence in this analysis (0-1)
        6. Brief reasoning for your assessment
        
        Consider that we have a maximum limit of ${this.maxCards} cards per generation.`
    });

    const validation: RequestValidation = {
      isRealistic: analysis.intent !== 'unrealistic-quantity',
      detectedPattern: analysis.intent === 'vocabulary-list' ? 'numeric-quantity' : 
                      analysis.intent === 'comprehensive-topic' ? 'all-of-category' : undefined,
      estimatedCards: Math.min(analysis.estimatedCards, this.maxCards),
      estimatedTime: Math.min(analysis.estimatedCards, this.maxCards) * 2,
      estimatedCost: Math.min(analysis.estimatedCards, this.maxCards) * 0.001,
      warnings: [],
      suggestions: []
    };

    // Add warnings based on LLM analysis
    if (analysis.detectedQuantity && analysis.detectedQuantity > this.maxCards) {
      validation.warnings.push(
        `You requested ${analysis.detectedQuantity} cards, but we limit each generation to ${this.maxCards} cards for optimal quality and performance.`
      );
    }

    // Generate smart suggestions
    if (!validation.isRealistic || analysis.estimatedCards > this.maxCards) {
      validation.suggestions = await this.generateSmartSuggestions(prompt, analysis);
    }

    return validation;
  }

  async generateSmartSuggestions(prompt: string, analysis: any): Promise<GenerationSuggestion[]> {
    const suggestions: GenerationSuggestion[] = [];

    // Always suggest starting with a focused batch
    suggestions.push({
      type: 'reduce-quantity',
      title: `Generate Top ${Math.min(25, this.maxCards)} Most Important`,
      description: 'Start with the most essential items for effective learning',
      cardCount: Math.min(25, this.maxCards),
      estimatedTime: 60,
      action: 'generate-focused',
      priority: 1
    });

    // Topic-based suggestions
    if (analysis.topics.length > 0) {
      suggestions.push({
        type: 'use-categories',
        title: 'Generate by Topic',
        description: `Focus on: ${analysis.topics.slice(0, 3).join(', ')}`,
        cardCount: Math.min(50, this.maxCards),
        estimatedTime: 120,
        action: 'select-topics',
        priority: 2
      });
    }

    // Community deck suggestion for large requests
    if (analysis.estimatedCards > this.maxCards * 5) {
      suggestions.push({
        type: 'community-deck',
        title: 'Browse Pre-made Decks',
        description: 'Access thousands of cards created by the community',
        cardCount: 0,
        estimatedTime: 0,
        action: 'browse-community',
        priority: 3
      });
    }

    return suggestions;
  }
}
```

## Risks and Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Chunking affects card quality | High | Implement smart overlap and context preservation |
| Progress tracking overhead | Medium | Use efficient update intervals |
| User confusion with modes | Medium | Clear UI with tooltips and recommendations |
| API rate limits | High | Implement request queuing and batching |
| Unrealistic user expectations | High | Education UI, smart suggestions, progressive generation |
| Cost overruns from large requests | High | Request validation, cost warnings, session limits |

## Future Enhancements

1. **Adaptive Mode Selection**
   - Learn user preferences
   - Auto-select based on text type

2. **Smart Chunking**
   - Topic-based chunking
   - Maintain narrative flow

3. **Parallel Processing**
   - Process multiple chunks simultaneously
   - Reduce total generation time

4. **Caching System**
   - Cache common concepts
   - Reuse generated cards for similar content

---

*Document Version: 1.2*  
*Last Updated: 2025-07-31*  
*Author: Business Analyst Team*  
*Status: Approved for Implementation*  

## Revision History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2025-07-31 | Initial document with performance optimization strategies | BA Team |
| 1.1 | 2025-07-31 | Added comprehensive handling for unrealistic user requests, request validation, progressive generation, and smart suggestions | BA Team |
| 1.2 | 2025-07-31 | Simplified approach using LLM-based intent detection and configurable 100 card limit via AI_MAX_CARDS_PER_GENERATION env variable | BA Team |