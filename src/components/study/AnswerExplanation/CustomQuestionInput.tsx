"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface CustomQuestionInputProps {
  onSubmit: (question: string) => void;
  isLoading?: boolean;
  placeholder?: string;
}

export function CustomQuestionInput({ 
  onSubmit, 
  isLoading = false,
  placeholder = "Ask a specific question about this answer..."
}: CustomQuestionInputProps) {
  const [question, setQuestion] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (question.trim() && !isLoading) {
      onSubmit(question.trim());
      setQuestion("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder={placeholder}
        disabled={isLoading}
        maxLength={500}
        className="flex-1"
      />
      <Button 
        type="submit" 
        size="icon"
        disabled={!question.trim() || isLoading}
        className={cn(
          "shrink-0",
          question.trim() && !isLoading && "hover:bg-primary/90"
        )}
      >
        <Send className="h-4 w-4" />
      </Button>
    </form>
  );
}