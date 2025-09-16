"use client";

import { Button } from "@/components/ui/button";
import { Atom, Hammer, Sparkles, Compass } from "lucide-react";
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
    type: "firstPrinciples",
    label: "Explain with first principles",
    description: "Start from the basics and build the answer back up",
    icon: Atom,
    color:
      "text-blue-600 hover:text-blue-700 hover:border-blue-300 focus-visible:border-blue-400 focus-visible:ring-blue-200",
    iconBgColor: "bg-blue-50 group-hover:bg-blue-100",
  },
  {
    type: "caveman",
    label: "Explain it to a caveman",
    description: "Use primitive words, senses, and no jargon",
    icon: Hammer,
    color:
      "text-amber-600 hover:text-amber-700 hover:border-amber-300 focus-visible:border-amber-400 focus-visible:ring-amber-200",
    iconBgColor: "bg-amber-50 group-hover:bg-amber-100",
  },
  {
    type: "memoryHook",
    label: "Give me a memory trick",
    description: "Create a mnemonic, story, or vivid hook",
    icon: Sparkles,
    color:
      "text-fuchsia-600 hover:text-fuchsia-700 hover:border-fuchsia-300 focus-visible:border-fuchsia-400 focus-visible:ring-fuchsia-200",
    iconBgColor: "bg-fuchsia-50 group-hover:bg-fuchsia-100",
  },
  {
    type: "realWorld",
    label: "Show me how to use it",
    description: "Connect the idea to real decisions or actions",
    icon: Compass,
    color:
      "text-emerald-600 hover:text-emerald-700 hover:border-emerald-300 focus-visible:border-emerald-400 focus-visible:ring-emerald-200",
    iconBgColor: "bg-emerald-50 group-hover:bg-emerald-100",
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
