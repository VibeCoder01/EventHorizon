"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Upload } from "lucide-react";

interface LogUploaderProps {
  onLogsGenerated: () => void;
}

export function LogUploader({ onLogsGenerated }: LogUploaderProps) {
  return (
    <Card 
      className="border-2 border-dashed border-secondary hover:border-primary transition-all duration-300 bg-transparent hover:bg-secondary/20 cursor-pointer shadow-lg hover:shadow-primary/20"
      onClick={onLogsGenerated}
      onKeyPress={(e) => (e.key === 'Enter' || e.key === ' ') && onLogsGenerated()}
      tabIndex={0}
      role="button"
      aria-label="Load demo event logs"
    >
      <CardContent className="p-10 md:p-16 flex flex-col items-center justify-center text-center">
        <div className="p-4 bg-secondary rounded-full">
            <Upload className="w-12 h-12 text-primary" />
        </div>
        <p className="mt-6 text-xl font-semibold text-foreground">
          Load Demo Event Logs
        </p>
        <p className="mt-2 text-sm text-muted-foreground max-w-sm">
          Click here to generate and analyze a sample set of mock system and application events. No upload required.
        </p>
      </CardContent>
    </Card>
  );
}
