"use client";

import { useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import Link from "next/link";
import {
  Plus,
  Search,
  BookOpen,
  Calendar,
  Users,
  MoreVertical,
  Edit,
  Trash2,
  Play,
  BarChart3,
} from "lucide-react";
import { ImportWizard } from "@/components/ImportWizard";
import { SkeletonCardList } from "@/components/ui/skeleton-card";
import { ExportDeck } from "@/components/ExportDeck";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";

interface CreateDeckForm {
  name: string;
  description: string;
  isPublic: boolean;
}

export default function DecksPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateDeckForm>({
    name: "",
    description: "",
    isPublic: false,
  });

  // Get all decks
  const {
    data: decksData,
    isLoading,
    refetch,
  } = api.deck.getAll.useQuery({
    includePublic: true,
    limit: 50,
  });

  // Create deck mutation
  const createDeck = api.deck.create.useMutation({
    onSuccess: () => {
      toast.success("Deck created successfully!");
      setIsCreateDialogOpen(false);
      setCreateForm({ name: "", description: "", isPublic: false });
      void refetch();
    },
    onError: (error) => {
      toast.error(`Failed to create deck: ${error.message}`);
    },
  });

  // Delete deck mutation
  const deleteDeck = api.deck.delete.useMutation({
    onSuccess: () => {
      toast.success("Deck deleted successfully!");
      void refetch();
    },
    onError: (error) => {
      toast.error(`Failed to delete deck: ${error.message}`);
    },
  });

  const handleCreateDeck = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim()) {
      toast.error("Deck name is required");
      return;
    }

    createDeck.mutate({
      name: createForm.name.trim(),
      description: createForm.description.trim() || undefined,
      isPublic: createForm.isPublic,
    });
  };

  const handleDeleteDeck = (deckId: string, deckName: string) => {
    if (
      confirm(
        `Are you sure you want to delete "${deckName}"? This action cannot be undone.`,
      )
    ) {
      deleteDeck.mutate({ id: deckId });
    }
  };

  // Filter decks based on search query
  const filteredDecks =
    decksData?.decks.filter(
      (deck) =>
        deck.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        deck.description?.toLowerCase().includes(searchQuery.toLowerCase()),
    ) || [];

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl lg:text-2xl">
            My Decks
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Manage your flashcard decks and track your learning progress
          </p>
        </div>
        <SkeletonCardList count={6} />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl lg:text-2xl">
            My Decks
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Manage your flashcard decks and track your learning progress
          </p>
        </div>

        <div className="flex gap-2">
          <ImportWizard onImportSuccess={() => void refetch()} />

          <Dialog
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Deck
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Deck</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateDeck}>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Deck Name</Label>
                    <Input
                      id="name"
                      value={createForm.name}
                      onChange={(e) =>
                        setCreateForm((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      placeholder="Enter deck name..."
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Textarea
                      id="description"
                      value={createForm.description}
                      onChange={(e) =>
                        setCreateForm((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      placeholder="Describe what this deck is about..."
                      className="mt-1 min-h-[80px]"
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
                  <Button type="submit" disabled={createDeck.isPending}>
                    {createDeck.isPending ? "Creating..." : "Create Deck"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative mb-6">
        <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform" />
        <Input
          placeholder="Search decks..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Decks Grid */}
      {filteredDecks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            {searchQuery ? (
              <>
                <Search className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
                <h3 className="mb-2 text-lg font-semibold">No decks found</h3>
                <p className="text-muted-foreground mb-4">
                  No decks match your search criteria. Try adjusting your search
                  terms.
                </p>
                <Button variant="outline" onClick={() => setSearchQuery("")}>
                  Clear Search
                </Button>
              </>
            ) : (
              <>
                <BookOpen className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
                <h3 className="mb-2 text-lg font-semibold">No decks yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first deck to start learning with spaced
                  repetition.
                </p>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Deck
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredDecks.map((deck) => (
            <Card
              key={deck.id}
              className="group transition-shadow hover:shadow-lg"
            >
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div className="flex-1">
                  <CardTitle className="text-lg leading-tight">
                    {deck.name}
                  </CardTitle>
                  {deck.description && (
                    <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
                      {deck.description}
                    </p>
                  )}
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
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
                      onClick={() => handleDeleteDeck(deck.id, deck.name)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Cards</span>
                    <Badge variant="secondary">{deck._count.cards}</Badge>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Updated</span>
                    <span className="text-muted-foreground text-xs">
                      {formatDistanceToNow(new Date(deck.updated_at), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {deck.is_public && (
                      <Badge variant="outline" className="text-xs">
                        <Users className="mr-1 h-3 w-3" />
                        Public
                      </Badge>
                    )}
                    {deck.organization && (
                      <Badge variant="outline" className="text-xs">
                        <Calendar className="mr-1 h-3 w-3" />
                        {deck.organization.name}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <Link
                    href={`/decks/${deck.id}/study`}
                    className={cn(
                      buttonVariants({ variant: "default", size: "sm" }),
                      "flex-1",
                    )}
                  >
                    <Play className="mr-2 h-4 w-4" />
                    Study
                  </Link>
                  <Link
                    href={`/decks/${deck.id}/cards`}
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" }),
                    )}
                  >
                    <BookOpen className="h-4 w-4" />
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Quick Study Link */}
      {filteredDecks.length > 0 && (
        <div className="mt-8 text-center">
          <Link
            href="/study"
            className={cn(
              buttonVariants({ variant: "default", size: "lg" }),
              "px-8",
            )}
          >
            <Play className="mr-2 h-4 w-4" />
            Start Studying All Decks
          </Link>
          <p className="text-muted-foreground mt-2 text-sm">
            Study cards from all your decks in one session
          </p>
        </div>
      )}
    </div>
  );
}
