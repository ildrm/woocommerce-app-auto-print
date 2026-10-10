# Known limitations — release blockers

This is a functional, tested initial implementation, **not completion of the full master specification** and not production-ready. Implemented workflows and remaining work are distinguished in REQUIREMENT_MATRIX.md. The original requirements were not removed during prompt optimization.

## Incomplete product functionality

- No complete 12-step onboarding wizard; dashboard setup links and real configuration screens provide the current setup path.
- The editor is flow-based. Absolute positioning, resize/snap/alignment guides, genuine rulers/page masters, assets, rich text, full nested manipulation and complete portability/version-history UI are unfinished.
- Actual-size output and position offsets work. Other scaling modes, bleed/gaps/label cuts, scale/density calibration wizard, capability-aware large-format configuration and explicit tiling remain unfinished.
- Basic printer transports exist, but rich capability detection, device monitoring, already-spooled cancellation, drawers and driver-specific options are incomplete. Test-before-save destinations need a saved printer profile to process.
- Direct IPP/IPPS is preliminary; media/capability negotiation and full protocol parsing need development and device tests.
- Order metadata/category/internal-note mappings, configurable transition/generation/rescan policies, locale calendars/number/currency formatting and richer rule actions are incomplete.
- The signed relay is standalone; agent event consumption, WordPress companion, multi-device enrollment/leases/conflict prevention and durable coordinated delivery are unfinished. Two independent agents can duplicate physical responsibilities.
- Automated retention, privacy erasure, full native restore UI, complete reports/history pagination, notifications, signed updater/recovery and installer uninstall flows are unfinished.
- Non-English UI resources are incomplete and unreviewed; fallback is disclosed. Native labels and some diagnostics are English.

## Unverified external behavior

- No physical printer has been tested. No universal hardware compatibility or exactly-once physical printing claim is made.
- No live WooCommerce store credentials were supplied; mock pagination/auth/order precision are tested.
- Windows/Linux native builds and installers have not run here. CI definitions are not test evidence. Windows requires a separately verified SumatraPDF sidecar/license/source distribution.
- Native OS service registration, unattended vault access, Windows runtime-file ACLs, high-volume synchronization races and full screen-reader/accessibility behavior need platform testing. Packaged native IPC and GUI-close/background PDF operation were verified on macOS.
- PDF generation verifies artifacts, not every glyph's linguistic correctness. Comprehensive all-script visual golden baselines and multilingual review remain outstanding.
- npm advisory scan passed; Rust advisory scanning did not complete because the scanner installation stalled on network access. Independent security/license review remains outstanding.
- macOS review builds are unsigned and unnotarized. Production signing/update distribution is not configured.

## Operational limits

Recent GUI data is capped at 500 orders/jobs. Reports use this returned set. Credentials are excluded from backups, but customer data/artifacts are retained and backups are sensitive. On first connection, synchronization begins near the current time; full historical import is not available yet. Existing queued jobs retain their original printer/paper/template snapshots.

Follow the precise checkpoint in IMPLEMENTATION_STATUS.md for continued implementation. Do not treat the presence of a screen, schema table, test fixture or build configuration as evidence that all associated master requirements are complete.
