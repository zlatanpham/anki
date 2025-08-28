"use client";

import { useState } from "react";
import { 
  Bell, 
  User, 
  Shield, 
  Smartphone,
  Globe,
  Palette,
  Database
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { NotificationPreferences } from "@/components/pwa/NotificationPreferences";
import { PWAStatus } from "@/components/pwa/PWAStatus";
import { NotificationAnalytics } from "@/components/pwa/NotificationAnalytics";
import { Badge } from "@/components/ui/badge";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("notifications");

  return (
    <div className="container mx-auto max-w-4xl px-4 py-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your preferences and configure your learning experience.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-7">
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="pwa" className="flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            <span className="hidden sm:inline">PWA</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            <span className="hidden sm:inline">Analytics</span>
          </TabsTrigger>
          <TabsTrigger value="account" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Account</span>
          </TabsTrigger>
          <TabsTrigger value="privacy" className="flex items-center gap-2 hidden lg:flex">
            <Shield className="h-4 w-4" />
            <span>Privacy</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="flex items-center gap-2 hidden lg:flex">
            <Palette className="h-4 w-4" />
            <span>Theme</span>
          </TabsTrigger>
          <TabsTrigger value="general" className="flex items-center gap-2 hidden lg:flex">
            <Globe className="h-4 w-4" />
            <span>General</span>
          </TabsTrigger>
        </TabsList>

        <div className="mt-8">
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Push Notifications
                  <Badge variant="secondary" className="ml-2">
                    Smart Reminders
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Configure intelligent notifications to enhance your learning experience.
                  Notifications are optimized based on spaced repetition principles and your study patterns.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <NotificationPreferences />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pwa" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5" />
                  Progressive Web App
                  <Badge variant="secondary" className="ml-2">
                    Offline Ready
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Manage your PWA installation and offline capabilities.
                  Install the app on your device for a native-like experience.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PWAStatus />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Notification Analytics
                  <Badge variant="secondary" className="ml-2">
                    Performance Insights
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Track the effectiveness of your notification settings and optimize your learning schedule.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <NotificationAnalytics />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="account" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Account Settings
                </CardTitle>
                <CardDescription>
                  Manage your account information and preferences.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    Account settings will be available here. This includes profile information,
                    password management, and account deletion options.
                  </p>
                  <Badge variant="outline">Coming Soon</Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="privacy" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Privacy Settings
                </CardTitle>
                <CardDescription>
                  Control your privacy and data sharing preferences.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    Privacy settings will include data export, deletion options, 
                    analytics opt-out, and GDPR compliance controls.
                  </p>
                  <Badge variant="outline">Coming Soon</Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="appearance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Appearance & Theme
                </CardTitle>
                <CardDescription>
                  Customize the look and feel of your learning environment.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    Theme settings will include light/dark mode toggle, color schemes,
                    font size adjustments, and accessibility options.
                  </p>
                  <Badge variant="outline">Coming Soon</Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  General Settings
                </CardTitle>
                <CardDescription>
                  Configure general application preferences and behavior.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    General settings will include language preferences, timezone settings,
                    default study session configurations, and keyboard shortcuts.
                  </p>
                  <Badge variant="outline">Coming Soon</Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}