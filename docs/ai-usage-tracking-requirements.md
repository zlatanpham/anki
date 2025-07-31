# AI Usage Tracking & User Onboarding Requirements

## Executive Summary

This document outlines requirements for implementing comprehensive AI usage tracking and intelligent user onboarding based on usage patterns in the Anki application. The goal is to capture detailed metrics for every LLM API call, store them for analytics, and use these insights to create personalized onboarding experiences.

## 1. Current State Analysis

### Existing Implementation
- **AI Provider**: Google Gemini (gemini-1.5-flash) via Vercel AI SDK
- **Current Features**: Card generation, cloze suggestions, grammar checking
- **Basic Tracking**: Simple token estimation (text.length/4) in AIGeneration table
- **Missing**: Actual token counts, cost tracking, detailed analytics

### Key Gaps
1. No capture of actual input/output tokens from API responses
2. No cost calculation or tracking
3. Limited analytics capabilities
4. No usage-based user segmentation
5. No onboarding personalization based on AI usage

## 2. Functional Requirements

### 2.1 LLM Usage Tracking

#### Data Capture Requirements
- **Input Tokens**: Exact count from API response
- **Output Tokens**: Exact count from API response
- **Model Used**: Full model identifier (e.g., "gemini-1.5-flash-latest")
- **Cost Calculation**: Based on current pricing model
- **Request Metadata**:
  - Timestamp (UTC)
  - User ID
  - Organization ID
  - Feature/Purpose (e.g., "card_generation", "grammar_check")
  - Request duration (ms)
  - Success/Error status
  - Error details (if failed)

#### API Response Parsing
```typescript
interface AIUsageMetrics {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  model: string;
  cost: {
    input: number;
    output: number;
    total: number;
    currency: string;
  };
  latencyMs: number;
  cached?: boolean;
}
```

### 2.2 Data Storage Schema

#### New Database Tables

**AIUsageLog**
```prisma
model AIUsageLog {
  id            String   @id @default(cuid())
  userId        String
  organizationId String
  feature       String   // card_generation, grammar_check, etc.
  model         String
  inputTokens   Int
  outputTokens  Int
  totalTokens   Int
  inputCost     Decimal  @db.Decimal(10, 6)
  outputCost    Decimal  @db.Decimal(10, 6)
  totalCost     Decimal  @db.Decimal(10, 6)
  currency      String   @default("USD")
  latencyMs     Int
  status        String   // success, error, timeout
  errorMessage  String?
  metadata      Json?    // Additional context
  createdAt     DateTime @default(now())
  
  user          User     @relation(fields: [userId], references: [id])
  organization  Organization @relation(fields: [organizationId], references: [id])
  
  @@index([userId, createdAt])
  @@index([organizationId, createdAt])
  @@index([feature, createdAt])
}
```

**AIUserQuota**
```prisma
model AIUserQuota {
  id            String   @id @default(cuid())
  userId        String   @unique
  monthlyLimit  Int      @default(1000) // tokens
  currentUsage  Int      @default(0)
  resetDate     DateTime
  tier          String   @default("free") // free, pro, enterprise
  
  user          User     @relation(fields: [userId], references: [id])
}
```

**AIUsageAnalytics**
```prisma
model AIUsageAnalytics {
  id            String   @id @default(cuid())
  userId        String
  period        String   // daily, weekly, monthly
  periodStart   DateTime
  periodEnd     DateTime
  totalRequests Int
  totalTokens   Int
  totalCost     Decimal  @db.Decimal(10, 6)
  avgLatencyMs  Int
  successRate   Decimal  @db.Decimal(5, 2)
  topFeatures   Json     // {feature: count}
  
  user          User     @relation(fields: [userId], references: [id])
  
  @@unique([userId, period, periodStart])
  @@index([userId, periodStart])
}
```

### 2.3 Cost Calculation Service

#### Pricing Configuration
```typescript
interface PricingModel {
  provider: 'gemini' | 'openai' | 'anthropic';
  model: string;
  inputPricePer1k: number;
  outputPricePer1k: number;
  currency: string;
  effectiveDate: Date;
}

// Example Gemini Pricing
const geminiPricing: PricingModel = {
  provider: 'gemini',
  model: 'gemini-1.5-flash',
  inputPricePer1k: 0.00025,  // $0.25 per 1M tokens
  outputPricePer1k: 0.00125, // $1.25 per 1M tokens
  currency: 'USD',
  effectiveDate: new Date('2024-01-01')
};
```

### 2.4 Usage Analytics Dashboard

#### Key Metrics
1. **Real-time Metrics**
   - Current month usage (tokens & cost)
   - Today's usage
   - Active features
   - Success rate

2. **Historical Analytics**
   - Usage trends (daily/weekly/monthly)
   - Cost breakdown by feature
   - Average tokens per request
   - Peak usage times

3. **Feature Analytics**
   - Most used AI features
   - Average tokens by feature
   - Success rate by feature
   - User satisfaction (if feedback collected)

### 2.5 User Onboarding System

#### User Segmentation Based on AI Usage
```typescript
enum UserSegment {
  AI_POWER_USER = 'ai_power_user',        // >100 AI calls/week
  REGULAR_AI_USER = 'regular_ai_user',    // 10-100 AI calls/week
  LIGHT_AI_USER = 'light_ai_user',        // 1-10 AI calls/week
  NON_AI_USER = 'non_ai_user',            // 0 AI calls
  NEW_USER = 'new_user'                   // <7 days old
}
```

#### Onboarding Flows by Segment

**New Users**
1. Welcome tour highlighting AI features
2. Interactive demo: Generate first AI card
3. Show AI cost savings (time saved)
4. Set up first AI-powered deck

**Non-AI Users**
1. "Discover AI Features" prompt after 10 manual cards
2. Side-by-side comparison: Manual vs AI card creation
3. Free AI credits offer
4. Success stories from similar users

**Light AI Users**
1. Tips for better AI prompts
2. Showcase advanced AI features
3. Weekly AI feature spotlight
4. Gamification: AI usage streaks

**Regular AI Users**
1. Advanced prompt templates
2. Bulk AI operations tutorial
3. Custom AI workflow builder
4. Beta access to new AI features

**AI Power Users**
1. API access documentation
2. Custom model selection
3. Priority support
4. Usage analytics access

## 3. Technical Implementation

### 3.1 Middleware for Token Tracking
```typescript
// middleware/aiUsageTracker.ts
export async function trackAIUsage(
  request: AIRequest,
  response: AIResponse,
  userId: string,
  feature: string
) {
  const usage = extractUsageMetrics(response);
  const cost = calculateCost(usage, getPricingModel(usage.model));
  
  await db.aiUsageLog.create({
    data: {
      userId,
      feature,
      ...usage,
      ...cost,
      metadata: {
        prompt: request.prompt.substring(0, 100), // First 100 chars
        temperature: request.temperature,
        maxTokens: request.maxTokens
      }
    }
  });
  
  // Update user quota
  await updateUserQuota(userId, usage.totalTokens);
  
  // Trigger analytics aggregation (async)
  await queueAnalyticsUpdate(userId);
}
```

### 3.2 Analytics Aggregation Service
- Run hourly for real-time metrics
- Daily aggregation at 00:00 UTC
- Weekly aggregation every Sunday
- Monthly aggregation on 1st of month

### 3.3 Onboarding Trigger Service
```typescript
interface OnboardingTrigger {
  checkUserSegment(userId: string): Promise<UserSegment>;
  getOnboardingFlow(segment: UserSegment): OnboardingFlow;
  trackOnboardingProgress(userId: string, step: string): Promise<void>;
  shouldShowOnboarding(userId: string): Promise<boolean>;
}
```

## 4. Non-Functional Requirements

### 4.1 Performance
- Token tracking overhead: <10ms per request
- Analytics query response: <500ms for 30-day range
- Real-time dashboard update: <2 seconds
- Onboarding flow load: <1 second

### 4.2 Scalability
- Support 100,000+ AI requests/day
- Handle 10,000+ concurrent users
- Store 90 days of raw usage data
- Archive older data to cold storage

### 4.3 Security & Privacy
- Encrypt sensitive prompts in metadata
- PII removal from stored prompts
- Role-based access to analytics
- GDPR compliance for data retention

### 4.4 Reliability
- 99.9% uptime for tracking service
- Graceful degradation if tracking fails
- Queue-based processing for analytics
- Automatic retry for failed API calls

## 5. Success Metrics

### 5.1 Technical Metrics
- Token tracking accuracy: ±5% of actual
- Cost calculation accuracy: ±1% of actual
- Analytics processing latency: <5 minutes
- Data loss rate: <0.01%

### 5.2 Business Metrics
- AI feature adoption: >60% of active users
- Onboarding completion: >80% 
- Time to first AI generation: <5 minutes
- User retention (AI users): >80% after 7 days
- Average AI usage growth: >20% month-over-month

### 5.3 User Experience Metrics
- Onboarding NPS: >50
- AI feature satisfaction: >4.5/5
- Support tickets related to AI: <5%
- Feature discovery rate: >70%

## 6. Implementation Phases

### Phase 1: Core Tracking (Week 1-2)
- Implement token capture from API responses
- Create database schema
- Build cost calculation service
- Basic logging implementation

### Phase 2: Analytics Foundation (Week 3-4)
- Aggregation service
- Basic analytics API
- Simple usage dashboard
- Quota management

### Phase 3: Advanced Analytics (Week 5-6)
- Detailed analytics dashboard
- Export capabilities
- Alerts and notifications
- Performance optimization

### Phase 4: Onboarding System (Week 7-8)
- User segmentation service
- Onboarding flow builder
- A/B testing framework
- Progress tracking

### Phase 5: Optimization (Week 9-10)
- Machine learning for usage prediction
- Personalized recommendations
- Advanced cost optimization
- Integration with billing system

## 7. Future Enhancements

1. **Multi-Model Support**
   - Compare costs across providers
   - Automatic model selection based on task
   - Fallback to cheaper models

2. **Advanced Analytics**
   - Predictive usage modeling
   - Anomaly detection
   - Cost optimization recommendations

3. **Enterprise Features**
   - Department-level quotas
   - Approval workflows for high-cost operations
   - Custom pricing models
   - SLA monitoring

4. **AI Optimization**
   - Prompt optimization suggestions
   - Response caching
   - Batch processing for bulk operations

## 8. Risks and Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| API changes token format | High | Medium | Abstract token extraction, version API clients |
| Storage costs exceed budget | Medium | Low | Implement data retention policies, use compression |
| Tracking affects performance | High | Low | Async processing, sampling for high-volume users |
| Inaccurate cost calculation | Medium | Medium | Regular pricing updates, reconciliation reports |

## 9. Dependencies

1. **External**
   - AI provider API documentation
   - Pricing API or manual updates
   - Analytics visualization library

2. **Internal**
   - Database migration tools
   - Authentication system
   - Existing user management
   - Billing system (future)

## 10. Acceptance Criteria

1. **Token Tracking**
   - [ ] Captures exact tokens from API response
   - [ ] Stores all required metadata
   - [ ] Calculates cost within 1% accuracy
   - [ ] Updates user quota in real-time

2. **Analytics**
   - [ ] Shows usage trends for multiple periods
   - [ ] Exports data in CSV/JSON format
   - [ ] Refreshes within 2 seconds
   - [ ] Handles 10K+ records efficiently

3. **Onboarding**
   - [ ] Correctly segments users
   - [ ] Shows relevant onboarding flow
   - [ ] Tracks progress through steps
   - [ ] Increases AI adoption by 20%+

---

*Document Version: 1.0*  
*Last Updated: 2025-01-31*  
*Author: Business Analyst*  
*Status: Draft - Pending Review*