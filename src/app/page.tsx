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

const ALL_LEVELS: EventLevel[] = ['Information', 'Warning', 'Error', 'Critical', 'Verbose', 'Debug', 'Notice', 'Emergency', 'Alert'];

export default function Home() {
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const { toast } = useToast();
  const [filters, setFilters] = useState<FilterState>({
    levels: [],
    sources: [],
  });
  
  const allSources = useMemo(() => {
    if (!logEntries.length) return [];
    const sources = new Set(logEntries.map(entry => entry.source));
    return Array.from(sources).sort();
  }, [logEntries]);

  const handleLogsParsed = (logs: LogEntry[]) => {
    setLogEntries(logs);
    toast({
      title: "Logs parsed successfully",
      description: `Loaded ${logs.length} log entries.`,
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
  }

  const filteredEntries = useMemo(() => {
    if (!logEntries.length) return [];
    return logEntries.filter((entry) => {
      const levelMatch = filters.levels.length === 0 || filters.levels.includes(entry.level);
      const sourceMatch = filters.sources.length === 0 || filters.sources.includes(entry.source);
      return levelMatch && sourceMatch;
    });
  }, [logEntries, filters]);

  const setFiltersCallback = useCallback((newFilters: FilterState) => {
    setFilters(newFilters);
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
                <div className="md:col-span-1">
                    <FilterControls
                        filters={filters}
                        setFilters={setFiltersCallback}
                        allLevels={ALL_LEVELS}
                        allSources={allSources}
                     />
                </div>
                <div className="md:col-span-3">
                    <EventTimeline entries={filteredEntries} allEntries={logEntries}/>
                </div>
             </div>
          </section>

          <section id="event-list">
            <EventTable entries={filteredEntries} />
          </section>

          <section id="summary">
            <SignificantFindings entries={logEntries} />
          </section>
        </div>
      )}
    </main>
  );
}
