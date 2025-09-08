"use client";

import { useSession } from "next-auth/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { BookOpen, Play, BarChart3, Plus } from "lucide-react";
import { api } from "@/trpc/react";
import Link from "next/link";
import { SkeletonDashboard } from "@/components/ui/skeleton-card";
import { ratingColors, ratingLabels } from "@/lib/theme";
import { useIsMobile } from "@/hooks/use-mobile";

export default function DashboardPage() {
  const { data: session } = useSession();
  const isMobile = useIsMobile();

  const user = session?.user as { name?: string; email?: string };

  // Get due cards count for dashboard
  const { data: dueCardsCount, isLoading: isLoadingDue } =
    api.study.getDueCardsCount.useQuery({});

  // Get recent decks
  const { data: decksData, isLoading: isLoadingDecks } =
    api.deck.getAll.useQuery({ limit: 3 });

  // Get study stats for today
  const { data: studyStats, isLoading: isLoadingStats } =
    api.study.getStudyStats.useQuery({
      period: "today",
    });

  // Get comprehensive user status
  const { data: userStatus, isLoading: isLoadingUserStatus } =
    api.user.getUserStatus.useQuery();

  const isLoading =
    isLoadingDue || isLoadingDecks || isLoadingStats || isLoadingUserStatus;

  if (isLoading) {
    return <SkeletonDashboard />;
  }

  return (
    <div className="container mx-auto space-y-4 px-4 py-4 sm:space-y-6 sm:px-6 sm:py-6 lg:px-8">
      {/* Welcome Message - Show on both mobile and desktop */}
      {isMobile ? (
        <div className="mb-5 space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome back{user?.name ? `, ${user.name}` : ""}!
          </h1>
          <p className="text-muted-foreground text-sm">
            Ready to learn something new today?
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl lg:text-2xl">
            Dashboard
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Welcome back{user?.name ? `, ${user.name}` : ""}! Ready to learn
            something new today?
          </p>
        </div>
      )}

      {/* Study Overview - Mobile optimized with 2x2 grid */}
      <div className="grid grid-cols-2 gap-3 sm:gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="sm:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 px-3 pb-2 sm:px-6">
            <CardTitle className="text-xs font-medium sm:text-sm">
              Due Cards
            </CardTitle>
            <Play className="text-muted-foreground h-5 w-5 flex-none" />
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            <div className="text-xl font-bold sm:text-2xl">
              {dueCardsCount?.totalDue ?? 0}
            </div>
            <p className="text-muted-foreground text-xs">Ready for review</p>
          </CardContent>
        </Card>

        <Card className="sm:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 px-3 pb-2 sm:px-6">
            <CardTitle className="text-xs font-medium sm:text-sm">
              Today&apos;s Reviews
            </CardTitle>
            <BarChart3 className="text-muted-foreground h-5 w-5 flex-none" />
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            <div className="text-xl font-bold sm:text-2xl">
              {studyStats?.totalReviews ?? 0}
            </div>
            <p className="text-muted-foreground text-xs">
              {studyStats?.accuracy
                ? `${studyStats.accuracy}% accuracy`
                : "No reviews yet"}
            </p>
          </CardContent>
        </Card>

        <Card className="sm:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 px-3 pb-2 sm:px-6">
            <CardTitle className="text-xs font-medium sm:text-sm">
              Study Streak
            </CardTitle>
            <BarChart3 className="text-muted-foreground h-5 w-5 flex-none" />
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            <div className="text-xl font-bold sm:text-2xl">
              {studyStats?.studyStreak ?? 0}
            </div>
            <p className="text-muted-foreground text-xs">days in a row</p>
          </CardContent>
        </Card>

        <Card className="sm:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 px-3 pb-2 sm:px-6">
            <CardTitle className="text-xs font-medium sm:text-sm">
              Total Decks
            </CardTitle>
            <BookOpen className="text-muted-foreground h-5 w-5 flex-none" />
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            <div className="text-xl font-bold sm:text-2xl">
              {decksData?.totalCount ?? 0}
            </div>
            <p className="text-muted-foreground text-xs">decks created</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions - Single column on mobile */}
      {isMobile ? (
        // Mobile: Study action only
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Play className="h-4 w-4" />
              Study Session
            </CardTitle>
            <CardDescription className="text-sm">
              Start reviewing your due cards
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col space-y-3">
            {dueCardsCount && dueCardsCount.totalDue > 0 ? (
              <>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <Badge variant="secondary" className="mb-1">
                      {dueCardsCount.newCards}
                    </Badge>
                    <p className="text-muted-foreground text-xs">New</p>
                  </div>
                  <div>
                    <Badge variant="outline" className="mb-1">
                      {dueCardsCount.learningCards}
                    </Badge>
                    <p className="text-muted-foreground text-xs">Learning</p>
                  </div>
                  <div>
                    <Badge variant="default" className="mb-1">
                      {dueCardsCount.reviewCards}
                    </Badge>
                    <p className="text-muted-foreground text-xs">Review</p>
                  </div>
                </div>
                <Link
                  href="/study"
                  className={cn(
                    buttonVariants({ variant: "default", size: "lg" }),
                    "mt-4 h-12 w-full",
                  )}
                >
                  <Play className="mr-2 h-4 w-4" />
                  Start Studying
                </Link>
              </>
            ) : (
              <>
                <p className="text-muted-foreground flex-1 text-sm">
                  All caught up! No cards due for review.
                </p>
                <Link
                  href="/decks"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "lg" }),
                    "mt-4 h-12 w-full",
                  )}
                >
                  Browse Decks
                </Link>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        // Desktop: Original layout
        <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
          <Card className="flex h-full flex-col sm:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="h-5 w-5" />
                Study Session
              </CardTitle>
              <CardDescription>Start reviewing your due cards</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col space-y-3">
              {dueCardsCount && dueCardsCount.totalDue > 0 ? (
                <>
                  <div className="flex-1 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>New cards:</span>
                      <Badge variant="secondary">
                        {dueCardsCount.newCards}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Learning:</span>
                      <Badge variant="outline">
                        {dueCardsCount.learningCards}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Review:</span>
                      <Badge variant="default">
                        {dueCardsCount.reviewCards}
                      </Badge>
                    </div>
                  </div>
                  <Link
                    href="/study"
                    className={cn(
                      buttonVariants({ variant: "default", size: "default" }),
                      "mt-4 w-full",
                    )}
                  >
                    <Play className="mr-2 h-4 w-4" />
                    Start Studying
                  </Link>
                </>
              ) : (
                <>
                  <p className="text-muted-foreground flex-1 text-sm">
                    All caught up! No cards due for review.
                  </p>
                  <Link
                    href="/decks"
                    className={cn(
                      buttonVariants({ variant: "outline", size: "default" }),
                      "mt-4 w-full",
                    )}
                  >
                    Browse Decks
                  </Link>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="flex h-full flex-col sm:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                My Decks
              </CardTitle>
              <CardDescription>
                Manage your flashcard collections
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col space-y-3">
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
                    className={cn(
                      buttonVariants({ variant: "outline", size: "default" }),
                      "mt-4 w-full",
                    )}
                  >
                    View All Decks
                  </Link>
                </>
              ) : (
                <>
                  <p className="text-muted-foreground flex-1 text-sm">
                    Create your first deck to start learning.
                  </p>
                  <Link
                    href="/decks"
                    className={cn(
                      buttonVariants({ variant: "default", size: "default" }),
                      "mt-4 w-full",
                    )}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create First Deck
                  </Link>
                </>
              )}
            </CardContent>
          </Card>

          {/* Statistics Card - Only visible on larger screens */}
          <Card className="hidden h-full flex-col xl:flex">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Statistics
              </CardTitle>
              <CardDescription>Track your learning progress</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col space-y-3">
              <div className="flex-1 space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Total Cards:</span>
                  <Badge variant="outline">{userStatus?.totalCards ?? 0}</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>All-time Reviews:</span>
                  <Badge variant="secondary">
                    {userStatus?.totalReviews ?? 0}
                  </Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Study Streak:</span>
                  <Badge variant="default">
                    {studyStats?.studyStreak ?? 0} days
                  </Badge>
                </div>
              </div>
              <Link
                href="/stats"
                className={cn(
                  buttonVariants({ variant: "outline", size: "default" }),
                  "mt-4 w-full",
                )}
              >
                View Detailed Stats
              </Link>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Activity or Getting Started - Simplified for mobile */}
      {userStatus && !userStatus.isNewUser ? (
        <Card className="xl:col-span-1">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">
              Today&apos;s Progress
            </CardTitle>
            <CardDescription className="text-sm">
              {studyStats?.totalReviews && studyStats.totalReviews > 0
                ? "Keep up the great work with your studies!"
                : "No reviews today yet. Ready to start studying?"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {studyStats?.totalReviews && studyStats.totalReviews > 0 ? (
              <div className="grid grid-cols-4 gap-2 text-center">
                <div>
                  <div
                    className={`text-lg font-bold sm:text-2xl ${ratingColors.again.textColor}`}
                  >
                    {studyStats.ratingBreakdown.AGAIN}
                  </div>
                  <div className="text-muted-foreground text-xs sm:text-sm">
                    {ratingLabels.again}
                  </div>
                </div>
                <div>
                  <div
                    className={`text-lg font-bold sm:text-2xl ${ratingColors.hard.textColor}`}
                  >
                    {studyStats.ratingBreakdown.HARD}
                  </div>
                  <div className="text-muted-foreground text-xs sm:text-sm">
                    {ratingLabels.hard}
                  </div>
                </div>
                <div>
                  <div
                    className={`text-lg font-bold sm:text-2xl ${ratingColors.good.textColor}`}
                  >
                    {studyStats.ratingBreakdown.GOOD}
                  </div>
                  <div className="text-muted-foreground text-xs sm:text-sm">
                    {ratingLabels.good}
                  </div>
                </div>
                <div>
                  <div
                    className={`text-lg font-bold sm:text-2xl ${ratingColors.easy.textColor}`}
                  >
                    {studyStats.ratingBreakdown.EASY}
                  </div>
                  <div className="text-muted-foreground text-xs sm:text-sm">
                    {ratingLabels.easy}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-4 text-center">
                <p className="text-muted-foreground mb-4">
                  Start studying to see your progress here.
                </p>
                {dueCardsCount && dueCardsCount.totalDue > 0 && (
                  <Link
                    href="/study"
                    className={cn(
                      buttonVariants({
                        variant: "default",
                        size: isMobile ? "default" : "sm",
                      }),
                    )}
                  >
                    <Play className="mr-2 h-4 w-4" />
                    Start Studying
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">
              Welcome to Your Flashcard Learning System
            </CardTitle>
            <CardDescription className="text-sm">
              Get started with spaced repetition learning
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="prose prose-sm max-w-none">
              <p className="text-sm">
                This is your personal spaced repetition learning system, similar
                to Anki. Start your learning journey by:
              </p>
              <ul className="text-sm">
                {!isMobile && <li>Creating your first deck of flashcards</li>}
                {!isMobile && <li>Adding cards with questions and answers</li>}
                <li>Starting daily study sessions</li>
                <li>Tracking your progress with built-in statistics</li>
              </ul>
              <p className="text-muted-foreground text-xs sm:text-sm">
                The system uses the proven SuperMemo 2 algorithm to optimize
                your learning schedule and help you remember information
                long-term.
              </p>
            </div>
            <div className="flex gap-3">
              {!isMobile && (
                <Link
                  href="/decks"
                  className={cn(
                    buttonVariants({ variant: "default", size: "default" }),
                  )}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Deck
                </Link>
              )}
              {dueCardsCount && dueCardsCount.totalDue > 0 && (
                <Link
                  href="/study"
                  className={cn(
                    buttonVariants({
                      variant: isMobile ? "default" : "outline",
                      size: "default",
                    }),
                  )}
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
