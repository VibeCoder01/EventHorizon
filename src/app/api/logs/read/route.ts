import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import type { LogEntry } from '@/lib/types';

export async function GET() {
  const logFilePath = path.join(os.tmpdir(), 'app-events.log');

  try {
    const data = await fs.readFile(logFilePath, 'utf-8');
    
    // Split by newline and filter out any empty lines
    const lines = data.split('\n').filter(line => line.trim() !== '');
    
    // Parse each line as a JSON object
    const logEntries: LogEntry[] = lines.map(line => JSON.parse(line));
    
    return NextResponse.json(logEntries);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return NextResponse.json({ message: 'Log file not found. Please generate logs first.' }, { status: 404 });
    }
    console.error('Failed to read logs:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: 'Failed to read logs', error: errorMessage }, { status: 500 });
  }
}
