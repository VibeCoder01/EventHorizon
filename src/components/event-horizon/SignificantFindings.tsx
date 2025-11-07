"use client";

import { useMemo } from "react";
import type { LogEntry } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, XCircle, FileClock } from "lucide-react";

interface SignificantFindingsProps {
  entries: LogEntry[];
}

export function SignificantFindings({ entries }: SignificantFindingsProps) {
  const stats = useMemo(() => {
    if (entries.length === 0) {
      return { errors: 0, warnings: 0, total: 0 };
    }
    return {
      errors: entries.filter(e => e.level === 'Error' || e.level === 'Critical').length,
      warnings: entries.filter(e => e.level === 'Warning').length,
      total: entries.length,
    };
  }, [entries]);

  return (
    <div>
        <h2 className="text-xl font-bold tracking-tight mb-4">Significant Findings</h2>
        <div className="grid gap-4 md:grid-cols-3">
            <Card className="bg-card/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                    Total Events
                    </CardTitle>
                    <FileClock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.total.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">
                    events analyzed
                    </p>
                </CardContent>
            </Card>
            <Card className="bg-card/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-yellow-400">
                    Warnings
                    </CardTitle>
                    <AlertTriangle className="h-4 w-4 text-yellow-400" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.warnings.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">
                    potential issues detected
                    </p>
                </CardContent>
            </Card>
            <Card className="bg-card/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-red-500">
                    Errors & Critical
                    </CardTitle>
                    <XCircle className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.errors.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">
                    require attention
                    </p>
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
