'use client';

/**
 * PWA Status Component
 * 
 * Shows the current status of PWA features including:
 * - Online/offline status
 * - Service worker status
 * - Update availability
 * - Installation status
 * - Cache status
 */

import React, { useState, useEffect } from 'react';
import { 
  Wifi, 
  WifiOff, 
  Download, 
  RefreshCw, 
  Check, 
  AlertCircle,
  Smartphone,
  Database,
  Clock
} from 'lucide-react';
import { usePWA } from './PWAProvider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { motion, AnimatePresence } from 'framer-motion';

interface PWAStatusProps {
  className?: string;
  variant?: 'compact' | 'detailed' | 'mini';
  showOfflineIndicator?: boolean;
}

export function PWAStatus({ 
  className = '',
  variant = 'compact',
  showOfflineIndicator = true
}: PWAStatusProps) {
  const { 
    isOnline, 
    isServiceWorkerReady,
    hasUpdate,
    updateApp,
    isInstalled,
    installationStatus,
    installPrompt
  } = usePWA();

  const [storageInfo, setStorageInfo] = useState<{
    quota: number;
    usage: number;
    usageDetails: Record<string, number>;
  } | null>(null);

  // Get storage information
  useEffect(() => {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      navigator.storage.estimate().then(estimate => {
        setStorageInfo({
          quota: estimate.quota || 0,
          usage: estimate.usage || 0,
          usageDetails: {}
        });
      });
    }
  }, []);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getConnectionStatus = () => {
    if (isOnline) {
      return {
        icon: <Wifi className="w-4 h-4" />,
        text: 'Online',
        color: 'text-green-600',
        bgColor: 'bg-green-100'
      };
    } else {
      return {
        icon: <WifiOff className="w-4 h-4" />,
        text: 'Offline',
        color: 'text-orange-600',
        bgColor: 'bg-orange-100'
      };
    }
  };

  const getInstallationStatus = () => {
    switch (installationStatus) {
      case 'installed':
        return {
          icon: <Check className="w-4 h-4" />,
          text: 'Installed',
          color: 'text-green-600',
          bgColor: 'bg-green-100'
        };
      case 'available':
        return {
          icon: <Download className="w-4 h-4" />,
          text: 'Can Install',
          color: 'text-blue-600',
          bgColor: 'bg-blue-100'
        };
      case 'dismissed':
        return {
          icon: <Smartphone className="w-4 h-4" />,
          text: 'Available',
          color: 'text-gray-600',
          bgColor: 'bg-gray-100'
        };
      default:
        return {
          icon: <Smartphone className="w-4 h-4" />,
          text: 'Browser',
          color: 'text-gray-600',
          bgColor: 'bg-gray-100'
        };
    }
  };

  const connectionStatus = getConnectionStatus();
  const installStatus = getInstallationStatus();

  if (variant === 'mini') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-orange-500'}`} />
            </TooltipTrigger>
            <TooltipContent>
              {isOnline ? 'Connected' : 'Offline mode'}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        {hasUpdate && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={updateApp}
                  size="sm"
                  variant="ghost"
                  className="w-6 h-6 p-0 text-blue-600 hover:text-blue-700"
                >
                  <RefreshCw className="w-3 h-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Update available - Click to update
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Connection Status */}
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${connectionStatus.bgColor}`}>
                {connectionStatus.icon}
                <span className={`text-sm font-medium ${connectionStatus.color}`}>
                  {connectionStatus.text}
                </span>
              </div>

              {/* Installation Status */}
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${installStatus.bgColor}`}>
                {installStatus.icon}
                <span className={`text-sm font-medium ${installStatus.color}`}>
                  {installStatus.text}
                </span>
              </div>

              {/* Service Worker Status */}
              {isServiceWorkerReady && (
                <Badge variant="outline" className="text-green-700 border-green-300">
                  SW Ready
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Update Available */}
              <AnimatePresence>
                {hasUpdate && (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                  >
                    <Button
                      onClick={updateApp}
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <RefreshCw className="w-4 h-4 mr-1" />
                      Update
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Install Button */}
              {installationStatus === 'available' && (
                <Button
                  onClick={installPrompt}
                  size="sm"
                  variant="outline"
                  className="border-blue-300 text-blue-600 hover:bg-blue-50"
                >
                  <Download className="w-4 h-4 mr-1" />
                  Install
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Detailed variant
  return (
    <Card className={className}>
      <CardContent className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">App Status</h3>
          <div className="flex items-center gap-2">
            {hasUpdate && (
              <Badge variant="destructive">
                <RefreshCw className="w-3 h-3 mr-1" />
                Update Available
              </Badge>
            )}
            {isServiceWorkerReady && (
              <Badge variant="outline" className="text-green-700 border-green-300">
                Service Worker Active
              </Badge>
            )}
          </div>
        </div>

        {/* Connection Status */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Connection Status</span>
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${connectionStatus.bgColor}`}>
              {connectionStatus.icon}
              <span className={`text-sm font-medium ${connectionStatus.color}`}>
                {connectionStatus.text}
              </span>
            </div>
          </div>
          
          {!isOnline && showOfflineIndicator && (
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-orange-800">You're offline</p>
                  <p className="text-orange-700">
                    You can still study with cached decks. Progress will sync when you're back online.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Installation Status */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Installation</span>
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${installStatus.bgColor}`}>
              {installStatus.icon}
              <span className={`text-sm font-medium ${installStatus.color}`}>
                {installStatus.text}
              </span>
            </div>
          </div>
          
          {installationStatus === 'available' && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-2">
                <Download className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-blue-800 text-sm">Install for better experience</p>
                  <p className="text-blue-700 text-sm">
                    Get offline support, push notifications, and native app experience.
                  </p>
                  <Button
                    onClick={installPrompt}
                    size="sm"
                    className="mt-2 bg-blue-600 hover:bg-blue-700"
                  >
                    Install Now
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Storage Usage */}
        {storageInfo && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium flex items-center gap-2">
                <Database className="w-4 h-4" />
                Storage Usage
              </span>
              <span className="text-sm text-muted-foreground">
                {formatBytes(storageInfo.usage)} / {formatBytes(storageInfo.quota)}
              </span>
            </div>
            
            <div className="space-y-1">
              <Progress 
                value={(storageInfo.usage / storageInfo.quota) * 100} 
                className="h-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{((storageInfo.usage / storageInfo.quota) * 100).toFixed(1)}% used</span>
                <span>{formatBytes(storageInfo.quota - storageInfo.usage)} available</span>
              </div>
            </div>

            {Object.keys(storageInfo.usageDetails).length > 0 && (
              <div className="pt-2 space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Breakdown:</p>
                {Object.entries(storageInfo.usageDetails).map(([key, value]) => (
                  <div key={key} className="flex justify-between text-xs">
                    <span className="capitalize">{key}:</span>
                    <span>{formatBytes(value)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Update Section */}
        {hasUpdate && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <RefreshCw className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-blue-900">Update Available</h4>
                <p className="text-sm text-blue-700 mt-1">
                  A new version of the app is ready. Update now to get the latest features and improvements.
                </p>
                <div className="flex gap-2 mt-3">
                  <Button
                    onClick={updateApp}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Update Now
                  </Button>
                  <Button size="sm" variant="outline">
                    View Changes
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Last Updated */}
        <div className="pt-2 border-t">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>Last updated: {new Date().toLocaleString()}</span>
            </div>
            <Button
              onClick={() => window.location.reload()}
              size="sm"
              variant="ghost"
              className="h-6 text-xs"
            >
              Refresh
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}