'use client';

/**
 * PWA Provider Component
 * 
 * Provides Progressive Web App functionality including:
 * - Service worker registration and management
 * - Installation prompt handling
 * - Offline/online status monitoring
 * - Update notifications
 * - Push notification setup
 */

import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { api } from '@/trpc/react';

interface PWAContextType {
  // Installation state
  isInstallable: boolean;
  isInstalled: boolean;
  installPrompt: () => void;
  dismissPrompt: () => void;
  
  // Service worker state
  isServiceWorkerReady: boolean;
  hasUpdate: boolean;
  updateAvailable: boolean;
  updateApp: () => void;
  
  // Network state
  isOnline: boolean;
  
  // Push notifications
  isPushSupported: boolean;
  isPushSubscribed: boolean;
  subscribeToPush: () => Promise<boolean>;
  unsubscribeFromPush: () => Promise<boolean>;
  
  // PWA capabilities
  canInstall: boolean;
  installationStatus: 'not-supported' | 'available' | 'prompted' | 'installed' | 'dismissed';
}

const PWAContext = createContext<PWAContextType | undefined>(undefined);

export const usePWA = () => {
  const context = useContext(PWAContext);
  if (!context) {
    throw new Error('usePWA must be used within a PWAProvider');
  }
  return context;
};

interface PWAProviderProps {
  children: ReactNode;
}

export function PWAProvider({ children }: PWAProviderProps) {
  // Session management
  const { data: session, status } = useSession();
  const isAuthenticated = status === 'authenticated' && !!session?.user;
  
  // Debug logging
  useEffect(() => {
    console.log('[PWAProvider] Session status:', status, 'isAuthenticated:', isAuthenticated);
  }, [status, isAuthenticated]);

  // State management
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isServiceWorkerReady, setIsServiceWorkerReady] = useState(false);
  const [hasUpdate, setHasUpdate] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [isPushSupported, setIsPushSupported] = useState(false);
  const [isPushSubscribed, setIsPushSubscribed] = useState(false);
  const [installationStatus, setInstallationStatus] = useState<PWAContextType['installationStatus']>('not-supported');

  // API queries and mutations (only when authenticated)
  const { data: pwaStatus, refetch: refetchPwaStatus } = api.pwa.getInstallationStatus.useQuery(undefined, {
    enabled: status === 'authenticated' && !!session?.user,
    retry: false
  });
  const { data: vapidKey } = api.notifications.getVapidPublicKey.useQuery();
  const recordPromptShown = api.pwa.recordPromptShown.useMutation();
  const updateInstallationStatus = api.pwa.updateInstallationStatus.useMutation();
  const subscribeToNotifications = api.notifications.subscribe.useMutation();
  const unsubscribeFromNotifications = api.notifications.unsubscribe.useMutation();

  // Initialize PWA features
  useEffect(() => {
    initializePWA();
  }, []);

  // Update status from API
  useEffect(() => {
    if (pwaStatus) {
      setIsInstalled(pwaStatus.installed);
      if (pwaStatus.installed) {
        setInstallationStatus('installed');
      } else if (pwaStatus.dismissed) {
        setInstallationStatus('dismissed');
      } else if (pwaStatus.prompted) {
        setInstallationStatus('prompted');
      } else {
        setInstallationStatus('available');
      }
    }
  }, [pwaStatus]);

  async function initializePWA() {
    // Check if PWA is supported
    if ('serviceWorker' in navigator) {
      try {
        // Register service worker
        const registration = await navigator.serviceWorker.register('/sw.js');
        setIsServiceWorkerReady(true);
        
        console.log('[PWA] Service worker registered successfully');

        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setHasUpdate(true);
                setUpdateAvailable(true);
                toast.info('App update available! Click to refresh.', {
                  action: {
                    label: 'Update',
                    onClick: updateApp,
                  },
                  duration: Infinity,
                });
              }
            });
          }
        });

        // Listen for messages from service worker
        navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
        
      } catch (error) {
        console.error('[PWA] Service worker registration failed:', error);
      }
    }

    // Check for install prompt support
    if ('BeforeInstallPromptEvent' in window) {
      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      setInstallationStatus('available');
    }

    // Check if already installed
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      setInstallationStatus('installed');
      
      // Record installation if not already recorded
      if (pwaStatus && !pwaStatus.installed) {
        updateInstallationStatus.mutate({ 
          installed: true 
        });
      }
    }

    // Setup network status monitoring
    setIsOnline(navigator.onLine);
    window.addEventListener('online', () => {
      setIsOnline(true);
      toast.success('Connection restored!');
    });
    window.addEventListener('offline', () => {
      setIsOnline(false);
      toast.warning('You are now offline. Some features may be limited.');
    });

    // Check push notification support
    if ('PushManager' in window && 'serviceWorker' in navigator) {
      setIsPushSupported(true);
      
      // Check existing subscription
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setIsPushSubscribed(!!subscription);
      } catch (error) {
        console.error('[PWA] Push subscription check failed:', error);
      }
    }
  }

  function handleBeforeInstallPrompt(event: any) {
    // Prevent Chrome 67 and earlier from automatically showing the prompt
    event.preventDefault();
    
    // Save the event so it can be triggered later
    setDeferredPrompt(event);
    setIsInstallable(true);
    
    console.log('[PWA] Install prompt available');
  }

  function handleServiceWorkerMessage(event: MessageEvent) {
    const { type, payload } = event.data;
    
    switch (type) {
      case 'SW_UPDATE_AVAILABLE':
        setUpdateAvailable(true);
        break;
      case 'SW_OFFLINE_READY':
        toast.success('App is ready for offline use!');
        break;
      case 'SW_CACHE_UPDATED':
        console.log('[PWA] Cache updated:', payload);
        break;
      default:
        console.log('[PWA] Service worker message:', event.data);
    }
  }

  async function installPrompt() {
    if (!deferredPrompt) {
      toast.error('Installation not available on this device');
      return;
    }

    try {
      // Record that prompt was shown
      await recordPromptShown.mutateAsync({
        userAgent: navigator.userAgent,
        platform: navigator.platform,
      });

      // Show the prompt
      deferredPrompt.prompt();
      
      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('[PWA] User accepted the install prompt');
        setIsInstalled(true);
        setInstallationStatus('installed');
        
        await updateInstallationStatus.mutateAsync({ 
          installed: true 
        });
        
        toast.success('App installed successfully!');
      } else {
        console.log('[PWA] User dismissed the install prompt');
        setInstallationStatus('dismissed');
        
        await updateInstallationStatus.mutateAsync({ 
          installed: false,
          dismissed: true 
        });
      }
      
      // Clear the deferred prompt
      setDeferredPrompt(null);
      setIsInstallable(false);
      
    } catch (error) {
      console.error('[PWA] Install prompt failed:', error);
      toast.error('Installation failed');
    }
  }

  async function dismissPrompt() {
    if (deferredPrompt) {
      setDeferredPrompt(null);
      setIsInstallable(false);
    }
    
    setInstallationStatus('dismissed');
    
    try {
      await updateInstallationStatus.mutateAsync({ 
        installed: false,
        dismissed: true 
      });
    } catch (error) {
      console.error('[PWA] Failed to record prompt dismissal:', error);
    }
  }

  function updateApp() {
    // Send message to service worker to skip waiting
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
      
      // Reload the page to activate the new service worker
      window.location.reload();
    }
  }

  async function subscribeToPush(): Promise<boolean> {
    // Check authentication first
    if (!isAuthenticated || status !== 'authenticated' || !session?.user) {
      toast.error('Please log in to enable push notifications');
      return false;
    }

    if (!isPushSupported || !vapidKey?.publicKey) {
      toast.error('Push notifications are not supported');
      return false;
    }

    try {
      // Request notification permission
      const permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        toast.error('Notification permission denied');
        return false;
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;
      
      // Create push subscription
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey.publicKey),
      });

      // Send subscription to server
      await subscribeToNotifications.mutateAsync({
        endpoint: subscription.endpoint,
        keys: {
          p256dh: arrayBufferToBase64(subscription.getKey('p256dh')!),
          auth: arrayBufferToBase64(subscription.getKey('auth')!),
        },
        userAgent: navigator.userAgent,
      });

      setIsPushSubscribed(true);
      toast.success('Push notifications enabled!');
      return true;
      
    } catch (error) {
      console.error('[PWA] Push subscription failed:', error);
      toast.error('Failed to enable push notifications');
      return false;
    }
  }

  async function unsubscribeFromPush(): Promise<boolean> {
    // Check authentication first
    if (!isAuthenticated || status !== 'authenticated' || !session?.user) {
      toast.error('Please log in to manage push notifications');
      return false;
    }

    if (!isPushSupported) {
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        // Unsubscribe from browser
        await subscription.unsubscribe();
        
        // Notify server
        await unsubscribeFromNotifications.mutateAsync({
          endpoint: subscription.endpoint,
        });
      }

      setIsPushSubscribed(false);
      toast.success('Push notifications disabled');
      return true;
      
    } catch (error) {
      console.error('[PWA] Push unsubscription failed:', error);
      toast.error('Failed to disable push notifications');
      return false;
    }
  }

  // Helper functions
  function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    
    return outputArray;
  }

  function arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i] || 0);
    }
    
    return window.btoa(binary);
  }

  const contextValue: PWAContextType = {
    // Installation
    isInstallable,
    isInstalled,
    installPrompt,
    dismissPrompt,
    
    // Service worker
    isServiceWorkerReady,
    hasUpdate,
    updateAvailable,
    updateApp,
    
    // Network
    isOnline,
    
    // Push notifications
    isPushSupported,
    isPushSubscribed,
    subscribeToPush,
    unsubscribeFromPush,
    
    // General
    canInstall: isInstallable && !isInstalled,
    installationStatus,
  };

  return (
    <PWAContext.Provider value={contextValue}>
      {children}
    </PWAContext.Provider>
  );
}