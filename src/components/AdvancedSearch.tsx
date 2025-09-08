"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { CalendarIcon, Search, X, Filter, BookOpen } from "lucide-react";
import { api } from "@/trpc/react";
import { cn } from "@/lib/utils";

interface SearchFilters {
  search: string;
  cardType?: "BASIC" | "CLOZE";
  tags: string[];
  deckIds: string[];
  searchFields: string[];
  createdAfter?: Date;
  createdBefore?: Date;
  sortBy: "created_at" | "updated_at" | "front" | "due_date" | "interval" | "difficulty" | "lapses" | "repetitions";
  sortOrder: "asc" | "desc";
}

interface AdvancedSearchProps {
  onSearch: (filters: SearchFilters) => void;
  initialFilters?: Partial<SearchFilters>;
  deckId?: string; // If provided, search within specific deck
  className?: string;
}

const SEARCH_FIELDS = [
  { id: "front", label: "Front" },
  { id: "back", label: "Back" },
  { id: "cloze_text", label: "Cloze Text" },
  { id: "tags", label: "Tags" },
];

const SORT_OPTIONS = [
  { value: "created_at", label: "Date Created" },
  { value: "updated_at", label: "Last Modified" },
  { value: "front", label: "Front Text" },
];

export function AdvancedSearch({ 
  onSearch, 
  initialFilters, 
  deckId, 
  className 
}: AdvancedSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    search: "",
    tags: [],
    deckIds: [],
    searchFields: ["front", "back", "cloze_text", "tags"],
    sortBy: "created_at",
    sortOrder: "desc",
    ...initialFilters,
  });

  // Get user's decks for filtering
  const { data: decks } = api.deck.getAll.useQuery({});

  // Get popular tags for suggestions
  const { data: popularTags } = api.card.getPopularTags.useQuery({
    deckId,
    limit: 20,
  });

  const handleSearch = () => {
    if (deckId) {
      // Include deckId in filters for deck-specific search
      onSearch({ ...filters, deckIds: [deckId] });
    } else {
      onSearch(filters);
    }
    setIsOpen(false);
  };

  const clearFilters = () => {
    setFilters({
      search: "",
      tags: [],
      deckIds: [],
      searchFields: ["front", "back", "cloze_text", "tags"],
      sortBy: "created_at",
      sortOrder: "desc",
    });
  };

  const toggleTag = (tag: string) => {
    setFilters(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  const toggleDeck = (deckIdToToggle: string) => {
    setFilters(prev => ({
      ...prev,
      deckIds: prev.deckIds.includes(deckIdToToggle)
        ? prev.deckIds.filter(id => id !== deckIdToToggle)
        : [...prev.deckIds, deckIdToToggle]
    }));
  };

  const hasActiveFilters = 
    filters.search || 
    filters.cardType ?? 
    filters.tags.length > 0 ?? 
    (filters.deckIds.length > 0 && !deckId) || // Only count deckIds as active filter if not in deck-specific mode
    filters.createdAfter ?? 
    filters.createdBefore ??
    filters.searchFields.length !== 4 ||
    filters.sortBy !== "created_at" ||
    filters.sortOrder !== "desc";

  return (
    <div className={className}>
      <div className="flex gap-2">
        {/* Quick Search Input */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search cards..."
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            className="pl-10"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSearch();
              }
            }}
          />
        </div>

        {/* Advanced Search Toggle */}
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Advanced
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-1 px-1 py-0 text-xs">
                  !
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-96 p-0" align="end">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Advanced Search</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Card Type Filter */}
                <div className="space-y-2">
                  <Label>Card Type</Label>
                  <Select
                    value={filters.cardType ?? "all"}
                    onValueChange={(value) => 
                      setFilters(prev => ({ 
                        ...prev, 
                        cardType: value === "all" ? undefined : value as "BASIC" | "CLOZE"
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="BASIC">Basic Cards</SelectItem>
                      <SelectItem value="CLOZE">Cloze Deletion</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Search Fields */}
                <div className="space-y-2">
                  <Label>Search In</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {SEARCH_FIELDS.map((field) => (
                      <div key={field.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={field.id}
                          checked={filters.searchFields.includes(field.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFilters(prev => ({
                                ...prev,
                                searchFields: [...prev.searchFields, field.id]
                              }));
                            } else {
                              setFilters(prev => ({
                                ...prev,
                                searchFields: prev.searchFields.filter(f => f !== field.id)
                              }));
                            }
                          }}
                        />
                        <Label htmlFor={field.id} className="text-sm">
                          {field.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tags Filter */}
                {popularTags && popularTags.length > 0 && (
                  <div className="space-y-2">
                    <Label>Tags</Label>
                    <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                      {popularTags.map(({ tag, count }) => (
                        <Badge
                          key={tag}
                          variant={filters.tags.includes(tag) ? "default" : "secondary"}
                          className="cursor-pointer text-xs"
                          onClick={() => toggleTag(tag)}
                        >
                          {tag} ({count})
                        </Badge>
                      ))}
                    </div>
                    {filters.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        <span className="text-sm text-muted-foreground">Selected:</span>
                        {filters.tags.map(tag => (
                          <Badge key={tag} variant="default" className="text-xs">
                            {tag}
                            <X
                              className="w-3 h-3 ml-1 cursor-pointer"
                              onClick={() => toggleTag(tag)}
                            />
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Deck Filter (only for global search) */}
                {!deckId && decks?.decks && decks.decks.length > 0 && (
                  <div className="space-y-2">
                    <Label>Decks</Label>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {decks.decks.map((deck) => (
                        <div key={deck.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={deck.id}
                            checked={filters.deckIds.includes(deck.id)}
                            onCheckedChange={() => toggleDeck(deck.id)}
                          />
                          <Label htmlFor={deck.id} className="text-sm flex items-center gap-1">
                            <BookOpen className="w-3 h-3" />
                            {deck.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Date Range */}
                <div className="space-y-2">
                  <Label>Date Range</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "justify-start text-left font-normal",
                            !filters.createdAfter && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {filters.createdAfter ? (
                            format(filters.createdAfter, "PPP")
                          ) : (
                            <span>From date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={filters.createdAfter}
                          onSelect={(date) => setFilters(prev => ({ ...prev, createdAfter: date }))}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>

                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "justify-start text-left font-normal",
                            !filters.createdBefore && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {filters.createdBefore ? (
                            format(filters.createdBefore, "PPP")
                          ) : (
                            <span>To date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={filters.createdBefore}
                          onSelect={(date) => setFilters(prev => ({ ...prev, createdBefore: date }))}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* Sorting */}
                <div className="space-y-2">
                  <Label>Sort By</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Select
                      value={filters.sortBy}
                      onValueChange={(value) => 
                        setFilters(prev => ({ 
                          ...prev, 
                          sortBy: value as "created_at" | "updated_at" | "front"
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SORT_OPTIONS.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={filters.sortOrder}
                      onValueChange={(value) => 
                        setFilters(prev => ({ 
                          ...prev, 
                          sortOrder: value as "asc" | "desc"
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="desc">Newest First</SelectItem>
                        <SelectItem value="asc">Oldest First</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-between pt-2">
                  <Button variant="outline" onClick={clearFilters} size="sm">
                    Clear All
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setIsOpen(false)} size="sm">
                      Cancel
                    </Button>
                    <Button onClick={handleSearch} size="sm">
                      <Search className="w-4 h-4 mr-2" />
                      Search
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </PopoverContent>
        </Popover>

        {/* Quick Search Button */}
        <Button onClick={handleSearch}>
          <Search className="w-4 h-4" />
        </Button>
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 mt-2">
          {filters.cardType && (
            <Badge variant="outline" className="flex items-center gap-1">
              Type: {filters.cardType}
              <X
                className="w-3 h-3 cursor-pointer"
                onClick={() => setFilters(prev => ({ ...prev, cardType: undefined }))}
              />
            </Badge>
          )}
          {filters.tags.map(tag => (
            <Badge key={tag} variant="outline" className="flex items-center gap-1">
              #{tag}
              <X
                className="w-3 h-3 cursor-pointer"
                onClick={() => toggleTag(tag)}
              />
            </Badge>
          ))}
          {filters.createdAfter && (
            <Badge variant="outline" className="flex items-center gap-1">
              From: {format(filters.createdAfter, "MMM d")}
              <X
                className="w-3 h-3 cursor-pointer"
                onClick={() => setFilters(prev => ({ ...prev, createdAfter: undefined }))}
              />
            </Badge>
          )}
          {filters.createdBefore && (
            <Badge variant="outline" className="flex items-center gap-1">
              To: {format(filters.createdBefore, "MMM d")}
              <X
                className="w-3 h-3 cursor-pointer"
                onClick={() => setFilters(prev => ({ ...prev, createdBefore: undefined }))}
              />
            </Badge>
          )}
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-6 px-2">
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
}