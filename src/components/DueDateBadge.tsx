import React from "react";
import { Badge } from "@/components/ui/badge";
import { formatDueDate, getDueDateColorClass } from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import { Calendar, AlertCircle } from "lucide-react";

interface DueDateBadgeProps {
  dueDate: Date | string;
  className?: string;
  showIcon?: boolean;
}

export function DueDateBadge({ 
  dueDate, 
  className,
  showIcon = true 
}: DueDateBadgeProps) {
  const { text, isOverdue, isDueToday } = formatDueDate(dueDate);
  const colorClass = getDueDateColorClass(dueDate);

  // Choose icon based on urgency
  const Icon = isOverdue ? AlertCircle : Calendar;

  return (
    <Badge 
      variant={isOverdue ? "destructive" : isDueToday ? "default" : "outline"}
      className={cn(
        "font-medium",
        isOverdue && "bg-red-100 dark:bg-red-900/30",
        isDueToday && !isOverdue && "bg-orange-100 dark:bg-orange-900/30",
        className
      )}
    >
      <span className={cn("flex items-center gap-1", colorClass)}>
        {showIcon && <Icon className="h-3 w-3" />}
        {text}
      </span>
    </Badge>
  );
}