'use client';

/**
 * Notification Preferences Component
 * 
 * Provides a comprehensive interface for users to manage their push notification
 * preferences with granular controls and intelligent defaults.
 */

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  Bell, 
  Clock, 
  Moon, 
  Target, 
  TrendingUp, 
  BookOpen,
  Settings,
  TestTube,
  Save,
  AlertCircle
} from 'lucide-react';
import { usePWA } from './PWAProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { api } from '@/trpc/react';

interface NotificationPreferencesProps {
  className?: string;
}

export function NotificationPreferences({ className = '' }: NotificationPreferencesProps) {
  const { data: session, status } = useSession();
  const isAuthenticated = status === 'authenticated' && !!session?.user;
  const { isPushSupported, isPushSubscribed, subscribeToPush, unsubscribeFromPush } = usePWA();
  
  // API queries and mutations (only when authenticated)
  const { data: preferences, refetch } = api.notifications.getPreferences.useQuery(undefined, {
    enabled: status === 'authenticated' && !!session?.user,
    retry: false
  });
  const { data: subscriptions } = api.notifications.getSubscriptions.useQuery(undefined, {
    enabled: status === 'authenticated' && !!session?.user,
    retry: false
  });
  const updatePreferences = api.notifications.updatePreferences.useMutation();
  const sendTestNotification = api.notifications.sendTestNotification.useMutation();

  // Form state
  const [formData, setFormData] = useState({
    isEnabled: true,
    dueCardsEnabled: true,
    streakProtectionEnabled: true,
    milestoneEnabled: true,
    deckSpecificEnabled: false,
    preferredTime: '',
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    quietHoursStart: '',
    quietHoursEnd: '',
    maxDailyNotifications: 1,
    minIntervalMinutes: 60,
    deckNotifications: {} as Record<string, { enabled: boolean; threshold: number }>,
  });

  const [hasChanges, setHasChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize form with current preferences
  useEffect(() => {
    if (preferences) {
      setFormData({
        isEnabled: preferences.isEnabled,
        dueCardsEnabled: preferences.dueCardsEnabled,
        streakProtectionEnabled: preferences.streakProtectionEnabled,
        milestoneEnabled: preferences.milestoneEnabled,
        deckSpecificEnabled: preferences.deckSpecificEnabled,
        preferredTime: preferences.preferredTime || '',
        timeZone: preferences.timeZone,
        quietHoursStart: preferences.quietHoursStart || '',
        quietHoursEnd: preferences.quietHoursEnd || '',
        maxDailyNotifications: preferences.maxDailyNotifications,
        minIntervalMinutes: preferences.minIntervalMinutes,
        deckNotifications: preferences.deckNotifications as Record<string, { enabled: boolean; threshold: number }>,
      });
    }
  }, [preferences]);

  // Handle form field changes
  const handleFieldChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setHasChanges(true);
  };

  // Handle push notification toggle
  const handlePushToggle = async (enabled: boolean) => {
    // Check authentication first
    if (!isAuthenticated) {
      toast.error('Please log in to manage push notifications');
      return;
    }

    setIsLoading(true);
    
    try {
      if (enabled && !isPushSubscribed) {
        const success = await subscribeToPush();
        if (success) {
          handleFieldChange('isEnabled', true);
          toast.success('Push notifications enabled successfully!');
        }
      } else if (!enabled && isPushSubscribed) {
        const success = await unsubscribeFromPush();
        if (success) {
          handleFieldChange('isEnabled', false);
          toast.success('Push notifications disabled');
        }
      } else {
        handleFieldChange('isEnabled', enabled);
      }
    } catch (error) {
      console.error('Push notification toggle error:', error);
      toast.error('Failed to update push notification settings');
    } finally {
      setIsLoading(false);
    }
  };

  // Save preferences
  const handleSave = async () => {
    if (!hasChanges) return;
    
    setIsLoading(true);
    
    try {
      await updatePreferences.mutateAsync(formData);
      setHasChanges(false);
      await refetch();
      toast.success('Notification preferences saved successfully!');
    } catch (error) {
      toast.error('Failed to save preferences');
    } finally {
      setIsLoading(false);
    }
  };

  // Send test notification
  const handleTestNotification = async () => {
    if (!isAuthenticated) {
      toast.error('Please log in to send test notifications');
      return;
    }

    if (!isPushSubscribed) {
      toast.error('Please enable push notifications first');
      return;
    }

    setIsLoading(true);
    
    try {
      await sendTestNotification.mutateAsync();
      toast.success('Test notification sent! Check your device.');
    } catch (error) {
      console.error('Test notification error:', error);
      toast.error('Failed to send test notification');
    } finally {
      setIsLoading(false);
    }
  };

  // Generate time options
  const generateTimeOptions = () => {
    const times = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const display = new Date(`2000-01-01T${time}`).toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
        times.push({ value: time, display });
      }
    }
    return times;
  };

  const timeOptions = generateTimeOptions();

  if (!isPushSupported) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Push Notifications
          </CardTitle>
          <CardDescription>
            Configure when and how you receive study reminders
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Push notifications are not supported in your current browser or device.
              Try using a modern browser like Chrome, Firefox, or Safari.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Push Notifications
          {isPushSubscribed && (
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              Enabled
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Configure intelligent study reminders to enhance your learning
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="timing">Timing</TabsTrigger>
            <TabsTrigger value="types">Types</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          {/* General Settings */}
          <TabsContent value="general" className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-base font-medium">Enable Push Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive intelligent study reminders on your device
                </p>
              </div>
              <Switch
                checked={formData.isEnabled && isPushSubscribed}
                onCheckedChange={handlePushToggle}
                disabled={isLoading}
              />
            </div>

            {isPushSubscribed && (
              <>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      Daily Notification Limit
                    </Label>
                    <div className="px-3">
                      <Slider
                        value={[formData.maxDailyNotifications]}
                        onValueChange={(value) => handleFieldChange('maxDailyNotifications', value[0])}
                        max={5}
                        min={1}
                        step={1}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>1 notification</span>
                        <span className="font-medium">{formData.maxDailyNotifications} per day</span>
                        <span>5 notifications</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Minimum Interval Between Notifications</Label>
                    <Select
                      value={formData.minIntervalMinutes.toString()}
                      onValueChange={(value) => handleFieldChange('minIntervalMinutes', parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 minutes</SelectItem>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="60">1 hour</SelectItem>
                        <SelectItem value="120">2 hours</SelectItem>
                        <SelectItem value="240">4 hours</SelectItem>
                        <SelectItem value="480">8 hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="pt-4">
                  <Button
                    onClick={handleTestNotification}
                    variant="outline"
                    disabled={isLoading}
                    className="flex items-center gap-2"
                  >
                    <TestTube className="w-4 h-4" />
                    Send Test Notification
                  </Button>
                </div>
              </>
            )}

            {subscriptions && subscriptions.subscriptions.length > 0 && (
              <div className="space-y-2">
                <Label>Active Subscriptions</Label>
                <div className="space-y-2">
                  {subscriptions.subscriptions.map((sub, index) => (
                    <div key={sub.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium">Device {index + 1}</p>
                        <p className="text-xs text-muted-foreground">
                          {sub.userAgent ? sub.userAgent.split(' ')[0] : 'Unknown browser'}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-green-700 border-green-300">
                        Active
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Timing Settings */}
          <TabsContent value="timing" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Preferred Notification Time
                </Label>
                <Select
                  value={formData.preferredTime}
                  onValueChange={(value) => handleFieldChange('preferredTime', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Auto-detect from study pattern" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeOptions.map((time) => (
                      <SelectItem key={time.value} value={time.value}>
                        {time.display}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Leave empty to use your typical study time
                </p>
              </div>

              <div className="space-y-2">
                <Label>Time Zone</Label>
                <Input
                  value={formData.timeZone}
                  onChange={(e) => handleFieldChange('timeZone', e.target.value)}
                  placeholder="Auto-detected"
                  disabled
                />
              </div>
            </div>

            <div className="space-y-4">
              <Label className="flex items-center gap-2">
                <Moon className="w-4 h-4" />
                Quiet Hours
              </Label>
              <p className="text-sm text-muted-foreground">
                No notifications will be sent during these hours
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm">Start Time</Label>
                  <Select
                    value={formData.quietHoursStart}
                    onValueChange={(value) => handleFieldChange('quietHoursStart', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="No quiet hours" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeOptions.map((time) => (
                        <SelectItem key={time.value} value={time.value}>
                          {time.display}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">End Time</Label>
                  <Select
                    value={formData.quietHoursEnd}
                    onValueChange={(value) => handleFieldChange('quietHoursEnd', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="No quiet hours" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeOptions.map((time) => (
                        <SelectItem key={time.value} value={time.value}>
                          {time.display}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Notification Types */}
          <TabsContent value="types" className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    Due Cards Notifications
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified when you have cards ready for review
                  </p>
                </div>
                <Switch
                  checked={formData.dueCardsEnabled}
                  onCheckedChange={(value) => handleFieldChange('dueCardsEnabled', value)}
                  disabled={!formData.isEnabled}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Streak Protection
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Gentle reminders to maintain your study streak
                  </p>
                </div>
                <Switch
                  checked={formData.streakProtectionEnabled}
                  onCheckedChange={(value) => handleFieldChange('streakProtectionEnabled', value)}
                  disabled={!formData.isEnabled}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Milestone Celebrations
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Celebrate your learning achievements and milestones
                  </p>
                </div>
                <Switch
                  checked={formData.milestoneEnabled}
                  onCheckedChange={(value) => handleFieldChange('milestoneEnabled', value)}
                  disabled={!formData.isEnabled}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Deck-Specific Notifications
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Custom notifications for individual decks
                  </p>
                </div>
                <Switch
                  checked={formData.deckSpecificEnabled}
                  onCheckedChange={(value) => handleFieldChange('deckSpecificEnabled', value)}
                  disabled={!formData.isEnabled}
                />
              </div>
            </div>
          </TabsContent>

          {/* Advanced Settings */}
          <TabsContent value="advanced" className="space-y-6">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                These settings affect the intelligent scheduling algorithm. Changes may impact 
                notification timing effectiveness.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Notification Priority</Label>
                <Select defaultValue="normal">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low - Less intrusive</SelectItem>
                    <SelectItem value="normal">Normal - Balanced</SelectItem>
                    <SelectItem value="high">High - More urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Effectiveness Optimization</Label>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Learn from my study patterns</span>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Adjust timing based on response</span>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Consider forgetting curve</span>
                    <Switch defaultChecked />
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Save Button */}
        <div className="flex justify-end pt-6 border-t">
          <Button
            onClick={handleSave}
            disabled={!hasChanges || isLoading}
            className="flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {isLoading ? 'Saving...' : 'Save Preferences'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}