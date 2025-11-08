
'use server';

import type { LogEntry, EventLevel } from './types';

// New function to handle block-based apt-history.log
const parseAptHistoryLog = (fileContent: string, filename: string): Omit<LogEntry, 'id'>[] => {
    const entries: Omit<LogEntry, 'id'>[] = [];
    // Regex to capture each block from Start-Date to End-Date
    const blockRegex = /Start-Date: ([\d\s:-]+)\nCommandline: ([^\n]+)\n((?:Upgrade|Install|Remove):[^\n]+(?:\n\s+.[^\n]+)*)\nEnd-Date: ([\d\s:-]+)/g;

    let match;
    while ((match = blockRegex.exec(fileContent)) !== null) {
        const [fullMatch, startDate, commandline, actions, endDate] = match;
        
        // Use the Start-Date for the timestamp
        const timestamp = new Date(startDate.trim());

        // Consolidate actions into the message
        const message = `Command: ${commandline.trim()}; Actions: ${actions.replace(/\n\s+/g, ' ').trim()}`;
        
        entries.push({
            filename,
            timestamp,
            level: 'Information', // APT actions are typically informational
            source: 'apt',
            message: message,
        });
    }

    return entries;
};


// Regex patterns for various log formats
const LOG_PATTERNS = [
    // 0. Key-Value format (like ollama logs) - check for `level=` first.
    {
        name: 'KEY_VALUE_LOG',
        regex: /time="?([^"\s]+)"?\s+level=([A-Z]+)\s+source="?([^"\s]+)"?\s+msg="([^"]+)"/,
        map: (parts: string[]): Partial<Omit<LogEntry, 'id' | 'filename'>> => ({
            timestamp: new Date(parts[1]),
            level: mapGenericLevel(parts[2]),
            source: parts[3],
            message: `${parts[4]} ${parts.input.substring(parts[0].length)}`.trim()
        })
    },
    // 1. Modern syslog format with PID (e.g., from user-provided snippet)
    {
        name: 'SYSLOG_MODERN_V2',
        regex: /^([0-9T\:\.\-\+Z]+)\s+([\w\.\-]+)\s+([\w\.\-]+(?:\[\d+\])?):\s+(.*)$/,
        map: (parts: string[]): Partial<Omit<LogEntry, 'id' | 'filename'>> => ({
            timestamp: new Date(parts[1]),
            level: inferLevelFromMessage(parts[4]),
            source: parts[3].replace(/\[\d+\]/, ''),
            message: parts[4]
        })
    },
    // 2. DPKG log format (e.g., 2025-11-03 23:04:18 startup archives unpack)
    {
        name: 'DPKG_LOG',
        regex: /^(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2})\s+(.*)$/,
        map: (parts: string[]): Partial<Omit<LogEntry, 'id' | 'filename'>> => ({
            timestamp: new Date(parts[1]),
            level: inferLevelFromMessage(parts[2]),
            source: 'dpkg',
            message: parts[2]
        })
    },
    // 3. RFC 5424 syslog format (e.g., <165>1 2003-10-11T22:14:15.003Z mymachine.example.com su - ID47 - message)
    {
        name: 'RFC_5424',
        regex: /^\<(\d+)\>1\s+([0-9T\:\.\-\+Z]+)\s+([\w\.\-]+)\s+([\w\.\-]+)\s+([\w\.\-]+)\s+([\w\.\-]+)\s+([\w\.\-]+)\s+(.*)$/,
        map: (parts: string[]): Partial<Omit<LogEntry, 'id' | 'filename'>> => ({
            timestamp: new Date(parts[2]),
            level: getLevelFromSyslogPriority(parseInt(parts[1], 10)),
            source: parts[4],
            message: parts[8]
        })
    },
    // 4. RFC 3164 syslog format (e.g., <34>Oct 11 22:14:15 mymachine su: 'su root' failed for lonvick on /dev/pts/8)
    {
        name: 'RFC_3164',
        regex: /^\<(\d+)\>([A-Za-z]{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})\s+([\w\.\-]+)\s+([^:]+):\s+(.*)$/,
        map: (parts: string[]): Partial<Omit<LogEntry, 'id' | 'filename'>> => ({
            timestamp: robustDateParse(parts[2]),
            level: getLevelFromSyslogPriority(parseInt(parts[1], 10)),
            source: parts[4].trim(),
            message: parts[5].trim()
        })
    },
    // 5. Windows Event Log CSV format (e.g., "Information","1/1/2024 12:00:00 PM","Source","EventID","TaskCategory","Message")
    // This regex is flexible and captures quoted or unquoted fields.
    {
        name: 'WINDOWS_CSV',
        regex: /^"?([^"]+)"?,"?([0-9\/\s:AMP]+)"?,"?([^"]+)"?,"?\d+"?,"?[^"]*"?,"?([^"]+)"?.*$/,
        map: (parts: string[]): Partial<Omit<LogEntry, 'id' | 'filename'>> => ({
            level: mapWindowsLevel(parts[1] as EventLevel | 'Information'),
            timestamp: new Date(parts[2]),
            source: parts[3],
            message: parts[4]
        })
    },
    // 6. Common application log format (e.g., 2024-01-01 12:00:00,123 INFO [source] message)
    {
        name: 'APP_LOG_1',
        regex: /^(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}(?:,\d{3})?)\s+([A-Z]+)\s+\[([^\]]+)\]\s+(.*)$/,
        map: (parts: string[]): Partial<Omit<LogEntry, 'id' | 'filename'>> => ({
            timestamp: new Date(parts[1].replace(',', '.')),
            level: mapGenericLevel(parts[2]),
            source: parts[3],
            message: parts[4]
        })
    },
     // 7. ISO 8601 with level and message (e.g., 2024-07-23T10:30:00.123Z [ERROR] Failed to connect to database.)
    {
        name: 'ISO_WITH_LEVEL',
        regex: /^([0-9T\:\.\-\+Z]+)\s+\[([A-Z]+)\]\s+(.*)$/,
        map: (parts: string[]): Partial<Omit<LogEntry, 'id' | 'filename'>> => ({
            timestamp: new Date(parts[1]),
            level: mapGenericLevel(parts[2]),
            source: 'Application', // Default source
            message: parts[3]
        })
    },
    // 8. Fail2Ban log format (e.g., 2025-11-03 13:29:37,861 fail2ban.server [1349]: INFO message)
    {
        name: 'FAIL2BAN_LOG',
        regex: /^(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2},\d{3})\s+([\w\.-]+)\s+\[\d+\]:\s+([A-Z]+)\s+(.*)$/,
        map: (parts: string[]): Partial<Omit<LogEntry, 'id' | 'filename'>> => ({
            timestamp: new Date(parts[1].replace(',', '.')),
            source: parts[2],
            level: mapGenericLevel(parts[3]),
            message: parts[4]
        })
    },
    // 9. cloud-init.log format (e.g., 2025-08-28 21:21:33,170 - log_util.py[DEBUG]: message)
    {
        name: 'CLOUD_INIT_LOG',
        regex: /^(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2},\d{3})\s+-\s+([\w\.\-]+)\[([A-Z]+)\]:\s+(.*)$/,
        map: (parts: string[]): Partial<Omit<LogEntry, 'id' | 'filename'>> => ({
            timestamp: new Date(parts[1].replace(',', '.')),
            source: parts[2],
            level: mapGenericLevel(parts[3]),
            message: parts[4]
        })
    },
    // 10. cloud-init-output.log format
    {
        name: 'CLOUD_INIT_OUTPUT',
        regex: /^Cloud-init v\..*? running '([^']*)' at ([\w\s,:]+\s\+\d{4})\./,
        map: (parts: string[]): Partial<Omit<LogEntry, 'id' | 'filename'>> => ({
            timestamp: new Date(parts[2]),
            level: 'Information',
            source: `cloud-init:${parts[1]}`,
            message: parts[0]
        })
    },
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
 * @param filename The name of the file being parsed.
 * @returns A promise that resolves to an array of structured LogEntry objects.
 */
export async function parseLogFile(fileContent: string, filename: string): Promise<Omit<LogEntry, 'id'>[]> {
    if (!fileContent.trim()) {
        throw new Error("The uploaded file is empty or contains only whitespace.");
    }
    
    // First, check for special multi-line formats like apt-history.log
    if (filename.includes('apt-history.log') || fileContent.includes('Start-Date:')) {
        const aptEntries = parseAptHistoryLog(fileContent, filename);
        if (aptEntries.length > 0) {
            return aptEntries;
        }
    }

    const lines = fileContent.split(/\r?\n/);
    const parsedLogs: Omit<LogEntry, 'id'>[] = [];
    
    let lastKnownTimestamp = new Date(); // Fallback timestamp
    let successfulParses = 0;

    for (const line of lines) {
        if (!line.trim()) continue;

        let entryParsed = false;
        for (const pattern of LOG_PATTERNS) {
            const match = line.match(pattern.regex);
            if (match) {
                try {
                    const partialEntry = pattern.map(match);
                    if (partialEntry.timestamp && !isNaN(partialEntry.timestamp.getTime())) {
                        lastKnownTimestamp = partialEntry.timestamp; // Update last known timestamp
                        parsedLogs.push({
                            filename,
                            timestamp: partialEntry.timestamp,
                            level: partialEntry.level || 'Information',
                            source: partialEntry.source || 'Unknown',
                            message: partialEntry.message || line,
                        });
                        entryParsed = true;
                        successfulParses++;
                        break; 
                    }
                } catch (e) {
                    // Ignore and try next pattern
                }
            }
        }
        if (!entryParsed) {
            // Fallback for lines that don't have their own timestamp
             parsedLogs.push({
                filename,
                timestamp: lastKnownTimestamp, // Use the last known good timestamp
                level: inferLevelFromMessage(line),
                source: 'Unknown',
                message: line,
            });
        }
    }

    if (successfulParses === 0) {
        // If we only have generic matches, the format is likely unsupported
        const genericMatches = parsedLogs.filter(p => p.source === 'Unknown').length;
        if(genericMatches / parsedLogs.length > 0.5) {
             throw new Error("Could not parse most entries. Please check the file format.");
        }
    }
    
    if (parsedLogs.length === 0) {
         throw new Error("Could not parse any recognizable log entries. The file might be empty or in an unsupported format.");
    }

    return parsedLogs;
}

    
