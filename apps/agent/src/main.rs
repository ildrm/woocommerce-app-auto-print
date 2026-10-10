use anyhow::{bail, Context, Result};
use autoprint_application::Application;
use autoprint_document_rendering::Renderer;
use autoprint_persistence::Repository;
use fs2::FileExt;
use std::{collections::BTreeMap, fs::OpenOptions, path::PathBuf, sync::Arc};
use tokio::sync::{Mutex, Notify};

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter("autoprint=info")
        .with_target(false)
        .init();
    let args = std::env::args().collect::<Vec<_>>();
    let option = |name: &str| {
        args.iter()
            .position(|a| a == name)
            .and_then(|i| args.get(i + 1))
            .map(PathBuf::from)
    };
    let data = option("--data-dir")
        .or_else(|| std::env::var_os("AUTOPRINT_DATA_DIR").map(PathBuf::from))
        .or_else(|| {
            directories::ProjectDirs::from("org", "AutoPrint", "WooCommerceAutoPrint")
                .map(|p| p.data_local_dir().to_path_buf())
        })
        .context("Cannot locate user data directory")?;
    autoprint_security::private_directory(&data)?;
    let lock = OpenOptions::new()
        .read(true)
        .write(true)
        .create(true)
        .truncate(false)
        .open(data.join("agent.lock"))?;
    lock.try_lock_exclusive()
        .context("AutoPrint Agent is already running for this data directory")?;
    let root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../..");
    let executable = std::env::current_exe()?;
    let bin = executable.parent().context("Cannot locate runtime")?;
    let renderer = option("--renderer")
        .or_else(|| std::env::var_os("AUTOPRINT_RENDERER").map(PathBuf::from))
        .unwrap_or_else(|| {
            let p = bin.join(if cfg!(windows) {
                "autoprint-typst.exe"
            } else {
                "autoprint-typst"
            });
            if p.exists() {
                p
            } else {
                root.join(".tools/bin/typst")
            }
        });
    let fonts = option("--fonts")
        .or_else(|| std::env::var_os("AUTOPRINT_FONTS").map(PathBuf::from))
        .unwrap_or_else(|| {
            let p = bin.join("fonts");
            if p.exists() {
                p
            } else {
                root.join("assets/fonts")
            }
        });
    let repo = Repository::open(&data.join("autoprint.sqlite")).await?;
    let token = autoprint_security::token();
    let app = Application {
        repo,
        renderer: Renderer {
            binary: renderer,
            fonts,
            artifacts: data.join("artifacts"),
        },
        token: Arc::new(token.clone()),
        data: data.clone(),
        health: Arc::new(Mutex::new(BTreeMap::new())),
        wake: Arc::new(Notify::new()),
        sumatra: Some(bin.join("autoprint-sumatra.exe")),
    };
    app.seed().await?;
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await?;
    let port = listener.local_addr()?.port();
    let endpoint = data.join("ipc.json");
    if endpoint.exists() {
        tokio::fs::remove_file(&endpoint).await?;
    }
    let shutdown_file = data.join("shutdown.request");
    if shutdown_file.exists() {
        tokio::fs::remove_file(&shutdown_file).await?;
    }
    autoprint_security::private_write(
        &endpoint,
        &serde_json::to_vec(
            &serde_json::json!({"port":port,"token":token,"pid":std::process::id()}),
        )?,
    )?;
    let (send, receive) = tokio::sync::watch::channel(false);
    let engine = tokio::spawn(autoprint_application::engine::run(
        app.clone(),
        receive.clone(),
    ));
    let shutdown_data = data.clone();
    let signal = send.clone();
    tokio::spawn(async move {
        tokio::select! {_=tokio::signal::ctrl_c()=>{},_=async{loop{if shutdown_data.join("shutdown.request").exists(){break;}tokio::time::sleep(std::time::Duration::from_millis(500)).await;}}=>{}}
        let _ = signal.send(true);
    });
    tracing::info!("Agent ready; authenticated local endpoint published");
    let mut http_shutdown = receive;
    let result = axum::serve(listener, autoprint_application::api::router(app.clone()))
        .with_graceful_shutdown(async move {
            let _ = http_shutdown.changed().await;
        })
        .await;
    let _ = send.send(true);
    engine.await??;
    result?;
    let _ = tokio::fs::remove_file(endpoint).await;
    let _ = tokio::fs::remove_file(shutdown_file).await;
    app.repo.pool.close().await;
    lock.unlock()?;
    if !renderer_available(&app) {
        bail!("Renderer runtime was unavailable; queued jobs remain durable");
    }
    Ok(())
}
fn renderer_available(app: &Application) -> bool {
    app.renderer.binary.exists()
}
