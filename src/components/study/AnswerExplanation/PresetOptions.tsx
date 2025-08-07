"use client";

import { Button } from "@/components/ui/button";
import { Baby, Lightbulb, Target, Layers } from "lucide-react";
import { type QuestionType } from "./AnswerExplanation";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface PresetOption {
  type: QuestionType;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const presetOptions: PresetOption[] = [
  {
    type: "eli5",
    label: "Explain like I'm 5",
    description: "Simple explanation with analogies",
    icon: Baby,
    color: "text-blue-600 hover:bg-blue-50 hover:border-blue-300",
  },
  {
    type: "example",
    label: "Give me an example",
    description: "Real-world applications",
    icon: Lightbulb,
    color: "text-green-600 hover:bg-green-50 hover:border-green-300",
  },
  {
    type: "importance",
    label: "Why is this important?",
    description: "Significance and connections",
    icon: Target,
    color: "text-purple-600 hover:bg-purple-50 hover:border-purple-300",
  },
  {
    type: "breakdown",
    label: "Break it down",
    description: "Step-by-step explanation",
    icon: Layers,
    color: "text-orange-600 hover:bg-orange-50 hover:border-orange-300",
  },
];

interface PresetOptionsProps {
  onSelect: (type: QuestionType) => void;
}

export function PresetOptions({ onSelect }: PresetOptionsProps) {
  const isMobile = useIsMobile();
  
  return (
    <div className={cn(
      "grid gap-3",
      isMobile ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-4"
    )}>
      {presetOptions.map((option) => {
        const Icon = option.icon;
        return (
          <Button
            key={option.type}
            variant="outline"
            onClick={() => onSelect(option.type)}
            className={cn(
              "flex h-auto flex-col items-center gap-2 p-4 transition-all",
              option.color,
              isMobile && "p-3"
            )}
          >
            <Icon className={cn("h-6 w-6", isMobile && "h-5 w-5")} />
            <div className="text-center">
              <div className={cn(
                "font-medium",
                isMobile ? "text-xs" : "text-sm"
              )}>
                {option.label}
              </div>
              {!isMobile && (
                <div className="text-xs text-muted-foreground">
                  {option.description}
                </div>
              )}
            </div>
          </Button>
        );
      })}
    </div>
  );
}