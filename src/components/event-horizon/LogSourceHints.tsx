"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { FileCode, Info } from "lucide-react";

const commonLogs = [
  {
    path: "/var/log/syslog",
    name: "System Log",
    description:
      "Contains general system activity logs, from startup messages to system errors. One of the first places to check for general issues.",
  },
  {
    path: "/var/log/auth.log",
    name: "Authentication Log",
    description:
      "Tracks all authentication attempts, including successful and failed logins, sudo commands, and other security-related events.",
  },
  {
    path: "/var/log/kern.log",
    name: "Kernel Log",
    description:
      "Logs messages from the Linux kernel, including hardware, driver, and firewall issues. Essential for diagnosing hardware failures.",
  },
  {
    path: "/var/log/dmesg",
    name: "Device Driver Log",
    description:
      "Contains kernel-ring buffer messages related to device drivers. Useful for debugging hardware detection and driver problems at boot time.",
  },
];

export function LogSourceHints() {
  return (
    <div className="mt-8 max-w-2xl mx-auto">
        <h3 className="flex items-center justify-center gap-2 text-sm font-semibold text-muted-foreground mb-4">
            <Info className="w-4 h-4" />
            Not sure where to find logs? Here are some common locations on Linux:
        </h3>
        <div className="flex flex-wrap items-center justify-center gap-2">
        {commonLogs.map((log) => (
          <Popover key={log.path}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="font-mono text-xs h-8">
                <FileCode className="mr-2 h-4 w-4" />
                {log.path}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 bg-popover text-popover-foreground border-border">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <h4 className="font-semibold leading-none">{log.name}</h4>
                  <p className="text-sm text-muted-foreground">
                    {log.description}
                  </p>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        ))}
        </div>
    </div>
  );
}
