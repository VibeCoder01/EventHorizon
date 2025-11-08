export type EventLevel = 'Information' | 'Warning' | 'Error' | 'Critical' | 'Verbose' | 'Debug' | 'Notice' | 'Emergency' | 'Alert';
export type EventSource = string; // Allow for dynamic sources from logs

export interface LogEntry {
  id: number;
  timestamp: Date;
  level: EventLevel;
  source: string;
  message: string;
  filename: string;
}

export interface FilterState {
  levels: EventLevel[];
  sources: EventSource[];
}

export type SourceGroup = {
  filename: string;
  sources: EventSource[];
};

export interface SessionState {
  logEntries: LogEntry[];
  filters: FilterState;
  timelineState: {
    zoom: number;
    scroll: number;
  }
}
