use crate::Application;
use anyhow::{Context, Result};
use autoprint_domain::{JobSnapshot, Order, Printer, Rule, Store, Template};
use chrono::{DateTime, Utc};
use std::collections::{BTreeMap, HashSet};
use tokio::task::JoinSet;

pub fn route(
    store: &Store,
    orders: &[Order],
    rules: &[Rule],
    printers: &[Printer],
    templates: &[Template],
) -> Vec<(String, JobSnapshot)> {
    if !store.automation {
        return vec![];
    }
    let mut sorted = rules
        .iter()
        .filter(|r| r.enabled && r.store_id == store.id)
        .collect::<Vec<_>>();
    sorted.sort_by_key(|r| -i64::from(r.priority));
    let mut jobs = Vec::new();
    for order in orders {
        for rule in &sorted {
            if !rule.allow_unpaid && !order.paid() {
                continue;
            }
            if !rule.condition.matches(&order.context(false)) {
                continue;
            }
            let Some(printer) = printers
                .iter()
                .find(|p| p.id == rule.printer_id && p.enabled)
            else {
                continue;
            };
            let Some(template) = templates
                .iter()
                .find(|t| t.id == rule.template_id && t.published && !t.archived)
            else {
                continue;
            };
            let mut order = order.clone();
            if let Some(condition) = &rule.item_condition {
                order
                    .line_items
                    .retain(|i| condition.matches(&serde_json::json!({"item":i})));
                if order.line_items.is_empty() {
                    continue;
                }
            }
            let identity = format!(
                "auto:{}:{}:{}:{}:{}:{}:{}",
                store.id, order.id, rule.id, printer.id, template.id, template.version, rule.copies
            );
            let mut template = template.clone();
            template.locale = printer.locale.clone();
            template.direction = if ["fa", "ar", "ur", "he"].contains(&template.locale.as_str()) {
                "rtl"
            } else {
                "ltr"
            }
            .into();
            jobs.push((
                identity,
                JobSnapshot {
                    order,
                    printer: printer.clone(),
                    template,
                    store_name: store.name.clone(),
                    store_id: store.id.clone(),
                    copies: rule.copies,
                    reprint: false,
                    routing_id: Some(rule.id.clone()),
                },
            ));
            if rule.stop {
                break;
            }
        }
    }
    jobs
}
pub async fn synchronize(app: &Application, store: &Store) -> Result<usize> {
    let end = Utc::now() - chrono::Duration::seconds(10);
    let checkpoint = app.repo.checkpoint(&store.id).await?;
    let start = checkpoint
        .as_deref()
        .map(DateTime::parse_from_rfc3339)
        .transpose()?
        .map(|t| t.with_timezone(&Utc))
        .unwrap_or(end - chrono::Duration::seconds(60))
        - chrono::Duration::seconds(120);
    let credentials = autoprint_security::load_credentials(&store.id)?;
    let client = autoprint_woocommerce::WooClient::new()?;
    let orders = client
        .orders(
            store,
            &credentials,
            &start.format("%Y-%m-%dT%H:%M:%S").to_string(),
            &end.format("%Y-%m-%dT%H:%M:%S").to_string(),
        )
        .await?;
    let jobs = route(
        store,
        &orders,
        &app.repo.list::<Rule>("rules").await?,
        &app.repo.list::<Printer>("printers").await?,
        &app.repo.list::<Template>("templates").await?,
    );
    app.repo
        .synchronize(store, &orders, &jobs, &end.to_rfc3339())
        .await?;
    app.health.lock().await.insert(store.id.clone(),serde_json::json!({"status":"connected","last_sync":Utc::now().to_rfc3339(),"orders":orders.len()}));
    Ok(orders.len())
}
async fn process(app: Application, printer_id: String) -> Result<()> {
    let Some(job) = app.repo.claim(&printer_id).await? else {
        return Ok(());
    };
    let artifact = match app.renderer.render(&job.id, &job.snapshot).await {
        Ok(a) => a,
        Err(_) => {
            let to = if job.attempts >= 5 {
                "failed"
            } else {
                "retry_scheduled"
            };
            app.repo
                .transition(
                    &job.id,
                    "rendering",
                    to,
                    Some("Document rendering failed; validate the template and packaged fonts"),
                    None,
                    backoff(job.attempts),
                )
                .await?;
            return Ok(());
        }
    };
    app.repo
        .transition(&job.id, "rendering", "ready", None, None, 0)
        .await?;
    app.repo
        .transition(&job.id, "ready", "submitting", None, None, 0)
        .await?;
    match autoprint_printing_core::submit(
        &job.snapshot.printer,
        &artifact.pdf,
        &artifact.pages,
        job.snapshot.copies,
        app.sumatra.as_deref(),
    )
    .await
    {
        Ok(result) => {
            let state = if result.physical_confirmed {
                "completed"
            } else {
                "submitted"
            };
            app.repo
                .transition(
                    &job.id,
                    "submitting",
                    state,
                    None,
                    Some(&result.reference),
                    0,
                )
                .await?;
        }
        Err(error) => {
            let state = if error.uncertain {
                "outcome_uncertain"
            } else if job.attempts >= 5 {
                "failed"
            } else {
                "retry_scheduled"
            };
            app.repo
                .transition(
                    &job.id,
                    "submitting",
                    state,
                    Some(&error.message),
                    None,
                    backoff(job.attempts),
                )
                .await?;
        }
    }
    Ok(())
}
fn backoff(attempt: i64) -> i64 {
    (5 * 2_i64.pow(attempt.clamp(0, 8) as u32)).min(900)
}
pub async fn run(app: Application, mut shutdown: tokio::sync::watch::Receiver<bool>) -> Result<()> {
    app.repo.recover().await?;
    let mut timer = tokio::time::interval(std::time::Duration::from_secs(2));
    timer.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Skip);
    let mut print_tasks: JoinSet<(String, Result<()>)> = JoinSet::new();
    let mut sync_tasks: JoinSet<(String, Result<usize>)> = JoinSet::new();
    let mut active_printers = HashSet::new();
    let mut active_stores = HashSet::new();
    let mut due: BTreeMap<String, std::time::Instant> = BTreeMap::new();
    loop {
        tokio::select! {
            _=shutdown.changed()=>{if *shutdown.borrow(){break;}},
            Some(done)=print_tasks.join_next(),if !print_tasks.is_empty()=>{if let Ok((id,result))=done{active_printers.remove(&id);if result.is_err(){tracing::error!("Print worker failed; durable jobs retained");}}},
            Some(done)=sync_tasks.join_next(),if !sync_tasks.is_empty()=>{if let Ok((id,result))=done{active_stores.remove(&id);if let Err(e)=result {app.health.lock().await.insert(id,serde_json::json!({"status":"error","message":e.to_string()}));}}},
            _=timer.tick()=>{},
            _=app.wake.notified()=>{due.clear();},
        }
        let now = std::time::Instant::now();
        for store in app.repo.list::<Store>("stores").await? {
            if sync_tasks.len() >= 4 {
                break;
            }
            if !active_stores.contains(&store.id) && due.get(&store.id).is_none_or(|d| *d <= now) {
                due.insert(
                    store.id.clone(),
                    now + std::time::Duration::from_secs(store.poll_seconds),
                );
                active_stores.insert(store.id.clone());
                let cloned = app.clone();
                sync_tasks.spawn(async move {
                    let result = synchronize(&cloned, &store).await;
                    (store.id, result)
                });
            }
        }
        let paused = app
            .repo
            .get::<serde_json::Value>("settings", "engine")
            .await
            .ok()
            .is_some_and(|v| v["paused"] == true);
        if !paused {
            for printer in app
                .repo
                .list::<Printer>("printers")
                .await?
                .into_iter()
                .filter(|p| p.enabled)
            {
                if print_tasks.len() >= 4 {
                    break;
                }
                if active_printers.insert(printer.id.clone()) {
                    let cloned = app.clone();
                    print_tasks.spawn(async move {
                        let id = printer.id;
                        let result = process(cloned, id.clone()).await;
                        (id, result)
                    });
                }
            }
        }
    }
    sync_tasks.abort_all();
    while sync_tasks.join_next().await.is_some() {}
    // Finish active submissions before shutting down; interrupted ones recover as uncertain.
    while let Some(done) = print_tasks.join_next().await {
        let (_, result) = done.context("Print worker stopped unexpectedly")?;
        result?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn routing_paid_and_subsets() {
        let mut s = Store {
            id: "s".into(),
            name: "Store".into(),
            url: "https://example.com".into(),
            automation: true,
            poll_seconds: 30,
            locale: "en".into(),
            timezone: "UTC".into(),
        };
        let t = autoprint_template_core::builtins().remove(1);
        let p = Printer {
            id: "p".into(),
            name: "PDF".into(),
            transport: autoprint_domain::Transport::Pdf,
            paper: autoprint_domain::paper_catalog().remove(4),
            template_id: t.id.clone(),
            enabled: true,
            locale: "en".into(),
            copies: 1,
        };
        let rule = Rule {
            id: "r".into(),
            name: "Paid orders".into(),
            store_id: s.id.clone(),
            printer_id: p.id.clone(),
            template_id: t.id.clone(),
            condition: autoprint_domain::Condition::All { conditions: vec![] },
            item_condition: None,
            enabled: true,
            allow_unpaid: false,
            priority: 0,
            stop: false,
            copies: 1,
        };
        let mut o = autoprint_template_core::sample_order("en");
        assert_eq!(
            route(
                &s,
                std::slice::from_ref(&o),
                std::slice::from_ref(&rule),
                std::slice::from_ref(&p),
                std::slice::from_ref(&t)
            )
            .len(),
            1
        );
        o.date_paid_gmt = None;
        assert!(route(&s, &[o], &[rule], &[p], &[t]).is_empty());
        s.automation = false;
    }
}
