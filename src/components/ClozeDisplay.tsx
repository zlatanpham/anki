"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { parseClozeText, renderClozeContext } from "@/lib/cloze";
import { ChevronLeft, ChevronRight, Eye, EyeOff } from "lucide-react";

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
  className = "" 
}: ClozeDisplayProps) {
  const [currentClozeIndex, setCurrentClozeIndex] = useState(0);
  const [parsedCards, setParsedCards] = useState<ReturnType<typeof parseClozeText>>([]);

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
          <div className="text-sm font-medium text-muted-foreground mb-2">Question</div>
          <div 
            className="text-lg leading-relaxed p-4 bg-muted/50 rounded-lg"
            dangerouslySetInnerHTML={{ __html: front }}
          />
        </div>

        {showAnswer && (
          <div>
            <div className="text-sm font-medium text-muted-foreground mb-2">Answer</div>
            <div 
              className="text-lg leading-relaxed p-4 bg-primary/5 rounded-lg"
              dangerouslySetInnerHTML={{ __html: back }}
            />
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
              onClick={() => setCurrentClozeIndex(Math.max(0, currentClozeIndex - 1))}
              disabled={currentClozeIndex === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentClozeIndex(Math.min(parsedCards.length - 1, currentClozeIndex + 1))}
              disabled={currentClozeIndex === parsedCards.length - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Cloze Question */}
      <div>
        <div className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
          Fill in the blank
          {!showAnswer && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onShowAnswer}
              className="h-6 px-2 text-xs"
            >
              <Eye className="h-3 w-3 mr-1" />
              Reveal
            </Button>
          )}
        </div>
        <div className="text-lg leading-relaxed p-4 bg-blue-50 rounded-lg border-l-4 border-blue-200">
          {currentCard?.question || ""}
        </div>
      </div>

      {/* Answer */}
      {showAnswer && (
        <>
          <div>
            <div className="text-sm font-medium text-muted-foreground mb-2">Answer</div>
            <div className="text-lg leading-relaxed p-4 bg-green-50 rounded-lg border-l-4 border-green-200 font-semibold text-green-800">
              {currentCard?.answer || ""}
            </div>
          </div>

          {/* Full Context */}
          <div>
            <div className="text-sm font-medium text-muted-foreground mb-2">Full Context</div>
            <div className="text-sm leading-relaxed p-3 bg-gray-50 rounded-lg border border-gray-200">
              {renderClozeContext(currentCard?.context || "")}
            </div>
          </div>

          {/* Additional Info */}
          {back && back !== clozeText && (
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-2">Additional Notes</div>
              <div 
                className="text-sm leading-relaxed p-3 bg-yellow-50 rounded-lg border-l-4 border-yellow-200"
                dangerouslySetInnerHTML={{ __html: back }}
              />
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
      <div className={`p-3 bg-red-50 border border-red-200 rounded-lg ${className}`}>
        <p className="text-sm text-red-700">
          No valid cloze deletions found. Use the format: {`{{c1::hidden text}}`}
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-muted-foreground">
          Preview ({parsedCards.length} card{parsedCards.length > 1 ? 's' : ''})
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowPreview(!showPreview)}
          className="h-6 px-2 text-xs"
        >
          {showPreview ? <EyeOff className="h-3 w-3 mr-1" /> : <Eye className="h-3 w-3 mr-1" />}
          {showPreview ? 'Hide' : 'Show'}
        </Button>
      </div>

      {showPreview && (
        <div className="space-y-3 p-3 bg-gray-50 rounded-lg border">
          {parsedCards.map((card, index) => (
            <div key={index} className="p-3 bg-white rounded border">
              <div className="text-xs font-medium text-muted-foreground mb-1">
                Card {index + 1}
              </div>
              <div className="text-sm space-y-2">
                <div className="flex gap-2">
                  <span className="font-medium flex-shrink-0">Q:</span>
                  <div dangerouslySetInnerHTML={{ __html: card.question }} />
                </div>
                <div className="flex gap-2">
                  <span className="font-medium flex-shrink-0">A:</span>
                  <span className="text-green-700 font-semibold" dangerouslySetInnerHTML={{ __html: card.answer }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}