"use client";

import { useState } from "react";
import { LogUploader } from "./LogUploader";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { LogEntry } from "@/lib/types";

interface AddLogFileProps {
  onLogsParsed: (logs: LogEntry[]) => void;
  onError: (errorMessage: string) => void;
  parser: (fileContent: string) => Promise<LogEntry[]>;
}

export function AddLogFile({ onLogsParsed, onError, parser }: AddLogFileProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleLogs = (logs: LogEntry[]) => {
    onLogsParsed(logs);
    setIsOpen(false);
  };
  
  const handleError = (error: string) => {
    onError(error);
    setIsOpen(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <PlusCircle className="mr-2 h-4 w-4" />
          Add another log file
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>Upload Log File</DialogTitle>
          <DialogDescription>
            Drag and drop your log file here or click to browse.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <LogUploader onLogsParsed={handleLogs} onError={handleError} parser={parser} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
