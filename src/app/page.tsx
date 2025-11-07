"use client";

import { useState, useMemo, useCallback } from "react";
import type { LogEntry, FilterState, EventLevel, EventSource } from "@/lib/types";
import { EventHorizonHeader } from "@/components/event-horizon/EventHorizonHeader";
import { LogUploader } from "@/components/event-horizon/LogUploader";
import { FilterControls } from "@/components/event-horizon/FilterControls";
import { EventTimeline } from "@/components/event-horizon/EventTimeline";
import { EventTable } from "@/components/event-horizon/EventTable";
import { SignificantFindings } from "@/components/event-horizon/SignificantFindings";
import { useToast } from "@/hooks/use-toast";
import { parseLogFile } from "@/lib/parser";
import { LogSourceHints } from "@/components/event-horizon/LogSourceHints";
import { AddLogFile } from "@/components/event-horizon/AddLogFile";

const ALL_LEVELS: EventLevel[] = ['Information', 'Warning', 'Error', 'Critical', 'Verbose', 'Debug', 'Notice', 'Emergency', 'Alert'];

export default function Home() {
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const { toast } = useToast();
  const [filters, setFilters] = useState<FilterState>({
    levels: [],
    sources: [],
  });
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  
  const { availableSources, availableLevels } = useMemo(() => {
    if (!logEntries.length) return { availableSources: [], availableLevels: [] };
    const sources = new Set(logEntries.map(entry => entry.source));
    const levels = new Set(logEntries.map(entry => entry.level));
    return { 
      availableSources: Array.from(sources).sort(),
      availableLevels: Array.from(levels)
    };
  }, [logEntries]);

  const allPossibleSources = useMemo(() => {
    if (!logEntries.length) return [];
    return availableSources;
  }, [availableSources]);

  const handleLogsParsed = (newLogs: LogEntry[]) => {
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

  const filteredEntries = useMemo(() => {
    if (!logEntries.length) return [];
    return logEntries.filter((entry) => {
      const levelMatch = filters.levels.length === 0 || filters.levels.includes(entry.level);
      const sourceMatch = filters.sources.length === 0 || filters.sources.includes(entry.source);
      return levelMatch && sourceMatch;
    });
  }, [logEntries, filters]);

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
                        allSources={allPossibleSources}
                        availableLevels={availableLevels}
                        availableSources={availableSources}
                     />
                     <AddLogFile onLogsParsed={handleLogsParsed} onError={handleError} parser={parseLogFile} />
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
