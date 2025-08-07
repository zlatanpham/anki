"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, MessageSquare } from "lucide-react";
import { type ConversationItem } from "./AnswerExplanation";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface ConversationThreadProps {
  history: ConversationItem[];
  onQuestionClick?: (question: string) => void;
}

export function ConversationThread({ 
  history, 
  onQuestionClick 
}: ConversationThreadProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Only show previous conversations (exclude the current one)
  const previousConversations = history.slice(0, -1);
  
  if (previousConversations.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsExpanded(!isExpanded)}
        className="mb-2 h-auto w-full justify-between p-2 hover:bg-muted/50"
      >
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">
            Conversation History ({previousConversations.length})
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </Button>

      {isExpanded && (
        <div className="space-y-3">
          {previousConversations.map((item, index) => (
            <div key={item.id} className="space-y-2 rounded-md bg-background p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    {item.questionType === "custom" ? "Your question" : `Preset: ${item.questionType}`}
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    {item.question}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(item.createdAt, { addSuffix: true })}
                </span>
              </div>
              
              <div className="rounded bg-muted/50 p-2">
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {item.answer}
                </p>
              </div>
              
              {onQuestionClick && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onQuestionClick(item.question)}
                  className="h-auto px-2 py-1 text-xs"
                >
                  Ask again
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}