"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Upload, ServerOff } from "lucide-react";

interface LogUploaderProps {
  onLogsGenerated: () => void;
  isFirebaseHosting?: boolean;
}

export function LogUploader({ onLogsGenerated, isFirebaseHosting = false }: LogUploaderProps) {
  return (
    <Card 
      className={`border-2 border-dashed  transition-all duration-300 bg-transparent ${isFirebaseHosting ? 'border-destructive/30' : 'border-secondary hover:border-primary hover:bg-secondary/20 cursor-pointer shadow-lg hover:shadow-primary/20'}`}
      onClick={!isFirebaseHosting ? onLogsGenerated : undefined}
      onKeyPress={(e) => !isFirebaseHosting && (e.key === 'Enter' || e.key === ' ') && onLogsGenerated()}
      tabIndex={isFirebaseHosting ? -1 : 0}
      role={!isFirebaseHosting ? "button" : "status"}
      aria-label={isFirebaseHosting ? "Log loading disabled on this hosting environment" : "Load server logs"}
    >
      <CardContent className="p-10 md:p-16 flex flex-col items-center justify-center text-center">
        <div className={`p-4 rounded-full ${isFirebaseHosting ? 'bg-destructive/10' : 'bg-secondary'}`}>
            {isFirebaseHosting ? (
                <ServerOff className="w-12 h-12 text-destructive" />
            ) : (
                <Upload className="w-12 h-12 text-primary" />
            )}
        </div>
        <p className="mt-6 text-xl font-semibold text-foreground">
          {isFirebaseHosting ? 'Direct Log Access Unavailable' : 'Load Server Logs'}
        </p>
        <p className="mt-2 text-sm text-muted-foreground max-w-sm">
           {isFirebaseHosting 
            ? "This feature is disabled on Firebase App Hosting for security reasons. Logs can be viewed in the Google Cloud console."
            : "Click here to generate and fetch a sample log file from the server's local filesystem."
           }
        </p>
      </CardContent>
    </Card>
  );
}
