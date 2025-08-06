# Card Detail Display Requirements

## Executive Summary

This document outlines requirements for enhancing the card detail display in the Anki application to show spaced repetition metadata including card state, interval, and due date. This enhancement will provide users with better visibility into their learning progress and help them make informed decisions about card management.

## Business Context and Problem Statement

### Current State
Currently, the cards listing page shows basic card information:
- Card type (Basic/Cloze)
- Front/Back content preview
- Tags
- Basic state indicator

### Problem
Users lack visibility into critical spaced repetition data that affects their learning experience:
- They cannot see when cards are due for review
- The interval between reviews is not visible
- The current learning state is not prominently displayed
- No insight into card difficulty or learning history

### Business Impact
- Users cannot effectively prioritize their study sessions
- Difficulty in identifying cards that need attention
- Reduced trust in the spaced repetition algorithm
- Limited ability to manage their learning progress

## Stakeholder Analysis

### Primary Stakeholders
- **Learners/Students**: Need transparency in their learning progress
- **Power Users**: Want detailed insights for optimizing their study patterns
- **Content Creators**: Need to understand how their cards perform

### Secondary Stakeholders
- **Development Team**: Will implement the features
- **Support Team**: Will handle user questions about card states

## Functional Requirements

### FR1: Display Card State Information
**Description**: Show the current state of each card prominently
**Acceptance Criteria**:
- Display state as a colored badge (NEW, LEARNING, REVIEW, SUSPENDED)
- Use consistent color coding:
  - NEW: Blue (#3B82F6)
  - LEARNING: Yellow (#F59E0B)
  - REVIEW: Green (#10B981)
  - SUSPENDED: Gray (#6B7280)
- State should be visible on both list and detail views

### FR2: Show Interval Information
**Description**: Display the current interval between reviews
**Acceptance Criteria**:
- Show interval in human-readable format (e.g., "1 day", "3 days", "2 weeks")
- Display "New card" for cards with 0 interval
- Format intervals intelligently:
  - < 1 day: Show in hours
  - 1-30 days: Show in days
  - > 30 days: Show in weeks/months

### FR3: Display Due Date
**Description**: Show when the card is due for review
**Acceptance Criteria**:
- Show absolute date for future reviews (e.g., "Dec 25, 2025")
- Show relative time for imminent reviews:
  - "Due now" for overdue cards (highlight in red)
  - "Due today" for cards due within 24 hours
  - "Due tomorrow" for next day
  - Standard date format for others
- Include time if due today (e.g., "Due at 3:00 PM")

### FR4: Card Statistics Summary
**Description**: Provide a summary of card performance
**Acceptance Criteria**:
- Display total review count
- Show success rate (percentage of Good/Easy ratings)
- Display average response time
- Show lapses count
- Present easiness factor as difficulty indicator:
  - Easy (EF > 2.5): Green indicator
  - Normal (EF 2.0-2.5): Yellow indicator
  - Hard (EF < 2.0): Red indicator

### FR5: Enhanced Card Detail View
**Description**: Create a dedicated card detail modal/page
**Acceptance Criteria**:
- Accessible via click on card or dedicated button
- Show all card content without truncation
- Display full spaced repetition metadata
- Include review history timeline
- Show last 10 reviews with ratings
- Allow quick actions (Edit, Suspend, Reset)

### FR6: Sorting and Filtering by SR Data
**Description**: Enable sorting and filtering by spaced repetition metrics
**Acceptance Criteria**:
- Add sort options:
  - By due date (ascending/descending)
  - By interval length
  - By difficulty (easiness factor)
  - By review count
- Add filter options:
  - By state (multi-select)
  - Due today/overdue
  - By interval range
  - By difficulty level

## Non-Functional Requirements

### NFR1: Performance
- Card list should load within 2 seconds for up to 1000 cards
- Sorting/filtering should respond within 500ms
- No performance degradation when displaying SR data

### NFR2: Usability
- Information should be scannable at a glance
- Mobile-responsive design for all displays
- Consistent iconography and color coding
- Tooltips for technical terms (e.g., "Easiness Factor")

### NFR3: Accessibility
- All color indicators must have text/icon alternatives
- Screen reader compatible
- Keyboard navigation support
- WCAG 2.1 AA compliance

### NFR4: Data Accuracy
- Real-time synchronization of card states
- Accurate calculation of due dates across timezones
- Consistent state across all views

## Assumptions and Constraints

### Assumptions
- Users have basic understanding of spaced repetition
- Card states are already being tracked in the database
- The existing SuperMemo2Algorithm is correctly implemented
- Users want more transparency in the learning algorithm

### Constraints
- Must work within existing UI framework (shadcn/ui)
- Cannot break existing API contracts
- Must maintain backward compatibility
- Limited screen space on mobile devices

## Success Metrics

### Quantitative Metrics
- 20% increase in daily active users
- 15% increase in average study session duration
- 25% reduction in support tickets about "missing" cards
- 30% increase in cards reviewed per session

### Qualitative Metrics
- Improved user satisfaction scores
- Positive feedback on algorithm transparency
- Reduced confusion about card scheduling
- Increased trust in the system

## Implementation Considerations

### Technical Approach
1. **API Enhancement**:
   - Ensure card queries include CardState data
   - Add computed fields for human-readable formats
   - Implement efficient sorting/filtering at database level

2. **UI Components**:
   - Create reusable CardStateIndicator component
   - Build IntervalDisplay component with smart formatting
   - Develop DueDateBadge with relative time logic
   - Design CardDetailModal with comprehensive view

3. **Performance Optimization**:
   - Implement virtual scrolling for large card lists
   - Use memoization for expensive calculations
   - Add indexes for common sort fields
   - Cache computed values where appropriate

### Migration Strategy
- Gradual rollout with feature flag
- A/B testing for UI variations
- User education through tooltips and help content
- Feedback collection mechanism

### Future Enhancements
- Predictive analytics for learning outcomes
- Batch operations on filtered cards
- Export functionality for SR data
- Integration with calendar apps for due dates
- Customizable dashboard widgets
- Learning streak tracking

## Risk Assessment

### Technical Risks
- Performance impact of additional data display
- Complexity of timezone handling for due dates
- Data consistency across concurrent sessions

### User Experience Risks
- Information overload for new users
- Confusion about technical terminology
- Mobile layout constraints

### Mitigation Strategies
- Progressive disclosure of advanced information
- Comprehensive user onboarding
- Performance testing with large datasets
- Responsive design testing across devices

## Dependencies
- CardState model must be properly populated
- Timezone handling utilities required
- Date formatting libraries needed
- Icon library for visual indicators

## Timeline Estimate
- Phase 1 (Basic Display): 1 week
- Phase 2 (Detail View): 1 week
- Phase 3 (Sorting/Filtering): 1 week
- Phase 4 (Testing & Polish): 1 week
- Total: 4 weeks

## Appendix

### Mockup References
- Card list with SR data display
- Card detail modal design
- Mobile responsive layouts
- Filter/sort interface design

### Technical Specifications
- Database schema already includes required fields
- API endpoints need enhancement for computed fields
- Frontend components need creation/modification
- State management considerations for real-time updates