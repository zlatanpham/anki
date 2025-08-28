/**
 * Push Notification Debug Script
 * 
 * Paste this in Chrome DevTools Console to diagnose push notification issues
 */

console.log('🔍 Starting Push Notification Diagnostics...\n');

async function debugNotifications() {
  const results = {
    serviceWorker: '❌',
    pushSupport: '❌', 
    permissions: '❌',
    subscription: '❌',
    registration: '❌',
    vapidKey: '❌'
  };

  try {
    // 1. Check Service Worker Support
    if ('serviceWorker' in navigator) {
      results.serviceWorker = '✅';
      console.log('✅ Service Worker: Supported');
      
      // Check registration
      const registration = await navigator.serviceWorker.ready;
      if (registration) {
        results.registration = '✅';
        console.log('✅ Service Worker: Registered and Ready');
        console.log('   - Scope:', registration.scope);
        console.log('   - Active:', !!registration.active);
        
        // Listen for service worker messages
        navigator.serviceWorker.addEventListener('message', (event) => {
          console.log('📨 Service Worker Message:', event.data);
        });
      }
    } else {
      console.log('❌ Service Worker: Not supported');
    }

    // 2. Check Push Manager Support  
    if ('PushManager' in window) {
      results.pushSupport = '✅';
      console.log('✅ Push Manager: Supported');
    } else {
      console.log('❌ Push Manager: Not supported');
    }

    // 3. Check Notification Permissions
    console.log('🔐 Current Notification Permission:', Notification.permission);
    if (Notification.permission === 'granted') {
      results.permissions = '✅';
      console.log('✅ Permissions: Granted');
    } else if (Notification.permission === 'denied') {
      console.log('❌ Permissions: Denied');
      console.log('   💡 Fix: Go to Chrome Settings > Privacy and security > Site Settings > Notifications');
      console.log('   💡 Or click the 🔒 icon in address bar > Notifications > Allow');
    } else {
      console.log('⚠️  Permissions: Not requested yet');
      console.log('   💡 This will be requested when you enable notifications');
    }

    // 4. Check Push Subscription
    if (results.serviceWorker === '✅' && results.pushSupport === '✅') {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        
        if (subscription) {
          results.subscription = '✅';
          console.log('✅ Push Subscription: Active');
          console.log('   - Endpoint:', subscription.endpoint.substring(0, 50) + '...');
          console.log('   - Keys:', {
            p256dh: !!subscription.getKey('p256dh'),
            auth: !!subscription.getKey('auth')
          });
        } else {
          console.log('❌ Push Subscription: Not found');
          console.log('   💡 Try toggling "Enable Push Notifications" in settings');
        }
      } catch (error) {
        console.log('❌ Push Subscription Error:', error.message);
      }
    }

    // 5. Test Direct Browser Notification
    console.log('\n🧪 Testing Direct Browser Notification...');
    if (Notification.permission === 'granted') {
      try {
        const testNotification = new Notification('🧪 Direct Test', {
          body: 'This notification was created directly by the browser',
          icon: '/icon-192x192.png',
          tag: 'direct-test',
          requireInteraction: false
        });

        testNotification.onclick = () => {
          console.log('✅ Direct notification clicked');
          testNotification.close();
        };

        testNotification.onshow = () => {
          console.log('✅ Direct notification shown');
        };

        testNotification.onerror = (error) => {
          console.log('❌ Direct notification error:', error);
        };

        // Auto close after 5 seconds
        setTimeout(() => {
          testNotification.close();
        }, 5000);

      } catch (error) {
        console.log('❌ Direct notification failed:', error);
      }
    } else {
      console.log('⚠️  Cannot test direct notification - permission not granted');
    }

    // 6. Check VAPID Key
    try {
      const response = await fetch('/api/trpc/notifications.getVapidPublicKey?batch=1&input=%7B%220%22%3A%7B%22json%22%3Anull%2C%22meta%22%3A%7B%22values%22%3A%5B%22undefined%22%5D%7D%7D%7D');
      const data = await response.json();
      
      if (data[0]?.result?.data?.publicKey) {
        results.vapidKey = '✅';
        console.log('✅ VAPID Key: Available');
        console.log('   - Key Preview:', data[0].result.data.publicKey.substring(0, 20) + '...');
      } else {
        console.log('❌ VAPID Key: Not available');
        console.log('   - Response:', data);
      }
    } catch (error) {
      console.log('❌ VAPID Key Error:', error.message);
    }

    // 7. Summary
    console.log('\n📊 DIAGNOSTIC SUMMARY:');
    console.log('='.repeat(40));
    Object.entries(results).forEach(([key, status]) => {
      const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      console.log(`${status} ${label}`);
    });

    // 8. Recommendations
    console.log('\n💡 TROUBLESHOOTING RECOMMENDATIONS:');
    console.log('='.repeat(45));
    
    if (results.permissions === '❌') {
      console.log('1. 🔐 Fix Notification Permissions:');
      console.log('   - Click the 🔒 lock icon in Chrome address bar');
      console.log('   - Set Notifications to "Allow"');
      console.log('   - Or go to chrome://settings/content/notifications');
    }

    if (results.subscription === '❌') {
      console.log('2. 📱 Enable Push Notifications:');
      console.log('   - Go to Settings → Notifications in your app');
      console.log('   - Toggle "Enable Push Notifications" ON');
    }

    if (results.serviceWorker === '❌') {
      console.log('3. 🔧 Service Worker Issue:');
      console.log('   - Check if localhost is running on HTTPS or HTTP');
      console.log('   - Try refreshing the page');
      console.log('   - Check Chrome DevTools → Application → Service Workers');
    }

    console.log('\n4. 🧪 Test Steps:');
    console.log('   - Ensure all items above show ✅');
    console.log('   - Enable push notifications in settings');
    console.log('   - Click "Send Test Notification"');  
    console.log('   - MINIMIZE Chrome or switch to another app');
    console.log('   - The notification should appear on desktop');

    console.log('\n5. 🕵️ Additional Debugging:');
    console.log('   - Open Chrome DevTools → Console');
    console.log('   - Look for "[SW]" service worker logs');
    console.log('   - Check Network tab for failed requests');
    console.log('   - Try opening chrome://settings/content/notifications');

  } catch (error) {
    console.error('❌ Debug script error:', error);
  }
}

// Run the diagnostic
debugNotifications();

// Helper functions for manual testing
window.debugNotificationHelpers = {
  // Test direct notification
  testDirect: () => {
    if (Notification.permission === 'granted') {
      new Notification('🧪 Manual Test', {
        body: 'Direct notification test',
        icon: '/icon-192x192.png'
      });
    } else {
      console.log('Permission needed first');
    }
  },

  // Request permission
  requestPermission: async () => {
    const permission = await Notification.requestPermission();
    console.log('Permission result:', permission);
    return permission;
  },

  // Check service worker status
  checkServiceWorker: async () => {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      console.log('Service Worker Registrations:', registrations);
      
      const registration = await navigator.serviceWorker.ready;
      console.log('Active Registration:', registration);
    }
  },

  // Force refresh service worker
  refreshServiceWorker: async () => {
    const registration = await navigator.serviceWorker.ready;
    await registration.update();
    console.log('Service worker updated');
  }
};

console.log('\n🛠️  Helper functions available:');
console.log('debugNotificationHelpers.testDirect() - Test direct notification');
console.log('debugNotificationHelpers.requestPermission() - Request permission');
console.log('debugNotificationHelpers.checkServiceWorker() - Check SW status');
console.log('debugNotificationHelpers.refreshServiceWorker() - Refresh SW');