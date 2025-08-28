/**
 * Anki PWA Service Worker
 * 
 * This service worker provides comprehensive offline capabilities, push notifications,
 * and caching strategies for the Anki flashcard application.
 * 
 * Features:
 * - Offline study sessions with comprehensive caching
 * - Push notification handling
 * - Background sync for study data
 * - Asset caching and updates
 * - API response caching with intelligent invalidation
 */

const CACHE_VERSION = 'anki-v1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;
const API_CACHE = `${CACHE_VERSION}-api`;

// Files to cache immediately
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/offline.html',
  '/favicon.ico',
  '/icon-192x192.png',
  '/icon-512x512.png'
];

// API routes that can be cached
const CACHEABLE_APIS = [
  '/api/trpc',
  '/api/v1'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Install event');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Static assets cached successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Error caching static assets:', error);
      })
  );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate event');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName.startsWith('anki-') && cacheName !== STATIC_CACHE && 
                cacheName !== DYNAMIC_CACHE && cacheName !== API_CACHE) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Service worker activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - handle requests with caching strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-HTTP requests
  if (!url.protocol.startsWith('http')) {
    return;
  }
  
  // Handle different request types
  if (isStaticAsset(url)) {
    event.respondWith(handleStaticAsset(request));
  } else if (isAPIRequest(url)) {
    event.respondWith(handleAPIRequest(request));
  } else if (isNavigationRequest(request)) {
    event.respondWith(handleNavigationRequest(request));
  } else {
    event.respondWith(handleDynamicRequest(request));
  }
});

// Push event - handle push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] 🔔 Push event received');
  console.log('[SW] Event data exists:', !!event.data);
  
  if (!event.data) {
    console.log('[SW] ❌ Push event has no data');
    return;
  }
  
  try {
    const data = event.data.json();
    console.log('[SW] 📦 Push data received:', data);
    console.log('[SW] 📦 Push data keys:', Object.keys(data));
    
    event.waitUntil(
      showNotification(data)
        .then(() => {
          console.log('[SW] ✅ showNotification completed successfully');
        })
        .catch((error) => {
          console.error('[SW] ❌ showNotification failed:', error);
        })
    );
  } catch (error) {
    console.error('[SW] ❌ Error processing push event:', error);
    console.error('[SW] ❌ Error stack:', error.stack);
  }
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  const { notification, action } = event;
  console.log('[SW] Notification clicked:', { title: notification.title, action });
  
  notification.close();
  
  event.waitUntil(
    handleNotificationClick(action || 'open', notification.data || {})
  );
});

// Notification close event
self.addEventListener('notificationclose', (event) => {
  const notificationData = event.notification.data || {};
  console.log('[SW] Notification closed:', event.notification.tag);
  
  if (notificationData.tag) {
    event.waitUntil(
      logNotificationEvent('closed', notificationData.tag)
    );
  }
});

// Background sync event
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync event:', event.tag);
  
  if (event.tag === 'study-data-sync') {
    event.waitUntil(syncStudyData());
  } else if (event.tag === 'notification-analytics-sync') {
    event.waitUntil(syncNotificationAnalytics());
  }
});

// Helper functions
function isStaticAsset(url) {
  return url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/);
}

function isAPIRequest(url) {
  return CACHEABLE_APIS.some(api => url.pathname.startsWith(api));
}

function isNavigationRequest(request) {
  return request.mode === 'navigate' || 
         (request.method === 'GET' && request.headers.get('accept').includes('text/html'));
}

// Cache-first strategy for static assets
async function handleStaticAsset(request) {
  try {
    const cache = await caches.open(STATIC_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[SW] Error handling static asset:', error);
    return new Response('Asset not available offline', { status: 503 });
  }
}

// Network-first strategy for API requests
async function handleAPIRequest(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok && request.method === 'GET') {
      const cache = await caches.open(API_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed for API request, trying cache');
    
    const cache = await caches.open(API_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    return new Response(JSON.stringify({ 
      error: 'Offline - data not available in cache' 
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Navigation requests - try network first, fallback to cache, then offline page
async function handleNavigationRequest(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    
    throw new Error('Network response not ok');
  } catch (error) {
    console.log('[SW] Network failed for navigation, trying cache');
    
    const cache = await caches.open(DYNAMIC_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page
    const offlineResponse = await cache.match('/offline.html');
    return offlineResponse || new Response('Offline', { status: 503 });
  }
}

// Stale-while-revalidate for dynamic content
async function handleDynamicRequest(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  const cachedResponse = await cache.match(request);
  
  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch(() => cachedResponse);
  
  return cachedResponse || await fetchPromise;
}

// Notification handling
async function showNotification(data) {
  console.log('[SW] 🔔 showNotification called with data:', data);
  
  const {
    title = 'Anki Reminder',
    body = 'You have cards ready for review',
    icon = '/icon-192x192.png',
    badge = '/icon-192x192.png',
    tag = 'anki-reminder',
    actions = [],
    data: notificationData = {}
  } = data;
  
  const options = {
    body,
    icon,
    badge,
    tag,
    actions,
    data: notificationData,
    requireInteraction: false,
    vibrate: [200, 100, 200],
    timestamp: Date.now()
  };
  
  console.log('[SW] 🔔 Notification options:', options);
  console.log('[SW] 🔔 Title:', title);
  console.log('[SW] 🔔 Body:', body);
  console.log('[SW] 🔔 Tag:', tag);
  
  try {
    // Check if registration exists
    if (!self.registration) {
      throw new Error('Service worker registration not available');
    }
    
    console.log('[SW] 🔔 Calling self.registration.showNotification...');
    await self.registration.showNotification(title, options);
    console.log('[SW] ✅ Notification shown successfully');
    
    // Log notification display
    await logNotificationEvent('shown', tag);
  } catch (error) {
    console.error('[SW] ❌ Error showing notification:', error);
    console.error('[SW] ❌ Error message:', error.message);
    console.error('[SW] ❌ Error stack:', error.stack);
    console.error('[SW] ❌ Registration available:', !!self.registration);
    
    // Try fallback - this won't work in service worker but good for debugging
    console.log('[SW] 🔔 Attempting fallback notification...');
    throw error;
  }
}

async function handleNotificationClick(action, data) {
  const { url = '/', tag } = data;
  
  try {
    // Log click event
    await logNotificationEvent('clicked', tag);
    
    // Handle different actions
    switch (action) {
      case 'study':
        await openOrFocusApp('/study');
        break;
      case 'view-deck':
        await openOrFocusApp(url);
        break;
      case 'open':
      default:
        await openOrFocusApp(url);
        break;
    }
  } catch (error) {
    console.error('[SW] Error handling notification click:', error);
  }
}

async function openOrFocusApp(url) {
  const clients = await self.clients.matchAll({ type: 'window' });
  
  // Try to focus existing window
  for (const client of clients) {
    if (client.url.includes(self.location.origin)) {
      await client.focus();
      if (client.navigate) {
        await client.navigate(url);
      }
      return;
    }
  }
  
  // Open new window
  await self.clients.openWindow(url);
}

async function logNotificationEvent(type, tag) {
  try {
    // Store event locally for later sync
    if ('indexedDB' in self) {
      // Simple local storage for analytics
      const event = {
        type,
        tag,
        timestamp: Date.now()
      };
      
      // This would be sent to server during sync
      if (!self.pendingAnalytics) {
        self.pendingAnalytics = [];
      }
      self.pendingAnalytics.push(event);
      
      // Register background sync
      await self.registration.sync.register('notification-analytics-sync');
    }
  } catch (error) {
    console.error('[SW] Error logging notification event:', error);
  }
}

// Background sync functions
async function syncStudyData() {
  console.log('[SW] Syncing study data');
  
  try {
    if (!self.pendingData) {
      self.pendingData = [];
    }
    
    if (self.pendingData.length === 0) {
      console.log('[SW] No pending study data to sync');
      return;
    }
    
    // Send pending data to server
    const response = await fetch('/api/trpc/study.syncOfflineData', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data: self.pendingData })
    });
    
    if (response.ok) {
      console.log('[SW] Study data synced successfully');
      self.pendingData = [];
    }
  } catch (error) {
    console.error('[SW] Error syncing study data:', error);
    // Will retry on next sync event
  }
}

async function syncNotificationAnalytics() {
  console.log('[SW] Syncing notification analytics');
  
  try {
    if (!self.pendingAnalytics) {
      self.pendingAnalytics = [];
    }
    
    if (self.pendingAnalytics.length === 0) {
      console.log('[SW] No pending analytics to sync');
      return;
    }
    
    const response = await fetch('/api/trpc/notifications.logAnalytics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ events: self.pendingAnalytics })
    });
    
    if (response.ok) {
      console.log('[SW] Notification analytics synced successfully');
      self.pendingAnalytics = [];
    }
  } catch (error) {
    console.error('[SW] Error syncing notification analytics:', error);
    // Will retry on next sync event
  }
}

// Message handling for communication with main thread
self.addEventListener('message', (event) => {
  const { type, data } = event.data || {};
  
  switch (type) {
    case 'CACHE_STUDY_DATA':
      cacheStudyData(data);
      break;
    case 'GET_CACHE_STATUS':
      getCacheStatus().then(status => {
        event.ports[0].postMessage({ type: 'CACHE_STATUS', data: status });
      });
      break;
    case 'CLEAR_CACHE':
      clearCache().then(() => {
        event.ports[0].postMessage({ type: 'CACHE_CLEARED' });
      });
      break;
    default:
      console.log('[SW] Unknown message type:', type);
  }
});

async function cacheStudyData(data) {
  try {
    const cache = await caches.open(API_CACHE);
    // Cache study session data for offline access
    await cache.put(
      new Request('/api/trpc/study.getOfflineData'),
      new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' }
      })
    );
  } catch (error) {
    console.error('[SW] Error caching study data:', error);
  }
}

async function getCacheStatus() {
  try {
    const cacheNames = await caches.keys();
    const cacheStats = {};
    
    for (const cacheName of cacheNames) {
      if (cacheName.startsWith('anki-')) {
        const cache = await caches.open(cacheName);
        const keys = await cache.keys();
        cacheStats[cacheName] = keys.length;
      }
    }
    
    return {
      caches: cacheStats,
      version: CACHE_VERSION,
      lastUpdated: Date.now()
    };
  } catch (error) {
    console.error('[SW] Error getting cache status:', error);
    return { error: error.message };
  }
}

async function clearCache() {
  try {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames
        .filter(name => name.startsWith('anki-'))
        .map(name => caches.delete(name))
    );
    console.log('[SW] All caches cleared');
  } catch (error) {
    console.error('[SW] Error clearing cache:', error);
  }
}

console.log('[SW] Service worker loaded successfully');