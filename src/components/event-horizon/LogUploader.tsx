"use client";

import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, FileJson, Loader2 } from "lucide-react";
import type { LogEntry } from "@/lib/types";

interface LogUploaderProps {
  onLogsParsed: (logs: LogEntry[]) => void;
  onError: (errorMessage: string) => void;
}

export function LogUploader({ onLogsParsed, onError }: LogUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const parseLogFile = (file: File) => {
    setIsLoading(true);
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        if (!content) {
            throw new Error("File is empty.");
        }
        
        const lines = content.split('\n').filter(line => line.trim() !== '');
        const parsedLogs: LogEntry[] = lines.map((line, index) => {
            try {
                const log = JSON.parse(line);
                // Basic validation
                if (!log.timestamp || !log.level || !log.source || !log.message) {
                    throw new Error(`Missing required fields on line ${index + 1}.`);
                }
                return { ...log, id: log.id ?? index, timestamp: new Date(log.timestamp) };
            } catch (e) {
                throw new Error(`Invalid JSON on line ${index + 1}.`);
            }
        });

        onLogsParsed(parsedLogs.sort((a,b) => a.timestamp.getTime() - b.timestamp.getTime()));
      } catch (error) {
        const message = error instanceof Error ? error.message : "An unknown error occurred during parsing.";
        onError(message);
      } finally {
        setIsLoading(false);
      }
    };
    
    reader.onerror = () => {
        onError("Failed to read the file.");
        setIsLoading(false);
    };

    reader.readAsText(file);
  };

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'application/json' || file.name.endsWith('.log') || file.name.endsWith('.jsonl')) {
        parseLogFile(file);
      } else {
        onError("Invalid file type. Please upload a .log, .jsonl, or .json file.");
      }
      e.dataTransfer.clearData();
    }
  }, [parseLogFile, onError]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      parseLogFile(e.target.files[0]);
    }
  };

  return (
    <>
      <input 
        type="file" 
        id="log-uploader-input" 
        className="hidden"
        onChange={handleFileChange}
        accept=".log,.jsonl,application/json"
        disabled={isLoading}
      />
      <Card
        className={`border-2 border-dashed transition-all duration-300 bg-transparent cursor-pointer ${
          isDragging ? 'border-primary bg-primary/10' : 'border-secondary hover:border-primary hover:bg-secondary/20 shadow-lg hover:shadow-primary/20'
        }`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => document.getElementById('log-uploader-input')?.click()}
        onKeyPress={(e) => (e.key === 'Enter' || e.key === ' ') && document.getElementById('log-uploader-input')?.click()}
        tabIndex={0}
        role="button"
        aria-label="Upload log file"
      >
        <CardContent className="p-10 md:p-16 flex flex-col items-center justify-center text-center">
            {isLoading ? (
                <>
                    <Loader2 className="w-12 h-12 text-primary animate-spin" />
                    <p className="mt-6 text-xl font-semibold text-foreground">Analyzing Logs...</p>
                    <p className="mt-2 text-sm text-muted-foreground max-w-sm">
                        Please wait while we process your log file.
                    </p>
                </>
            ) : (
                <>
                    <div className={`p-4 rounded-full bg-secondary ${isDragging ? 'scale-110' : ''} transition-transform`}>
                        <Upload className="w-12 h-12 text-primary" />
                    </div>
                    <p className="mt-6 text-xl font-semibold text-foreground">
                        Drop your log file here
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground max-w-sm">
                        or click to browse. Supports JSONL format (.log, .jsonl).
                    </p>
                </>
            )}
        </CardContent>
      </Card>
      <div className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <FileJson className="w-4 h-4" />
        <p>Expected format: One valid JSON object per line.</p>
      </div>
    </>
  );
}
