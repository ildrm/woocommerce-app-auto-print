# UI and UX design system

The generated concept is DESIGN_CONCEPT.png. The implementation uses white content surfaces, a cool gray navigation rail, ink typography, restrained teal actions/mint setup surfaces, fine separators and consistent 5–6px control/panel radii. CSS variables define light/dark semantic colors; system mode follows the OS. Noto fonts provide local multilingual coverage.

Operational dashboard columns, three-step setup band, queue table/checklist and activity strip follow the concept. Remaining screens reuse controls, field grids, tables, profile rows, dialogs and the editor's panels. Forms have explicit accessible naming. Native dialog semantics provide focus trapping and Escape dismissal. Visible focus styles and reduced-motion handling are included.

Browser verification used isolated headless Google Chrome because the browser connector reported no surfaces, and the Playwright browser download was denied by its CDN in this location. Desktop 1536×1024 and mobile 390×844 were checked. RTL behavior was exercised. Full screen-reader/high-contrast/WCAG audit is still outstanding.

See VISUAL_REVIEW.md for comparison evidence and intentional differences.
