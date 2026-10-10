use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::str::FromStr;
use thiserror::Error;

#[derive(Debug, Error)]
#[error("{0}")]
pub struct ValidationError(pub String);
pub type Result<T> = std::result::Result<T, ValidationError>;
pub fn ensure(ok: bool, message: &str) -> Result<()> {
    if ok {
        Ok(())
    } else {
        Err(ValidationError(message.into()))
    }
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct Paper {
    pub id: String,
    pub name: String,
    pub width_um: i64,
    pub height_um: Option<i64>,
    pub margins_um: [i64; 4],
    pub dpi: u32,
    #[serde(default)]
    pub landscape: bool,
    #[serde(default = "actual")]
    pub scaling: String,
    #[serde(default)]
    pub offset_um: [i64; 2],
    #[serde(default = "hundred")]
    pub scale_percent: u32,
}
fn actual() -> String {
    "actual".into()
}
fn hundred() -> u32 {
    100
}
impl Paper {
    pub fn dimensions(&self) -> (i64, Option<i64>) {
        if self.landscape {
            (self.height_um.unwrap_or(self.width_um), Some(self.width_um))
        } else {
            (self.width_um, self.height_um)
        }
    }
    pub fn validate(&self) -> Result<()> {
        ensure(
            !self.id.is_empty() && !self.name.trim().is_empty(),
            "Paper needs an ID and name",
        )?;
        ensure(
            (10_000..=2_000_000).contains(&self.width_um),
            "Paper width must be 10–2000 mm",
        )?;
        ensure(
            self.height_um
                .is_none_or(|h| (10_000..=5_000_000).contains(&h)),
            "Paper height must be 10–5000 mm",
        )?;
        ensure(
            !(self.landscape && self.height_um.is_none()),
            "Continuous media cannot be landscape",
        )?;
        ensure(
            (72..=1200).contains(&self.dpi),
            "Resolution must be 72–1200 dpi",
        )?;
        ensure(
            self.margins_um.iter().all(|m| (0..=2_000_000).contains(m)),
            "Margins must be within 0–2000 mm",
        )?;
        let (w, h) = self.dimensions();
        ensure(
            self.margins_um[1] + self.margins_um[3] < w,
            "Horizontal margins exceed paper width",
        )?;
        ensure(
            h.is_none_or(|h| self.margins_um[0] + self.margins_um[2] < h),
            "Vertical margins exceed paper height",
        )?;
        ensure(
            (10..=400).contains(&self.scale_percent),
            "Scale must be 10–400%",
        )?;
        ensure(
            self.offset_um.iter().all(|n| n.unsigned_abs() <= 50_000),
            "Calibration offset must be within 50 mm",
        )?;
        ensure(
            ["actual", "fit", "width", "crop", "custom"].contains(&self.scaling.as_str()),
            "Unknown scaling mode",
        )
    }
}
pub fn physical_um(value: &str, unit: &str) -> Result<i64> {
    let n = Decimal::from_str(value).map_err(|_| ValidationError("Invalid dimension".into()))?;
    let factor = match unit {
        "mm" => 1000,
        "cm" => 10000,
        "in" => 25400,
        _ => return Err(ValidationError("Unknown unit".into())),
    };
    let s = (n * Decimal::from(factor)).round().to_string();
    s.parse()
        .map_err(|_| ValidationError("Dimension out of range".into()))
}
pub fn dots(um: i64, dpi: u32) -> Result<u32> {
    ensure(um >= 0 && dpi <= 1200, "Invalid raster dimensions")?;
    let n = i128::from(um) * i128::from(dpi);
    u32::try_from((n + 12700) / 25400)
        .map_err(|_| ValidationError("Raster exceeds device limits".into()))
}
pub fn paper_catalog() -> Vec<Paper> {
    let mut sizes = vec![
        ("A0", 841000, Some(1189000)),
        ("A1", 594000, Some(841000)),
        ("A2", 420000, Some(594000)),
        ("A3", 297000, Some(420000)),
        ("A4", 210000, Some(297000)),
        ("A5", 148000, Some(210000)),
        ("A6", 105000, Some(148000)),
        ("A7", 74000, Some(105000)),
        ("Letter", 215900, Some(279400)),
        ("Legal", 215900, Some(355600)),
        ("Tabloid", 279400, Some(431800)),
        ("Ledger", 431800, Some(279400)),
        ("4 × 6 inch", 101600, Some(152400)),
        ("2 × 1 inch", 50800, Some(25400)),
        ("100 × 150 mm", 100000, Some(150000)),
        ("50 × 30 mm", 50000, Some(30000)),
    ];
    sizes.extend([
        ("58 mm roll", 58000, None),
        ("80 mm roll", 80000, None),
        ("112 mm roll", 112000, None),
    ]);
    sizes
        .into_iter()
        .map(|(name, w, h)| Paper {
            id: name.into(),
            name: name.into(),
            width_um: w,
            height_um: h,
            margins_um: if w < 120000 { [2000; 4] } else { [10000; 4] },
            dpi: if h.is_none() { 203 } else { 300 },
            landscape: false,
            scaling: actual(),
            offset_um: [0; 2],
            scale_percent: 100,
        })
        .collect()
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Store {
    pub id: String,
    pub name: String,
    pub url: String,
    #[serde(default = "poll_interval")]
    pub poll_seconds: u64,
    #[serde(default)]
    pub automation: bool,
    #[serde(default = "english")]
    pub locale: String,
    #[serde(default = "utc")]
    pub timezone: String,
}
fn poll_interval() -> u64 {
    30
}
fn english() -> String {
    "en".into()
}
fn utc() -> String {
    "UTC".into()
}
impl Store {
    pub fn validate(&self) -> Result<()> {
        let u = url::Url::parse(&self.url)
            .map_err(|_| ValidationError("Enter a valid store URL".into()))?;
        ensure(
            u.scheme() == "https" && u.host_str().is_some(),
            "Stores require HTTPS",
        )?;
        ensure(
            u.username().is_empty()
                && u.password().is_none()
                && u.query().is_none()
                && u.fragment().is_none(),
            "Store URLs cannot contain credentials, queries, or fragments",
        )?;
        ensure(
            (10..=3600).contains(&self.poll_seconds),
            "Sync interval must be 10–3600 seconds",
        )?;
        ensure(
            !self.name.trim().is_empty() && self.name.len() <= 120,
            "Enter a store name of at most 120 characters",
        )
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Order {
    pub id: u64,
    pub number: String,
    pub status: String,
    pub currency: String,
    pub total: String,
    #[serde(default)]
    pub discount_total: String,
    #[serde(default)]
    pub shipping_total: String,
    #[serde(default)]
    pub total_tax: String,
    #[serde(default)]
    pub date_created_gmt: String,
    #[serde(default)]
    pub date_modified_gmt: String,
    #[serde(default)]
    pub date_paid_gmt: Option<String>,
    #[serde(default)]
    pub billing: Value,
    #[serde(default)]
    pub shipping: Value,
    #[serde(default)]
    pub line_items: Vec<Value>,
    #[serde(default)]
    pub shipping_lines: Vec<Value>,
    #[serde(default)]
    pub customer_note: String,
    #[serde(default)]
    pub payment_method_title: String,
    #[serde(default)]
    pub payment_method: String,
    #[serde(default)]
    pub refunds: Vec<Value>,
}
impl Order {
    pub fn validate(&self) -> Result<()> {
        ensure(
            self.id > 0
                && self.id <= i64::MAX as u64
                && self.number.len() < 128
                && self.line_items.len() <= 1000,
            "Invalid order identity or excessive items",
        )?;
        Decimal::from_str(&self.total)
            .map_err(|_| ValidationError("Invalid authoritative order total".into()))?;
        ensure(self.currency.len() == 3, "Invalid currency")
    }
    pub fn paid(&self) -> bool {
        self.date_paid_gmt.as_ref().is_some_and(|s| !s.is_empty())
    }
    pub fn context(&self, reprint: bool) -> Value {
        let full_name = format!(
            "{} {}",
            self.billing["first_name"].as_str().unwrap_or(""),
            self.billing["last_name"].as_str().unwrap_or("")
        );
        let address = [
            "address_1",
            "address_2",
            "city",
            "state",
            "postcode",
            "country",
        ]
        .iter()
        .filter_map(|k| self.shipping[*k].as_str())
        .filter(|s| !s.is_empty())
        .collect::<Vec<_>>()
        .join(", ");
        serde_json::json!({"order": self,"customer":{"full_name":full_name.trim(),"phone":self.billing["phone"]},"shipping":{"address":address},"items":self.line_items,"totals":{"grand_total":self.total,"discount":self.discount_total,"shipping":self.shipping_total,"tax":self.total_tax},"reprint":reprint})
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum Condition {
    All {
        conditions: Vec<Condition>,
    },
    Any {
        conditions: Vec<Condition>,
    },
    Compare {
        field: String,
        op: String,
        value: Value,
    },
}
pub fn field<'a>(ctx: &'a Value, path: &str) -> Option<&'a Value> {
    if path.len() > 160
        || path.split('.').any(|p| {
            p.is_empty()
                || p.starts_with('_')
                || p == "constructor"
                || p == "prototype"
                || p == "__proto__"
        })
    {
        return None;
    }
    path.split('.').try_fold(ctx, |v, k| v.get(k))
}
impl Condition {
    pub fn validate(&self, depth: u32) -> Result<()> {
        ensure(depth <= 8, "Conditions exceed nesting limit")?;
        match self {
            Self::All { conditions } | Self::Any { conditions } => {
                ensure(conditions.len() <= 32, "Too many conditions")?;
                for c in conditions {
                    c.validate(depth + 1)?;
                }
                Ok(())
            }
            Self::Compare { field, op, .. } => ensure(
                field.len() <= 160
                    && ["eq", "ne", "contains", "gt", "gte", "lt", "lte", "exists"]
                        .contains(&op.as_str()),
                "Invalid condition field or operator",
            ),
        }
    }
    pub fn matches(&self, ctx: &Value) -> bool {
        match self {
            Self::All { conditions } => conditions.iter().all(|c| c.matches(ctx)),
            Self::Any { conditions } => conditions.iter().any(|c| c.matches(ctx)),
            Self::Compare {
                field: path,
                op,
                value,
            } => {
                let v = field(ctx, path);
                if op == "exists" {
                    return v.is_some_and(|v| !v.is_null());
                }
                let Some(v) = v else {
                    return false;
                };
                match op.as_str() {
                    "eq" => v == value,
                    "ne" => v != value,
                    "contains" => {
                        v.as_str()
                            .zip(value.as_str())
                            .is_some_and(|(a, b)| a.contains(b))
                            || v.as_array().is_some_and(|a| a.contains(value))
                    }
                    _ => {
                        let parse = |v: &Value| {
                            Decimal::from_str(v.as_str().unwrap_or(&v.to_string())).ok()
                        };
                        parse(v)
                            .zip(parse(value))
                            .is_some_and(|(a, b)| match op.as_str() {
                                "gt" => a > b,
                                "gte" => a >= b,
                                "lt" => a < b,
                                "lte" => a <= b,
                                _ => false,
                            })
                    }
                }
            }
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Rule {
    pub id: String,
    pub name: String,
    pub store_id: String,
    pub printer_id: String,
    pub template_id: String,
    pub condition: Condition,
    #[serde(default)]
    pub item_condition: Option<Condition>,
    #[serde(default)]
    pub enabled: bool,
    #[serde(default)]
    pub allow_unpaid: bool,
    #[serde(default)]
    pub priority: i32,
    #[serde(default)]
    pub stop: bool,
    #[serde(default = "one")]
    pub copies: u32,
}
fn one() -> u32 {
    1
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum Transport {
    Pdf,
    Os {
        queue: String,
    },
    Ipp {
        url: String,
    },
    Escpos {
        host: String,
        port: u16,
        #[serde(default)]
        cut: bool,
    },
}
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Printer {
    pub id: String,
    pub name: String,
    pub transport: Transport,
    pub paper: Paper,
    pub template_id: String,
    #[serde(default = "yes")]
    pub enabled: bool,
    #[serde(default = "english")]
    pub locale: String,
    #[serde(default = "one")]
    pub copies: u32,
}
fn yes() -> bool {
    true
}
impl Printer {
    pub fn validate(&self) -> Result<()> {
        self.paper.validate()?;
        ensure(
            !self.name.trim().is_empty() && self.name.len() <= 120,
            "Enter a printer name",
        )?;
        ensure((1..=20).contains(&self.copies), "Copies must be 1–20")?;
        match &self.transport {
            Transport::Os { queue } => ensure(
                !queue.is_empty()
                    && queue.len() <= 128
                    && queue
                        .chars()
                        .all(|c| c.is_alphanumeric() || "_-. ".contains(c)),
                "Invalid OS queue identifier",
            ),
            Transport::Escpos { host, port, .. } => ensure(
                !host.is_empty()
                    && host.len() <= 253
                    && *port > 0
                    && !host.contains(['/', ':', '@']),
                "Enter a printer hostname and valid port",
            ),
            Transport::Ipp { url } => {
                let u =
                    url::Url::parse(url).map_err(|_| ValidationError("Invalid IPP URL".into()))?;
                ensure(
                    ["https", "http", "ipp", "ipps"].contains(&u.scheme())
                        && u.host_str().is_some()
                        && u.username().is_empty()
                        && u.password().is_none(),
                    "Use an IPP/IPPS printer endpoint without credentials",
                )
            }
            Transport::Pdf => Ok(()),
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Node {
    pub id: String,
    pub kind: String,
    #[serde(default)]
    pub text: String,
    #[serde(default)]
    pub binding: String,
    #[serde(default)]
    pub children: Vec<Node>,
    #[serde(default)]
    pub condition: Option<Condition>,
    #[serde(default = "default_size")]
    pub font_size: u32,
    #[serde(default)]
    pub bold: bool,
    #[serde(default = "start")]
    pub align: String,
    #[serde(default)]
    pub locked: bool,
    #[serde(default)]
    pub width_um: Option<i64>,
    #[serde(default)]
    pub height_um: Option<i64>,
    #[serde(default)]
    pub border: bool,
}
fn default_size() -> u32 {
    10
}
fn start() -> String {
    "start".into()
}
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Template {
    pub id: String,
    pub name: String,
    pub schema_version: u32,
    pub version: u32,
    pub locale: String,
    pub direction: String,
    pub nodes: Vec<Node>,
    #[serde(default)]
    pub archived: bool,
    #[serde(default)]
    pub published: bool,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct JobSnapshot {
    pub order: Order,
    pub printer: Printer,
    pub template: Template,
    pub store_name: String,
    pub store_id: String,
    pub copies: u32,
    pub reprint: bool,
    #[serde(default)]
    pub routing_id: Option<String>,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Job {
    pub id: String,
    pub identity: String,
    pub state: String,
    pub snapshot: JobSnapshot,
    pub created_at: String,
    pub updated_at: String,
    pub attempts: i64,
    pub next_attempt: String,
    pub error: Option<String>,
    pub submission_ref: Option<String>,
}
pub fn transition_allowed(from: &str, to: &str) -> bool {
    matches!(
        (from, to),
        ("queued", "rendering")
            | ("retry_scheduled", "rendering")
            | ("rendering", "ready")
            | ("rendering", "retry_scheduled")
            | ("rendering", "failed")
            | ("ready", "submitting")
            | ("submitting", "submitted")
            | ("submitting", "completed")
            | ("submitting", "outcome_uncertain")
            | ("submitting", "retry_scheduled")
            | ("submitting", "failed")
            | ("failed", "queued")
            | ("retry_scheduled", "queued")
            | ("queued", "canceled")
            | ("retry_scheduled", "canceled")
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn exact_units() {
        assert_eq!(physical_um("4", "in").unwrap(), 101600);
        assert_eq!(physical_um("2.54", "cm").unwrap(), 25400);
        assert_eq!(dots(25400, 203).unwrap(), 203);
    }
    #[test]
    fn paper_bounds() {
        for p in paper_catalog() {
            p.validate().unwrap();
        }
        let mut p = paper_catalog()[4].clone();
        p.margins_um = [200000; 4];
        assert!(p.validate().is_err());
    }
    #[test]
    fn hostile_geometry_is_rejected_without_overflow() {
        let mut paper = paper_catalog().remove(4);
        paper.margins_um = [i64::MAX; 4];
        assert!(paper.validate().is_err());
        paper.margins_um = [2000; 4];
        paper.offset_um = [i64::MIN, 0];
        assert!(paper.validate().is_err());
    }
    #[test]
    fn state_honesty() {
        assert!(!transition_allowed("submitted", "completed"));
        assert!(!transition_allowed("outcome_uncertain", "queued"));
        assert!(transition_allowed("submitting", "outcome_uncertain"));
    }
    #[test]
    fn decimal_comparison() {
        let c = Condition::Compare {
            field: "total".into(),
            op: "gt".into(),
            value: serde_json::json!("9007199254740992.01"),
        };
        assert!(c.matches(&serde_json::json!({"total":"9007199254740992.02"})));
        assert!(field(&serde_json::json!({}), "__proto__.foo").is_none());
    }
}
