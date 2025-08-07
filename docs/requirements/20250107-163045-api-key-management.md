# API Key Management Requirements Document

## Executive Summary

This document outlines the requirements for implementing a private API key generator feature that will allow external systems (such as MCPs and other applications) to interact with the Anki flashcard application through secure API endpoints. The feature will enable programmatic access to core functionality including deck management, card operations, and study sessions.

## Business Context and Problem Statement

### Current State
- The application currently uses session-based authentication via NextAuth.js
- All API access requires user login through web interface
- No support for external system integration
- No programmatic access for automation or third-party tools

### Business Needs
- Enable external applications to integrate with the flashcard system
- Support automation workflows for content creation and management
- Allow MCP (Model Context Protocol) integrations for AI-enhanced learning
- Provide secure, controlled access to user data via API keys
- Enable development of companion applications and tools

### Target Users
- Power users wanting to automate card creation
- Developers building companion applications
- AI/ML researchers integrating with learning systems
- Educational institutions requiring programmatic access
- Content creators managing large card libraries

## Stakeholder Analysis

### Primary Stakeholders
- **End Users**: Need secure, easy-to-manage API access for their tools
- **Developers**: Require well-documented, stable API endpoints
- **System Administrators**: Need audit trails and usage monitoring
- **Security Team**: Require robust authentication and rate limiting

### Secondary Stakeholders
- **Support Team**: Need tools to help users manage API keys
- **Product Team**: Need usage analytics for feature planning
- **Finance Team**: May need usage data for potential API monetization

## Functional Requirements

### FR1: API Key Management

#### FR1.1: API Key Generation
- Users SHALL be able to generate new API keys through the web interface
- System SHALL generate cryptographically secure random keys (minimum 32 characters)
- Each key SHALL be associated with the generating user's account
- Users SHALL be able to provide a descriptive name for each key
- System SHALL display the key only once upon creation
- Users SHALL be warned that keys cannot be retrieved after initial display

#### FR1.2: API Key Listing
- Users SHALL be able to view all their active API keys
- List SHALL display: key name, creation date, last used date, usage count
- Actual key values SHALL NOT be displayed in the list (only partial/masked)
- System SHALL support pagination for users with many keys

#### FR1.3: API Key Revocation
- Users SHALL be able to revoke/delete API keys
- Revocation SHALL take effect immediately
- System SHALL log the revocation event
- Revoked keys SHALL NOT be reusable

#### FR1.4: API Key Rotation
- Users SHALL be able to rotate keys (revoke old, generate new)
- System SHALL support automatic expiration dates (optional)
- Users SHALL receive notifications before key expiration

### FR2: API Endpoints

#### FR2.1: List Decks Endpoint
**Endpoint**: `GET /api/v1/decks`

**Functionality**:
- Return all decks accessible to the API key owner
- Include deck metadata: id, name, description, card count
- Support filtering by organization (if applicable)
- Support pagination (limit/offset parameters)

**Response Format**:
```json
{
  "decks": [
    {
      "id": "uuid",
      "name": "string",
      "description": "string",
      "cardCount": "number",
      "isPublic": "boolean",
      "createdAt": "ISO8601",
      "updatedAt": "ISO8601"
    }
  ],
  "total": "number",
  "hasMore": "boolean"
}
```

#### FR2.2: Create Deck Endpoint
**Endpoint**: `POST /api/v1/decks`

**Functionality**:
- Create a new deck for the API key owner
- Accept deck name, description, and settings
- Validate required fields
- Return created deck with generated ID

**Request Format**:
```json
{
  "name": "string (required)",
  "description": "string (optional)",
  "isPublic": "boolean (optional, default: false)",
  "organizationId": "uuid (optional)"
}
```

#### FR2.3: Batch Add Cards Endpoint
**Endpoint**: `POST /api/v1/decks/{deckId}/cards/batch`

**Functionality**:
- Add multiple cards to a specified deck
- Support both BASIC and CLOZE card types
- Validate card data before creation
- Create initial card states for spaced repetition
- Return success/failure status for each card

**Request Format**:
```json
{
  "cards": [
    {
      "front": "string (required)",
      "back": "string (required)",
      "cardType": "BASIC|CLOZE (optional, default: BASIC)",
      "clozeText": "string (required if cardType is CLOZE)",
      "tags": ["string"] (optional)
    }
  ]
}
```

**Limits**:
- Maximum 100 cards per batch request
- Request timeout: 60 seconds

#### FR2.4: Get Review Queue Endpoint
**Endpoint**: `GET /api/v1/study/queue`

**Functionality**:
- Return cards due for review
- Support filtering by deck
- Include card states and metadata
- Order by priority (NEW > LEARNING > REVIEW)
- Support limiting number of cards returned

**Query Parameters**:
- `deckId` (optional): Filter by specific deck
- `limit` (optional, default: 20, max: 50): Number of cards
- `includeNew` (optional, default: true): Include new cards
- `includeLearning` (optional, default: true): Include learning cards
- `includeReview` (optional, default: true): Include review cards

**Response Format**:
```json
{
  "cards": [
    {
      "id": "uuid",
      "deckId": "uuid",
      "deckName": "string",
      "front": "string",
      "back": "string",
      "cardType": "BASIC|CLOZE",
      "state": "NEW|LEARNING|REVIEW",
      "dueDate": "ISO8601",
      "interval": "number",
      "easinessFactor": "number"
    }
  ],
  "totalDue": "number"
}
```

### FR3: Authentication & Authorization

#### FR3.1: API Key Authentication
- All API requests SHALL include API key in Authorization header
- Format: `Authorization: Bearer {api_key}`
- System SHALL validate key on every request
- Invalid keys SHALL return 401 Unauthorized

#### FR3.2: Scope Management
- Initial implementation SHALL grant full user permissions to API keys
- Future enhancement: Support limited scopes (read-only, specific decks)

## Non-Functional Requirements

### NFR1: Security Requirements

#### NFR1.1: Key Storage
- API keys SHALL be hashed using bcrypt before storage
- System SHALL NOT store plain text keys
- Database SHALL encrypt API key table at rest

#### NFR1.2: Transport Security
- All API communication SHALL use HTTPS/TLS
- System SHALL reject HTTP requests to API endpoints
- Implement CORS policies for browser-based access

#### NFR1.3: Key Security
- Keys SHALL use cryptographically secure random generation
- Minimum key length: 32 characters
- Keys SHALL include alphanumeric and special characters

### NFR2: Performance Requirements

#### NFR2.1: Response Times
- API endpoints SHALL respond within 2 seconds for 95% of requests
- Batch operations SHALL complete within 30 seconds
- List operations SHALL use pagination to maintain performance

#### NFR2.2: Scalability
- System SHALL support 1000+ API keys per user
- System SHALL handle 100 requests/second across all API endpoints

### NFR3: Reliability Requirements

#### NFR3.1: Availability
- API SHALL maintain 99.9% uptime
- Graceful degradation for database connectivity issues
- Circuit breakers for external dependencies

#### NFR3.2: Data Consistency
- All card creation operations SHALL be transactional
- Failed batch operations SHALL rollback completely
- No partial card states on failures

### NFR4: Usability Requirements

#### NFR4.1: Documentation
- Comprehensive API documentation using OpenAPI/Swagger
- Code examples in multiple languages (JavaScript, Python, cURL)
- Interactive API explorer for testing

#### NFR4.2: Error Messages
- Clear, actionable error messages
- Consistent error response format
- Include error codes for programmatic handling

## Rate Limiting and Usage Tracking

### Rate Limits
- Default: 1000 requests per hour per API key
- Batch endpoints: 100 requests per hour
- Headers SHALL include rate limit information:
  - `X-RateLimit-Limit`
  - `X-RateLimit-Remaining`
  - `X-RateLimit-Reset`

### Usage Tracking
- Track all API requests with timestamp, endpoint, response code
- Aggregate daily/monthly usage statistics
- Support usage export for billing/analytics

## Data Models and Schemas

### API Key Model
```prisma
model ApiKey {
  id              String    @id @default(cuid())
  userId          String
  name            String    @db.VarChar(255)
  keyHash         String    @unique
  lastUsedAt      DateTime?
  expiresAt       DateTime?
  isActive        Boolean   @default(true)
  usageCount      Int       @default(0)
  createdAt       DateTime  @default(now())
  revokedAt       DateTime?
  
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  apiUsageLogs    ApiUsageLog[]
  
  @@index([userId])
  @@index([keyHash])
}
```

### API Usage Log Model
```prisma
model ApiUsageLog {
  id              String    @id @default(cuid())
  apiKeyId        String
  endpoint        String    @db.VarChar(255)
  method          String    @db.VarChar(10)
  statusCode      Int
  responseTimeMs  Int
  ipAddress       String?   @db.VarChar(45)
  userAgent       String?   @db.Text
  createdAt       DateTime  @default(now())
  
  apiKey          ApiKey    @relation(fields: [apiKeyId], references: [id], onDelete: Cascade)
  
  @@index([apiKeyId, createdAt])
  @@index([endpoint, createdAt])
}
```

## Error Handling Requirements

### Standard Error Response Format
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {
      "field": "Additional context"
    }
  }
}
```

### Error Codes
- `INVALID_API_KEY`: API key is invalid or revoked
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `VALIDATION_ERROR`: Request data validation failed
- `RESOURCE_NOT_FOUND`: Requested resource doesn't exist
- `PERMISSION_DENIED`: User lacks permission for resource
- `INTERNAL_ERROR`: Server-side error

## Integration Considerations

### Webhook Support (Future Enhancement)
- Event notifications for card reviews
- Deck modification alerts
- Study session completion events

### SDK Development
- TypeScript/JavaScript SDK as reference implementation
- Auto-generated clients from OpenAPI spec
- Example integrations for popular platforms

### MCP Integration Specifics
- Ensure compatibility with Model Context Protocol standards
- Support for streaming responses where applicable
- Metadata enrichment for AI model consumption

## Success Metrics

### Adoption Metrics
- Number of API keys generated
- Number of active API users (daily/monthly)
- API request volume trends

### Performance Metrics
- API response time (p50, p95, p99)
- Error rate by endpoint
- Rate limit hit frequency

### Business Metrics
- Cards created via API vs web interface
- User retention for API users
- Feature requests for API enhancements

## Implementation Considerations

### Phase 1: Core Implementation
1. API key generation and management UI
2. Authentication middleware
3. Four basic endpoints
4. Rate limiting
5. Basic usage tracking

### Phase 2: Enhanced Features
1. Comprehensive API documentation
2. Usage analytics dashboard
3. API key scopes/permissions
4. Webhook support
5. Additional endpoints based on usage

### Phase 3: Ecosystem Development
1. Official SDKs
2. Example applications
3. Partner integrations
4. API marketplace considerations

## Security Considerations

### Threat Model
- API key theft/exposure
- Brute force attacks
- Data exfiltration via API
- Denial of service attacks

### Mitigation Strategies
- Key rotation recommendations
- IP allowlisting (optional)
- Suspicious activity detection
- Request signing for sensitive operations

## Testing Requirements

### Unit Tests
- API key generation and validation
- Authentication middleware
- Each endpoint logic
- Rate limiting logic

### Integration Tests
- End-to-end API workflows
- Database transaction handling
- Error scenarios
- Performance under load

### Security Tests
- Penetration testing
- API key security validation
- Rate limit bypass attempts
- SQL injection and XSS prevention

## Assumptions and Constraints

### Assumptions
- Users understand API key security best practices
- Initial usage will be moderate (< 10k requests/day)
- Most usage will be for automation, not high-frequency trading
- Users will primarily use official SDKs once available

### Constraints
- Must maintain compatibility with existing authentication system
- Cannot break existing tRPC endpoints
- Must work within current PostgreSQL database
- Performance must not degrade existing web interface

## Dependencies

### Technical Dependencies
- NextAuth.js for user authentication
- tRPC for existing API structure
- PostgreSQL with Prisma ORM
- Rate limiting library (e.g., express-rate-limit)

### External Dependencies
- Documentation hosting platform
- API monitoring service
- Usage analytics platform

## Risks and Mitigation

### Risk 1: API Key Exposure
- **Impact**: Unauthorized access to user data
- **Mitigation**: Clear security warnings, automatic expiration, activity monitoring

### Risk 2: Performance Degradation
- **Impact**: Poor user experience for all users
- **Mitigation**: Rate limiting, caching, dedicated API infrastructure

### Risk 3: Abuse/Spam
- **Impact**: System overload, content quality issues
- **Mitigation**: Rate limiting, content validation, abuse detection

## Future Enhancements

1. **GraphQL API**: More flexible querying capabilities
2. **Real-time Updates**: WebSocket support for live notifications
3. **Batch Operations**: Bulk update/delete capabilities
4. **Advanced Analytics**: Detailed learning analytics via API
5. **AI Integration**: Direct AI model integration endpoints
6. **OAuth2 Support**: Third-party application authorization
7. **API Monetization**: Usage-based pricing tiers

## Approval and Sign-off

This requirements document requires approval from:
- Product Owner
- Technical Lead
- Security Officer
- API Platform Team

---

Document Version: 1.0
Date: January 7, 2025
Author: Business Analyst
Status: Draft