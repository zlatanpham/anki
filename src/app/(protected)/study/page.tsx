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
  BookOpen,
  Lightbulb,
} from "lucide-react";
import { type ReviewRating } from "@prisma/client";
import { ClozeDisplay } from "@/components/ClozeDisplay";
import { SkeletonCard } from "@/components/ui/skeleton-card";
import { Skeleton } from "@/components/ui/skeleton";
import { ratingColors, ratingLabels, ratingKeys } from "@/lib/theme";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { AnswerExplanation } from "@/components/study/AnswerExplanation";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

interface StudySession {
  cards: {
    id: string;
    state: string;
    card: {
      id: string;
      front: string;
      back: string;
      card_type: string;
      cloze_text?: string | null;
      tags?: string[];
      deck?: {
        name: string;
      };
    };
    due_date: Date;
    interval: number;
    repetitions: number;
    easiness_factor: number;
    lapses: number;
  }[];
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
  const isMobile = useIsMobile();

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
      cardId: currentCard.card.id,
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

  useEffect(() => {
    if (!isMobile || !session) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobile, session]);

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
  }, [session, isPaused]); // eslint-disable-line react-hooks/exhaustive-deps

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
      <div
        className={cn(
          "container mx-auto max-w-4xl",
          isMobile ? "px-4 py-4" : "p-6",
        )}
      >
        {!isMobile && (
          <div className="mb-6">
            {/* Back button */}
            <Link
              href="/"
              className="text-muted-foreground hover:text-foreground mb-3 inline-flex items-center text-sm transition-colors"
            >
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              <span className="font-medium">Dashboard</span>
            </Link>

            {/* Title section */}
            <h1 className="text-2xl font-bold">Study Session</h1>
            <p className="text-muted-foreground">Review cards from all decks</p>
          </div>
        )}

        {/* Header for mobile */}
        {isMobile && (
          <div className={cn("mb-4")}>
            <h1 className={cn("flex items-center gap-2 font-bold", "text-lg")}>
              <BookOpen className="h-5 w-5" />
              Study All Decks
            </h1>
          </div>
        )}

        {/* Study Stats */}
        <div
          className={cn(
            "mb-6 grid gap-3",
            isMobile ? "grid-cols-3" : "grid-cols-1 md:grid-cols-3",
          )}
        >
          <Card className={isMobile ? "shadow-sm" : ""}>
            <CardContent className={isMobile ? "p-4 text-center" : "p-4"}>
              {isMobile ? (
                <div className="flex flex-col items-center space-y-2">
                  <p className="text-muted-foreground text-xs leading-none">
                    Due
                    <br />
                    Cards
                  </p>
                  <p className="text-3xl font-bold text-blue-600">
                    {dueCardsCount?.totalDue ?? 0}
                  </p>
                  <Clock className="h-8 w-8 text-blue-600" />
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm">Due Cards</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {dueCardsCount?.totalDue ?? 0}
                    </p>
                  </div>
                  <Clock className="h-8 w-8 text-blue-600" />
                </div>
              )}
            </CardContent>
          </Card>

          <Card className={isMobile ? "shadow-sm" : ""}>
            <CardContent className={isMobile ? "p-4 text-center" : "p-4"}>
              {isMobile ? (
                <div className="flex flex-col items-center space-y-2">
                  <p className="text-muted-foreground text-xs leading-none">
                    New
                    <br />
                    Cards
                  </p>
                  <p className="text-3xl font-bold text-green-600">
                    {dueCardsCount?.newCards ?? 0}
                  </p>
                  <BarChart3 className="h-8 w-8 text-green-600" />
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm">New Cards</p>
                    <p className="text-2xl font-bold text-green-600">
                      {dueCardsCount?.newCards ?? 0}
                    </p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-green-600" />
                </div>
              )}
            </CardContent>
          </Card>

          <Card className={isMobile ? "shadow-sm" : ""}>
            <CardContent className={isMobile ? "p-4 text-center" : "p-4"}>
              {isMobile ? (
                <div className="flex flex-col items-center space-y-2">
                  <p className="text-muted-foreground text-xs leading-none">
                    Learning
                  </p>
                  <p className="text-3xl font-bold text-orange-600">
                    {dueCardsCount?.learningCards ?? 0}
                  </p>
                  <RotateCcw className="h-8 w-8 text-orange-600" />
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm">Learning</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {dueCardsCount?.learningCards ?? 0}
                    </p>
                  </div>
                  <RotateCcw className="h-8 w-8 text-orange-600" />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Start Study Session */}
        <Card>
          <CardHeader>
            <CardTitle>Ready to Study?</CardTitle>
          </CardHeader>
          <CardContent>
            {reviewQueue?.cards && reviewQueue.cards.length > 0 ? (
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  You have {reviewQueue.cards.length} cards ready for review
                  from all your decks.
                </p>
                <Button
                  onClick={startStudySession}
                  size="lg"
                  className="w-full"
                >
                  Start Study Session
                </Button>
                {!isMobile && (
                  <div className="text-muted-foreground space-y-3 text-center text-sm">
                    <p>Keyboard shortcuts:</p>
                    <p>
                      <kbd className="bg-muted rounded px-2 py-1">Space</kbd> -
                      Show answer
                    </p>
                    <p>
                      <kbd className="bg-muted rounded px-2 py-1">1</kbd> Again
                      • <kbd className="bg-muted rounded px-2 py-1">2</kbd> Hard
                      • <kbd className="bg-muted rounded px-2 py-1">3</kbd> Good
                      • <kbd className="bg-muted rounded px-2 py-1">4</kbd> Easy
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4 text-center">
                <p className="text-muted-foreground">
                  No cards are due for review right now.
                </p>
                <p className="text-muted-foreground text-sm">
                  Great job keeping up with your studies!
                </p>
                <Link href="/decks">
                  <Button variant="outline">Browse Decks</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
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
  // const totalReviews = totalAnswered;

  if (isMobile) {
    return (
      <MobileStudySession
        session={session}
        currentCard={currentCard}
        progress={progress}
        isPaused={isPaused}
        togglePause={togglePause}
        showAnswer={showAnswer}
        submitCardReview={submitCardReview}
        submitReviewPending={submitReview.isPending}
        endSession={endSession}
        restartSession={restartSession}
      />
    );
  }

  return (
    <div
      className={cn(
        "container mx-auto max-w-4xl",
        isMobile ? "px-4 py-4" : "p-6",
      )}
    >
      {/* Header */}
      <div className="mb-6 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">Studying: All Decks</h1>
          <Badge variant="outline">
            {session.currentIndex + 1} / {session.cards.length}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={togglePause}>
            {isPaused ? (
              <Play className="h-4 w-4" />
            ) : (
              <Pause className="h-4 w-4" />
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={restartSession}>
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={endSession}>
            End Session
          </Button>
        </div>
      </div>

      {/* Progress */}
      <div className="mb-6">
        <div className="text-muted-foreground mb-2 flex justify-between text-sm">
          <span>Progress</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="w-full" />
      </div>

      {/* Session Stats */}
      <div className="mb-6 grid grid-cols-4 gap-2">
        <div className="rounded bg-red-50 p-2 text-center">
          <div className={`font-semibold ${ratingColors.again.textColor}`}>
            {session.sessionStats.again}
          </div>
          <div className={`text-xs ${ratingColors.again.textColor}`}>
            {ratingLabels.again}
          </div>
        </div>
        <div className="rounded bg-orange-50 p-2 text-center">
          <div className={`font-semibold ${ratingColors.hard.textColor}`}>
            {session.sessionStats.hard}
          </div>
          <div className={`text-xs ${ratingColors.hard.textColor}`}>
            {ratingLabels.hard}
          </div>
        </div>
        <div className="rounded bg-green-50 p-2 text-center">
          <div className={`font-semibold ${ratingColors.good.textColor}`}>
            {session.sessionStats.good}
          </div>
          <div className={`text-xs ${ratingColors.good.textColor}`}>
            {ratingLabels.good}
          </div>
        </div>
        <div className="rounded bg-blue-50 p-2 text-center">
          <div className={`font-semibold ${ratingColors.easy.textColor}`}>
            {session.sessionStats.easy}
          </div>
          <div className={`text-xs ${ratingColors.easy.textColor}`}>
            {ratingLabels.easy}
          </div>
        </div>
      </div>

      {isPaused ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Pause className="text-muted-foreground mx-auto mb-4 h-16 w-16" />
            <h2 className="mb-2 text-xl font-semibold">Study Paused</h2>
            <p className="text-muted-foreground mb-4">
              Take a break and resume when you&apos;re ready.
            </p>
            <Button onClick={togglePause}>
              <Play className="mr-2 h-4 w-4" />
              Resume Study
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
              <CardTitle>
                {currentCard.card.card_type === "CLOZE"
                  ? "Cloze Deletion"
                  : "Flashcard"}
              </CardTitle>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">
                  {currentCard.card.deck?.name ?? "Unknown Deck"}
                </Badge>
                {currentCard.card.tags?.map((tag: string) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="min-h-[300px]">
            {currentCard.card.card_type === "CLOZE" ? (
              <ClozeDisplay
                clozeText={currentCard.card.cloze_text ?? ""}
                front={currentCard.card.front}
                back={currentCard.card.back ?? ""}
                showAnswer={session.showAnswer}
                onShowAnswer={showAnswer}
              />
            ) : (
              <div className="space-y-6">
                <div className="rounded-lg border p-6">
                  <MarkdownRenderer>{currentCard.card.front}</MarkdownRenderer>
                </div>

                {session.showAnswer && (
                  <>
                    <Separator />
                    <div className="bg-muted/50 rounded-lg border p-6">
                      <MarkdownRenderer>
                        {currentCard.card.back}
                      </MarkdownRenderer>
                    </div>
                    <div className="mt-4">
                      <AnswerExplanation
                        cardId={currentCard.card.id}
                        front={currentCard.card.front ?? ""}
                        back={currentCard.card.back ?? ""}
                        clozeText={currentCard.card.cloze_text ?? undefined}
                        key={`${currentCard.card.id}-${session.currentIndex}`}
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Additional context for cloze cards */}
            {currentCard.card.card_type === "CLOZE" &&
              session.showAnswer &&
              (currentCard.card.front ?? currentCard.card.back) && (
                <div className="mt-6 space-y-4">
                  {currentCard.card.front && (
                    <div className="rounded-lg border bg-blue-50 p-4">
                      <h4 className="mb-2 font-medium text-blue-900">
                        Additional Context
                      </h4>
                      <MarkdownRenderer className="text-blue-800">
                        {currentCard.card.front}
                      </MarkdownRenderer>
                    </div>
                  )}
                  {currentCard.card.back && (
                    <div className="rounded-lg border bg-green-50 p-4">
                      <h4 className="mb-2 font-medium text-green-900">
                        Extra Information
                      </h4>
                      <MarkdownRenderer className="text-green-800">
                        {currentCard.card.back}
                      </MarkdownRenderer>
                    </div>
                  )}
                  {session.showAnswer && (
                    <div className="mt-4">
                      <AnswerExplanation
                        cardId={currentCard.card.id}
                        front={currentCard.card.front ?? ""}
                        back={currentCard.card.back ?? ""}
                        clozeText={currentCard.card.cloze_text ?? undefined}
                        key={`${currentCard.card.id}-${session.currentIndex}`}
                      />
                    </div>
                  )}
                </div>
              )}
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      {!isPaused && (
        <div className="mt-6">
          {!session.showAnswer ? (
            <Button onClick={showAnswer} size="lg" className="w-full">
              Show Answer
              <span className="ml-2 text-xs opacity-70">Space</span>
            </Button>
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
        </div>
      )}
    </div>
  );
}

interface MobileStudySessionProps {
  session: StudySession;
  currentCard: StudySession["cards"][number];
  progress: number;
  isPaused: boolean;
  togglePause: () => void;
  showAnswer: () => void;
  submitCardReview: (rating: ReviewRating) => void;
  submitReviewPending: boolean;
  endSession: () => void;
  restartSession: () => void;
}

function MobileStudySession({
  session,
  currentCard,
  progress,
  isPaused,
  togglePause,
  showAnswer,
  submitCardReview,
  submitReviewPending,
  endSession,
  restartSession,
}: MobileStudySessionProps) {
  const deckName = currentCard.card.deck?.name ?? "All Decks";
  const [isExplanationOpen, setIsExplanationOpen] = useState(false);

  useEffect(() => {
    if (!session.showAnswer) {
      setIsExplanationOpen(false);
    }
  }, [session.showAnswer, session.currentIndex]);

  return (
    <div className="bg-background fixed inset-0 z-[60] flex flex-col">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={endSession}
          className="font-semibold"
        >
          End
        </Button>
        <div className="text-sm font-semibold">
          {session.currentIndex + 1} / {session.cards.length}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={restartSession}
            aria-label="Restart session"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={togglePause}
            aria-label={isPaused ? "Resume study" : "Pause study"}
          >
            {isPaused ? (
              <Play className="h-4 w-4" />
            ) : (
              <Pause className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      <div className="border-b px-4 py-3">
        <div className="text-muted-foreground mb-2 flex items-center justify-between text-xs tracking-wide uppercase">
          <span>Progress</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-1.5" />
        <p className="text-muted-foreground mt-2 text-center text-xs font-medium">
          {deckName}
        </p>
      </div>

      {isPaused ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
          <Pause className="text-muted-foreground h-12 w-12" />
          <div>
            <h2 className="text-lg font-semibold">Study paused</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Take a short break and resume when you&apos;re ready.
            </p>
          </div>
          <Button onClick={togglePause} className="px-6">
            <Play className="mr-2 h-4 w-4" /> Resume
          </Button>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-4 pb-6">
          <div className="bg-card rounded-lg border p-4">
            {currentCard.card.card_type === "CLOZE" ? (
              <ClozeDisplay
                clozeText={currentCard.card.cloze_text ?? ""}
                front={currentCard.card.front}
                back={currentCard.card.back ?? ""}
                showAnswer={session.showAnswer}
                onShowAnswer={showAnswer}
                hideRevealButton
                className="space-y-4 text-left"
              />
            ) : (
              <div className="space-y-4">
                <div className="bg-muted/50 rounded-lg p-4 text-base leading-relaxed">
                  <MarkdownRenderer>{currentCard.card.front}</MarkdownRenderer>
                </div>
                {session.showAnswer && (
                  <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-base leading-relaxed font-medium text-green-900">
                    <MarkdownRenderer>{currentCard.card.back}</MarkdownRenderer>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {!isPaused && (
        <div
          className="bg-background border-t px-4 pt-4"
          style={{
            paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)",
          }}
        >
          {session.showAnswer && (
            <Button
              variant="outline"
              size="sm"
              className="mb-3 w-full text-sm font-medium"
              onClick={() => setIsExplanationOpen(true)}
            >
              <Lightbulb className="mr-2 h-4 w-4" /> Explain this answer
            </Button>
          )}
          <Drawer open={isExplanationOpen} onOpenChange={setIsExplanationOpen}>
            <DrawerContent className="z-[70]">
              <DrawerHeader className="border-b px-4 py-3">
                <DrawerTitle>Answer explanation</DrawerTitle>
              </DrawerHeader>
              <div className="overflow-y-auto px-4 pb-6">
                <AnswerExplanation
                  cardId={currentCard.card.id}
                  front={currentCard.card.front ?? ""}
                  back={currentCard.card.back ?? ""}
                  clozeText={currentCard.card.cloze_text ?? undefined}
                  key={`${currentCard.card.id}-${session.currentIndex}`}
                />
              </div>
            </DrawerContent>
          </Drawer>
          {!session.showAnswer ? (
            <Button
              onClick={showAnswer}
              size="lg"
              className="h-14 w-full text-base font-semibold"
            >
              Show Answer
            </Button>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant={ratingColors.again.variant}
                onClick={() => submitCardReview("AGAIN")}
                disabled={submitReviewPending}
                className={cn(
                  "h-14 text-base font-semibold",
                  ratingColors.again.variant === "destructive"
                    ? ""
                    : ratingColors.again.className,
                )}
              >
                {ratingLabels.again}
              </Button>
              <Button
                variant={ratingColors.hard.variant}
                onClick={() => submitCardReview("HARD")}
                disabled={submitReviewPending}
                className={cn(
                  "h-14 text-base font-semibold",
                  ratingColors.hard.className,
                )}
              >
                {ratingLabels.hard}
              </Button>
              <Button
                variant={ratingColors.good.variant}
                onClick={() => submitCardReview("GOOD")}
                disabled={submitReviewPending}
                className={cn(
                  "h-14 text-base font-semibold",
                  ratingColors.good.className,
                )}
              >
                {ratingLabels.good}
              </Button>
              <Button
                variant={ratingColors.easy.variant}
                onClick={() => submitCardReview("EASY")}
                disabled={submitReviewPending}
                className={cn(
                  "h-14 text-base font-semibold",
                  ratingColors.easy.className,
                )}
              >
                {ratingLabels.easy}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
