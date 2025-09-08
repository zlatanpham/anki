"use client";

import { Button } from "@/components/ui/button";
import { Bookmark, BookmarkCheck, RefreshCw, Copy, Share2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface ExplanationActionsProps {
  onSave: () => void;
  onNewExplanation: () => void;
  isSaved: boolean;
  isLoading?: boolean;
}

export function ExplanationActions({ 
  onSave, 
  onNewExplanation,
  isSaved,
  isLoading = false
}: ExplanationActionsProps) {
  const isMobile = useIsMobile();
  const handleCopy = () => {
    const explanationElement = document.querySelector('.prose');
    if (explanationElement?.textContent) {
      void navigator.clipboard.writeText(explanationElement.textContent);
      toast.success("Explanation copied to clipboard");
    }
  };

  const handleShare = async () => {
    const explanationElement = document.querySelector('.prose');
    if (explanationElement?.textContent) {
      const shareText = explanationElement.textContent;
      
      if (navigator.share) {
        try {
          await navigator.share({
            title: 'Anki Card Explanation',
            text: shareText,
          });
        } catch {
          // User cancelled share
        }
      } else {
        // Fallback to copying to clipboard with a different message
        void navigator.clipboard.writeText(shareText);
        toast.success("Explanation copied - ready to share!");
      }
    }
  };

  return (
    <div className={cn(
      "flex flex-wrap items-center gap-2 border-t pt-3",
      isMobile && "justify-between"
    )}>
      {isMobile ? (
        <>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={onSave}
              disabled={isLoading || isSaved}
              className={cn(
                "h-9 w-9",
                isSaved && "text-green-600 hover:text-green-600"
              )}
            >
              {isSaved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
            </Button>
            
            <Button
              variant="outline"
              size="icon"
              onClick={handleCopy}
              className="h-9 w-9"
            >
              <Copy className="h-4 w-4" />
            </Button>
            
            <Button
              variant="outline"
              size="icon"
              onClick={handleShare}
              className="h-9 w-9"
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={onNewExplanation}
            className="gap-1"
          >
            <RefreshCw className="h-3 w-3" />
            New
          </Button>
        </>
      ) : (
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={onSave}
            disabled={isLoading || isSaved}
            className={cn(
              "gap-2",
              isSaved && "text-green-600 hover:text-green-600"
            )}
          >
            {isSaved ? (
              <>
                <BookmarkCheck className="h-4 w-4" />
                Saved
              </>
            ) : (
              <>
                <Bookmark className="h-4 w-4" />
                Save
              </>
            )}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="gap-2"
          >
            <Copy className="h-4 w-4" />
            Copy
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
            className="gap-2"
          >
            <Share2 className="h-4 w-4" />
            Share
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={onNewExplanation}
            className="ml-auto gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            New Question
          </Button>
        </>
      )}
    </div>
  );
}