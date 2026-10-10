# Localization

UI messages are externalized in apps/desktop/src/i18n.ts. Thirteen locale resources are declared, and Settings reports actual translation-key coverage. English is complete for the currently implemented interface; Persian has substantial coverage, while other locales have selected translations with explicit English fallback. Non-English resources have not received complete independent human review.

Persian/Arabic switch document root direction, mirror logical CSS layout, preserve stored engine data and use mixed-direction fields. Native tray labels, some diagnostics/property names and bootstrap failure strings still need localization. Pluralization/context tooling and full translations are incomplete.

UI language/theme persist locally and are also saved in engine settings. Store locale, template locale and printer document locale are separate records. Printer locale controls generated output direction; arbitrary literal custom-template text is not machine-translated. Timezone/calendar/numeral/currency display configuration beyond current exact values remains unfinished.
