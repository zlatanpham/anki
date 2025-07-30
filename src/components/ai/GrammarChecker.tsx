"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import {
  CheckCircle,
  AlertCircle,
  Loader2,
  Copy,
  Check,
  FileText,
  Sparkles,
} from "lucide-react";

interface GrammarCheckerProps {
  text: string;
  onApply?: (correctedText: string) => void;
  trigger?: React.ReactNode;
}

export function GrammarChecker({ text, onApply, trigger }: GrammarCheckerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const checkGrammar = api.ai.checkGrammar.useMutation({
    onSuccess: () => {
      toast.success("Grammar check complete!");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to check grammar");
    },
  });

  const handleCheck = () => {
    if (!text.trim()) {
      toast.error("No text to check");
      return;
    }

    checkGrammar.mutate({ text });
  };

  const handleApply = () => {
    if (checkGrammar.data && onApply) {
      onApply(checkGrammar.data.correctedText);
      handleClose();
      toast.success("Applied corrections");
    }
  };

  const handleCopy = async () => {
    if (checkGrammar.data) {
      try {
        await navigator.clipboard.writeText(checkGrammar.data.correctedText);
        setCopied(true);
        toast.success("Copied to clipboard!");
        setTimeout(() => setCopied(false), 2000);
      } catch {
        toast.error("Failed to copy");
      }
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    checkGrammar.reset();
    setCopied(false);
  };

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case "excellent":
        return "text-green-600";
      case "good":
        return "text-blue-600";
      case "fair":
        return "text-yellow-600";
      case "needs_improvement":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const getQualityIcon = (quality: string) => {
    switch (quality) {
      case "excellent":
      case "good":
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getCorrectionTypeColor = (type: string) => {
    switch (type) {
      case "spelling":
        return "destructive";
      case "grammar":
        return "default";
      case "punctuation":
        return "secondary";
      case "style":
        return "outline";
      default:
        return "outline";
    }
  };

  return (
    <>
      {trigger ? (
        <div onClick={() => setIsOpen(true)}>{trigger}</div>
      ) : (
        <Button
          onClick={() => setIsOpen(true)}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <FileText className="h-4 w-4" />
          Check Grammar
        </Button>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Grammar & Spelling Check
            </DialogTitle>
            <DialogDescription>
              AI-powered grammar, spelling, and style improvements
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden space-y-4">
            {!checkGrammar.data && !checkGrammar.isPending && (
              <div className="text-center py-8 space-y-4">
                <p className="text-muted-foreground">
                  Click the button below to check your text for errors
                </p>
                <Button onClick={handleCheck} size="lg">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Check Grammar & Spelling
                </Button>
              </div>
            )}

            {checkGrammar.isPending && (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Checking your text...</p>
              </div>
            )}

            {checkGrammar.data && (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getQualityIcon(checkGrammar.data.overallQuality)}
                    <span className={`font-medium capitalize ${getQualityColor(checkGrammar.data.overallQuality)}`}>
                      {checkGrammar.data.overallQuality.replace("_", " ")} Quality
                    </span>
                  </div>
                  <Badge variant="outline">
                    {checkGrammar.data.corrections.length} corrections
                  </Badge>
                </div>

                <Separator />

                {checkGrammar.data.corrections.length > 0 ? (
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-3 pr-4">
                      <h4 className="text-sm font-medium">Corrections Found:</h4>
                      {checkGrammar.data.corrections.map((correction, index) => (
                        <div key={index} className="border rounded-lg p-3 space-y-2">
                          <div className="flex items-start justify-between">
                            <Badge variant={getCorrectionTypeColor(correction.type)}>
                              {correction.type}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Original</p>
                              <p className="text-red-600 line-through">{correction.original}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Suggestion</p>
                              <p className="text-green-600">{correction.suggestion}</p>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {correction.explanation}
                          </p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      No grammar or spelling errors found! Your text looks good.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Corrected Text:</h4>
                  <div className="relative">
                    <ScrollArea className="h-[100px] w-full rounded-md border p-3">
                      <p className="text-sm whitespace-pre-wrap">
                        {checkGrammar.data.correctedText}
                      </p>
                    </ScrollArea>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="absolute top-2 right-2"
                            onClick={handleCopy}
                          >
                            {copied ? (
                              <Check className="h-4 w-4 text-green-600" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{copied ? "Copied!" : "Copy to clipboard"}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              {onApply && checkGrammar.data ? "Cancel" : "Close"}
            </Button>
            {onApply && checkGrammar.data && (
              <Button onClick={handleApply}>
                Apply Corrections
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}