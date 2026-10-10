# MASTER IMPLEMENTATION PROMPT
## WooCommerce AutoPrint — Universal Cross-Platform Printing Automation Platform

**Target AI Model:** GPT-6.1 Sol or equivalent high-capability coding agent  
**Recommended Reasoning Effort:** Extra High  
**Implementation Language:** English  
**Product Architecture:** Rust + Tauri 2 + React + TypeScript  
**Target Operating Systems:** Windows, macOS, Linux  
**Release Target:** Production-grade, fully integrated desktop application

---

# 0. MISSION AND OPERATING DIRECTIVE

You are the Principal Engineering Orchestrator responsible for designing, implementing, testing, securing, documenting, and delivering **WooCommerce AutoPrint**, a sophisticated open-source-ready desktop application for automated WooCommerce order printing.

Your task is to implement an actual, functional software product.

Do not stop at architectural proposals, design mockups, pseudocode, partially implemented modules, or nonfunctional scaffolding.

The product must:

1. Connect securely to WooCommerce stores using WooCommerce REST API credentials.
2. Detect eligible orders with low latency through webhook events and REST API synchronization.
3. Automatically generate and print documents without repeated user interaction.
4. Support multiple local, USB, shared, network, and compatible thermal printers.
5. Support independent print templates and configurations for each printer.
6. Allow users to create, edit, duplicate, import, export, version, and assign print templates.
7. Support small-format, standard-format, and large-format printers.
8. Support fixed paper sizes, continuous rolls, labels, and custom dimensions.
9. Render multilingual documents correctly, including complex RTL and Indic scripts.
10. Provide an exceptionally polished, accessible, intuitive graphical interface.
11. Continue processing orders when the GUI window is closed.
12. Recover from connectivity failures, application crashes, and printer interruptions.
13. Support multiple WooCommerce stores.
14. Provide monitoring, operational diagnostics, print history, and comprehensive settings.
15. Provide practical installation and packaging for Windows, macOS, and Linux.
16. Adhere to modern secure software engineering principles.

**Definition of success:** A nontechnical user can install the application, connect a store, discover a printer, select or create a template, configure paper dimensions, print a test document, and enable automatic printing through a coherent graphical workflow.

All necessary runtime dependencies and assets must be packaged or installed through a documented, supported deployment process.

Never present an incomplete implementation as production-ready.

---

# 1. SPECIALIST ROLE ORCHESTRATION

Act as an interdisciplinary engineering team consisting of the following specialist roles:

## Product and architecture
- Product Owner
- Business Analyst
- WooCommerce Domain Expert
- Principal Software Architect
- Technical Lead
- Print Workflow and Operations Analyst

## Core software engineering
- Senior Rust Engineer
- Tauri Desktop Engineer
- WooCommerce and WordPress Integration Engineer
- Distributed Systems and Reliability Engineer
- Database Engineer
- API and Event Relay Engineer

## Print engineering
- Cross-Platform Printing Architect
- Windows Printing Specialist
- macOS Printing Specialist
- Linux Printing Specialist
- Thermal and ESC/POS Engineer
- Document Rendering Engineer
- Unicode and Complex Typography Engineer
- Print Production and Barcode Specialist

## Frontend and design
- Lead UX Architect
- Senior Visual Designer
- React/TypeScript Engineer
- Visual Template Editor Engineer
- Accessibility Specialist

## Security and delivery
- Application Security Engineer
- Privacy Engineer
- QA Automation Engineer
- Hardware Compatibility Engineer
- Performance Engineer
- DevOps and Release Engineer
- Technical Writer
- Prompt Engineering and Implementation Orchestrator

### Mandatory role behavior

For each subsystem:

1. Identify the primary implementing specialist.
2. Identify affected dependent subsystems.
3. Define detailed acceptance criteria.
4. Implement the feature.
5. Conduct a code review from the appropriate architecture specialist.
6. Conduct a security review where external data, files, privileges, or hardware are involved.
7. Conduct a UX/accessibility review for user-visible functionality.
8. Write and run appropriate automated tests.
9. Verify integration with the complete application.
10. Record any remaining limitations.

Maintain an implementation and review matrix containing feature ID, owner, implementation status, tests, evidence, and known limitations.

Do not substitute simulated role discussions for actual engineering deliverables.

---

# 2. ENGINEERING RULES

## 2.1. Code quality

The entire application must follow:

- Clean Architecture
- SOLID principles
- DRY and KISS principles
- Separation of concerns
- Explicit dependency management
- Ports-and-Adapters architecture
- Domain-driven boundaries where valuable
- Type-safe contracts
- Defensive programming
- Structured error handling
- Consistent naming conventions
- Small, cohesive modules
- Testable domain logic
- Dependency injection through explicit constructors or composition roots
- Configuration validation
- Fail-safe defaults

Use design patterns only when they solve a concrete problem.

Do not introduce unnecessary abstraction or artificial microservices.

Avoid giant source files, circular dependencies, hidden global state, fragile dynamic typing, and duplicate business logic.

## 2.2. Rust requirements

Use:

- Stable Rust and the current compatible edition.
- Tokio for asynchronous execution.
- Reqwest for network communication.
- Serde for serialization and deserialization.
- SQLx for SQLite access.
- Strongly typed domain identifiers.
- Explicit error types with actionable context.
- Structured logging through tracing.
- Decimal-safe financial calculations.
- Bounded concurrent tasks and queues.
- Cancellation-aware background operations.
- Resource cleanup and graceful shutdown.

Avoid unjustified `unwrap()`, `expect()`, panics, blocking operations on async executors, and unnecessary unsafe Rust.

Unsafe code must be isolated, justified, reviewed, and tested.

## 2.3. Frontend requirements

Use:

- React with strict TypeScript.
- Vite.
- Tailwind CSS.
- A consistent accessible UI component system.
- Centralized design tokens.
- Explicit frontend feature boundaries.
- Typed IPC contracts.
- Form schema validation.
- Predictable state management.
- Error boundaries.
- Internationalization from the beginning.

Do not expose privileged Rust functions or WooCommerce secrets directly to the WebView.

## 2.4. Dependency management

Before introducing a library:

1. Verify that it exists and is actively maintained.
2. Check compatibility with the selected Rust/Tauri versions.
3. Review license compatibility.
4. Check security advisories.
5. Assess operating-system support.
6. Evaluate the API against the actual requirements.
7. Prefer maintained, well-documented dependencies.
8. Encapsulate uncertain libraries behind replaceable interfaces.

Do not invent crate names, APIs, library methods, or hardware capabilities.

---

# 3. REQUIRED PROJECT ARCHITECTURE

Implement a Rust workspace and TypeScript frontend monorepo.

Use a structure equivalent to:

- `apps/desktop` — Tauri graphical application
- `apps/agent` — independently running Rust background printing engine
- `apps/relay` — optional secure webhook relay
- `apps/wordpress-companion` — optional minimal WordPress integration
- `crates/domain` — domain models and invariants
- `crates/application` — application use cases
- `crates/woocommerce` — WooCommerce API integration
- `crates/synchronization` — event ingestion and reconciliation
- `crates/printing-core` — printer abstractions
- `crates/printing-windows` — Windows adapter
- `crates/printing-macos` — macOS adapter
- `crates/printing-linux` — Linux adapter
- `crates/printing-escpos` — thermal printing
- `crates/printing-ipp` — IPP/IPPS integrations
- `crates/template-core` — template schema and evaluation
- `crates/document-layout` — document layout and pagination
- `crates/document-rendering` — PDF/vector/raster output
- `crates/typography` — Unicode, shaping, and font management
- `crates/queue` — durable print job scheduling
- `crates/persistence` — SQLite repositories and migrations
- `crates/security` — secrets, authentication, and secure IPC
- `crates/shared` — common types and utilities
- `packages/ui` — shared frontend components
- `packages/i18n` — localization resources
- `packages/contracts` — generated/shared application contracts
- `packages/template-designer` — visual editor
- `tests` — integration, recovery, and system tests
- `fixtures` — representative orders, layouts, and print samples
- `docs` — architecture and user documentation
- `scripts` — development, packaging, and validation tooling
- `.github/workflows` — CI/CD

The directory structure may be refined, but architectural boundaries must remain explicit.

## 3.1. Core process separation

Implement two separate operational processes.

### AutoPrint Desktop

Responsibilities:

- Application onboarding.
- Dashboard presentation.
- Store configuration.
- Printer management.
- Template design.
- Print preview.
- Print queue monitoring.
- History and reports.
- Diagnostics.
- Preferences.

### AutoPrint Agent

Responsibilities:

- Persistent WooCommerce synchronization.
- Webhook notification processing.
- Order normalization.
- Rule evaluation.
- Document rendering.
- Print queue processing.
- Native printer communication.
- Retry scheduling.
- Recovery.
- Operational health monitoring.

Closing the desktop window must not terminate the agent unless the user explicitly requests engine shutdown.

Use authenticated local IPC for communication between the two processes.

The agent must enforce an exclusive-instance policy per configured data directory.

## 3.2. Process installation

Support:

- Windows user-level background agent.
- macOS LaunchAgent.
- Linux systemd user service.
- Automatic startup configuration.
- Graceful agent restart.
- Agent health checks.
- Manual start/stop controls.
- Clean uninstallation.

Do not assume that a Windows service has access to a user's installed printers.

Document and implement a safe fallback where OS policy prevents automatic agent registration.

## 3.3. No mandatory cloud dependence

The core application must function without a proprietary hosted service.

REST polling must work in standalone mode.

A hosted event relay may improve detection latency and multi-device coordination, but its unavailability must not disable local order printing.

---

# 4. WOOCOMMERCE INTEGRATION

Implement a production-grade WooCommerce integration module.

## 4.1. Store connection

Support:

- Multiple stores.
- WooCommerce Consumer Key.
- WooCommerce Consumer Secret.
- HTTPS validation.
- Connection tests.
- Store name and URL discovery.
- WooCommerce API capability checks.
- Current connection status.
- API request diagnostics.
- Credential replacement.
- Per-store timezone and currency.
- Per-store print policies.
- Custom order statuses.
- Connection retries.
- Graceful handling of unsupported API versions.

Require HTTPS for remote credentials.

Use read-only credentials for ordinary order retrieval wherever possible.

Clearly explain which permissions are necessary for webhook creation and management.

Never silently request broader permissions than necessary.

## 4.2. Order models

Support:

- Order ID and display number.
- Order creation and modification dates.
- Status.
- Customer information.
- Billing and shipping addresses.
- Customer notes.
- Authorized internal notes.
- Order items.
- Product IDs and SKUs.
- Product variations.
- Item quantities.
- Unit prices.
- Line subtotals.
- Line totals.
- Tax data.
- Discounts.
- Coupons.
- Shipping costs.
- Payment method.
- Authorized transaction references.
- Refunds.
- Order totals.
- Currency.
- Product categories where available.
- Explicitly mapped custom metadata.

Respect WooCommerce as the authority for prices, discounts, and taxes.

Preserve monetary precision.

Do not infer payment settlement solely from order total or status when payment confirmation is not available.

## 4.3. Real-time event processing

Support webhook topics including:

- `order.created`
- `order.updated`

Implement secure webhook ingestion through the optional relay or companion integration.

Verify signed webhook payloads.

Deduplicate repeated webhook deliveries.

Treat webhooks as notifications that trigger authoritative order reconciliation, not as guaranteed complete or permanently current order snapshots.

An event may arrive late or out of order.

## 4.4. Polling and reconciliation

Implement:

- Configurable synchronization interval.
- Incremental retrieval using modified timestamps.
- Pagination.
- Stable ordering.
- Overlap windows to avoid boundary misses.
- Durable synchronization checkpoints.
- Backoff and retry.
- Network error handling.
- Startup reconciliation.
- Offline recovery.
- Manual synchronization.
- Duplicate-event protection.
- Clock-skew handling.
- Full rescan with user confirmation.

Never advance a synchronization checkpoint before all required data has been durably processed.

## 4.5. Order eligibility

Allow printing based on:

- Order creation.
- Order status transition.
- Payment confirmation.
- Processing status.
- Completed status.
- Custom statuses.
- Shipping method.
- Product/category.
- Store.
- Explicit manual printing.

Default to a safe eligibility policy that avoids automatically printing unpaid orders unless configured.

---

# 5. PRINTER MANAGEMENT

Develop an extensible native printer abstraction.

## 5.1. Required printer categories

Support printers accessible through:

- Windows Print Spooler.
- macOS print system.
- Linux CUPS.
- USB printers installed in the operating system.
- Shared network printers.
- Wi-Fi printers exposed through supported queues or protocols.
- Ethernet printers.
- IPP/IPPS devices.
- Compatible ESC/POS thermal printers.
- Supported TCP/IP raw printing devices.
- PDF virtual output destinations.

Bluetooth printing may be supported through OS-paired printer queues where available.

Avoid promising raw Bluetooth or USB support for every device.

## 5.2. Printer discovery

Provide:

- Automatic discovery.
- Manual printer addition.
- Network address configuration.
- Driver/queue identification.
- Stable internal printer IDs.
- Printer profile naming.
- Default printer assignment.
- Connection verification.
- Printer capability discovery.
- Printer status monitoring.
- Test printing.
- Printer removal.
- Printer profile duplication.

Distinguish discovered capabilities from user overrides and unverified assumptions.

## 5.3. Printer properties

Each printer profile must support:

- Display name.
- Operating-system identifier.
- Connection type.
- Network endpoint.
- Driver information.
- Printer language/protocol.
- Default template.
- Default paper preset.
- Custom paper settings.
- Resolution/DPI.
- Orientation.
- Margins.
- Printable area.
- Copies.
- Color/grayscale/monochrome mode.
- Duplex where supported.
- Scaling mode.
- Print quality options.
- Automatic cutting where supported.
- Cash drawer operation where supported.
- Auto-print policy.
- Retry policy.
- Print concurrency.
- Calibration profile.
- Enabled/disabled state.

Unsupported settings must be disabled or identified clearly.

## 5.4. Printing interface

Design stable interfaces equivalent to:

- `PrinterDiscovery`
- `PrinterCapabilityProvider`
- `PrinterTransport`
- `PrintJobSubmitter`
- `PrintJobMonitor`
- `PrintJobCanceller`
- `PrinterCalibration`

Use adapter-specific implementations internally.

Do not assume one library will provide complete functionality on all operating systems.

---

# 6. UNIVERSAL PAPER SIZE AND PRINT FORMAT ENGINE

This subsystem is mandatory and must be fully developed.

**Do not hardcode printing to 58 mm, 80 mm, or A4.**

The system must provide a unified paper-profile engine supporting small, standard, and large-format output.

## 6.1. Built-in thermal presets

Include configurable presets for:

- 58 mm thermal rolls.
- 80 mm thermal rolls.
- 112 mm thermal rolls where supported.
- Additional user-defined roll widths.

The available printable width must be independent of nominal paper width.

## 6.2. Standard paper formats

Support ISO paper presets including:

- A0
- A1
- A2
- A3
- A4
- A5
- A6
- A7 where supported

Support appropriate North American presets:

- Letter
- Legal
- Tabloid
- Ledger

Add other regional sizes through a data-driven preset catalog.

Presets must store accurate physical dimensions, not approximate pixel values.

## 6.3. Label formats

Support:

- 4 × 6 inch shipping labels.
- 2 × 1 inch labels.
- 100 × 150 mm shipping labels.
- A6 labels.
- Custom product labels.
- Barcode labels.
- Shelf labels.
- Address labels.
- Continuous label rolls where supported.

Implement gap, padding, bleed, and cutting settings as optional printer-specific capabilities.

## 6.4. Custom paper dimensions

The user must be able to configure:

- Width.
- Height.
- Measurement unit.
- Orientation.
- Margins.
- Printable area.
- Bleed.
- Content scaling.
- Printer resolution.
- Continuous versus fixed-length media.

Allow entry in:

- Millimeters.
- Centimeters.
- Inches.

Perform calculations in a precise canonical physical unit.

Convert physical measurements into device pixels/dots using the actual configured printer resolution.

Avoid accumulating floating-point rounding errors in paper geometry.

## 6.5. Continuous-roll printing

For thermal rolls:

- Support content-driven height.
- Preserve configured roll width.
- Calculate document height dynamically.
- Prevent unnecessary blank paper.
- Avoid clipping the final section.
- Support feeding and cutting.
- Split tall raster graphics into supported device chunks.
- Respect printer memory limitations.
- Preserve alignment between image chunks.

## 6.6. Scaling modes

Provide:

- Actual size / 100%.
- Fit to printable area.
- Fit to width.
- Fit to page.
- Fill/crop where explicitly selected.
- Custom scale percentage.
- Center on page.
- Align to a specified edge.

Do not silently shrink text until it becomes unreadable.

Preview any clipping before allowing printing.

## 6.7. Large-format printers

Support large-format printing through compatible drivers or network protocols.

Examples include A2, A1, and A0 documents.

Implement:

- Large canvas layout.
- High-resolution PDF/vector output.
- Appropriate page-orientation controls.
- Output file-size limits.
- Memory-aware raster fallback.
- Printer capability validation.
- Driver-defined paper sizes.
- Pagination or tiling only when explicitly requested.

Do not assume that every printer can accept every paper size.

## 6.8. Print calibration wizard

Create an intuitive calibration workflow.

Users must be able to:

1. Select a printer.
2. Select or enter paper dimensions.
3. Detect available printer capabilities.
4. Print a calibration pattern.
5. Measure printed margins.
6. Correct horizontal and vertical offsets.
7. Adjust scale.
8. Adjust raster density where applicable.
9. Save the calibration profile.
10. Preview and print again.

Calibration settings must remain printer-specific.

## 6.9. Paper configuration UI

The paper setup screen must have a premium visual design.

Provide:

- Paper preset browser.
- Preset search.
- Custom dimensions.
- Orientation toggle.
- Interactive paper illustration.
- Live dimensional labels.
- Margin handles or numerical controls.
- Printable-area overlay.
- Safe-zone visualization.
- Zoom.
- Warnings for unsupported media.
- Print calibration button.

Paper configuration must be understandable without technical printing knowledge.

---

# 7. UNIVERSAL PRINT TEMPLATE SYSTEM

This is a primary product differentiator.

Templates must be extensible, independent, versioned, portable, and safe.

## 7.1. Built-in template library

Include working default templates for:

1. Classic RTL Thermal Invoice.
2. Minimal Thermal Receipt.
3. Detailed Thermal Receipt.
4. A4 Business Invoice.
5. A5 Invoice.
6. Packing Slip.
7. Shipping Label.
8. Product Barcode Label.
9. Kitchen Order Ticket.
10. Warehouse Picking List.
11. Customer Gift Receipt.
12. Order Summary.
13. Generic Custom Document.

All built-in templates must use the same underlying rendering system.

Do not special-case the Persian receipt.

## 7.2. Reference receipt implementation

A printed Persian WooCommerce receipt has been supplied as a reference.

If the image is available in the implementation context, inspect it visually.

If it is not available, use the following structural requirements.

The reference template has:

- Centered store branding.
- Persian store subtitle.
- Bordered customer information.
- Customer name.
- Phone number.
- Province and city.
- Full delivery address.
- Order creation date.
- Order number.
- Customer notes.
- Product table.
- Quantity.
- Unit price.
- Product total.
- Item discounts.
- Shipping fee.
- Final invoice total.
- Payment details.
- Reprint/copy label.
- Barcode.
- Footer website and contact details.

Recreate its layout characteristics as a configurable template.

Do not copy personal information or payment-token strings from the photograph into actual sample records.

Use fictional data for demonstrations.

## 7.3. Declarative template format

Store templates using a versioned JSON schema.

Support component types such as:

- `document`
- `section`
- `row`
- `column`
- `grid`
- `stack`
- `text`
- `rich_text`
- `dynamic_field`
- `image`
- `logo`
- `table`
- `repeater`
- `conditional`
- `divider`
- `border`
- `spacer`
- `barcode`
- `qr_code`
- `page_break`
- `page_number`
- `header`
- `footer`
- `shape`
- `reprint_marker`

Define schemas and migrations for template format evolution.

## 7.4. Template expression system

Support safe dynamic data binding.

Examples:

- `order.number`
- `order.status`
- `order.created_at`
- `customer.full_name`
- `customer.phone`
- `shipping.address`
- `items`
- `item.name`
- `item.quantity`
- `item.sku`
- `totals.shipping`
- `totals.discount`
- `totals.grand_total`

Provide a structured rule builder for:

- Field selection.
- Conditional visibility.
- Basic comparisons.
- Date formatting.
- Number formatting.
- Currency formatting.
- Default values.
- Data repetition.

Use a restricted expression grammar or typed abstract syntax tree.

Do not evaluate arbitrary JavaScript, Rust, SQL, shell commands, or user-supplied executable code inside templates.

## 7.5. Custom WooCommerce fields

Provide a graphical field-mapping tool.

Users should be able to:

- Inspect approved metadata fields.
- Select a source field.
- Assign a friendly label.
- Specify field type.
- Choose formatting rules.
- Hide missing values.
- Validate the preview.
- Add the field to a template.

Sensitive field types must require explicit authorization.

Use an allowlist-based export and print policy.

## 7.6. Template portability

Define a portable template package format such as `.autoprint-template`.

Include:

- Manifest.
- Schema version.
- Template definition.
- Assets.
- Default settings.
- Field bindings.
- Optional preview images.
- License metadata for fonts/assets.

Support:

- Import.
- Export.
- Duplicate.
- Rename.
- Archive.
- Restore.
- Version history.
- Compatibility checking.

Validate archive paths, assets, MIME types, sizes, and schemas.

Prevent path traversal, decompression bombs, code execution, and unauthorized remote resource loading.

---

# 8. VISUAL DRAG-AND-DROP TEMPLATE DESIGNER

Build a complete graphical document designer.

The user must not need to edit JSON, HTML, or source code to create ordinary templates.

## 8.1. Editor layout

Use a professional multi-panel interface:

**Left panel**

- Component library.
- Template layers.
- Data sources.
- Reusable blocks.
- Asset library.

**Center panel**

- Document canvas.
- Paper boundary.
- Printable area.
- Zoom.
- Drag and drop.
- Snap guides.
- Selection.
- Live preview.

**Right panel**

- Element properties.
- Typography.
- Borders and spacing.
- Alignment.
- Data bindings.
- Conditions.
- Responsive/print-specific settings.

**Top toolbar**

- Template name.
- Save.
- Undo.
- Redo.
- Preview.
- Paper setup.
- Test print.
- Publish.
- Export.

## 8.2. Editor capabilities

Implement:

- Element selection.
- Multiple selection.
- Drag and drop.
- Resize handles.
- Alignment guides.
- Snap-to-grid.
- Group/ungroup.
- Layer reordering.
- Lock/unlock.
- Duplicate.
- Copy/paste.
- Undo/redo.
- Keyboard shortcuts.
- Zoom in/out.
- Fit to page.
- Fit to width.
- Rulers.
- Spacing and margin controls.
- Typography controls.
- Color and border controls.
- Dynamic variable insertion.
- Conditional element configuration.
- Repeating item blocks.
- Live data preview.
- Validation errors.
- Draft autosave.
- Template publishing.

All actions must be functional.

Do not create decorative controls that have no behavior.

## 8.3. Preview fidelity

The preview must use the same rendering contract as the final print pipeline.

Ideally display the actual rendered PDF or raster artifact.

Do not rely on an unrelated WebView layout that produces materially different printed output.

Offer sample order datasets with:

- One product.
- Many products.
- Long product names.
- Long addresses.
- Persian/English mixed text.
- Hindi.
- Arabic.
- Chinese.
- Discounts.
- Shipping fees.
- Empty optional fields.
- Large totals.
- Long notes.

---

# 9. TYPOGRAPHY AND UNICODE REQUIREMENTS

Unicode support is mandatory.

Rust and TypeScript both support Unicode text processing, but correct printed output must also include bidi handling, shaping, font coverage, and an appropriate printer output pipeline.

## 9.1. Mandatory script support

Test and support:

- English.
- Persian.
- Arabic.
- Urdu.
- Hindi.
- Chinese.
- Japanese.
- Korean.
- Russian.
- Turkish.
- French.
- German.
- Spanish.
- Portuguese.
- Hebrew where fonts and shaping are available.
- Thai where fonts and shaping are available.

Use a standards-based Unicode architecture that can support additional languages.

## 9.2. Text layout requirements

Implement:

- Unicode normalization where semantically appropriate.
- Unicode Bidirectional Algorithm behavior.
- Complex-script shaping.
- Font fallback.
- OpenType shaping.
- Grapheme-aware cursor and selection behavior.
- Script-aware line breaking.
- Mixed RTL/LTR isolation.
- Correct punctuation placement.
- Localized numeral formatting.
- Locale-aware dates.
- Locale-aware currency formatting.

Never reverse a Unicode string to simulate RTL output.

## 9.3. Font management

Implement a local font registry.

Support:

- Application-bundled licensed fonts.
- Installed system fonts.
- User-imported permitted fonts.
- Font previews.
- Glyph coverage detection.
- Font fallback chains.
- Font missing warnings.
- Font embedding/subsetting when licensing permits.

Evaluate appropriate Noto families and other licensed typefaces.

The required glyphs must be available without an internet connection.

## 9.4. Thermal multilingual printing

Do not rely exclusively on printer-native text code pages.

For unsupported complex scripts:

1. Compose text in Unicode.
2. Apply bidi processing.
3. Shape the glyphs.
4. Apply font fallback.
5. Render to raster graphics.
6. Convert to a compatible thermal-printer image command.
7. Transmit in appropriate device-sized chunks.

Use ESC/POS text mode only when the target printer actually supports the desired text correctly.

## 9.5. Visual regression fixtures

Generate representative test fixtures for:

- Persian names and addresses.
- Arabic text with diacritics.
- Urdu text.
- Hindi conjunct characters.
- Simplified and Traditional Chinese.
- Japanese mixed Kanji/Kana.
- Korean Hangul.
- Cyrillic.
- Mixed Persian/English order identifiers.
- Long URLs embedded inside RTL text.
- Emoji and unsupported-glyph fallbacks.

Tests must verify expected ordering, shaping, wrapping, and clipping behavior.

---

# 10. MULTILINGUAL APPLICATION INTERFACE

The graphical application itself must be multilingual.

Do not confuse document language with application-interface language.

These are separate settings.

## 10.1. Built-in languages

Provide localization infrastructure and complete interface resources for:

- English (`en`)
- Persian (`fa`)
- Arabic (`ar`)
- Chinese Simplified (`zh-CN`)
- Hindi (`hi`)
- Russian (`ru`)
- Turkish (`tr`)
- French (`fr`)
- German (`de`)
- Spanish (`es`)
- Portuguese (`pt`)
- Japanese (`ja`)
- Korean (`ko`)

Support future language packages.

Use standard locale identifiers and provide fallback rules.

## 10.2. Independent locale settings

Support:

- Application UI language.
- Individual store display language.
- Individual template language.
- Printer-specific document language.
- Numbering system.
- Date format.
- Currency display.
- Calendar preference.
- Timezone.

For example:

The application interface may be English while a thermal receipt prints in Persian, a packing slip prints in Arabic, and an A4 invoice prints in Chinese.

Do not couple these settings.

## 10.3. RTL user interface

Persian and Arabic modes must support:

- Mirrored navigation layout.
- Correct reading order.
- RTL menus and dialogs.
- Correct icon mirroring where semantically appropriate.
- Proper focus navigation.
- Correct text alignment.
- Stable mixed-direction forms.
- Nonmirrored logos, barcodes, and identifiers.
- RTL-compatible charts and tables.

## 10.4. Translation engineering

Externalize all visible strings.

Use pluralization and contextual message formatting.

Do not construct translated sentences through string concatenation.

Localize:

- Forms.
- Validation errors.
- Notifications.
- Confirmation dialogs.
- Printer statuses.
- Onboarding instructions.
- Settings.
- Accessibility labels.
- Reports.
- Date/time displays.

Provide translation validation scripts detecting missing keys, placeholder mismatches, and invalid plural forms.

Machine-assisted translations must be explicitly reviewed for quality before claiming a locale is fully verified.

---

# 11. UI/UX DESIGN — HIGHEST PRIORITY

The application must look and feel like a premium contemporary desktop product.

The interface should be visually stunning without compromising clarity, performance, or accessibility.

## 11.1. Design direction

Adopt a visual language characterized by:

- Refined minimalism.
- Strong hierarchy.
- Clean typography.
- Balanced spacing.
- Professional iconography.
- Subtle depth.
- Well-controlled shadows.
- Elegant surfaces.
- Consistent border radii.
- High-quality micro-interactions.
- Intentional color usage.
- Excellent empty and loading states.

Avoid:

- Excessive gradients.
- Overdecorated dashboards.
- Inconsistent icon sizes.
- Dense configuration forms.
- Unnecessary animations.
- Modal overload.
- Low-contrast text.
- Excessive cards.
- Complicated navigation.
- Technical jargon shown to nontechnical users.

## 11.2. Design system

Create a complete design token system for:

- Colors.
- Typography.
- Spacing.
- Radii.
- Shadows.
- Borders.
- Elevation.
- Icon dimensions.
- Motion.
- Layout breakpoints.
- Focus states.
- Component states.

Support:

- Light theme.
- Dark theme.
- System theme.
- High-contrast mode where possible.
- Reduced motion.
- Text scaling.

Ensure a polished result on both standard-density and high-DPI displays.

## 11.3. Navigation architecture

Implement the following main application sections:

1. Dashboard.
2. Stores.
3. Orders.
4. Printers.
5. Templates.
6. Routing Rules.
7. Print Queue.
8. Print History.
9. Reports and Diagnostics.
10. Settings.

Navigation must remain consistent across the application.

Advanced options should be available progressively without overwhelming first-time users.

## 11.4. Dashboard

Create an operational dashboard featuring:

- Connection health.
- Connected stores.
- Printer readiness.
- Today's eligible orders.
- Printed jobs.
- Pending jobs.
- Failed jobs.
- Last synchronization.
- Recent activity.
- Actionable system alerts.
- Quick actions.

Quick actions should include:

- Add store.
- Add printer.
- Create template.
- Print test.
- View queue.
- Retry failed jobs.

Avoid vanity analytics that provide no operational value.

## 11.5. First-run onboarding

Provide a guided setup wizard.

Steps:

1. Welcome.
2. Choose application language.
3. Connect WooCommerce.
4. Validate API credentials.
5. Discover printers.
6. Select a printer.
7. Configure paper size.
8. Choose a template.
9. Preview a sample.
10. Print a test document.
11. Configure automatic printing.
12. Complete setup.

Show clear progress and allow users to return to previous steps.

Where credentials and supported printers are available, aim for a first successful test print within five minutes.

This is a usability target, not a promise independent of hardware and network conditions.

## 11.6. Printer configuration experience

Use visual printer cards with:

- Printer name.
- Connection type.
- State.
- Paper format.
- Assigned template.
- Last activity.
- Actions.

Provide a detail screen with tabs:

- General.
- Connection.
- Paper.
- Template.
- Advanced.
- Calibration.
- Diagnostics.

## 11.7. Print queue experience

Provide a real-time queue table.

Columns:

- Job ID.
- Store.
- Order.
- Printer.
- Template.
- Paper size.
- Status.
- Created time.
- Attempt count.
- Actions.

Support filtering, search, sorting, and bulk operations.

Provide understandable status labels:

- Queued.
- Preparing.
- Rendering.
- Ready.
- Submitted.
- Completed when verifiable.
- Awaiting printer.
- Retry scheduled.
- Failed.
- Outcome uncertain.
- Canceled.

Do not equate successful submission to the operating-system spooler with confirmed physical printing.

## 11.8. Motion and interactions

Use subtle animations for:

- Screen transitions.
- Loading states.
- Queue updates.
- Printer status changes.
- Template drag and drop.
- Dialog presentation.
- Notifications.
- Save confirmation.

Animations should usually be brief and nonblocking.

Support reduced-motion preferences.

Do not sacrifice responsiveness for visual effects.

## 11.9. Accessibility

Target WCAG 2.2 AA principles where applicable to a desktop WebView interface.

Support:

- Full keyboard navigation.
- Visible focus indicators.
- Accessible names and descriptions.
- Screen-reader-compatible component semantics.
- Correct dialog focus behavior.
- Adequate contrast.
- Meaningful status announcements.
- Non-color status indicators.
- Reduced motion.
- Scalable text.
- RTL accessibility.

Audit all major screens.

---

# 12. AUTOMATIC PRINT ROUTING

Implement a configurable routing-rule engine.

A single order may produce multiple documents for multiple printers.

## 12.1. Supported conditions

Rules may inspect:

- Store.
- Order status.
- Payment status.
- Product.
- Variation.
- SKU.
- Product category.
- Shipping method.
- Payment method.
- Customer category.
- Order total.
- Item quantity.
- Custom order fields.
- Time of day.
- Day of week.
- Delivery location.
- Manually selected tags.

## 12.2. Rule logic

Support:

- AND conditions.
- OR conditions.
- Nested groups.
- Priority ordering.
- Stop/continue processing.
- Enabled/disabled rules.
- Preview/test evaluation.
- Rule duplication.
- Rule import/export.

## 12.3. Routing actions

Actions may specify:

- Target printer.
- Target template.
- Paper profile.
- Number of copies.
- Order-item subset.
- Output language.
- Print priority.
- Scheduled print time.
- Custom footer.
- Device location.
- Optional automatic cutting.

## 12.4. Example scenario

When an order contains food and drinks:

- Kitchen printer receives relevant food items.
- Bar printer receives drink items.
- Cashier receives the complete invoice.
- Warehouse receives the packing slip if physical shipment is required.

Every output must be independently tracked as its own print job.

---

# 13. DURABLE PRINT QUEUE

The queue is a reliability-critical component.

## 13.1. Data model

Include entities equivalent to:

- Store.
- Order.
- OrderEvent.
- Printer.
- PrinterCapability.
- PaperProfile.
- PrinterCalibration.
- Template.
- TemplateVersion.
- TemplateAssignment.
- RoutingRule.
- PrintJob.
- PrintAttempt.
- RenderedArtifact.
- SyncCheckpoint.
- Device.
- DeviceLease.
- AuditEvent.
- ApplicationSetting.

## 13.2. State machine

Define an explicit print-job lifecycle.

Suggested states:

- Created.
- Queued.
- Preparing.
- Rendering.
- Ready.
- Submitting.
- Submitted.
- Completed.
- WaitingForPrinter.
- RetryScheduled.
- Failed.
- OutcomeUncertain.
- Canceled.

Use explicit, validated state transitions.

Record submission references when provided by the operating system.

## 13.3. Idempotency

Create a stable logical identity for automatic jobs based on:

- Store.
- Order.
- Print generation.
- Document purpose.
- Printer.
- Template version.
- Routing context.
- Copy policy.

Ensure repeated webhook events and polling results cannot generate accidental duplicate jobs.

Intentional reprints must create new traceable generations.

## 13.4. Transactional guarantees

Use SQLite transactions for:

- Event recording.
- Order updates.
- Rule evaluation outcomes.
- Print-job creation.
- State transitions.
- Attempt history.
- Synchronization checkpoints.

Implement constraints and indexes to enforce critical invariants.

## 13.5. Retry behavior

Support:

- Exponential backoff.
- Configurable retry caps.
- Recoverable versus permanent errors.
- Printer-offline waiting.
- Manual retry.
- Queue pause/resume.
- Recovery after restart.

Do not automatically retry a job after an ambiguous physical-print outcome without considering duplicate-print risk.

## 13.6. Crash recovery

Test crashes during:

- Order synchronization.
- Job creation.
- Rendering.
- Printer submission.
- Spooler acknowledgment.
- Job completion recording.

Recover without losing queued jobs.

Mark uncertain outcomes for appropriate review.

---

# 14. MULTI-DEVICE COORDINATION

Allow multiple desktop installations to access the same store.

Support:

- Device registration.
- Per-device printing responsibility.
- Explicit printer ownership.
- Store-to-device assignments.
- Per-location routing.
- Optional centralized claim coordination.
- Durable job leases.
- Lease renewal.
- Lease expiration.
- Conflict detection.

Two installations must not routinely print the same logical document accidentally.

Do not falsely promise exactly-once physical printing.

Explain and implement the distinction between:

- Exactly-once logical job creation.
- At-least-once delivery attempts.
- Spooler submission.
- Hardware-confirmed completion when available.

---

# 15. OPTIONAL WEBHOOK RELAY

Implement the relay as an independently deployable optional service.

It must not be required for standalone mode.

## 15.1. Responsibilities

- HTTPS webhook reception.
- WooCommerce HMAC signature validation over raw request bodies.
- Secret management.
- Replay and duplicate protection.
- Minimal event persistence.
- Event dispatch.
- Device authentication.
- WebSocket delivery.
- Device acknowledgments.
- Delivery retry.
- Health monitoring.

## 15.2. Privacy

Do not unnecessarily retain full WooCommerce order payloads.

Persist minimal event metadata whenever possible.

The relay must not need WooCommerce Consumer Secrets for ordinary event delivery.

Webhook verification secrets are separate from WooCommerce API credentials.

## 15.3. Infrastructure

Provide:

- Local development configuration.
- Dockerfile.
- Docker Compose example.
- Environment validation.
- Health endpoints.
- TLS deployment guidance.
- Secret rotation.
- Database migrations.
- Operational documentation.

An optional WordPress companion plugin may simplify webhook configuration and transmit minimized events.

Keep it small, standards-compliant, and compatible with modern WooCommerce order storage.

---

# 16. BARCODE, QR, AND LABEL ENGINE

Support barcode generation using standard encoding libraries.

Implement appropriate symbologies, including:

- Code 128.
- Code 39.
- EAN-13.
- EAN-8.
- UPC where applicable.
- QR Code.

Additional formats may be supported through extensible adapters.

Validate source data before encoding.

Support:

- Human-readable identifiers.
- Quiet zones.
- Barcode dimensions.
- Alignment.
- Rotation where supported.
- Error correction for QR.
- Appropriate print contrast.
- Scanability validation.

Do not automatically generate invalid barcode values.

Do not put confidential credentials into barcodes unless explicitly requested through an authorized workflow.

---

# 17. SECURITY ARCHITECTURE

Security is a release-blocking priority.

## 17.1. Credentials

Store WooCommerce secrets using supported operating-system secure storage.

Never place credentials in:

- Frontend state.
- Plaintext configuration.
- Application logs.
- Error messages.
- Exported template packages.
- Screenshots.
- Telemetry.

Restrict secret access to the appropriate Rust process.

## 17.2. Tauri isolation

Configure:

- Strict capabilities.
- Minimal command permissions.
- Explicit IPC allowlists.
- Input validation.
- Strict Content Security Policy.
- No unnecessary remote scripts.
- No arbitrary shell execution.
- Restricted filesystem access.

The GUI must not expose a general-purpose privileged command executor.

## 17.3. Local IPC

Use authenticated interprocess communication.

Include:

- Process identity validation where supported.
- OS-scoped socket or pipe permissions.
- Input schema validation.
- Replay-resistant session establishment where appropriate.
- Explicit operation authorization.
- Connection lifecycle handling.

## 17.4. Template security

Prevent:

- Arbitrary script execution.
- Remote resource injection.
- File access outside approved directories.
- Unsafe expression evaluation.
- Path traversal.
- Archive extraction exploits.
- Oversized resource exhaustion.
- Sensitive metadata disclosure.

## 17.5. Network security

Implement:

- TLS verification.
- Certificate validation.
- Timeouts.
- Bounded request sizes.
- Retry limits.
- Secure webhook verification.
- Safe redirect policies.
- Credential-safe error reporting.
- SSRF protections for configurable endpoints.

## 17.6. Privacy

Treat customer names, addresses, phone numbers, email addresses, and payment references as personal or sensitive business data.

Implement:

- Configurable local retention.
- Secure log redaction.
- Data export controls.
- Sensitive field mapping restrictions.
- Secure deletion workflows where technically supportable.
- No unauthorized background telemetry.

---

# 18. PERFORMANCE AND RESOURCE EFFICIENCY

The application must be efficient enough for regular use on modest desktop hardware.

Define benchmarks for:

- Cold startup.
- Agent startup.
- Idle memory.
- Rendering latency.
- Template editor responsiveness.
- Synchronization latency.
- Queue throughput.
- Multiple simultaneous printers.
- Large document rendering.
- Long thermal receipts.
- Recovery after connectivity loss.

Use bounded concurrency.

Avoid buffering unlimited full-resolution images.

Cache immutable assets and reusable layout calculations safely.

Perform rendering and printer I/O outside the GUI event loop.

For real-time mode, target rapid event-to-queue processing under healthy conditions.

Do not present a fixed end-to-end printing latency as guaranteed because webhook delivery, network conditions, drivers, and hardware differ.

Collect performance evidence on actual supported platforms.

---

# 19. REQUIRED APPLICATION SCREENS

Implement the complete user-facing interface.

## 19.1. Dashboard

Operational overview and quick actions.

## 19.2. Stores

Store list, connection wizard, credentials, synchronization settings, connection health, and diagnostics.

## 19.3. Orders

Searchable orders, details, item data, print eligibility, print actions, and order-specific history.

## 19.4. Printers

Discovery, printer profiles, network setup, status, testing, and capabilities.

## 19.5. Paper Manager

Paper presets, custom dimensions, orientation, margins, printable area, and calibration.

## 19.6. Template Library

Templates, thumbnails, categories, duplication, versioning, import, and export.

## 19.7. Template Designer

Complete visual drag-and-drop editing.

## 19.8. Routing Rules

Graphical rule builder and rule simulation.

## 19.9. Print Queue

Real-time queue management and error recovery.

## 19.10. Print History

Search, filters, attempts, reprints, failure analysis, and artifact inspection according to retention policy.

## 19.11. Reports

Useful operational metrics such as:

- Orders processed.
- Documents printed.
- Prints by printer.
- Prints by template.
- Failure rate.
- Retry counts.
- Queue processing latency.
- Printer downtime.
- Manual versus automatic prints.

Support sensible date filters and CSV export with privacy safeguards.

## 19.12. Diagnostics

Connection tests, printer tests, log viewer, agent status, rendering checks, and redacted diagnostic bundle export.

## 19.13. Settings

Application language, theme, defaults, security, updates, backup, retention, and startup behavior.

Every screen must have polished loading, empty, success, warning, and error states.

---

# 20. DESKTOP USER EXPERIENCE REQUIREMENTS

Implement:

- System tray integration.
- Minimize-to-tray option.
- Background operation.
- Startup configuration.
- Desktop notifications.
- Native file selection.
- Keyboard shortcuts.
- Window resizing.
- Persistent window state.
- Multiple-monitor compatibility.
- High-DPI support.
- Operating-system theme detection.
- Update notifications.
- Graceful shutdown.
- Connection-loss notifications.
- Accessible confirmation dialogs.

Closing the window must not confuse users about whether automatic printing is still active.

Provide clear controls for pausing printing without deleting queued jobs.

---

# 21. DATABASE AND MIGRATION REQUIREMENTS

Use SQLite as the default local database.

Implement:

- Versioned migrations.
- Referential integrity.
- Appropriate indexes.
- WAL where suitable.
- Busy-timeout handling.
- Transactional updates.
- Integrity checking.
- Configurable retention.
- Backup.
- Restore.
- Upgrade migration tests.
- Rollback/recovery strategy.

Protect against simultaneous database access by uncontrolled multiple agent instances.

Use schema constraints to enforce job uniqueness and valid references.

Backups must not silently expose secrets.

---

# 22. TESTING STRATEGY

Tests are mandatory, not optional documentation.

## 22.1. Unit tests

Cover:

- Order normalization.
- Monetary formatting.
- Template binding.
- Rule evaluation.
- Idempotency.
- State transitions.
- Paper conversion.
- DPI calculations.
- Pagination.
- Barcode validation.
- Locale formatting.

## 22.2. Integration tests

Cover:

- WooCommerce API mock integration.
- REST pagination.
- Webhook verification.
- Local IPC.
- Database transactions.
- Rendering adapters.
- Printer transport contracts.
- Agent lifecycle.

## 22.3. End-to-end tests

Cover:

- First-run onboarding.
- Store connection.
- Printer discovery.
- Printer configuration.
- Template selection.
- Paper configuration.
- Test printing.
- Automatic order printing.
- Failed-job recovery.
- Template import/export.
- Language switching.
- RTL interface behavior.

## 22.4. Hardware tests

Create a compatibility test plan covering:

- Windows installed printer.
- macOS printer queue.
- Linux CUPS printer.
- 58 mm thermal printer.
- 80 mm thermal printer.
- Network ESC/POS printer.
- A4 laser/inkjet printer.
- 4 × 6 inch label printer.
- Large-format printer where actual hardware is available.

Physical tests must not be reported as passed when no physical device was used.

Provide emulated protocol tests separately.

## 22.5. Unicode tests

Verify script shaping, alignment, and glyph rendering for all targeted language groups.

Include mixed-direction documents and long-text stress tests.

## 22.6. Fault injection

Simulate:

- API timeout.
- Invalid credentials.
- Expired credentials.
- Webhook duplicates.
- Delayed events.
- Printer offline.
- Out-of-paper condition where detectable.
- Corrupted templates.
- Agent termination.
- Application update interruption.
- Database write failure.
- Network loss.
- Rendering failure.
- Multi-device race conditions.

## 22.7. Visual regression

Generate canonical print artifacts.

Compare representative templates against approved reference outputs.

Use deterministic font versions, dimensions, and rendering settings.

Flag differences in geometry, clipping, content ordering, or legibility.

---

# 23. QUALITY GATES

Do not advance a subsystem to completed status until its relevant checks pass.

## Gate A — Architecture

- Module boundaries documented.
- No circular dependencies.
- Stable public contracts.
- Error model defined.
- Security trust boundaries defined.

## Gate B — Functional behavior

- Feature demonstrated.
- Expected interactions implemented.
- Invalid inputs handled.
- Data persisted correctly.
- Cross-module integration verified.

## Gate C — UI/UX

- Visually consistent.
- Intuitive flow.
- Responsive interactions.
- Accessible keyboard navigation.
- Light/dark themes correct.
- RTL layouts correct.
- No placeholder controls.

## Gate D — Printing

- Paper size honored.
- Margins honored.
- Template rendered correctly.
- Font shaping correct.
- Output sent to intended printer.
- Errors reported accurately.

## Gate E — Reliability

- Repeated events deduplicated.
- Crash recovery tested.
- Offline recovery tested.
- Failed jobs retained.
- Retry logic bounded.
- Ambiguous outcomes represented honestly.

## Gate F — Security

- No credentials leaked.
- IPC permissions reviewed.
- Templates restricted.
- Webhook signatures verified.
- Dependencies audited.
- Logs appropriately redacted.

## Gate G — Release

- Builds succeed for supported platforms.
- Installers produced.
- Configuration persists.
- Updating does not corrupt queued work.
- Documentation complete.
- Remaining limitations disclosed.

---

# 24. IMPLEMENTATION SEQUENCE

Implement in dependency-aware phases.

## Phase 0 — Repository and requirements audit

Inspect the existing repository if one is provided.

Identify:

- Existing architecture.
- Existing implementation.
- Reusable components.
- Broken functionality.
- Missing modules.
- Dependencies.
- Tests.
- Packaging.
- Security weaknesses.

Do not discard functioning code unnecessarily.

If the repository is empty, initialize the project.

Produce an implementation plan and acceptance matrix.

## Phase 1 — Foundation

Implement:

- Rust workspace.
- Tauri 2 shell.
- React frontend.
- Shared contracts.
- SQLite database.
- Configuration.
- Logging.
- Localization.
- Design system.
- Test framework.

## Phase 2 — WooCommerce integration

Implement:

- Store connection.
- Secure credentials.
- API client.
- Order retrieval.
- Order normalization.
- Pagination.
- Polling.
- Synchronization checkpoints.

## Phase 3 — Background engine

Implement:

- Standalone agent.
- Local authenticated IPC.
- Durable event processing.
- Job scheduler.
- Restart behavior.
- Queue recovery.
- GUI-independent execution.

## Phase 4 — Printing infrastructure

Implement:

- Printer discovery.
- Capability profiles.
- Platform adapters.
- PDF printing.
- Thermal printing.
- Printer status.
- Test print.

## Phase 5 — Paper system

Implement:

- Built-in sizes.
- Custom dimensions.
- Margins.
- Orientation.
- DPI.
- Continuous roll.
- Large-format output.
- Calibration.

## Phase 6 — Rendering infrastructure

Implement:

- Declarative template schema.
- Data binding.
- Layout.
- Unicode shaping.
- Font fallback.
- PDF/raster output.
- Barcode support.
- Template packaging.

## Phase 7 — Built-in templates

Implement and test every required preset.

Recreate the supplied RTL thermal receipt as a configurable built-in template.

## Phase 8 — Visual template editor

Implement the complete drag-and-drop design experience.

## Phase 9 — Routing and automation

Implement:

- Rule engine.
- Multi-printer routing.
- Conditional printing.
- Item filtering.
- Per-printer copies.
- Retry behavior.
- Status monitoring.

## Phase 10 — Real-time relay

Implement the optional signed webhook relay, persistent delivery, device coordination, and standalone fallback.

## Phase 11 — Complete GUI

Complete:

- Dashboard.
- Printers.
- Stores.
- Orders.
- Templates.
- Routing.
- Queue.
- History.
- Reports.
- Diagnostics.
- Settings.

## Phase 12 — Multilingual validation

Complete localization resources, RTL GUI behavior, locale-specific formatting, and internationalized printing tests.

## Phase 13 — Security and reliability

Perform threat modeling, security testing, race-condition reviews, fault injection, and data integrity validation.

## Phase 14 — Packaging

Build supported installers.

Configure update signing, operating-system integrations, startup behavior, and user documentation.

## Phase 15 — Final audit

Run the complete test suite and requirement-to-implementation audit.

Fix all release-blocking issues.

Do not treat a phase as complete merely because its files exist.

---

# 25. REQUIRED DOCUMENTATION

Create Markdown documentation including:

- `README.md`
- `docs/PRODUCT_REQUIREMENTS.md`
- `docs/ARCHITECTURE.md`
- `docs/ARCHITECTURE_DECISIONS.md`
- `docs/DOMAIN_MODEL.md`
- `docs/DATABASE_SCHEMA.md`
- `docs/WOOCOMMERCE_INTEGRATION.md`
- `docs/EVENT_RELAY.md`
- `docs/PRINTING_ARCHITECTURE.md`
- `docs/PRINTER_ADAPTERS.md`
- `docs/PAPER_SIZE_SYSTEM.md`
- `docs/TEMPLATE_SCHEMA.md`
- `docs/TEMPLATE_DESIGNER.md`
- `docs/UNICODE_AND_TYPOGRAPHY.md`
- `docs/LOCALIZATION.md`
- `docs/UI_UX_DESIGN_SYSTEM.md`
- `docs/SECURITY.md`
- `docs/PRIVACY.md`
- `docs/TEST_STRATEGY.md`
- `docs/HARDWARE_COMPATIBILITY.md`
- `docs/PERFORMANCE.md`
- `docs/INSTALLATION.md`
- `docs/USER_GUIDE.md`
- `docs/TROUBLESHOOTING.md`
- `docs/CONTRIBUTING.md`
- `docs/RELEASE_PROCESS.md`
- `docs/KNOWN_LIMITATIONS.md`
- `docs/IMPLEMENTATION_STATUS.md`

Documentation must accurately reflect implemented behavior.

Do not describe planned or unsupported features as completed.

---

# 26. FINAL ACCEPTANCE SCENARIOS

The following scenarios must be covered by executable or properly documented physical acceptance tests.

## Scenario A — First installation

A user installs the application on a supported operating system.

The user connects WooCommerce, discovers a printer, chooses a template, configures paper, performs a test print, and enables automation.

## Scenario B — New order

A qualifying WooCommerce order is created.

The agent detects it, retrieves authoritative order data, generates a durable print job, renders the document, and submits it to the configured printer.

## Scenario C — Multiple printers

One order requires three documents.

Each printer receives only its assigned document with the correct template and paper format.

## Scenario D — Persian receipt

An order containing Persian customer details, an address, English product names, Persian numbers, discounts, notes, and a barcode prints correctly on a compatible 80 mm thermal printer.

## Scenario E — Hindi and Arabic

Documents containing complex Indic and Arabic text render with correct shaping and ordering.

## Scenario F — Custom small label

A user creates a 50 × 30 mm label, adds a barcode and product information, calibrates the print area, and prints it successfully on a compatible device.

## Scenario G — A4 invoice

The system generates and prints a multi-page A4 invoice with proper pagination and repeated table headers.

## Scenario H — Large-format document

A compatible large-format printer receives an A2 or larger document with the configured physical dimensions and without unintended resizing.

## Scenario I — Offline recovery

The desktop computer loses its internet connection.

Orders created during the outage are detected after reconnection according to the configured recovery policy.

## Scenario J — Application restart

The GUI closes while the background agent continues processing.

Following a system restart, queued jobs and synchronization checkpoints are recovered.

## Scenario K — Printer failure

A printer becomes unavailable.

The affected jobs remain durable.

Other printers continue processing.

The application displays actionable diagnostic information.

## Scenario L — Custom template

A user creates a new template without editing source code, publishes it, assigns it to a printer, and uses it for automatic printing.

## Scenario M — Multilingual GUI

The user changes the interface from English to Persian.

Navigation, forms, dialogs, and reading order adjust correctly.

Printer configuration and stored data remain intact.

## Scenario N — Multi-store

Two WooCommerce stores are configured with different printers, paper sizes, currencies, and template languages.

Orders remain isolated and are routed correctly.

## Scenario O — Duplicate event

Repeated webhook deliveries for one order do not produce accidental duplicate print jobs.

## Scenario P — Ambiguous print result

The agent loses contact with a printer after submission.

The job is recorded as having an uncertain outcome when physical completion cannot be proven.

The system avoids falsely claiming successful physical printing.

---

# 27. RELEASE COMPLETENESS REQUIREMENTS

The product must not be declared production-ready unless all mandatory requirements are satisfied.

### Functional completeness

- [ ] WooCommerce connectivity works.
- [ ] Multiple stores work.
- [ ] Order synchronization works.
- [ ] Durable background agent works.
- [ ] Printer discovery works.
- [ ] Standard printing works on verified platforms.
- [ ] Thermal printing works on verified devices.
- [ ] Custom paper dimensions work.
- [ ] Small/standard/large output paths are implemented.
- [ ] Template management works.
- [ ] Visual template editing works.
- [ ] RTL documents work.
- [ ] Multilingual UI resources and switching work.
- [ ] Automatic routing works.
- [ ] Print queues and retries work.
- [ ] Offline recovery works.
- [ ] Monitoring and diagnostics work.

### Technical completeness

- [ ] Code compiles.
- [ ] Rust formatting passes.
- [ ] Rust lint checks pass.
- [ ] TypeScript checks pass.
- [ ] Frontend lint checks pass.
- [ ] Unit tests pass.
- [ ] Integration tests pass.
- [ ] E2E tests pass on available environments.
- [ ] Security checks pass.
- [ ] Database migrations pass.
- [ ] Release packages build.
- [ ] Documentation is updated.

### Honest verification

Clearly distinguish:

- Implemented and automatically tested.
- Implemented and physically hardware-tested.
- Implemented but not physically verified.
- Platform-limited.
- Deferred or unsupported.
- Blocked by environmental constraints.

Never fabricate test results, hardware validation, screenshots, successful builds, or release artifacts.

---

# 28. CONTINUATION AND EXECUTION DISCIPLINE

The implementation may require multiple development iterations.

Do not reduce requirements merely because the project is large.

Maintain a durable implementation status document.

At each iteration:

1. Read the current implementation status.
2. Identify the next dependency-ready task.
3. Inspect existing code before editing.
4. Implement a coherent vertical slice.
5. Write or update tests.
6. Run available checks.
7. Review the affected integration boundaries.
8. Update documentation.
9. Record completed and incomplete work.
10. Continue with the next task.

Avoid accumulating disconnected, partially integrated components.

If execution context or time becomes limited, preserve an exact checkpoint that another agent can resume without guessing.

Do not replace missing implementation with arbitrary mock data in production code.

Mocks are allowed for automated tests and explicitly labeled demo mode.

---

# 29. FINAL DELIVERABLES

The implementation must produce:

1. Complete source code.
2. Rust workspace.
3. Tauri desktop application.
4. Independently running background printing agent.
5. React/TypeScript GUI.
6. WooCommerce integration.
7. Durable SQLite persistence.
8. Native printer adapters.
9. Universal paper-size engine.
10. Template schema and rendering engine.
11. Complete template designer.
12. Built-in template library.
13. Multilingual resources.
14. Routing-rule engine.
15. Print queue and recovery system.
16. Optional webhook relay.
17. Working automated tests.
18. Representative print fixtures.
19. Platform build configurations.
20. Comprehensive Markdown documentation.
21. Security and operational review reports.
22. Implementation traceability matrix.
23. Verified release checklist.
24. Explicit known-limitations register.

When the environment permits, generate actual release installers.

Do not claim installation packages were generated unless the relevant builds completed successfully.

---

# 30. FINAL DIRECTIVE

Your mission is to build **WooCommerce AutoPrint** as a professional, dependable, multilingual, extensible, cross-platform printing application.

The four highest-priority quality dimensions are:

**1. Printing reliability and correctness.**  
No silently lost jobs, inaccurate totals, incorrect paper dimensions, or misleading completion states.

**2. UI/UX excellence.**  
An elegant, visually compelling, consistent, highly intuitive desktop experience that nontechnical users can operate confidently.

**3. Unicode and printing fidelity.**  
Correct multilingual layout, especially Persian, Arabic, Urdu, Hindi, Chinese, Japanese, Korean, and Russian, across the supported rendering and printer pathways.

**4. Security and architectural integrity.**  
Secure credentials, validated external inputs, maintainable Rust components, independent background execution, and reliable cross-platform behavior.

Do not stop after creating a visually impressive interface.

Do not stop after implementing a basic WooCommerce API client.

Do not stop after printing to one local printer.

Do not hardcode templates, languages, paper sizes, or printer assignments.

Do not report unsupported functionality as completed.

Build the complete product systematically, verify each subsystem, integrate all components, and provide evidence supporting the final release status.

**Begin by inspecting the repository and supplied assets, establishing the architecture and requirement traceability matrix, and then proceed immediately into implementation in the dependency order specified above.**
