use anyhow::{bail, Context, Result};
use autoprint_domain::{Order, Store};
use autoprint_security::Credentials;
use reqwest::{Client, StatusCode};
use std::time::Duration;

pub struct WooClient {
    client: Client,
}
impl WooClient {
    pub fn new() -> Result<Self> {
        Ok(Self {
            client: Client::builder()
                .redirect(reqwest::redirect::Policy::none())
                .connect_timeout(Duration::from_secs(10))
                .timeout(Duration::from_secs(30))
                .user_agent("WooCommerce-AutoPrint/0.1")
                .build()?,
        })
    }
    async fn page(
        &self,
        base: &str,
        credentials: &Credentials,
        page: u32,
        after: &str,
        before: &str,
    ) -> Result<(Vec<Order>, u32)> {
        let response = self
            .client
            .get(format!(
                "{}/wp-json/wc/v3/orders",
                base.trim_end_matches('/')
            ))
            .basic_auth(&credentials.key, Some(&credentials.secret))
            .query(&[
                ("per_page", "100"),
                ("page", &page.to_string()),
                ("orderby", "modified"),
                ("order", "asc"),
                ("modified_after", after),
                ("modified_before", before),
                ("dates_are_gmt", "true"),
            ])
            .send()
            .await
            .context("Store connection timed out or could not be established")?;
        if response.status() == StatusCode::UNAUTHORIZED
            || response.status() == StatusCode::FORBIDDEN
        {
            bail!("Store rejected credentials; check read permission");
        }
        if response.status().is_redirection() {
            bail!("Store redirects are disabled to protect credentials; use the final HTTPS URL");
        }
        if !response.status().is_success() {
            bail!("WooCommerce returned HTTP {}", response.status().as_u16());
        }
        let pages = response
            .headers()
            .get("x-wp-totalpages")
            .and_then(|h| h.to_str().ok())
            .and_then(|s| s.parse().ok())
            .ok_or_else(|| {
                anyhow::anyhow!(
                    "WooCommerce pagination headers missing; checkpoint has not advanced"
                )
            })?;
        if pages > 1000 {
            bail!("Sync exceeds 100,000 orders; narrow the recovery window");
        }
        if response
            .content_length()
            .is_some_and(|n| n > 16 * 1024 * 1024)
        {
            bail!("Store response exceeds 16 MB");
        }
        let mut response = response;
        let mut bytes = Vec::new();
        while let Some(chunk) = response
            .chunk()
            .await
            .context("Store response interrupted")?
        {
            if bytes.len() + chunk.len() > 16 * 1024 * 1024 {
                bail!("Store response exceeds 16 MB");
            }
            bytes.extend_from_slice(&chunk);
        }
        let orders: Vec<Order> =
            serde_json::from_slice(&bytes).context("Store returned unsupported order data")?;
        for o in &orders {
            o.validate()?;
        }
        Ok((orders, pages))
    }
    pub async fn orders(
        &self,
        store: &Store,
        credentials: &Credentials,
        after: &str,
        before: &str,
    ) -> Result<Vec<Order>> {
        store.validate()?;
        self.retrieve(&store.url, credentials, after, before).await
    }
    async fn retrieve(
        &self,
        url: &str,
        credentials: &Credentials,
        after: &str,
        before: &str,
    ) -> Result<Vec<Order>> {
        let mut orders = Vec::new();
        let mut page = 1;
        loop {
            let (mut found, total) = self.page(url, credentials, page, after, before).await?;
            orders.append(&mut found);
            if page >= total.max(1) {
                break;
            }
            page += 1;
        }
        orders.sort_by(|a, b| (&a.date_modified_gmt, a.id).cmp(&(&b.date_modified_gmt, b.id)));
        orders.dedup_by_key(|o| o.id);
        Ok(orders)
    }
    pub async fn test(&self, store: &Store, credentials: &Credentials) -> Result<()> {
        store.validate()?;
        self.page(
            &store.url,
            credentials,
            1,
            "1970-01-01T00:00:00",
            "1970-01-01T00:00:01",
        )
        .await?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tokio::io::{AsyncReadExt, AsyncWriteExt};
    #[tokio::test]
    async fn pagination_and_precision() {
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let url = format!("http://{}", listener.local_addr().unwrap());
        let task = tokio::spawn(async move {
            for page in 1..=2 {
                let (mut stream, _) = listener.accept().await.unwrap();
                let mut buf = [0; 8192];
                let n = stream.read(&mut buf).await.unwrap();
                let request = String::from_utf8_lossy(&buf[..n]);
                assert!(
                    request.contains("Authorization: Basic")
                        || request.contains("authorization: Basic")
                );
                assert!(request.contains(&format!("page={page}")));
                let body=serde_json::json!([{"id":page,"number":page.to_string(),"status":"processing","currency":"USD","total":"9007199254740992.01","date_modified_gmt":"2026-10-10T01:00:00"}]).to_string();
                let response=format!("HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nX-WP-TotalPages: 2\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",body.len(),body);
                stream.write_all(response.as_bytes()).await.unwrap();
            }
        });
        let client = WooClient::new().unwrap();
        let c = Credentials {
            key: "ck_test".into(),
            secret: "cs_test".into(),
        };
        let orders = client
            .retrieve(&url, &c, "2026-10-09T00:00:00", "2026-10-10T23:00:00")
            .await
            .unwrap();
        assert_eq!(orders.len(), 2);
        assert_eq!(orders[0].total, "9007199254740992.01");
        task.await.unwrap();
    }
    #[test]
    fn remote_https_only() {
        let s = Store {
            id: "s".into(),
            name: "Store".into(),
            url: "http://example.com".into(),
            poll_seconds: 30,
            automation: false,
            locale: "en".into(),
            timezone: "UTC".into(),
        };
        assert!(s.validate().is_err());
    }
}
