"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  ArrowUpDownIcon,
  FilterIcon,
  CalendarIcon,
  BrainIcon,
  ClockIcon,
  TrendingUpIcon,
  AlertCircleIcon,
} from "lucide-react";
// cn import removed - not used
import { type CardStateEnum } from "@prisma/client";

export interface SortingFilterOptions {
  sortBy:
    | "due_date"
    | "interval"
    | "difficulty"
    | "created_at"
    | "updated_at"
    | "front"
    | "lapses"
    | "repetitions";
  sortOrder: "asc" | "desc";
  stateFilter?: CardStateEnum[];
  dueFilter?: "overdue" | "today" | "tomorrow" | "week" | "all";
  intervalRange?: [number, number];
  difficultyRange?: [number, number];
  onlyWithLapses?: boolean;
}

interface CardSortingFilterProps {
  onApply: (options: SortingFilterOptions) => void;
  initialOptions?: Partial<SortingFilterOptions>;
  cardCount?: number;
}

export function CardSortingFilter({
  onApply,
  initialOptions,
  cardCount,
}: CardSortingFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<SortingFilterOptions>({
    sortBy: initialOptions?.sortBy ?? "due_date",
    sortOrder: initialOptions?.sortOrder ?? "asc",
    stateFilter: initialOptions?.stateFilter ?? [],
    dueFilter: initialOptions?.dueFilter ?? "all",
    intervalRange: initialOptions?.intervalRange ?? [0, 365],
    difficultyRange: initialOptions?.difficultyRange ?? [1.3, 2.7],
    onlyWithLapses: initialOptions?.onlyWithLapses ?? false,
  });

  const activeFiltersCount = [
    options.stateFilter && options.stateFilter.length > 0,
    options.dueFilter !== "all",
    options.intervalRange?.[0] !== 0 || options.intervalRange?.[1] !== 365,
    options.difficultyRange?.[0] !== 1.3 ||
      options.difficultyRange?.[1] !== 2.7,
    options.onlyWithLapses,
  ].filter(Boolean).length;

  const handleApply = () => {
    onApply(options);
    setIsOpen(false);
  };

  const handleReset = () => {
    const defaultOptions: SortingFilterOptions = {
      sortBy: "due_date",
      sortOrder: "asc",
      stateFilter: [],
      dueFilter: "all",
      intervalRange: [0, 365],
      difficultyRange: [1.3, 2.7],
      onlyWithLapses: false,
    };
    setOptions(defaultOptions);
    onApply(defaultOptions);
  };

  const sortOptions = [
    { value: "due_date", label: "Due Date", icon: CalendarIcon },
    { value: "interval", label: "Interval", icon: ClockIcon },
    { value: "difficulty", label: "Difficulty", icon: BrainIcon },
    { value: "lapses", label: "Lapses", icon: AlertCircleIcon },
    { value: "repetitions", label: "Repetitions", icon: TrendingUpIcon },
    { value: "created_at", label: "Created", icon: CalendarIcon },
    { value: "updated_at", label: "Updated", icon: CalendarIcon },
    { value: "front", label: "Question (A-Z)", icon: ArrowUpDownIcon },
  ];

  const selectedSortOption = sortOptions.find(
    (opt) => opt.value === options.sortBy,
  );
  const SortIcon = selectedSortOption?.icon ?? ArrowUpDownIcon;

  return (
    <div className="flex items-center gap-2">
      <Select
        value={`${options.sortBy}:${options.sortOrder}`}
        onValueChange={(value) => {
          const [sortBy, sortOrder] = value.split(":") as [
            SortingFilterOptions["sortBy"],
            "asc" | "desc",
          ];
          setOptions({ ...options, sortBy, sortOrder });
          onApply({ ...options, sortBy, sortOrder });
        }}
      >
        <SelectTrigger className="w-[200px]">
          <div className="flex items-center gap-2">
            <SortIcon className="h-4 w-4" />
            <SelectValue />
          </div>
        </SelectTrigger>
        <SelectContent>
          {sortOptions.map((option) => {
            const Icon = option.icon;
            return (
              <div key={option.value}>
                <SelectItem value={`${option.value}:asc`}>
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <span>{option.label}</span>
                    <span className="text-muted-foreground ml-auto">↑</span>
                  </div>
                </SelectItem>
                <SelectItem value={`${option.value}:desc`}>
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <span>{option.label}</span>
                    <span className="text-muted-foreground ml-auto">↓</span>
                  </div>
                </SelectItem>
              </div>
            );
          })}
        </SelectContent>
      </Select>

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="gap-2">
            <FilterIcon className="h-4 w-4" />
            Filters
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px]" align="end">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Filter Cards</h4>
              <Button variant="ghost" size="sm" onClick={handleReset}>
                Reset
              </Button>
            </div>

            {/* State Filter */}
            <div className="space-y-2">
              <Label className="text-xs">Card State</Label>
              <div className="flex flex-wrap gap-2">
                {(
                  ["NEW", "LEARNING", "REVIEW", "SUSPENDED"] as CardStateEnum[]
                ).map((state) => (
                  <Badge
                    key={state}
                    variant={
                      options.stateFilter?.includes(state)
                        ? "default"
                        : "outline"
                    }
                    className="cursor-pointer"
                    onClick={() => {
                      const newStates = options.stateFilter?.includes(state)
                        ? options.stateFilter.filter((s) => s !== state)
                        : [...(options.stateFilter ?? []), state];
                      setOptions({ ...options, stateFilter: newStates });
                    }}
                  >
                    {state}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Due Date Filter */}
            <div className="space-y-2">
              <Label className="text-xs">Due Date</Label>
              <Select
                value={options.dueFilter}
                onValueChange={(value: string) =>
                  setOptions({
                    ...options,
                    dueFilter: value as SortingFilterOptions["dueFilter"],
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cards</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="today">Due Today</SelectItem>
                  <SelectItem value="tomorrow">Due Tomorrow</SelectItem>
                  <SelectItem value="week">Due This Week</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Interval Range */}
            <div className="space-y-2">
              <Label className="text-xs">
                Interval Range: {options.intervalRange?.[0]} -{" "}
                {options.intervalRange?.[1]} days
              </Label>
              <Slider
                value={options.intervalRange}
                onValueChange={(value: number[]) =>
                  setOptions({
                    ...options,
                    intervalRange: value as [number, number],
                  })
                }
                min={0}
                max={365}
                step={1}
                className="w-full"
              />
            </div>

            {/* Difficulty Range */}
            <div className="space-y-2">
              <Label className="text-xs">
                Difficulty (Easiness Factor):{" "}
                {options.difficultyRange?.[0].toFixed(1)} -{" "}
                {options.difficultyRange?.[1].toFixed(1)}
              </Label>
              <Slider
                value={options.difficultyRange}
                onValueChange={(value: number[]) =>
                  setOptions({
                    ...options,
                    difficultyRange: value as [number, number],
                  })
                }
                min={1.3}
                max={2.7}
                step={0.1}
                className="w-full"
              />
            </div>

            {/* Lapses Filter */}
            <div className="flex items-center justify-between">
              <Label htmlFor="lapses-filter" className="text-xs">
                Only show cards with lapses
              </Label>
              <Switch
                id="lapses-filter"
                checked={options.onlyWithLapses}
                onCheckedChange={(checked) =>
                  setOptions({ ...options, onlyWithLapses: checked })
                }
              />
            </div>

            <div className="flex justify-end gap-2 border-t pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsOpen(false)}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={handleApply}>
                Apply Filters
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {cardCount !== undefined && (
        <span className="text-muted-foreground text-sm">{cardCount} cards</span>
      )}
    </div>
  );
}
