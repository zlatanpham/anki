"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter 
} from "@/components/ui/dialog";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import Link from "next/link";
import { 
  ArrowLeft,
  Plus, 
  Search, 
  Edit,
  Trash2,
  FileText,
  Brain,
  MoreVertical
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { CardType as PrismaCardType } from "@prisma/client";
import { ClozePreview } from "@/components/ClozeDisplay";
import { validateClozeText, parseClozeText } from "@/lib/cloze";
import { RichTextEditor } from "@/components/RichTextEditor";
import { AdvancedSearch } from "@/components/AdvancedSearch";
import { SkeletonCardPreview } from "@/components/ui/skeleton-card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { CardStateIndicator } from "@/components/CardStateIndicator";
import { IntervalDisplay } from "@/components/IntervalDisplay";
import { DueDateBadge } from "@/components/DueDateBadge";
import { CardDetailModal } from "@/components/CardDetailModal";
import { CardSortingFilter, type SortingFilterOptions } from "@/components/CardSortingFilter";

interface CreateCardForm {
  cardType: PrismaCardType;
  front: string;
  back: string;
  clozeText: string;
  tags: string;
}

export default function DeckCardsPage() {
  const params = useParams();
  const deckId = params.id as string;
  
  const [searchFilters, setSearchFilters] = useState<{
    search: string;
    cardType?: "BASIC" | "CLOZE";
    tags: string[];
    deckIds: string[];
    searchFields: string[];
    createdAfter?: Date;
    createdBefore?: Date;
    sortBy: "created_at" | "updated_at" | "front" | "due_date" | "interval" | "difficulty" | "lapses" | "repetitions";
    sortOrder: "asc" | "desc";
    stateFilter?: ("NEW" | "LEARNING" | "REVIEW" | "SUSPENDED")[];
    dueFilter?: "overdue" | "today" | "tomorrow" | "week" | "all";
    intervalRange?: [number, number];
    difficultyRange?: [number, number];
    onlyWithLapses?: boolean;
  }>({
    search: "",
    cardType: undefined,
    tags: [],
    deckIds: [deckId],
    searchFields: ["front", "back", "cloze_text", "tags"],
    createdAfter: undefined,
    createdBefore: undefined,
    sortBy: "created_at",
    sortOrder: "desc",
    stateFilter: [],
    dueFilter: "all",
    intervalRange: [0, 365],
    difficultyRange: [1.3, 2.7],
    onlyWithLapses: false,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateCardForm>({
    cardType: "BASIC",
    front: "",
    back: "",
    clozeText: "",
    tags: "",
  });
  const [selectedCard, setSelectedCard] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Get deck details
  const { data: deck, isLoading: isDeckLoading, refetch: refetchDeck } = api.deck.getById.useQuery({ id: deckId });

  // Get cards for this deck
  const { data: cardsData, isLoading: isCardsLoading, refetch: refetchCards } = api.card.getByDeck.useQuery({
    deckId,
    search: searchFilters.search || undefined,
    cardType: searchFilters.cardType,
    tags: searchFilters.tags,
    createdAfter: searchFilters.createdAfter,
    createdBefore: searchFilters.createdBefore,
    sortBy: searchFilters.sortBy,
    sortOrder: searchFilters.sortOrder,
    searchFields: searchFilters.searchFields as ("front" | "back" | "cloze_text" | "tags")[],
    stateFilter: searchFilters.stateFilter,
    dueFilter: searchFilters.dueFilter,
    intervalRange: searchFilters.intervalRange,
    difficultyRange: searchFilters.difficultyRange,
    onlyWithLapses: searchFilters.onlyWithLapses,
    limit: 20,
    offset: (currentPage - 1) * 20,
  });

  // Refresh data when the page regains focus (e.g., after returning from study session)
  useEffect(() => {
    const handleFocus = () => {
      // Only refetch if the page is visible and data is not currently loading
      if (document.visibilityState === 'visible' && !isDeckLoading && !isCardsLoading) {
        void refetchDeck();
        void refetchCards();
      }
    };

    // Check if we're coming back from a study session by looking for a sessionStorage flag
    const completedStudy = sessionStorage.getItem('study-session-completed');
    if (completedStudy === deckId) {
      sessionStorage.removeItem('study-session-completed');
      void refetchDeck();
      void refetchCards();
    }

    document.addEventListener('visibilitychange', handleFocus);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleFocus);
      window.removeEventListener('focus', handleFocus);
    };
  }, [deckId, isDeckLoading, isCardsLoading, refetchDeck, refetchCards]);

  // Create card mutation
  const createCard = api.card.create.useMutation({
    onSuccess: () => {
      toast.success("Card created successfully!");
      setIsCreateDialogOpen(false);
      setCreateForm({
        cardType: "BASIC",
        front: "",
        back: "",
        clozeText: "",
        tags: "",
      });
      void refetchCards();
    },
    onError: (error) => {
      toast.error(`Failed to create card: ${error.message}`);
    },
  });

  // Delete card mutation
  const deleteCard = api.card.delete.useMutation({
    onSuccess: () => {
      toast.success("Card deleted successfully!");
      void refetchCards();
    },
    onError: (error) => {
      toast.error(`Failed to delete card: ${error.message}`);
    },
  });

  // Get card with reviews query
  const { data: cardWithReviews } = api.card.getByIdWithReviews.useQuery(
    { id: selectedCard?.id || "" },
    { enabled: !!selectedCard?.id }
  );

  const handleCreateCard = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if content is empty (accounting for empty HTML)
    const frontText = createForm.front.replace(/<[^>]*>/g, '').trim();
    const backText = createForm.back.replace(/<[^>]*>/g, '').trim();
    
    if (!frontText || !backText) {
      toast.error("Both front and back content are required");
      return;
    }

    if (createForm.cardType === "CLOZE") {
      const clozeText = createForm.clozeText.replace(/<[^>]*>/g, '').trim();
      if (!clozeText) {
        toast.error("Cloze text is required for cloze deletion cards");
        return;
      }

      const validation = validateClozeText(createForm.clozeText);
      if (!validation.isValid) {
        toast.error(`Invalid cloze format: ${validation.errors[0]}`);
        return;
      }
    }

    const tags = createForm.tags
      .split(",")
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);

    createCard.mutate({
      deckId,
      cardType: createForm.cardType,
      front: createForm.front,
      back: createForm.back,
      clozeText: createForm.cardType === "CLOZE" ? createForm.clozeText : undefined,
      tags,
    });
  };

  const handleDeleteCard = (cardId: string) => {
    if (confirm("Are you sure you want to delete this card? This action cannot be undone.")) {
      deleteCard.mutate({ id: cardId });
    }
  };

  const handleCardClick = (card: typeof filteredCards[0]) => {
    setSelectedCard(card);
    setIsDetailModalOpen(true);
  };

  const handleSortingFilterApply = (options: SortingFilterOptions) => {
    setSearchFilters(prev => ({
      ...prev,
      sortBy: options.sortBy,
      sortOrder: options.sortOrder,
      stateFilter: options.stateFilter,
      dueFilter: options.dueFilter,
      intervalRange: options.intervalRange,
      difficultyRange: options.difficultyRange,
      onlyWithLapses: options.onlyWithLapses,
    }));
    setCurrentPage(1);
  };

  // Only show full page skeleton on initial load when deck is loading
  if (isDeckLoading) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        {/* Breadcrumb Skeleton */}
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-32" />
        </div>
        
        {/* Header with title and buttons */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-80" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-44" />
            <Skeleton className="h-10 w-28" />
          </div>
        </div>
        
        <Card className="mb-6">
          <CardContent className="p-4">
            <Skeleton className="h-10 w-full mb-2" />
            <div className="flex gap-2">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-24" />
            </div>
          </CardContent>
        </Card>
        
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCardPreview key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (!deck) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-2">Deck not found</h2>
          <p className="text-muted-foreground mb-4">
            The deck you're looking for doesn't exist or you don't have access to it.
          </p>
          <Link href="/decks">
            <Button>Back to Decks</Button>
          </Link>
        </div>
      </div>
    );
  }

  const filteredCards = cardsData?.cards || [];

  return (
    <div className="container mx-auto p-6 max-w-6xl">
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
            <BreadcrumbPage>{deck.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-2xl font-semibold tracking-tight">{deck.name}</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Manage cards in this deck • {cardsData?.totalCount || 0} cards total
          </p>
        </div>
        
        <div className="flex gap-2">
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Card
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>Create New Card</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateCard} className="flex-1 overflow-hidden flex flex-col">
              <div className="space-y-4 overflow-y-auto flex-1 px-1">
                <div>
                  <Label htmlFor="cardType">Card Type</Label>
                  <Select 
                    value={createForm.cardType} 
                    onValueChange={(value: PrismaCardType) => 
                      setCreateForm(prev => ({ ...prev, cardType: value }))
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BASIC">
                        <div className="flex items-center">
                          <FileText className="h-4 w-4 mr-2" />
                          Basic Card
                        </div>
                      </SelectItem>
                      <SelectItem value="CLOZE">
                        <div className="flex items-center">
                          <Brain className="h-4 w-4 mr-2" />
                          Cloze Deletion
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="front">Front (Question)</Label>
                  <div className="mt-1">
                    <RichTextEditor
                      content={createForm.front}
                      onChange={(content) => setCreateForm(prev => ({ ...prev, front: content }))}
                      placeholder="Enter the question or prompt..."
                      minHeight="80px"
                      maxHeight="150px"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="back">Back (Answer)</Label>
                  <div className="mt-1">
                    <RichTextEditor
                      content={createForm.back}
                      onChange={(content) => setCreateForm(prev => ({ ...prev, back: content }))}
                      placeholder="Enter the answer or explanation..."
                      minHeight="80px"
                      maxHeight="150px"
                    />
                  </div>
                </div>

                {createForm.cardType === "CLOZE" && (
                  <div>
                    <Label htmlFor="clozeText">Cloze Context</Label>
                    <div className="mt-1">
                      <RichTextEditor
                        content={createForm.clozeText}
                        onChange={(content) => setCreateForm(prev => ({ ...prev, clozeText: content }))}
                        placeholder="Enter the full text with {{c1::hidden text}} markers..."
                        minHeight="60px"
                        maxHeight="120px"
                      />
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Use {`{{c1::text}}`} format to mark text for deletion. Example: "The capital of {`{{c1::France}}`} is Paris."
                    </p>
                    {createForm.clozeText.trim() && createForm.clozeText !== '<p></p>' && (
                      <ClozePreview clozeText={createForm.clozeText} className="mt-3" />
                    )}
                  </div>
                )}

                <div>
                  <Label htmlFor="tags">Tags (Optional)</Label>
                  <Input
                    id="tags"
                    value={createForm.tags}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, tags: e.target.value }))}
                    placeholder="Enter tags separated by commas..."
                    className="mt-1"
                  />
                </div>
              </div>
              <DialogFooter className="mt-4 border-t pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createCard.isPending}>
                  {createCard.isPending ? "Creating..." : "Create Card"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search and Filter Interface */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="space-y-4">
            <AdvancedSearch
              onSearch={(filters) => {
                setSearchFilters(filters);
                setCurrentPage(1);
              }}
              initialFilters={searchFilters}
              deckId={deckId}
            />
            <div className="flex justify-between items-center">
              <CardSortingFilter
                onApply={handleSortingFilterApply}
                initialOptions={{
                  sortBy: searchFilters.sortBy,
                  sortOrder: searchFilters.sortOrder,
                  stateFilter: searchFilters.stateFilter,
                  dueFilter: searchFilters.dueFilter,
                  intervalRange: searchFilters.intervalRange,
                  difficultyRange: searchFilters.difficultyRange,
                  onlyWithLapses: searchFilters.onlyWithLapses,
                }}
                cardCount={cardsData?.totalCount}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cards List */}
      {isCardsLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonCardPreview key={i} />
          ))}
        </div>
      ) : filteredCards.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            {searchFilters.search ? (
              <>
                <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No cards found</h3>
                <p className="text-muted-foreground mb-4">
                  No cards match your search criteria. Try adjusting your search terms.
                </p>
                <Button variant="outline" onClick={() => setSearchFilters(prev => ({ ...prev, search: "" }))}>
                  Clear Search
                </Button>
              </>
            ) : (
              <>
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No cards yet</h3>
                <p className="text-muted-foreground mb-4">
                  Add your first card to start building this deck.
                </p>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Card
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredCards.map((card) => (
            <Card 
              key={card.id} 
              className="group hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleCardClick(card)}
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={card.card_type === "BASIC" ? "default" : "secondary"}>
                        {card.card_type === "BASIC" ? (
                          <><FileText className="h-3 w-3 mr-1" />Basic</>
                        ) : (
                          <><Brain className="h-3 w-3 mr-1" />Cloze</>
                        )}
                      </Badge>
                      {card.card_states?.[0] && (
                        <>
                          <CardStateIndicator state={card.card_states[0].state} />
                          <IntervalDisplay interval={card.card_states[0].interval} />
                          <DueDateBadge dueDate={card.card_states[0].due_date} />
                        </>
                      )}
                    </div>

                    {card.card_type === "BASIC" ? (
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm font-medium text-muted-foreground mb-1">Front</div>
                          <div className="text-sm bg-muted/50 p-3 rounded border-l-2 border-blue-200">
                            <div 
                              className="prose prose-sm max-w-none line-clamp-3"
                              dangerouslySetInnerHTML={{ 
                                __html: card.front.length > 150 
                                  ? card.front.substring(0, 150) + '...' 
                                  : card.front
                              }}
                            />
                          </div>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-muted-foreground mb-1">Back</div>
                          <div className="text-sm bg-muted/50 p-3 rounded border-l-2 border-green-200">
                            <div 
                              className="prose prose-sm max-w-none line-clamp-3"
                              dangerouslySetInnerHTML={{ 
                                __html: card.back.length > 150 
                                  ? card.back.substring(0, 150) + '...' 
                                  : card.back
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      card.cloze_text && (
                        <div>
                          <div className="text-sm font-medium text-muted-foreground mb-1">Cloze Cards Preview</div>
                          <div className="text-sm bg-orange-50 p-3 rounded border-l-2 border-orange-200">
                            {(() => {
                              const parsedCards = parseClozeText(card.cloze_text);
                              if (parsedCards.length === 0) {
                                return <div className="text-muted-foreground">Invalid cloze format</div>;
                              }
                              return (
                                <div className="space-y-2">
                                  {parsedCards.slice(0, 2).map((clozeCard, index) => (
                                    <div key={index} className="text-sm">
                                      <span className="font-medium">Q{index + 1}:</span>{" "}
                                      <span 
                                        dangerouslySetInnerHTML={{ __html: clozeCard.question }}
                                      />
                                    </div>
                                  ))}
                                  {parsedCards.length > 2 && (
                                    <div className="text-xs text-muted-foreground">
                                      ... and {parsedCards.length - 2} more cloze cards
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      )
                    )}

                    {card.tags.length > 0 && (
                      <div className="pt-3 mt-3 border-t">
                        <div className="flex gap-1 flex-wrap">
                          {card.tags.map((tag, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0" 
                        aria-label="Card options"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link 
                          href={`/decks/${deckId}/cards/${card.id}/edit`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Card
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCard(card.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {cardsData && cardsData.totalCount > 20 && (
        <Card className="mt-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Page {currentPage} of {Math.ceil(cardsData.totalCount / 20)}
                </span>
              </div>

              <Button
                variant="outline"
                onClick={() => setCurrentPage(prev => prev + 1)}
                disabled={currentPage >= Math.ceil(cardsData.totalCount / 20)}
              >
                Next
                <ArrowLeft className="w-4 h-4 ml-2 rotate-180" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Study Deck Action */}
      {filteredCards.length > 0 && (
        <div className="mt-8 text-center border-t pt-8">
          <div className="flex justify-center gap-4">
            <Link href={`/decks/${deckId}/study`}>
              <Button size="lg" className="px-8">
                Study This Deck
              </Button>
            </Link>
            <Link href={`/decks/${deckId}/stats`}>
              <Button size="lg" variant="outline" className="px-8">
                View Stats
              </Button>
            </Link>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Start a focused study session or view detailed performance statistics
          </p>
        </div>
      )}

      {/* Card Detail Modal */}
      <CardDetailModal
        card={cardWithReviews || selectedCard}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedCard(null);
        }}
        onEdit={() => {
          setIsDetailModalOpen(false);
          window.location.href = `/decks/${deckId}/cards/${selectedCard?.id}/edit`;
        }}
      />
    </div>
  );
}