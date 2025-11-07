export type EventLevel = 'Information' | 'Warning' | 'Error' | 'Critical' | 'Verbose';
export type EventSource = 'Application' | 'System' | 'Security' | 'Kernel' | 'Auth' | 'Cron';

export interface LogEntry {
  id: number;
  timestamp: Date;
  level: EventLevel;
  source: EventSource;
  message: string;
}

export interface FilterState {
  levels: EventLevel[];
  sources: EventSource[];
}
