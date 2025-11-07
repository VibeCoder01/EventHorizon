
"use client";

import { useMemo, useState, useRef, useCallback, useEffect } from "react";
import { format } from "date-fns";
import type { LogEntry, EventLevel } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info, AlertTriangle, XCircle, AlertOctagon, FileText, Bug, Bell, ShieldAlert, Siren, ZoomIn, ZoomOut, Search, SlidersHorizontal, LocateFixed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";


interface EventTimelineProps {
  entries: LogEntry[];
  allEntries: LogEntry[];
  selectedEvent: LogEntry | null;
  onEventSelect: (eventId: number | null) => void;
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

const MAX_VERTICAL_JITTER = 250; 

const pseudoRandom = (seed: number) => {
    let x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
};

const DEBOUNCE_DELAY = 150; // ms

export function EventTimeline({ entries, allEntries, selectedEvent, onEventSelect }: EventTimelineProps) {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [interactiveZoom, setInteractiveZoom] = useState(1);
  const debounceTimer = useRef<NodeJS.Timeout>();
  
  const [isPanning, setIsPanning] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);
  const [horizontalJitter, setHorizontalJitter] = useState(20);
  const [selectionBox, setSelectionBox] = useState<{ startX: number; endX: number } | null>(null);
  const [zoomFocusPoint, setZoomFocusPoint] = useState(0.5); // 0.5 is the center
  const [visibleEntries, setVisibleEntries] = useState<LogEntry[]>([]);
  const animationFrameRef = useRef<number>();

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
  
  const getPosition = useCallback((timestamp: Date) => {
    if (timeRange === 0) return 50;
    return ((new Date(timestamp).getTime() - minTime) / timeRange) * 100;
  }, [minTime, timeRange]);

  const updateVisibleEntries = useCallback(() => {
    if (!timelineRef.current) return;
    
    const { scrollLeft, clientWidth } = timelineRef.current;
    const timelineWidth = clientWidth * zoomLevel;

    const buffer = clientWidth * 0.5;
    const viewStart = scrollLeft - buffer;
    const viewEnd = scrollLeft + clientWidth + buffer;

    const startPercent = (viewStart / timelineWidth) * 100;
    const endPercent = (viewEnd / timelineWidth) * 100;

    const visible = entries.filter(entry => {
      const position = getPosition(entry.timestamp);
      return position >= startPercent && position <= endPercent;
    });

    setVisibleEntries(visible);

  }, [entries, getPosition, zoomLevel]);

  const requestUpdate = useCallback(() => {
    if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
    }
    animationFrameRef.current = requestAnimationFrame(updateVisibleEntries);
  }, [updateVisibleEntries]);

  useEffect(() => {
    requestUpdate();
    
    const timelineEl = timelineRef.current;
    if (timelineEl) {
        timelineEl.addEventListener('scroll', requestUpdate, { passive: true });
        return () => {
            timelineEl.removeEventListener('scroll', requestUpdate);
            if(animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }
  }, [requestUpdate, entries, zoomLevel]);

  const applyZoom = useCallback((newZoom: number, focusPointPercent: number) => {
    if (!timelineRef.current) return;

    const timeline = timelineRef.current;
    const oldZoom = zoomLevel;
    const oldScrollLeft = timeline.scrollLeft;
    const viewWidth = timeline.clientWidth;
    
    const pointInTimeline = oldScrollLeft + viewWidth * focusPointPercent;
    const timePercent = pointInTimeline / (viewWidth * oldZoom);
    
    const newScrollLeft = timePercent * (viewWidth * newZoom) - viewWidth * focusPointPercent;

    setZoomLevel(newZoom);
    
    requestAnimationFrame(() => {
        if (timelineRef.current) {
            timelineRef.current.scrollLeft = newScrollLeft;
        }
    });
  }, [zoomLevel]);
  
  useEffect(() => {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
          if (interactiveZoom !== zoomLevel) {
              applyZoom(interactiveZoom, zoomFocusPoint);
          }
      }, DEBOUNCE_DELAY);

      return () => clearTimeout(debounceTimer.current);
  }, [interactiveZoom, zoomLevel, zoomFocusPoint, applyZoom]);

  useEffect(() => {
    if (selectedEvent && timelineRef.current && timeRange > 0) {
      const positionPercent = getPosition(selectedEvent.timestamp);
      
      const newZoomLevel = Math.max(zoomLevel, 5); 
      if (newZoomLevel !== zoomLevel) {
        setInteractiveZoom(newZoomLevel); 
      }

      requestAnimationFrame(() => {
        if (timelineRef.current) {
          const timelineWidth = timelineRef.current.scrollWidth;
          const targetScrollLeft = (positionPercent / 100) * timelineWidth - (timelineRef.current.clientWidth / 2);
          timelineRef.current.scrollTo({ left: targetScrollLeft, behavior: 'smooth' });
        }
      });
    }
  }, [selectedEvent, getPosition, zoomLevel, timeRange]);
  
  const handleWheel = useCallback((event: React.WheelEvent<HTMLDivElement>) => {
    if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        const zoomFactor = event.deltaY < 0 ? 1.2 : 1 / 1.2;
        const newZoom = Math.max(1, Math.min(zoomLevel * zoomFactor, 100));

        if (timelineRef.current) {
            const rect = timelineRef.current.getBoundingClientRect();
            const focusPercent = (event.clientX - rect.left) / rect.width;
            setZoomFocusPoint(focusPercent);
            setInteractiveZoom(newZoom); // Update interactive state
        }
    } else {
        if (timelineRef.current) {
            timelineRef.current.scrollLeft += event.deltaY;
        }
    }
  }, [zoomLevel]);

  const handleMouseDown = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (timelineRef.current) {
        const rect = timelineRef.current.getBoundingClientRect();
        setZoomFocusPoint((event.clientX - rect.left) / rect.width);
    }
    
    if (event.shiftKey) {
        setSelectionBox({ startX: event.clientX, endX: event.clientX });
        return;
    }
    if ((event.target as HTMLElement).closest('[data-event-id]')) {
      return;
    }
    
    onEventSelect(null);

    setIsPanning(true);
    if(timelineRef.current) {
        timelineRef.current.style.cursor = 'grabbing';
    }
  }, [onEventSelect]);

  const handleMouseUp = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (selectionBox && timelineRef.current) {
        const rect = timelineRef.current.getBoundingClientRect();
        const startX = Math.min(selectionBox.startX, selectionBox.endX) - rect.left;
        const endX = Math.max(selectionBox.startX, selectionBox.endX) - rect.left;

        if (Math.abs(endX - startX) > 10) { 
            const currentScrollLeft = timelineRef.current.scrollLeft;
            const totalWidth = rect.width * zoomLevel;

            const startPercent = (currentScrollLeft + startX) / totalWidth;
            const endPercent = (currentScrollLeft + endX) / totalWidth;
            
            const newZoom = Math.min(100, zoomLevel * (1 / (endPercent - startPercent)));
            const focus = startPercent + (endPercent - startPercent) / 2;

            setInteractiveZoom(newZoom);
            setZoomFocusPoint(focus);
        }
    }
    
    setIsPanning(false);
    setSelectionBox(null);
     if(timelineRef.current) {
        timelineRef.current.style.cursor = 'grab';
    }
  }, [selectionBox, zoomLevel]);

  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (selectionBox) {
        setSelectionBox({ ...selectionBox, endX: event.clientX });
    }
    if (isPanning && timelineRef.current) {
      timelineRef.current.scrollLeft -= event.movementX;
    }
  }, [isPanning, selectionBox]);

  const handleMouseLeave = useCallback(() => {
    setIsPanning(false);
    setSelectionBox(null);
     if(timelineRef.current) {
        timelineRef.current.style.cursor = 'grab';
    }
  }, []);

  const handleDoubleClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return;
    const newZoom = Math.min(100, zoomLevel * 2);
    const rect = timelineRef.current.getBoundingClientRect();
    const focusPercent = (event.clientX - rect.left) / rect.width;
    setZoomFocusPoint(focusPercent);
    setInteractiveZoom(newZoom);
  }, [zoomLevel]);
  
  const handleResetZoom = () => {
    setZoomFocusPoint(0.5);
    setInteractiveZoom(1);
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
    <Card className="h-[600px] bg-card/50 flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-center gap-4">
          <div className="flex-shrink-0">
            <CardTitle className="text-lg">Event Timeline</CardTitle>
            <CardDescription className="text-xs md:text-sm">
                Pan, Shift+Drag or Dbl-Click to zoom.
            </CardDescription>
          </div>
          <div className="flex items-center gap-4 flex-grow">
            <div className="flex items-center gap-2 flex-grow">
              <ZoomOut className="w-4 h-4 text-muted-foreground" />
              <Slider
                  aria-label="Zoom level"
                  value={[interactiveZoom]}
                  onValueChange={(value) => setInteractiveZoom(value[0])}
                  min={1}
                  max={100}
                  step={1}
                  className="w-full"
              />
              <ZoomIn className="w-4 h-4 text-muted-foreground" />
            </div>
            <Button variant="outline" size="sm" onClick={handleResetZoom}><Search className="w-4 h-4 mr-0 md:mr-2" /><span className="hidden md:inline">Reset</span></Button>
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="outline" size="icon"><SlidersHorizontal className="w-4 h-4" /></Button>
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
              onDoubleClick={handleDoubleClick}
            >
                <div 
                    className="relative h-full"
                    style={{ width: `${100 * zoomLevel}%` }}
                >
                    <div className="absolute top-1/2 left-0 w-full h-0.5 bg-secondary -translate-y-1/2" />

                    {selectionBox && timelineRef.current && (
                        <div
                            className="absolute top-0 h-full bg-primary/20 border-2 border-primary"
                            style={{
                                left: `${Math.min(selectionBox.startX, selectionBox.endX) - timelineRef.current.getBoundingClientRect().left}px`,
                                width: `${Math.abs(selectionBox.endX - selectionBox.startX)}px`,
                            }}
                        />
                    )}
                    
                    {visibleEntries.map((entry) => {
                        const config = levelConfig[entry.level] || levelConfig['Information'];
                        const Icon = config.icon;
                        const color = config.color;
                        const position = getPosition(entry.timestamp);
                        const isSelected = selectedEvent?.id === entry.id;
                        
                        const verticalJitter = (pseudoRandom(entry.id) - 0.5) * MAX_VERTICAL_JITTER;
                        const horizontalJitterOffset = (pseudoRandom(entry.id * 3) - 0.5) * horizontalJitter;

                        return (
                            <Tooltip key={entry.id} delayDuration={100}>
                                <TooltipTrigger asChild>
                                    <div 
                                        data-event-id={entry.id}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onEventSelect(isSelected ? null : entry.id);
                                        }}
                                        className="absolute top-1/2 -translate-x-1/2 cursor-pointer"
                                        style={{ 
                                            left: `${position}%`,
                                            transform: `translate(calc(-50% + ${horizontalJitterOffset}px), calc(-50% + ${verticalJitter}px))`,
                                            zIndex: isSelected ? 10 : 1,
                                        }}
                                    >
                                        <Icon className={cn(`w-6 h-6 ${color} transition-transform duration-200 hover:scale-150`, {
                                          "scale-150 drop-shadow-[0_0_12px]": isSelected
                                        })} 
                                        style={{'--tw-drop-shadow-color': 'hsl(var(--primary))'} as React.CSSProperties}/>
                                        {isSelected && <LocateFixed className="absolute -top-1 -right-1 w-4 h-4 text-primary bg-background rounded-full" />}
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
