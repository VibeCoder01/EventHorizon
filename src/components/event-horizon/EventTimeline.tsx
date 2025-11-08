
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
  initialState?: { zoom: number; scroll: number };
  onStateChange: (state: { zoom: number; scroll: number }) => void;
}

const levelConfig: Record<EventLevel, { icon: React.ElementType, color: string, dotColor: string }> = {
    'Information': { icon: Info, color: 'text-blue-400', dotColor: 'bg-blue-400' },
    'Warning': { icon: AlertTriangle, color: 'text-yellow-400', dotColor: 'bg-yellow-400' },
    'Error': { icon: XCircle, color: 'text-red-500', dotColor: 'bg-red-500' },
    'Critical': { icon: AlertOctagon, color: 'text-red-600', dotColor: 'bg-red-600' },
    'Verbose': { icon: FileText, color: 'text-gray-500', dotColor: 'bg-gray-500' },
    'Debug': { icon: Bug, color: 'text-purple-400', dotColor: 'bg-purple-400' },
    'Notice': { icon: Bell, color: 'text-green-400', dotColor: 'bg-green-400' },
    'Emergency': { icon: Siren, color: 'text-orange-500', dotColor: 'bg-orange-500' },
    'Alert': { icon: ShieldAlert, color: 'text-pink-500', dotColor: 'bg-pink-500' },
};

const MAX_VERTICAL_JITTER = 450; 
const HIGH_DENSITY_THRESHOLD = 500; // Switch to dots if more than this many events are visible

const pseudoRandom = (seed: number) => {
    let x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
};

const DEBOUNCE_DELAY = 150; // ms
const MIN_ZOOM = 1;
const MAX_ZOOM = 100;
const SLIDER_RANGE = [1, 100];

// Convert a linear slider value to a logarithmic zoom level
const sliderToZoom = (value: number) => {
    const [min, max] = SLIDER_RANGE;
    const normalized = (value - min) / (max - min); // Normalize slider value to 0-1
    return MIN_ZOOM * Math.pow(MAX_ZOOM / MIN_ZOOM, normalized);
};

// Convert a logarithmic zoom level back to a linear slider value
const zoomToSlider = (zoom: number) => {
    const [min, max] = SLIDER_RANGE;
    const normalized = Math.log(zoom / MIN_ZOOM) / Math.log(MAX_ZOOM / MIN_ZOOM);
    return min + normalized * (max - min);
};

const timeIntervals = [
    { threshold: 1, unit: "millisecond", format: "HH:mm:ss.SSS" },
    { threshold: 1000, unit: "second", format: "HH:mm:ss" },
    { threshold: 1000 * 60, unit: "minute", format: "HH:mm" },
    { threshold: 1000 * 60 * 60, unit: "hour", format: "HH:mm" },
    { threshold: 1000 * 60 * 60 * 24, unit: "day", format: "MMM d" },
    { threshold: 1000 * 60 * 60 * 24 * 30, unit: "month", format: "MMM" },
    { threshold: 1000 * 60 * 60 * 24 * 365, unit: "year", format: "yyyy" },
];

const getNiceTimeInterval = (rangeMs: number, targetTicks = 10) => {
    const idealInterval = rangeMs / targetTicks;

    for (const interval of timeIntervals) {
        // Common multiples of time units (1, 2, 5, 10, 15, 30)
        const multiples = [1, 2, 5, 10, 15, 30]; 
        for (const m of multiples) {
            const currentInterval = interval.threshold * m;
            if (idealInterval < currentInterval) {
                return { interval: currentInterval, format: interval.format };
            }
        }
    }
    
    // Fallback for very small ranges
    return { interval: timeIntervals[0].threshold, format: timeIntervals[0].format };
};


export function EventTimeline({ entries, allEntries, selectedEvent, onEventSelect, initialState, onStateChange }: EventTimelineProps) {
  const [zoomLevel, setZoomLevel] = useState(initialState?.zoom ?? 1);
  const [interactiveZoom, setInteractiveZoom] = useState(zoomToSlider(initialState?.zoom ?? 1));
  const debounceTimer = useRef<NodeJS.Timeout>();
  
  const [isPanning, setIsPanning] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);
  const [horizontalJitter, setHorizontalJitter] = useState(20);
  const [selectionBox, setSelectionBox] = useState<{ startX: number; endX: number } | null>(null);
  const [visibleEntries, setVisibleEntries] = useState<LogEntry[]>([]);
  const [visibleTimeRange, setVisibleTimeRange] = useState({ start: 0, end: 0 });
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
  
  const getPosition = useCallback((timestamp: Date | number) => {
    if (timeRange === 0) return 0;
    const time = timestamp instanceof Date ? timestamp.getTime() : timestamp;
    const timePosition = ((time - minTime) / timeRange);
    
    const clientWidth = timelineRef.current?.clientWidth ?? 0;
    const totalWidth = clientWidth * zoomLevel;
    
    // We give a half-viewport padding on each side to allow first/last events to be centered
    const paddedWidth = totalWidth + clientWidth;
    
    return (timePosition * totalWidth) + (clientWidth / 2);
  }, [minTime, timeRange, zoomLevel]);

  const updateVisibleEntries = useCallback(() => {
    if (!timelineRef.current) return;
    
    const { scrollLeft, clientWidth } = timelineRef.current;
    
    // Calculate visible time range based on scroll position
    const totalWidth = clientWidth * zoomLevel;
    const startOffset = scrollLeft - (clientWidth / 2);
    const endOffset = scrollLeft + clientWidth + (clientWidth / 2);

    const startPercent = Math.max(0, startOffset / totalWidth);
    const endPercent = Math.min(1, endOffset / totalWidth);
    
    const visibleStartTime = minTime + (startPercent * timeRange);
    const visibleEndTime = minTime + (endPercent * timeRange);
    setVisibleTimeRange({ start: visibleStartTime, end: visibleEndTime });

    // Culling logic: only render entries that are within the viewport + a buffer
    const buffer = clientWidth * 0.5;
    const viewStart = scrollLeft - buffer;
    const viewEnd = scrollLeft + clientWidth + buffer;

    const visible = entries.filter(entry => {
      const position = getPosition(entry.timestamp);
      return position >= viewStart && position <= viewEnd;
    });

    setVisibleEntries(visible);

  }, [entries, getPosition, zoomLevel, minTime, timeRange]);

  const requestUpdate = useCallback(() => {
    if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
    }
    animationFrameRef.current = requestAnimationFrame(updateVisibleEntries);
  }, [updateVisibleEntries]);

  useEffect(() => {
    requestUpdate();
    
    const timelineEl = timelineRef.current;
    
    const handleScroll = () => {
      requestUpdate();
      if(timelineEl) {
        onStateChange({ zoom: zoomLevel, scroll: timelineEl.scrollLeft });
      }
    }

    if (timelineEl) {
        timelineEl.addEventListener('scroll', handleScroll, { passive: true });
        return () => {
            timelineEl.removeEventListener('scroll', handleScroll);
            if(animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }
  }, [requestUpdate, entries, zoomLevel, onStateChange]);

  const applyZoom = useCallback((newZoom: number, focusPointPercent: number) => {
    if (!timelineRef.current) return;

    const timeline = timelineRef.current;
    const oldZoom = zoomLevel;
    const oldScrollLeft = timeline.scrollLeft;
    const viewWidth = timeline.clientWidth;
    
    const pointInTimeline = oldScrollLeft + viewWidth * focusPointPercent;
    const timePercent = (pointInTimeline - viewWidth/2) / (viewWidth * oldZoom);
    
    const newScrollLeft = timePercent * (viewWidth * newZoom) - viewWidth * focusPointPercent + viewWidth/2;

    setZoomLevel(newZoom);
    onStateChange({ zoom: newZoom, scroll: newScrollLeft });
    
    requestAnimationFrame(() => {
        if (timelineRef.current) {
            timelineRef.current.scrollLeft = newScrollLeft;
        }
    });
  }, [zoomLevel, onStateChange]);
  
  useEffect(() => {
    setInteractiveZoom(zoomToSlider(initialState?.zoom ?? 1));
    setZoomLevel(initialState?.zoom ?? 1);
    if(timelineRef.current && initialState?.scroll !== undefined) {
      timelineRef.current.scrollLeft = initialState.scroll;
    }
  }, [initialState]);

  useEffect(() => {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
          const newZoom = sliderToZoom(interactiveZoom);
          if (newZoom !== zoomLevel) {
              const rect = timelineRef.current?.getBoundingClientRect();
              const focusPoint = rect ? (rect.width / 2) / rect.width : 0.5;
              applyZoom(newZoom, focusPoint); 
          }
      }, DEBOUNCE_DELAY);

      return () => clearTimeout(debounceTimer.current);
  }, [interactiveZoom, zoomLevel, applyZoom]);

  useEffect(() => {
    if (selectedEvent && timelineRef.current && timeRange > 0) {
      const newZoomLevel = Math.max(zoomLevel, 5); 
      if (newZoomLevel !== zoomLevel) {
        applyZoom(newZoomLevel, 0.5);
      }

      requestAnimationFrame(() => {
        if (timelineRef.current) {
          const position = getPosition(selectedEvent.timestamp);
          const targetScrollLeft = position - (timelineRef.current.clientWidth / 2);
          timelineRef.current.scrollTo({ left: targetScrollLeft, behavior: 'smooth' });
        }
      });
    }
  }, [selectedEvent, getPosition, zoomLevel, timeRange, applyZoom]);
  
  const handleWheel = useCallback((event: React.WheelEvent<HTMLDivElement>) => {
    if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        const zoomFactor = event.deltaY < 0 ? 1.2 : 1 / 1.2;
        const newZoom = Math.max(MIN_ZOOM, Math.min(zoomLevel * zoomFactor, MAX_ZOOM));

        if (timelineRef.current) {
            const rect = timelineRef.current.getBoundingClientRect();
            const focusPercent = (event.clientX - rect.left) / rect.width;
            applyZoom(newZoom, focusPercent);
            setInteractiveZoom(zoomToSlider(newZoom));
        }
    } else {
        if (timelineRef.current) {
            timelineRef.current.scrollLeft += event.deltaY;
        }
    }
  }, [zoomLevel, applyZoom]);

  const handleMouseDown = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
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
        const selectionWidth = endX - startX;

        if (selectionWidth > 10) { 
            const currentScrollLeft = timelineRef.current.scrollLeft;
            const clientWidth = timelineRef.current.clientWidth;
            const totalWidth = clientWidth * zoomLevel;

            const startPercent = (currentScrollLeft + startX - clientWidth/2) / totalWidth;
            
            const newZoom = Math.min(MAX_ZOOM, zoomLevel * (rect.width / selectionWidth));
            const newScroll = startPercent * (clientWidth * newZoom);
            
            setZoomLevel(newZoom);
            setInteractiveZoom(zoomToSlider(newZoom));
            onStateChange({ zoom: newZoom, scroll: newScroll });


            requestAnimationFrame(() => {
                if (timelineRef.current) {
                    timelineRef.current.scrollLeft = newScroll;
                }
            });
        }
    }
    
    setIsPanning(false);
    setSelectionBox(null);
     if(timelineRef.current) {
        timelineRef.current.style.cursor = 'grab';
    }
  }, [selectionBox, zoomLevel, onStateChange]);

  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (selectionBox) {
        setSelectionBox({ ...selectionBox, endX: event.clientX });
        return; // Don't pan while selecting
    }
    if (isPanning && timelineRef.current) {
        const timeline = timelineRef.current;
        const newScrollLeft = timeline.scrollLeft - event.movementX;
        
        // Enforce boundaries
        const maxScrollLeft = timeline.scrollWidth - timeline.clientWidth;
        timeline.scrollLeft = Math.max(0, Math.min(newScrollLeft, maxScrollLeft));
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
    const newZoom = Math.min(MAX_ZOOM, zoomLevel * 2);
    const rect = timelineRef.current.getBoundingClientRect();
    const focusPercent = (event.clientX - rect.left) / rect.width;
    applyZoom(newZoom, focusPercent);
    setInteractiveZoom(zoomToSlider(newZoom));
  }, [zoomLevel, applyZoom]);
  
  const handleResetZoom = () => {
    applyZoom(MIN_ZOOM, 0.5);
    setInteractiveZoom(zoomToSlider(MIN_ZOOM));
  };

  const timeTicks = useMemo(() => {
    if (!timeRange || visibleTimeRange.start === 0 || !timelineRef.current) return [];
    
    const visibleRangeMs = visibleTimeRange.end - visibleTimeRange.start;
    if (visibleRangeMs <= 0) return [];
    
    const { interval, format: tickFormat } = getNiceTimeInterval(visibleRangeMs, 10);
    
    const ticks = [];
    // Add a buffer to the start time to catch ticks that are just off-screen
    const startTime = visibleTimeRange.start - interval;
    let tickTime = Math.floor(startTime / interval) * interval;
    const minorInterval = interval / 5;
    
    // Add buffer to the end time
    const endTime = visibleTimeRange.end + interval;

    while (tickTime < endTime) {
        
        for(let i = 1; i < 5; i++) {
            const minorTickTime = tickTime + (minorInterval * i);
            if (minorTickTime < endTime && minorTickTime > startTime) {
                 ticks.push({
                    time: minorTickTime,
                    label: null,
                    isMajor: false
                });
            }
        }
        
        ticks.push({
            time: tickTime,
            label: format(new Date(tickTime), tickFormat),
            isMajor: true,
        });
        
        tickTime += interval;
    }
    return ticks.filter(t => t.time >= startTime && t.time <= endTime);
  }, [visibleTimeRange, timeRange]);

  if (allEntries.length === 0) {
    return (
        <Card className="h-full bg-card/50 flex items-center justify-center">
            <CardContent className="pt-6">
                <p className="text-muted-foreground">No data to display on timeline.</p>
            </CardContent>
        </Card>
    );
  }

  const formatTimestamp = (ts: number) => {
    if (ts === 0) return '';
    const date = new Date(ts);
    const dayDiff = (maxTime - minTime) / (1000 * 60 * 60 * 24);
    
    if (dayDiff > 2) {
      return format(date, "MMM d, HH:mm:ss");
    }
    return format(date, "HH:mm:ss.SSS");
  };

  const isHighDensity = visibleEntries.length > HIGH_DENSITY_THRESHOLD;

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
                  min={SLIDER_RANGE[0]}
                  max={SLIDER_RANGE[1]}
                  step={0.1}
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
      <CardContent className="pt-4 pb-8 flex-grow overflow-hidden relative">
        <TooltipProvider>
            <div 
              ref={timelineRef}
              className="w-full h-full relative cursor-grab overflow-x-auto"
              onWheel={handleWheel}
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              onDoubleClick={handleDoubleClick}
            >
                <div 
                    className="relative h-full"
                    style={{ 
                      width: timelineRef.current ? `${(timelineRef.current.clientWidth * zoomLevel) + timelineRef.current.clientWidth}px` : '200%',
                    }}
                >
                    {/* Vertical Grid Lines */}
                    {timeTicks.map(tick => (
                        <div 
                            key={`grid-${tick.time}`} 
                            className="absolute top-0 bottom-0"
                            style={{ left: `${getPosition(tick.time)}px`}}
                        >
                            <div className={cn("w-px h-full", tick.isMajor ? "bg-primary/20" : "bg-primary/10")}></div>
                        </div>
                    ))}

                    <div className="absolute top-1/2 left-0 w-full h-0.5 bg-secondary/50 -translate-y-1/2" />

                    {selectionBox && timelineRef.current && (
                        <div
                            className="absolute top-0 h-full bg-primary/20 border-2 border-primary"
                            style={{
                                left: `${timelineRef.current.scrollLeft + Math.min(selectionBox.startX, selectionBox.endX) - timelineRef.current.getBoundingClientRect().left}px`,
                                width: `${Math.abs(selectionBox.endX - selectionBox.startX)}px`,
                            }}
                        />
                    )}
                    
                    {visibleEntries.map((entry) => {
                        const config = levelConfig[entry.level] || levelConfig['Information'];
                        const Icon = config.icon;
                        const color = config.color;
                        const dotColor = config.dotColor;
                        const position = getPosition(entry.timestamp);
                        const isSelected = selectedEvent?.id === entry.id;
                        
                        const verticalJitter = (pseudoRandom(entry.id) - 0.5) * MAX_VERTICAL_JITTER;
                        const horizontalJitterOffset = (pseudoRandom(entry.id * 3) - 0.5) * horizontalJitter;

                        const style = { 
                            left: `${position}px`,
                            transform: `translate(calc(-50% + ${horizontalJitterOffset}px), calc(-50% + ${verticalJitter}px))`,
                            zIndex: isSelected ? 10 : 1,
                        };

                        if (isHighDensity) {
                            return (
                                <div
                                    key={entry.id}
                                    data-event-id={entry.id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onEventSelect(isSelected ? null : entry.id);
                                    }}
                                    className="absolute top-1/2 cursor-pointer"
                                    style={style}
                                >
                                    <div className={cn(
                                        `rounded-full ${dotColor}`, {
                                            "ring-2 ring-offset-2 ring-offset-background ring-primary": isSelected,
                                        }
                                    )} style={{ width: '2px', height: '2px' }}/>
                                </div>
                            );
                        }

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
                                        style={style}
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

                    <div className="absolute bottom-0 left-0 w-full h-8">
                        {timeTicks.map(tick => (
                             <div key={tick.time} className="absolute h-full top-0" style={{ left: `${getPosition(tick.time)}px`}}>
                                <div className={cn("w-px bg-primary/20", tick.isMajor ? "h-3" : "h-2")}></div>
                                {tick.isMajor && tick.label && (
                                    <div className="absolute top-4 -translate-x-1/2 text-xs text-muted-foreground">
                                        {tick.label}
                                    </div>
                                )}
                            </div>
                         ))}
                    </div>
                </div>
            </div>
        </TooltipProvider>
        <div className="absolute bottom-0 left-6 text-xs text-muted-foreground font-mono">{formatTimestamp(visibleTimeRange.start)}</div>
        <div className="absolute bottom-0 right-6 text-xs text-muted-foreground font-mono text-right">{formatTimestamp(visibleTimeRange.end)}</div>
      </CardContent>
    </Card>
  );
}
