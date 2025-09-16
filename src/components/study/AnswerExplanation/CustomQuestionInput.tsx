"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface CustomQuestionInputProps {
  onSubmit: (question: string) => void;
  isLoading?: boolean;
  placeholder?: string;
}

export function CustomQuestionInput({
  onSubmit,
  isLoading = false,
  placeholder = "Ask a specific question about this answer...",
}: CustomQuestionInputProps) {
  const [question, setQuestion] = useState("");

  const submitQuestion = () => {
    if (question.trim() && !isLoading) {
      onSubmit(question.trim());
      setQuestion("");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitQuestion();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        "border-input bg-background/80 rounded-3xl border p-3 shadow-sm",
        "supports-[backdrop-filter]:bg-background/60 backdrop-blur",
      )}
    >
      <div className="flex items-end gap-3">
        <Textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={placeholder}
          disabled={isLoading}
          maxLength={500}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              submitQuestion();
            }
          }}
          className="text-foreground min-h-[88px] w-full flex-1 resize-none border-0 bg-transparent p-0 text-base leading-relaxed shadow-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
        />
        <div className="flex flex-col justify-end gap-2">
          <Button
            type="submit"
            disabled={!question.trim() || isLoading}
            className={cn(
              "h-11 w-11 rounded-full",
              question.trim() && !isLoading
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground",
            )}
          >
            <ArrowUp className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </form>
  );
}
