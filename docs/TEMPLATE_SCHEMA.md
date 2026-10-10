# Template schema

`.autoprint-template` is currently a bounded JSON document, not an archive. Schema version 1 contains ID/name, version, locale, direction, publication/archive flags and nodes. Nodes carry kind, text, approved binding, children, optional typed condition, font size, weight, alignment, lock, dimensions and border. Import assigns a new ID; publication assigns the next persistent version.

Supported nodes: text, dynamic_field, section, row, column, stack, table, repeater, conditional, divider, spacer, barcode, qr_code, page_break, page_number, reprint_marker, header, footer and shape. Header/footer currently behave as flow containers, not repeating page masters. Rich text, remote images, assets, arbitrary code and archived font packages are not accepted.

Validation limits templates to 500 unique nodes, 12 nesting levels, 10,000 text bytes/element, 160-character bindings and 4–96pt fonts. Bindings are limited to order/customer/shipping/totals/item/store fields and items. Protected/prototype paths are blocked. Conditions use all/any/comparison ASTs; no eval, shell, SQL or imported Typst execution occurs.

Code128 accepts 1–80 printable ASCII characters and uses a quiet zone. QR payloads are bounded to 2048 bytes. PNG/PDF artifacts derive from the same validated source. Template migration/version compatibility beyond schema 1 and portable asset archives remain future work.
