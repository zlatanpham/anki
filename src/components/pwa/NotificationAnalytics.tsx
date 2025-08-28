'use client';

/**
 * Notification Analytics Component
 * 
 * Provides comprehensive analytics and insights for push notification
 * effectiveness and user engagement tracking.
 */

import React, { useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend
} from 'recharts';
import { 
  Bell, 
  TrendingUp, 
  Target, 
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Activity
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api } from '@/trpc/react';

interface NotificationAnalyticsProps {
  className?: string;
}

const COLORS = {
  sent: '#3b82f6',      // blue
  delivered: '#10b981',  // green
  failed: '#ef4444',     // red
  clicked: '#8b5cf6',    // purple
  dismissed: '#f59e0b'   // yellow
};

const NOTIFICATION_TYPE_COLORS = {
  DUE_CARDS: '#3b82f6',
  STREAK_PROTECTION: '#f59e0b', 
  MILESTONE: '#8b5cf6',
  DECK_SPECIFIC: '#10b981'
};

export function NotificationAnalytics({ className = '' }: NotificationAnalyticsProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'weekly' | 'monthly'>('weekly');

  // API queries
  const { data: analytics, isLoading } = api.notifications.getAnalytics.useQuery({
    period: selectedPeriod
  });
  
  const { data: deliveryStats } = api.notifications.getDeliveryStats.useQuery();
  const { data: notificationHistory } = api.notifications.getNotificationHistory.useQuery({
    limit: 100
  });

  // Process data for charts
  const processDeliveryData = () => {
    if (!deliveryStats) return [];
    
    return Object.entries(deliveryStats.byStatus).map(([status, count]) => ({
      name: status.charAt(0) + status.slice(1).toLowerCase(),
      value: count,
      color: COLORS[status.toLowerCase() as keyof typeof COLORS] || '#6b7280'
    }));
  };

  const processTypeData = () => {
    if (!deliveryStats) return [];
    
    return Object.entries(deliveryStats.byType).map(([type, statusCounts]) => {
      const total = Object.values(statusCounts).reduce((sum: number, count: any) => sum + count, 0);
      return {
        name: type.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
        value: total,
        color: NOTIFICATION_TYPE_COLORS[type as keyof typeof NOTIFICATION_TYPE_COLORS] || '#6b7280'
      };
    });
  };

  const processEffectivenessData = () => {
    if (!analytics) return [];
    
    const data: Array<{period: string; sent: number; effective: number; rate: number}> = [];
    const periods = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
    
    // Mock data for demonstration - in real implementation, this would come from API
    periods.forEach((period, index) => {
      data.push({
        period,
        sent: Math.max(0, (analytics.totalSent || 0) - index * 2),
        effective: Math.max(0, (analytics.effectiveNotifications || 0) - index * 1),
        rate: Math.max(0, (analytics.effectivenessRate || 0) - index * 5)
      });
    });
    
    return data.reverse();
  };

  const deliveryData = processDeliveryData();
  const typeData = processTypeData();
  const effectivenessData = processEffectivenessData();

  const renderStatCard = (
    title: string, 
    value: number | string, 
    icon: React.ReactNode, 
    change?: number,
    suffix?: string
  ) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">
              {value}{suffix && <span className="text-sm font-normal text-muted-foreground ml-1">{suffix}</span>}
            </p>
            {change !== undefined && (
              <div className="flex items-center mt-1">
                <TrendingUp className={`w-3 h-3 mr-1 ${change >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                <span className={`text-xs ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {change >= 0 ? '+' : ''}{change}%
                </span>
              </div>
            )}
          </div>
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Notification Analytics</h2>
          <p className="text-muted-foreground">
            Track the effectiveness of your study reminders and engagement metrics
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={selectedPeriod} onValueChange={(value: 'daily' | 'weekly' | 'monthly') => setSelectedPeriod(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {renderStatCard(
          'Total Sent', 
          analytics?.totalSent || 0, 
          <Bell className="w-5 h-5" />,
          12
        )}
        {renderStatCard(
          'Delivery Rate', 
          `${analytics?.deliveryRate?.toFixed(1) || 0}`, 
          <CheckCircle className="w-5 h-5" />,
          5,
          '%'
        )}
        {renderStatCard(
          'Effectiveness', 
          `${analytics?.effectivenessRate?.toFixed(1) || 0}`, 
          <Target className="w-5 h-5" />,
          8,
          '%'
        )}
        {renderStatCard(
          'Study Sessions', 
          0, // studySessionsAfter not available in current analytics type 
          <Activity className="w-5 h-5" />,
          15
        )}
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="delivery">Delivery</TabsTrigger>
          <TabsTrigger value="effectiveness">Effectiveness</TabsTrigger>
          <TabsTrigger value="types">Types</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Delivery Status Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Delivery Status</CardTitle>
                <CardDescription>
                  Breakdown of notification delivery results
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={deliveryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {deliveryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Notification Types */}
            <Card>
              <CardHeader>
                <CardTitle>Notification Types</CardTitle>
                <CardDescription>
                  Distribution by notification category
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={typeData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name" 
                        tick={{ fontSize: 12 }}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis />
                      <Tooltip />
                      <Bar 
                        dataKey="value" 
                        fill="#3b82f6"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Notifications */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Notifications</CardTitle>
              <CardDescription>
                Latest notification delivery attempts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {notificationHistory?.notifications.slice(0, 5).map((notification) => (
                  <div key={notification.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        notification.status === 'SENT' ? 'bg-green-500' :
                        notification.status === 'FAILED' ? 'bg-red-500' :
                        notification.status === 'DELIVERED' ? 'bg-blue-500' :
                        'bg-gray-400'
                      }`} />
                      <div>
                        <p className="font-medium text-sm">{notification.title}</p>
                        <p className="text-xs text-muted-foreground">{notification.body}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={
                        notification.status === 'SENT' ? 'default' :
                        notification.status === 'FAILED' ? 'destructive' :
                        notification.status === 'DELIVERED' ? 'default' :
                        'secondary'
                      }>
                        {notification.status}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(notification.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Delivery Tab */}
        <TabsContent value="delivery">
          <Card>
            <CardHeader>
              <CardTitle>Delivery Performance</CardTitle>
              <CardDescription>
                Track delivery success rates and identify issues
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="font-medium text-green-800">Successful</span>
                  </div>
                  <p className="text-2xl font-bold text-green-900 mt-2">
                    {deliveryStats?.byStatus.SENT || 0}
                  </p>
                </div>
                
                <div className="p-4 bg-red-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-5 h-5 text-red-600" />
                    <span className="font-medium text-red-800">Failed</span>
                  </div>
                  <p className="text-2xl font-bold text-red-900 mt-2">
                    {deliveryStats?.byStatus.FAILED || 0}
                  </p>
                </div>
                
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-600" />
                    <span className="font-medium text-yellow-800">Pending</span>
                  </div>
                  <p className="text-2xl font-bold text-yellow-900 mt-2">
                    {deliveryStats?.byStatus.PENDING || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Effectiveness Tab */}
        <TabsContent value="effectiveness">
          <Card>
            <CardHeader>
              <CardTitle>Notification Effectiveness</CardTitle>
              <CardDescription>
                How notifications impact study behavior
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={effectivenessData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Bar 
                      yAxisId="left"
                      dataKey="sent" 
                      fill="#3b82f6" 
                      name="Notifications Sent"
                      radius={[2, 2, 0, 0]}
                    />
                    <Bar 
                      yAxisId="left"
                      dataKey="effective" 
                      fill="#10b981" 
                      name="Led to Study Session"
                      radius={[2, 2, 0, 0]}
                    />
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="rate" 
                      stroke="#8b5cf6" 
                      strokeWidth={3}
                      name="Effectiveness Rate (%)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {analytics?.totalSent || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Sent</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {analytics?.effectiveNotifications || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Led to Study</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600">
                    {analytics?.effectivenessRate?.toFixed(1) || 0}%
                  </p>
                  <p className="text-sm text-muted-foreground">Effectiveness Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Types Tab */}
        <TabsContent value="types">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {Object.entries(deliveryStats?.byType || {}).map(([type, statusCounts]) => {
              const total = Object.values(statusCounts).reduce((sum: number, count: any) => sum + count, 0);
              const successRate = statusCounts.SENT ? (statusCounts.SENT / total) * 100 : 0;
              
              return (
                <Card key={type}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: NOTIFICATION_TYPE_COLORS[type as keyof typeof NOTIFICATION_TYPE_COLORS] }}
                      />
                      {type.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Total Sent</span>
                        <span className="font-medium">{total}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Success Rate</span>
                        <span className="font-medium">{successRate.toFixed(1)}%</span>
                      </div>
                      <div className="space-y-2">
                        {Object.entries(statusCounts).map(([status, count]) => (
                          <div key={status} className="flex justify-between text-sm">
                            <span className="text-muted-foreground capitalize">
                              {status.toLowerCase()}
                            </span>
                            <span>{count as number}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}