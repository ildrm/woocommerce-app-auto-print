# Unicode and typography

Typst 0.15.1 performs bidi, OpenType shaping and script-aware layout. Bundled Noto Sans, Arabic, Devanagari, SC, TC, JP and KR variable fonts are pinned to a Google Fonts commit with SHA-256 manifest and OFL licenses. System fonts are disabled for repeatable output. No string reversal or legacy text encoding is used.

Numeric identifiers, phone fields, SKU/quantity and monetary values explicitly isolate LTR runs inside RTL documents. Product/customer/address text stays in the template's contextual direction. ESC/POS output rasterizes the same shaped document before transmission.

Automated generation covers en/fa/ar/hi/zh-CN/ja/ko/ru. Persistent fixtures are under fixtures/rendered. Persian and Hindi raster fixtures were visually reviewed; telephone-digit order was corrected after that review. Automated generation alone is not proof of every glyph's semantic ordering. Urdu/Traditional Chinese/diacritics, long stress text, emoji fallback, all-language golden baselines and independent linguistic review are outstanding. Hebrew/Thai coverage is not promised without appropriate fonts.

Reference: [Typst text/font fallback](https://typst.app/docs/reference/text/text/) and [open-source compiler](https://github.com/typst/typst).
