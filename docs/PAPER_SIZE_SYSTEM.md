# Paper size system

Canonical dimensions are signed integer micrometers, validated before layout. Decimal input converts mm ×1000, cm ×10000, or inches ×25400 with one final rounding. Frontend conversion uses BigInt rational arithmetic. Device dots round `(micrometers × DPI) / 25400` once, using a wide integer intermediate.

The catalog includes ISO A0–A7, Letter, Legal, Tabloid, Ledger, 4×6 inch, 2×1 inch, 100×150 mm, 50×30 mm, and 58/80/112 mm rolls. Continuous media stores no fixed height; Typst calculates content height. Margins are independent of nominal width. Fixed profiles support portrait/landscape. DPI is validated at 72–1200.

The UI supports searchable presets, precise custom dimensions/units, live paper/printable-area visualization, margins and X/Y positioning offsets. Effective margins must remain nonnegative. Reassign saved paper profiles to printers; queued jobs retain their original geometry.

Actual-size output is implemented. Fit/width/crop/custom scale modes are rejected by the renderer rather than silently accepted. Scale calibration, driver capability validation, bleed/gaps, continuous label controls, tiling and draggable margin handles remain incomplete. Exact A4 MediaBox dimensions were verified against generated PDF data.
