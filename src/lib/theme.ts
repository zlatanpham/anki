/**
 * Consistent color tokens and styles for the application
 */

export const ratingColors = {
  again: {
    variant: "destructive" as const,
    className: "bg-red-600 hover:bg-red-700 text-white",
    borderColor: "border-red-200",
    textColor: "text-red-600",
    bgHover: "hover:bg-red-50",
  },
  hard: {
    variant: "outline" as const,
    className: "border-orange-200 text-orange-700 hover:bg-orange-50",
    borderColor: "border-orange-200",
    textColor: "text-orange-700",
    bgHover: "hover:bg-orange-50",
  },
  good: {
    variant: "outline" as const,
    className: "border-green-200 text-green-700 hover:bg-green-50",
    borderColor: "border-green-200",
    textColor: "text-green-700",
    bgHover: "hover:bg-green-50",
  },
  easy: {
    variant: "outline" as const,
    className: "border-blue-200 text-blue-700 hover:bg-blue-50",
    borderColor: "border-blue-200",
    textColor: "text-blue-700",
    bgHover: "hover:bg-blue-50",
  },
} as const;

export const ratingLabels = {
  again: "Again",
  hard: "Hard",
  good: "Good",
  easy: "Easy",
} as const;

export const ratingKeys = {
  again: "1",
  hard: "2",
  good: "3",
  easy: "4",
} as const;

export type RatingType = keyof typeof ratingColors;