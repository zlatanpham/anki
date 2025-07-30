"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
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
  Brain,
  Loader2,
  Copy,
  Check,
  Info,
  Sparkles,
} from "lucide-react";
import { ClozeDisplay } from "@/components/ClozeDisplay";

interface ClozesSuggestionsProps {
  initialText?: string;
  onApply?: (clozeText: string) => void;
}

export function ClozeSuggestions({ initialText = "", onApply }: ClozesSuggestionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState(initialText);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const suggestClozes = api.ai.suggestClozes.useMutation({
    onSuccess: () => {
      toast.success("Generated cloze suggestions!");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to generate suggestions");
    },
  });

  const handleGenerate = () => {
    if (!inputText.trim()) {
      toast.error("Please enter some text");
      return;
    }

    suggestClozes.mutate({ text: inputText });
  };

  const handleCopy = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const handleApply = (clozeText: string) => {
    if (onApply) {
      onApply(clozeText);
      handleClose();
      toast.success("Applied cloze text");
    } else {
      handleCopy(clozeText, -1);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    if (!initialText) {
      setInputText("");
    }
    suggestClozes.reset();
  };

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        variant="outline"
        size="sm"
        className="gap-2"
      >
        <Brain className="h-4 w-4" />
        AI Cloze Suggestions
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              AI Cloze Suggestions
            </DialogTitle>
            <DialogDescription>
              Get AI-powered suggestions for creating cloze deletion cards
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden space-y-4">
            <div>
              <Textarea
                placeholder="Enter text to generate cloze suggestions..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="min-h-[100px]"
              />
              <div className="flex justify-between items-center mt-2">
                <p className="text-sm text-muted-foreground">
                  {inputText.length} characters
                </p>
                <Button
                  onClick={handleGenerate}
                  disabled={!inputText.trim() || suggestClozes.isPending}
                  size="sm"
                >
                  {suggestClozes.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate Suggestions
                    </>
                  )}
                </Button>
              </div>
            </div>

            {suggestClozes.data && (
              <>
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Click on any suggestion to {onApply ? "apply it" : "copy it to clipboard"}.
                    Each variation tests different aspects of the same concept.
                  </AlertDescription>
                </Alert>

                <ScrollArea className="h-[350px]">
                  <div className="space-y-4 pr-4">
                    {suggestClozes.data.suggestions.map((suggestion, index) => (
                      <Card key={index}>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm flex items-center justify-between">
                            <span>Suggestion {index + 1}</span>
                            <Badge variant="outline" className="text-xs">
                              {suggestion.clozeVersions.length} variations
                            </Badge>
                          </CardTitle>
                          <p className="text-xs text-muted-foreground mt-1">
                            {suggestion.explanation}
                          </p>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {suggestion.clozeVersions.map((version, vIndex) => (
                            <div
                              key={vIndex}
                              className="group relative border rounded-lg p-3 hover:bg-accent cursor-pointer transition-colors"
                              onClick={() => handleApply(version)}
                            >
                              <div className="pr-8">
                                <p className="text-xs font-medium text-muted-foreground mb-2">
                                  Variation {vIndex + 1}
                                </p>
                                <ClozeDisplay
                                  clozeText={version}
                                  isRevealed={false}
                                />
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopy(version, index * 10 + vIndex);
                                }}
                              >
                                {copiedIndex === index * 10 + vIndex ? (
                                  <Check className="h-4 w-4 text-green-600" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </>
            )}

            {suggestClozes.isPending && (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Analyzing text and generating suggestions...</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              {onApply ? "Cancel" : "Close"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}