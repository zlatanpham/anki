"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function EditDeckPage() {
  const router = useRouter();
  const params = useParams();
  const deckId = params.id as string;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch deck data
  const { data: deck, isLoading: isLoadingDeck } = api.deck.getById.useQuery({
    id: deckId,
  });

  const updateDeckMutation = api.deck.update.useMutation({
    onSuccess: () => {
      toast.success("Deck updated successfully!");
      router.push(`/decks/${deckId}/cards`);
    },
    onError: (error) => {
      toast.error(error.message ?? "Failed to update deck");
    },
  });

  const deleteDeckMutation = api.deck.delete.useMutation({
    onSuccess: () => {
      toast.success("Deck deleted successfully!");
      router.push("/decks");
    },
    onError: (error) => {
      toast.error(error.message ?? "Failed to delete deck");
    },
  });

  // Load deck data when available
  useEffect(() => {
    if (deck) {
      setName(deck.name);
      setDescription(deck.description ?? "");
      setIsPublic(deck.is_public);
    }
  }, [deck]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Deck name is required");
      return;
    }

    setIsLoading(true);

    try {
      await updateDeckMutation.mutateAsync({
        id: deckId,
        name: name.trim(),
        description: description.trim() || undefined,
        isPublic,
      });
    } catch (error) {
      console.error("Error updating deck:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteDeckMutation.mutateAsync({ id: deckId });
    } catch (error) {
      console.error("Error deleting deck:", error);
    }
  };

  if (isLoadingDeck) {
    return (
      <div className="container mx-auto px-4 py-6 sm:px-6 lg:px-8 max-w-2xl">
        {/* Header skeleton */}
        <div className="mb-6 lg:mb-8">
          <Skeleton className="h-4 w-24 mb-3" />
          <div className="space-y-1">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>

        <div className="space-y-6">
          {/* Main Form skeleton */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-24 w-full" />
              </div>
              <Skeleton className="h-20 w-full" />
              <div className="flex gap-2">
                <Skeleton className="h-10 flex-1" />
                <Skeleton className="h-10 w-20" />
              </div>
            </CardContent>
          </Card>

          {/* Stats skeleton */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-36" />
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>

          {/* Danger zone skeleton */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-28" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-12 w-full mb-4" />
              <Skeleton className="h-10 w-32" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!deck) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Deck Not Found</h2>
            <p className="text-muted-foreground mb-4">
              The deck you&apos;re looking for doesn&apos;t exist or you don&apos;t have permission to edit it.
            </p>
            <Button onClick={() => router.push("/decks")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Decks
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 sm:px-6 lg:px-8 max-w-2xl">
      {/* Header - Mobile-first responsive design */}
      <div className="mb-6 lg:mb-8">
        {/* Back button - Better touch target on mobile */}
        <button
          onClick={() => router.push(`/decks/${deckId}/cards`)}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          <span className="font-medium">Back to Cards</span>
        </button>
        
        {/* Title section - Responsive sizing and spacing */}
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl lg:text-2xl font-semibold tracking-tight">
            Edit Deck
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl">
            Modify your deck settings and information
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Main Form */}
        <Card>
          <CardHeader>
            <CardTitle>Deck Information</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Deck Name */}
              <div className="space-y-2">
                <Label htmlFor="name">
                  Deck Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter deck name..."
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter deck description..."
                  rows={4}
                />
              </div>

              {/* Public Setting */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <Label htmlFor="isPublic" className="text-base font-medium">
                    Public Deck
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Allow other users to view and study this deck
                  </p>
                </div>
                <Switch
                  id="isPublic"
                  checked={isPublic}
                  onCheckedChange={setIsPublic}
                />
              </div>

              {/* Submit Button */}
              <div className="flex gap-2 pt-4">
                <Button
                  type="submit"
                  disabled={isLoading || updateDeckMutation.isPending}
                  className="flex-1"
                >
                  {(isLoading || updateDeckMutation.isPending) ? (
                    "Updating..."
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Update Deck
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

        {/* Deck Statistics */}
        <Card>
          <CardHeader>
            <CardTitle>Deck Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {deck.cards?.length || 0}
                </div>
                <div className="text-sm text-muted-foreground">Total Cards</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {deck.cards?.filter(card => card.card_type === "CLOZE").length || 0}
                </div>
                <div className="text-sm text-muted-foreground">Cloze Cards</div>
              </div>
            </div>
            <div className="mt-4 p-3 bg-muted/50 rounded-lg">
              <div className="text-sm text-muted-foreground">
                <strong>Created:</strong> {new Date(deck.created_at).toLocaleDateString()}
              </div>
              <div className="text-sm text-muted-foreground">
                <strong>Last Updated:</strong> {new Date(deck.updated_at).toLocaleDateString()}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium">Delete this deck</h4>
                <p className="text-sm text-muted-foreground">
                  This action cannot be undone. This will permanently delete the deck and all its cards.
                </p>
              </div>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="destructive" 
                    disabled={deleteDeckMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Deck
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete the deck
                      &quot;{deck.name}&quot; and all {deck.cards?.length ?? 0} cards in it.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete Deck
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}