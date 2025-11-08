"use client";

import { useState, useMemo, useCallback } from "react";
import type { LogEntry, FilterState, EventLevel, EventSource, SourceGroup } from "@/lib/types";
import { EventHorizonHeader } from "@/components/event-horizon/EventHorizonHeader";
import { LogUploader } from "@/components/event-horizon/LogUploader";
import { FilterControls } from "@/components/event-horizon/FilterControls";
import { EventTimeline } from "@/components/event-horizon/EventTimeline";
import { EventTable } from "@/components/event-horizon/EventTable";
import { SignificantFindings } from "@/components/event-horizon/SignificantFindings";
import { useToast } from "@/hooks/use-toast";
import { parseLogFile } from "@/lib/parser";
import { LogSourceHints } from "@/components/event-horizon/LogSourceHints";

const ALL_LEVELS: EventLevel[] = ['Information', 'Warning', 'Error', 'Critical', 'Verbose', 'Debug', 'Notice', 'Emergency', 'Alert'];

export default function Home() {
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const { toast } = useToast();
  const [filters, setFilters] = useState<FilterState>({
    levels: [],
    sources: [],
  });
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  
  const { initialAvailableLevels, groupedSources } = useMemo(() => {
    if (!logEntries.length) return { initialAvailableLevels: [], groupedSources: [] };

    const levels = new Set(logEntries.map(entry => entry.level));
    const sourcesByFile = logEntries.reduce((acc, entry) => {
        if (!acc[entry.filename]) {
            acc[entry.filename] = new Set<EventSource>();
        }
        acc[entry.filename].add(entry.source);
        return acc;
    }, {} as Record<string, Set<EventSource>>);

    const grouped: SourceGroup[] = Object.entries(sourcesByFile).map(([filename, sourcesSet]) => ({
        filename,
        sources: Array.from(sourcesSet).sort()
    })).sort((a, b) => a.filename.localeCompare(b.filename));

    return { 
      initialAvailableLevels: Array.from(levels),
      groupedSources: grouped,
    };
  }, [logEntries]);

  const filteredEntries = useMemo(() => {
    if (!logEntries.length) return [];
    return logEntries.filter((entry) => {
      const levelMatch = filters.levels.length === 0 || filters.levels.includes(entry.level);
      const sourceMatch = filters.sources.length === 0 || filters.sources.includes(entry.source);
      return levelMatch && sourceMatch;
    });
  }, [logEntries, filters]);

  const { availableLevels, availableSources } = useMemo(() => {
    const levelsInFiltered = new Set<EventLevel>();
    const sourcesInFiltered = new Set<EventSource>();

    // If no filters are active, all initially available options are available.
    if (filters.levels.length === 0 && filters.sources.length === 0) {
      initialAvailableLevels.forEach(l => levelsInFiltered.add(l));
      groupedSources.flatMap(g => g.sources).forEach(s => sourcesInFiltered.add(s));
    } else {
      // Determine available sources based on selected levels
      const levelFilteredEntries = filters.levels.length > 0
        ? logEntries.filter(entry => filters.levels.includes(entry.level))
        : logEntries;

      levelFilteredEntries.forEach(entry => sourcesInFiltered.add(entry.source));

      // Determine available levels based on selected sources
      const sourceFilteredEntries = filters.sources.length > 0
        ? logEntries.filter(entry => filters.sources.includes(entry.source))
        : logEntries;

      sourceFilteredEntries.forEach(entry => levelsInFiltered.add(entry.level));

      // If both filters are active, the available options are the intersection
      if (filters.levels.length > 0 && filters.sources.length > 0) {
          const finalAvailableLevels = new Set<EventLevel>();
          const finalAvailableSources = new Set<EventSource>();

          filteredEntries.forEach(entry => {
              finalAvailableLevels.add(entry.level);
              finalAvailableSources.add(entry.source);
          });
          return {
              availableLevels: Array.from(finalAvailableLevels),
              availableSources: Array.from(finalAvailableSources)
          };
      }
    }
    
    return {
      availableLevels: filters.sources.length > 0 ? Array.from(levelsInFiltered) : initialAvailableLevels,
      availableSources: filters.levels.length > 0 ? Array.from(sourcesInFiltered) : groupedSources.flatMap(g => g.sources),
    };
  }, [filters, logEntries, initialAvailableLevels, groupedSources, filteredEntries]);

  const handleLogsParsed = (newLogs: Omit<LogEntry, 'id'>[]) => {
    const lastId = logEntries.length > 0 ? logEntries[logEntries.length - 1].id : -1;
    const logsWithUniqueIds = newLogs.map((log, index) => ({
      ...log,
      id: lastId + 1 + index,
    }));
    
    const combinedLogs = [...logEntries, ...logsWithUniqueIds].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    setLogEntries(combinedLogs);
    toast({
      title: "Logs parsed successfully",
      description: `Added ${newLogs.length} log entries. Total: ${combinedLogs.length}.`,
    });
  };
  
  const handleError = (errorMessage: string) => {
    toast({
      title: "Error parsing log file",
      description: errorMessage,
      variant: "destructive",
    });
  };

  const handleReset = () => {
    setLogEntries([]);
    setFilters({ levels: [], sources: [] });
    setSelectedEventId(null);
  }

  const selectedEvent = useMemo(() => {
    if (selectedEventId === null) return null;
    return logEntries.find(e => e.id === selectedEventId) ?? null;
  }, [selectedEventId, logEntries]);

  const setFiltersCallback = useCallback((newFilters: FilterState) => {
    setFilters(newFilters);
  }, []);

  const handleEventSelect = useCallback((eventId: number | null) => {
    setSelectedEventId(eventId);
  }, []);
  
  const onLogsParsedCallback = useCallback((logs: Omit<LogEntry, 'id'>[]) => {
    handleLogsParsed(logs);
  }, [logEntries]);

  const onErrorCallback = useCallback((error: string) => {
    handleError(error);
  }, []);


  return (
    <main className="container mx-auto px-4 py-8">
      <EventHorizonHeader onReset={logEntries.length > 0 ? handleReset : undefined} />

      {logEntries.length === 0 ? (
        <div className="mt-16 text-center">
          <LogUploader onLogsParsed={handleLogsParsed} onError={handleError} parser={parseLogFile} />
          <LogSourceHints />
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-8">
          <section id="timeline" className="space-y-6">
             <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="md:col-span-1 space-y-4">
                    <FilterControls
                        filters={filters}
                        setFilters={setFiltersCallback}
                        allLevels={ALL_LEVELS}
                        availableLevels={availableLevels}
                        availableSources={availableSources}
                        groupedSources={groupedSources}
                        onLogsParsed={onLogsParsedCallback}
                        onError={onErrorCallback}
                     />
                </div>
                <div className="md:col-span-3">
                    <EventTimeline 
                        entries={filteredEntries} 
                        allEntries={logEntries}
                        selectedEvent={selectedEvent}
                        onEventSelect={handleEventSelect}
                    />
                </div>
             </div>
          </section>

          <section id="event-list">
            <EventTable 
                entries={filteredEntries} 
                selectedEventId={selectedEventId}
                onEventSelect={handleEventSelect}
            />
          </section>

          <section id="summary">
            <SignificantFindings entries={logEntries} />
          </section>
        </div>
      )}
    </main>
  );
}
