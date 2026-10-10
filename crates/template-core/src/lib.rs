use anyhow::{bail, Result};
use autoprint_domain::{field, Node, Order, Template};
use serde_json::Value;
use std::collections::HashSet;

pub const NODE_KINDS: &[&str] = &[
    "text",
    "dynamic_field",
    "section",
    "row",
    "column",
    "stack",
    "table",
    "repeater",
    "conditional",
    "divider",
    "spacer",
    "barcode",
    "qr_code",
    "page_break",
    "page_number",
    "reprint_marker",
    "header",
    "footer",
    "shape",
];
pub fn validate(template: &Template) -> Result<()> {
    if template.schema_version != 1
        || template.version == 0
        || template.name.trim().is_empty()
        || template.name.len() > 120
        || template.id.len() > 128
        || !["ltr", "rtl"].contains(&template.direction.as_str())
    {
        bail!("Unsupported template version or invalid template properties");
    }
    if ![
        "en", "fa", "ar", "ur", "hi", "zh-CN", "zh-TW", "ja", "ko", "ru", "tr", "fr", "de", "es",
        "pt", "he", "th",
    ]
    .contains(&template.locale.as_str())
    {
        bail!("Unsupported document language");
    }
    let mut ids = HashSet::new();
    let mut count = 0;
    fn visit(nodes: &[Node], depth: u32, ids: &mut HashSet<String>, count: &mut u32) -> Result<()> {
        if depth > 12 {
            bail!("Template nesting exceeds 12 levels");
        }
        for n in nodes {
            *count += 1;
            if *count > 500 || n.id.is_empty() || !ids.insert(n.id.clone()) {
                bail!("Template contains duplicate IDs or too many elements");
            }
            if !NODE_KINDS.contains(&n.kind.as_str())
                || n.text.len() > 10000
                || n.binding.len() > 160
                || !(4..=96).contains(&n.font_size)
                || !["start", "center", "end"].contains(&n.align.as_str())
            {
                bail!("Invalid template element");
            }
            if n.width_um.is_some_and(|v| !(1000..=2_000_000).contains(&v))
                || n.height_um.is_some_and(|v| !(0..=5_000_000).contains(&v))
            {
                bail!("Element size out of range");
            }
            if !n.binding.is_empty()
                && ![
                    "order.",
                    "customer.",
                    "shipping.",
                    "totals.",
                    "item.",
                    "store.",
                ]
                .iter()
                .any(|p| n.binding.starts_with(p))
                && n.binding != "items"
            {
                bail!("Binding is outside approved document fields");
            }
            if let Some(c) = &n.condition {
                c.validate(0)?;
            }
            visit(&n.children, depth + 1, ids, count)?;
        }
        Ok(())
    }
    visit(&template.nodes, 0, &mut ids, &mut count)
}
pub fn value(ctx: &Value, binding: &str, fallback: &str) -> String {
    field(ctx, binding)
        .filter(|v| !v.is_null())
        .map(|v| {
            v.as_str()
                .map(String::from)
                .unwrap_or_else(|| v.to_string())
        })
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| fallback.into())
}
fn node(id: &str, kind: &str, text: &str, binding: &str, size: u32) -> Node {
    Node {
        id: id.into(),
        kind: kind.into(),
        text: text.into(),
        binding: binding.into(),
        children: vec![],
        condition: None,
        font_size: size,
        bold: false,
        align: "start".into(),
        locked: false,
        width_um: None,
        height_um: None,
        border: false,
    }
}
pub fn builtins() -> Vec<Template> {
    let names = [
        "Classic RTL Thermal Invoice",
        "Minimal Thermal Receipt",
        "Detailed Thermal Receipt",
        "A4 Business Invoice",
        "A5 Invoice",
        "Packing Slip",
        "Shipping Label",
        "Product Barcode Label",
        "Kitchen Order Ticket",
        "Warehouse Picking List",
        "Customer Gift Receipt",
        "Order Summary",
        "Generic Custom Document",
    ];
    names
        .iter()
        .enumerate()
        .map(|(i, name)| {
            let rtl = i == 0;
            let mut nodes = vec![
                node(
                    "brand",
                    "dynamic_field",
                    "AutoPrint Sample Store",
                    "store.name",
                    16,
                ),
                node("title", "text", name, "", 11),
                node("number", "dynamic_field", "Order", "order.number", 11),
                node(
                    "customer",
                    "dynamic_field",
                    "Customer",
                    "customer.full_name",
                    10,
                ),
                node("phone", "dynamic_field", "", "customer.phone", 10),
                node("address", "dynamic_field", "", "shipping.address", 9),
                node("divider", "divider", "", "", 10),
            ];
            nodes[0].align = "center".into();
            nodes[0].bold = true;
            if i == 7 {
                nodes = vec![
                    node("product", "dynamic_field", "Product", "item.name", 12),
                    node("sku", "barcode", "DEMO-SKU-1", "item.sku", 10),
                ];
            } else if i == 6 {
                nodes.push(node("code", "barcode", "1001", "order.number", 10));
            } else {
                nodes.push(node("items", "table", "", "items", 9));
                if ![5, 8, 9, 10].contains(&i) {
                    nodes.extend([
                        node(
                            "discount",
                            "dynamic_field",
                            "Discount",
                            "totals.discount",
                            10,
                        ),
                        node(
                            "shipping",
                            "dynamic_field",
                            "Shipping",
                            "totals.shipping",
                            10,
                        ),
                        node("total", "dynamic_field", "Total", "totals.grand_total", 13),
                    ]);
                }
                nodes.extend([
                    node("notes", "dynamic_field", "", "order.customer_note", 9),
                    node("copy", "reprint_marker", "COPY / REPRINT", "", 10),
                    node("barcode", "barcode", "1001", "order.number", 10),
                ]);
            }
            if rtl {
                nodes[1].text = "صورتحساب فروشگاه نمونه".into();
            }
            Template {
                id: format!("builtin-{}", i + 1),
                name: name.to_string(),
                schema_version: 1,
                version: 1,
                locale: if rtl { "fa" } else { "en" }.into(),
                direction: if rtl { "rtl" } else { "ltr" }.into(),
                nodes,
                archived: false,
                published: true,
            }
        })
        .collect()
}
pub fn sample_order(locale: &str) -> Order {
    let (first, last, product, address) = match locale {
        "fa" => (
            "مریم",
            "نمونه",
            "قهوه عربیکا / Coffee",
            "خیابان نمونه، پلاک ۱۲",
        ),
        "ar" => ("ليلى", "مثال", "قهوة عربية / Coffee", "شارع المثال، ١٢"),
        "hi" => ("आशा", "उदाहरण", "प्राकृतिक कॉफ़ी / Coffee", "उदाहरण मार्ग १२"),
        "zh-CN" => ("小明", "示例", "精品咖啡 / Coffee", "示例路12号"),
        "ja" => ("花子", "サンプル", "コーヒー / Coffee", "サンプル通り12"),
        "ko" => ("민지", "예시", "커피 / Coffee", "예시로 12"),
        "ru" => ("Анна", "Пример", "Кофе / Coffee", "Примерная улица 12"),
        _ => (
            "Alex",
            "Sample",
            "Arabica coffee / 250 g",
            "12 Example Street",
        ),
    };
    Order {
        id: 1001,
        number: "1001".into(),
        status: "processing".into(),
        currency: "USD".into(),
        total: "42.50".into(),
        discount_total: "2.50".into(),
        shipping_total: "5.00".into(),
        total_tax: "0.00".into(),
        date_created_gmt: "2026-10-10T09:00:00".into(),
        date_modified_gmt: "2026-10-10T09:00:00".into(),
        date_paid_gmt: Some("2026-10-10T09:00:00".into()),
        billing: serde_json::json!({"first_name":first,"last_name":last,"phone":"+1 202 555 0100"}),
        shipping: serde_json::json!({"address_1":address,"city":"Example City"}),
        line_items: vec![
            serde_json::json!({"id":1,"name":product,"sku":"DEMO-SKU-1","quantity":2,"price":"20.00","subtotal":"40.00","total":"37.50"}),
        ],
        shipping_lines: vec![],
        customer_note: "Fictional sample order · Not a sale".into(),
        payment_method_title: "Sample payment".into(),
        payment_method: "sample".into(),
        refunds: vec![],
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn all_templates_valid() {
        for t in builtins() {
            validate(&t).unwrap();
        }
    }
    #[test]
    fn imported_executable_rejected() {
        let mut t = builtins().remove(0);
        t.nodes[0].kind = "javascript".into();
        assert!(validate(&t).is_err());
    }
    #[test]
    fn missing_field_fallback() {
        assert_eq!(
            value(&serde_json::json!({}), "customer.phone", "Unknown"),
            "Unknown"
        );
    }
}
