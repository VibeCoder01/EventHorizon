"use client";

import { useState, useMemo } from "react";
import type { LogEntry, FilterState, EventLevel, EventSource } from "@/lib/types";
import { generateMockLogEntries } from "@/lib/placeholder-data";
import { EventHorizonHeader } from "@/components/event-horizon/EventHorizonHeader";
import { LogUploader } from "@/components/event-horizon/LogUploader";
import { FilterControls } from "@/components/event-horizon/FilterControls";
import { EventTimeline } from "@/components/event-horizon/EventTimeline";
import { EventTable } from "@/components/event-horizon/EventTable";
import { SignificantFindings } from "@/components/event-horizon/SignificantFindings";

const ALL_LEVELS: EventLevel[] = ['Information', 'Warning', 'Error', 'Critical', 'Verbose'];
const ALL_SOURCES: EventSource[] = ['Application', 'System', 'Security', 'Kernel', 'Auth', 'Cron'];

export default function Home() {
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [filters, setFilters] = useState<FilterState>({
    levels: [],
    sources: [],
  });

  const handleLogsGenerated = () => {
    const newLogs = generateMockLogEntries(200);
    setLogEntries(newLogs);
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

  return (
    <main className="container mx-auto px-4 py-8">
      <EventHorizonHeader onReset={logEntries.length > 0 ? handleReset : undefined} />

      {logEntries.length === 0 ? (
        <div className="mt-16">
          <LogUploader onLogsGenerated={handleLogsGenerated} />
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-8">
          <section id="timeline" className="space-y-6">
             <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="md:col-span-1">
                    <FilterControls
                        filters={filters}
                        setFilters={setFilters}
                        allLevels={ALL_LEVELS}
                        allSources={ALL_SOURCES}
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
