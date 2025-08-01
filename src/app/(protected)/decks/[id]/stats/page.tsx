"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
  FileText,
  PieChart as PieChartIcon,
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
  LineChart,
  Line,
} from "recharts";

type TimePeriod = "today" | "week" | "month" | "all";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export default function DeckStatsPage() {
  const params = useParams();
  const router = useRouter();
  const deckId = params.id as string;
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>("week");

  // Get deck info
  const { data: deck } = api.deck.getById.useQuery({ id: deckId });

  // Get deck statistics
  const { data: deckStats } = api.study.getDeckStats.useQuery({
    deckId,
    period: selectedPeriod,
  });

  // Get deck activity data
  const { data: activityData } = api.study.getDeckActivity.useQuery({
    deckId,
    period: selectedPeriod,
  });

  // Get card performance data
  const { data: cardPerformance } = api.study.getDeckCardPerformance.useQuery({
    deckId,
  });

  // Get review distribution
  const { data: reviewDistribution } = api.study.getDeckReviewDistribution.useQuery({
    deckId,
    period: selectedPeriod,
  });

  if (!deck) {
    return (
      <div className="container mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <Card>
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Deck Not Found</h2>
            <p className="text-muted-foreground mb-4">
              The deck you're looking for doesn't exist or you don't have access to it.
            </p>
            <Button onClick={() => router.push("/decks")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Decks
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const prepareActivityData = () => {
    if (!activityData) return [];
    
    return activityData.map((day) => ({
      date: new Date(day.date).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      }),
      reviews: day.reviews ?? 0,
      timeSpent: Math.round((day.averageTime ?? 0) / 1000 / 60), // Convert to minutes
    }));
  };

  const prepareReviewDistributionData = () => {
    if (!reviewDistribution) return [];
    
    return [
      { name: 'Again', value: reviewDistribution.again || 0, color: '#FF6B6B' },
      { name: 'Hard', value: reviewDistribution.hard || 0, color: '#FFA726' },
      { name: 'Good', value: reviewDistribution.good || 0, color: '#66BB6A' },
      { name: 'Easy', value: reviewDistribution.easy || 0, color: '#42A5F5' },
    ].filter(item => item.value > 0);
  };

  const prepareCardTypeData = () => {
    if (!deck.cards) return [];
    
    const basicCards = deck.cards.filter((card: any) => card.card_type === 'BASIC').length;
    const clozeCards = deck.cards.filter((card: any) => card.card_type === 'CLOZE').length;
    
    return [
      { name: 'Basic Cards', value: basicCards, color: '#0088FE' },
      { name: 'Cloze Cards', value: clozeCards, color: '#00C49F' },
    ].filter(item => item.value > 0);
  };

  return (
    <div className="container mx-auto px-4 py-6 sm:px-6 lg:px-8 max-w-7xl">
      {/* Header - Mobile-first responsive design */}
      <div className="mb-6 lg:mb-8">
        {/* Back button - Better touch target on mobile */}
        <Button
          variant="ghost"
          onClick={() => router.push(`/decks/${deckId}/cards`)}
          className="mb-3 -ml-2 pl-2"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          <span className="font-medium">Back to Cards</span>
        </Button>
        
        {/* Title section - Responsive sizing and spacing */}
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl lg:text-2xl font-semibold tracking-tight flex items-center gap-2">
            <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6" />
            {deck.name} Statistics
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Detailed performance insights for this deck
          </p>
        </div>
      </div>
      
      {/* Period selector */}
      <div className="flex items-center gap-2 mb-6">
        <span className="text-sm font-medium text-muted-foreground">Period:</span>
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

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Cards</p>
                <p className="text-2xl font-bold">{deck.cards?.length || 0}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Reviews</p>
                <p className="text-2xl font-bold text-green-600">
                  {deckStats?.totalReviews || 0}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Accuracy</p>
                <p className="text-2xl font-bold text-purple-600">
                  {deckStats?.accuracy ? `${Math.round(deckStats.accuracy)}%` : '0%'}
                </p>
              </div>
              <Target className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Study Time</p>
                <p className="text-2xl font-bold text-orange-600">
                  {deckStats?.totalTimeMinutes ? `${Math.round(deckStats.totalTimeMinutes)}m` : '0m'}
                </p>
              </div>
              <Clock className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Review Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="w-5 h-5" />
                  Review Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={prepareReviewDistributionData()}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                      >
                        {prepareReviewDistributionData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Card Types */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5" />
                  Card Types
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={prepareCardTypeData()}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {prepareCardTypeData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Deck Information */}
          <Card>
            <CardHeader>
              <CardTitle>Deck Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Name</label>
                    <p className="text-lg font-semibold">{deck.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Description</label>
                    <p className="text-sm">{deck.description || 'No description provided'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Visibility</label>
                    <Badge variant={deck.is_public ? "default" : "secondary"}>
                      {deck.is_public ? "Public" : "Private"}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Created</label>
                    <p className="text-sm">{new Date(deck.created_at).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
                    <p className="text-sm">{new Date(deck.updated_at).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Total Cards</label>
                    <p className="text-lg font-semibold">{deck.cards?.length || 0}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Study Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={prepareActivityData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Area 
                      type="monotone" 
                      dataKey="reviews" 
                      stroke="#8884d8" 
                      fill="#8884d8" 
                      fillOpacity={0.3}
                      name="Reviews"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Time Spent per Day
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={prepareActivityData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`${value} minutes`, 'Study Time']} />
                    <Bar dataKey="timeSpent" fill="#82ca9d" name="Study Time (minutes)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Accuracy Rate</span>
                  <Badge variant="outline">
                    {deckStats?.accuracy ? `${Math.round(deckStats.accuracy)}%` : '0%'}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Average Response Time</span>
                  <Badge variant="outline">
                    {deckStats?.averageResponseTime ? `${Math.round(deckStats.averageResponseTime / 1000)}s` : '0s'}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Cards Mastered</span>
                  <Badge variant="outline">
                    {deckStats?.masteredCards || 0}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Cards Learning</span>
                  <Badge variant="outline">
                    {deckStats?.learningCards || 0}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Study Streak</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Flame className="w-8 h-8 text-orange-500" />
                    <span className="text-3xl font-bold text-orange-500">
                      {deckStats?.currentStreak || 0}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">Current Streak (days)</p>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Best Streak</span>
                    <span className="text-sm font-medium">{deckStats?.bestStreak || 0} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Study Days</span>
                    <span className="text-sm font-medium">{deckStats?.studyDays || 0} days</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  Achievements
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {(deckStats?.totalReviews || 0) >= 100 && (
                    <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
                      <Award className="w-6 h-6 text-yellow-600" />
                      <div>
                        <p className="font-medium text-yellow-900">Century Club</p>
                        <p className="text-sm text-yellow-700">Completed 100+ reviews</p>
                      </div>
                    </div>
                  )}
                  {(deckStats?.currentStreak || 0) >= 7 && (
                    <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
                      <Flame className="w-6 h-6 text-orange-600" />
                      <div>
                        <p className="font-medium text-orange-900">Week Warrior</p>
                        <p className="text-sm text-orange-700">7+ day study streak</p>
                      </div>
                    </div>
                  )}
                  {(deckStats?.accuracy || 0) >= 90 && (
                    <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                      <Target className="w-6 h-6 text-green-600" />
                      <div>
                        <p className="font-medium text-green-900">Accuracy Expert</p>
                        <p className="text-sm text-green-700">90%+ accuracy rate</p>
                      </div>
                    </div>
                  )}
                  {!((deckStats?.totalReviews ?? 0) >= 100 || (deckStats?.currentStreak ?? 0) >= 7 || (deckStats?.accuracy ?? 0) >= 90) && (
                    <p className="text-muted-foreground text-center py-8">
                      Keep studying to unlock achievements!
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Study Recommendations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {(deckStats?.accuracy || 0) < 70 && (
                    <div className="p-3 bg-red-50 rounded-lg">
                      <p className="font-medium text-red-900">Focus on Accuracy</p>
                      <p className="text-sm text-red-700">
                        Your accuracy is below 70%. Consider reviewing difficult cards more frequently.
                      </p>
                    </div>
                  )}
                  {(deckStats?.currentStreak || 0) === 0 && (
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="font-medium text-blue-900">Build a Study Habit</p>
                      <p className="text-sm text-blue-700">
                        Start studying daily to build a consistent learning habit.
                      </p>
                    </div>
                  )}
                  {(deckStats?.totalReviews || 0) < 10 && (
                    <div className="p-3 bg-purple-50 rounded-lg">
                      <p className="font-medium text-purple-900">Get Started</p>
                      <p className="text-sm text-purple-700">
                        You're just getting started! Try to complete at least 10 reviews to see your progress.
                      </p>
                    </div>
                  )}
                  {(deckStats?.accuracy || 0) >= 90 && (deckStats?.currentStreak || 0) >= 7 && (
                    <div className="p-3 bg-green-50 rounded-lg">
                      <p className="font-medium text-green-900">Excellent Progress!</p>
                      <p className="text-sm text-green-700">
                        You're doing great! Keep up the consistent study habit.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Link href={`/decks/${deckId}/study`}>
              <Button>
                <Brain className="w-4 h-4 mr-2" />
                Study This Deck
              </Button>
            </Link>
            <Link href={`/decks/${deckId}/cards`}>
              <Button variant="outline">
                <FileText className="w-4 h-4 mr-2" />
                View Cards
              </Button>
            </Link>
            <Link href={`/decks/${deckId}/edit`}>
              <Button variant="outline">
                Edit Deck
              </Button>
            </Link>
            <Link href="/stats">
              <Button variant="outline">
                <BarChart3 className="w-4 h-4 mr-2" />
                Global Stats
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}