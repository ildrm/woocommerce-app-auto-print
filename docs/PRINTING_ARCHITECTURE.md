# Printing architecture

The engine renders an immutable job snapshot to PDF and PNG using one document source. It commits rendering → ready → submitting before sending any printer data. Each destination has an independent durable job; a failed destination does not erase the other jobs.

PDF output completion means the artifact exists. OS queue and network acceptance are recorded as submitted, with a reference where available. No physical completion is fabricated. Errors before a connection is established can retry; acknowledgment loss or interrupted writes are uncertain and require inspection.

Raster ESC/POS uses the shaped page at the configured printer DPI. GS v 0 commands pack monochrome dots and split rows into 128-row chunks. Width is capped at 4096 dots, height at 100,000 rows; feed/cut is explicit. Chunk alignment is covered by protocol tests. Text/codepage mode, drawers, raw USB and raw Bluetooth are not implemented.

The adapter implementation lives in printing-core, with independent OS/discovery/raster/IPP paths. Rich capability discovery, monitoring and canceling already-spooled jobs are outstanding. Queued/retry jobs can be canceled before submission.
