"use client";

import { Button } from "@/components/ui/button";
import { Baby, Lightbulb, Target, Layers } from "lucide-react";
import { type QuestionType } from "./AnswerExplanation";
import { cn } from "@/lib/utils";
// useIsMobile import removed - not used

interface PresetOption {
  type: QuestionType;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  iconBgColor: string;
}

const presetOptions: PresetOption[] = [
  {
    type: "eli5",
    label: "Explain like I'm 5",
    description: "Simple explanation with analogies",
    icon: Baby,
    color:
      "text-blue-600 hover:text-blue-700 hover:border-blue-300 focus-visible:border-blue-400 focus-visible:ring-blue-200",
    iconBgColor: "bg-blue-50 group-hover:bg-blue-100",
  },
  {
    type: "example",
    label: "Give me an example",
    description: "Real-world applications",
    icon: Lightbulb,
    color:
      "text-green-600 hover:text-green-700 hover:border-green-300 focus-visible:border-green-400 focus-visible:ring-green-200",
    iconBgColor: "bg-green-50 group-hover:bg-green-100",
  },
  {
    type: "importance",
    label: "Why is this important?",
    description: "Significance and connections",
    icon: Target,
    color:
      "text-purple-600 hover:text-purple-700 hover:border-purple-300 focus-visible:border-purple-400 focus-visible:ring-purple-200",
    iconBgColor: "bg-purple-50 group-hover:bg-purple-100",
  },
  {
    type: "breakdown",
    label: "Break it down",
    description: "Step-by-step explanation",
    icon: Layers,
    color:
      "text-orange-600 hover:text-orange-700 hover:border-orange-300 focus-visible:border-orange-400 focus-visible:ring-orange-200",
    iconBgColor: "bg-orange-50 group-hover:bg-orange-100",
  },
];

interface PresetOptionsProps {
  onSelect: (type: QuestionType) => void;
}

export function PresetOptions({ onSelect }: PresetOptionsProps) {
  // On very small screens (< 400px), use 1 column
  // On mobile/tablet (400px - 1024px), use 2 columns
  // On desktop (> 1024px), use 4 columns
  return (
    <div
      className={cn(
        "grid gap-3",
        "grid-cols-1 min-[400px]:grid-cols-2 lg:grid-cols-4",
      )}
    >
      {presetOptions.map((option) => {
        const Icon = option.icon;
        return (
          <Button
            key={option.type}
            variant="outline"
            onClick={() => onSelect(option.type)}
            className={cn(
              "group relative h-auto flex-col gap-3 p-4 transition-all duration-200",
              "hover:scale-[1.02] hover:shadow-md active:scale-[0.98]",
              "border-2",
              "min-h-[120px] sm:min-h-[140px]", // Ensure minimum height
              "focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
              "touch-manipulation", // Improves touch responsiveness
              option.color,
            )}
            aria-label={`${option.label}: ${option.description}`}
          >
            {/* Icon with background */}
            <div
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-lg transition-colors",
                "flex-shrink-0", // Prevent icon from shrinking
                option.iconBgColor,
              )}
            >
              <Icon className={cn("h-6 w-6", option.color.split(" ")[0])} />
            </div>

            {/* Text content */}
            <div className="flex flex-1 flex-col gap-1 text-center">
              <div
                className={cn(
                  "font-semibold",
                  "text-sm sm:text-base",
                  "leading-tight sm:leading-normal",
                  "whitespace-normal", // Allow text to wrap
                  "break-words", // Break long words if needed
                  "hyphens-auto", // Add hyphens for better text breaking
                  "max-w-full", // Ensure text doesn't overflow container
                )}
              >
                {option.label}
              </div>
              <div
                className={cn(
                  "text-muted-foreground text-xs",
                  "leading-relaxed",
                  "whitespace-normal",
                  "break-words",
                  "hyphens-auto",
                  "max-w-full",
                  // Show description on tablets and up, hide on very small screens
                  "hidden sm:block",
                )}
              >
                {option.description}
              </div>
            </div>
          </Button>
        );
      })}
    </div>
  );
}
