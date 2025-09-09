"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { parseClozeText, renderClozeContext } from "@/lib/cloze";
import { ChevronLeft, ChevronRight, Eye, EyeOff } from "lucide-react";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";

interface ClozeDisplayProps {
  clozeText: string;
  front: string;
  back: string;
  showAnswer: boolean;
  onShowAnswer: () => void;
  className?: string;
}

export function ClozeDisplay({
  clozeText,
  front,
  back,
  showAnswer,
  onShowAnswer,
  className = "",
}: ClozeDisplayProps) {
  const [currentClozeIndex, setCurrentClozeIndex] = useState(0);
  const [parsedCards, setParsedCards] = useState<
    ReturnType<typeof parseClozeText>
  >([]);

  useEffect(() => {
    const cards = parseClozeText(clozeText);
    setParsedCards(cards);
    setCurrentClozeIndex(0);
  }, [clozeText]);

  if (parsedCards.length === 0) {
    // Fallback to basic card display if cloze parsing fails
    return (
      <div className={`space-y-6 ${className}`}>
        <div>
          <div className="text-muted-foreground mb-2 text-sm font-medium">
            Question
          </div>
          <MarkdownRenderer className="bg-muted/50 rounded-lg p-4 text-lg leading-relaxed">
            {front}
          </MarkdownRenderer>
        </div>

        {showAnswer && (
          <div>
            <div className="text-muted-foreground mb-2 text-sm font-medium">
              Answer
            </div>
            <MarkdownRenderer className="bg-primary/5 rounded-lg p-4 text-lg leading-relaxed">
              {back}
            </MarkdownRenderer>
          </div>
        )}
      </div>
    );
  }

  const currentCard = parsedCards[currentClozeIndex];
  const hasMultipleClozes = parsedCards.length > 1;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Cloze Navigation */}
      {hasMultipleClozes && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              Cloze {currentClozeIndex + 1} of {parsedCards.length}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setCurrentClozeIndex(Math.max(0, currentClozeIndex - 1))
              }
              disabled={currentClozeIndex === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setCurrentClozeIndex(
                  Math.min(parsedCards.length - 1, currentClozeIndex + 1),
                )
              }
              disabled={currentClozeIndex === parsedCards.length - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Cloze Question */}
      <div>
        <div className="text-muted-foreground mb-2 flex items-center gap-2 text-sm font-medium">
          Fill in the blank
          {!showAnswer && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onShowAnswer}
              className="h-6 px-2 text-xs"
            >
              <Eye className="mr-1 h-3 w-3" />
              Reveal
            </Button>
          )}
        </div>
        <div className="rounded-lg border-l-4 border-blue-200 bg-blue-50 p-4 text-lg leading-relaxed">
          {currentCard?.question ?? ""}
        </div>
      </div>

      {/* Answer */}
      {showAnswer && (
        <>
          <div>
            <div className="text-muted-foreground mb-2 text-sm font-medium">
              Answer
            </div>
            <div className="rounded-lg border-l-4 border-green-200 bg-green-50 p-4 text-lg leading-relaxed font-semibold text-green-800">
              {currentCard?.answer ?? ""}
            </div>
          </div>

          {/* Full Context */}
          <div>
            <div className="text-muted-foreground mb-2 text-sm font-medium">
              Full Context
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm leading-relaxed">
              {renderClozeContext(currentCard?.context ?? "")}
            </div>
          </div>

          {/* Additional Info */}
          {back && back !== clozeText && (
            <div>
              <div className="text-muted-foreground mb-2 text-sm font-medium">
                Additional Notes
              </div>
              <MarkdownRenderer className="rounded-lg border-l-4 border-yellow-200 bg-yellow-50 p-3 text-sm leading-relaxed">
                {back}
              </MarkdownRenderer>
            </div>
          )}
        </>
      )}
    </div>
  );
}

interface ClozePreviewProps {
  clozeText: string;
  className?: string;
}

export function ClozePreview({ clozeText, className = "" }: ClozePreviewProps) {
  const [showPreview, setShowPreview] = useState(true);
  const parsedCards = parseClozeText(clozeText);

  if (parsedCards.length === 0) {
    return (
      <div
        className={`rounded-lg border border-red-200 bg-red-50 p-3 ${className}`}
      >
        <p className="text-sm text-red-700">
          No valid cloze deletions found. Use the format:{" "}
          {`{{c1::hidden text}}`}
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-muted-foreground text-sm font-medium">
          Preview ({parsedCards.length} card{parsedCards.length > 1 ? "s" : ""})
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowPreview(!showPreview)}
          className="h-6 px-2 text-xs"
        >
          {showPreview ? (
            <EyeOff className="mr-1 h-3 w-3" />
          ) : (
            <Eye className="mr-1 h-3 w-3" />
          )}
          {showPreview ? "Hide" : "Show"}
        </Button>
      </div>

      {showPreview && (
        <div className="space-y-3 rounded-lg border bg-gray-50 p-3">
          {parsedCards.map((card, index) => (
            <div key={index} className="rounded border bg-white p-3">
              <div className="text-muted-foreground mb-1 text-xs font-medium">
                Card {index + 1}
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex gap-2">
                  <span className="flex-shrink-0 font-medium">Q:</span>
                  <MarkdownRenderer>{card.question}</MarkdownRenderer>
                </div>
                <div className="flex gap-2">
                  <span className="flex-shrink-0 font-medium">A:</span>
                  <MarkdownRenderer className="font-semibold text-green-700">
                    {card.answer}
                  </MarkdownRenderer>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
