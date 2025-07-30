"use client";

import { Button } from "@/components/ui/button";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { Download, Loader2 } from "lucide-react";

interface ExportDeckProps {
  deckId: string;
  deckName: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
  className?: string;
}

export function ExportDeck({ 
  deckId, 
  deckName,
  variant = "outline",
  size = "default",
  className = ""
}: ExportDeckProps) {
  // Export deck mutation
  const exportDeck = api.import.exportDeck.useMutation({
    onSuccess: (result) => {
      if (result.success && result.data) {
        // Create download
        const jsonString = JSON.stringify(result.data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        // Create download link
        const link = document.createElement('a');
        link.href = url;
        link.download = result.filename || `${deckName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up
        URL.revokeObjectURL(url);
        
        toast.success("Deck exported successfully!");
      }
    },
    onError: (error) => {
      toast.error(`Export failed: ${error.message}`);
    },
  });

  const handleExport = () => {
    exportDeck.mutate({ deckId });
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleExport}
      disabled={exportDeck.isPending}
      className={`gap-2 ${className}`}
    >
      {exportDeck.isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}
      Export to JSON
    </Button>
  );
}