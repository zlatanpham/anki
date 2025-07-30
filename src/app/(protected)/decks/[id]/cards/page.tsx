"use client";

import { useState } from "react";
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
import { type CardType } from "@prisma/client";
import { ClozePreview } from "@/components/ClozeDisplay";
import { validateClozeText, renderClozeContext } from "@/lib/cloze";
import { RichTextEditor } from "@/components/RichTextEditor";
import { AdvancedSearch } from "@/components/AdvancedSearch";
import { SkeletonCardPreview } from "@/components/ui/skeleton-card";
import { AICardGenerator } from "@/components/ai/AICardGenerator";
import { ClozeSuggestions } from "@/components/ai/ClozeSuggestions";
import { GrammarChecker } from "@/components/ai/GrammarChecker";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface CreateCardForm {
  cardType: CardType;
  front: string;
  back: string;
  clozeText: string;
  tags: string;
}

export default function DeckCardsPage() {
  const params = useParams();
  const deckId = params.id as string;
  
  const [searchFilters, setSearchFilters] = useState({
    search: "",
    cardType: undefined as "BASIC" | "CLOZE" | undefined,
    tags: [] as string[],
    deckIds: [deckId],
    searchFields: ["front", "back", "cloze_text", "tags"] as ("front" | "back" | "cloze_text" | "tags")[],
    createdAfter: undefined as Date | undefined,
    createdBefore: undefined as Date | undefined,
    sortBy: "created_at" as "created_at" | "updated_at" | "front",
    sortOrder: "desc" as "asc" | "desc",
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

  // Get deck details
  const { data: deck, isLoading: isDeckLoading, refetch: refetchDeck } = api.deck.getById.useQuery({ id: deckId });

  // Get cards for this deck
  const { data: cardsData, isLoading: isCardsLoading, refetch: refetchCards } = api.card.getByDeck.useQuery({
    deckId,
    ...searchFilters,
    search: searchFilters.search || undefined,
    limit: 20,
    offset: (currentPage - 1) * 20,
  });

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

  // Only show full page skeleton on initial load when deck is loading
  if (isDeckLoading) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="sm" disabled>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Decks
          </Button>
          <div className="flex-1">
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
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
      
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">{deck.name}</h1>
          <p className="text-muted-foreground">
            Manage cards in this deck • {cardsData?.totalCount || 0} cards total
          </p>
        </div>
        
        <div className="flex gap-2">
          <AICardGenerator 
            deckId={deckId} 
            deckName={deck.name}
            onCardsAdded={() => {
              void refetchCards();
              void refetchDeck();
            }}
          />
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Card
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Card</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateCard}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="cardType">Card Type</Label>
                  <Select 
                    value={createForm.cardType} 
                    onValueChange={(value: CardType) => 
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
                  <div className="flex items-center justify-between">
                    <Label htmlFor="front">Front (Question)</Label>
                    <GrammarChecker
                      text={createForm.front.replace(/<[^>]*>/g, '')}
                      onApply={(corrected) => setCreateForm(prev => ({ ...prev, front: corrected }))}
                    />
                  </div>
                  <div className="mt-1">
                    <RichTextEditor
                      content={createForm.front}
                      onChange={(content) => setCreateForm(prev => ({ ...prev, front: content }))}
                      placeholder="Enter the question or prompt..."
                      minHeight="100px"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="back">Back (Answer)</Label>
                    <GrammarChecker
                      text={createForm.back.replace(/<[^>]*>/g, '')}
                      onApply={(corrected) => setCreateForm(prev => ({ ...prev, back: corrected }))}
                    />
                  </div>
                  <div className="mt-1">
                    <RichTextEditor
                      content={createForm.back}
                      onChange={(content) => setCreateForm(prev => ({ ...prev, back: content }))}
                      placeholder="Enter the answer or explanation..."
                      minHeight="100px"
                    />
                  </div>
                </div>

                {createForm.cardType === "CLOZE" && (
                  <div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="clozeText">Cloze Context</Label>
                      <div className="flex gap-2">
                        <ClozeSuggestions 
                          initialText={createForm.clozeText.replace(/<[^>]*>/g, '')}
                          onApply={(clozeText) => setCreateForm(prev => ({ ...prev, clozeText }))}
                        />
                        <GrammarChecker
                          text={createForm.clozeText.replace(/<[^>]*>/g, '')}
                          onApply={(corrected) => setCreateForm(prev => ({ ...prev, clozeText: corrected }))}
                        />
                      </div>
                    </div>
                    <div className="mt-1">
                      <RichTextEditor
                        content={createForm.clozeText}
                        onChange={(content) => setCreateForm(prev => ({ ...prev, clozeText: content }))}
                        placeholder="Enter the full text with {{c1::hidden text}} markers..."
                        minHeight="80px"
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
              <DialogFooter className="mt-6">
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

      {/* Search Interface */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <AdvancedSearch
            onSearch={(filters) => {
              setSearchFilters(filters);
              setCurrentPage(1);
            }}
            initialFilters={searchFilters}
            deckId={deckId}
          />
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
            <Card key={card.id} className="group hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant={card.card_type === "BASIC" ? "default" : "secondary"}>
                        {card.card_type === "BASIC" ? (
                          <><FileText className="h-3 w-3 mr-1" />Basic</>
                        ) : (
                          <><Brain className="h-3 w-3 mr-1" />Cloze</>
                        )}
                      </Badge>
                      {card.card_states?.[0] && (
                        <Badge variant="outline" className="text-xs">
                          {card.card_states[0].state.toLowerCase()}
                        </Badge>
                      )}
                      {card.tags.length > 0 && (
                        <div className="flex gap-1">
                          {card.tags.slice(0, 3).map((tag, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {card.tags.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{card.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>

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

                    {card.card_type === "CLOZE" && card.cloze_text && (
                      <div>
                        <div className="text-sm font-medium text-muted-foreground mb-1">Cloze Context</div>
                        <div className="text-sm bg-orange-50 p-3 rounded border-l-2 border-orange-200">
                          <div 
                            className="prose prose-sm max-w-none line-clamp-3"
                            dangerouslySetInnerHTML={{ 
                              __html: (() => {
                                const rendered = renderClozeContext(card.cloze_text);
                                return rendered.length > 200 
                                  ? rendered.substring(0, 200) + '...' 
                                  : rendered;
                              })()
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label="Card options">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/decks/${deckId}/cards/${card.id}/edit`}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Card
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => handleDeleteCard(card.id)}
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
    </div>
  );
}