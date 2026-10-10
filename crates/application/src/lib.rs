pub mod api;
pub mod engine;
use anyhow::Result;
use autoprint_document_rendering::Renderer;
use autoprint_persistence::Repository;
use std::{collections::BTreeMap, path::PathBuf, sync::Arc};
use tokio::sync::{Mutex, Notify};

#[derive(Clone)]
pub struct Application {
    pub repo: Repository,
    pub renderer: Renderer,
    pub token: Arc<String>,
    pub data: PathBuf,
    pub health: Arc<Mutex<BTreeMap<String, serde_json::Value>>>,
    pub wake: Arc<Notify>,
    pub sumatra: Option<PathBuf>,
}
impl Application {
    pub async fn seed(&self) -> Result<()> {
        if self
            .repo
            .list::<serde_json::Value>("templates")
            .await?
            .is_empty()
        {
            for template in autoprint_template_core::builtins() {
                self.repo.publish(&template.id, &template).await?;
            }
        }
        if self
            .repo
            .list::<serde_json::Value>("papers")
            .await?
            .is_empty()
        {
            for paper in autoprint_domain::paper_catalog() {
                self.repo.put("papers", &paper.id, &paper).await?;
            }
        }
        Ok(())
    }
}
