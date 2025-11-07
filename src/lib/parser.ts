'use server';

import type { LogEntry, EventLevel } from './types';

// Regex patterns for various log formats
const LOG_PATTERNS = [
    // 0. Modern syslog format with PID (e.g., from user-provided snippet)
    {
        name: 'SYSLOG_MODERN_V2',
        regex: /^([0-9T\:\.\-\+Z]+)\s+([\w\.\-]+)\s+([\w\.\-]+(?:\[\d+\])?):\s+(.*)$/,
        map: (parts: string[]): Partial<LogEntry> => ({
            timestamp: new Date(parts[1]),
            level: inferLevelFromMessage(parts[4]),
            source: parts[3].replace(/\[\d+\]/, ''),
            message: parts[4]
        })
    },
    // 1. DPKG log format (e.g., 2025-11-03 23:04:18 startup archives unpack)
    {
        name: 'DPKG_LOG',
        regex: /^(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2})\s+(.*)$/,
        map: (parts: string[]): Partial<LogEntry> => ({
            timestamp: new Date(parts[1]),
            level: inferLevelFromMessage(parts[2]),
            source: 'dpkg',
            message: parts[2]
        })
    },
    // 2. RFC 5424 syslog format (e.g., <165>1 2003-10-11T22:14:15.003Z mymachine.example.com su - ID47 - message)
    {
        name: 'RFC_5424',
        regex: /^\<(\d+)\>1\s+([0-9T\:\.\-\+Z]+)\s+([\w\.\-]+)\s+([\w\.\-]+)\s+([\w\.\-]+)\s+([\w\.\-]+)\s+([\w\.\-]+)\s+(.*)$/,
        map: (parts: string[]): Partial<LogEntry> => ({
            timestamp: new Date(parts[2]),
            level: getLevelFromSyslogPriority(parseInt(parts[1], 10)),
            source: parts[4],
            message: parts[8]
        })
    },
    // 3. RFC 3164 syslog format (e.g., <34>Oct 11 22:14:15 mymachine su: 'su root' failed for lonvick on /dev/pts/8)
    {
        name: 'RFC_3164',
        regex: /^\<(\d+)\>([A-Za-z]{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})\s+([\w\.\-]+)\s+([^:]+):\s+(.*)$/,
        map: (parts: string[]): Partial<LogEntry> => ({
            timestamp: robustDateParse(parts[2]),
            level: getLevelFromSyslogPriority(parseInt(parts[1], 10)),
            source: parts[4].trim(),
            message: parts[5].trim()
        })
    },
    // 4. Windows Event Log CSV format (e.g., "Information","1/1/2024 12:00:00 PM","Source","EventID","TaskCategory","Message")
    // This regex is flexible and captures quoted or unquoted fields.
    {
        name: 'WINDOWS_CSV',
        regex: /^"?([^"]+)"?,"?([0-9\/\s:AMP]+)"?,"?([^"]+)"?,"?\d+"?,"?[^"]*"?,"?([^"]+)"?.*$/,
        map: (parts: string[]): Partial<LogEntry> => ({
            level: mapWindowsLevel(parts[1] as EventLevel | 'Information'),
            timestamp: new Date(parts[2]),
            source: parts[3],
            message: parts[4]
        })
    },
    // 5. Common application log format (e.g., 2024-01-01 12:00:00,123 INFO [source] message)
    {
        name: 'APP_LOG_1',
        regex: /^(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}(?:,\d{3})?)\s+([A-Z]+)\s+\[([^\]]+)\]\s+(.*)$/,
        map: (parts: string[]): Partial<LogEntry> => ({
            timestamp: new Date(parts[1].replace(',', '.')),
            level: mapGenericLevel(parts[2]),
            source: parts[3],
            message: parts[4]
        })
    },
     // 6. ISO 8601 with level and message (e.g., 2024-07-23T10:30:00.123Z [ERROR] Failed to connect to database.)
    {
        name: 'ISO_WITH_LEVEL',
        regex: /^([0-9T\:\.\-\+Z]+)\s+\[([A-Z]+)\]\s+(.*)$/,
        map: (parts: string[]): Partial<LogEntry> => ({
            timestamp: new Date(parts[1]),
            level: mapGenericLevel(parts[2]),
            source: 'Application', // Default source
            message: parts[3]
        })
    },
    // 7. Generic log with no timestamp (e.g. boot.log)
    {
        name: 'GENERIC_NO_TIMESTAMP',
        regex: /^(.*)$/,
        map: (parts: string[]): Partial<LogEntry> => ({
            timestamp: new Date(), // Use current time as a fallback
            level: inferLevelFromMessage(parts[1]),
            source: 'boot',
            message: parts[1]
        })
    }
];

// Infer level from message content for logs that don't specify a level
function inferLevelFromMessage(message: string): EventLevel {
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('emergency')) return 'Emergency';
    if (lowerMessage.includes('alert')) return 'Alert';
    if (lowerMessage.includes('critical') || lowerMessage.includes('crit')) return 'Critical';
    if (lowerMessage.includes('error') || lowerMessage.includes('err') || lowerMessage.includes('fail') || lowerMessage.includes('failure')) return 'Error';
    if (lowerMessage.includes('warning') || lowerMessage.includes('warn')) return 'Warning';
    if (lowerMessage.includes('notice')) return 'Notice';
    if (lowerMessage.includes('debug')) return 'Debug';
    if (lowerMessage.includes('verbose')) return 'Verbose';
    return 'Information';
}


// Maps syslog priority codes (severity part) to our EventLevel type
function getLevelFromSyslogPriority(priority: number): EventLevel {
    const severity = priority % 8;
    switch (severity) {
        case 0: return 'Emergency';
        case 1: return 'Alert';
        case 2: return 'Critical';
        case 3: return 'Error';
        case 4: return 'Warning';
        case 5: return 'Notice';
        case 6: return 'Information';
        case 7: return 'Debug';
        default: return 'Information';
    }
}

// A more robust date parser for formats like "Oct 11 22:14:15"
function robustDateParse(dateString: string): Date {
    const now = new Date();
    const date = new Date(`${dateString} ${now.getFullYear()}`);
    // If the parsed date is in the future, it's likely from the previous year
    if (date.getTime() > now.getTime()) {
        date.setFullYear(now.getFullYear() - 1);
    }
    return date;
}

// Maps common log level strings to our EventLevel type
function mapGenericLevel(level: string): EventLevel {
    const upperLevel = level.toUpperCase();
    if (upperLevel.includes('INFO')) return 'Information';
    if (upperLevel.includes('WARN')) return 'Warning';
    if (upperLevel.includes('ERR')) return 'Error';
    if (upperLevel.includes('CRIT')) return 'Critical';
    if (upperLevel.includes('FATAL')) return 'Critical';
    if (upperLevel.includes('ALERT')) return 'Alert';
    if (upperLevel.includes('EMERG')) return 'Emergency';
    if (upperLevel.includes('DEBUG')) return 'Debug';
    if (upperLevel.includes('VERBOSE')) return 'Verbose';
    if (upperLevel.includes('NOTICE')) return 'Notice';
    return 'Information';
}

function mapWindowsLevel(level: string): EventLevel {
    const lowerLevel = level.toLowerCase();
    switch (lowerLevel) {
        case 'information': return 'Information';
        case 'warning': return 'Warning';
        case 'error': return 'Error';
        case 'critical': return 'Critical';
        case 'verbose': return 'Verbose';
        default: return 'Information';
    }
}

/**
 * Parses a raw log file content using regular expressions.
 * @param fileContent The raw string content of the log file.
 * @returns A promise that resolves to an array of structured LogEntry objects.
 */
export async function parseLogFile(fileContent: string): Promise<LogEntry[]> {
    if (!fileContent.trim()) {
        throw new Error("The uploaded file is empty or contains only whitespace.");
    }

    const lines = fileContent.split(/\r?\n/);
    const parsedLogs: LogEntry[] = [];
    let idCounter = 0;

    for (const line of lines) {
        if (!line.trim()) continue;

        let entryParsed = false;
        for (const pattern of LOG_PATTERNS) {
            const match = line.match(pattern.regex);
            if (match) {
                try {
                    const partialEntry = pattern.map(match);
                    // Crucially, verify that the timestamp is a valid date.
                    if (partialEntry.timestamp && !isNaN(partialEntry.timestamp.getTime())) {
                        parsedLogs.push({
                            id: idCounter++,
                            timestamp: partialEntry.timestamp,
                            level: partialEntry.level || 'Information',
                            source: partialEntry.source || 'Unknown',
                            message: partialEntry.message || line,
                        });
                        entryParsed = true;
                        // Found a valid match, so we can break and go to the next line.
                        break; 
                    }
                } catch (e) {
                    // This can happen if date parsing or another mapping step fails.
                    // We'll ignore the error and let the loop try the next pattern.
                }
            }
        }
    }

    if (parsedLogs.length === 0) {
        throw new Error("Could not parse any recognizable log entries. Please check the file format.");
    }

    return parsedLogs;
}
