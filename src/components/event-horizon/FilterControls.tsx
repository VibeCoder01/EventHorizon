"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { FilterState, EventLevel, EventSource } from "@/lib/types";
import { ScrollArea } from "../ui/scroll-area";

interface FilterControlsProps {
  filters: FilterState;
  setFilters: (filters: FilterState) => void;
  allLevels: EventLevel[];
  allSources: EventSource[];
  availableLevels: EventLevel[];
  availableSources: EventSource[];
}

export function FilterControls({ 
    filters, 
    setFilters, 
    allLevels, 
    allSources,
    availableLevels,
    availableSources,
}: FilterControlsProps) {
    
    const handleLevelChange = (level: EventLevel, checked: boolean) => {
        const newLevels = checked
            ? [...filters.levels, level]
            : filters.levels.filter(l => l !== level);
        setFilters({ ...filters, levels: newLevels });
    };

    const handleSourceChange = (source: EventSource, checked: boolean) => {
        const newSources = checked
            ? [...filters.sources, source]
            : filters.sources.filter(s => s !== source);
        setFilters({ ...filters, sources: newSources });
    };
    
  return (
    <Card className="h-full bg-card/50">
      <CardHeader>
        <CardTitle className="text-lg">Filter Events</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[480px]">
          <div className="space-y-6 p-1">
            <div className="space-y-3">
                <h4 className="font-semibold text-sm text-muted-foreground">By Level</h4>
                {allLevels.map((level) => {
                    const isAvailable = availableLevels.includes(level);
                    return (
                        <div key={level} className="flex items-center space-x-3">
                            <Checkbox 
                                id={`level-${level}`} 
                                checked={filters.levels.includes(level)}
                                onCheckedChange={(checked) => handleLevelChange(level, !!checked)}
                                disabled={!isAvailable}
                            />
                            <Label 
                                htmlFor={`level-${level}`} 
                                className={cn(
                                    "font-normal text-foreground",
                                    isAvailable ? "cursor-pointer" : "cursor-not-allowed text-muted-foreground/50"
                                )}
                            >
                                {level}
                            </Label>
                        </div>
                    );
                })}
            </div>
            <div className="space-y-3">
                <h4 className="font-semibold text-sm text-muted-foreground">By Source</h4>
                {allSources.map((source) => {
                    const isAvailable = availableSources.includes(source);
                    return (
                        <div key={source} className="flex items-center space-x-3">
                            <Checkbox 
                                id={`source-${source}`}
                                checked={filters.sources.includes(source)}
                                onCheckedChange={(checked) => handleSourceChange(source, !!checked)}
                                disabled={!isAvailable}
                            />
                            <Label 
                                htmlFor={`source-${source}`} 
                                className={cn(
                                    "font-normal text-foreground",
                                    isAvailable ? "cursor-pointer" : "cursor-not-allowed text-muted-foreground/50"
                                )}
                            >
                                {source}
                            </Label>
                        </div>
                    );
                })}
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
