#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use base64::{engine::general_purpose::STANDARD, Engine};
use serde_json::{json, Value};
use std::{
    path::{Path, PathBuf},
    process::{Command, Stdio},
    time::Duration,
};
use tauri::{Manager, State};

struct Desktop {
    data: PathBuf,
    agent: PathBuf,
    renderer: PathBuf,
    fonts: PathBuf,
}
fn endpoint(data: &Path) -> Result<(u16, String), String> {
    let text = std::fs::read_to_string(data.join("ipc.json"))
        .map_err(|_| "Printing engine is offline. Start it from Diagnostics.".to_string())?;
    let value: Value = serde_json::from_str(&text).map_err(|_| "Invalid engine endpoint")?;
    let port = value["port"]
        .as_u64()
        .and_then(|n| u16::try_from(n).ok())
        .filter(|n| *n > 0)
        .ok_or("Invalid engine port")?;
    let token = value["token"]
        .as_str()
        .filter(|s| s.len() == 64)
        .ok_or("Invalid local credential")?
        .to_owned();
    Ok((port, token))
}
fn allowed(path: &str) -> bool {
    path.starts_with('/')
        && path.len() < 300
        && !path.contains("..")
        && path
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || "/_- .".contains(c))
        && [
            "/state",
            "/health",
            "/stores/",
            "/configs/",
            "/sync",
            "/discovery",
            "/preview",
            "/test-print",
            "/jobs/",
            "/artifacts/",
            "/backup",
            "/diagnostics",
            "/rules/",
            "/shutdown",
        ]
        .iter()
        .any(|p| path.starts_with(p))
}
async fn request(
    data: &Path,
    method: &str,
    path: &str,
    body: Option<Value>,
    confirm: bool,
) -> Result<reqwest::Response, String> {
    if !allowed(path) || !["GET", "POST", "PUT", "DELETE"].contains(&method) {
        return Err("Unsupported engine request".into());
    }
    let (port, token) = endpoint(data)?;
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(70))
        .redirect(reqwest::redirect::Policy::none())
        .build()
        .map_err(|_| "Cannot initialize local communication")?;
    let method = reqwest::Method::from_bytes(method.as_bytes()).map_err(|_| "Invalid method")?;
    let mut req = client
        .request(method, format!("http://127.0.0.1:{port}{path}"))
        .bearer_auth(token);
    if let Some(body) = body {
        if body.to_string().len() > 2 * 1024 * 1024 {
            return Err("Request exceeds 2 MB".into());
        }
        req = req.json(&body);
    }
    if confirm {
        req = req.header("x-confirm-reprint", "yes");
    }
    req.send()
        .await
        .map_err(|_| "Printing engine is offline or busy".into())
}
#[tauri::command]
async fn agent_request(
    state: State<'_, Desktop>,
    method: String,
    path: String,
    body: Option<Value>,
    confirm: Option<bool>,
) -> Result<Value, String> {
    let response = request(&state.data, &method, &path, body, confirm.unwrap_or(false)).await?;
    let status = response.status();
    let value: Value = response
        .json()
        .await
        .map_err(|_| "Invalid engine response")?;
    if !status.is_success() {
        return Err(value["error"]
            .as_str()
            .unwrap_or("Engine request failed")
            .into());
    }
    Ok(value)
}
#[tauri::command]
async fn artifact_data(state: State<'_, Desktop>, path: String) -> Result<String, String> {
    if !path.starts_with("/artifacts/") {
        return Err("Invalid artifact request".into());
    }
    let response = request(&state.data, "GET", &path, None, false).await?;
    if !response.status().is_success() {
        return Err("Artifact unavailable".into());
    }
    let mime = if path.ends_with(".pdf") {
        "application/pdf"
    } else {
        "image/png"
    };
    let bytes = response.bytes().await.map_err(|_| "Cannot read artifact")?;
    if bytes.len() > 50 * 1024 * 1024 {
        return Err("Artifact exceeds 50 MB".into());
    }
    Ok(format!("data:{mime};base64,{}", STANDARD.encode(bytes)))
}
fn spawn_agent(desktop: &Desktop) -> Result<(), String> {
    let mut command = Command::new(&desktop.agent);
    command
        .arg("--data-dir")
        .arg(&desktop.data)
        .arg("--renderer")
        .arg(&desktop.renderer)
        .arg("--fonts")
        .arg(&desktop.fonts)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null());
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        command.creation_flags(0x00000008 | 0x00000200 | 0x08000000);
    }
    let mut child = command
        .spawn()
        .map_err(|_| "Packaged printing engine could not start")?;
    // Reap the independently running child without tying its lifetime to the GUI.
    std::thread::spawn(move || {
        let _ = child.wait();
    });
    Ok(())
}
#[tauri::command]
async fn start_agent(state: State<'_, Desktop>) -> Result<Value, String> {
    if let Ok(response) = request(&state.data, "GET", "/health", None, false).await {
        if response.status().is_success() {
            return Ok(json!({"online":true}));
        }
    }
    spawn_agent(&state)?;
    for _ in 0..20 {
        tokio::time::sleep(Duration::from_millis(250)).await;
        if let Ok(response) = request(&state.data, "GET", "/health", None, false).await {
            if response.status().is_success() {
                return Ok(json!({"online":true}));
            }
        }
    }
    Err("Engine did not become ready. Check Diagnostics and the data directory.".into())
}
#[tauri::command]
async fn export_file(
    app: tauri::AppHandle,
    content: String,
    filename: String,
) -> Result<(), String> {
    use tauri_plugin_dialog::DialogExt;
    if content.len() > 10 * 1024 * 1024 || filename.contains(['/', '\\']) {
        return Err("Invalid export".into());
    }
    let path = app
        .dialog()
        .file()
        .set_file_name(&filename)
        .blocking_save_file()
        .ok_or("Export canceled")?;
    let path = path.into_path().map_err(|_| "Invalid selected path")?;
    tokio::fs::write(path, content)
        .await
        .map_err(|_| "Unable to save export".into())
}
#[tauri::command]
async fn import_template(app: tauri::AppHandle) -> Result<Value, String> {
    use tauri_plugin_dialog::DialogExt;
    let path = app
        .dialog()
        .file()
        .add_filter("AutoPrint template", &["autoprint-template", "json"])
        .blocking_pick_file()
        .ok_or("Import canceled")?
        .into_path()
        .map_err(|_| "Invalid selected path")?;
    let size = tokio::fs::metadata(&path)
        .await
        .map_err(|_| "Cannot read selected file")?
        .len();
    if size > 2 * 1024 * 1024 {
        return Err("Template exceeds 2 MB".into());
    }
    let bytes = tokio::fs::read(path)
        .await
        .map_err(|_| "Cannot read selected file")?;
    serde_json::from_slice(&bytes).map_err(|_| "Invalid template JSON".into())
}
fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_autostart::Builder::new().build())
        .setup(|app| {
            let data = std::env::var_os("AUTOPRINT_DATA_DIR")
                .map(PathBuf::from)
                .or_else(|| {
                    directories::ProjectDirs::from("org", "AutoPrint", "WooCommerceAutoPrint")
                        .map(|p| p.data_local_dir().to_path_buf())
                })
                .ok_or("User data directory unavailable")?;
            let root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../..");
            let executable = std::env::current_exe()?;
            let bin = executable.parent().ok_or("Runtime path unavailable")?;
            let desktop = Desktop {
                data,
                agent: if cfg!(debug_assertions) {
                    root.join("target/debug/autoprint-agent")
                } else {
                    bin.join(if cfg!(windows) {
                        "autoprint-agent.exe"
                    } else {
                        "autoprint-agent"
                    })
                },
                renderer: if cfg!(debug_assertions) {
                    root.join(".tools/bin/typst")
                } else {
                    bin.join(if cfg!(windows) {
                        "autoprint-typst.exe"
                    } else {
                        "autoprint-typst"
                    })
                },
                fonts: if cfg!(debug_assertions) {
                    root.join("assets/fonts")
                } else {
                    app.path().resource_dir()?.join("fonts")
                },
            };
            if endpoint(&desktop.data).is_err() {
                let _ = spawn_agent(&desktop);
            }
            app.manage(desktop);
            let show =
                tauri::menu::MenuItem::with_id(app, "show", "Open AutoPrint", true, None::<&str>)?;
            let quit = tauri::menu::MenuItem::with_id(
                app,
                "quit",
                "Quit window — engine stays active",
                true,
                None::<&str>,
            )?;
            let menu = tauri::menu::Menu::with_items(app, &[&show, &quit])?;
            let mut tray = tauri::tray::TrayIconBuilder::new()
                .tooltip("AutoPrint — engine runs independently")
                .menu(&menu)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "quit" => app.exit(0),
                    _ => {}
                });
            if let Some(icon) = app.default_window_icon() {
                tray = tray.icon(icon.clone());
            }
            tray.build(app)?;
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .invoke_handler(tauri::generate_handler![
            agent_request,
            artifact_data,
            start_agent,
            export_file,
            import_template
        ])
        .run(tauri::generate_context!())
        .unwrap_or_else(|error| {
            eprintln!("Desktop failed to start: {error}");
        });
}
