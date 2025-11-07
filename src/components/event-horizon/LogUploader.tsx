"use client";

import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, FileText, Loader2, Info } from "lucide-react";
import type { LogEntry } from "@/lib/types";

interface LogUploaderProps {
  onLogsParsed: (logs: LogEntry[]) => void;
  onError: (errorMessage: string) => void;
  parser: (fileContent: string) => Promise<LogEntry[]>;
}

export function LogUploader({ onLogsParsed, onError, parser }: LogUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const processLogFile = (file: File) => {
    setIsLoading(true);
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        if (!content) {
            throw new Error("File is empty.");
        }
        const parsedLogs = await parser(content);
        onLogsParsed(parsedLogs.sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()));
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
       if (file.type.startsWith('text/') || file.name.endsWith('.log') || file.name.endsWith('.csv')) {
        processLogFile(file);
      } else {
        onError("Invalid file type. Please upload a text-based log file (.log, .txt, .csv).");
      }
      e.dataTransfer.clearData();
    }
  }, [processLogFile, onError]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processLogFile(e.target.files[0]);
    }
  };

  return (
    <>
      <input 
        type="file" 
        id="log-uploader-input" 
        className="hidden"
        onChange={handleFileChange}
        accept=".log,.txt,text/*,.csv"
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
                    <p className="mt-6 text-xl font-semibold text-foreground">Analyzing Logs with AI...</p>
                    <p className="mt-2 text-sm text-muted-foreground max-w-sm">
                        This may take a moment. The AI is parsing your log file.
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
                        or click to browse. Supports text-based logs like .log, .txt, and .csv files.
                    </p>
                </>
            )}
        </CardContent>
      </Card>
      <div className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground p-4 bg-secondary/30 rounded-lg max-w-md mx-auto">
        <Info className="w-4 h-4 shrink-0" />
        <p>To analyze Windows Event Logs, export them from Event Viewer as a .csv file.</p>
      </div>
    </>
  );
}
