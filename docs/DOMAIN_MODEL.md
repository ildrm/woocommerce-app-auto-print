# Domain model

Store contains ID/name/HTTPS URL, poll interval, automation flag, locale and timezone. Credentials are a separate zeroized type and are not returned by configuration APIs. Order contains authoritative IDs, dates/status, billing/shipping fields, items, shipping lines, financial strings, payment information, notes and refunds. Internal notes, transaction tokens, categories and arbitrary custom metadata are not yet retrieved.

Paper geometry is integer micrometers. Printer embeds a paper profile, transport, template ID, locale, copies and enable flag. Templates contain a schema version, publication version, locale/direction and nested declarative nodes. Rules contain nested all/any/comparison conditions, an optional item condition, paid-order override, printer/template actions, copies, priority and stop behavior.

Each job embeds immutable order/printer/paper/template/store/copy snapshots and a stable identity. Automatic claims independently guard a store/order/rule output across template edits. Manual/test/reprint identities include new UUIDs. Attempts record number, state, timestamp, error and submission reference.

Domain identifiers are serialized strings at present; stronger Rust newtype wrappers remain a maintainability improvement. Monetary data remains decimal strings; rule comparisons use Decimal and JSON numeric lexical precision is preserved.
