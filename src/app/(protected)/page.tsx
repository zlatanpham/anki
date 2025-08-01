"use client";

import { useSession } from "next-auth/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  Play,
  BarChart3,
  Plus,
} from "lucide-react";
import { api } from "@/trpc/react";
import Link from "next/link";
import { SkeletonDashboard } from "@/components/ui/skeleton-card";
import { ratingColors, ratingLabels } from "@/lib/theme";

export default function DashboardPage() {
  const { data: session } = useSession();

  const user = session?.user as { name?: string; email?: string };

  // Get due cards count for dashboard
  const { data: dueCardsCount, isLoading: isLoadingDue } = api.study.getDueCardsCount.useQuery({});

  // Get recent decks
  const { data: decksData, isLoading: isLoadingDecks } = api.deck.getAll.useQuery({ limit: 3 });

  // Get study stats for today
  const { data: studyStats, isLoading: isLoadingStats } = api.study.getStudyStats.useQuery({
    period: "today",
  });

  const isLoading = isLoadingDue || isLoadingDecks || isLoadingStats;

  if (isLoading) {
    return <SkeletonDashboard />;
  }

  return (
    <div className="container mx-auto space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="space-y-1">
        <h1 className="text-xl sm:text-2xl lg:text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Welcome back{user?.name ? `, ${user.name}` : ""}! Ready to learn
          something new today?
        </p>
      </div>

      {/* Study Overview */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Due Cards</CardTitle>
            <Play className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dueCardsCount?.totalDue || 0}
            </div>
            <p className="text-muted-foreground text-xs">Ready for review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Today's Reviews
            </CardTitle>
            <BarChart3 className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {studyStats?.totalReviews || 0}
            </div>
            <p className="text-muted-foreground text-xs">
              {studyStats?.accuracy
                ? `${studyStats.accuracy}% accuracy`
                : "No reviews yet"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Study Streak</CardTitle>
            <BarChart3 className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {studyStats?.studyStreak || 0}
            </div>
            <p className="text-muted-foreground text-xs">days in a row</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Decks</CardTitle>
            <BookOpen className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {decksData?.totalCount || 0}
            </div>
            <p className="text-muted-foreground text-xs">decks created</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="flex flex-col h-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5" />
              Study Session
            </CardTitle>
            <CardDescription>Start reviewing your due cards</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col space-y-3">
            {dueCardsCount && dueCardsCount.totalDue > 0 ? (
              <>
                <div className="flex-1 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>New cards:</span>
                    <Badge variant="secondary">{dueCardsCount.newCards}</Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Learning:</span>
                    <Badge variant="outline">{dueCardsCount.learningCards}</Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Review:</span>
                    <Badge variant="default">{dueCardsCount.reviewCards}</Badge>
                  </div>
                </div>
                <Link
                  href="/study"
                  className={cn(buttonVariants({ variant: "default", size: "default" }), "w-full mt-4")}
                >
                  <Play className="mr-2 h-4 w-4" />
                  Start Studying
                </Link>
              </>
            ) : (
              <>
                <p className="text-muted-foreground text-sm flex-1">
                  All caught up! No cards due for review.
                </p>
                <Button variant="outline" className="w-full mt-4">
                  <Link href="/decks">Browse Decks</Link>
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="flex flex-col h-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              My Decks
            </CardTitle>
            <CardDescription>Manage your flashcard collections</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col space-y-3">
            {decksData?.decks && decksData.decks.length > 0 ? (
              <>
                <div className="flex-1 space-y-2">
                  {decksData.decks.slice(0, 2).map((deck) => (
                    <div
                      key={deck.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="truncate">{deck.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {deck._count.cards}
                      </Badge>
                    </div>
                  ))}
                </div>
                <Link
                  href="/decks"
                  className={cn(buttonVariants({ variant: "outline", size: "default" }), "w-full mt-4")}
                >
                  View All Decks
                </Link>
              </>
            ) : (
              <>
                <p className="text-muted-foreground text-sm flex-1">
                  Create your first deck to start learning.
                </p>
                <Link
                  href="/decks"
                  className={cn(buttonVariants({ variant: "default", size: "default" }), "w-full mt-4")}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Deck
                </Link>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity or Getting Started */}
      {studyStats?.totalReviews && studyStats.totalReviews > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Today's Progress</CardTitle>
            <CardDescription>
              Keep up the great work with your studies!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-center md:grid-cols-4">
              <div>
                <div className={`text-2xl font-bold ${ratingColors.again.textColor}`}>
                  {studyStats.ratingBreakdown.AGAIN}
                </div>
                <div className="text-muted-foreground text-sm">{ratingLabels.again}</div>
              </div>
              <div>
                <div className={`text-2xl font-bold ${ratingColors.hard.textColor}`}>
                  {studyStats.ratingBreakdown.HARD}
                </div>
                <div className="text-muted-foreground text-sm">{ratingLabels.hard}</div>
              </div>
              <div>
                <div className={`text-2xl font-bold ${ratingColors.good.textColor}`}>
                  {studyStats.ratingBreakdown.GOOD}
                </div>
                <div className="text-muted-foreground text-sm">{ratingLabels.good}</div>
              </div>
              <div>
                <div className={`text-2xl font-bold ${ratingColors.easy.textColor}`}>
                  {studyStats.ratingBreakdown.EASY}
                </div>
                <div className="text-muted-foreground text-sm">{ratingLabels.easy}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Welcome to Your Flashcard Learning System</CardTitle>
            <CardDescription>
              Get started with spaced repetition learning
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="prose prose-sm max-w-none">
              <p>
                This is your personal spaced repetition learning system, similar
                to Anki. Start your learning journey by:
              </p>
              <ul>
                <li>Creating your first deck of flashcards</li>
                <li>Adding cards with questions and answers</li>
                <li>Starting daily study sessions</li>
                <li>Tracking your progress with built-in statistics</li>
              </ul>
              <p className="text-muted-foreground text-sm">
                The system uses the proven SuperMemo 2 algorithm to optimize
                your learning schedule and help you remember information
                long-term.
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/decks"
                className={cn(buttonVariants({ variant: "default", size: "default" }))}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create First Deck
              </Link>
              {dueCardsCount && dueCardsCount.totalDue > 0 && (
                <Link
                  href="/study"
                  className={cn(buttonVariants({ variant: "outline", size: "default" }))}
                >
                  <Play className="mr-2 h-4 w-4" />
                  Start Studying
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
