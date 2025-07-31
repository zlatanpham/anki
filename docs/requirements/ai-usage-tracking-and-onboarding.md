# Business Requirements Document: AI Usage Tracking and User Onboarding System

## Executive Summary

This document outlines comprehensive business requirements for implementing an AI usage tracking system and developing a data-driven user onboarding system for the Anki application. The system will track LLM (Large Language Model) usage metrics, store analytics data, and leverage insights to create an intelligent onboarding experience.

## Current State Analysis

### Existing AI Implementation

The application currently has a functional AI system with the following characteristics:

1. **AI Service Architecture**
   - Uses Google Gemini API (model: `gemini-2.0-flash-experimental`)
   - Integrated via Vercel AI SDK (`@ai-sdk/google`)
   - Service layer pattern with `AICardService` class
   - tRPC router for API endpoints

2. **Current Features**
   - Card generation from text input
   - Cloze deletion suggestions
   - Grammar checking and correction
   - Card improvement suggestions
   - Text analysis for generation preview

3. **Basic Usage Tracking**
   - Stores AI generations in `AIGeneration` table
   - Tracks: user_id, deck_id, input_text, generated_cards, tokens_used (rough estimate), model_used, created_at
   - Token estimation: Currently uses rough calculation (text.length / 4)
   - No cost tracking implemented
   - No detailed token breakdown (input vs output)

4. **Rate Limiting**
   - Environment variables for rate limits: `AI_RATE_LIMIT`, `AI_MAX_CARDS_PER_GENERATION`
   - Basic error handling for API overload (503) and rate limits (429)

## Business Requirements

### 1. Enhanced LLM Usage Tracking

#### 1.1 Detailed Token Tracking

**Objective**: Capture precise token usage for cost analysis and optimization

**Requirements**:
- Track input tokens separately from output tokens
- Store actual token counts from API responses (not estimates)
- Support different token counting methods per model
- Track tokens for each API operation type (generation, analysis, grammar check, etc.)

**Data Points to Capture**:
- `input_tokens`: Exact count of tokens sent to the API
- `output_tokens`: Exact count of tokens received from the API
- `total_tokens`: Sum of input and output tokens
- `cached_tokens`: Number of tokens served from cache (if applicable)
- `token_calculation_method`: How tokens were calculated (API response, SDK count, estimate)

#### 1.2 Cost Tracking

**Objective**: Enable accurate cost monitoring and budgeting

**Requirements**:
- Calculate cost per API request based on token usage
- Support dynamic pricing models (different costs for input/output tokens)
- Track costs in multiple currencies (default USD)
- Implement cost alerts and thresholds
- Historical cost tracking with trend analysis

**Data Points to Capture**:
- `input_cost`: Cost of input tokens in cents/USD
- `output_cost`: Cost of output tokens in cents/USD
- `total_cost`: Total cost of the request
- `currency`: Currency used for cost calculation
- `pricing_model_version`: Version of pricing used for calculation
- `cost_calculation_timestamp`: When the cost was calculated

#### 1.3 Model and Provider Tracking

**Objective**: Enable multi-model support and performance comparison

**Requirements**:
- Track specific model versions used
- Support multiple AI providers (future expansion)
- Record model-specific parameters and settings
- Track model performance metrics

**Data Points to Capture**:
- `provider`: AI provider name (e.g., "google", "openai", "anthropic")
- `model_id`: Exact model identifier
- `model_version`: Model version if applicable
- `model_parameters`: JSON object with temperature, max_tokens, etc.
- `response_time_ms`: API response time in milliseconds
- `success`: Boolean indicating if the request succeeded
- `error_code`: Error code if request failed
- `error_message`: Error description if request failed

### 2. Analytics Data Storage

#### 2.1 Database Schema Enhancement

**New Tables Required**:

```prisma
model AIUsageLog {
  id                    String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  user_id               String
  generation_id         String?   @db.Uuid  // Link to AIGeneration if applicable
  
  // Request details
  operation_type        String    // "generate_cards", "analyze_text", "check_grammar", etc.
  request_timestamp     DateTime  @default(now()) @db.Timestamptz(6)
  response_timestamp    DateTime? @db.Timestamptz(6)
  response_time_ms      Int?
  
  // Token metrics
  input_tokens          Int
  output_tokens         Int
  total_tokens          Int
  cached_tokens         Int       @default(0)
  token_calc_method     String    // "api_response", "sdk_count", "estimate"
  
  // Cost metrics
  input_cost_cents      Float     // Cost in cents (USD)
  output_cost_cents     Float
  total_cost_cents      Float
  currency              String    @default("USD")
  pricing_model_version String
  
  // Model details
  provider              String
  model_id              String
  model_version         String?
  model_parameters      Json?
  
  // Status
  success               Boolean
  error_code            String?
  error_message         String?
  
  // Relations
  user                  User      @relation(fields: [user_id], references: [id], onDelete: Cascade)
  generation            AIGeneration? @relation(fields: [generation_id], references: [id], onDelete: SetNull)
  
  @@index([user_id, request_timestamp])
  @@index([operation_type])
  @@index([provider, model_id])
  @@index([success])
}

model AIUserQuota {
  id                    String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  user_id               String    @unique
  
  // Monthly quotas
  monthly_token_limit   Int       @default(1000000)  // 1M tokens default
  monthly_cost_limit    Float     @default(10.00)    // $10 USD default
  
  // Current usage (reset monthly)
  current_month_tokens  Int       @default(0)
  current_month_cost    Float     @default(0)
  usage_reset_date      DateTime  @db.Timestamptz(6)
  
  // Alerts
  alert_at_percentage   Int       @default(80)       // Alert at 80% usage
  last_alert_sent       DateTime? @db.Timestamptz(6)
  
  // User tier
  tier                  String    @default("free")   // "free", "basic", "pro", "enterprise"
  custom_limits         Json?     // For custom tier configurations
  
  created_at            DateTime  @default(now()) @db.Timestamptz(6)
  updated_at            DateTime  @default(now()) @updatedAt @db.Timestamptz(6)
  
  user                  User      @relation(fields: [user_id], references: [id], onDelete: Cascade)
}

model AIUsageAnalytics {
  id                    String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  user_id               String
  period_type           String    // "daily", "weekly", "monthly"
  period_start          DateTime  @db.Timestamptz(6)
  period_end            DateTime  @db.Timestamptz(6)
  
  // Aggregated metrics
  total_requests        Int
  successful_requests   Int
  failed_requests       Int
  
  total_tokens          Int
  total_input_tokens    Int
  total_output_tokens   Int
  total_cached_tokens   Int
  
  total_cost_cents      Float
  avg_cost_per_request  Float
  avg_tokens_per_request Float
  
  // Usage by operation
  usage_by_operation    Json      // { "generate_cards": { requests: 10, tokens: 5000, cost: 0.05 }, ... }
  
  // Performance metrics
  avg_response_time_ms  Float
  p95_response_time_ms  Float
  p99_response_time_ms  Float
  
  // Model usage
  model_usage           Json      // { "gemini-2.0-flash": { requests: 50, tokens: 25000 }, ... }
  
  created_at            DateTime  @default(now()) @db.Timestamptz(6)
  
  user                  User      @relation(fields: [user_id], references: [id], onDelete: Cascade)
  
  @@unique([user_id, period_type, period_start])
  @@index([user_id, period_type])
  @@index([period_start, period_end])
}
```

#### 2.2 Data Collection Requirements

**Real-time Tracking**:
- Log every AI API request with full metrics
- Update user quotas in real-time
- Trigger alerts when thresholds are reached
- Store raw data for at least 90 days

**Aggregation Requirements**:
- Daily aggregation of usage metrics
- Weekly and monthly rollups
- Hourly aggregation for high-volume users
- Real-time dashboard updates

### 3. User Onboarding System

#### 3.1 Usage-Based Onboarding Segments

**Objective**: Create personalized onboarding experiences based on user behavior

**User Segments**:

1. **AI Power Users**
   - Definition: >100 AI generations in first 7 days
   - Onboarding focus: Advanced features, bulk operations, API access
   - Suggested tier: Pro or Enterprise

2. **Regular AI Users**
   - Definition: 10-100 AI generations in first 7 days
   - Onboarding focus: Optimization tips, best practices
   - Suggested tier: Basic

3. **Light AI Users**
   - Definition: 1-10 AI generations in first 7 days
   - Onboarding focus: AI benefits, feature discovery
   - Suggested tier: Free with prompts to try more

4. **Non-AI Users**
   - Definition: 0 AI generations in first 7 days
   - Onboarding focus: AI introduction, guided first generation
   - Suggested tier: Free with AI feature highlights

#### 3.2 Onboarding Flow Requirements

**Progressive Disclosure**:
- Start with basic features
- Unlock advanced features based on usage
- Provide contextual help based on actions
- Gamification elements (achievements, progress tracking)

**Personalized Tutorials**:
- AI generation tutorial for new users
- Bulk import tutorial for power users
- Cost optimization tips for high-usage users
- Model selection guide for advanced users

**Smart Recommendations**:
- Suggest optimal times for AI usage (off-peak for cost savings)
- Recommend batch operations for efficiency
- Propose tier upgrades based on usage patterns
- Suggest alternative approaches for cost optimization

#### 3.3 Onboarding Metrics

**Track and Optimize**:
- Time to first AI generation
- Number of AI features discovered
- Conversion rate to paid tiers
- User retention by segment
- Feature adoption rates
- Support ticket reduction

### 4. Implementation Considerations

#### 4.1 Technical Requirements

**API Integration**:
- Enhance AI service to capture detailed metrics from API responses
- Implement middleware for request/response logging
- Add cost calculation service with configurable pricing models
- Create background jobs for analytics aggregation

**Performance Requirements**:
- Usage tracking must not impact AI response times (< 10ms overhead)
- Analytics queries must return within 500ms
- Real-time dashboard updates within 5 seconds
- Support for 10,000+ concurrent users

**Security and Privacy**:
- Encrypt sensitive cost data
- Implement data retention policies
- GDPR compliance for usage data
- Role-based access to analytics

#### 4.2 User Interface Requirements

**Analytics Dashboard**:
- Usage overview with charts and graphs
- Cost breakdown by operation type
- Token usage trends
- Model performance comparison
- Export functionality for reports

**Onboarding Interface**:
- Progress indicators
- Interactive tutorials
- Achievement badges
- Contextual help tooltips
- Personalized recommendations panel

#### 4.3 Notification System

**Alert Types**:
- Usage threshold warnings (75%, 90%, 95%)
- Monthly quota reset notifications
- Cost spike alerts
- New feature announcements
- Tier upgrade suggestions

**Delivery Channels**:
- In-app notifications
- Email alerts (configurable)
- Dashboard warnings
- Mobile push notifications (future)

### 5. Success Metrics

**Usage Tracking KPIs**:
- Cost per user accuracy: ±5% of actual
- Data collection reliability: 99.9% uptime
- Analytics query performance: <500ms p95
- Alert delivery success rate: >99%

**Onboarding KPIs**:
- Time to first AI generation: <5 minutes
- 7-day retention by segment: >80% for AI users
- Feature discovery rate: >60% within 30 days
- Tier conversion rate: >10% for power users
- Support ticket reduction: 30% decrease

### 6. Future Enhancements

**Phase 2 Considerations**:
- Multi-provider cost comparison
- AI budget management tools
- Team/organization usage tracking
- API access for usage data
- Predictive usage analytics
- Custom model integration support
- Cost allocation by project/deck
- Usage-based feature recommendations

**Integration Opportunities**:
- Billing system integration
- CRM integration for user insights
- A/B testing for onboarding flows
- Machine learning for usage prediction
- Automated tier recommendations

## Conclusion

This comprehensive system will provide the Anki application with detailed insights into AI usage patterns, accurate cost tracking, and data-driven user onboarding. By implementing these requirements, the application can optimize AI costs, improve user experience, and drive higher engagement and conversion rates.

The phased approach allows for iterative development while ensuring core functionality is delivered first. The analytics foundation will enable continuous improvement of both the AI features and the onboarding experience based on real user data.