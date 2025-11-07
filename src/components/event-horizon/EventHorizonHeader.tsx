"use client";

import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

interface EventHorizonHeaderProps {
  onReset?: () => void;
}

export function EventHorizonHeader({ onReset }: EventHorizonHeaderProps) {
  return (
    <header className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-primary">
          <path d="M16 28C22.6274 28 28 22.6274 28 16C28 9.37258 22.6274 4 16 4C9.37258 4 4 9.37258 4 16C4 22.6274 9.37258 28 16 28Z" stroke="currentColor" strokeWidth="2" strokeMiterlimit="10"/>
          <path d="M4 16H28" stroke="currentColor" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tighter text-foreground">
          Event Horizon
        </h1>
      </div>
      {onReset && (
        <Button variant="ghost" size="sm" onClick={onReset}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
        </Button>
      )}
    </header>
  );
}
