# Progressive Web App & Push Notification Requirements
## Flashcard Learning Reminder System

**Document ID:** 20250825-pwa-push-notifications  
**Date:** August 25, 2025  
**Status:** Draft  
**Priority:** High  

### Executive Summary

This document outlines the requirements for transforming the existing Anki flashcard application into a Progressive Web App (PWA) with intelligent push notification capabilities for optimized spaced repetition learning reminders.

### 1. Progressive Web App Foundation

#### 1.1 Core PWA Requirements

**Mandatory Components:**
- **Web App Manifest**: `/public/manifest.json` with complete app metadata
- **Service Worker**: Comprehensive caching strategy and background processing
- **HTTPS Deployment**: Secure connection for all PWA features
- **Responsive Design**: Enhanced mobile-first experience (already implemented)

**Manifest Configuration:**
```json
{
  "name": "Anki - Spaced Repetition Learning",
  "short_name": "Anki",
  "description": "AI-powered spaced repetition flashcard learning system",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "icons": [
    { "src": "/icons/icon-192x192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512x512.png", "sizes": "512x512", "type": "image/png" }
  ],
  "categories": ["education", "productivity"],
  "shortcuts": [
    { "name": "Quick Study", "short_name": "Study", "url": "/study" },
    { "name": "Review Due Cards", "short_name": "Review", "url": "/study?mode=due" }
  ]
}
```

**Service Worker Capabilities:**
- Offline functionality for study sessions
- Background sync for study data
- Push notification handling
- Strategic caching of essential app resources
- Network-first strategy for API calls with fallback to cache

#### 1.2 Installation & User Experience

**Features:**
- Install prompts for supported browsers
- Add to Home Screen functionality
- Splash screen during app launch
- Native app-like navigation (no browser UI)
- iOS 16.4+ compatibility for home screen installation

---

### 2. Push Notification System Architecture

#### 2.1 Infrastructure Requirements

**Backend Components:**
```typescript
// New database models needed
- NotificationSettings: User preferences and scheduling rules
- PushSubscription: Device subscription management
- NotificationLog: Delivery tracking and analytics
- ReminderQueue: Scheduled notification queue management
```

**Service Architecture:**
- **VAPID Push Service**: Direct web push using VAPID keys (no external services)
- **Notification Service**: Centralized push notification management
- **Scheduler Service**: Intelligent reminder timing calculations
- **Subscription Manager**: Device registration and management
- **Analytics Service**: Notification effectiveness tracking

**Web Push Implementation:**
```typescript
// Using web-push library for direct browser communication
import webpush from 'web-push';

// VAPID configuration
webpush.setVapidDetails(
  'mailto:your-email@example.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// Send notification directly to browser
await webpush.sendNotification(subscription, payload);
```

#### 2.2 Push Notification Types

**1. Due Card Reminders**
- **Trigger**: Cards due for review based on SM2/FSRS algorithm
- **Timing**: Smart scheduling (see Section 3)
- **Content**: "{X} cards are ready for review in {deck_name}"
- **Action**: Deep link to study session

**2. Study Streak Notifications**
- **Trigger**: Risk of breaking study streak (24h+ inactive)
- **Timing**: 18-20 hours after last study session
- **Content**: "Don't break your {X}-day streak! Quick review available"
- **Frequency**: Maximum once per day

**3. Learning Milestone Alerts**
- **Trigger**: Significant achievements (100 cards reviewed, perfect week)
- **Timing**: Immediate upon achievement
- **Content**: Celebratory message with progress stats
- **Frequency**: As achieved

**4. Deck-Specific Reminders**
- **Trigger**: User-defined deck priorities and schedules
- **Timing**: Customizable per deck
- **Content**: Deck-specific study prompts
- **Frequency**: Configurable by user

---

### 3. Intelligent Reminder Timing Strategy

#### 3.1 Algorithm Integration

**Core Principle**: Leverage existing SM2 algorithm data to optimize notification timing

**Smart Scheduling Logic:**
```typescript
interface ReminderStrategy {
  // Primary: Due card notifications
  dueCardThreshold: number; // Minimum cards due (default: 5)
  
  // Secondary: Proactive learning prompts
  optimalStudyWindows: TimeWindow[]; // User's historical active periods
  
  // Tertiary: Streak maintenance
  streakProtectionWindow: number; // Hours before streak expires (default: 18)
}
```

#### 3.2 Frequency Management (Critical)

**Research-Based Limits:**
- **Maximum**: 1 notification per day per user
- **Optimal**: 3-5 notifications per week maximum
- **Minimum Gap**: 4 hours between any notifications
- **Respect User Preferences**: Full granular control

**Timing Optimization:**
- **Morning Focus** (8-10 AM): New learning sessions
- **Afternoon Review** (2-4 PM): Review due cards
- **Evening Reinforcement** (7-9 PM): Difficult cards
- **Weekend Intensive** (10 AM-2 PM): Extended study sessions

#### 3.3 Personalization Engine

**Behavioral Analysis:**
- Historical study patterns (time of day, frequency)
- Performance metrics (retention rate, response times)
- App usage patterns (session length, preferred study modes)
- Notification interaction rates (open rate, action taken)

**Adaptive Scheduling:**
```typescript
interface PersonalizedScheduling {
  userTimezone: string;
  preferredStudyTimes: TimeSlot[];
  notificationFrequency: 'minimal' | 'balanced' | 'intensive';
  autoAdjustBasedOnPerformance: boolean;
}
```

---

### 4. User Experience & Control

#### 4.1 Notification Preferences Dashboard

**Granular Controls:**
- Enable/disable each notification type
- Custom quiet hours (e.g., 10 PM - 8 AM)
- Weekend-specific schedules
- Deck-specific notification settings
- Frequency adjustment sliders

**Advanced Settings:**
- Notification sound customization
- Vibration patterns
- Badge count management
- Preview notification content before enabling

#### 4.2 Permission Management

**Progressive Permission Requests:**
- Context-aware permission prompts
- Educational explanations of benefits
- Gradual permission escalation
- Easy opt-out mechanisms

**iOS-Specific Flow:**
1. Home screen installation prompt
2. Explanation of PWA benefits
3. Notification permission request
4. Setup guided tour

---

### 5. Technical Implementation Requirements

#### 5.1 Frontend Components

**New React Components:**
```typescript
// PWA Installation
- InstallPrompt: Cross-browser install prompting
- PWAStatus: Installation and service worker status

// Notifications
- NotificationSettings: Comprehensive preference management
- NotificationPreview: Test notification functionality
- PermissionManager: Handle browser permission states

// Service Worker Integration
- OfflineIndicator: Network status awareness
- SyncStatus: Background sync progress
- CacheManager: Manual cache management tools
```

#### 5.2 API Endpoints

**New tRPC Routers:**
```typescript
// notificationRouter
- subscribe(subscription: PushSubscription): boolean
- updatePreferences(settings: NotificationSettings): boolean
- getScheduledNotifications(): NotificationQueue[]
- testNotification(): boolean
- getVapidPublicKey(): string // For frontend subscription

// pwaRouter
- getManifest(): WebAppManifest
- getServiceWorkerStatus(): ServiceWorkerStatus
- registerForUpdates(): boolean
```

**Required Dependencies:**
```json
{
  "dependencies": {
    "web-push": "^3.6.7"
  },
  "devDependencies": {
    "@types/web-push": "^3.6.3"
  }
}
```

#### 5.3 Database Schema Extensions

**New Prisma Models:**
```prisma
model NotificationSettings {
  id                String   @id @default(cuid())
  userId            String   @unique
  dueCardReminders  Boolean  @default(true)
  streakReminders   Boolean  @default(true)
  quietHoursStart   String?  // "22:00"
  quietHoursEnd     String?  // "08:00"
  maxDailyReminders Int      @default(1)
  preferredTimes    String[] // JSON array of preferred study times
  timezone          String
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model PushSubscription {
  id           String   @id @default(cuid())
  userId       String
  endpoint     String
  p256dhKey    String
  authKey      String
  userAgent    String?
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  lastUsed     DateTime @default(now())
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model NotificationLog {
  id            String    @id @default(cuid())
  userId        String
  type          NotificationType
  title         String
  body          String
  scheduledFor  DateTime
  sentAt        DateTime?
  deliveredAt   DateTime?
  clickedAt     DateTime?
  success       Boolean   @default(false)
  errorMessage  String?
  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

---

### 6. Performance & Analytics

#### 6.1 Key Metrics

**Notification Effectiveness:**
- Delivery rate (sent vs received)
- Open rate (clicked vs sent)
- Conversion rate (notification → study session)
- User retention impact

**Learning Performance:**
- Study frequency improvement
- Retention rate changes
- Streak maintenance
- Time-to-review reduction

#### 6.2 A/B Testing Framework

**Test Variables:**
- Notification timing strategies
- Message content variations
- Frequency optimization
- Personalization algorithms

---

### 7. Security & Privacy

#### 7.1 Data Protection

**Privacy-First Approach:**
- Minimal data collection for notifications
- Local storage of user preferences where possible
- Encrypted push subscription storage
- GDPR/CCPA compliance for notification data

#### 7.2 Security Measures

**VAPID Key Management:**
- Generate VAPID key pair for server authentication
- Store private key securely in environment variables
- Public key shared with frontend for subscription
- Regular key rotation procedures (recommended: annually)

**Push Security:**
- VAPID authentication prevents unauthorized notifications
- Subscription endpoint validation
- Rate limiting on notification endpoints
- Payload encryption for sensitive data

**Environment Variables Required:**
```bash
VAPID_PUBLIC_KEY=BL....(base64 encoded public key)
VAPID_PRIVATE_KEY=....(base64 encoded private key)
VAPID_SUBJECT=mailto:your-email@yourdomain.com
```

---

### 8. Implementation Phases

#### Phase 1: PWA Foundation (Week 1-2)
- Service worker implementation
- Web app manifest
- Basic offline functionality
- Install prompts

#### Phase 2: Push Infrastructure (Week 3-4)
- Push notification backend setup
- Database schema implementation
- Basic notification sending capability
- Permission management

#### Phase 3: Smart Scheduling (Week 5-6)
- Algorithm integration with existing SM2 system
- Personalization engine
- User preference dashboard
- Timing optimization

#### Phase 4: Advanced Features (Week 7-8)
- A/B testing framework
- Analytics implementation
- iOS-specific optimizations
- Performance monitoring

---

### 9. Success Criteria

#### 9.1 Technical KPIs
- PWA Lighthouse score: 90+ across all categories
- Service worker functionality: 99% uptime
- Notification delivery rate: 95%+
- App installation rate: 15% of active users

#### 9.2 Learning KPIs
- Study frequency increase: 25%+
- User retention improvement: 20%+
- Average study streak length: +40%
- Time from due card to review: -50%

---

### 10. Risk Mitigation

#### 10.1 Technical Risks
- **iOS limitations**: Comprehensive testing on iOS 16.4+
- **Browser compatibility**: Progressive enhancement approach
- **Notification fatigue**: Strict frequency limits and user control

#### 10.2 User Experience Risks
- **Permission denial**: Educational onboarding and value proposition
- **Notification spam**: Machine learning-based optimization
- **Battery impact**: Efficient service worker implementation

---

### Conclusion

This PWA transformation with intelligent push notifications will significantly enhance user engagement with spaced repetition learning while maintaining the high-quality experience users expect. The focus on user control, privacy, and learning effectiveness ensures sustainable long-term adoption.

**Next Steps:**
1. Technical feasibility review with development team
2. User research validation of notification preferences
3. Infrastructure planning and resource allocation
4. Phased implementation timeline confirmation