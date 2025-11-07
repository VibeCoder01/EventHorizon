"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import type { LogEntry, EventLevel } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info, AlertTriangle, XCircle, AlertOctagon, FileText } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface EventTimelineProps {
  entries: LogEntry[];
  allEntries: LogEntry[];
}

const levelConfig: Record<EventLevel, { icon: React.ElementType, color: string }> = {
    'Information': { icon: Info, color: 'text-blue-400' },
    'Warning': { icon: AlertTriangle, color: 'text-yellow-400' },
    'Error': { icon: XCircle, color: 'text-red-500' },
    'Critical': { icon: AlertOctagon, color: 'text-red-700' },
    'Verbose': { icon: FileText, color: 'text-gray-500' },
};

// Simple pseudo-random generator to have deterministic jitter based on entry ID
const pseudoRandom = (seed: number) => {
    let x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
};

export function EventTimeline({ entries, allEntries }: EventTimelineProps) {
  const { minTime, maxTime } = useMemo(() => {
    if (allEntries.length === 0) {
      return { minTime: 0, maxTime: 0 };
    }
    const timestamps = allEntries.map(e => e.timestamp.getTime());
    return {
      minTime: Math.min(...timestamps),
      maxTime: Math.max(...timestamps),
    };
  }, [allEntries]);

  const timeRange = maxTime - minTime;
  
  const getPosition = (timestamp: Date) => {
    if (timeRange === 0) return 50;
    return ((timestamp.getTime() - minTime) / timeRange) * 100;
  };
  
  if (allEntries.length === 0) {
    return (
        <Card className="h-full bg-card/50 flex items-center justify-center">
            <CardContent className="pt-6">
                <p className="text-muted-foreground">No data to display on timeline.</p>
            </CardContent>
        </Card>
    );
  }

  return (
    <Card className="h-full bg-card/50">
      <CardHeader>
        <CardTitle className="text-lg">Event Timeline</CardTitle>
        <CardDescription>
            Visual representation of events over time. Hover for details.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4 pb-8">
        <TooltipProvider>
            <ScrollArea className="w-full whitespace-nowrap">
                <div className="relative w-full h-48 flex items-center px-4">
                    <div className="absolute top-1/2 left-0 w-full h-0.5 bg-secondary -translate-y-1/2" />
                    
                    {entries.map((entry) => {
                        const Icon = levelConfig[entry.level].icon;
                        const color = levelConfig[entry.level].color;
                        const position = getPosition(entry.timestamp);
                        const verticalJitter = (pseudoRandom(entry.id) - 0.5) * 180; // -90px to 90px

                        return (
                            <Tooltip key={entry.id} delayDuration={100}>
                                <TooltipTrigger asChild>
                                    <div 
                                        className="absolute top-1/2 -translate-x-1/2 cursor-pointer"
                                        style={{ 
                                            left: `${position}%`,
                                            transform: `translateY(calc(-50% + ${verticalJitter}px))`,
                                        }}
                                    >
                                        <Icon className={`w-6 h-6 ${color} transition-transform duration-200 hover:scale-150 hover:drop-shadow-[0_0_8px]`} style={{'--tw-drop-shadow-color': 'hsl(var(--primary))'} as React.CSSProperties}/>
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent className="bg-popover text-popover-foreground border-border">
                                    <div className="font-bold">{entry.level}</div>
                                    <div className="text-sm text-muted-foreground">{format(entry.timestamp, "MMM d, yyyy, HH:mm:ss")}</div>
                                    <p className="max-w-xs text-wrap mt-1">{entry.message}</p>
                                </TooltipContent>
                            </Tooltip>
                        )
                    })}
                    
                     <div className="absolute top-full text-xs text-muted-foreground left-0">{format(new Date(minTime), "HH:mm")}</div>
                     <div className="absolute top-full text-xs text-muted-foreground right-0">{format(new Date(maxTime), "HH:mm")}</div>
                </div>
                <ScrollBar orientation="horizontal" />
            </ScrollArea>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
