"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { FilterState, EventLevel, EventSource, SourceGroup, LogEntry } from "@/lib/types";
import { ScrollArea } from "../ui/scroll-area";
import { AddLogFile } from "./AddLogFile";
import { parseLogFile } from "@/lib/parser";
import { Input } from "../ui/input";
import { Search } from "lucide-react";

interface FilterControlsProps {
  filters: FilterState;
  setFilters: (filters: FilterState) => void;
  allLevels: EventLevel[];
  availableLevels: EventLevel[];
  availableSources: EventSource[];
  groupedSources: SourceGroup[];
  onLogsParsed: (logs: Omit<LogEntry, 'id'>[]) => void;
  onError: (errorMessage: string) => void;
}

export function FilterControls({ 
    filters, 
    setFilters, 
    allLevels, 
    availableLevels,
    availableSources,
    groupedSources,
    onLogsParsed,
    onError
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

    const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setFilters({ ...filters, searchTerm: event.target.value });
    }
    
  return (
    <Card className="h-full bg-card/50">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-lg">Filter Events</CardTitle>
        <AddLogFile onLogsParsed={onLogsParsed} onError={onError} parser={parseLogFile} />
      </CardHeader>
      <CardContent>
        <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
                placeholder="Search messages..."
                value={filters.searchTerm}
                onChange={handleSearchChange}
                className="pl-10 bg-background/50"
            />
        </div>
        <ScrollArea className="h-[420px]">
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
                            />
                            <Label 
                                htmlFor={`level-${level}`} 
                                className={cn(
                                    "font-normal cursor-pointer",
                                    !isAvailable && "text-muted-foreground/50"
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
                {groupedSources.length === 0 && (
                     <p className="text-xs text-muted-foreground">No sources found.</p>
                )}
                {groupedSources.map((group) => (
                    <div key={group.filename} className="space-y-2">
                        <p className="font-medium text-xs text-foreground truncate" title={group.filename}>{group.filename}</p>
                        <div className="pl-2 space-y-2">
                            {group.sources.map((source) => {
                                const isAvailable = availableSources.includes(source);
                                return (
                                    <div key={source} className="flex items-center space-x-3">
                                        <Checkbox 
                                            id={`source-${group.filename}-${source}`}
                                            checked={filters.sources.includes(source)}
                                            onCheckedChange={(checked) => handleSourceChange(source, !!checked)}
                                        />
                                        <Label 
                                            htmlFor={`source-${group.filename}-${source}`} 
                                            className={cn(
                                                "font-normal cursor-pointer",
                                                !isAvailable && "text-muted-foreground/50"
                                            )}
                                        >
                                            {source}
                                        </Label>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
