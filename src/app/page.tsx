"use client";

import { useState, useMemo } from "react";
import type { LogEntry, FilterState, EventLevel, EventSource } from "@/lib/types";
import { EventHorizonHeader } from "@/components/event-horizon/EventHorizonHeader";
import { LogUploader } from "@/components/event-horizon/LogUploader";
import { FilterControls } from "@/components/event-horizon/FilterControls";
import { EventTimeline } from "@/components/event-horizon/EventTimeline";
import { EventTable } from "@/components/event-horizon/EventTable";
import { SignificantFindings } from "@/components/event-horizon/SignificantFindings";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

const ALL_LEVELS: EventLevel[] = ['Information', 'Warning', 'Error', 'Critical', 'Verbose'];
const ALL_SOURCES: EventSource[] = ['Application', 'System', 'Security', 'Kernel', 'Auth', 'Cron'];

// Check if the app is running on Firebase App Hosting
const isFirebaseHosting = process.env.NEXT_PUBLIC_FIREBASE_APP_HOSTING_URL;

export default function Home() {
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [filters, setFilters] = useState<FilterState>({
    levels: [],
    sources: [],
  });
  
  const handleLoadLogs = async () => {
    if (isFirebaseHosting) {
      toast({
        title: "Feature Not Available on Firebase Hosting",
        description: "Directly reading server logs is not supported in this environment for security reasons.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // First, generate some logs to ensure the file exists.
      await fetch('/api/logs/generate', { method: 'POST' });
      
      // Then, fetch the logs.
      const response = await fetch('/api/logs/read');
      if (!response.ok) {
        throw new Error('Failed to fetch logs');
      }
      const logs: LogEntry[] = await response.json();
      
      // Timestamps from JSON are strings, convert them to Date objects
      const parsedLogs = logs.map(log => ({ ...log, timestamp: new Date(log.timestamp)}));

      setLogEntries(parsedLogs);
    } catch (error) {
      console.error(error);
      toast({
        title: "Error loading logs",
        description: "Could not fetch server logs. See console for details.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
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
        <div className="mt-16 text-center">
            { isFirebaseHosting ? (
                 <LogUploader onLogsGenerated={handleLoadLogs} isFirebaseHosting={true} />
            ) : (
                <div className="flex flex-col items-center gap-4">
                    <p className="text-muted-foreground">
                        Click the button below to load logs from the server.
                    </p>
                    <Button onClick={handleLoadLogs} disabled={isLoading} size="lg">
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Loading...
                            </>
                        ) : (
                            "Load Server Logs"
                        )}
                    </Button>
                </div>
            )
           }
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
