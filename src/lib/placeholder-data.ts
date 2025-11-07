import type { LogEntry, EventLevel, EventSource } from './types';

const levels: EventLevel[] = ['Information', 'Warning', 'Error', 'Critical', 'Verbose'];
const sources: EventSource[] = ['Application', 'System', 'Security', 'Kernel', 'Auth', 'Cron'];
const messages = [
  "Service started successfully.",
  "Configuration file loaded.",
  "User authentication failed for user 'admin'.",
  "Disk space on '/dev/sda1' is critically low (95% used).",
  "Network connection timed out to server '10.0.1.5'.",
  "Application memory usage is high: 2.1GB.",
  "System update 'KB5034122' installed successfully.",
  "Failed to write to log file '/var/log/syslog'. Permission denied.",
  "Critical error in module 'Kernel.PowerManager': Unexpected shutdown.",
  "Verbose logging enabled for debugging session '8f3a-b4c1'.",
  "New user 'jdoe' created in group 'users'.",
  "Cron job 'backup-script' completed with errors.",
  "Firewall rule 'Block-Port-8080' was added.",
  "Detected potential security breach attempt from IP 192.168.1.100."
];

export const generateMockLogEntries = (count: number): LogEntry[] => {
  const entries: LogEntry[] = [];
  const now = new Date();
  
  for (let i = 0; i < count; i++) {
    const timestamp = new Date(now.getTime() - Math.random() * 1000 * 60 * 60 * 24); // within last 24 hours
    entries.push({
      id: i,
      timestamp,
      level: levels[Math.floor(Math.random() * levels.length)],
      source: sources[Math.floor(Math.random() * sources.length)],
      message: messages[Math.floor(Math.random() * messages.length)] + ` (ID: ${Math.random().toString(36).substring(2, 9)})`
    });
  }
  
  return entries.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
};
