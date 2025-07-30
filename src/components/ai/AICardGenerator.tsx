"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import {
  Sparkles,
  AlertCircle,
  Loader2,
  Plus,
  Edit2,
  Check,
  X,
  Brain,
  FileText,
  Info,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { type CardType } from "@prisma/client";
import { parseClozeText, renderClozeContext } from "@/lib/cloze";
import { generateBasicCards } from "@/lib/fallback-card-generator";

interface GeneratedCard {
  type: "BASIC" | "CLOZE";
  front: string;
  back?: string;
  clozeText?: string;
  tags?: string[];
  selected?: boolean;
  isEditing?: boolean;
}

interface AICardGeneratorProps {
  deckId: string;
  deckName?: string;
  onCardsAdded?: (count: number) => void;
}

// Simple cloze preview component for AI-generated cards
function SimpleClozePreview({ clozeText }: { clozeText: string }) {
  const parsedCards = parseClozeText(clozeText);
  
  if (parsedCards.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        Invalid cloze format
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {parsedCards.map((card, index) => (
        <div key={index} className="text-sm">
          <div className="font-medium text-muted-foreground">
            Card {index + 1}:
          </div>
          <div className="pl-4">
            Q: {card.question}
          </div>
          <div className="pl-4 text-green-600">
            A: {card.answer}
          </div>
        </div>
      ))}
    </div>
  );
}

export function AICardGenerator({ deckId, deckName, onCardsAdded }: AICardGeneratorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const [generatedCards, setGeneratedCards] = useState<GeneratedCard[]>([]);
  const [step, setStep] = useState<"input" | "preview" | "adding">("input");
  const [showAnalysis, setShowAnalysis] = useState(false);

  // API mutations
  const generateCards = api.ai.generateCards.useMutation({
    onSuccess: (data) => {
      const cardsWithSelection = data.cards.map((card) => ({
        ...card,
        selected: true,
        isEditing: false,
      }));
      setGeneratedCards(cardsWithSelection);
      setStep("preview");
      toast.success(`Generated ${data.cards.length} cards!`);
    },
    onError: (error) => {
      if (error.message.includes('busy') || error.message.includes('Rate limit')) {
        toast.error(
          error.message,
          {
            duration: 5000,
            action: {
              label: 'Retry',
              onClick: () => setTimeout(handleGenerate, 2000),
            },
          }
        );
        
        // Offer fallback option
        toast.info(
          "You can also use basic card generation while AI is busy",
          {
            duration: 8000,
            action: {
              label: 'Use Basic Mode',
              onClick: () => {
                const fallbackCards = generateBasicCards(inputText);
                if (fallbackCards.length > 0) {
                  const cardsWithSelection = fallbackCards.map((card) => ({
                    ...card,
                    selected: true,
                    isEditing: false,
                  }));
                  setGeneratedCards(cardsWithSelection);
                  setStep("preview");
                  toast.success(`Generated ${fallbackCards.length} basic cards!`);
                } else {
                  toast.error("Could not generate cards from this text");
                }
              },
            },
          }
        );
      } else {
        toast.error(error.message || "Failed to generate cards");
      }
    },
  });

  const analyzeText = api.ai.analyzeText.useQuery(
    { text: inputText },
    {
      enabled: showAnalysis && inputText.length > 10,
    }
  );

  const createCards = api.card.bulkCreate.useMutation({
    onSuccess: (data) => {
      toast.success(`Added ${data.count} cards to your deck!`);
      onCardsAdded?.(data.count);
      handleClose();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to add cards");
    },
  });

  const handleGenerate = () => {
    if (!inputText.trim()) {
      toast.error("Please enter some text to generate cards from");
      return;
    }

    generateCards.mutate({
      text: inputText,
      deckId,
      deckContext: deckName,
    });
  };

  const handleAddCards = async () => {
    const selectedCards = generatedCards.filter((card) => card.selected);
    if (selectedCards.length === 0) {
      toast.error("Please select at least one card to add");
      return;
    }

    setStep("adding");

    const cardsToCreate = selectedCards.map((card) => ({
      cardType: card.type as CardType,
      front: card.type === "BASIC" ? card.front : "Cloze Card",
      back: card.type === "BASIC" ? (card.back || "") : "See cloze text",
      clozeText: card.type === "CLOZE" ? card.clozeText : undefined,
      tags: card.tags || [],
    }));

    await createCards.mutateAsync({ deckId, cards: cardsToCreate });
  };

  const handleClose = () => {
    setIsOpen(false);
    setInputText("");
    setGeneratedCards([]);
    setStep("input");
    setShowAnalysis(false);
  };

  const toggleCardSelection = (index: number) => {
    setGeneratedCards((prev) =>
      prev.map((card, i) =>
        i === index ? { ...card, selected: !card.selected } : card
      )
    );
  };

  const toggleAllCards = () => {
    const allSelected = generatedCards.every((card) => card.selected);
    setGeneratedCards((prev) =>
      prev.map((card) => ({ ...card, selected: !allSelected }))
    );
  };

  const toggleCardEdit = (index: number) => {
    setGeneratedCards((prev) =>
      prev.map((card, i) =>
        i === index ? { ...card, isEditing: !card.isEditing } : card
      )
    );
  };

  const updateCard = (index: number, updates: Partial<GeneratedCard>) => {
    setGeneratedCards((prev) =>
      prev.map((card, i) =>
        i === index ? { ...card, ...updates, isEditing: false } : card
      )
    );
  };

  const selectedCount = generatedCards.filter((card) => card.selected).length;
  const allSelected = generatedCards.length > 0 && selectedCount === generatedCards.length;

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className="gap-2"
        variant="default"
      >
        <Sparkles className="h-4 w-4" />
        Generate Cards with AI
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              AI Card Generator
            </DialogTitle>
            <DialogDescription>
              {step === "input" ? "Enter text to generate flashcards automatically" : 
               step === "preview" ? "Review and edit generated cards before adding them" :
               "Adding cards to your deck..."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden">
            {step === "input" && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="input-text">Enter your text</Label>
                  <Textarea
                    id="input-text"
                    placeholder="Paste your study material, notes, or any text you want to create flashcards from..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    className="min-h-[200px] font-mono text-sm"
                  />
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-sm text-muted-foreground">
                      {inputText.length} characters
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAnalysis(!showAnalysis)}
                    >
                      <Info className="h-4 w-4 mr-1" />
                      {showAnalysis ? "Hide" : "Show"} Analysis
                    </Button>
                  </div>
                </div>

                {showAnalysis && analyzeText.data && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Text Analysis</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Word Count</p>
                          <p className="font-medium">{analyzeText.data.wordCount}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Estimated Cards</p>
                          <p className="font-medium">{analyzeText.data.estimatedCards}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Difficulty</p>
                          <Badge variant="outline" className="capitalize">
                            {analyzeText.data.difficulty}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Topics</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {analyzeText.data.topics.slice(0, 3).map((topic, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {topic}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Tips for best results:</strong>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      <li>Use clear, well-structured text</li>
                      <li>Include definitions, key concepts, and examples</li>
                      <li>Break down complex topics into smaller sections</li>
                      <li>AI will create both basic and cloze deletion cards</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {step === "preview" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="select-all"
                      checked={allSelected}
                      onCheckedChange={toggleAllCards}
                    />
                    <Label htmlFor="select-all" className="font-medium">
                      {selectedCount} of {generatedCards.length} cards selected
                    </Label>
                  </div>
                  <Badge variant="outline">
                    {generatedCards.filter(c => c.type === "BASIC").length} Basic,{" "}
                    {generatedCards.filter(c => c.type === "CLOZE").length} Cloze
                  </Badge>
                </div>

                <Separator />

                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-4">
                    {generatedCards.map((card, index) => (
                      <Card
                        key={index}
                        className={card.selected ? "border-primary" : "opacity-60"}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <Checkbox
                                checked={card.selected}
                                onCheckedChange={() => toggleCardSelection(index)}
                              />
                              <Badge variant={card.type === "BASIC" ? "default" : "secondary"}>
                                {card.type === "BASIC" ? (
                                  <><FileText className="h-3 w-3 mr-1" />Basic</>
                                ) : (
                                  <><Brain className="h-3 w-3 mr-1" />Cloze</>
                                )}
                              </Badge>
                              {card.tags && card.tags.length > 0 && (
                                <div className="flex gap-1">
                                  {card.tags.map((tag, i) => (
                                    <Badge key={i} variant="outline" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleCardEdit(index)}
                            >
                              {card.isEditing ? (
                                <X className="h-4 w-4" />
                              ) : (
                                <Edit2 className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent>
                          {card.isEditing ? (
                            <div className="space-y-3">
                              {card.type === "BASIC" ? (
                                <>
                                  <div>
                                    <Label className="text-xs">Front</Label>
                                    <Textarea
                                      value={card.front}
                                      onChange={(e) =>
                                        updateCard(index, { front: e.target.value })
                                      }
                                      className="mt-1 min-h-[60px]"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs">Back</Label>
                                    <Textarea
                                      value={card.back}
                                      onChange={(e) =>
                                        updateCard(index, { back: e.target.value })
                                      }
                                      className="mt-1 min-h-[60px]"
                                    />
                                  </div>
                                </>
                              ) : (
                                <div>
                                  <Label className="text-xs">Cloze Text</Label>
                                  <Textarea
                                    value={card.clozeText}
                                    onChange={(e) =>
                                      updateCard(index, { clozeText: e.target.value })
                                    }
                                    className="mt-1 min-h-[80px] font-mono text-sm"
                                    placeholder="Use {{c1::text}} syntax for deletions"
                                  />
                                </div>
                              )}
                              <div>
                                <Label className="text-xs">Tags (comma-separated)</Label>
                                <Input
                                  value={card.tags?.join(", ") || ""}
                                  onChange={(e) =>
                                    updateCard(index, {
                                      tags: e.target.value
                                        .split(",")
                                        .map((t) => t.trim())
                                        .filter(Boolean),
                                    })
                                  }
                                  className="mt-1"
                                />
                              </div>
                              <Button
                                size="sm"
                                onClick={() => toggleCardEdit(index)}
                                className="w-full"
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Save Changes
                              </Button>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {card.type === "BASIC" ? (
                                <>
                                  <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-1">
                                      Front
                                    </p>
                                    <p className="text-sm">{card.front}</p>
                                  </div>
                                  <Separator />
                                  <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-1">
                                      Back
                                    </p>
                                    <p className="text-sm">{card.back}</p>
                                  </div>
                                </>
                              ) : (
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground mb-1">
                                    Cloze Preview
                                  </p>
                                  <SimpleClozePreview
                                    clozeText={card.clozeText || ""}
                                  />
                                </div>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {step === "adding" && (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Adding cards to your deck...</p>
              </div>
            )}
          </div>

          <DialogFooter>
            {step === "input" && (
              <>
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  onClick={handleGenerate}
                  disabled={!inputText.trim() || generateCards.isPending}
                >
                  {generateCards.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate Cards
                    </>
                  )}
                </Button>
              </>
            )}
            {step === "preview" && (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setStep("input");
                    setGeneratedCards([]);
                  }}
                >
                  Back
                </Button>
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  onClick={handleAddCards}
                  disabled={selectedCount === 0}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add {selectedCount} Cards
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}