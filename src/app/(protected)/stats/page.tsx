"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/trpc/react";
import Link from "next/link";
import {
  ArrowLeft,
  TrendingUp,
  Clock,
  Target,
  Calendar,
  BarChart3,
  Flame,
  Award,
  Brain,
  CheckCircle,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

type TimePeriod = "today" | "week" | "month" | "all";

export default function StatisticsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>("week");
  const [selectedDeck, setSelectedDeck] = useState<string>("all");
  const [hasInitialData, setHasInitialData] = useState(false);
  const isMobile = useIsMobile();

  // Get all decks for selection
  const { data: decksData } = api.deck.getAll.useQuery({ limit: 100 });

  // Get study statistics - we'll manage the loading state manually
  const studyStatsQuery = api.study.getStudyStats.useQuery(
    {
      period: selectedPeriod,
      deckId: selectedDeck === "all" ? undefined : selectedDeck,
    }
  );

  // Get due cards count
  const dueCardsQuery = api.study.getDueCardsCount.useQuery(
    {
      deckId: selectedDeck === "all" ? undefined : selectedDeck,
    }
  );

  // Set hasInitialData once we have data
  React.useEffect(() => {
    if (studyStatsQuery.data && !hasInitialData) {
      setHasInitialData(true);
    }
  }, [studyStatsQuery.data, hasInitialData]);

  const studyStats = studyStatsQuery.data;
  const dueCardsCount = dueCardsQuery.data;
  const isLoadingStats = studyStatsQuery.isLoading;
  const isFetchingStats = studyStatsQuery.isFetching;
  const isFetchingDue = dueCardsQuery.isFetching;

  // Mock data for charts (in a real app, this would come from the API)
  const activityData = [
    { date: "Mon", reviews: 15, accuracy: 85 },
    { date: "Tue", reviews: 22, accuracy: 78 },
    { date: "Wed", reviews: 18, accuracy: 92 },
    { date: "Thu", reviews: 25, accuracy: 88 },
    { date: "Fri", reviews: 30, accuracy: 82 },
    { date: "Sat", reviews: 12, accuracy: 95 },
    { date: "Sun", reviews: 8, accuracy: 90 },
  ];

  const performanceData = studyStats ? [
    { name: "Again", value: studyStats.ratingBreakdown.AGAIN, color: "#ef4444" },
    { name: "Hard", value: studyStats.ratingBreakdown.HARD, color: "#f97316" },
    { name: "Good", value: studyStats.ratingBreakdown.GOOD, color: "#22c55e" },
    { name: "Easy", value: studyStats.ratingBreakdown.EASY, color: "#3b82f6" },
  ] : [];

  const cardStateData = dueCardsCount ? [
    { name: "New", value: dueCardsCount.newCards, color: "#6366f1" },
    { name: "Learning", value: dueCardsCount.learningCards, color: "#f59e0b" },
    { name: "Review", value: dueCardsCount.reviewCards, color: "#10b981" },
  ] : [];

  // Only show full page loading on initial load
  if (isLoadingStats && !hasInitialData) {
    return (
      <div className="container mx-auto px-4 py-6 sm:px-6 lg:px-8 max-w-7xl">
        {/* Header skeleton */}
        <div className="mb-6 lg:mb-8">
          <Skeleton className="h-4 w-24 mb-3" />
          <div className="space-y-1">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
        </div>

        {/* Filters skeleton */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-10" />
            <Skeleton className="h-10 w-48" />
          </div>
        </div>

        {/* Key Metrics skeleton */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-1" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs skeleton */}
        <div className="space-y-6">
          <Skeleton className="h-10 w-full max-w-md" />
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-[300px] w-full" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-[300px] w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-4 sm:py-6 sm:px-6 lg:px-8 max-w-7xl">
      {/* Header - Mobile-first responsive design */}
      {!isMobile && (
        <div className="mb-6 lg:mb-8">
          {/* Back button - Better touch target on mobile */}
          <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-3">
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            <span className="font-medium">Dashboard</span>
          </Link>
          
          {/* Title section - Responsive sizing and spacing */}
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl lg:text-2xl font-semibold tracking-tight">
              Learning Statistics
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl">
              Track your progress and analyze your learning patterns
            </p>
          </div>
        </div>
      )}

      {/* Filters - Responsive layout */}
      <div className={cn(
        "flex gap-3 mb-6",
        isMobile ? "flex-col" : "flex-row sm:gap-4"
      )}>
        <div className={cn(
          "flex items-center gap-2",
          isMobile && "flex-1"
        )}>
          <span className="text-sm font-medium text-muted-foreground shrink-0">Period:</span>
          <Select value={selectedPeriod} onValueChange={(value: TimePeriod) => setSelectedPeriod(value)}>
            <SelectTrigger className={cn(
              isMobile ? "flex-1 min-w-0" : "w-32"
            )}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className={cn(
          "flex items-center gap-2",
          isMobile && "flex-1"
        )}>
          <span className="text-sm font-medium text-muted-foreground shrink-0">Deck:</span>
          <Select value={selectedDeck} onValueChange={setSelectedDeck}>
            <SelectTrigger className={cn(
              isMobile ? "flex-1 min-w-0" : "w-48"
            )}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Decks</SelectItem>
              {decksData?.decks.map((deck) => (
                <SelectItem key={deck.id} value={deck.id}>
                  {deck.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Loading indicator for filter changes */}
        {(isFetchingStats || isFetchingDue) && (
          <div className="flex items-center gap-2 ml-auto">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            <span className="text-sm text-muted-foreground">Updating...</span>
          </div>
        )}
      </div>

      {/* Key Metrics */}
      <div className={`grid gap-3 grid-cols-2 sm:gap-6 md:grid-cols-2 lg:grid-cols-4 mb-4 sm:mb-6 transition-opacity duration-200 ${
        isFetchingStats ? 'opacity-50' : 'opacity-100'
      }`}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Reviews</CardTitle>
            <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            <div className="text-xl sm:text-2xl font-bold">{studyStats?.totalReviews ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              {selectedPeriod === "today" ? "today" : `this ${selectedPeriod}`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Accuracy</CardTitle>
            <Target className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            <div className="text-xl sm:text-2xl font-bold">{studyStats?.accuracy ?? 0}%</div>
            <p className="text-xs text-muted-foreground">
              Success rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Study Streak</CardTitle>
            <Flame className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            <div className="text-xl sm:text-2xl font-bold">{studyStats?.studyStreak ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              consecutive days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Avg Time</CardTitle>
            <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            <div className="text-xl sm:text-2xl font-bold">
              {studyStats?.averageResponseTime ? Math.round(studyStats.averageResponseTime / 1000) : 0}s
            </div>
            <p className="text-xs text-muted-foreground">
              per card
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="activity" className={`space-y-6 transition-opacity duration-200 ${
        isFetchingStats || isFetchingDue ? 'opacity-50' : 'opacity-100'
      }`}>
        <div className={cn(
          "overflow-x-auto",
          isMobile && "-mx-4 px-4"
        )}>
          <TabsList className={cn(
            "inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
            isMobile ? "w-max min-w-full" : "grid w-full grid-cols-4"
          )}>
            <TabsTrigger 
              value="activity" 
              className={cn(
                "text-xs sm:text-sm",
                isMobile && "px-3 whitespace-nowrap"
              )}
            >
              Activity
            </TabsTrigger>
            <TabsTrigger 
              value="performance" 
              className={cn(
                "text-xs sm:text-sm",
                isMobile && "px-3 whitespace-nowrap"
              )}
            >
              Performance
            </TabsTrigger>
            <TabsTrigger 
              value="cards" 
              className={cn(
                "text-xs sm:text-sm",
                isMobile && "px-3 whitespace-nowrap"
              )}
            >
              Cards
            </TabsTrigger>
            <TabsTrigger 
              value="insights" 
              className={cn(
                "text-xs sm:text-sm",
                isMobile && "px-3 whitespace-nowrap"
              )}
            >
              Insights
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="activity" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Daily Activity</CardTitle>
              </CardHeader>
              <CardContent className={cn(
                isMobile ? "px-1 sm:px-6" : "px-2 sm:px-6"
              )}>
                <ResponsiveContainer width="100%" height={isMobile ? 200 : 300}>
                  <AreaChart 
                    data={activityData}
                    margin={{
                      top: 5,
                      right: isMobile ? 5 : 30,
                      left: isMobile ? 0 : 20,
                      bottom: 5
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: isMobile ? 10 : 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fontSize: isMobile ? 10 : 12 }}
                      axisLine={false}
                      tickLine={false}
                      width={isMobile ? 25 : 40}
                    />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="reviews"
                      stroke="#8884d8"
                      fill="#8884d8"
                      fillOpacity={0.6}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Daily Accuracy</CardTitle>
              </CardHeader>
              <CardContent className={cn(
                isMobile ? "px-1 sm:px-6" : "px-2 sm:px-6"
              )}>
                <ResponsiveContainer width="100%" height={isMobile ? 200 : 300}>
                  <AreaChart 
                    data={activityData}
                    margin={{
                      top: 5,
                      right: isMobile ? 5 : 30,
                      left: isMobile ? 0 : 20,
                      bottom: 5
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: isMobile ? 10 : 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      domain={[0, 100]} 
                      tick={{ fontSize: isMobile ? 10 : 12 }}
                      axisLine={false}
                      tickLine={false}
                      width={isMobile ? 25 : 40}
                    />
                    <Tooltip formatter={(value: number) => [`${value}%`, "Accuracy"]} />
                    <Area
                      type="monotone"
                      dataKey="accuracy"
                      stroke="#22c55e"
                      fill="#22c55e"
                      fillOpacity={0.6}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Review Ratings Distribution</CardTitle>
              </CardHeader>
              <CardContent className={cn(
                isMobile ? "px-1 sm:px-6" : "px-2 sm:px-6"
              )}>
                <ResponsiveContainer width="100%" height={isMobile ? 200 : 300}>
                  <RechartsPieChart
                    margin={{
                      top: 5,
                      right: 5,
                      left: 5,
                      bottom: 5
                    }}
                  >
                    <Pie
                      data={performanceData}
                      cx="50%"
                      cy="50%"
                      innerRadius={isMobile ? 40 : 60}
                      outerRadius={isMobile ? 70 : 100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {performanceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-4 mt-4 flex-wrap">
                  {performanceData.map((entry) => (
                    <div key={entry.name} className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded"
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className="text-sm">{entry.name}: {entry.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {performanceData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="font-medium">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{item.value}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {studyStats?.totalReviews ? Math.round((item.value / studyStats.totalReviews) * 100) : 0}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="cards" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Card States</CardTitle>
              </CardHeader>
              <CardContent className={cn(
                isMobile ? "px-1 sm:px-6" : "px-2 sm:px-6"
              )}>
                <ResponsiveContainer width="100%" height={isMobile ? 200 : 300}>
                  <BarChart 
                    data={cardStateData}
                    margin={{
                      top: 5,
                      right: isMobile ? 5 : 30,
                      left: isMobile ? 0 : 20,
                      bottom: 5
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: isMobile ? 10 : 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fontSize: isMobile ? 10 : 12 }}
                      axisLine={false}
                      tickLine={false}
                      width={isMobile ? 25 : 40}
                    />
                    <Tooltip />
                    <Bar dataKey="value" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Due Cards Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Brain className="h-5 w-5 text-blue-600" />
                    <span className="font-medium">New Cards</span>
                  </div>
                  <Badge className="bg-blue-600">{dueCardsCount?.newCards ?? 0}</Badge>
                </div>

                <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-orange-600" />
                    <span className="font-medium">Learning Cards</span>
                  </div>
                  <Badge className="bg-orange-600">{dueCardsCount?.learningCards ?? 0}</Badge>
                </div>

                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="font-medium">Review Cards</span>
                  </div>
                  <Badge className="bg-green-600">{dueCardsCount?.reviewCards ?? 0}</Badge>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Total Due</span>
                    <Badge variant="default" className="text-lg px-3 py-1">
                      {dueCardsCount?.totalDue ?? 0}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Study Insights</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-800">Strong Performance</p>
                    <p className="text-sm text-green-700">
                      Your accuracy rate of {studyStats?.accuracy ?? 0}% shows excellent retention.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
                  <Flame className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-800">Consistency Streak</p>
                    <p className="text-sm text-blue-700">
                      You&apos;ve studied for {studyStats?.studyStreak ?? 0} consecutive days. Keep it up!
                    </p>
                  </div>
                </div>

                {studyStats?.averageResponseTime && studyStats.averageResponseTime > 5000 && (
                  <div className="flex items-start gap-3 p-4 bg-yellow-50 rounded-lg">
                    <Clock className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-yellow-800">Response Time</p>
                      <p className="text-sm text-yellow-700">
                        Consider reviewing cards more quickly to improve your recall speed.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recommendations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {dueCardsCount && dueCardsCount.totalDue > 0 && (
                  <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-lg">
                    <Award className="h-5 w-5 text-purple-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-purple-800">Cards Ready</p>
                      <p className="text-sm text-purple-700">
                        You have {dueCardsCount.totalDue} cards ready for review. Perfect time to study!
                      </p>
                      <Link href="/study" className="inline-block mt-2">
                        <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                          Start Studying
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3 p-4 bg-indigo-50 rounded-lg">
                  <Calendar className="h-5 w-5 text-indigo-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-indigo-800">Daily Goal</p>
                    <p className="text-sm text-indigo-700">
                      Aim for 20-30 reviews per day for optimal spaced repetition benefits.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}