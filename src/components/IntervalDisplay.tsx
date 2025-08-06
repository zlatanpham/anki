import React from "react";
import { formatInterval } from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import { Clock } from "lucide-react";

interface IntervalDisplayProps {
  interval: number;
  className?: string;
  showIcon?: boolean;
}

export function IntervalDisplay({ 
  interval, 
  className,
  showIcon = true 
}: IntervalDisplayProps) {
  const formattedInterval = formatInterval(interval);
  const isNewCard = interval === 0;

  return (
    <div className={cn(
      "flex items-center gap-1 text-sm",
      isNewCard ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground",
      className
    )}>
      {showIcon && <Clock className="h-3 w-3" />}
      <span>{formattedInterval}</span>
    </div>
  );
}