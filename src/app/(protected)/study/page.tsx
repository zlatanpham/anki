"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import Link from "next/link";
import {
  ArrowLeft,
  Clock,
  BarChart3,
  Pause,
  Play,
  RotateCcw,
} from "lucide-react";
import { type ReviewRating } from "@prisma/client";
import { ClozeDisplay } from "@/components/ClozeDisplay";
import { SkeletonCard } from "@/components/ui/skeleton-card";
import { Skeleton } from "@/components/ui/skeleton";
import { ratingColors, ratingLabels, ratingKeys } from "@/lib/theme";

interface StudySession {
  cards: any[];
  currentIndex: number;
  showAnswer: boolean;
  startTime: Date;
  sessionStats: {
    again: number;
    hard: number;
    good: number;
    easy: number;
  };
}

export default function StudyPage() {
  const [session, setSession] = useState<StudySession | null>(null);
  const [responseStartTime, setResponseStartTime] = useState<Date | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  // Get review queue
  const {
    data: reviewQueue,
    isLoading: isLoadingQueue,
    refetch: refetchQueue,
  } = api.study.getReviewQueue.useQuery({ limit: 20 }, { enabled: !session });

  // Get due cards count
  const { data: dueCardsCount, refetch: refetchDueCount } =
    api.study.getDueCardsCount.useQuery({});

  // Submit review mutation
  const submitReview = api.study.submitReview.useMutation({
    onError: (error, variables) => {
      toast.error(`Failed to submit review: ${error.message}`);

      // Rollback on error: go back to previous card
      if (session) {
        const prevIndex = Math.max(0, session.currentIndex - 1);
        setSession((prev) =>
          prev
            ? {
                ...prev,
                currentIndex: prevIndex,
                showAnswer: true,
                sessionStats: {
                  ...prev.sessionStats,
                  [variables.rating.toLowerCase()]: Math.max(
                    0,
                    prev.sessionStats[
                      variables.rating.toLowerCase() as keyof typeof prev.sessionStats
                    ] - 1,
                  ),
                },
              }
            : null,
        );
      }
    },
  });

  const startStudySession = () => {
    if (reviewQueue?.cards && reviewQueue.cards.length > 0) {
      setSession({
        cards: reviewQueue.cards,
        currentIndex: 0,
        showAnswer: false,
        startTime: new Date(),
        sessionStats: { again: 0, hard: 0, good: 0, easy: 0 },
      });
      setResponseStartTime(new Date());
    }
  };

  const endSession = async () => {
    setSession(null);
    setResponseStartTime(null);
    setIsPaused(false);

    // Force refresh both queue and due counts
    await Promise.all([refetchQueue(), refetchDueCount()]);

    toast.success("Study session completed!");
  };

  const showAnswer = () => {
    if (session && !session.showAnswer) {
      setSession((prev) => (prev ? { ...prev, showAnswer: true } : null));
    }
  };

  const submitCardReview = (rating: ReviewRating) => {
    if (!session || !responseStartTime) return;

    const currentCard = session.cards[session.currentIndex];
    if (!currentCard) return;

    const responseTime = Date.now() - responseStartTime.getTime();

    // Optimistically update session stats and move to next card
    setSession((prev) => {
      if (!prev) return null;

      const newStats = {
        ...prev.sessionStats,
        [rating.toLowerCase()]:
          prev.sessionStats[
            rating.toLowerCase() as keyof typeof prev.sessionStats
          ] + 1,
      };

      // Check if this is the last card
      if (prev.currentIndex >= prev.cards.length - 1) {
        // Trigger end session after a short delay to show completion
        setTimeout(() => {
          void endSession();
        }, 100);
        return { ...prev, sessionStats: newStats };
      }

      // Move to next card immediately
      return {
        ...prev,
        currentIndex: prev.currentIndex + 1,
        showAnswer: false,
        sessionStats: newStats,
      };
    });

    // Reset response time for next card
    setResponseStartTime(new Date());

    // Submit review in background
    submitReview.mutate({
      cardId: currentCard.card_id,
      rating,
      responseTime,
    });
  };

  const togglePause = () => {
    setIsPaused(!isPaused);
  };

  const restartSession = () => {
    if (session) {
      setSession((prev) =>
        prev
          ? {
              ...prev,
              currentIndex: 0,
              showAnswer: false,
              sessionStats: { again: 0, hard: 0, good: 0, easy: 0 },
            }
          : null,
      );
      setResponseStartTime(new Date());
      setIsPaused(false);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (!session || isPaused) return;

      if (event.code === "Space" && !session.showAnswer) {
        event.preventDefault();
        showAnswer();
      } else if (session.showAnswer) {
        switch (event.key) {
          case "1":
            event.preventDefault();
            submitCardReview("AGAIN");
            break;
          case "2":
            event.preventDefault();
            submitCardReview("HARD");
            break;
          case "3":
            event.preventDefault();
            submitCardReview("GOOD");
            break;
          case "4":
            event.preventDefault();
            submitCardReview("EASY");
            break;
        }
      }

      if (event.key === "p" || event.key === "P") {
        event.preventDefault();
        togglePause();
      }
    };

    document.addEventListener("keydown", handleKeyPress);
    return () => document.removeEventListener("keydown", handleKeyPress);
  }, [session, isPaused]);

  // Refresh data when page gains focus
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && !session) {
        // Refresh data when returning to the page and not in a session
        void refetchQueue();
        void refetchDueCount();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [session, refetchQueue, refetchDueCount]);

  if (isLoadingQueue) {
    return (
      <div className="container mx-auto max-w-4xl p-6">
        <div className="mb-6 flex items-center gap-4">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-8 w-32" />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header - Mobile-first responsive design */}
        <div className="mb-6 lg:mb-8">
          {/* Back button - Better touch target on mobile */}
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground mb-3 inline-flex items-center text-sm transition-colors"
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            <span className="font-medium">Dashboard</span>
          </Link>

          {/* Title section - Responsive sizing */}
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl lg:text-2xl">
            Study Session
          </h1>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Study Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Due Cards Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dueCardsCount ? (
                <div className="space-y-4">
                  <div className="text-primary text-3xl font-bold">
                    {dueCardsCount.totalDue}
                  </div>
                  <p className="text-muted-foreground">
                    cards ready for review
                  </p>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>New cards</span>
                      <Badge variant="secondary">
                        {dueCardsCount.newCards}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Learning cards</span>
                      <Badge variant="outline">
                        {dueCardsCount.learningCards}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Review cards</span>
                      <Badge variant="default">
                        {dueCardsCount.reviewCards}
                      </Badge>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center">
                  <p className="text-muted-foreground">
                    No cards due for review
                  </p>
                  <Link href="/decks">
                    <Button variant="outline" className="mt-4">
                      Browse Decks
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Start Study Session */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="h-5 w-5" />
                Ready to Study?
              </CardTitle>
            </CardHeader>
            <CardContent>
              {reviewQueue?.cards && reviewQueue.cards.length > 0 ? (
                <div className="space-y-4">
                  <p className="text-muted-foreground text-sm">
                    You have {reviewQueue.cards.length} cards ready for review
                    in this session.
                  </p>

                  <Button
                    onClick={startStudySession}
                    className="w-full"
                    size="lg"
                  >
                    <Play className="mr-2 h-4 w-4" />
                    Start Study Session
                  </Button>

                  <div className="text-muted-foreground space-y-1 text-xs">
                    <p>
                      <kbd className="bg-muted rounded px-1.5 py-0.5 text-xs">
                        Space
                      </kbd>{" "}
                      - Show answer
                    </p>
                    <p>
                      <kbd className="bg-muted rounded px-1.5 py-0.5 text-xs">
                        1
                      </kbd>{" "}
                      Again |{" "}
                      <kbd className="bg-muted rounded px-1.5 py-0.5 text-xs">
                        2
                      </kbd>{" "}
                      Hard |{" "}
                      <kbd className="bg-muted rounded px-1.5 py-0.5 text-xs">
                        3
                      </kbd>{" "}
                      Good |{" "}
                      <kbd className="bg-muted rounded px-1.5 py-0.5 text-xs">
                        4
                      </kbd>{" "}
                      Easy
                    </p>
                    <p>
                      <kbd className="bg-muted rounded px-1.5 py-0.5 text-xs">
                        P
                      </kbd>{" "}
                      - Pause session
                    </p>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center">
                  <p className="text-muted-foreground mb-4">
                    No cards are currently due for review. Great job keeping up
                    with your studies!
                  </p>
                  <Link href="/decks">
                    <Button variant="outline">Browse Decks</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const currentCard = session.cards[session.currentIndex];
  if (!currentCard) return null;

  // Calculate progress based on answered cards, not current position
  const totalAnswered = Object.values(session.sessionStats).reduce(
    (a, b) => a + b,
    0,
  );
  const progress =
    session.cards.length > 0 ? (totalAnswered / session.cards.length) * 100 : 0;
  const totalReviews = totalAnswered;

  return (
    <div className="container mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Session Header - Responsive layout */}
      <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            onClick={endSession}
            variant="ghost"
            size="sm"
            className="h-9 px-3"
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            <span className="hidden sm:inline">End Session</span>
            <span className="sm:hidden">End</span>
          </Button>
          <div className="text-muted-foreground text-sm font-medium">
            Card {session.currentIndex + 1} of {session.cards.length}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={togglePause}
            variant="outline"
            size="sm"
            className="h-9 w-9 p-0"
            aria-label={isPaused ? "Resume study" : "Pause study"}
          >
            {isPaused ? (
              <Play className="h-4 w-4" />
            ) : (
              <Pause className="h-4 w-4" />
            )}
          </Button>
          <Button
            onClick={restartSession}
            variant="outline"
            size="sm"
            className="h-9 w-9 p-0"
            aria-label="Restart session"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <Progress value={progress} className="h-2" />
        <div className="text-muted-foreground mt-1 flex justify-between text-xs">
          <span>Progress: {Math.round(progress)}%</span>
          <span>Reviews: {totalReviews}</span>
        </div>
      </div>

      {isPaused ? (
        <Card className="mb-6">
          <CardContent className="py-12 text-center">
            <Pause className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
            <h3 className="mb-2 text-lg font-semibold">Session Paused</h3>
            <p className="text-muted-foreground mb-4">
              Take a break when you need it!
            </p>
            <Button onClick={togglePause}>
              <Play className="mr-2 h-4 w-4" />
              Resume Study Session
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Main Card Display */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <Badge variant="outline">{currentCard.card.deck.name}</Badge>
                <div className="text-muted-foreground flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4" />
                  {currentCard.stateDescription}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {currentCard.card.card_type === "CLOZE" &&
              currentCard.card.cloze_text ? (
                <ClozeDisplay
                  clozeText={currentCard.card.cloze_text}
                  front={currentCard.card.front}
                  back={currentCard.card.back}
                  showAnswer={session.showAnswer}
                  onShowAnswer={showAnswer}
                />
              ) : (
                <div className="space-y-6">
                  {/* Question */}
                  <div>
                    <div className="text-muted-foreground mb-2 text-sm font-medium">
                      Question
                    </div>
                    <div
                      className="bg-muted/50 rounded-lg p-4 text-lg leading-relaxed"
                      dangerouslySetInnerHTML={{
                        __html: currentCard.card.front,
                      }}
                    />
                  </div>

                  {session.showAnswer && (
                    <>
                      <Separator />
                      {/* Answer */}
                      <div>
                        <div className="text-muted-foreground mb-2 text-sm font-medium">
                          Answer
                        </div>
                        <div
                          className="bg-primary/5 rounded-lg p-4 text-lg leading-relaxed"
                          dangerouslySetInnerHTML={{
                            __html: currentCard.card.back,
                          }}
                        />
                      </div>
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          {!session.showAnswer ? (
            <div className="text-center">
              <Button onClick={showAnswer} size="lg" className="px-8">
                Show Answer
                <span className="ml-2 text-xs opacity-75">(Space)</span>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Button
                variant={ratingColors.again.variant}
                onClick={() => submitCardReview("AGAIN")}
                disabled={submitReview.isPending}
                className={`flex min-h-[64px] flex-col gap-1 p-4 text-base sm:text-sm ${ratingColors.again.variant === "destructive" ? "" : ratingColors.again.className}`}
              >
                <span className="font-semibold">{ratingLabels.again}</span>
                <span className="hidden text-xs opacity-70 sm:block">
                  Press {ratingKeys.again}
                </span>
              </Button>
              <Button
                variant={ratingColors.hard.variant}
                onClick={() => submitCardReview("HARD")}
                disabled={submitReview.isPending}
                className={`flex min-h-[64px] flex-col gap-1 p-4 text-base sm:text-sm ${ratingColors.hard.className}`}
              >
                <span className="font-semibold">{ratingLabels.hard}</span>
                <span className="hidden text-xs opacity-70 sm:block">
                  Press {ratingKeys.hard}
                </span>
              </Button>
              <Button
                variant={ratingColors.good.variant}
                onClick={() => submitCardReview("GOOD")}
                disabled={submitReview.isPending}
                className={`flex min-h-[64px] flex-col gap-1 p-4 text-base sm:text-sm ${ratingColors.good.className}`}
              >
                <span className="font-semibold">{ratingLabels.good}</span>
                <span className="hidden text-xs opacity-70 sm:block">
                  Press {ratingKeys.good}
                </span>
              </Button>
              <Button
                variant={ratingColors.easy.variant}
                onClick={() => submitCardReview("EASY")}
                disabled={submitReview.isPending}
                className={`flex min-h-[64px] flex-col gap-1 p-4 text-base sm:text-sm ${ratingColors.easy.className}`}
              >
                <span className="font-semibold">{ratingLabels.easy}</span>
                <span className="hidden text-xs opacity-70 sm:block">
                  Press {ratingKeys.easy}
                </span>
              </Button>
            </div>
          )}

          {/* Session Stats */}
          {totalReviews > 0 && (
            <Card className="mt-6">
              <CardContent className="pt-6">
                <div className="mb-3 text-sm font-medium">
                  Session Statistics
                </div>
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-lg font-bold text-red-600">
                      {session.sessionStats.again}
                    </div>
                    <div className="text-muted-foreground text-xs">Again</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-orange-600">
                      {session.sessionStats.hard}
                    </div>
                    <div className="text-muted-foreground text-xs">Hard</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-green-600">
                      {session.sessionStats.good}
                    </div>
                    <div className="text-muted-foreground text-xs">Good</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-blue-600">
                      {session.sessionStats.easy}
                    </div>
                    <div className="text-muted-foreground text-xs">Easy</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
