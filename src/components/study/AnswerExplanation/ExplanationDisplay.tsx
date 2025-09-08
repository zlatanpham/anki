"use client";

// Card import removed - not used
import { Badge } from "@/components/ui/badge";
import { Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

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

  // Simple markdown-like formatting
  const formatExplanation = (text: string) => {
    // Split by paragraphs
    const paragraphs = text.split("\n\n");

    return paragraphs.map((paragraph, idx) => {
      // Check for bullet points
      if (
        paragraph.trim().startsWith("- ") ||
        paragraph.trim().startsWith("* ")
      ) {
        const items = paragraph.split("\n").filter((line) => line.trim());
        return (
          <ul key={idx} className="list-disc space-y-1 pl-6">
            {items.map((item, itemIdx) => (
              <li key={itemIdx} className="text-sm">
                {item.replace(/^[-*]\s+/, "")}
              </li>
            ))}
          </ul>
        );
      }

      // Check for numbered lists
      if (/^\d+\.\s/.test(paragraph.trim())) {
        const items = paragraph.split("\n").filter((line) => line.trim());
        return (
          <ol key={idx} className="list-decimal space-y-1 pl-6">
            {items.map((item, itemIdx) => (
              <li key={itemIdx} className="text-sm">
                {item.replace(/^\d+\.\s+/, "")}
              </li>
            ))}
          </ol>
        );
      }

      // Regular paragraph
      return (
        <p key={idx} className="text-sm leading-relaxed">
          {paragraph}
        </p>
      );
    });
  };

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

      <div
        className={cn(
          "prose prose-sm max-w-none text-gray-700",
          isLoading && "animate-pulse",
        )}
      >
        {formatExplanation(explanation)}
      </div>
    </div>
  );
}
