"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import Link from "next/link";
import {
  Clock,
  BarChart3,
  Pause,
  Play,
  RotateCcw,
  BookOpen,
} from "lucide-react";
import { type ReviewRating } from "@prisma/client";
import { ClozeDisplay } from "@/components/ClozeDisplay";
import { SkeletonStudyCard } from "@/components/ui/skeleton-card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
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

export default function DeckStudyPage() {
  const params = useParams();
  const router = useRouter();
  const deckId = params.id as string;

  const [session, setSession] = useState<StudySession | null>(null);
  const [responseStartTime, setResponseStartTime] = useState<Date | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  // Get deck info
  const { data: deck } = api.deck.getById.useQuery({ id: deckId });

  // Get deck review queue
  const {
    data: reviewQueue,
    isLoading: isLoadingQueue,
    refetch: refetchQueue,
  } = api.study.getDeckReviewQueue.useQuery(
    { deckId, limit: 20 },
    { enabled: !session },
  );

  // Get deck due cards count
  const { data: dueCardsCount } = api.study.getDeckDueCardsCount.useQuery({
    deckId,
  });

  // Submit review mutation
  const submitReview = api.study.submitReview.useMutation({
    onSuccess: () => {
      // Move to next card or end session
      if (session && session.currentIndex < session.cards.length - 1) {
        setSession((prev) =>
          prev
            ? {
                ...prev,
                currentIndex: prev.currentIndex + 1,
                showAnswer: false,
              }
            : null,
        );
        setResponseStartTime(new Date());
      } else {
        // End session
        void finishSession();
      }
    },
    onError: (error) => {
      toast.error(error.message || "Failed to submit review");
    },
  });

  const startSession = () => {
    if (reviewQueue && reviewQueue.length > 0) {
      setSession({
        cards: reviewQueue,
        currentIndex: 0,
        showAnswer: false,
        startTime: new Date(),
        sessionStats: {
          again: 0,
          hard: 0,
          good: 0,
          easy: 0,
        },
      });
      setResponseStartTime(new Date());
    }
  };

  const finishSession = async () => {
    if (session) {
      const duration = new Date().getTime() - session.startTime.getTime();
      const minutes = Math.round(duration / 60000);
      const totalCards =
        session.sessionStats.again +
        session.sessionStats.hard +
        session.sessionStats.good +
        session.sessionStats.easy;

      toast.success(
        `Study session completed! Reviewed ${totalCards} cards in ${minutes} minutes.`,
      );

      // Set a flag to indicate study session was completed
      sessionStorage.setItem("study-session-completed", deckId);

      // Navigate back to the deck cards page after a short delay
      setTimeout(() => {
        router.push(`/decks/${deckId}/cards`);
      }, 1500);
    }
    setSession(null);
    setResponseStartTime(null);
    await refetchQueue();
  };

  const showAnswer = useCallback(() => {
    setSession((prev) => (prev ? { ...prev, showAnswer: true } : null));
  }, []);

  const submitCardReview = async (rating: ReviewRating) => {
    if (!session || !responseStartTime) return;

    const currentCard = session.cards[session.currentIndex];
    const responseTime = new Date().getTime() - responseStartTime.getTime();

    // Update session stats
    setSession((prev) =>
      prev
        ? {
            ...prev,
            sessionStats: {
              ...prev.sessionStats,
              [rating.toLowerCase()]:
                prev.sessionStats[
                  rating.toLowerCase() as keyof typeof prev.sessionStats
                ] + 1,
            },
          }
        : null,
    );

    await submitReview.mutateAsync({
      cardId: currentCard.id,
      rating,
      responseTime,
    });
  };

  const togglePause = () => {
    setIsPaused(!isPaused);
  };

  const resetSession = () => {
    // Set a flag to indicate study session was reset/ended
    sessionStorage.setItem("study-session-completed", deckId);

    setSession(null);
    setResponseStartTime(null);
    void refetchQueue();

    // Navigate back to the deck cards page
    router.push(`/decks/${deckId}/cards`);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!session || isPaused) return;

      if (!session.showAnswer) {
        if (event.code === "Space") {
          event.preventDefault();
          showAnswer();
        }
      } else {
        event.preventDefault();
        switch (event.code) {
          case "Digit1":
            void submitCardReview("AGAIN");
            break;
          case "Digit2":
            void submitCardReview("HARD");
            break;
          case "Digit3":
            void submitCardReview("GOOD");
            break;
          case "Digit4":
            void submitCardReview("EASY");
            break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [session, isPaused, showAnswer, submitCardReview, togglePause]);

  if (isLoadingQueue) {
    return (
      <div className="container mx-auto max-w-4xl p-6">
        <div className="mb-6 flex items-center gap-4">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-8 w-48" />
        </div>

        <div className="mb-6">
          <Skeleton className="h-2 w-full" />
        </div>

        <SkeletonStudyCard />

        <div className="mt-6 flex justify-center gap-3">
          <Skeleton className="h-16 w-32" />
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container mx-auto max-w-4xl p-6">
        <Breadcrumb className="mb-4">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/">Dashboard</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/decks">Decks</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href={`/decks/${deckId}/cards`}>
                  {deck?.name || "Deck"}
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Study</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Header */}
        <div className="mb-6">
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <BookOpen className="h-6 w-6" />
            Study: {deck?.name}
          </h1>
          <p className="text-muted-foreground">Focus on cards from this deck</p>
        </div>

        {/* Study Stats */}
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Due Cards</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {dueCardsCount?.due || 0}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">New Cards</p>
                  <p className="text-2xl font-bold text-green-600">
                    {dueCardsCount?.new || 0}
                  </p>
                </div>
                <BarChart3 className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Learning</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {dueCardsCount?.learning || 0}
                  </p>
                </div>
                <RotateCcw className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Start Study Session */}
        <Card>
          <CardHeader>
            <CardTitle>Ready to Study?</CardTitle>
          </CardHeader>
          <CardContent>
            {reviewQueue && reviewQueue.length > 0 ? (
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  You have {reviewQueue.length} cards ready for review in this
                  deck.
                </p>
                <Button onClick={startSession} size="lg" className="w-full">
                  Start Study Session
                </Button>
                <div className="text-muted-foreground space-y-3 text-center text-sm">
                  <p>Keyboard shortcuts:</p>
                  <p>
                    <kbd className="bg-muted rounded px-2 py-1">Space</kbd> -
                    Show answer
                  </p>
                  <p>
                    <kbd className="bg-muted rounded px-2 py-1">1</kbd> Again •{" "}
                    <kbd className="bg-muted rounded px-2 py-1">2</kbd> Hard •{" "}
                    <kbd className="bg-muted rounded px-2 py-1">3</kbd> Good •{" "}
                    <kbd className="bg-muted rounded px-2 py-1">4</kbd> Easy
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-center">
                <p className="text-muted-foreground">
                  No cards are due for review in this deck right now.
                </p>
                <p className="text-muted-foreground text-sm">
                  Check back later or review all decks from the main study page.
                </p>
                <div className="flex justify-center gap-2">
                  <Link href="/study">
                    <Button variant="outline">Study All Decks</Button>
                  </Link>
                  <Link href={`/decks/${deckId}/cards`}>
                    <Button variant="outline">View Cards</Button>
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentCard = session.cards[session.currentIndex];
  // Calculate progress based on answered cards, not current position
  const totalAnswered = Object.values(session.sessionStats).reduce(
    (a, b) => a + b,
    0,
  );
  const progress = session.cards.length > 0 ? (totalAnswered / session.cards.length) * 100 : 0;
  const totalReviews = totalAnswered;

  return (
    <div className="container mx-auto max-w-4xl p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">Studying: {deck?.name}</h1>
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
          <Button variant="outline" size="sm" onClick={resetSession}>
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={finishSession}>
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
              Take a break and resume when you're ready.
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
            <div className="flex items-center justify-between">
              <CardTitle>
                {currentCard.card_type === "CLOZE"
                  ? "Cloze Deletion"
                  : "Flashcard"}
              </CardTitle>
              <div className="flex gap-2">
                {currentCard.tags?.map((tag: string) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="min-h-[300px]">
            {currentCard.card_type === "CLOZE" ? (
              <ClozeDisplay
                clozeText={currentCard.cloze_text || ""}
                front={currentCard.front}
                back={currentCard.back || ""}
                showAnswer={session.showAnswer}
                onShowAnswer={showAnswer}
              />
            ) : (
              <div className="space-y-6">
                <div className="rounded-lg border p-6">
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: currentCard.front }}
                  />
                </div>

                {session.showAnswer && (
                  <>
                    <Separator />
                    <div className="bg-muted/50 rounded-lg border p-6">
                      <div
                        className="prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: currentCard.back }}
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Additional context for cloze cards */}
            {currentCard.card_type === "CLOZE" &&
              session.showAnswer &&
              (currentCard.front || currentCard.back) && (
                <div className="mt-6 space-y-4">
                  {currentCard.front && (
                    <div className="rounded-lg border bg-blue-50 p-4">
                      <h4 className="mb-2 font-medium text-blue-900">
                        Additional Context
                      </h4>
                      <div
                        className="prose prose-sm max-w-none text-blue-800"
                        dangerouslySetInnerHTML={{ __html: currentCard.front }}
                      />
                    </div>
                  )}
                  {currentCard.back && (
                    <div className="rounded-lg border bg-green-50 p-4">
                      <h4 className="mb-2 font-medium text-green-900">
                        Extra Information
                      </h4>
                      <div
                        className="prose prose-sm max-w-none text-green-800"
                        dangerouslySetInnerHTML={{ __html: currentCard.back }}
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
