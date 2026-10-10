# WooCommerce AutoPrint — executable implementation brief

Build an integrated Rust + Tauri 2 + React/TypeScript application for Windows, macOS, and Linux. The complete original requirements in `SOURCE_REQUIREMENTS.md` remain normative. This brief removes repetition, orders dependencies, and makes acceptance measurable; it does not reduce the requested scope.

## Outcome

A nontechnical user can connect one or more WooCommerce stores, discover or add a printer, configure any supported physical paper dimensions, select or design a versioned template, preview the actual printable artifact, print a test, and enable reliable unattended routing. Closing the GUI leaves the independently running engine alive.

## Operating rules

1. Inspect repository and assets before changing code; preserve working code and the existing license.
2. Implement coherent end-to-end workflows, not disconnected placeholder modules. Production screens must use persistent engine data. Fixtures belong only in tests and explicitly labeled sample previews.
3. Keep the engine, desktop, domain, persistence, commerce, document, printer, and security boundaries explicit. Prefer cohesive crates to empty directories or unnecessary abstractions.
4. Use stable Rust, Tokio, Reqwest, Serde, SQLx/SQLite, tracing, strict TypeScript, React, Vite, Tailwind, and typed IPC. Validate all external data at its trust boundary.
5. Never invent APIs, supported hardware, test outcomes, release artifacts, translation review, or production readiness. Verify dependencies against primary documentation and record licenses/advisories.
6. Review architecture, security, UX, and integration for each affected subsystem. Record implementing responsibility, evidence, acceptance criteria, status, and limitations in a traceability matrix. Role names describe engineering responsibilities; simulated role dialogue is not evidence.
7. Keep exact resumable checkpoints. Environmental restrictions block their specific checks; do all other authorized work. Do not mark a feature complete merely because files exist.

## Nonnegotiable invariants

- WooCommerce remains authoritative for decimal monetary strings, statuses, payment confirmation, and tax. Do not recompute totals using binary floating point.
- Remote credentials require verified HTTPS; prohibit credential URLs, cross-origin redirects, query-string credentials, secret logging, and WebView secret retrieval. OS-protected credentials remain outside database exports.
- Local IPC must authenticate every request, bind locally, constrain request sizes, and restrict filesystem access. Enforce one engine per data directory.
- Poll using pagination, stable ordering, UTC modification watermarks, overlap, and bounded backoff. Persist order changes, routing, job identity, and checkpoints transactionally. Webhooks are signed, deduplicated reconciliation notifications.
- A durable logical job identity includes store, order, generation, document purpose, printer, template version, routing context, and copy policy. Reprints get a new traceable generation.
- Record attempts before side effects. Recover interrupted submissions as uncertain; do not automatically resubmit them. Spooler acceptance is `submitted`, never proof of physical completion.
- Persist immutable paper, template, order, routing, and language snapshots on each job. Printer failure must not erase work or stop other destinations.
- Paper geometry uses integer canonical physical units. Support A0–A7, Letter/Legal/Tabloid/Ledger, 58/80/112 mm continuous rolls, common shipping/product labels, and validated custom mm/cm/in dimensions. Nominal width and printable area are distinct.
- Preview and printing share the same rendering contract. Preserve physical page size, pagination, repeated table headers, complex-script shaping, bidi isolation, and bundled licensed font fallback. ESC/POS Unicode uses shaped raster chunks, not string reversal.
- Templates are versioned declarative data with restricted field bindings and typed conditions; never execute imported code or load remote resources. Bound archive sizes, assets, paths, nesting, and document resources.
- Core polling and printing work without a proprietary cloud. Optional relay failure cannot stop local processing. Multi-device coordination must disclose its limits and cannot promise exactly-once physical output.

## Implementation order and acceptance

| Stage | Integrated deliverable | Minimum executable evidence |
|---|---|---|
| 0 Audit | Repository inventory, dependency decisions, requirements matrix, risks | Existing files inspected; source requirements preserved |
| 1 Foundation | Workspace, contracts, database migration, logging, desktop shell, localization, design tokens | Rust/TS build; migration and contract tests |
| 2 Store connection | Multiple stores, credential vault, HTTPS client, connection test, normalized orders | Mock server: auth errors, pagination, money precision, timeout |
| 3 Engine | Exclusive agent, authenticated IPC, polling, transactional enqueue, durable attempts/recovery | GUI-independent lifecycle; restart and duplicate tests |
| 4 Documents and media | Physical geometry, immutable templates, fonts, PDF/raster preview | Exact dimensions; RTL/Indic/CJK samples; multipage fixture |
| 5 Printers | OS queues, PDF destination, ESC/POS TCP, IPP/IPPS where verified; capability distinctions | Adapter contract tests; real submission when hardware is available |
| 6 Automation | Nested routing, item subsets, copies, priorities, pause/retry/cancel, history | One order → separate jobs; overlap and uncertainty recovery |
| 7 Authoring | Built-in library, safe import/export/versioning, visual editor, paper calibration | Create → publish → assign → render; editor undo/redo and drag tests |
| 8 Product UI | Onboarding, all requested management screens, diagnostics, reports, settings | Accessible interaction tests; light/dark and RTL browser review |
| 9 Optional events | Signed durable relay, companion, device assignments and leases | Forged/duplicate/reordered deliveries; relay outage fallback |
| 10 Hardening | Retention, backup/restore, privacy, bounded resources, fault recovery | Security audit, dependency audit, fault tests, migration tests |
| 11 Delivery | Background registration, sidecar/font packaging, CI per OS, installers, docs | Actual builds on available OS; other OS checks explicitly pending |

## Required product surfaces

Dashboard; Stores; Orders; Printers; Paper Manager; Template Library; Visual Template Designer; Routing Rules; Print Queue; Print History; Reports; Diagnostics; Settings. Include useful empty/loading/error states, keyboard access, focus indicators, theme and language switching, responsive layouts, tray/background state, and operationally honest counters. Every visible action must work or be explicitly unavailable with its reason.

The editor includes a component/layer panel, physical document canvas, properties inspector, data bindings, typed conditions, repeaters, snap and alignment, multi-selection, grouping, locking, resizing, ordering, duplication, clipboard, undo/redo, zoom/rulers, draft persistence, publishing, actual artifact preview, test print, and portable export.

## Mandatory inventory

- All 13 built-in templates from original §7, including the structurally specified classic Persian receipt if no reference photograph is present.
- All original language resources: en, fa, ar, zh-CN, hi, ru, tr, fr, de, es, pt, ja, ko. Separate UI, store, template, printer language, numbering, timezone, and calendar settings. Label unreviewed translations honestly.
- Native adapters and per-printer capabilities, paper settings, copies, scaling, calibration, cutting/drawer where supported. Never imply universal raw USB/Bluetooth support.
- Original §§4–21 cover remaining data fields, rule operators, process startup, security, privacy, reports, backups, updates, relay/device coordination, and operational features; preserve them in the matrix.
- Required documentation inventory from original §25, hardware acceptance plan, representative fictional order fixtures, scripts, CI, and release checklist.

## Verification and handoff

Run formatting, linting, Rust/TypeScript checks, meaningful unit/integration tests, application interaction tests, artifact geometry/typography review, dependency/license/advisory review, and available packaging. Use fault injection for API/network/database/render/printer failures and crashes around submission. Test original scenarios A–P. Do not invent physical hardware evidence.

Update `IMPLEMENTATION_STATUS.md` and `KNOWN_LIMITATIONS.md` with separate statuses: automated verified, physical verified, implemented unverified, platform limited, deferred, or environment blocked. Include exact commands, outputs/counts, generated artifact locations, remaining release blockers, and the next concrete task. Production-ready requires every mandatory release gate to pass.
