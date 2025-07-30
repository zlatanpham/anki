"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

type TimePeriod = "today" | "week" | "month" | "all";

export default function StatisticsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>("week");
  const [selectedDeck, setSelectedDeck] = useState<string>("all");

  // Get all decks for selection
  const { data: decksData } = api.deck.getAll.useQuery({ limit: 100 });

  // Get study statistics
  const { data: studyStats, isLoading: isLoadingStats } = api.study.getStudyStats.useQuery({
    period: selectedPeriod,
    deckId: selectedDeck === "all" ? undefined : selectedDeck,
  });

  // Get due cards count
  const { data: dueCardsCount } = api.study.getDueCardsCount.useQuery({
    deckId: selectedDeck === "all" ? undefined : selectedDeck,
  });

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

  if (isLoadingStats) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading statistics...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Learning Statistics</h1>
          <p className="text-muted-foreground">
            Track your progress and analyze your learning patterns
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Period:</span>
          <Select value={selectedPeriod} onValueChange={(value: TimePeriod) => setSelectedPeriod(value)}>
            <SelectTrigger className="w-32">
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

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Deck:</span>
          <Select value={selectedDeck} onValueChange={setSelectedDeck}>
            <SelectTrigger className="w-48">
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
      </div>

      {/* Key Metrics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reviews</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{studyStats?.totalReviews || 0}</div>
            <p className="text-xs text-muted-foreground">
              {selectedPeriod === "today" ? "today" : `this ${selectedPeriod}`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Accuracy</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{studyStats?.accuracy || 0}%</div>
            <p className="text-xs text-muted-foreground">
              Success rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Study Streak</CardTitle>
            <Flame className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{studyStats?.studyStreak || 0}</div>
            <p className="text-xs text-muted-foreground">
              consecutive days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {studyStats?.averageResponseTime ? Math.round(studyStats.averageResponseTime / 1000) : 0}s
            </div>
            <p className="text-xs text-muted-foreground">
              per card
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="activity" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="cards">Card States</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="activity" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Daily Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={activityData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
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
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={activityData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip formatter={(value) => [`${value}%`, "Accuracy"]} />
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
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={performanceData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
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
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={cardStateData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
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
                  <Badge className="bg-blue-600">{dueCardsCount?.newCards || 0}</Badge>
                </div>

                <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-orange-600" />
                    <span className="font-medium">Learning Cards</span>
                  </div>
                  <Badge className="bg-orange-600">{dueCardsCount?.learningCards || 0}</Badge>
                </div>

                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="font-medium">Review Cards</span>
                  </div>
                  <Badge className="bg-green-600">{dueCardsCount?.reviewCards || 0}</Badge>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Total Due</span>
                    <Badge variant="default" className="text-lg px-3 py-1">
                      {dueCardsCount?.totalDue || 0}
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
                      Your accuracy rate of {studyStats?.accuracy || 0}% shows excellent retention.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
                  <Flame className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-800">Consistency Streak</p>
                    <p className="text-sm text-blue-700">
                      You've studied for {studyStats?.studyStreak || 0} consecutive days. Keep it up!
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