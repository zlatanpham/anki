"use client";

import { Button } from "@/components/ui/button";
import { Lightbulb, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExplanationTriggerProps {
  onClick: () => void;
  isExpanded: boolean;
  isLoading: boolean;
}

export function ExplanationTrigger({
  onClick,
  isExpanded,
  isLoading,
}: ExplanationTriggerProps) {
  return (
    <div className="flex items-center justify-center">
      <Button
        variant="outline"
        size="sm"
        onClick={onClick}
        className={cn(
          "group relative overflow-hidden transition-all duration-200",
          "hover:border-yellow-400 hover:bg-yellow-50",
          isExpanded && "border-yellow-400 bg-yellow-50",
        )}
      >
        <div className="flex items-center gap-2">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-yellow-600" />
          ) : (
            <Lightbulb
              className={cn(
                "h-4 w-4 transition-colors",
                isExpanded
                  ? "text-yellow-600"
                  : "text-muted-foreground group-hover:text-yellow-600",
              )}
            />
          )}
          <span
            className={cn(
              "font-medium transition-colors",
              isExpanded ? "text-yellow-700" : "text-foreground",
            )}
          >
            {isLoading ? "Thinking..." : "Explain this answer"}
          </span>
          {isExpanded ? (
            <ChevronUp className="text-muted-foreground h-3 w-3" />
          ) : (
            <ChevronDown className="text-muted-foreground h-3 w-3" />
          )}
        </div>

        {/* Hover effect */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-yellow-200/0 via-yellow-200/20 to-yellow-200/0 opacity-0 transition-opacity group-hover:opacity-100" />
      </Button>
    </div>
  );
}
