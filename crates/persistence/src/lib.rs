use anyhow::{bail, Result};
use autoprint_domain::{transition_allowed, Job, JobSnapshot, Order, Rule, Store};
use chrono::Utc;
use serde::{de::DeserializeOwned, Serialize};
use sqlx::{
    sqlite::{SqliteConnectOptions, SqlitePoolOptions},
    Row, SqlitePool,
};
use std::{path::Path, str::FromStr, time::Duration};
use uuid::Uuid;

#[derive(Clone)]
pub struct Repository {
    pub pool: SqlitePool,
}
impl Repository {
    pub async fn open(path: &Path) -> Result<Self> {
        let opts = SqliteConnectOptions::from_str(&format!("sqlite://{}", path.display()))?
            .create_if_missing(true)
            .foreign_keys(true)
            .journal_mode(sqlx::sqlite::SqliteJournalMode::Wal)
            .busy_timeout(Duration::from_secs(5));
        let pool = SqlitePoolOptions::new()
            .max_connections(4)
            .connect_with(opts)
            .await?;
        sqlx::migrate!("./migrations").run(&pool).await?;
        Ok(Self { pool })
    }
    fn table(kind: &str) -> Result<&'static str> {
        match kind {
            "stores" => Ok("stores"),
            "printers" => Ok("printers"),
            "templates" => Ok("templates"),
            "drafts" => Ok("template_drafts"),
            "rules" => Ok("rules"),
            "papers" => Ok("papers"),
            "settings" => Ok("settings"),
            _ => bail!("Unknown configuration type"),
        }
    }
    pub async fn list<T: DeserializeOwned>(&self, kind: &str) -> Result<Vec<T>> {
        let table = Self::table(kind)?;
        let rows = sqlx::query(&format!("SELECT data FROM {table} ORDER BY id"))
            .fetch_all(&self.pool)
            .await?;
        rows.into_iter()
            .map(|r| Ok(serde_json::from_str(&r.get::<String, _>("data"))?))
            .collect()
    }
    pub async fn get<T: DeserializeOwned>(&self, kind: &str, id: &str) -> Result<T> {
        let table = Self::table(kind)?;
        let row = sqlx::query(&format!("SELECT data FROM {table} WHERE id=?"))
            .bind(id)
            .fetch_optional(&self.pool)
            .await?
            .ok_or_else(|| anyhow::anyhow!("Configuration no longer exists"))?;
        Ok(serde_json::from_str(&row.get::<String, _>("data"))?)
    }
    pub async fn put<T: Serialize>(&self, kind: &str, id: &str, value: &T) -> Result<()> {
        let table = Self::table(kind)?;
        let data = serde_json::to_string(value)?;
        sqlx::query(&format!("INSERT INTO {table}(id,data) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data")).bind(id).bind(data).execute(&self.pool).await?;
        Ok(())
    }
    pub async fn publish(&self, id: &str, value: &autoprint_domain::Template) -> Result<()> {
        let mut tx = self.pool.begin().await?;
        let data = serde_json::to_string(value)?;
        sqlx::query("INSERT INTO template_versions(template_id,version,data) VALUES(?,?,?)")
            .bind(id)
            .bind(value.version as i64)
            .bind(&data)
            .execute(&mut *tx)
            .await?;
        sqlx::query("INSERT INTO templates(id,data) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data").bind(id).bind(&data).execute(&mut *tx).await?;
        tx.commit().await?;
        Ok(())
    }
    pub async fn remove(&self, kind: &str, id: &str) -> Result<()> {
        let table = Self::table(kind)?;
        if kind == "stores"
            && sqlx::query_scalar::<_, i64>("SELECT count(*) FROM jobs WHERE store_id=?")
                .bind(id)
                .fetch_one(&self.pool)
                .await?
                > 0
        {
            bail!("Store has print history; disable automation instead");
        }
        if matches!(kind, "printers" | "templates" | "stores") {
            let rules = self.list::<Rule>("rules").await?;
            if rules
                .iter()
                .any(|r| r.printer_id == id || r.template_id == id || r.store_id == id)
            {
                bail!("Remove routing rules using this configuration first");
            }
        }
        sqlx::query(&format!("DELETE FROM {table} WHERE id=?"))
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }
    pub async fn checkpoint(&self, id: &str) -> Result<Option<String>> {
        Ok(
            sqlx::query_scalar("SELECT watermark FROM checkpoints WHERE store_id=?")
                .bind(id)
                .fetch_optional(&self.pool)
                .await?,
        )
    }
    pub async fn synchronize(
        &self,
        store: &Store,
        orders: &[Order],
        jobs: &[(String, JobSnapshot)],
        watermark: &str,
    ) -> Result<()> {
        let mut tx = self.pool.begin().await?;
        for o in orders {
            o.validate()?;
            sqlx::query("INSERT INTO orders(store_id,order_id,data) VALUES(?,?,?) ON CONFLICT(store_id,order_id) DO UPDATE SET data=excluded.data").bind(&store.id).bind(o.id as i64).bind(serde_json::to_string(o)?).execute(&mut *tx).await?;
        }
        for (identity, snapshot) in jobs {
            let logical_key =
                serde_json::to_string(&(&store.id, snapshot.order.id, &snapshot.routing_id))?;
            let claimed =
                sqlx::query("INSERT OR IGNORE INTO automatic_claims(logical_key) VALUES(?)")
                    .bind(logical_key)
                    .execute(&mut *tx)
                    .await?
                    .rows_affected();
            if claimed == 0 {
                continue;
            }
            let now = Utc::now().to_rfc3339();
            sqlx::query("INSERT OR IGNORE INTO jobs(id,identity,store_id,state,snapshot,created_at,updated_at,next_attempt) VALUES(?,?,?,'queued',?,?,?,?)").bind(Uuid::new_v4().to_string()).bind(identity).bind(&store.id).bind(serde_json::to_string(snapshot)?).bind(&now).bind(&now).bind(&now).execute(&mut *tx).await?;
        }
        sqlx::query("INSERT INTO checkpoints(store_id,watermark) VALUES(?,?) ON CONFLICT(store_id) DO UPDATE SET watermark=excluded.watermark").bind(&store.id).bind(watermark).execute(&mut *tx).await?;
        tx.commit().await?;
        Ok(())
    }
    pub async fn orders(&self) -> Result<Vec<serde_json::Value>> {
        let rows = sqlx::query("SELECT store_id,data FROM orders ORDER BY rowid DESC LIMIT 500")
            .fetch_all(&self.pool)
            .await?;
        rows.into_iter().map(|r|Ok(serde_json::json!({"store_id":r.get::<String,_>("store_id"),"order":serde_json::from_str::<serde_json::Value>(&r.get::<String,_>("data"))?}))).collect()
    }
    pub async fn enqueue(&self, identity: &str, snapshot: &JobSnapshot) -> Result<String> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();
        sqlx::query("INSERT INTO jobs(id,identity,store_id,state,snapshot,created_at,updated_at,next_attempt) VALUES(?,?,?,'queued',?,?,?,?)").bind(&id).bind(identity).bind(&snapshot.store_id).bind(serde_json::to_string(snapshot)?).bind(&now).bind(&now).bind(&now).execute(&self.pool).await?;
        Ok(id)
    }
    fn job(row: sqlx::sqlite::SqliteRow) -> Result<Job> {
        Ok(Job {
            id: row.get("id"),
            identity: row.get("identity"),
            state: row.get("state"),
            snapshot: serde_json::from_str(&row.get::<String, _>("snapshot"))?,
            created_at: row.get("created_at"),
            updated_at: row.get("updated_at"),
            attempts: row.get("attempts"),
            next_attempt: row.get("next_attempt"),
            error: row.get("error"),
            submission_ref: row.get("submission_ref"),
        })
    }
    pub async fn jobs(&self) -> Result<Vec<Job>> {
        sqlx::query("SELECT * FROM jobs ORDER BY created_at DESC LIMIT 500")
            .fetch_all(&self.pool)
            .await?
            .into_iter()
            .map(Self::job)
            .collect()
    }
    pub async fn get_job(&self, id: &str) -> Result<Job> {
        Self::job(
            sqlx::query("SELECT * FROM jobs WHERE id=?")
                .bind(id)
                .fetch_one(&self.pool)
                .await?,
        )
    }
    pub async fn claim(&self, printer: &str) -> Result<Option<Job>> {
        let mut tx = self.pool.begin().await?;
        let now = Utc::now().to_rfc3339();
        let row=sqlx::query("UPDATE jobs SET state='rendering',updated_at=?,attempts=attempts+1,error=NULL WHERE id=(SELECT id FROM jobs WHERE state IN ('queued','retry_scheduled') AND next_attempt<=? AND json_extract(snapshot,'$.printer.id')=? ORDER BY created_at LIMIT 1) RETURNING *").bind(&now).bind(&now).bind(printer).fetch_optional(&mut *tx).await?;
        let result = row.map(Self::job).transpose()?;
        if let Some(j) = &result {
            sqlx::query(
                "INSERT INTO attempts(job_id,number,state,created_at) VALUES(?,?,'rendering',?)",
            )
            .bind(&j.id)
            .bind(j.attempts)
            .bind(&now)
            .execute(&mut *tx)
            .await?;
        }
        tx.commit().await?;
        Ok(result)
    }
    pub async fn transition(
        &self,
        id: &str,
        from: &str,
        to: &str,
        error: Option<&str>,
        reference: Option<&str>,
        delay: i64,
    ) -> Result<()> {
        if !transition_allowed(from, to) {
            bail!("Invalid job transition {from} → {to}");
        }
        let now = Utc::now();
        let mut tx = self.pool.begin().await?;
        let changed=sqlx::query("UPDATE jobs SET state=?,error=?,submission_ref=COALESCE(?,submission_ref),updated_at=?,next_attempt=? WHERE id=? AND state=?").bind(to).bind(error).bind(reference).bind(now.to_rfc3339()).bind((now+chrono::Duration::seconds(delay)).to_rfc3339()).bind(id).bind(from).execute(&mut *tx).await?.rows_affected();
        if changed != 1 {
            bail!("Job changed during operation; refresh and try again");
        }
        sqlx::query("UPDATE attempts SET state=?,error=?,submission_ref=? WHERE job_id=? AND number=(SELECT attempts FROM jobs WHERE id=?)").bind(to).bind(error).bind(reference).bind(id).bind(id).execute(&mut *tx).await?;
        tx.commit().await?;
        Ok(())
    }
    pub async fn recover(&self) -> Result<()> {
        sqlx::query("UPDATE jobs SET state='outcome_uncertain',error='Engine stopped during printer submission; inspect output before reprinting' WHERE state='submitting'").execute(&self.pool).await?;
        sqlx::query(
            "UPDATE jobs SET state='queued',error=NULL WHERE state IN ('rendering','ready')",
        )
        .execute(&self.pool)
        .await?;
        Ok(())
    }
    pub async fn attempts(&self, id: &str) -> Result<Vec<serde_json::Value>> {
        let rows = sqlx::query("SELECT * FROM attempts WHERE job_id=? ORDER BY number")
            .bind(id)
            .fetch_all(&self.pool)
            .await?;
        Ok(rows.into_iter().map(|r|serde_json::json!({"number":r.get::<i64,_>("number"),"state":r.get::<String,_>("state"),"error":r.get::<Option<String>,_>("error"),"created_at":r.get::<String,_>("created_at"),"submission_ref":r.get::<Option<String>,_>("submission_ref")})).collect())
    }
    pub async fn backup(&self, path: &Path) -> Result<()> {
        sqlx::query("VACUUM INTO ?")
            .bind(path.to_string_lossy().as_ref())
            .execute(&self.pool)
            .await?;
        Ok(())
    }
    pub async fn integrity(&self) -> Result<String> {
        Ok(sqlx::query_scalar("PRAGMA integrity_check")
            .fetch_one(&self.pool)
            .await?)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[tokio::test]
    async fn migration_backup_and_reopen() {
        let d = tempfile::tempdir().unwrap();
        let db = d.path().join("data.sqlite");
        let repo = Repository::open(&db).await.unwrap();
        repo.put("settings", "ui", &serde_json::json!({"locale":"fa"}))
            .await
            .unwrap();
        assert_eq!(repo.integrity().await.unwrap(), "ok");
        repo.backup(&d.path().join("backup.sqlite")).await.unwrap();
        repo.pool.close().await;
        let reopened = Repository::open(&db).await.unwrap();
        assert_eq!(
            reopened
                .get::<serde_json::Value>("settings", "ui")
                .await
                .unwrap()["locale"],
            "fa"
        );
        assert!(Repository::table("jobs; DROP TABLE stores").is_err());
    }
    #[tokio::test]
    async fn duplicate_sync_and_ambiguous_recovery() {
        let d = tempfile::tempdir().unwrap();
        let repo = Repository::open(&d.path().join("data.sqlite"))
            .await
            .unwrap();
        let store = Store {
            id: "s".into(),
            name: "Store".into(),
            url: "https://example.com".into(),
            poll_seconds: 30,
            automation: true,
            locale: "en".into(),
            timezone: "UTC".into(),
        };
        repo.put("stores", "s", &store).await.unwrap();
        let template = autoprint_template_core::builtins().remove(1);
        let order = autoprint_template_core::sample_order("en");
        let printer = autoprint_domain::Printer {
            id: "p".into(),
            name: "PDF".into(),
            transport: autoprint_domain::Transport::Pdf,
            paper: autoprint_domain::paper_catalog().remove(4),
            template_id: template.id.clone(),
            enabled: true,
            locale: "en".into(),
            copies: 1,
        };
        let snapshot = JobSnapshot {
            order: order.clone(),
            printer,
            template,
            store_name: store.name.clone(),
            store_id: store.id.clone(),
            copies: 1,
            reprint: false,
            routing_id: Some("r".into()),
        };
        let checkpoint = Utc::now().to_rfc3339();
        for identity in ["first-version", "duplicate", "updated-template"] {
            repo.synchronize(
                &store,
                std::slice::from_ref(&order),
                &[(identity.into(), snapshot.clone())],
                &checkpoint,
            )
            .await
            .unwrap();
        }
        assert_eq!(repo.jobs().await.unwrap().len(), 1);
        let job = repo.claim("p").await.unwrap().unwrap();
        assert!(repo.claim("p").await.unwrap().is_none());
        repo.transition(&job.id, "rendering", "ready", None, None, 0)
            .await
            .unwrap();
        repo.transition(&job.id, "ready", "submitting", None, None, 0)
            .await
            .unwrap();
        repo.recover().await.unwrap();
        assert_eq!(
            repo.get_job(&job.id).await.unwrap().state,
            "outcome_uncertain"
        );
        assert!(repo.claim("p").await.unwrap().is_none());
        assert!(repo
            .transition(&job.id, "outcome_uncertain", "queued", None, None, 0)
            .await
            .is_err());
        assert_eq!(repo.checkpoint("s").await.unwrap(), Some(checkpoint));
    }
}
