# Event Horizon - Log Analysis Tool

Event Horizon is a powerful, interactive log analysis tool designed to help you visualize and explore complex log files. Upload one or more log files, and Event Horizon provides an interactive timeline and detailed event table to help you identify patterns, correlate events, and diagnose issues.

## Features

- **Interactive Timeline:** Visualize log entries over time. Pan (click & drag), zoom (Ctrl/Cmd + mouse wheel, or use the slider), and double-click to focus on a specific point in time. Shift+drag to create a selection box to zoom into a specific region.
- **Detailed Event Table:** View all log entries in a filterable, sortable table. Found entries are counted and displayed.
- **Dynamic Filtering:** Filter events by log level (Error, Warning, Info, etc.) and source. The availability of other filters dynamically updates based on your selections to guide you toward meaningful results.
- **Multi-File Support:** Upload and analyze multiple log files simultaneously. Sources are automatically grouped by filename in the filter panel for easy identification.
- **Log Parsing:** Automatically parses a variety of common log formats. Unrecognized lines are ingested with a generic 'Information' level and the timestamp of the previous valid entry.
- **Significant Findings:** Get a quick, at-a-glance overview of the total number of events, warnings, and errors across all loaded files.
- **Click-to-Focus:** Click an event in the table to immediately center it in the timeline, making it easy to see surrounding activity.

## Getting Started

1.  Run the application.
2.  Drag and drop a log file onto the upload area, or click to browse.
3.  To add more files, click the "Add Log" button in the "Filter Events" panel.
4.  Use the filter controls on the left to narrow down events. Checkboxes for filters that will not produce results with the current selection are greyed out but still selectable.
5.  Explore the timeline to identify patterns and anomalies.
6.  Click on any row in the "Detailed Event Log" table to highlight it and automatically navigate to it on the timeline.

## Supported Log Formats

Event Horizon is designed to be flexible and can parse many common text-based log formats out-of-the-box, including:

- **Syslog (RFC 5424 and RFC 3164):** Standard formats for system messages on Linux and other UNIX-like systems.
- **Application Logs:** Common formats like `TIMESTAMP LEVEL [Source] Message`.
- **Windows Event Viewer (CSV):** Logs exported from the Windows Event Viewer as `.csv` files.
- **fail2ban:** `fail2ban.log` files with their specific format.
- **cloud-init:** Both `cloud-init.log` and `cloud-init-output.log` files.
- **dpkg:** `dpkg.log` files for Debian package management events.
- **apt-history:** `apt-history.log` files, with support for their multi-line, block-based format.
- And more. The parser attempts to match against a variety of patterns.

This project was generated in **Firebase Studio**.

---

MIT License

Copyright (c) 2024 Google

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
