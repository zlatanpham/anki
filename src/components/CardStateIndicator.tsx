import React from "react";
import { Badge } from "@/components/ui/badge";
import { CardStateEnum } from "@prisma/client";
import { cn } from "@/lib/utils";
import {
  Sparkles, // NEW
  GraduationCap, // LEARNING
  RefreshCw, // REVIEW
  Pause, // SUSPENDED
} from "lucide-react";

interface CardStateIndicatorProps {
  state: CardStateEnum;
  className?: string;
  showIcon?: boolean;
}

const stateConfig = {
  [CardStateEnum.NEW]: {
    label: "New",
    color:
      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800",
    icon: Sparkles,
  },
  [CardStateEnum.LEARNING]: {
    label: "Learning",
    color:
      "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800",
    icon: GraduationCap,
  },
  [CardStateEnum.REVIEW]: {
    label: "Review",
    color:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800",
    icon: RefreshCw,
  },
  [CardStateEnum.SUSPENDED]: {
    label: "Suspended",
    color:
      "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400 border-gray-200 dark:border-gray-800",
    icon: Pause,
  },
};

export function CardStateIndicator({
  state,
  className,
  showIcon = true,
}: CardStateIndicatorProps) {
  const config = stateConfig[state];
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn("font-medium", config.color, className)}
    >
      {showIcon && <Icon className="mr-1 h-3 w-3" />}
      {config.label}
    </Badge>
  );
}
