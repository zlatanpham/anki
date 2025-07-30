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
  
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateCardForm>({
    cardType: "BASIC",
    front: "",
    back: "",
    clozeText: "",
    tags: "",
  });

  // Get deck details
  const { data: deck, isLoading: isDeckLoading } = api.deck.getById.useQuery({ id: deckId });

  // Get cards for this deck
  const { data: cardsData, isLoading: isCardsLoading, refetch } = api.card.getByDeck.useQuery({
    deckId,
    search: searchQuery || undefined,
    limit: 50,
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
      void refetch();
    },
    onError: (error) => {
      toast.error(`Failed to create card: ${error.message}`);
    },
  });

  // Delete card mutation
  const deleteCard = api.card.delete.useMutation({
    onSuccess: () => {
      toast.success("Card deleted successfully!");
      void refetch();
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

  const isLoading = isDeckLoading || isCardsLoading;

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading cards...</p>
          </div>
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
      <div className="flex items-center gap-4 mb-6">
        <Link href="/decks">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Decks
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{deck.name}</h1>
          <p className="text-muted-foreground">
            Manage cards in this deck • {cardsData?.totalCount || 0} cards total
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
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
                  <Label htmlFor="front">Front (Question)</Label>
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
                  <Label htmlFor="back">Back (Answer)</Label>
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
                    <Label htmlFor="clozeText">Cloze Context</Label>
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

      {/* Search Bar */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search cards..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Cards List */}
      {filteredCards.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            {searchQuery ? (
              <>
                <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No cards found</h3>
                <p className="text-muted-foreground mb-4">
                  No cards match your search criteria. Try adjusting your search terms.
                </p>
                <Button variant="outline" onClick={() => setSearchQuery("")}>
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
                          {card.front.length > 150 
                            ? `${card.front.substring(0, 150)}...` 
                            : card.front
                          }
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-muted-foreground mb-1">Back</div>
                        <div className="text-sm bg-muted/50 p-3 rounded border-l-2 border-green-200">
                          {card.back.length > 150 
                            ? `${card.back.substring(0, 150)}...` 
                            : card.back
                          }
                        </div>
                      </div>
                    </div>

                    {card.card_type === "CLOZE" && card.cloze_text && (
                      <div>
                        <div className="text-sm font-medium text-muted-foreground mb-1">Cloze Context</div>
                        <div className="text-sm bg-orange-50 p-3 rounded border-l-2 border-orange-200">
                          {(() => {
                            const rendered = renderClozeContext(card.cloze_text);
                            return rendered.length > 200 
                              ? `${rendered.substring(0, 200)}...` 
                              : rendered;
                          })()}
                        </div>
                      </div>
                    )}
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
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