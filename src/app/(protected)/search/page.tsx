"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AdvancedSearch } from "@/components/AdvancedSearch";
import { api } from "@/trpc/react";
import Link from "next/link";
import {
  ArrowLeft,
  FileText,
  Brain,
  BookOpen,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface SearchFilters {
  search: string;
  cardType?: "BASIC" | "CLOZE";
  tags: string[];
  deckIds: string[];
  searchFields: string[];
  createdAfter?: Date;
  createdBefore?: Date;
  sortBy:
    | "created_at"
    | "updated_at"
    | "front"
    | "due_date"
    | "interval"
    | "difficulty"
    | "lapses"
    | "repetitions";
  sortOrder: "asc" | "desc";
}

const ITEMS_PER_PAGE = 20;

export default function GlobalSearchPage() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";

  const [filters, setFilters] = useState<SearchFilters>({
    search: initialQuery,
    tags: [],
    deckIds: [],
    searchFields: ["front", "back", "cloze_text", "tags"],
    sortBy: "created_at",
    sortOrder: "desc",
  });
  const [currentPage, setCurrentPage] = useState(1);

  const searchQuery = api.card.globalSearch.useQuery(
    {
      search: filters.search,
      cardType: filters.cardType,
      tags: filters.tags,
      deckIds: filters.deckIds,
      searchFields: filters.searchFields as
        | ("front" | "back" | "cloze_text" | "tags")[]
        | undefined,
      limit: ITEMS_PER_PAGE,
      offset: (currentPage - 1) * ITEMS_PER_PAGE,
    },
    {
      enabled: !!filters.search,
    },
  );

  const handleSearch = (newFilters: SearchFilters) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  const totalPages = searchQuery.data
    ? Math.ceil(searchQuery.data.totalCount / ITEMS_PER_PAGE)
    : 0;

  // const stripHtml = (html: string) => {
  //   const tmp = document.createElement("DIV");
  //   tmp.innerHTML = html;
  //   return tmp.textContent ?? tmp.innerText ?? "";
  // };

  const highlightText = (text: string, searchTerm: string) => {
    if (!searchTerm) return text;
    const regex = new RegExp(
      `(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
      "gi",
    );
    return text.replace(regex, "<mark>$1</mark>");
  };

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Header - Mobile-first responsive design */}
      <div className="mb-6 lg:mb-8">
        {/* Back button - Better touch target on mobile */}
        <Link
          href="/decks"
          className="text-muted-foreground hover:text-foreground mb-3 inline-flex items-center text-sm transition-colors"
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          <span className="font-medium">Back to Decks</span>
        </Link>

        {/* Title section - Responsive sizing and spacing */}
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl lg:text-2xl">
            Global Search
          </h1>
          <p className="text-muted-foreground max-w-2xl text-sm sm:text-base">
            Search across all your flashcards and decks
          </p>
        </div>
      </div>

      {/* Search Interface */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <AdvancedSearch onSearch={handleSearch} initialFilters={filters} />
        </CardContent>
      </Card>

      {/* Search Results */}
      {filters.search && (
        <div className="space-y-4">
          {/* Results Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">Search Results</h2>
              {searchQuery.data && (
                <Badge variant="secondary">
                  {searchQuery.data.totalCount} cards found
                </Badge>
              )}
            </div>

            {/* Pagination Info */}
            {searchQuery.data &&
              searchQuery.data.totalCount > ITEMS_PER_PAGE && (
                <div className="text-muted-foreground text-sm">
                  Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{" "}
                  {Math.min(
                    currentPage * ITEMS_PER_PAGE,
                    searchQuery.data.totalCount,
                  )}{" "}
                  of {searchQuery.data.totalCount} results
                </div>
              )}
          </div>

          {/* Loading */}
          {searchQuery.isLoading && (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <Skeleton className="h-4 w-1/4" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                      <div className="flex gap-2">
                        <Skeleton className="h-6 w-16" />
                        <Skeleton className="h-6 w-20" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Error */}
          {searchQuery.error && (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-red-600">
                  Error searching cards: {searchQuery.error.message}
                </p>
              </CardContent>
            </Card>
          )}

          {/* No Results */}
          {searchQuery.data && searchQuery.data.cards.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="flex flex-col items-center gap-3">
                  <FileText className="text-muted-foreground h-12 w-12" />
                  <h3 className="text-lg font-semibold">No cards found</h3>
                  <p className="text-muted-foreground">
                    Try adjusting your search terms or filters
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Search Results */}
          {searchQuery.data && searchQuery.data.cards.length > 0 && (
            <>
              <div className="grid gap-4">
                {searchQuery.data.cards.map((card) => (
                  <Card
                    key={card.id}
                    className="transition-shadow hover:shadow-md"
                  >
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        {/* Card Header */}
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                card.card_type === "CLOZE"
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {card.card_type === "CLOZE" ? (
                                <Brain className="mr-1 h-3 w-3" />
                              ) : (
                                <FileText className="mr-1 h-3 w-3" />
                              )}
                              {card.card_type === "CLOZE" ? "Cloze" : "Basic"}
                            </Badge>
                            <Link
                              href={`/decks/${card.deck.id}/cards`}
                              className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm"
                            >
                              <BookOpen className="h-3 w-3" />
                              {card.deck.name}
                            </Link>
                          </div>
                          <Link
                            href={`/decks/${card.deck.id}/cards/${card.id}/edit`}
                          >
                            <Button variant="ghost" size="sm">
                              Edit
                            </Button>
                          </Link>
                        </div>

                        {/* Card Content */}
                        <div className="space-y-2">
                          {card.card_type === "BASIC" ? (
                            <>
                              <div className="bg-muted/30 rounded-lg border p-3">
                                <p className="text-muted-foreground mb-1 text-sm">
                                  Front:
                                </p>
                                <div
                                  className="prose prose-sm max-w-none"
                                  dangerouslySetInnerHTML={{
                                    __html: highlightText(
                                      card.front,
                                      filters.search,
                                    ),
                                  }}
                                />
                              </div>
                              <div className="rounded-lg border p-3">
                                <p className="text-muted-foreground mb-1 text-sm">
                                  Back:
                                </p>
                                <div
                                  className="prose prose-sm max-w-none"
                                  dangerouslySetInnerHTML={{
                                    __html: highlightText(
                                      card.back,
                                      filters.search,
                                    ),
                                  }}
                                />
                              </div>
                            </>
                          ) : (
                            <>
                              {card.cloze_text && (
                                <div className="rounded-lg border bg-blue-50 p-3">
                                  <p className="text-muted-foreground mb-1 text-sm">
                                    Cloze Text:
                                  </p>
                                  <div
                                    className="prose prose-sm max-w-none"
                                    dangerouslySetInnerHTML={{
                                      __html: highlightText(
                                        card.cloze_text,
                                        filters.search,
                                      ),
                                    }}
                                  />
                                </div>
                              )}
                              {card.front && (
                                <div className="bg-muted/30 rounded-lg border p-3">
                                  <p className="text-muted-foreground mb-1 text-sm">
                                    Additional Context:
                                  </p>
                                  <div
                                    className="prose prose-sm max-w-none"
                                    dangerouslySetInnerHTML={{
                                      __html: highlightText(
                                        card.front,
                                        filters.search,
                                      ),
                                    }}
                                  />
                                </div>
                              )}
                            </>
                          )}
                        </div>

                        {/* Tags */}
                        {card.tags && card.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {card.tags.map((tag) => (
                              <Badge
                                key={tag}
                                variant="outline"
                                className="text-xs"
                              >
                                #{tag}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {/* Card State Info */}
                        {card.card_states && card.card_states.length > 0 && (
                          <div className="text-muted-foreground flex items-center gap-4 text-xs">
                            <span>State: {card.card_states[0]!.state}</span>
                            {card.card_states[0]!.interval > 0 && (
                              <span>
                                Interval: {card.card_states[0]!.interval} days
                              </span>
                            )}
                            <span>
                              Due:{" "}
                              {new Date(
                                card.card_states[0]!.due_date,
                              ).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <Button
                        variant="outline"
                        onClick={() =>
                          setCurrentPage((prev) => Math.max(1, prev - 1))
                        }
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="mr-2 h-4 w-4" />
                        Previous
                      </Button>

                      <div className="flex items-center gap-2">
                        {Array.from(
                          { length: Math.min(5, totalPages) },
                          (_, i) => {
                            const page = i + Math.max(1, currentPage - 2);
                            if (page > totalPages) return null;

                            return (
                              <Button
                                key={page}
                                variant={
                                  page === currentPage ? "default" : "outline"
                                }
                                size="sm"
                                onClick={() => setCurrentPage(page)}
                              >
                                {page}
                              </Button>
                            );
                          },
                        )}
                        {totalPages > 5 && currentPage < totalPages - 2 && (
                          <>
                            <span className="text-muted-foreground">...</span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentPage(totalPages)}
                            >
                              {totalPages}
                            </Button>
                          </>
                        )}
                      </div>

                      <Button
                        variant="outline"
                        onClick={() =>
                          setCurrentPage((prev) =>
                            Math.min(totalPages, prev + 1),
                          )
                        }
                        disabled={currentPage === totalPages}
                      >
                        Next
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      )}

      {/* Help Text */}
      {!filters.search && (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="flex flex-col items-center gap-3">
              <FileText className="text-muted-foreground h-12 w-12" />
              <h3 className="text-lg font-semibold">Search Your Flashcards</h3>
              <p className="text-muted-foreground max-w-md">
                Enter search terms above to find cards across all your decks.
                Use the advanced search options to filter by card type, tags,
                date range, and more.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
