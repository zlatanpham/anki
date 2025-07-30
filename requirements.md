# Web-Based Anki Flashcard Application - Requirements & Development Plan

## Executive Summary

This document outlines the requirements and development plan for building a web-based Anki flashcard application. The goal is to create a modern, responsive spaced repetition learning system that captures Anki's core functionality while providing superior web user experience.

## Project Overview

### Core Concept
A full-stack web application that implements the SuperMemo 2 spaced repetition algorithm for optimized learning retention, featuring intuitive deck and card management with cross-device accessibility.

### Target Users
- Students preparing for exams
- Language learners
- Professionals studying for certifications
- Lifelong learners and knowledge workers

## Technical Requirements

### Database Schema Design

#### Core Entities
```sql
-- Decks: Card collections organized by subject/topic
Deck {
  id: UUID (primary key)
  user_id: UUID (foreign key to User)
  organization_id: UUID (foreign key to Organization, nullable)
  name: String (required)
  description: Text (optional)
  is_public: Boolean (default: false)
  created_at: DateTime
  updated_at: DateTime
  settings: JSON (deck-specific configuration)
}

-- Cards: Individual flashcard items
Card {
  id: UUID (primary key)
  deck_id: UUID (foreign key to Deck)
  card_type: Enum ['basic', 'cloze'] (required)
  front: Text (question/prompt)
  back: Text (answer/content)
  cloze_text: Text (for cloze deletion cards)
  tags: String[] (optional)
  created_at: DateTime
  updated_at: DateTime
  note_id: UUID (for grouped cards, optional)
}

-- Reviews: Historical record of all study sessions
Review {
  id: UUID (primary key)
  card_id: UUID (foreign key to Card)
  user_id: UUID (foreign key to User)
  rating: Enum ['again', 'hard', 'good', 'easy'] (required)
  response_time: Integer (milliseconds)
  reviewed_at: DateTime (required)
  previous_interval: Integer (days)
  new_interval: Integer (days)
  easiness_factor: Float
}

-- CardStates: Current learning state per user-card pair
CardState {
  id: UUID (primary key)
  card_id: UUID (foreign key to Card)
  user_id: UUID (foreign key to User)
  state: Enum ['new', 'learning', 'review', 'suspended'] (required)
  due_date: DateTime (required)
  interval: Integer (days, default: 0)
  repetitions: Integer (default: 0)
  easiness_factor: Float (default: 2.5)
  lapses: Integer (default: 0)
  last_reviewed: DateTime (nullable)
  created_at: DateTime
  updated_at: DateTime
}
```

### Backend API Requirements

#### tRPC Router Structure
```typescript
// src/server/api/routers/deck.ts
- getDecksByUser(): Deck[]
- createDeck(input: CreateDeckInput): Deck
- updateDeck(input: UpdateDeckInput): Deck
- deleteDeck(input: { id: string }): boolean
- getDeckStats(input: { id: string }): DeckStats

// src/server/api/routers/card.ts
- getCardsByDeck(input: { deckId: string }): Card[]
- createCard(input: CreateCardInput): Card
- updateCard(input: UpdateCardInput): Card
- deleteCard(input: { id: string }): boolean
- searchCards(input: SearchInput): Card[]

// src/server/api/routers/study.ts
- getReviewQueue(input: { deckId?: string }): Card[]
- submitReview(input: ReviewInput): CardState
- getStudyStats(input: { period: string }): StudyStats
- getDueCardsCount(): number

// src/server/api/routers/import.ts
- importDeck(input: { file: File }): ImportResult
- exportDeck(input: { deckId: string }): ExportResult
```

#### Core Services
```typescript
// src/server/services/spacedRepetition.ts
- SuperMemo2Algorithm class
- calculateNextReview(rating, currentState): CardState
- scheduleNewCard(): CardState
- handleLapse(currentState): CardState

// src/server/services/deckImport.ts
- parseJsonFile(file: Buffer): DeckData
- convertToInternalFormat(jsonData): Deck & Card[]
- validateImportData(data): ValidationResult
```

### Frontend Component Architecture

#### Core Components
```typescript
// Study Interface
- StudySession: Main study component with card display and controls
- CardDisplay: Renders card content (basic/cloze types)
- AnswerButtons: Rating buttons (Again, Hard, Good, Easy)
- StudyProgress: Shows session progress and stats

// Deck Management
- DeckBrowser: Grid/list view of user decks
- DeckEditor: Create/edit deck metadata and settings
- DeckStats: Statistics and performance metrics per deck

// Card Management
- CardBrowser: Searchable list of cards in a deck
- CardEditor: Rich text editor for card creation/editing
- ClozeEditor: Specialized editor for cloze deletion cards

// Import/Export
- ImportWizard: File upload and deck import flow
- ExportOptions: Deck export format selection

// Statistics
- StatsDashboard: Learning progress visualization
- PerformanceCharts: Charts showing review accuracy and retention
```

## Feature Specifications

### Phase 1: Core MVP (4-6 weeks)

#### 1. Database Schema Implementation
- **Priority:** High
- **Tasks:**
  - Create Prisma schema for decks, cards, reviews, and card states
  - Run database migrations
  - Set up database relationships and constraints
  - Create seed data for testing

#### 2. SuperMemo 2 Algorithm Implementation
- **Priority:** High
- **Tasks:**
  - Implement core spaced repetition calculations
  - Handle new card scheduling
  - Process review ratings and update intervals
  - Manage card state transitions (new → learning → review)

#### 3. Basic Study Interface
- **Priority:** High
- **Tasks:**
  - Create study session component
  - Implement card display for basic cards
  - Add answer rating buttons (Again, Hard, Good, Easy)
  - Show study progress and remaining cards

#### 4. Deck and Card Management
- **Priority:** High
- **Tasks:**
  - Build deck creation and editing forms
  - Implement card creation and editing interface
  - Create deck browser with basic filtering
  - Add card browser within decks

### Phase 2: Enhanced UX (3-4 weeks)

#### 5. Advanced Card Types
- **Priority:** Medium
- **Tasks:**
  - Implement cloze deletion card creation
  - Build cloze deletion study interface
  - Add rich text editing capabilities
  - Support basic formatting (bold, italic, code)

#### 6. Import/Export Functionality
- **Priority:** Medium
- **Tasks:**
  - Build JSON file parser for deck imports
  - Create deck import wizard
  - Implement deck export to JSON format
  - Add import validation and error handling

#### 7. Statistics and Progress Tracking
- **Priority:** Medium
- **Tasks:**
  - Create statistics dashboard
  - Implement learning progress visualization
  - Add performance metrics (accuracy, retention rate)
  - Build study streak tracking

#### 8. Mobile Optimization
- **Priority:** Medium
- **Tasks:**
  - Optimize study interface for mobile devices
  - Implement touch-friendly controls
  - Add responsive design for all components
  - Test cross-device functionality

### Phase 3: Polish & Performance (2-3 weeks)

#### 9. Search and Filtering
- **Priority:** Medium
- **Tasks:**
  - Implement full-text search across cards
  - Add tag-based filtering
  - Create advanced search options
  - Build saved search functionality

#### 10. Performance Optimization
- **Priority:** High
- **Tasks:**
  - Optimize database queries for large card collections
  - Implement pagination for card lists
  - Add client-side caching strategies
  - Performance testing and optimization

#### 11. Comprehensive Testing
- **Priority:** High
- **Tasks:**
  - Unit tests for spaced repetition algorithm
  - Integration tests for study workflows
  - End-to-end testing for critical user paths
  - Performance and load testing

#### 12. Future Sync Preparation
- **Priority:** Low
- **Tasks:**
  - Design API structure for sync functionality
  - Implement conflict resolution strategies
  - Prepare data versioning system
  - Create sync state management

## Technical Architecture

### Existing Infrastructure Utilization
- **Framework:** Next.js 15 with React 19 and TypeScript
- **Database:** PostgreSQL with Prisma ORM
- **API:** tRPC for type-safe API layer
- **Authentication:** NextAuth.js (already implemented)
- **UI:** Tailwind CSS with shadcn/ui components
- **Multi-tenancy:** Organization-based isolation

### Key Technical Decisions

#### Spaced Repetition Algorithm
- **Choice:** SuperMemo 2 algorithm
- **Rationale:** Well-tested, widely adopted, mathematically sound
- **Implementation:** Server-side calculation to ensure consistency

#### Data Storage Strategy
- **Review History:** Complete audit trail of all study sessions
- **Card States:** Current learning state per user-card combination
- **Performance:** Indexed queries on due_date and user_id

#### Import/Export Format
- **Primary:** JSON format for data portability and ease of implementation
- **Future consideration:** Anki .apkg format for compatibility with existing Anki users
- **Consideration:** Media file handling for images/audio

## Success Metrics

### Learning Effectiveness
- **Retention Rate:** Percentage of cards remembered after intervals
- **Study Efficiency:** Time spent per card vs. retention improvement
- **User Engagement:** Daily/weekly active users and session length

### Technical Performance
- **Response Time:** <200ms for study session actions
- **Reliability:** 99.9% uptime for study sessions
- **Scalability:** Handle 10,000+ cards per user efficiently

### User Experience
- **Onboarding:** Time to complete first study session <5 minutes
- **Mobile Usage:** 60%+ of study sessions on mobile devices
- **User Retention:** 70% weekly retention after first month

## Risk Assessment

### High-Risk Areas
1. **Algorithm Accuracy:** Incorrect spaced repetition implementation could harm learning
2. **Data Migration:** Complex .apkg import process with edge cases
3. **Performance:** Large card collections causing slow study sessions
4. **Mobile UX:** Study interface must work seamlessly on small screens

### Mitigation Strategies
1. **Extensive Testing:** Comprehensive algorithm validation against known Anki behavior
2. **Gradual Rollout:** Beta testing with power users before public release
3. **Performance Monitoring:** Real-time metrics and optimization based on usage patterns
4. **User Feedback:** Regular user testing sessions during development

## Development Timeline

### Weeks 1-2: Foundation
- Database schema implementation
- Basic tRPC routers setup
- Core spaced repetition algorithm

### Weeks 3-4: Core Features
- Study interface development
- Deck and card management
- Basic user workflows

### Weeks 5-6: MVP Completion
- Integration testing
- Bug fixes and polish
- Performance optimization

### Weeks 7-9: Enhanced Features
- Import/export functionality
- Statistics dashboard
- Mobile optimization

### Weeks 10-12: Launch Preparation
- Comprehensive testing
- Documentation
- Production deployment preparation

## Conclusion

This requirements document provides a comprehensive roadmap for building a competitive web-based Anki flashcard application. The phased approach ensures rapid delivery of core value while maintaining high quality standards. The existing Next.js infrastructure provides an excellent foundation for rapid development and scaling.

The focus on the SuperMemo 2 algorithm and intuitive user experience will differentiate this application in the crowded flashcard market while serving the genuine learning needs of students and professionals worldwide.