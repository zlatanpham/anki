"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Plus, ArrowLeft, Save } from "lucide-react";
import { RichTextEditor } from "@/components/RichTextEditor";
import { ClozeDisplay } from "@/components/ClozeDisplay";
import { toast } from "sonner";
import type { CardType } from "@prisma/client";

export default function EditCardPage() {
  const router = useRouter();
  const params = useParams();
  const deckId = params.id as string;
  const cardId = params.cardId as string;

  const [cardType, setCardType] = useState<CardType>("BASIC");
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [clozeText, setClozeText] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Fetch card data
  const { data: card, isLoading: isLoadingCard } = api.card.getById.useQuery({
    id: cardId,
  });

  // Fetch deck data for navigation
  const { data: deck } = api.deck.getById.useQuery({
    id: deckId,
  });

  const updateCardMutation = api.card.update.useMutation({
    onSuccess: () => {
      toast.success("Card updated successfully!");
      router.push(`/decks/${deckId}/cards`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update card");
    },
  });

  // Load card data when available
  useEffect(() => {
    if (card) {
      setCardType(card.card_type);
      setFront(card.front);
      setBack(card.back);
      setClozeText(card.cloze_text || "");
      setTags(card.tags);
    }
  }, [card]);

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const cardData: any = {
        id: cardId,
        cardType: cardType,
        front,
        back,
        tags,
      };

      // Only include clozeText for CLOZE cards
      if (cardType === "CLOZE") {
        cardData.clozeText = clozeText;
      }

      await updateCardMutation.mutateAsync(cardData);
    } catch (error) {
      console.error("Error updating card:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingCard) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!card) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Card Not Found</h2>
            <p className="text-muted-foreground mb-4">
              The card you're looking for doesn't exist or you don't have permission to edit it.
            </p>
            <Button onClick={() => router.push(`/decks/${deckId}/cards`)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Cards
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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
            Back to {deck?.name || "Cards"}
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Edit Card</h1>
            <p className="text-muted-foreground">
              Modify your flashcard content and settings
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>Card Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Card Type */}
              <div className="space-y-2">
                <Label htmlFor="cardType">Card Type</Label>
                <Select
                  value={cardType}
                  onValueChange={(value: CardType) => setCardType(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BASIC">Basic</SelectItem>
                    <SelectItem value="CLOZE">Cloze Deletion</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {cardType === "BASIC" ? (
                <>
                  {/* Front */}
                  <div className="space-y-2">
                    <Label htmlFor="front">Front</Label>
                    <RichTextEditor
                      content={front}
                      onChange={setFront}
                      placeholder="Enter the question or prompt..."
                      minHeight="120px"
                    />
                  </div>

                  {/* Back */}
                  <div className="space-y-2">
                    <Label htmlFor="back">Back</Label>
                    <RichTextEditor
                      content={back}
                      onChange={setBack}
                      placeholder="Enter the answer..."
                      minHeight="120px"
                    />
                  </div>
                </>
              ) : (
                <>
                  {/* Cloze Text */}
                  <div className="space-y-2">
                    <Label htmlFor="clozeText">
                      Cloze Text
                      <span className="text-sm text-muted-foreground ml-2">
                        Use {`{{c1::text}}`} for deletions
                      </span>
                    </Label>
                    <RichTextEditor
                      content={clozeText}
                      onChange={setClozeText}
                      placeholder="Enter text with cloze deletions like {{c1::answer}}..."
                      minHeight="120px"
                    />
                  </div>

                  {/* Additional Context */}
                  <div className="space-y-2">
                    <Label htmlFor="front">Additional Context (Optional)</Label>
                    <RichTextEditor
                      content={front}
                      onChange={setFront}
                      placeholder="Enter additional context or hints..."
                      minHeight="80px"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="back">Back Extra (Optional)</Label>
                    <RichTextEditor
                      content={back}
                      onChange={setBack}
                      placeholder="Enter additional information..."
                      minHeight="80px"
                    />
                  </div>
                </>
              )}

              {/* Tags */}
              <div className="space-y-2">
                <Label>Tags</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Add a tag..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                  />
                  <Button type="button" onClick={handleAddTag} variant="outline">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex gap-2 pt-4">
                <Button
                  type="submit"
                  disabled={isLoading || updateCardMutation.isPending}
                  className="flex-1"
                >
                  {(isLoading || updateCardMutation.isPending) ? (
                    "Updating..."
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Update Card
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push(`/decks/${deckId}/cards`)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
          </CardHeader>
          <CardContent>
            {cardType === "BASIC" ? (
              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <Label className="text-sm font-medium text-muted-foreground">
                    Front
                  </Label>
                  <div 
                    className="mt-2 prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: front || "<p class='text-muted-foreground'>Enter front content...</p>" }}
                  />
                </div>
                <div className="p-4 border rounded-lg">
                  <Label className="text-sm font-medium text-muted-foreground">
                    Back
                  </Label>
                  <div 
                    className="mt-2 prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: back || "<p class='text-muted-foreground'>Enter back content...</p>" }}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <Label className="text-sm font-medium text-muted-foreground">
                    Cloze Preview
                  </Label>
                  <div className="mt-2">
                    {clozeText ? (
                      <ClozeDisplay 
                        clozeText={clozeText}
                        isPreview={true}
                      />
                    ) : (
                      <p className="text-muted-foreground">Enter cloze text...</p>
                    )}
                  </div>
                </div>
                {front && (
                  <div className="p-4 border rounded-lg">
                    <Label className="text-sm font-medium text-muted-foreground">
                      Additional Context
                    </Label>
                    <div 
                      className="mt-2 prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: front }}
                    />
                  </div>
                )}
                {back && (
                  <div className="p-4 border rounded-lg">
                    <Label className="text-sm font-medium text-muted-foreground">
                      Back Extra
                    </Label>
                    <div 
                      className="mt-2 prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: back }}
                    />
                  </div>
                )}
              </div>
            )}

            {tags.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <Label className="text-sm font-medium text-muted-foreground">
                  Tags
                </Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}