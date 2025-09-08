"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import Link from "next/link";
import {
  Play,
  MoreVertical,
  Edit,
  Trash2,
  BarChart3,
  BookOpen,
  Users,
  // Calendar, - not used
  // Clock, - not used
  CheckCircle2,
  // AlertCircle, - not used
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ExportDeck } from "@/components/ExportDeck";
import { useIsMobile } from "@/hooks/use-mobile";
import { api } from "@/trpc/react";
// useEffect removed - not used

interface DeckCardProps {
  deck: {
    id: string;
    name: string;
    description?: string | null;
    is_public: boolean;
    updated_at: Date;
    _count: {
      cards: number;
    };
    organization?: {
      id: string;
      name: string;
    } | null;
    stats?: {
      due: number;
      new: number;
      learning: number;
      review: number;
      reviewedToday: number;
      todayAccuracy: number;
    };
  };
  onDelete: (deckId: string, deckName: string) => void;
  showStats?: boolean;
}

export function DeckCard({ deck, onDelete, showStats = true }: DeckCardProps) {
  const isMobile = useIsMobile();

  // Fetch stats if not provided and showStats is true
  const { data: statsData } = api.deck.getQuickStats.useQuery(
    { deckIds: [deck.id] },
    {
      enabled: showStats && !deck.stats,
      staleTime: 60 * 1000, // Cache for 1 minute
    },
  );

  const stats = deck.stats ?? statsData?.[deck.id];

  const getDueCardsBadgeColor = (dueCount: number) => {
    if (dueCount === 0) return "bg-muted text-muted-foreground";
    if (dueCount > 20) return "bg-red-500 text-white hover:bg-red-600";
    if (dueCount > 0) return "bg-orange-500 text-white hover:bg-orange-600";
    return "bg-muted text-muted-foreground";
  };

  return (
    <Card className="group flex h-full flex-col transition-shadow hover:shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <CardTitle
              className={cn(
                "line-clamp-2 leading-tight",
                isMobile ? "text-base" : "text-lg",
              )}
            >
              {deck.name}
            </CardTitle>
            {deck.description && !isMobile && (
              <p className="text-muted-foreground mt-1 line-clamp-1 text-sm">
                {deck.description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {showStats && stats && stats.due > 0 && (
              <Badge
                className={cn(
                  "shrink-0",
                  getDueCardsBadgeColor(stats.due as number),
                  isMobile && "px-2 py-0.5 text-xs",
                )}
              >
                {stats.due} due
              </Badge>
            )}

            {!isMobile && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 shrink-0 p-0"
                    aria-label="Deck options"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={`/decks/${deck.id}/study`}>
                      <Play className="mr-2 h-4 w-4" />
                      Study
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={`/decks/${deck.id}/stats`}>
                      <BarChart3 className="mr-2 h-4 w-4" />
                      Statistics
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href={`/decks/${deck.id}/edit`}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit Deck
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={`/decks/${deck.id}/cards`}>
                      <BookOpen className="mr-2 h-4 w-4" />
                      Manage Cards
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <ExportDeck
                    deckId={deck.id}
                    deckName={deck.name}
                    asDropdownItem={true}
                  />
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => onDelete(deck.id, deck.name)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-grow flex-col pt-0">
        <div className="flex-grow space-y-2">
          {/* Compact Statistics Row - Always show when showStats is true */}
          {showStats ? (
            <div
              className={cn(
                "bg-muted/30 flex items-center gap-4 rounded-md px-3 py-2",
                isMobile ? "text-xs" : "text-sm",
              )}
            >
              <div className="flex flex-1 items-center gap-3">
                {stats ? (
                  <>
                    <div className="flex items-center gap-1.5">
                      <div className="h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                      <span className="font-medium">{stats.new ?? 0}</span>
                      <span className="text-muted-foreground">new</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="h-2 w-2 shrink-0 rounded-full bg-orange-500" />
                      <span className="font-medium">{stats.learning ?? 0}</span>
                      <span className="text-muted-foreground">learning</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="h-2 w-2 shrink-0 rounded-full bg-green-500" />
                      <span className="font-medium">{stats.review ?? 0}</span>
                      <span className="text-muted-foreground">review</span>
                    </div>
                  </>
                ) : (
                  <span className="text-muted-foreground">
                    Loading stats...
                  </span>
                )}
              </div>

              {/* Total cards on the same line */}
              <div className="text-muted-foreground flex items-center gap-1.5">
                <span>{deck._count.cards}</span>
                <span>cards</span>
              </div>
            </div>
          ) : null}

          {/* Today's Activity - Only show if there's activity */}
          {showStats && stats && stats.reviewedToday > 0 && (
            <div
              className={cn(
                "flex items-center justify-between px-3 py-1.5",
                isMobile ? "text-xs" : "text-sm",
              )}
            >
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-500" />
                <span className="text-muted-foreground">
                  {stats.reviewedToday} reviewed today
                </span>
              </div>
              <span className="text-muted-foreground font-medium">
                {stats.todayAccuracy}% correct
              </span>
            </div>
          )}

          {/* If no stats bar shown, display total cards */}
          {!showStats && (
            <div
              className={cn(
                "flex items-center justify-between px-3 py-2",
                isMobile ? "text-sm" : "text-base",
              )}
            >
              <span className="text-muted-foreground">Total cards</span>
              <span className="font-medium">{deck._count.cards}</span>
            </div>
          )}

          {/* Metadata row - Desktop only - Always takes space for consistency */}
          {!isMobile && (
            <div className="text-muted-foreground flex min-h-[20px] items-center justify-between px-3 text-xs">
              <div className="flex items-center gap-3">
                {deck.is_public && (
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    <span>Public</span>
                  </div>
                )}
                {deck.organization && (
                  <span className="truncate">{deck.organization.name}</span>
                )}
              </div>
              <span className="ml-2 shrink-0">
                Updated{" "}
                {formatDistanceToNow(new Date(deck.updated_at), {
                  addSuffix: true,
                })}
              </span>
            </div>
          )}
        </div>

        {/* Action buttons - Consistent spacing from content */}
        <div className="mt-4 flex gap-2">
          <Link
            href={`/decks/${deck.id}/study`}
            className={cn(
              buttonVariants({
                variant: stats && stats.due > 0 ? "default" : "outline",
                size: isMobile ? "default" : "sm",
              }),
              "flex-1",
            )}
          >
            <Play className="mr-2 h-4 w-4" />
            Study
          </Link>
          {!isMobile && (
            <>
              <Link
                href={`/decks/${deck.id}/cards`}
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                )}
              >
                <BookOpen className="mr-2 h-4 w-4" />
                Cards
              </Link>
              <Link
                href={`/decks/${deck.id}/stats`}
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                )}
              >
                <BarChart3 className="h-4 w-4" />
              </Link>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
