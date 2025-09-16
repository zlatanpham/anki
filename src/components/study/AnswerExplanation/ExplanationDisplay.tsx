"use client";

// Card import removed - not used
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";

interface ExplanationDisplayProps {
  explanation: string;
  isLoading?: boolean;
  confidence?: number;
}

export function ExplanationDisplay({
  explanation,
  isLoading = false,
  confidence,
}: ExplanationDisplayProps) {
  const isMobile = useIsMobile();

  const normalizedExplanation = useMemo(() => {
    return explanation.replace(/\r\n/g, "\n").trim();
  }, [explanation]);

  return (
    <div
      className={cn(
        "rounded-lg border border-yellow-200 bg-yellow-50 p-4",
        isMobile && "p-3",
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-yellow-600" />
          <h3 className="font-semibold text-yellow-900">AI Explanation</h3>
        </div>
        {confidence !== undefined && (
          <Badge
            variant="secondary"
            className="bg-yellow-100 text-xs text-yellow-700"
          >
            {Math.round(confidence * 100)}% confident
          </Badge>
        )}
      </div>

      <div className={cn(isLoading && "animate-pulse")}>
        <MarkdownRenderer
          className={cn(
            "text-gray-700",
            "prose-headings:text-base prose-headings:font-semibold prose-headings:mt-3",
            "prose-p:my-2 prose-p:leading-relaxed",
            "prose-ol:my-2 prose-ul:my-2 prose-li:my-1",
            "prose-strong:text-gray-900",
          )}
        >
          {normalizedExplanation}
        </MarkdownRenderer>
      </div>
    </div>
  );
}
