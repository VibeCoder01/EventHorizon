"use client";

import { format } from "date-fns";
import type { LogEntry, EventLevel } from "@/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface EventTableProps {
  entries: LogEntry[];
}

const levelColors: Record<EventLevel, string> = {
    'Information': 'bg-blue-900/50 text-blue-300 border-blue-500/30',
    'Warning': 'bg-yellow-900/50 text-yellow-300 border-yellow-500/30',
    'Error': 'bg-red-900/50 text-red-300 border-red-500/30',
    'Critical': 'bg-red-700/50 text-red-200 border-red-400/30',
    'Verbose': 'bg-gray-700/50 text-gray-400 border-gray-500/30',
};

export function EventTable({ entries }: EventTableProps) {
  return (
    <Card className="bg-card/50">
      <CardHeader>
        <CardTitle>Detailed Event Log</CardTitle>
        <CardDescription>
          A list of all filtered events. Found {entries.length} {entries.length === 1 ? 'entry' : 'entries'}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] rounded-md border border-secondary">
          <Table>
            <TableHeader className="sticky top-0 bg-secondary/80 backdrop-blur-sm">
              <TableRow>
                <TableHead className="w-[120px]">Level</TableHead>
                <TableHead className="w-[200px]">Timestamp</TableHead>
                <TableHead className="w-[150px]">Source</TableHead>
                <TableHead>Message</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.length > 0 ? (
                entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <Badge variant="outline" className={`${levelColors[entry.level]} font-semibold`}>{entry.level}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono text-xs">
                      {format(entry.timestamp, "yyyy-MM-dd HH:mm:ss.SSS")}
                    </TableCell>
                    <TableCell className="font-medium">{entry.source}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{entry.message}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    No events match the current filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
