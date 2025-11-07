'use server';

import { parseLogsFlow } from '@/ai/flows/parse-logs-flow';
import type { LogEntry } from './types';

/**
 * Parses a raw log file content using an AI flow.
 * @param fileContent The raw string content of the log file.
 * @returns A promise that resolves to an array of structured LogEntry objects.
 */
export async function parseLogFile(fileContent: string): Promise<LogEntry[]> {
  if (!fileContent.trim()) {
    throw new Error("The uploaded file is empty or contains only whitespace.");
  }

  try {
    const result = await parseLogsFlow(fileContent);

    if (!result || !Array.isArray(result.logs)) {
      throw new Error("AI parsing returned an invalid format.");
    }

    // Ensure timestamps are valid Date objects and add a unique ID
    return result.logs.map((log, index) => {
      const timestamp = new Date(log.timestamp);
      if (isNaN(timestamp.getTime())) {
        // If the AI returns an invalid date, we can either skip it or use a default.
        // Here, we'll use the current time as a fallback.
        console.warn(`Invalid timestamp format for log entry: ${log.timestamp}. Using current time.`);
        return {
          ...log,
          id: index,
          timestamp: new Date(),
        };
      }
      return {
        ...log,
        id: index,
        timestamp: timestamp,
      };
    });
  } catch (error) {
    console.error("Error in AI log parsing flow:", error);
    if (error instanceof Error) {
        throw new Error(`The AI failed to parse the log file: ${error.message}`);
    }
    throw new Error("The AI failed to parse the log file. Please check the file format and content.");
  }
}
