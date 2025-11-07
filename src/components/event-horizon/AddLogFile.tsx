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
  onLogsParsed: (logs: Omit<LogEntry, 'id'>[]) => void;
  onError: (errorMessage: string) => void;
  parser: (fileContent: string, filename: string) => Promise<Omit<LogEntry, 'id'>[]>;
}

export function AddLogFile({ onLogsParsed, onError, parser }: AddLogFileProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleLogs = (logs: Omit<LogEntry, 'id'>[]) => {
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
        <Button variant="ghost" size="sm">
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Log
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
