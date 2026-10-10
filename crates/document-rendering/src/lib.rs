use anyhow::{bail, Context, Result};
use autoprint_domain::{JobSnapshot, Node};
use autoprint_template_core::{validate, value};
use serde_json::Value;
use std::{
    path::{Path, PathBuf},
    time::Duration,
};
use tokio::process::Command;

#[derive(Clone)]
pub struct Renderer {
    pub binary: PathBuf,
    pub fonts: PathBuf,
    pub artifacts: PathBuf,
}
#[derive(Clone)]
pub struct Artifact {
    pub pdf: PathBuf,
    pub pages: Vec<PathBuf>,
}
pub fn quoted(s: &str) -> String {
    let mut out = String::from("\"");
    for c in s.chars() {
        match c {
            '\\' => out.push_str("\\\\"),
            '"' => out.push_str("\\\""),
            '\n' => out.push_str("\\n"),
            '\r' => {}
            '\t' => out.push_str("\\t"),
            c if c.is_control() => {}
            c => out.push(c),
        }
    }
    out.push('"');
    out
}
fn mm(um: i64) -> String {
    format!("{}.{:03}mm", um / 1000, um.abs() % 1000)
}
fn barcode_svg(data: &str) -> Result<String> {
    if data.is_empty() || data.len() > 80 || !data.chars().all(|c| c.is_ascii_graphic() || c == ' ')
    {
        bail!("Code 128 needs 1–80 printable ASCII characters");
    }
    let encoded = barcoders::sym::code128::Code128::new(format!("Ɓ{data}"))
        .map_err(|_| anyhow::anyhow!("Invalid Code 128 data"))?
        .encode();
    let width = encoded.len() + 20;
    let bars = encoded
        .iter()
        .enumerate()
        .filter(|(_, b)| **b == 1)
        .map(|(i, _)| format!("<rect x=\"{}\" y=\"0\" width=\"1\" height=\"40\"/>", i + 10))
        .collect::<String>();
    Ok(format!("<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"{width}\" height=\"40\" viewBox=\"0 0 {width} 40\"><rect width=\"100%\" height=\"100%\" fill=\"white\"/><g fill=\"black\">{bars}</g></svg>"))
}
struct Compiler {
    assets: Vec<(String, String)>,
    sequence: u32,
}
impl Compiler {
    fn nodes(&mut self, nodes: &[Node], ctx: &Value) -> Result<String> {
        nodes
            .iter()
            .map(|n| self.node(n, ctx))
            .collect::<Result<Vec<_>>>()
            .map(|v| v.join("\n"))
    }
    fn node(&mut self, n: &Node, ctx: &Value) -> Result<String> {
        if n.condition.as_ref().is_some_and(|c| !c.matches(ctx)) {
            return Ok(String::new());
        }
        let content = value(ctx, &n.binding, &n.text);
        let align = match n.align.as_str() {
            "center" => "center",
            "end" => "end",
            _ => "start",
        };
        let style = format!(
            "size: {}pt, weight: {}",
            n.font_size,
            if n.bold { "\"bold\"" } else { "\"regular\"" }
        );
        let rendered = match n.kind.as_str() {
            "text" | "dynamic_field" => {
                let isolate_ltr = n.binding == "customer.phone"
                    || n.binding.starts_with("totals.")
                    || [
                        "order.number",
                        "order.date_created_gmt",
                        "order.date_modified_gmt",
                        "item.sku",
                        "item.quantity",
                    ]
                    .contains(&n.binding.as_str());
                let direction = if isolate_ltr { "dir: ltr," } else { "" };
                let label = if n.kind == "dynamic_field"
                    && !n.text.is_empty()
                    && n.binding != "store.name"
                    && content != n.text
                {
                    format!("#text({style}, {}) ", quoted(&format!("{}: ", n.text)))
                } else {
                    String::new()
                };
                format!(
                    "#align({align})[{label}#text({style}, {direction} {})]",
                    quoted(&content)
                )
            }
            "divider" => "#line(length: 100%, stroke: 0.5pt)".into(),
            "spacer" => format!("#v({})", mm(n.height_um.unwrap_or(3000))),
            "page_break" => "#pagebreak()".into(),
            "page_number" => "#context counter(page).display()".into(),
            "reprint_marker" => {
                if ctx["reprint"] == true {
                    format!("#text(weight: \"bold\",{})", quoted(&n.text))
                } else {
                    String::new()
                }
            }
            "barcode" | "qr_code" => {
                self.sequence += 1;
                let name = format!("code-{}.svg", self.sequence);
                let svg = if n.kind == "barcode" {
                    barcode_svg(&content)?
                } else {
                    if content.len() > 2048 {
                        bail!("QR data exceeds 2048 bytes");
                    }
                    qrcode::QrCode::new(content.as_bytes())
                        .map_err(|_| anyhow::anyhow!("Invalid QR data"))?
                        .render::<qrcode::render::svg::Color>()
                        .min_dimensions(200, 200)
                        .build()
                };
                self.assets.push((name.clone(), svg));
                format!(
                    "#align(center)[#image({}, width: {}, height: {})]",
                    quoted(&name),
                    n.width_um
                        .map(mm)
                        .unwrap_or_else(|| if n.kind == "barcode" {
                            "85%".into()
                        } else {
                            "25mm".into()
                        }),
                    mm(n.height_um
                        .unwrap_or(if n.kind == "barcode" { 12000 } else { 25000 }))
                )
            }
            "table" => {
                let items = ctx["items"].as_array().map(Vec::as_slice).unwrap_or(&[]);
                let rtl = ctx["document_rtl"] == true;
                let labels = if ctx["document_locale"] == "ar" {
                    ["الصنف", "الكمية", "السعر", "المجموع"]
                } else if rtl {
                    ["کالا", "تعداد", "قیمت", "جمع"]
                } else {
                    ["Item", "Qty", "Price", "Total"]
                };
                let mut table=format!("#set text(size: {}pt)\n#table(columns: (1fr,auto,auto,auto), inset: 2pt, stroke: (bottom: 0.3pt), table.header(repeat: true, {}),",n.font_size,labels.map(|l|format!("[#strong({})]",quoted(l))).join(","));
                for item in items {
                    for key in ["name", "quantity", "price", "total"] {
                        let cell = item[key].as_str().map(String::from).unwrap_or_else(|| {
                            if item[key].is_null() {
                                "".into()
                            } else {
                                item[key].to_string()
                            }
                        });
                        let dir = if key == "name" { "" } else { "dir: ltr," };
                        table.push_str(&format!("[#text({dir}{})],", quoted(&cell)));
                    }
                }
                table.push(')');
                table
            }
            "repeater" => {
                let items = ctx["items"].as_array().map(Vec::as_slice).unwrap_or(&[]);
                let mut out = String::new();
                for item in items {
                    let mut child = ctx.clone();
                    child["item"] = item.clone();
                    out.push_str(&self.nodes(&n.children, &child)?);
                }
                out
            }
            "row" => {
                let cells = n
                    .children
                    .iter()
                    .map(|child| self.node(child, ctx).map(|s| format!("[{s}]")))
                    .collect::<Result<Vec<_>>>()?;
                format!(
                    "#grid(columns: {}, gutter: 2mm, {})",
                    cells.len().max(1),
                    cells.join(",")
                )
            }
            "shape" => format!(
                "#rect(width: {}, height: {}, stroke: 0.5pt)",
                n.width_um.map(mm).unwrap_or("100%".into()),
                mm(n.height_um.unwrap_or(10000))
            ),
            _ => self.nodes(&n.children, ctx)?,
        };
        let border = if n.border {
            "stroke: 0.5pt, inset: 2mm,"
        } else {
            ""
        };
        Ok(format!(
            "#block(width: 100%, {border})[{rendered}]\n#v(1.5mm)"
        ))
    }
}
pub fn source(snapshot: &JobSnapshot) -> Result<(String, Vec<(String, String)>)> {
    validate(&snapshot.template)?;
    snapshot.printer.paper.validate()?;
    snapshot.order.validate()?;
    let paper = &snapshot.printer.paper;
    let (w, h) = paper.dimensions();
    if paper.scaling != "actual" || paper.scale_percent != 100 {
        bail!("This renderer currently supports actual-size output; other scaling modes require validation");
    }
    let mut ctx = snapshot.order.context(snapshot.reprint);
    ctx["store"] = serde_json::json!({"name":snapshot.store_name});
    ctx["document_rtl"] = serde_json::json!(snapshot.template.direction == "rtl");
    ctx["document_locale"] = serde_json::json!(snapshot.template.locale);
    if let Some(item) = snapshot.order.line_items.first() {
        ctx["item"] = item.clone();
    }
    let mut compiler = Compiler {
        assets: vec![],
        sequence: 0,
    };
    let body = compiler.nodes(&snapshot.template.nodes, &ctx)?;
    let language = snapshot.template.locale.split('-').next().unwrap_or("en");
    let mut m = paper.margins_um;
    m[0] += paper.offset_um[1];
    m[1] -= paper.offset_um[0];
    m[2] -= paper.offset_um[1];
    m[3] += paper.offset_um[0];
    if m.iter().any(|v| *v < 0) {
        bail!("Calibration offsets extend beyond the paper margins");
    }
    let header=format!("#set page(width: {},height: {},margin:(top:{},right:{},bottom:{},left:{}))\n#set text(font: (\"Noto Sans\",\"Noto Sans Arabic\",\"Noto Sans Devanagari\",\"Noto Sans SC\",\"Noto Sans TC\",\"Noto Sans JP\",\"Noto Sans KR\"),size:10pt,lang:{},dir:{})\n#set par(leading:0.6em)\n",mm(w),h.map(mm).unwrap_or("auto".into()),mm(m[0]),mm(m[1]),mm(m[2]),mm(m[3]),quoted(language),snapshot.template.direction);
    Ok((format!("{header}{body}"), compiler.assets))
}
impl Renderer {
    async fn compile(&self, dir: &Path, output: &str, dpi: u32) -> Result<()> {
        let result = tokio::time::timeout(
            Duration::from_secs(60),
            Command::new(&self.binary)
                .arg("compile")
                .arg("--root")
                .arg(dir)
                .arg("--font-path")
                .arg(&self.fonts)
                .arg("--ignore-system-fonts")
                .arg("--ppi")
                .arg(dpi.to_string())
                .arg(dir.join("document.typ"))
                .arg(dir.join(output))
                .kill_on_drop(true)
                .output(),
        )
        .await
        .context("Document rendering exceeded 60 seconds")?
        .context("Document renderer is unavailable; install the packaged runtime")?;
        if !result.status.success() {
            bail!("Document could not be rendered; check template properties");
        }
        Ok(())
    }
    pub async fn render(&self, id: &str, snapshot: &JobSnapshot) -> Result<Artifact> {
        if uuid::Uuid::parse_str(id).is_err() {
            bail!("Invalid artifact identifier");
        }
        let dir = self.artifacts.join(id);
        tokio::fs::create_dir_all(&dir).await?;
        let (source, assets) = source(snapshot)?;
        tokio::fs::write(dir.join("document.typ"), source).await?;
        for (name, data) in assets {
            tokio::fs::write(dir.join(name), data).await?;
        }
        self.compile(&dir, "document.pdf", 96).await?;
        let dpi = if matches!(
            snapshot.printer.transport,
            autoprint_domain::Transport::Escpos { .. }
        ) {
            snapshot.printer.paper.dpi
        } else {
            96
        };
        let (w, h) = snapshot.printer.paper.dimensions();
        if i128::from(w) * i128::from(h.unwrap_or(500000)) * i128::from(dpi).pow(2)
            / 25400_i128.pow(2)
            > 40_000_000
        {
            bail!("Raster preview exceeds 40 megapixels; reduce resolution");
        }
        self.compile(&dir, "page-{p}.png", dpi).await?;
        let mut pages = Vec::new();
        let mut entries = tokio::fs::read_dir(&dir).await?;
        while let Some(e) = entries.next_entry().await? {
            let name = e.file_name().to_string_lossy().into_owned();
            if name.starts_with("page-") && name.ends_with(".png") {
                if e.metadata().await?.len() > 40 * 1024 * 1024 {
                    bail!("Raster artifact exceeds 40 MB");
                }
                pages.push(e.path());
            }
        }
        if pages.len() > 100 {
            bail!("Document exceeds 100 pages");
        }
        pages.sort_by_key(|p| {
            p.file_stem()
                .and_then(|s| s.to_str())
                .and_then(|s| s.strip_prefix("page-"))
                .and_then(|s| s.parse::<u32>().ok())
                .unwrap_or(0)
        });
        if pages.is_empty() {
            bail!("Renderer produced no pages");
        }
        Ok(Artifact {
            pdf: dir.join("document.pdf"),
            pages,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn source_injection_is_literal() {
        assert_eq!(
            quoted("\" #read(\"/etc/passwd\")"),
            "\"\\\" #read(\\\"/etc/passwd\\\")\""
        );
        assert!(barcode_svg("1001").unwrap().contains("<svg"));
        assert!(barcode_svg("شماره").is_err());
    }
    #[tokio::test]
    async fn actual_unicode_artifacts() {
        let root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../..");
        let directory = tempfile::tempdir().unwrap();
        let renderer = Renderer {
            binary: root.join(if cfg!(windows) {
                ".tools/bin/typst.exe"
            } else {
                ".tools/bin/typst"
            }),
            fonts: root.join("assets/fonts"),
            artifacts: directory.path().into(),
        };
        assert!(
            renderer.binary.exists(),
            "Install the pinned renderer before running integration tests"
        );
        for locale in ["en", "fa", "ar", "hi", "zh-CN", "ja", "ko", "ru"] {
            let mut template = autoprint_template_core::builtins().remove(2);
            template.locale = locale.into();
            template.direction = if ["fa", "ar"].contains(&locale) {
                "rtl"
            } else {
                "ltr"
            }
            .into();
            let printer = autoprint_domain::Printer {
                id: "test".into(),
                name: "PDF".into(),
                transport: autoprint_domain::Transport::Pdf,
                paper: autoprint_domain::paper_catalog().remove(17),
                template_id: template.id.clone(),
                enabled: true,
                locale: locale.into(),
                copies: 1,
            };
            let snapshot = JobSnapshot {
                order: autoprint_template_core::sample_order(locale),
                printer,
                template,
                store_name: "Fictional sample".into(),
                store_id: "sample".into(),
                copies: 1,
                reprint: false,
                routing_id: None,
            };
            let artifact = renderer
                .render(&uuid::Uuid::new_v4().to_string(), &snapshot)
                .await
                .unwrap();
            let bytes = tokio::fs::read(artifact.pdf).await.unwrap();
            assert!(bytes.starts_with(b"%PDF-"));
            assert!(!artifact.pages.is_empty());
        }
    }
}
