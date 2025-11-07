'use server';
/**
 * @fileOverview An AI flow for parsing raw log files into a structured format.
 * 
 * - parseLogsFlow - A function that takes a string of log data and returns structured log entries.
 * - LogFileSchema - The Zod schema for the output of the parsing flow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { LogEntry, EventLevel } from '@/lib/types';

// Define the possible values for log levels for the AI model
const ALL_LEVELS: [EventLevel, ...EventLevel[]] = ['Information', 'Warning', 'Error', 'Critical', 'Verbose', 'Debug', 'Notice', 'Emergency', 'Alert'];

const LogEntrySchema = z.object({
  timestamp: z.string().datetime({ message: "Timestamp must be a valid ISO 8601 string." }).describe('The ISO 8601 timestamp of the log entry (e.g., "2024-01-01T12:00:00.000Z").'),
  level: z.enum(ALL_LEVELS).describe('The severity level of the log entry.'),
  source: z.string().describe('The source process or component that generated the log. If not present, infer from context or use "Unknown".'),
  message: z.string().describe('The main content of the log message.'),
});

const LogFileSchema = z.object({
  logs: z.array(LogEntrySchema).describe('An array of structured log entries.'),
});

export type ParsedLogFile = z.infer<typeof LogFileSchema>;

const parsingPrompt = ai.definePrompt(
  {
    name: 'logParsingPrompt',
    input: { schema: z.string() },
    output: { schema: LogFileSchema },
    prompt: `You are an expert log file analysis agent. Your task is to parse the provided raw log file content into a structured JSON format. The log could be from any system, like Linux (syslog), Windows Event Log, or a custom application.

    Analyze each line of the log file and extract the following fields for each entry:
    - timestamp: Convert the date and time to a valid ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ). Be precise.
    - level: Determine the severity level. Map it to the closest available option: ${ALL_LEVELS.join(', ')}. If no level is present, infer it from the message content (e.g., 'fail' implies 'Error'). Default to 'Information' if unsure.
    - source: Identify the process, service, or component that generated the log. If not explicitly mentioned, you may need to infer it. Default to 'Custom' if completely unknown.
    - message: The core message of the log entry.
    
    Return the result as a single JSON object with a "logs" key containing an array of the parsed log entry objects. Ignore any lines that are not valid log entries.

    Log Content to Parse:
    \`\`\`
    {{{input}}}
    \`\`\`
    `,
  },
);

export async function parseLogsFlow(logContent: string): Promise<ParsedLogFile> {
  const { output } = await parsingPrompt(logContent);
  if (!output) {
    throw new Error("AI model returned no output.");
  }
  return output;
}
