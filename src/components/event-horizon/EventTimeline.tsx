
"use client";

import { useMemo, useState, useRef, useCallback } from "react";
import { format } from "date-fns";
import type { LogEntry, EventLevel } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info, AlertTriangle, XCircle, AlertOctagon, FileText, Bug, Bell, ShieldAlert, Siren, ZoomIn, ZoomOut, Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";


interface EventTimelineProps {
  entries: LogEntry[];
  allEntries: LogEntry[];
}

const levelConfig: Record<EventLevel, { icon: React.ElementType, color: string }> = {
    'Information': { icon: Info, color: 'text-blue-400' },
    'Warning': { icon: AlertTriangle, color: 'text-yellow-400' },
    'Error': { icon: XCircle, color: 'text-red-500' },
    'Critical': { icon: AlertOctagon, color: 'text-red-600' },
    'Verbose': { icon: FileText, color: 'text-gray-500' },
    'Debug': { icon: Bug, color: 'text-purple-400' },
    'Notice': { icon: Bell, color: 'text-green-400' },
    'Emergency': { icon: Siren, color: 'text-orange-500' },
    'Alert': { icon: ShieldAlert, color: 'text-pink-500' },
};

const MAX_VERTICAL_JITTER = 250; // Constant max vertical spread

// Simple pseudo-random generator to have deterministic jitter based on entry ID
const pseudoRandom = (seed: number) => {
    let x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
};

export function EventTimeline({ entries, allEntries }: EventTimelineProps) {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);
  const [horizontalJitter, setHorizontalJitter] = useState(20); // Slider controls horizontal jitter

  const { minTime, maxTime } = useMemo(() => {
    if (allEntries.length === 0) {
      return { minTime: 0, maxTime: 0 };
    }
    const timestamps = allEntries.map(e => new Date(e.timestamp).getTime());
    return {
      minTime: Math.min(...timestamps),
      maxTime: Math.max(...timestamps),
    };
  }, [allEntries]);

  const timeRange = maxTime - minTime;
  
  const getPosition = (timestamp: Date) => {
    if (timeRange === 0) return 50;
    return ((new Date(timestamp).getTime() - minTime) / timeRange) * 100;
  };
  
  const handleWheel = useCallback((event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const zoomFactor = event.deltaY < 0 ? 1.2 : 1 / 1.2;
    setZoomLevel(prev => Math.max(1, Math.min(prev * zoomFactor, 100)));
  }, []);

  const handleMouseDown = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    setIsPanning(true);
    if(timelineRef.current) {
        timelineRef.current.style.cursor = 'grabbing';
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
     if(timelineRef.current) {
        timelineRef.current.style.cursor = 'grab';
    }
  }, []);

  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (isPanning && timelineRef.current) {
      timelineRef.current.scrollLeft -= event.movementX;
    }
  }, [isPanning]);

  const handleMouseLeave = useCallback(() => {
    setIsPanning(false);
     if(timelineRef.current) {
        timelineRef.current.style.cursor = 'grab';
    }
  }, []);

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
    <Card className="h-[600px] bg-card/50 flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">Event Timeline</CardTitle>
            <CardDescription>
                Visual representation of events over time. Pan and zoom for details.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setZoomLevel(p => Math.max(1, p / 1.2))}><ZoomOut className="w-4 h-4" /></Button>
            <Button variant="outline" size="sm" onClick={() => setZoomLevel(p => Math.min(100, p * 1.2))}><ZoomIn className="w-4 h-4" /></Button>
            <Button variant="outline" size="sm" onClick={() => setZoomLevel(1)}><Search className="w-4 h-4 mr-2" />Reset</Button>
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="outline" size="sm"><SlidersHorizontal className="w-4 h-4" /></Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-4">
                    <div className="grid gap-4">
                        <div className="space-y-2">
                           <h4 className="font-medium leading-none">Jitter Control</h4>
                           <p className="text-sm text-muted-foreground">
                             Adjust horizontal spread of events.
                           </p>
                        </div>
                        <div className="grid gap-2">
                            <div className="grid grid-cols-3 items-center gap-4">
                                <Label htmlFor="jitter">Horizontal</Label>
                                <Slider
                                    id="jitter"
                                    min={0}
                                    max={100}
                                    step={1}
                                    value={[horizontalJitter]}
                                    onValueChange={(value) => setHorizontalJitter(value[0])}
                                    className="col-span-2"
                                />
                            </div>
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4 pb-8 flex-grow overflow-hidden">
        <TooltipProvider>
            <div 
              ref={timelineRef}
              className="w-full h-full overflow-auto relative cursor-grab"
              onWheel={handleWheel}
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
                <div 
                    className="relative h-full"
                    style={{ width: `${100 * zoomLevel}%` }}
                >
                    <div className="absolute top-1/2 left-0 w-full h-0.5 bg-secondary -translate-y-1/2" />
                    
                    {entries.map((entry) => {
                        const config = levelConfig[entry.level] || levelConfig['Information'];
                        const Icon = config.icon;
                        const color = config.color;
                        const position = getPosition(entry.timestamp);
                        
                        const verticalJitter = (pseudoRandom(entry.id) - 0.5) * MAX_VERTICAL_JITTER;
                        const horizontalJitterOffset = (pseudoRandom(entry.id * 3) - 0.5) * horizontalJitter;

                        return (
                            <Tooltip key={entry.id} delayDuration={100}>
                                <TooltipTrigger asChild>
                                    <div 
                                        className="absolute top-1/2 -translate-x-1/2 cursor-pointer"
                                        style={{ 
                                            left: `${position}%`,
                                            transform: `translate(calc(-50% + ${horizontalJitterOffset}px), calc(-50% + ${verticalJitter}px))`,
                                        }}
                                    >
                                        <Icon className={`w-6 h-6 ${color} transition-transform duration-200 hover:scale-150 hover:drop-shadow-[0_0_8px]`} style={{'--tw-drop-shadow-color': 'hsl(var(--primary))'} as React.CSSProperties}/>
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent className="bg-popover text-popover-foreground border-border">
                                    <div className="font-bold">{entry.level}</div>
                                    <div className="text-sm text-muted-foreground">{format(new Date(entry.timestamp), "MMM d, yyyy, HH:mm:ss")}</div>
                                    <p className="max-w-xs text-wrap mt-1">{entry.message}</p>
                                </TooltipContent>
                            </Tooltip>
                        )
                    })}
                    
                     <div className="absolute top-full text-xs text-muted-foreground left-0">{minTime ? format(new Date(minTime), "HH:mm") : ''}</div>
                     <div className="absolute top-full text-xs text-muted-foreground right-0">{maxTime ? format(new Date(maxTime), "HH:mm") : ''}</div>
                </div>
            </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
