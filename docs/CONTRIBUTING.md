# Contributing

Read the optimized brief, original requirements, architecture, matrix and known limitations first. Preserve existing changes and maintain integration boundaries. Add migrations rather than editing released ones. Use fictional fixtures and mark all hardware results honestly.

Format Rust with cargo fmt and TypeScript/CSS with Prettier. Require clippy with warnings denied, TypeScript/ESLint/build checks, meaningful unit/integration tests, and available browser acceptance. Imported data must remain declarative; do not add eval, arbitrary code/resource loading or unrestricted IPC.

Never equate transport acceptance to physical completion. Keep automatic claims/watermarks durable, maintain immutable snapshots, record attempts before hardware effects and fail ambiguous submissions into review. Document any new dependency's source/version/license/platform behavior/advisories.

For next work, consult IMPLEMENTATION_STATUS.md rather than assuming directory names imply completion. Required features still need evidence and review before release.
