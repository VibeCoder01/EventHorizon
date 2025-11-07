import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { generateMockLogEntries } from '@/lib/placeholder-data';

// Do not generate logs on Vercel or other read-only filesystems
if (process.env.VERCEL) {
  console.warn("Log generation is disabled on Vercel's read-only filesystem.");
}

export async function POST() {
  // In a real-world scenario, you wouldn't do this on a read-only filesystem.
  // This is for demonstration purposes.
  if (process.env.VERCEL || process.env.FIREBASE_APP_HOSTING_URL) {
    return NextResponse.json({ message: 'Log generation is disabled in this environment.' }, { status: 200 });
  }

  try {
    const logFilePath = path.join(os.tmpdir(), 'app-events.log');
    const logEntries = generateMockLogEntries(150);
    
    // Convert to JSONL format (one JSON object per line)
    const logData = logEntries.map(entry => JSON.stringify(entry)).join('\n');

    await fs.writeFile(logFilePath, logData, 'utf-8');

    return NextResponse.json({ message: 'Logs generated successfully', path: logFilePath });
  } catch (error) {
    console.error('Failed to generate logs:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: 'Failed to generate logs', error: errorMessage }, { status: 500 });
  }
}
