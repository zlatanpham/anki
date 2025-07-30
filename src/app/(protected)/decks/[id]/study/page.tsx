"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import Link from "next/link";
import { ArrowLeft, Clock, BarChart3, Pause, Play, RotateCcw, BookOpen } from "lucide-react";
import { type ReviewRating } from "@prisma/client";
import { ClozeDisplay } from "@/components/ClozeDisplay";

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
  const { data: reviewQueue, isLoading: isLoadingQueue, refetch: refetchQueue } = api.study.getDeckReviewQueue.useQuery(
    { deckId, limit: 20 },
    { enabled: !session }
  );

  // Get deck due cards count
  const { data: dueCardsCount } = api.study.getDeckDueCardsCount.useQuery({ deckId });

  // Submit review mutation
  const submitReview = api.study.submitReview.useMutation({
    onSuccess: () => {
      // Move to next card or end session
      if (session && session.currentIndex < session.cards.length - 1) {
        setSession(prev => prev ? {
          ...prev,
          currentIndex: prev.currentIndex + 1,
          showAnswer: false,
        } : null);
        setResponseStartTime(new Date());
      } else {
        // End session
        finishSession();
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

  const finishSession = () => {
    if (session) {
      const duration = new Date().getTime() - session.startTime.getTime();
      const minutes = Math.round(duration / 60000);
      const totalCards = session.sessionStats.again + session.sessionStats.hard + 
                        session.sessionStats.good + session.sessionStats.easy;
      
      toast.success(`Study session completed! Reviewed ${totalCards} cards in ${minutes} minutes.`);
    }
    setSession(null);
    setResponseStartTime(null);
    refetchQueue();
  };

  const showAnswer = () => {
    setSession(prev => prev ? { ...prev, showAnswer: true } : null);
  };

  const submitCardReview = async (rating: ReviewRating) => {
    if (!session || !responseStartTime) return;

    const currentCard = session.cards[session.currentIndex];
    const responseTime = new Date().getTime() - responseStartTime.getTime();

    // Update session stats
    setSession(prev => prev ? {
      ...prev,
      sessionStats: {
        ...prev.sessionStats,
        [rating.toLowerCase()]: prev.sessionStats[rating.toLowerCase() as keyof typeof prev.sessionStats] + 1,
      },
    } : null);

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
    setSession(null);
    setResponseStartTime(null);
    refetchQueue();
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
            submitCardReview("AGAIN");
            break;
          case "Digit2":
            submitCardReview("HARD");
            break;
          case "Digit3":
            submitCardReview("GOOD");
            break;
          case "Digit4":
            submitCardReview("EASY");
            break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [session, isPaused, showAnswer, submitCardReview, togglePause]);

  if (isLoadingQueue) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => router.push(`/decks/${deckId}/cards`)}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to {deck?.name || "Deck"}
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <BookOpen className="w-6 h-6" />
                Study: {deck?.name}
              </h1>
              <p className="text-muted-foreground">
                Focus on cards from this deck
              </p>
            </div>
          </div>
        </div>

        {/* Study Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Due Cards</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {dueCardsCount?.due || 0}
                  </p>
                </div>
                <Clock className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">New Cards</p>
                  <p className="text-2xl font-bold text-green-600">
                    {dueCardsCount?.new || 0}
                  </p>
                </div>
                <BarChart3 className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Learning</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {dueCardsCount?.learning || 0}
                  </p>
                </div>
                <RotateCcw className="w-8 h-8 text-orange-600" />
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
                  You have {reviewQueue.length} cards ready for review in this deck.
                </p>
                <Button onClick={startSession} size="lg" className="w-full">
                  Start Study Session
                </Button>
                <div className="text-sm text-muted-foreground text-center">
                  <p>Keyboard shortcuts:</p>
                  <p><kbd className="bg-muted px-2 py-1 rounded">Space</kbd> - Show answer</p>
                  <p><kbd className="bg-muted px-2 py-1 rounded">1</kbd> Again • <kbd className="bg-muted px-2 py-1 rounded">2</kbd> Hard • <kbd className="bg-muted px-2 py-1 rounded">3</kbd> Good • <kbd className="bg-muted px-2 py-1 rounded">4</kbd> Easy</p>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <p className="text-muted-foreground">
                  No cards are due for review in this deck right now.
                </p>
                <p className="text-sm text-muted-foreground">
                  Check back later or review all decks from the main study page.
                </p>
                <div className="flex gap-2 justify-center">
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
  const progress = ((session.currentIndex + 1) / session.cards.length) * 100;
  const totalReviews = Object.values(session.sessionStats).reduce((a, b) => a + b, 0);

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">
            Studying: {deck?.name}
          </h1>
          <Badge variant="outline">
            {session.currentIndex + 1} / {session.cards.length}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={togglePause}>
            {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </Button>
          <Button variant="outline" size="sm" onClick={resetSession}>
            <RotateCcw className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={finishSession}>
            End Session
          </Button>
        </div>
      </div>

      {/* Progress */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-muted-foreground mb-2">
          <span>Progress</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="w-full" />
      </div>

      {/* Session Stats */}
      <div className="grid grid-cols-4 gap-2 mb-6">
        <div className="text-center p-2 bg-red-50 rounded">
          <div className="font-semibold text-red-600">{session.sessionStats.again}</div>
          <div className="text-xs text-red-600">Again</div>
        </div>
        <div className="text-center p-2 bg-orange-50 rounded">
          <div className="font-semibold text-orange-600">{session.sessionStats.hard}</div>
          <div className="text-xs text-orange-600">Hard</div>
        </div>
        <div className="text-center p-2 bg-green-50 rounded">
          <div className="font-semibold text-green-600">{session.sessionStats.good}</div>
          <div className="text-xs text-green-600">Good</div>
        </div>
        <div className="text-center p-2 bg-blue-50 rounded">
          <div className="font-semibold text-blue-600">{session.sessionStats.easy}</div>
          <div className="text-xs text-blue-600">Easy</div>
        </div>
      </div>

      {isPaused ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Pause className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Study Paused</h2>
            <p className="text-muted-foreground mb-4">Take a break and resume when you're ready.</p>
            <Button onClick={togglePause}>
              <Play className="w-4 h-4 mr-2" />
              Resume Study
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>
                {currentCard.card_type === "CLOZE" ? "Cloze Deletion" : "Flashcard"}
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
                clozeText={currentCard.cloze_text}
                isRevealed={session.showAnswer}
              />
            ) : (
              <div className="space-y-6">
                <div className="p-6 border rounded-lg">
                  <div 
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: currentCard.front }}
                  />
                </div>
                
                {session.showAnswer && (
                  <>
                    <Separator />
                    <div className="p-6 border rounded-lg bg-muted/50">
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
            {currentCard.card_type === "CLOZE" && session.showAnswer && (currentCard.front || currentCard.back) && (
              <div className="mt-6 space-y-4">
                {currentCard.front && (
                  <div className="p-4 border rounded-lg bg-blue-50">
                    <h4 className="font-medium text-blue-900 mb-2">Additional Context</h4>
                    <div 
                      className="prose prose-sm max-w-none text-blue-800"
                      dangerouslySetInnerHTML={{ __html: currentCard.front }}
                    />
                  </div>
                )}
                {currentCard.back && (
                  <div className="p-4 border rounded-lg bg-green-50">
                    <h4 className="font-medium text-green-900 mb-2">Extra Information</h4>
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
            <div className="grid grid-cols-4 gap-2">
              <Button
                variant="destructive"
                onClick={() => submitCardReview("AGAIN")}
                disabled={submitReview.isPending}
                className="flex flex-col gap-1 h-16"
              >
                <span>Again</span>
                <span className="text-xs opacity-70">1</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => submitCardReview("HARD")}
                disabled={submitReview.isPending}
                className="flex flex-col gap-1 h-16 border-orange-200 text-orange-600 hover:bg-orange-50"
              >
                <span>Hard</span>
                <span className="text-xs opacity-70">2</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => submitCardReview("GOOD")}
                disabled={submitReview.isPending}
                className="flex flex-col gap-1 h-16 border-green-200 text-green-600 hover:bg-green-50"
              >
                <span>Good</span>
                <span className="text-xs opacity-70">3</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => submitCardReview("EASY")}
                disabled={submitReview.isPending}
                className="flex flex-col gap-1 h-16 border-blue-200 text-blue-600 hover:bg-blue-50"
              >
                <span>Easy</span>
                <span className="text-xs opacity-70">4</span>
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}