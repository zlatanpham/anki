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
import { ArrowLeft, Clock, BarChart3, Pause, Play, RotateCcw } from "lucide-react";
import { type ReviewRating } from "@prisma/client";

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
  const { data: reviewQueue, isLoading: isLoadingQueue, refetch: refetchQueue } = api.study.getReviewQueue.useQuery(
    { limit: 20 },
    { enabled: !session }
  );

  // Get due cards count
  const { data: dueCardsCount } = api.study.getDueCardsCount.useQuery({});

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
        // Session completed
        endSession();
      }
    },
    onError: (error) => {
      toast.error(`Failed to submit review: ${error.message}`);
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

  const endSession = () => {
    setSession(null);
    setResponseStartTime(null);
    setIsPaused(false);
    void refetchQueue();
    toast.success("Study session completed!");
  };

  const showAnswer = () => {
    if (session && !session.showAnswer) {
      setSession(prev => prev ? { ...prev, showAnswer: true } : null);
    }
  };

  const submitCardReview = (rating: ReviewRating) => {
    if (!session || !responseStartTime) return;

    const currentCard = session.cards[session.currentIndex];
    if (!currentCard) return;

    const responseTime = Date.now() - responseStartTime.getTime();

    // Update session stats
    setSession(prev => prev ? {
      ...prev,
      sessionStats: {
        ...prev.sessionStats,
        [rating.toLowerCase()]: prev.sessionStats[rating.toLowerCase() as keyof typeof prev.sessionStats] + 1,
      },
    } : null);

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
      setSession(prev => prev ? {
        ...prev,
        currentIndex: 0,
        showAnswer: false,
        sessionStats: { again: 0, hard: 0, good: 0, easy: 0 },
      } : null);
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

  if (isLoadingQueue) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading study session...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Study Session</h1>
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
                  <div className="text-3xl font-bold text-primary">
                    {dueCardsCount.totalDue}
                  </div>
                  <p className="text-muted-foreground">cards ready for review</p>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>New cards</span>
                      <Badge variant="secondary">{dueCardsCount.newCards}</Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Learning cards</span>
                      <Badge variant="outline">{dueCardsCount.learningCards}</Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Review cards</span>
                      <Badge variant="default">{dueCardsCount.reviewCards}</Badge>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No cards due for review</p>
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
                  <p className="text-sm text-muted-foreground">
                    You have {reviewQueue.cards.length} cards ready for review in this session.
                  </p>
                  
                  <Button 
                    onClick={startStudySession}
                    className="w-full"
                    size="lg"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Start Study Session
                  </Button>

                  <div className="text-xs text-muted-foreground space-y-1">
                    <p><kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Space</kbd> - Show answer</p>
                    <p><kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">1</kbd> Again | <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">2</kbd> Hard | <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">3</kbd> Good | <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">4</kbd> Easy</p>
                    <p><kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">P</kbd> - Pause session</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    No cards are currently due for review. Great job keeping up with your studies!
                  </p>
                  <Link href="/decks">
                    <Button variant="outline">
                      Browse Decks
                    </Button>
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

  const progress = ((session.currentIndex + 1) / session.cards.length) * 100;
  const totalReviews = Object.values(session.sessionStats).reduce((a, b) => a + b, 0);

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Session Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button onClick={endSession} variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            End Session
          </Button>
          <div className="text-sm text-muted-foreground">
            Card {session.currentIndex + 1} of {session.cards.length}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button onClick={togglePause} variant="outline" size="sm">
            {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          </Button>
          <Button onClick={restartSession} variant="outline" size="sm">
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <Progress value={progress} className="h-2" />
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>Progress: {Math.round(progress)}%</span>
          <span>Reviews: {totalReviews}</span>
        </div>
      </div>

      {isPaused ? (
        <Card className="mb-6">
          <CardContent className="text-center py-12">
            <Pause className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Session Paused</h3>
            <p className="text-muted-foreground mb-4">Take a break when you need it!</p>
            <Button onClick={togglePause}>
              <Play className="h-4 w-4 mr-2" />
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
                <Badge variant="outline">
                  {currentCard.card.deck.name}
                </Badge>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  {currentCard.stateDescription}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Question */}
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-2">Question</div>
                  <div 
                    className="text-lg leading-relaxed p-4 bg-muted/50 rounded-lg"
                    dangerouslySetInnerHTML={{ __html: currentCard.card.front }}
                  />
                </div>

                {session.showAnswer && (
                  <>
                    <Separator />
                    {/* Answer */}
                    <div>
                      <div className="text-sm font-medium text-muted-foreground mb-2">Answer</div>
                      <div 
                        className="text-lg leading-relaxed p-4 bg-primary/5 rounded-lg"
                        dangerouslySetInnerHTML={{ __html: currentCard.card.back }}
                      />
                    </div>

                    {/* Cloze text if applicable */}
                    {currentCard.card.card_type === "CLOZE" && currentCard.card.cloze_text && (
                      <div>
                        <div className="text-sm font-medium text-muted-foreground mb-2">Cloze Context</div>
                        <div 
                          className="text-sm leading-relaxed p-3 bg-blue-50 rounded-lg border-l-4 border-blue-200"
                          dangerouslySetInnerHTML={{ __html: currentCard.card.cloze_text }}
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Button
                variant="destructive"
                onClick={() => submitCardReview("AGAIN")}
                disabled={submitReview.isPending}
                className="flex flex-col h-auto py-3"
              >
                <span className="font-semibold">Again</span>
                <span className="text-xs opacity-75">Press 1</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => submitCardReview("HARD")}
                disabled={submitReview.isPending}
                className="flex flex-col h-auto py-3 border-orange-200 text-orange-700 hover:bg-orange-50"
              >
                <span className="font-semibold">Hard</span>
                <span className="text-xs opacity-75">Press 2</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => submitCardReview("GOOD")}
                disabled={submitReview.isPending}
                className="flex flex-col h-auto py-3 border-green-200 text-green-700 hover:bg-green-50"
              >
                <span className="font-semibold">Good</span>
                <span className="text-xs opacity-75">Press 3</span>
              </Button>
              <Button
                onClick={() => submitCardReview("EASY")}
                disabled={submitReview.isPending}
                className="flex flex-col h-auto py-3 bg-blue-600 hover:bg-blue-700"
              >
                <span className="font-semibold">Easy</span>
                <span className="text-xs opacity-75">Press 4</span>
              </Button>
            </div>
          )}

          {/* Session Stats */}
          {totalReviews > 0 && (
            <Card className="mt-6">
              <CardContent className="pt-6">
                <div className="text-sm font-medium mb-3">Session Statistics</div>
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-lg font-bold text-red-600">{session.sessionStats.again}</div>
                    <div className="text-xs text-muted-foreground">Again</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-orange-600">{session.sessionStats.hard}</div>
                    <div className="text-xs text-muted-foreground">Hard</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-green-600">{session.sessionStats.good}</div>
                    <div className="text-xs text-muted-foreground">Good</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-blue-600">{session.sessionStats.easy}</div>
                    <div className="text-xs text-muted-foreground">Easy</div>
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