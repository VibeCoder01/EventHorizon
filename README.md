# Event Horizon - Log Analysis Tool

Event Horizon is a powerful, interactive log analysis tool designed to help you visualize and explore complex log files. Upload one or more log files, and Event Horizon provides an interactive timeline and detailed event table to help you identify patterns, correlate events, and diagnose issues.

## Features

- **Interactive Timeline:** Visualize log entries over time. Pan and zoom to explore specific time ranges.
- **Detailed Event Table:** View all log entries in a filterable, sortable table.
- **Dynamic Filtering:** Filter events by log level (Error, Warning, Info, etc.) and source, with available filters updating dynamically based on your selections.
- **Multi-File Support:** Upload and analyze multiple log files simultaneously, with sources grouped by filename.
- **Log Parsing:** Automatically parses a variety of common log formats, including syslog, application logs, and Windows Event Log CSV exports.
- **Significant Findings:** Get a quick overview of the total number of events, warnings, and errors.
- **Click-to-Focus:** Click an event in the table to immediately jump to its position in the timeline.

## Getting Started

1.  Run the application.
2.  Drag and drop a log file onto the upload area, or click to browse.
3.  Use the filter controls on the left to narrow down events.
4.  Explore the timeline by panning (click and drag), zooming (Ctrl/Cmd + mouse wheel, or use the slider), and double-clicking to focus on a specific point.
5.  Click on any row in the "Detailed Event Log" table to highlight it and automatically navigate to it on the timeline.

## Supported Log Formats

Event Horizon is designed to be flexible and can parse many common text-based log formats, such as:

- Syslog (RFC 5424 and RFC 3164)
- Standard application logs (e.g., `TIMESTAMP LEVEL [Source] Message`)
- Windows Event Viewer logs exported as `.csv` files.
- DPKG logs
- And more. If a line isn't recognized, it will be ingested with a generic 'Information' level.

This project was generated in **Firebase Studio**.
