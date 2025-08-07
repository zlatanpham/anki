# Deck Card Statistics Requirements

## Executive Summary

This document outlines the requirements for enhancing the deck card component in the Anki-style spaced repetition application by adding comprehensive statistics display. The primary goal is to provide users with immediate visibility into their review workload and learning progress directly from the deck list view, enabling better study planning and motivation.

## Business Context and Problem Statement

### Current State
- Users can view basic deck information: name, description, total card count, and last updated time
- To understand review requirements, users must navigate into each deck individually
- No immediate visibility of learning progress or review urgency from the deck list

### Business Problem
- Users lack quick visibility into which decks need attention
- Difficulty prioritizing study sessions across multiple decks
- No motivational indicators showing progress or pending work
- Inefficient workflow requiring multiple clicks to assess study needs

### Opportunity
By displaying key statistics directly on deck cards, we can:
- Reduce cognitive load in study planning
- Increase user engagement through visible progress indicators
- Improve study efficiency by highlighting decks requiring attention
- Provide motivational feedback through achievement metrics

## Stakeholder Analysis

### Primary Stakeholders
- **Learners/Students**: Need quick overview of study requirements and progress
- **Power Users**: Managing multiple decks, require efficient prioritization
- **Mobile Users**: Limited screen space, need essential information only

### Secondary Stakeholders
- **Content Creators**: Want to see engagement metrics for their public decks
- **Organization Admins**: Need overview of learning activity

## Functional Requirements

### FR1: Due Cards Display
**Priority**: High

Display the number of cards due for review prominently on each deck card.

**Acceptance Criteria**:
- Show total due cards count with clear visual indicator
- Update in real-time as user completes reviews
- Display "0 due" when no cards are pending
- Use color coding: red for overdue, orange for due today, green for up-to-date

### FR2: Card State Breakdown
**Priority**: High

Show breakdown of cards by learning state.

**Acceptance Criteria**:
- Display counts for: New, Learning, Review cards
- Use consistent iconography across the application
- Show only non-zero values to reduce clutter
- Provide tooltips explaining each state on hover/tap

### FR3: Today's Review Statistics
**Priority**: Medium

Display today's review activity for each deck.

**Acceptance Criteria**:
- Show "Reviewed today: X cards" when applicable
- Include success rate percentage for today's reviews
- Reset at midnight user's local time
- Hide when no reviews completed today

### FR4: Learning Streak Indicator
**Priority**: Medium

Show consecutive days of study for motivation.

**Acceptance Criteria**:
- Display current streak in days
- Show flame icon or similar visual indicator
- Include "best streak" as secondary metric
- Hide for new decks with no review history

### FR5: Next Review Forecast
**Priority**: Low

Provide visibility into upcoming review load.

**Acceptance Criteria**:
- Show "Tomorrow: X cards" for next day's forecast
- Display "This week: X cards" for weekly overview
- Use subtle styling to avoid overwhelming primary metrics
- Available via hover/tap interaction on mobile

### FR6: Retention Rate Display
**Priority**: Medium

Show overall performance metrics.

**Acceptance Criteria**:
- Calculate and display average retention rate
- Show as percentage with appropriate coloring
- Based on last 30 days of reviews
- Include trend indicator (improving/declining)

### FR7: Study Time Estimation
**Priority**: Low

Estimate time needed for pending reviews.

**Acceptance Criteria**:
- Calculate based on average review time per card
- Display as "~X minutes" for due cards
- Update based on user's historical performance
- Show only when meaningful (>5 cards due)

## Non-Functional Requirements

### NFR1: Performance
- Statistics must load within 100ms of deck list display
- Use efficient database queries with proper indexing
- Implement caching for calculated metrics
- Batch API calls for multiple decks

### NFR2: Responsiveness
- Adapt layout for mobile devices (320px minimum width)
- Prioritize essential statistics on small screens
- Use progressive disclosure for detailed metrics
- Ensure touch targets meet accessibility standards (44x44px)

### NFR3: Visual Design
- Maintain visual hierarchy with existing card design
- Use consistent color scheme and iconography
- Ensure statistics don't overwhelm deck information
- Support both light and dark themes

### NFR4: Accessibility
- Provide screen reader descriptions for all statistics
- Ensure color coding has alternative indicators
- Meet WCAG 2.1 AA compliance standards
- Support keyboard navigation for all interactions

### NFR5: Scalability
- Handle users with 100+ decks efficiently
- Support decks with 10,000+ cards
- Optimize for users with high review volumes
- Cache calculations where appropriate

## Data Requirements

### Required Data Points
1. **Per User Per Deck**:
   - Due cards count (real-time)
   - Card state distribution (NEW, LEARNING, REVIEW, SUSPENDED)
   - Today's review count and performance
   - Average review time per card
   - Retention rate (30-day rolling)
   - Study streak data

2. **Calculated Metrics**:
   - Time estimation based on historical data
   - Forecast calculations for future reviews
   - Trend analysis for retention rates

### API Modifications
- Extend `deck.getAll` to include statistics optionally
- Add `deck.getQuickStats` for lightweight statistics
- Implement efficient batch statistics endpoint
- Add caching layer for expensive calculations

## UI/UX Considerations

### Desktop Layout
```
[Deck Card]
├── Header (existing)
│   ├── Deck Name
│   ├── Description
│   └── Options Menu
├── Statistics Section (new)
│   ├── Primary Row
│   │   ├── Due Cards Badge (prominent)
│   │   └── Cards Breakdown (New/Learning/Review)
│   ├── Secondary Row
│   │   ├── Today's Activity
│   │   └── Retention Rate
│   └── Tertiary Row (on hover)
│       ├── Study Streak
│       └── Time Estimate
└── Actions (existing)
    └── Study Button
```

### Mobile Layout
```
[Deck Card - Compact]
├── Header
│   ├── Deck Name
│   └── Due Count Badge (top-right)
├── Statistics Row
│   ├── Cards Icons with Counts
│   └── Today's Progress
└── Study Button (full width)
```

### Visual Indicators
- **Due Cards Badge**: 
  - Red background: Overdue cards exist
  - Orange background: Cards due today
  - Gray background: No cards due
  - Number in white text

- **Progress Indicators**:
  - Green checkmark: Today's target met
  - Progress bar: Completion percentage
  - Flame icon: Active streak

## Implementation Considerations

### Performance Optimization
1. **Database Indexes**:
   - Add composite index on (user_id, deck_id, due_date)
   - Index on (user_id, deck_id, state)
   - Index on (user_id, reviewed_at) for activity queries

2. **Caching Strategy**:
   - Cache statistics for 5 minutes
   - Invalidate on card review completion
   - Use Redis for multi-user environments
   - Implement stale-while-revalidate pattern

3. **Query Optimization**:
   - Single query with multiple aggregations
   - Use database views for complex calculations
   - Implement pagination for large deck lists

### Progressive Enhancement
1. **Phase 1**: Due cards count only
2. **Phase 2**: Add card state breakdown
3. **Phase 3**: Include activity metrics
4. **Phase 4**: Advanced features (forecasts, trends)

## Success Metrics

### Quantitative Metrics
- Reduction in navigation depth to start studying (target: 50%)
- Increase in daily active users (target: 20%)
- Improvement in review completion rate (target: 15%)
- Decrease in overdue cards across user base (target: 30%)

### Qualitative Metrics
- User satisfaction with deck overview
- Perceived ease of study planning
- Motivation impact from visible progress
- Feature adoption rate

## Assumptions and Constraints

### Assumptions
- Users want quick visibility without information overload
- Performance is critical for user experience
- Mobile usage is significant (>40% of users)
- Users understand spaced repetition concepts

### Constraints
- Must maintain backward compatibility
- Cannot significantly increase page load time
- Must work within existing design system
- Limited screen real estate on mobile devices

## Risks and Mitigation

### Risk 1: Performance Degradation
**Mitigation**: Implement comprehensive caching, use database materialized views, provide option to disable statistics

### Risk 2: Information Overload
**Mitigation**: Use progressive disclosure, provide customization options, conduct user testing for optimal default view

### Risk 3: Mobile Experience Degradation
**Mitigation**: Design mobile-first, use adaptive layouts, prioritize essential metrics for small screens

## Future Enhancements

1. **Customizable Statistics**: Allow users to choose which metrics to display
2. **Comparative Analytics**: Show performance relative to other users
3. **Goal Setting**: Allow users to set daily review targets
4. **Export Capabilities**: Enable statistics export for external analysis
5. **Gamification Elements**: Add achievements based on statistics
6. **Smart Notifications**: Alert users when specific thresholds are met

## Appendices

### A. Mock API Response Structure
```typescript
interface DeckWithStats extends Deck {
  stats: {
    due: number;
    new: number;
    learning: number;
    review: number;
    suspended: number;
    reviewedToday: number;
    retentionRate: number;
    currentStreak: number;
    estimatedMinutes: number;
    forecast: {
      tomorrow: number;
      week: number;
    };
  };
}
```

### B. Database Query Example
```sql
SELECT 
  d.id,
  COUNT(CASE WHEN cs.due_date <= NOW() AND cs.state != 'SUSPENDED' THEN 1 END) as due,
  COUNT(CASE WHEN cs.state = 'NEW' THEN 1 END) as new,
  COUNT(CASE WHEN cs.state = 'LEARNING' THEN 1 END) as learning,
  COUNT(CASE WHEN cs.state = 'REVIEW' THEN 1 END) as review,
  COUNT(CASE WHEN cs.state = 'SUSPENDED' THEN 1 END) as suspended
FROM decks d
LEFT JOIN cards c ON c.deck_id = d.id
LEFT JOIN card_states cs ON cs.card_id = c.id AND cs.user_id = ?
WHERE d.user_id = ? OR d.is_public = true
GROUP BY d.id;
```