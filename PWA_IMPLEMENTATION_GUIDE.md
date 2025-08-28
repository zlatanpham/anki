# PWA Implementation Guide - Anki Flashcard App

## Overview

This guide provides comprehensive implementation details for the Progressive Web App (PWA) and intelligent push notification system added to the Anki flashcard application. The implementation includes offline capabilities, smart notifications integrated with the SuperMemo 2 spaced repetition algorithm, and comprehensive analytics.

## Features Implemented

### 🚀 Progressive Web App (PWA)
- **Service Worker**: Comprehensive caching strategy for offline functionality
- **Web App Manifest**: Native app-like installation experience
- **Offline Support**: Study sessions work without internet connection
- **Update Management**: Automatic updates with user notifications
- **Installation Prompts**: Smart, context-aware installation prompts

### 🔔 Intelligent Push Notifications
- **VAPID-based System**: No external dependencies (FCM/Apple Push)
- **Smart Scheduling**: AI-powered timing based on user study patterns
- **Multiple Types**: Due cards, streak protection, milestones, deck-specific
- **Rate Limiting**: Maximum 1 notification per day with configurable intervals
- **User Preferences**: Granular control over notification types and timing

### 📊 Analytics & Tracking
- **Effectiveness Metrics**: Track notification impact on study behavior
- **Delivery Analytics**: Monitor success rates and failure patterns
- **User Engagement**: Measure notification click-through rates
- **Performance Monitoring**: PWA performance and cache hit rates

## Architecture Overview

### Database Schema Extensions

The implementation adds several new models to support PWA and notifications:

```sql
-- Core notification models
PushSubscription        -- Store VAPID push subscriptions
NotificationPreferences -- User notification settings
NotificationSchedule    -- Scheduled notifications queue
NotificationLog        -- Delivery tracking and analytics

-- PWA models
PWAInstallPrompt       -- Installation tracking
StudyStreak           -- Enhanced streak tracking
NotificationAnalytics -- Aggregated metrics
```

### Service Layer Architecture

```
┌─────────────────────────────────────────────┐
│                 Client Side                 │
├─────────────────────────────────────────────┤
│ React Components + PWA Provider             │
│ ├── InstallPrompt                          │
│ ├── NotificationPreferences                │
│ └── PWAStatus                              │
├─────────────────────────────────────────────┤
│ Service Worker (sw.js)                     │
│ ├── Caching Strategy                       │
│ ├── Push Notification Handler             │
│ └── Background Sync                       │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│                Server Side                  │
├─────────────────────────────────────────────┤
│ tRPC API Routers                           │
│ ├── notifications.ts                      │
│ └── pwa.ts                                │
├─────────────────────────────────────────────┤
│ Service Layer                              │
│ ├── PushNotificationService               │
│ ├── NotificationScheduler                 │
│ └── SuperMemo2Algorithm (enhanced)        │
├─────────────────────────────────────────────┤
│ Database Layer (Prisma)                   │
│ └── PostgreSQL with new PWA models        │
└─────────────────────────────────────────────┘
```

## Setup Instructions

### 1. Environment Configuration

Generate VAPID keys for push notifications:

```bash
# Run the VAPID key generator
node scripts/generate-vapid-keys.js

# Add to your .env.local file:
VAPID_PUBLIC_KEY="your-generated-public-key"
VAPID_PRIVATE_KEY="your-generated-private-key" 
VAPID_SUBJECT="mailto:your-email@domain.com"
```

### 2. Database Migration

Apply the new database schema:

```bash
# Generate and apply database migrations
pnpm run db:generate
pnpm run db:migrate

# Or push schema directly in development
pnpm run db:push
```

### 3. Install Dependencies

The PWA implementation requires additional packages:

```bash
# Install new dependencies (already added to package.json)
pnpm install
```

**New dependencies added:**
- `web-push@^3.6.7` - VAPID push notification handling
- `@types/web-push@^3.6.3` - TypeScript definitions

### 4. Configure Web Server

For production deployment, ensure your web server serves the following files:

```nginx
# Nginx configuration example
location /sw.js {
    add_header Cache-Control "no-cache, no-store, must-revalidate";
    add_header Pragma "no-cache";
    add_header Expires "0";
}

location /manifest.json {
    add_header Cache-Control "public, max-age=31536000";
}
```

## Implementation Details

### Service Worker Features

The service worker (`/public/sw.js`) implements:

1. **Multi-layer Caching Strategy**:
   - Static assets (Cache First)
   - API responses (Network First with fallback)
   - Navigation requests (Network First with offline page)

2. **Push Notification Handling**:
   - VAPID-authenticated message receiving
   - Custom notification actions (Study Now, Remind Later)
   - Notification click handling with deep linking

3. **Background Sync**:
   - Offline review data synchronization
   - Notification analytics collection
   - Failed request retry mechanism

### Intelligent Notification Scheduling

The `NotificationScheduler` service integrates with the existing SM2 algorithm:

1. **Due Cards Notifications**: 
   - Triggered when cards become due for review
   - Considers user's typical study time
   - Respects daily limits and quiet hours

2. **Streak Protection**:
   - Monitors study streaks of 3+ days
   - Sends gentle reminders before streak expires
   - Adjusts timing based on user patterns

3. **Milestone Celebrations**:
   - Celebrates streak milestones (7, 14, 30, 100+ days)
   - Acknowledges learning achievements
   - Configurable milestone thresholds

4. **Deck-Specific Notifications**:
   - Custom thresholds per deck
   - Deck-specific timing preferences
   - Priority-based delivery

### User Experience Features

1. **Installation Prompts**:
   - Smart timing based on user engagement
   - Multiple display modes (banner, modal, card)
   - Platform-specific messaging

2. **Offline Experience**:
   - Seamless offline study sessions
   - Clear offline indicators
   - Background sync when online

3. **Notification Preferences**:
   - Granular type-based controls
   - Time zone and quiet hours support
   - Daily limits and intervals

## API Reference

### PWA Router (`/api/trpc/pwa`)

```typescript
// Get installation status
pwa.getInstallationStatus() -> InstallationStatus

// Record installation events
pwa.recordPromptShown(data) -> Success
pwa.updateInstallationStatus(data) -> Success

// Check for updates
pwa.checkForUpdates() -> UpdateInfo

// Sync offline data
pwa.syncOfflineData(data) -> SyncResult
```

### Notifications Router (`/api/trpc/notifications`)

```typescript
// VAPID management
notifications.getVapidPublicKey() -> { publicKey: string }

// Subscription management  
notifications.subscribe(subscription) -> { success: boolean }
notifications.unsubscribe(endpoint) -> { success: boolean }

// Preferences
notifications.getPreferences() -> NotificationPreferences
notifications.updatePreferences(prefs) -> { success: boolean }

// Scheduling and history
notifications.scheduleNotification(data) -> { scheduledFor: Date }
notifications.getNotificationHistory() -> NotificationLog[]

// Analytics
notifications.getAnalytics() -> AnalyticsData
```

## Testing Guide

### 1. PWA Installation Testing

```bash
# Test service worker registration
1. Open browser dev tools
2. Navigate to Application > Service Workers
3. Verify "sw.js" is registered and active

# Test installation prompt
1. Open in Chrome/Edge
2. Visit multiple pages to trigger engagement
3. Look for installation prompt after ~3 seconds
```

### 2. Push Notification Testing

```bash
# Test subscription flow
1. Enable notifications in preferences
2. Check browser notification permissions
3. Verify subscription in database

# Test notification delivery
1. Use "Send Test Notification" button
2. Check delivery in NotificationLog table
3. Verify notification appears on device
```

### 3. Offline Testing

```bash
# Test offline functionality
1. Load app and study some cards
2. Disable network in dev tools
3. Navigate app and study cached cards
4. Re-enable network and verify sync
```

## Performance Considerations

### Caching Strategy

1. **Static Assets**: Long-term caching with version-based invalidation
2. **API Responses**: Short-term caching with intelligent invalidation
3. **User Data**: Selective caching of study-relevant data only

### Notification Rate Limits

1. **Global Limits**: Maximum 1 notification per user per day
2. **Interval Limits**: Minimum 1 hour between notifications
3. **Type-based Limits**: Different priorities for different types

### Database Optimization

1. **Indexes**: Strategic indexes on notification lookup patterns
2. **Cleanup Jobs**: Automatic cleanup of old logs and schedules
3. **Aggregation**: Periodic analytics aggregation for performance

## Security Considerations

### VAPID Key Management

1. **Private Key Security**: Never expose private keys client-side
2. **Key Rotation**: Plan for periodic key rotation
3. **Subject Verification**: Use verified email or domain

### Data Privacy

1. **User Consent**: Clear opt-in for notifications
2. **Data Retention**: Automatic cleanup of old analytics
3. **Minimal Data**: Store only necessary notification data

### Content Security

1. **Notification Content**: Validate and sanitize notification content
2. **Deep Link Validation**: Verify notification action URLs
3. **Rate Limiting**: Prevent notification spam

## Troubleshooting

### Common Issues

1. **Service Worker Not Installing**:
   - Check HTTPS requirement (localhost exempt)
   - Verify sw.js accessibility
   - Check browser console for errors

2. **Push Notifications Not Working**:
   - Verify VAPID keys are correctly set
   - Check notification permissions
   - Validate subscription endpoint

3. **Offline Functionality Issues**:
   - Clear browser cache and reinstall
   - Check service worker cache storage
   - Verify network interceptor logic

### Debug Tools

1. **Chrome DevTools**:
   - Application > Service Workers
   - Application > Storage
   - Network tab for cache debugging

2. **Database Queries**:
   ```sql
   -- Check notification logs
   SELECT * FROM "NotificationLog" 
   ORDER BY "createdAt" DESC LIMIT 10;
   
   -- Check active subscriptions
   SELECT * FROM "PushSubscription" 
   WHERE "isActive" = true;
   ```

## Deployment Checklist

### Pre-deployment

- [ ] VAPID keys generated and configured
- [ ] Database migrations applied
- [ ] Service worker accessible at `/sw.js`
- [ ] Manifest accessible at `/manifest.json`
- [ ] HTTPS enabled (required for PWA)
- [ ] Icon files present in `/public/icons/`

### Post-deployment

- [ ] Test PWA installation on multiple devices
- [ ] Verify push notification delivery
- [ ] Check offline functionality
- [ ] Monitor error logs and analytics
- [ ] Set up notification job runner (cron/scheduler)

## Monitoring and Maintenance

### Key Metrics to Monitor

1. **Installation Rates**: Track PWA installation conversion
2. **Notification Effectiveness**: Monitor study session correlation
3. **Offline Usage**: Track offline feature utilization
4. **Error Rates**: Monitor service worker and notification errors

### Maintenance Tasks

1. **Weekly**: Review notification analytics and effectiveness
2. **Monthly**: Clean up old notification logs and schedules
3. **Quarterly**: Analyze PWA performance and user engagement
4. **Annually**: Consider VAPID key rotation and security review

## Future Enhancements

### Planned Features

1. **Advanced Analytics**: A/B testing framework for notifications
2. **ML-powered Scheduling**: Machine learning for optimal timing
3. **Web Share API**: Enhanced sharing capabilities
4. **Background Fetch**: Large content download in background
5. **Periodic Background Sync**: Automated data synchronization

### Scalability Improvements

1. **Notification Batching**: Bulk notification processing
2. **Edge Caching**: CDN-based manifest and asset delivery
3. **Database Sharding**: Scale notification data storage
4. **Queue Management**: Redis-based notification queuing

---

## Contact and Support

For technical questions about this implementation:

1. Review the comprehensive inline documentation
2. Check the troubleshooting section above
3. Monitor browser console and network logs
4. Verify database state using provided SQL queries

This PWA implementation provides a solid foundation for offline-capable, engaging flashcard learning with intelligent notifications that enhance the spaced repetition experience.