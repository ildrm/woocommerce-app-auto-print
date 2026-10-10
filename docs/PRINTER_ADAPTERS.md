# Printer adapters

| Adapter | Implemented behavior | Evidence/limit |
|---|---|---|
| PDF | Preserve generated PDF; completed artifact state | Real-agent acceptance verified |
| macOS/Linux queues | lpstat discovery; argument-safe lp submission; copies/custom fixed media/actual size | Compiled on macOS; no physical queue test |
| Windows queues | Get-Printer discovery; packaged portable SumatraPDF print-to queue | Source provided; Windows build/device test pending |
| ESC/POS TCP | Timeout-bounded TCP, raster chunks, feed and optional cut | Wire packing test; no physical device test |
| IPP/IPPS | Basic PDF Print-Job attributes and bounded acknowledgment | Wire framing test; capability/media/device support pending |

USB/shared/Wi-Fi/Bluetooth printers work only if represented by an appropriate supported OS queue; no universal direct transport promise is made. Printer profiles can be duplicated and disabled. Unsupported advanced driver controls are omitted.

Windows packagers must supply a verified official SumatraPDF executable through AUTOPRINT_SUMATRA, include the applicable license and source obligations, and validate its behavior. It is not downloaded from an unrecognized site or silently assumed available.
