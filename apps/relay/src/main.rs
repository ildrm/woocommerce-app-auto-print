//! Optional self-hosted signed webhook notification relay. HTTPS termination is required.
use anyhow::{Context, Result};
use autoprint_persistence::Repository;
use axum::{
    body::Bytes,
    extract::{DefaultBodyLimit, Path, State},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use serde_json::json;
use std::{path::PathBuf, sync::Arc};

#[derive(Clone)]
struct Relay {
    repo: Repository,
    secret: Arc<String>,
    token: Arc<String>,
    store: String,
}
#[tokio::main]
async fn main() -> Result<()> {
    let secret =
        std::env::var("AUTOPRINT_WEBHOOK_SECRET").context("Set AUTOPRINT_WEBHOOK_SECRET")?;
    let token = std::env::var("AUTOPRINT_RELAY_TOKEN").context("Set AUTOPRINT_RELAY_TOKEN")?;
    if secret.len() < 32 || token.len() < 32 {
        anyhow::bail!("Relay secrets must be at least 32 characters");
    }
    let store = std::env::var("AUTOPRINT_STORE_ID").context("Set AUTOPRINT_STORE_ID")?;
    let data = PathBuf::from(
        std::env::var("AUTOPRINT_RELAY_DATA").unwrap_or_else(|_| ".data/relay".into()),
    );
    autoprint_security::private_directory(&data)?;
    let state = Relay {
        repo: Repository::open(&data.join("relay.sqlite")).await?,
        secret: Arc::new(secret),
        token: Arc::new(token),
        store,
    };
    let app = Router::new()
        .route("/webhooks/{store}", post(webhook))
        .route("/events", get(events))
        .route("/events/{id}/ack", post(ack))
        .layer(DefaultBodyLimit::max(1024 * 1024))
        .with_state(state);
    let address = std::env::var("AUTOPRINT_RELAY_BIND").unwrap_or_else(|_| "127.0.0.1:8766".into());
    let listener = tokio::net::TcpListener::bind(address).await?;
    axum::serve(listener, app).await?;
    Ok(())
}
async fn webhook(
    State(s): State<Relay>,
    Path(store): Path<String>,
    h: HeaderMap,
    body: Bytes,
) -> impl IntoResponse {
    let signature = h
        .get("x-wc-webhook-signature")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");
    if store != s.store
        || !autoprint_security::verify_webhook(s.secret.as_bytes(), &body, signature)
    {
        return (
            StatusCode::UNAUTHORIZED,
            Json(json!({"error":"Invalid webhook signature"})),
        );
    }
    let topic = h
        .get("x-wc-webhook-topic")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");
    if !["order.created", "order.updated"].contains(&topic) {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({"error":"Unsupported topic"})),
        );
    }
    let Some(id) = h
        .get("x-wc-webhook-delivery-id")
        .and_then(|v| v.to_str().ok())
        .filter(|s| !s.is_empty() && s.len() < 200)
    else {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({"error":"Delivery ID required"})),
        );
    };
    let value: serde_json::Value = match serde_json::from_slice(&body) {
        Ok(v) => v,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({"error":"Invalid notification"})),
            )
        }
    };
    let Some(order) = value["id"]
        .as_u64()
        .filter(|n| *n > 0 && *n <= i64::MAX as u64)
    else {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({"error":"Order ID required"})),
        );
    };
    let result=sqlx::query("INSERT OR IGNORE INTO relay_events(id,store_id,order_id,device_id) VALUES(?,?,?,'single-owner')").bind(format!("{store}:{id}")).bind(store).bind(order as i64).execute(&s.repo.pool).await;
    if result.is_err() {
        return (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(json!({"error":"Durable notification storage unavailable"})),
        );
    }
    (StatusCode::ACCEPTED, Json(json!({"accepted":true})))
}
fn authorized(s: &Relay, h: &HeaderMap) -> bool {
    autoprint_security::authenticate(
        h.get("authorization")
            .and_then(|v| v.to_str().ok())
            .and_then(|s| s.strip_prefix("Bearer "))
            .unwrap_or("")
            .as_bytes(),
        s.token.as_bytes(),
    )
}
async fn events(State(s): State<Relay>, h: HeaderMap) -> impl IntoResponse {
    if !authorized(&s, &h) {
        return (
            StatusCode::UNAUTHORIZED,
            Json(json!({"error":"Authentication required"})),
        );
    }
    let rows = sqlx::query_as::<_, (String, String, i64)>(
        "SELECT id,store_id,order_id FROM relay_events WHERE acknowledged=0 LIMIT 100",
    )
    .fetch_all(&s.repo.pool)
    .await;
    match rows {
        Ok(rows) => (
            StatusCode::OK,
            Json(
                json!({"events":rows.into_iter().map(|(id,store_id,order_id)|json!({"id":id,"store_id":store_id,"order_id":order_id})).collect::<Vec<_>>()}),
            ),
        ),
        Err(_) => (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(json!({"error":"Storage unavailable"})),
        ),
    }
}
async fn ack(State(s): State<Relay>, Path(id): Path<String>, h: HeaderMap) -> impl IntoResponse {
    if !authorized(&s, &h) {
        return StatusCode::UNAUTHORIZED;
    }
    match sqlx::query("UPDATE relay_events SET acknowledged=1 WHERE id=?")
        .bind(id)
        .execute(&s.repo.pool)
        .await
    {
        Ok(_) => StatusCode::NO_CONTENT,
        Err(_) => StatusCode::SERVICE_UNAVAILABLE,
    }
}
