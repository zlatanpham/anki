import { formatDistanceToNow, format, isToday, isTomorrow, isAfter, isBefore, startOfDay } from "date-fns";

/**
 * Formats a date for due date display following the requirements:
 * - "Due now" for overdue cards
 * - "Due today" for cards due within 24 hours
 * - "Due tomorrow" for next day
 * - Standard date format for others
 * - Include time if due today
 */
export function formatDueDate(date: Date | string): { text: string; isOverdue: boolean; isDueToday: boolean } {
  const dueDate = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const todayStart = startOfDay(now);
  const tomorrowStart = startOfDay(new Date(now.getTime() + 24 * 60 * 60 * 1000));

  // Check if overdue
  if (isBefore(dueDate, now)) {
    return {
      text: "Due now",
      isOverdue: true,
      isDueToday: false,
    };
  }

  // Check if due today
  if (isToday(dueDate)) {
    const timeStr = format(dueDate, "h:mm a");
    return {
      text: `Due today at ${timeStr}`,
      isOverdue: false,
      isDueToday: true,
    };
  }

  // Check if due tomorrow
  if (isTomorrow(dueDate)) {
    return {
      text: "Due tomorrow",
      isOverdue: false,
      isDueToday: false,
    };
  }

  // Standard date format for future dates
  return {
    text: format(dueDate, "MMM d, yyyy"),
    isOverdue: false,
    isDueToday: false,
  };
}

/**
 * Formats an interval in human-readable format
 * - < 1 day: Show in hours
 * - 1-30 days: Show in days
 * - > 30 days: Show in weeks/months
 */
export function formatInterval(intervalDays: number): string {
  if (intervalDays === 0) {
    return "New card";
  }

  if (intervalDays < 1) {
    const hours = Math.round(intervalDays * 24);
    return hours === 1 ? "1 hour" : `${hours} hours`;
  }

  if (intervalDays === 1) {
    return "1 day";
  }

  if (intervalDays <= 30) {
    return `${intervalDays} days`;
  }

  // Convert to weeks if less than 90 days
  if (intervalDays < 90) {
    const weeks = Math.round(intervalDays / 7);
    return weeks === 1 ? "1 week" : `${weeks} weeks`;
  }

  // Convert to months
  const months = Math.round(intervalDays / 30);
  return months === 1 ? "1 month" : `${months} months`;
}

/**
 * Formats a date relative to now (e.g., "5 minutes ago", "in 2 hours")
 */
export function formatRelativeTime(date: Date | string): string {
  const targetDate = typeof date === "string" ? new Date(date) : date;
  return formatDistanceToNow(targetDate, { addSuffix: true });
}

/**
 * Get a color class for due date urgency
 */
export function getDueDateColorClass(dueDate: Date | string): string {
  const { isOverdue, isDueToday } = formatDueDate(dueDate);
  
  if (isOverdue) {
    return "text-red-600 dark:text-red-400";
  }
  
  if (isDueToday) {
    return "text-orange-600 dark:text-orange-400";
  }
  
  return "text-muted-foreground";
}