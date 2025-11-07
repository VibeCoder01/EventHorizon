"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { FilterState, EventLevel, EventSource } from "@/lib/types";

interface FilterControlsProps {
  filters: FilterState;
  setFilters: (filters: FilterState) => void;
  allLevels: EventLevel[];
  allSources: EventSource[];
}

export function FilterControls({ filters, setFilters, allLevels, allSources }: FilterControlsProps) {
    
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
      <CardContent className="space-y-6">
        <div className="space-y-3">
            <h4 className="font-semibold text-sm text-muted-foreground">By Level</h4>
            {allLevels.map((level) => (
                <div key={level} className="flex items-center space-x-3">
                    <Checkbox 
                        id={`level-${level}`} 
                        checked={filters.levels.includes(level)}
                        onCheckedChange={(checked) => handleLevelChange(level, !!checked)}
                    />
                    <Label htmlFor={`level-${level}`} className="font-normal text-foreground cursor-pointer">{level}</Label>
                </div>
            ))}
        </div>
        <div className="space-y-3">
            <h4 className="font-semibold text-sm text-muted-foreground">By Source</h4>
            {allSources.map((source) => (
                <div key={source} className="flex items-center space-x-3">
                    <Checkbox 
                        id={`source-${source}`}
                        checked={filters.sources.includes(source)}
                        onCheckedChange={(checked) => handleSourceChange(source, !!checked)}
                    />
                    <Label htmlFor={`source-${source}`} className="font-normal text-foreground cursor-pointer">{source}</Label>
                </div>
            ))}
        </div>
      </CardContent>
    </Card>
  );
}
