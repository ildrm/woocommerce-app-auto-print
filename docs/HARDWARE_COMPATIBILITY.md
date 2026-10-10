# Hardware compatibility acceptance plan

**No physical device is marked passed.** Emulated wire contracts and generated PDFs do not prove hardware output.

| Device/path | Required physical check | Status |
|---|---|---|
| Windows installed queue | Discover, preserve dimensions/copies, submit, inspect failure | Not tested |
| macOS printer queue | Discover, custom media, copies, unplug/reconnect | Not tested |
| Linux CUPS | Equivalent behavior under user session | Not tested |
| 58/80 mm ESC/POS | Width, final rows, chunk seams, feed/cut, paper outage | Not tested |
| Network ESC/POS | Disconnect after partial write → uncertain, no auto duplicate | Not tested |
| A4 laser/inkjet | Multipage order, header repeat, totals, physical margins | Not tested |
| 4×6 / 50×30 label | Exact dimensions, barcode scan, gap/cut/offset | Not tested |
| A2/A0 plotter | Page size and no unintended scaling | Not tested |
| IPP/IPPS | PDF support, TLS, media attributes, acknowledgment/device jobs | Not tested |

Record model, firmware, OS/driver, transport, capabilities, DPI, paper, template version, measured dimensions, photographed fictional output and failure/recovery result. Unsupported settings remain unverified until that evidence exists.
