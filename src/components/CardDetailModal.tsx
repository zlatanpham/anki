"use client";

import { useState } from "react";
import type { Card, CardState, Review } from "@prisma/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CardStateIndicator } from "@/components/CardStateIndicator";
import { IntervalDisplay } from "@/components/IntervalDisplay";
import { DueDateBadge } from "@/components/DueDateBadge";
// formatDueDate and formatInterval removed - not used
import {
  CalendarIcon,
  ClockIcon,
  TrendingUpIcon,
  BrainIcon,
  HistoryIcon,
  Edit2Icon,
  PauseIcon,
  PlayIcon,
  RotateCcwIcon,
  // BarChart3Icon, - not used
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface CardWithDetails extends Card {
  card_states: CardState[];
  reviews?: Review[];
}

interface CardDetailModalProps {
  card: CardWithDetails | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: () => void;
  onSuspend?: () => void;
  onResume?: () => void;
  onReset?: () => void;
}

export function CardDetailModal({
  card,
  isOpen,
  onClose,
  onEdit,
  onSuspend,
  onResume,
  onReset,
}: CardDetailModalProps) {
  const [activeTab, setActiveTab] = useState("overview");

  if (!card) return null;

  const cardState = card.card_states[0];
  const isSuspended = cardState?.state === "SUSPENDED";

  // Calculate performance metrics
  const totalReviews = card.reviews?.length ?? 0;
  const successfulReviews =
    card.reviews?.filter((r) => r.rating === "EASY" || r.rating === "GOOD")
      .length ?? 0;
  const successRate =
    totalReviews > 0 ? (successfulReviews / totalReviews) * 100 : 0;
  const avgResponseTime =
    totalReviews > 0
      ? (card.reviews?.reduce((acc, r) => acc + r.response_time, 0) ?? 0) /
        totalReviews /
        1000
      : 0;

  // Get difficulty level based on easiness factor
  const getDifficultyLevel = (easinessFactor: number) => {
    if (easinessFactor >= 2.5)
      return { label: "Easy", color: "text-green-600 dark:text-green-400" };
    if (easinessFactor >= 2.0)
      return { label: "Medium", color: "text-yellow-600 dark:text-yellow-400" };
    return { label: "Hard", color: "text-red-600 dark:text-red-400" };
  };

  const difficulty = cardState
    ? getDifficultyLevel(cardState.easiness_factor)
    : null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Card Details</DialogTitle>
          <DialogDescription>
            Comprehensive view of card information and learning statistics
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="statistics">Statistics</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4 space-y-4">
            <div className="space-y-3">
              <div>
                <h4 className="text-muted-foreground mb-1 text-sm font-medium">
                  Question
                </h4>
                <p className="text-base">{card.front}</p>
              </div>
              <Separator />
              <div>
                <h4 className="text-muted-foreground mb-1 text-sm font-medium">
                  Answer
                </h4>
                <p className="text-base">{card.back}</p>
              </div>
            </div>

            {cardState && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h4 className="text-muted-foreground text-sm font-medium">
                    Learning Status
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-muted-foreground text-sm">
                        State:
                      </span>
                      <CardStateIndicator state={cardState.state} />
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-muted-foreground text-sm">
                        Interval:
                      </span>
                      <IntervalDisplay interval={cardState.interval} />
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-muted-foreground text-sm">
                        Due:
                      </span>
                      <DueDateBadge dueDate={cardState.due_date} />
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-muted-foreground text-sm">
                        Difficulty:
                      </span>
                      {difficulty && (
                        <span className={cn("font-medium", difficulty.color)}>
                          {difficulty.label}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <Separator />
                <div className="space-y-3">
                  <h4 className="text-muted-foreground text-sm font-medium">
                    Additional Information
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <BrainIcon className="text-muted-foreground h-4 w-4" />
                      <span className="text-muted-foreground">
                        Repetitions:
                      </span>
                      <span className="font-medium">
                        {cardState.repetitions}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <TrendingUpIcon className="text-muted-foreground h-4 w-4" />
                      <span className="text-muted-foreground">Lapses:</span>
                      <span className="font-medium">{cardState.lapses}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CalendarIcon className="text-muted-foreground h-4 w-4" />
                      <span className="text-muted-foreground">
                        Last Reviewed:
                      </span>
                      <span className="font-medium">
                        {cardState.last_reviewed
                          ? formatDistanceToNow(
                              new Date(cardState.last_reviewed),
                              { addSuffix: true },
                            )
                          : "Never"}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <ClockIcon className="text-muted-foreground h-4 w-4" />
                      <span className="text-muted-foreground">Created:</span>
                      <span className="font-medium">
                        {formatDistanceToNow(new Date(card.created_at), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}

            {card.tags.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h4 className="text-muted-foreground text-sm font-medium">
                    Tags
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {card.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="statistics" className="mt-4 space-y-4">
            <div className="grid gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-muted-foreground text-sm font-medium">
                    Success Rate
                  </h4>
                  <span className="text-2xl font-bold">
                    {successRate.toFixed(1)}%
                  </span>
                </div>
                <Progress value={successRate} className="h-2" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-muted-foreground text-sm">Total Reviews</p>
                  <p className="text-2xl font-bold">{totalReviews}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground text-sm">
                    Avg Response Time
                  </p>
                  <p className="text-2xl font-bold">
                    {avgResponseTime.toFixed(1)}s
                  </p>
                </div>
              </div>

              {card.reviews && card.reviews.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-muted-foreground text-sm font-medium">
                    Rating Distribution
                  </h4>
                  <div className="space-y-2">
                    {["EASY", "GOOD", "HARD", "AGAIN"].map((rating) => {
                      const count =
                        card.reviews?.filter((r) => r.rating === rating)
                          .length ?? 0;
                      const percentage =
                        totalReviews > 0 ? (count / totalReviews) * 100 : 0;

                      return (
                        <div
                          key={rating}
                          className="flex items-center space-x-2"
                        >
                          <span className="w-16 text-sm">{rating}</span>
                          <div className="flex-1">
                            <Progress value={percentage} className="h-2" />
                          </div>
                          <span className="text-muted-foreground w-12 text-right text-sm">
                            {count}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="history" className="mt-4 space-y-4">
            {card.reviews && card.reviews.length > 0 ? (
              <div className="space-y-3">
                <h4 className="text-muted-foreground text-sm font-medium">
                  Review History
                </h4>
                <div className="space-y-2">
                  {card.reviews
                    .sort(
                      (a, b) =>
                        new Date(b.reviewed_at).getTime() -
                        new Date(a.reviewed_at).getTime(),
                    )
                    .slice(0, 10)
                    .map((review, _index) => (
                      <div
                        key={review.id}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div className="flex items-center space-x-3">
                          <HistoryIcon className="text-muted-foreground h-4 w-4" />
                          <div>
                            <p className="text-sm font-medium">
                              {formatDistanceToNow(
                                new Date(review.reviewed_at),
                                { addSuffix: true },
                              )}
                            </p>
                            <p className="text-muted-foreground text-xs">
                              Response time:{" "}
                              {(review.response_time / 1000).toFixed(1)}s
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge
                            variant={
                              review.rating === "EASY"
                                ? "default"
                                : review.rating === "GOOD"
                                  ? "secondary"
                                  : review.rating === "HARD"
                                    ? "outline"
                                    : "destructive"
                            }
                          >
                            {review.rating}
                          </Badge>
                          <span className="text-muted-foreground text-sm">
                            {review.new_interval}d → {review.previous_interval}d
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
                {card.reviews.length > 10 && (
                  <p className="text-muted-foreground text-center text-sm">
                    Showing latest 10 reviews of {card.reviews.length} total
                  </p>
                )}
              </div>
            ) : (
              <div className="py-8 text-center">
                <HistoryIcon className="text-muted-foreground mx-auto mb-3 h-12 w-12" />
                <p className="text-muted-foreground">No review history yet</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <div className="flex w-full gap-2 sm:w-auto">
            {onEdit && (
              <Button
                variant="outline"
                onClick={onEdit}
                className="flex-1 sm:flex-initial"
              >
                <Edit2Icon className="mr-2 h-4 w-4" />
                Edit
              </Button>
            )}
            {cardState && (
              <>
                {isSuspended
                  ? onResume && (
                      <Button
                        variant="outline"
                        onClick={onResume}
                        className="flex-1 sm:flex-initial"
                      >
                        <PlayIcon className="mr-2 h-4 w-4" />
                        Resume
                      </Button>
                    )
                  : onSuspend && (
                      <Button
                        variant="outline"
                        onClick={onSuspend}
                        className="flex-1 sm:flex-initial"
                      >
                        <PauseIcon className="mr-2 h-4 w-4" />
                        Suspend
                      </Button>
                    )}
                {onReset && (
                  <Button
                    variant="outline"
                    onClick={onReset}
                    className="flex-1 sm:flex-initial"
                  >
                    <RotateCcwIcon className="mr-2 h-4 w-4" />
                    Reset
                  </Button>
                )}
              </>
            )}
          </div>
          <Button onClick={onClose} className="w-full sm:w-auto">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
