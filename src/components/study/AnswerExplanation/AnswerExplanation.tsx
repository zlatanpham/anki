"use client";

import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lightbulb, ChevronDown, ChevronUp } from "lucide-react";
import { ExplanationTrigger } from "./ExplanationTrigger";
import { PresetOptions } from "./PresetOptions";
import { CustomQuestionInput } from "./CustomQuestionInput";
import { ExplanationDisplay } from "./ExplanationDisplay";
import { ConversationThread } from "./ConversationThread";
import { ExplanationActions } from "./ExplanationActions";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface AnswerExplanationProps {
  cardId: string;
  front: string;
  back: string;
  clozeText?: string;
  onClose?: () => void;
}

export type QuestionType = "eli5" | "example" | "importance" | "breakdown" | "custom";

export interface ConversationItem {
  question: string;
  answer: string;
  questionType: QuestionType;
  id: string;
  createdAt: Date;
}

export function AnswerExplanation({
  cardId,
  front,
  back,
  clozeText,
  onClose,
}: AnswerExplanationProps) {
  const isMobile = useIsMobile();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [currentExplanation, setCurrentExplanation] = useState<string | null>(null);
  const [currentExplanationId, setCurrentExplanationId] = useState<string | null>(null);
  const [conversationHistory, setConversationHistory] = useState<ConversationItem[]>([]);
  const [suggestedFollowUps, setSuggestedFollowUps] = useState<string[]>([]);

  const explainMutation = api.ai.explainAnswer.useMutation({
    onSuccess: (data) => {
      setCurrentExplanation(data.explanation);
      setCurrentExplanationId(data.id);
      setSuggestedFollowUps(data.suggestedFollowUps || []);
      
      // Add to conversation history
      const question = conversationHistory.length > 0 
        ? conversationHistory[conversationHistory.length - 1].question 
        : "Initial explanation";
      
      setConversationHistory(prev => [...prev, {
        question,
        answer: data.explanation,
        questionType: "custom" as QuestionType,
        id: data.id,
        createdAt: new Date(),
      }]);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to generate explanation");
    },
  });

  const saveExplanationMutation = api.ai.saveExplanation.useMutation({
    onSuccess: () => {
      toast.success("Explanation saved successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to save explanation");
    },
  });

  const handleTriggerClick = useCallback(() => {
    if (!isExpanded) {
      setIsExpanded(true);
      setShowOptions(true);
    } else {
      setIsExpanded(false);
      setShowOptions(false);
      // Don't clear explanation when collapsing
    }
  }, [isExpanded]);

  const handlePresetSelect = useCallback((questionType: QuestionType) => {
    const conversationContext = conversationHistory.map(item => ({
      question: item.question,
      answer: item.answer,
    }));

    explainMutation.mutate({
      cardId,
      questionType,
      conversationHistory: conversationContext,
    });

    setShowOptions(false);
  }, [cardId, conversationHistory, explainMutation]);

  const handleCustomQuestion = useCallback((question: string) => {
    const conversationContext = conversationHistory.map(item => ({
      question: item.question,
      answer: item.answer,
    }));

    explainMutation.mutate({
      cardId,
      questionType: "custom",
      customQuestion: question,
      conversationHistory: conversationContext,
    });

    setShowOptions(false);
  }, [cardId, conversationHistory, explainMutation]);

  const handleSaveExplanation = useCallback(() => {
    if (currentExplanationId) {
      saveExplanationMutation.mutate({
        explanationId: currentExplanationId,
      });
    }
  }, [currentExplanationId, saveExplanationMutation]);

  const handleFollowUpClick = useCallback((question: string) => {
    handleCustomQuestion(question);
  }, [handleCustomQuestion]);

  return (
    <div className={cn("mt-4", isMobile && "mt-3")}>
      <ExplanationTrigger 
        onClick={handleTriggerClick}
        isExpanded={isExpanded}
        isLoading={explainMutation.isPending}
      />

      {isExpanded && (
        <Card className={cn(
          "mt-3 overflow-hidden border-2",
          explainMutation.isPending && "border-blue-200",
          currentExplanation && "border-green-200"
        )}>
          <CardContent className={cn("p-4", isMobile && "p-3")}>
            {showOptions && !currentExplanation && (
              <div className="space-y-4">
                <PresetOptions onSelect={handlePresetSelect} />
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Or ask a specific question
                    </span>
                  </div>
                </div>
                <CustomQuestionInput 
                  onSubmit={handleCustomQuestion}
                  isLoading={explainMutation.isPending}
                />
              </div>
            )}

            {currentExplanation && (
              <div className="space-y-4">
                <ExplanationDisplay 
                  explanation={currentExplanation}
                  isLoading={explainMutation.isPending}
                />

                {conversationHistory.length > 1 && (
                  <ConversationThread 
                    history={conversationHistory}
                    onQuestionClick={handleFollowUpClick}
                  />
                )}

                {suggestedFollowUps.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      Suggested follow-up questions:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {suggestedFollowUps.map((question, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          onClick={() => handleFollowUpClick(question)}
                          className="text-xs"
                        >
                          {question}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                <CustomQuestionInput 
                  onSubmit={handleCustomQuestion}
                  isLoading={explainMutation.isPending}
                  placeholder="Ask a follow-up question..."
                />

                <ExplanationActions 
                  onSave={handleSaveExplanation}
                  onNewExplanation={() => {
                    setCurrentExplanation(null);
                    setShowOptions(true);
                    setConversationHistory([]);
                  }}
                  isSaved={false}
                  isLoading={saveExplanationMutation.isPending}
                />
              </div>
            )}

            {explainMutation.isPending && !currentExplanation && (
              <div className="flex items-center justify-center py-8">
                <div className="flex flex-col items-center space-y-3">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                  <p className="text-sm text-muted-foreground">
                    Generating explanation...
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}