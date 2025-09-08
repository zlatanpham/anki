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
import { ClozePreview } from "@/components/ClozeDisplay";
import { toast } from "sonner";
import type { CardType } from "@prisma/client";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";

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
      setClozeText(card.cloze_text ?? "");
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

  const handleSubmit = async () => {
    setIsLoading(true);

    try {
      const cardData = {
        id: cardId,
        cardType: cardType,
        front,
        back,
        tags,
        ...(cardType === "CLOZE" ? { clozeText } : {})
      };

      await updateCardMutation.mutateAsync(cardData);
    } catch (error) {
      console.error("Error updating card:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingCard) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Breadcrumb Navigation Skeleton */}
        <div className="mb-6 flex items-center gap-2">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-20" />
        </div>

        {/* Header with Action Buttons Skeleton */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Skeleton className="h-8 w-32 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-20" />
          </div>
        </div>

        {/* Two Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form Card Skeleton */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-24" />
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Card Type Field */}
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-10 w-full" />
                </div>

                {/* Content Fields */}
                <div className="space-y-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-32 w-full" />
                </div>

                <div className="space-y-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-32 w-full" />
                </div>

                {/* Tags Section */}
                <div className="space-y-2">
                  <Skeleton className="h-4 w-12" />
                  <div className="flex gap-2">
                    <Skeleton className="h-6 w-16 rounded-full" />
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-10 flex-1" />
                    <Skeleton className="h-10 w-10" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Preview Card Skeleton */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-20" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <Skeleton className="h-4 w-16 mb-2" />
                  <Skeleton className="h-20 w-full" />
                </div>
                <div className="p-4 border rounded-lg">
                  <Skeleton className="h-4 w-16 mb-2" />
                  <Skeleton className="h-20 w-full" />
                </div>
              </div>
            </CardContent>
          </Card>
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
              The card you&apos;re looking for doesn&apos;t exist or you don&apos;t have permission to edit it.
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
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Breadcrumb Navigation */}
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/decks">Decks</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href={`/decks/${deckId}/cards`}>
              {deck?.name ?? "Deck"}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Edit Card</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header with Action Buttons */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-2xl font-semibold tracking-tight">Edit Card</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Modify your flashcard content and settings
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleSubmit}
            disabled={isLoading || updateCardMutation.isPending}
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
            variant="outline"
            onClick={() => router.push(`/decks/${deckId}/cards`)}
          >
            Cancel
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>Card Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
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

            </div>
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
                      <ClozePreview 
                        clozeText={clozeText}
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