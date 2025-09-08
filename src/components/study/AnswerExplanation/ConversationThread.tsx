"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, MessageSquare } from "lucide-react";
import { type ConversationItem } from "./AnswerExplanation";
// cn import removed - not used
import { formatDistanceToNow } from "date-fns";

interface ConversationThreadProps {
  history: ConversationItem[];
  onQuestionClick?: (question: string) => void;
}

export function ConversationThread({
  history,
  onQuestionClick,
}: ConversationThreadProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Only show previous conversations (exclude the current one)
  const previousConversations = history.slice(0, -1);

  if (previousConversations.length === 0) {
    return null;
  }

  return (
    <div className="bg-muted/30 rounded-lg border p-3">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsExpanded(!isExpanded)}
        className="hover:bg-muted/50 mb-2 h-auto w-full justify-between p-2"
      >
        <div className="flex items-center gap-2">
          <MessageSquare className="text-muted-foreground h-4 w-4" />
          <span className="text-sm font-medium">
            Conversation History ({previousConversations.length})
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="text-muted-foreground h-4 w-4" />
        ) : (
          <ChevronDown className="text-muted-foreground h-4 w-4" />
        )}
      </Button>

      {isExpanded && (
        <div className="space-y-3">
          {previousConversations.map((item, _index) => (
            <div
              key={item.id}
              className="bg-background space-y-2 rounded-md p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="text-muted-foreground text-xs font-medium">
                    {item.questionType === "custom"
                      ? "Your question"
                      : `Preset: ${item.questionType}`}
                  </p>
                  <p className="text-foreground text-sm font-medium">
                    {item.question}
                  </p>
                </div>
                <span className="text-muted-foreground text-xs">
                  {formatDistanceToNow(item.createdAt, { addSuffix: true })}
                </span>
              </div>

              <div className="bg-muted/50 rounded p-2">
                <p className="text-muted-foreground line-clamp-3 text-sm">
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
