use crate::Application;
use anyhow::Result;
use autoprint_domain::{JobSnapshot, Paper, Printer, Rule, Store, Template};
use axum::{
    body::Body,
    extract::{DefaultBodyLimit, Path, State},
    http::{HeaderMap, Request, StatusCode},
    middleware::{self, Next},
    response::{IntoResponse, Response},
    routing::{get, post, put},
    Json, Router,
};
use serde::Deserialize;
use serde_json::{json, Value};
use uuid::Uuid;
macro_rules! bail {($($arg:tt)*)=>{return Err(anyhow::anyhow!($($arg)*).into())};}

pub struct ApiError(anyhow::Error);
impl<E: Into<anyhow::Error>> From<E> for ApiError {
    fn from(e: E) -> Self {
        Self(e.into())
    }
}
impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        (
            StatusCode::BAD_REQUEST,
            Json(json!({"error":self.0.to_string()})),
        )
            .into_response()
    }
}
type ApiResult = std::result::Result<Json<Value>, ApiError>;
async fn authorize(State(app): State<Application>, request: Request<Body>, next: Next) -> Response {
    let bearer = request
        .headers()
        .get("authorization")
        .and_then(|h| h.to_str().ok())
        .and_then(|s| s.strip_prefix("Bearer "))
        .unwrap_or("");
    if !autoprint_security::authenticate(bearer.as_bytes(), app.token.as_bytes()) {
        return (
            StatusCode::UNAUTHORIZED,
            Json(json!({"error":"Local authentication required"})),
        )
            .into_response();
    }
    let mut response = next.run(request).await;
    response.headers_mut().insert(
        "cache-control",
        "no-store"
            .parse()
            .unwrap_or(axum::http::HeaderValue::from_static("no-store")),
    );
    response
}
pub fn router(app: Application) -> Router {
    Router::new()
        .route("/state", get(state))
        .route("/health", get(health))
        .route("/stores/connect", post(connect))
        .route("/sync", post(sync))
        .route("/discovery", get(discovery))
        .route("/configs/{kind}/{id}", put(configure).delete(remove))
        .route("/preview", post(preview))
        .route("/test-print", post(test_print))
        .route("/jobs/{id}/{action}", post(job_action))
        .route("/jobs/{id}/attempts", get(attempts))
        .route("/artifacts/{id}/{file}", get(artifact))
        .route("/backup", post(backup))
        .route("/diagnostics", get(diagnostics))
        .route("/rules/simulate", post(simulate))
        .route("/shutdown", post(shutdown))
        .layer(DefaultBodyLimit::max(2 * 1024 * 1024))
        .layer(middleware::from_fn_with_state(app.clone(), authorize))
        .with_state(app)
}
async fn state(State(app): State<Application>) -> ApiResult {
    let mut templates = app.repo.list::<Template>("templates").await?;
    let drafts = app.repo.list::<Template>("drafts").await?;
    for draft in &drafts {
        if !templates.iter().any(|t| t.id == draft.id) {
            templates.push(draft.clone());
        }
    }
    Ok(Json(
        json!({"stores":app.repo.list::<Store>("stores").await?,"printers":app.repo.list::<Printer>("printers").await?,"templates":templates,"drafts":drafts,"rules":app.repo.list::<Rule>("rules").await?,"papers":app.repo.list::<Paper>("papers").await?,"settings":app.repo.list::<Value>("settings").await?,"orders":app.repo.orders().await?,"jobs":app.repo.jobs().await?,"health":*app.health.lock().await,"agent":{"status":"online","version":"0.1.0"}}),
    ))
}
async fn health() -> Json<Value> {
    Json(json!({"status":"online","version":"0.1.0"}))
}
#[derive(Deserialize)]
struct Connect {
    store: Store,
    credentials: autoprint_security::Credentials,
}
async fn connect(State(app): State<Application>, Json(input): Json<Connect>) -> ApiResult {
    input.store.validate()?;
    input.credentials.validate()?;
    autoprint_woocommerce::WooClient::new()?
        .test(&input.store, &input.credentials)
        .await?;
    autoprint_security::save_credentials(&input.store.id, &input.credentials)?;
    app.repo
        .put("stores", &input.store.id, &input.store)
        .await?;
    app.wake.notify_one();
    Ok(Json(json!({"connected":true})))
}
async fn configure(
    State(app): State<Application>,
    Path((kind, id)): Path<(String, String)>,
    Json(value): Json<Value>,
) -> ApiResult {
    if id.is_empty() || id.len() > 128 {
        bail!("Invalid configuration ID");
    }
    match kind.as_str() {
        "stores" => {
            let s: Store = serde_json::from_value(value)?;
            if s.id != id {
                bail!("ID mismatch");
            }
            s.validate()?;
            let _: Store = app.repo.get("stores", &id).await?;
            app.repo.put("stores", &id, &s).await?;
        }
        "printers" => {
            let p: Printer = serde_json::from_value(value)?;
            if p.id != id {
                bail!("ID mismatch");
            }
            p.validate()?;
            let _: Template = app.repo.get("templates", &p.template_id).await?;
            app.repo.put("printers", &id, &p).await?;
        }
        "papers" => {
            let p: Paper = serde_json::from_value(value)?;
            if p.id != id {
                bail!("ID mismatch");
            }
            p.validate()?;
            app.repo.put("papers", &id, &p).await?;
        }
        "templates" => {
            let mut t: Template = serde_json::from_value(value)?;
            if t.id != id {
                bail!("ID mismatch");
            }
            autoprint_template_core::validate(&t)?;
            let prior = app.repo.get::<Template>("templates", &id).await.ok();
            if t.published {
                t.version = prior.as_ref().map(|p| p.version + 1).unwrap_or(1);
                app.repo.publish(&id, &t).await?;
                app.repo.remove("drafts", &id).await?;
            } else {
                app.repo.put("drafts", &id, &t).await?;
            }
        }
        "rules" => {
            let r: Rule = serde_json::from_value(value)?;
            if r.id != id || r.copies == 0 || r.copies > 20 {
                bail!("Invalid rule identity or copies");
            }
            r.condition.validate(0)?;
            if let Some(c) = &r.item_condition {
                c.validate(0)?;
            }
            let _: Store = app.repo.get("stores", &r.store_id).await?;
            let _: Printer = app.repo.get("printers", &r.printer_id).await?;
            let _: Template = app.repo.get("templates", &r.template_id).await?;
            app.repo.put("rules", &id, &r).await?;
        }
        "settings" => {
            if !["ui", "engine", "retention"].contains(&id.as_str()) {
                bail!("Unsupported setting");
            }
            let mut value = value;
            value["id"] = json!(id);
            app.repo.put("settings", &id, &value).await?;
        }
        _ => bail!("Unsupported configuration type"),
    }
    app.wake.notify_one();
    Ok(Json(json!({"saved":true})))
}
async fn remove(
    State(app): State<Application>,
    Path((kind, id)): Path<(String, String)>,
) -> ApiResult {
    if kind == "settings" {
        bail!("Settings cannot be removed");
    }
    app.repo.remove(&kind, &id).await?;
    if kind == "stores" {
        autoprint_security::delete_credentials(&id)?;
    }
    Ok(Json(json!({"removed":true})))
}
async fn sync(State(app): State<Application>) -> Json<Value> {
    app.wake.notify_one();
    Json(json!({"scheduled":true}))
}
async fn discovery() -> ApiResult {
    Ok(Json(
        json!({"printers":autoprint_printing_core::discover().await?}),
    ))
}
#[derive(Deserialize)]
struct Preview {
    template: Template,
    printer: Printer,
    #[serde(default)]
    order: Option<autoprint_domain::Order>,
    #[serde(default)]
    store_id: Option<String>,
}
fn preview_snapshot(input: Preview) -> Result<JobSnapshot> {
    input.printer.validate()?;
    let mut template = input.template;
    template.locale = input.printer.locale.clone();
    template.direction = if ["fa", "ar", "ur", "he"].contains(&template.locale.as_str()) {
        "rtl"
    } else {
        "ltr"
    }
    .into();
    autoprint_template_core::validate(&template)?;
    let manual = input.order.is_some();
    Ok(JobSnapshot {
        order: input
            .order
            .unwrap_or_else(|| autoprint_template_core::sample_order(&template.locale)),
        copies: input.printer.copies,
        printer: input.printer,
        template,
        store_name: if manual {
            "Manual order"
        } else {
            "AutoPrint Sample Store"
        }
        .into(),
        store_id: input.store_id.unwrap_or_else(|| "sample".into()),
        reprint: manual,
        routing_id: None,
    })
}
async fn preview(State(app): State<Application>, Json(input): Json<Preview>) -> ApiResult {
    let snapshot = preview_snapshot(input)?;
    let id = Uuid::new_v4().to_string();
    let artifact = app.renderer.render(&id, &snapshot).await?;
    Ok(Json(
        json!({"id":id,"pdf":format!("/artifacts/{id}/document.pdf"),"pages":artifact.pages.iter().enumerate().map(|(i,_)|format!("/artifacts/{id}/page-{}.png",i+1)).collect::<Vec<_>>()}),
    ))
}
async fn test_print(State(app): State<Application>, Json(input): Json<Preview>) -> ApiResult {
    let snapshot = preview_snapshot(input)?;
    let id = app
        .repo
        .enqueue(&format!("test:{}", Uuid::new_v4()), &snapshot)
        .await?;
    app.wake.notify_one();
    Ok(Json(json!({"job_id":id})))
}
async fn job_action(
    State(app): State<Application>,
    Path((id, action)): Path<(String, String)>,
    headers: HeaderMap,
) -> ApiResult {
    let job = app.repo.get_job(&id).await?;
    match action.as_str() {
        "retry" => {
            app.repo
                .transition(&id, &job.state, "queued", None, None, 0)
                .await?
        }
        "cancel" => {
            app.repo
                .transition(&id, &job.state, "canceled", None, None, 0)
                .await?
        }
        "reprint" => {
            if headers
                .get("x-confirm-reprint")
                .and_then(|h| h.to_str().ok())
                != Some("yes")
            {
                bail!("Confirm reprint after inspecting any uncertain output");
            }
            let mut snapshot = job.snapshot;
            snapshot.reprint = true;
            let new_id = app
                .repo
                .enqueue(&format!("reprint:{id}:{}", Uuid::new_v4()), &snapshot)
                .await?;
            return Ok(Json(json!({"job_id":new_id})));
        }
        _ => bail!("Unknown job action"),
    };
    app.wake.notify_one();
    Ok(Json(json!({"updated":true})))
}
async fn attempts(State(app): State<Application>, Path(id): Path<String>) -> ApiResult {
    Ok(Json(json!({"attempts":app.repo.attempts(&id).await?})))
}
async fn artifact(
    State(app): State<Application>,
    Path((id, file)): Path<(String, String)>,
) -> std::result::Result<Response, ApiError> {
    Uuid::parse_str(&id)?;
    let is_pdf = file == "document.pdf";
    let is_png = file
        .strip_prefix("page-")
        .and_then(|s| s.strip_suffix(".png"))
        .is_some_and(|s| s.parse::<u32>().is_ok());
    if !is_pdf && !is_png {
        bail!("Invalid artifact path");
    }
    let data = tokio::fs::read(app.renderer.artifacts.join(id).join(file)).await?;
    Ok((
        [
            (
                "Content-Type",
                if is_pdf {
                    "application/pdf"
                } else {
                    "image/png"
                },
            ),
            ("Cache-Control", "no-store"),
        ],
        data,
    )
        .into_response())
}
async fn backup(State(app): State<Application>) -> ApiResult {
    let id = Uuid::new_v4();
    let directory = app.data.join("backups");
    tokio::fs::create_dir_all(&directory).await?;
    let path = directory.join(format!("{id}.sqlite"));
    app.repo.backup(&path).await?;
    Ok(Json(
        json!({"path":path,"contains_customer_data":true,"contains_credentials":false}),
    ))
}
async fn diagnostics(State(app): State<Application>) -> ApiResult {
    Ok(Json(
        json!({"agent":"online","version":"0.1.0","database_integrity":app.repo.integrity().await?,"renderer_available":app.renderer.binary.exists(),"bundled_fonts":app.renderer.fonts.exists(),"platform":std::env::consts::OS,"physical_hardware_tested":false}),
    ))
}
#[derive(Deserialize)]
struct Simulation {
    store_id: String,
    order: autoprint_domain::Order,
    #[serde(default)]
    rule: Option<Rule>,
}
async fn simulate(State(app): State<Application>, Json(input): Json<Simulation>) -> ApiResult {
    let mut store: Store = app.repo.get("stores", &input.store_id).await?;
    store.automation = true;
    let rules = if let Some(rule) = input.rule {
        rule.condition.validate(0)?;
        vec![rule]
    } else {
        app.repo.list::<Rule>("rules").await?
    };
    Ok(Json(
        json!({"outputs":crate::engine::route(&store,&[input.order],&rules,&app.repo.list::<Printer>("printers").await?,&app.repo.list::<Template>("templates").await?)}),
    ))
}
async fn shutdown(State(app): State<Application>) -> ApiResult {
    tokio::fs::write(app.data.join("shutdown.request"), b"stop").await?;
    Ok(Json(json!({"stopping":true})))
}
