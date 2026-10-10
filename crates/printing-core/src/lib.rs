use anyhow::{bail, Context, Result};
use autoprint_domain::{Printer, Transport};
use serde::{Deserialize, Serialize};
use std::{
    path::{Path, PathBuf},
    time::Duration,
};
use tokio::{io::AsyncWriteExt, process::Command};

#[derive(Debug, thiserror::Error)]
#[error("{message}")]
pub struct SubmissionError {
    pub message: String,
    pub uncertain: bool,
}
#[derive(Serialize, Deserialize)]
pub struct DiscoveredPrinter {
    pub id: String,
    pub name: String,
    pub status: String,
    pub capabilities_verified: bool,
}
pub struct Submission {
    pub reference: String,
    pub physical_confirmed: bool,
}
pub async fn discover() -> Result<Vec<DiscoveredPrinter>> {
    #[cfg(unix)]
    {
        let output = Command::new("lpstat")
            .args(["-p"])
            .kill_on_drop(true)
            .output()
            .await
            .context("The OS print system is unavailable")?;
        if !output.status.success() {
            return Ok(vec![]);
        }
        Ok(String::from_utf8_lossy(&output.stdout)
            .lines()
            .filter_map(|line| {
                let mut words = line.split_whitespace();
                if words.next() != Some("printer") {
                    return None;
                }
                let id = words.next()?.to_owned();
                Some(DiscoveredPrinter {
                    id: id.clone(),
                    name: id,
                    status: if line.contains("disabled") {
                        "disabled"
                    } else {
                        "queue_available"
                    }
                    .into(),
                    capabilities_verified: false,
                })
            })
            .collect())
    }
    #[cfg(windows)]
    {
        let output = Command::new("powershell.exe")
            .args([
                "-NoProfile",
                "-NonInteractive",
                "-Command",
                "@(Get-Printer | Select-Object Name,PrinterStatus) | ConvertTo-Json -Compress",
            ])
            .output()
            .await?;
        if !output.status.success() {
            bail!("Windows printer discovery failed");
        }
        let text = String::from_utf8_lossy(&output.stdout);
        let value: serde_json::Value = serde_json::from_str(&text)?;
        let printers = value.as_array().cloned().unwrap_or_else(|| vec![value]);
        Ok(printers
            .iter()
            .filter_map(|p| {
                p["Name"].as_str().map(|name| DiscoveredPrinter {
                    id: name.into(),
                    name: name.into(),
                    status: p["PrinterStatus"].to_string(),
                    capabilities_verified: false,
                })
            })
            .collect())
    }
    #[cfg(not(any(unix, windows)))]
    {
        bail!("Printer discovery unsupported on this platform")
    }
}
pub fn raster_commands(
    width: u32,
    height: u32,
    pixels: &[u8],
    chunk_height: u32,
) -> Result<Vec<Vec<u8>>> {
    if width == 0
        || width > 4096
        || height == 0
        || height > 100000
        || chunk_height == 0
        || chunk_height > 512
        || pixels.len() != width as usize * height as usize
    {
        bail!("Raster dimensions exceed ESC/POS limits");
    }
    let bytes = width.div_ceil(8);
    let mut result = Vec::new();
    for y in (0..height).step_by(chunk_height as usize) {
        let rows = (height - y).min(chunk_height);
        let mut chunk = vec![
            0x1d,
            0x76,
            0x30,
            0,
            bytes as u8,
            (bytes >> 8) as u8,
            rows as u8,
            (rows >> 8) as u8,
        ];
        for row in y..y + rows {
            for byte in 0..bytes {
                let mut packed = 0u8;
                for bit in 0..8 {
                    let x = byte * 8 + bit;
                    if x < width && pixels[(row * width + x) as usize] < 160 {
                        packed |= 1 << (7 - bit);
                    }
                }
                chunk.push(packed);
            }
        }
        result.push(chunk);
    }
    Ok(result)
}
fn before(message: impl Into<String>) -> SubmissionError {
    SubmissionError {
        message: message.into(),
        uncertain: false,
    }
}
fn uncertain(message: impl Into<String>) -> SubmissionError {
    SubmissionError {
        message: message.into(),
        uncertain: true,
    }
}
pub async fn submit(
    printer: &Printer,
    pdf: &Path,
    pages: &[PathBuf],
    copies: u32,
    sumatra: Option<&Path>,
) -> std::result::Result<Submission, SubmissionError> {
    #[cfg(not(windows))]
    let _ = sumatra;
    printer.validate().map_err(|e| before(e.to_string()))?;
    if copies == 0 || copies > 20 {
        return Err(before("Copies must be 1–20"));
    }
    match &printer.transport {
        Transport::Pdf => Ok(Submission {
            reference: pdf.to_string_lossy().into_owned(),
            physical_confirmed: true,
        }),
        Transport::Os { queue } => {
            #[cfg(unix)]
            {
                let (w, h) = printer.paper.dimensions();
                // Dynamic roll height is delegated to the PDF page box and driver. No fabricated fixed length.
                let media =
                    h.map(|h| format!("Custom.{}x{}mm", w as f64 / 1000.0, h as f64 / 1000.0));
                let mut command = Command::new("lp");
                command
                    .arg("-d")
                    .arg(queue)
                    .arg("-n")
                    .arg(copies.to_string())
                    .args(["-o", "print-scaling=none"]);
                if let Some(media) = media {
                    command.arg("-o").arg(format!("media={media}"));
                }
                command.arg(pdf).kill_on_drop(true);
                let output = tokio::time::timeout(Duration::from_secs(30), command.output())
                    .await
                    .map_err(|_| uncertain("Print spooler acknowledgment timed out"))?
                    .map_err(|_| before("OS print command is unavailable"))?;
                if !output.status.success() {
                    return Err(uncertain(
                        "Print spooler reported an error; inspect its queue before reprinting",
                    ));
                }
                let reference = String::from_utf8_lossy(&output.stdout).trim().to_string();
                Ok(Submission {
                    reference,
                    physical_confirmed: false,
                })
            }
            #[cfg(windows)]
            {
                let Some(binary) = sumatra else {
                    return Err(before("Packaged Windows PDF print helper is unavailable"));
                };
                let output = tokio::time::timeout(
                    Duration::from_secs(60),
                    Command::new(binary)
                        .arg("-silent")
                        .arg("-print-to")
                        .arg(queue)
                        .arg("-print-settings")
                        .arg(format!("{copies}x,noscale"))
                        .arg(pdf)
                        .kill_on_drop(true)
                        .output(),
                )
                .await
                .map_err(|_| uncertain("Windows print acknowledgment timed out"))?
                .map_err(|_| before("Windows PDF print helper could not start"))?;
                if !output.status.success() {
                    return Err(uncertain(
                        "Windows PDF print helper reported an error; inspect the spooler",
                    ));
                }
                Ok(Submission {
                    reference: format!("windows-queue:{queue}"),
                    physical_confirmed: false,
                })
            }
            #[cfg(not(any(unix, windows)))]
            {
                Err(before("OS printer adapter unavailable"))
            }
        }
        Transport::Escpos { host, port, cut } => {
            // Decode and validate all pages before opening the device connection.
            let mut chunks = Vec::new();
            for path in pages {
                let data = tokio::fs::read(path)
                    .await
                    .map_err(|_| before("Raster artifact unavailable"))?;
                let image = tokio::task::spawn_blocking(move || {
                    image::load_from_memory(&data).map(|i| i.to_luma8())
                })
                .await
                .map_err(|_| before("Raster decoding failed"))?
                .map_err(|_| before("Invalid raster artifact"))?;
                chunks.extend(
                    raster_commands(image.width(), image.height(), image.as_raw(), 128)
                        .map_err(|e| before(e.to_string()))?,
                );
            }
            let mut stream = tokio::time::timeout(
                Duration::from_secs(5),
                tokio::net::TcpStream::connect((host.as_str(), *port)),
            )
            .await
            .map_err(|_| before("Thermal printer connection timed out"))?
            .map_err(|_| before("Thermal printer is offline"))?;
            for _ in 0..copies {
                write_device(&mut stream, &[0x1b, 0x40]).await?;
                for chunk in &chunks {
                    write_device(&mut stream, chunk).await?;
                }
                write_device(&mut stream, &[0x1b, 0x64, 3]).await?;
                if *cut {
                    write_device(&mut stream, &[0x1d, 0x56, 0]).await?;
                }
            }
            Ok(Submission {
                reference: format!("tcp:{host}:{port}"),
                physical_confirmed: false,
            })
        }
        Transport::Ipp { url } => {
            let endpoint = ipp_endpoint(url).map_err(|_| before("Invalid IPP/IPPS endpoint"))?;
            let pdf = tokio::fs::read(pdf)
                .await
                .map_err(|_| before("PDF artifact unavailable"))?;
            if pdf.len() > 50 * 1024 * 1024 {
                return Err(before("PDF exceeds 50 MB"));
            }
            let mut body = ipp_request(2, url, copies);
            body.extend_from_slice(&pdf);
            let client = reqwest::Client::builder()
                .redirect(reqwest::redirect::Policy::none())
                .timeout(Duration::from_secs(30))
                .build()
                .map_err(|_| before("Cannot initialize IPP transport"))?;
            let mut response = client
                .post(endpoint)
                .header("Content-Type", "application/ipp")
                .body(body)
                .send()
                .await
                .map_err(|_| {
                    uncertain("IPP acknowledgment lost; check printer jobs before reprinting")
                })?;
            if !response.status().is_success() {
                return Err(uncertain(
                    "IPP endpoint rejected the request; verify PDF support",
                ));
            }
            let mut bytes = Vec::new();
            while let Some(chunk) = response
                .chunk()
                .await
                .map_err(|_| uncertain("IPP acknowledgment interrupted"))?
            {
                if bytes.len() + chunk.len() > 1024 * 1024 {
                    return Err(uncertain("IPP acknowledgment exceeds limits"));
                }
                bytes.extend_from_slice(&chunk);
            }
            if bytes.len() < 8 || u16::from_be_bytes([bytes[2], bytes[3]]) >= 0x0400 {
                return Err(uncertain("IPP printer rejected PDF or print attributes"));
            }
            Ok(Submission {
                reference: "IPP Print-Job accepted; device completion unverified".into(),
                physical_confirmed: false,
            })
        }
    }
}
async fn write_device(
    stream: &mut tokio::net::TcpStream,
    bytes: &[u8],
) -> std::result::Result<(), SubmissionError> {
    tokio::time::timeout(Duration::from_secs(10), stream.write_all(bytes))
        .await
        .map_err(|_| uncertain("Thermal printer stalled after submission started"))?
        .map_err(|_| {
            uncertain("Thermal connection interrupted; some output may already have printed")
        })
}
fn attribute(out: &mut Vec<u8>, tag: u8, name: &str, value: &[u8]) {
    out.push(tag);
    out.extend_from_slice(&(name.len() as u16).to_be_bytes());
    out.extend_from_slice(name.as_bytes());
    out.extend_from_slice(&(value.len() as u16).to_be_bytes());
    out.extend_from_slice(value);
}
pub fn ipp_endpoint(uri: &str) -> Result<url::Url> {
    let protocol = uri.starts_with("ipp://") || uri.starts_with("ipps://");
    let converted = uri
        .replacen("ipps://", "https://", 1)
        .replacen("ipp://", "http://", 1);
    let mut endpoint = url::Url::parse(&converted)?;
    if protocol && endpoint.port().is_none() {
        endpoint
            .set_port(Some(631))
            .map_err(|_| anyhow::anyhow!("Invalid IPP port"))?;
    }
    Ok(endpoint)
}
pub fn ipp_request(operation: u16, url: &str, copies: u32) -> Vec<u8> {
    let mut out = vec![2, 0];
    out.extend_from_slice(&operation.to_be_bytes());
    out.extend_from_slice(&1u32.to_be_bytes());
    out.push(1);
    attribute(&mut out, 0x47, "attributes-charset", b"utf-8");
    attribute(&mut out, 0x48, "attributes-natural-language", b"en");
    attribute(&mut out, 0x45, "printer-uri", url.as_bytes());
    attribute(&mut out, 0x49, "document-format", b"application/pdf");
    out.push(2);
    attribute(&mut out, 0x21, "copies", &copies.to_be_bytes());
    out.push(3);
    out
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn chunks_preserve_alignment() {
        let pixels = vec![0u8; 9 * 257];
        let chunks = raster_commands(9, 257, &pixels, 128).unwrap();
        assert_eq!(chunks.len(), 3);
        assert_eq!(&chunks[0][4..8], &[2, 0, 128, 0]);
        assert_eq!(&chunks[2][4..8], &[2, 0, 1, 0]);
        assert_eq!(&chunks[0][8..10], &[255, 128]);
        assert!(raster_commands(5000, 1, &[], 128).is_err());
    }
    #[test]
    fn ipp_wire_contract() {
        assert_eq!(
            ipp_endpoint("ipps://printer.local/ipp/print")
                .unwrap()
                .as_str(),
            "https://printer.local:631/ipp/print"
        );
        let bytes = ipp_request(2, "ipps://printer.local/ipp/print", 2);
        assert_eq!(&bytes[..4], &[2, 0, 0, 2]);
        assert_eq!(bytes.last(), Some(&3));
    }
}
