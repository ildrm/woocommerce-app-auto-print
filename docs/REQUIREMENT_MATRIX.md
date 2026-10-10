# Implementation and review matrix

Owner names below are engineering responsibilities, not separate agents or simulated approvals. Status **verified** means available automated evidence for the stated scope; it does not imply every requirement in that subsystem is complete.

| ID / original scope | Implementing responsibility | Implemented acceptance/evidence | Status / remaining acceptance |
|---|---|---|---|
| AUD-0 / §24 | Architecture | Empty repository audited; source prompt preserved; optimized brief and decisions | Verified |
| FND-1 / §§2–3 | Rust/Tauri/frontend | Cohesive workspace; typed frontend; native desktop compiles; design system | Verified on macOS; stronger ID newtypes pending |
| SEC-1 / store credentials | Security | HTTPS/no redirects; OS vault; no credential-returning IPC | Mock/API/source verified; live/unattended vault pending |
| WOO-1 / §4 | WooCommerce engineer | Pagination, bounded responses, modified overlap/checkpoint, decimal strings | Mock verified; live/custom metadata/rescan pending |
| AGT-1 / §3 | Reliability | Independent executable, exclusive lock, authenticated IPC, shutdown/restart | Real-agent integration and packaged native window-close/background PDF verified |
| AGT-2 / startup | Platform delivery | LaunchAgent/systemd-user/logon registration/removal scripts | Implemented, not OS registered/tested |
| DB-1 / §21 | Database | Migrations, WAL, FK/indexes, transactions, integrity, backup | Tests verified; full upgrade/failure/restore matrix pending |
| QUE-1 / §13 | Reliability | Immutable snapshots, durable attempts, five-attempt retry, pause, cancel, reprint | Unit/integration/browser verified |
| QUE-2 / idempotency | Reliability | Unique identity and automatic store/order/rule latch; uncertainty recovery | Crash/duplicate tests verified; broad fault windows pending |
| PRT-1 / §§5–6 | Print engineering | PDF, OS queue discovery/submission, TCP raster and basic IPP | PDF/wire verified; devices/Windows/Linux pending |
| PRT-2 / capabilities | Native print specialist | Unverified capability labels; driver-safe argument boundaries | Advanced capability/status/cancel/drawer pending |
| PAP-1 / §6 | Document geometry | 19 physical presets, custom units, margins/orientation/DPI/roll height | Unit/browser/A4 geometry verified |
| PAP-2 / calibration/scaling | Print production | X/Y offsets and physical preview | Actual size only; advanced calibration/scaling/tiling pending |
| DOC-1 / §§7–9 | Rendering/typography | Safe declarative compiler, PDF/PNG, barcodes/QR, same preview path | Actual artifacts verified; all-script golden review pending |
| TPL-1 / built-ins | Template engineer | 13 valid built-ins sharing compiler; structurally inspired RTL receipt | Schema/artifact tested; comprehensive preset fidelity pending |
| TPL-2 / management | Template engineer | Import/export/new IDs, duplicate, archive, drafts/publication versions | Browser/source verified; assets/migrations/history UI pending |
| EDT-1 / §8 | Visual editor | Flow drag/add/reorder/group/lock/bind/properties/undo/redo/publish | Core browser workflow verified; complete editor pending |
| UNI-1 / §9 | Typography | Bundled pinned fonts, shaping, bidi, numeric-field LTR isolation | 8-language generation; Persian/Hindi visual inspection; remaining validation pending |
| I18N-1 / §10 | Localization | 13 resource sets, disclosed fallback, UI/template/printer separation, RTL | RTL browser verified; full translation/plurals/human review pending |
| UX-1 / §§11,19 | UX/frontend | Dashboard and all management surfaces use persistent engine data | Core browser paths verified; full accessibility/state audit pending |
| UX-2 / onboarding | Product/UX | Setup checklist leads through store/printer/template/test/automation screens | Full guided wizard pending |
| RTE-1 / §12 | Application/rules | Nested conditions, item subset, copies/priority/stop, simulation | Unit/source verified; richer actions/metadata/UI import pending |
| EVT-1 / relay | API/security | Signature verification, dedup, durable notification/ack endpoints | Signature test/source reviewed; integrated delivery pending |
| DEV-1 / §14 | Distributed systems | Separate local engine ownership only | Cross-device enrollment/leases/conflict prevention pending |
| OPS-1 / monitoring | Operations/frontend | Real queue/history, attempt errors, health/diagnostics, CSV export | Browser/integration/unit verified; full reports/paging pending |
| PRIV-1 / retention | Privacy/database | Vault exclusion from backup; narrow diagnostics; formula-safe CSV | Verified scope; automated retention/erasure pending |
| REL-1 / packaging | Delivery | Optimized sidecars; macOS .app; unsigned DMG build | Available macOS review artifacts; other OS/signing/update gates pending |
| QA-1 / §22 | QA | Rust 20 + frontend 4 + browser 5; real-agent acceptance | Passed available scope; hardware/full fault/golden suites pending |
| SEC-2 / dependency audit | Security/delivery | npm audit zero known issues; constrained trust boundaries | Rust advisory scan/network blocked; independent review pending |
| DOC-2 / §25 | Technical writing | Required documentation inventory describing actual behavior | Current checkpoint verified; keep updated as scope advances |

## Original scenarios A–P

| Scenario | Evidence/status |
|---|---|
| A first installation | macOS review bundle generated; real store/device setup unverified |
| B new eligible order | mock API + routing + durable persistence tests; full live-store flow unverified |
| C multiple printers | independent routing snapshots implemented; three actual devices unverified |
| D Persian receipt | actual raster/PDF fixtures; phone isolation fixed; thermal hardware unverified |
| E Hindi/Arabic | actual shaped artifacts generated; comprehensive semantic review pending |
| F custom label | exact custom dimensions configured; physical label/barcode scan pending |
| G A4 invoice | exact PDF MediaBox verified; multipage/repeated-header stress pending |
| H large format | A0 dimensions supported; plotter validation pending |
| I offline recovery | overlap/checkpoint persistence implemented; full outage fault test pending |
| J GUI/system restart | independent engine/restart persistence and packaged native GUI-close/background PDF verified; automatic OS reboot/service registration pending |
| K printer failure | bounded retry/uncertain model and durable jobs; physical outage pending |
| L custom template | create/edit/undo/preview/publish verified through browser |
| M multilingual GUI | Persian switch/mirroring/data preservation verified; all translations pending |
| N multi-store | isolated store keys/routes implemented; two live stores pending |
| O duplicate event | transactional automatic claims and HMAC/dedup paths tested separately; integrated relay pending |
| P ambiguous result | restart during submitting produces uncertain and cannot auto retry; physical acknowledgment fault pending |
