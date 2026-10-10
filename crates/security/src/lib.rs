use anyhow::{bail, Context, Result};
use base64::{engine::general_purpose::STANDARD, Engine};
use hmac::{Hmac, Mac};
use serde::{Deserialize, Serialize};
use sha2::Sha256;
use std::{fs::OpenOptions, io::Write, path::Path};
use subtle::ConstantTimeEq;
use uuid::Uuid;
use zeroize::Zeroize;

#[derive(Serialize, Deserialize, Zeroize)]
#[zeroize(drop)]
pub struct Credentials {
    pub key: String,
    pub secret: String,
}
impl Credentials {
    pub fn validate(&self) -> Result<()> {
        if !self.key.starts_with("ck_")
            || !self.secret.starts_with("cs_")
            || self.key.len() > 200
            || self.secret.len() > 200
        {
            bail!("Enter a WooCommerce consumer key and secret");
        }
        Ok(())
    }
}
pub fn save_credentials(id: &str, credentials: &Credentials) -> Result<()> {
    credentials.validate()?;
    keyring::Entry::new("WooCommerce-AutoPrint", id)?
        .set_password(&serde_json::to_string(credentials)?)
        .context("Cannot save credentials in the operating-system vault")
}
pub fn load_credentials(id: &str) -> Result<Credentials> {
    let mut text = keyring::Entry::new("WooCommerce-AutoPrint", id)?
        .get_password()
        .context("Store credentials unavailable; reconnect the store")?;
    let result = serde_json::from_str(&text).context("Store credentials are invalid");
    text.zeroize();
    result
}
pub fn delete_credentials(id: &str) -> Result<()> {
    keyring::Entry::new("WooCommerce-AutoPrint", id)?
        .delete_credential()
        .context("Unable to remove stored credentials")
}
pub fn token() -> String {
    format!("{}{}", Uuid::new_v4().simple(), Uuid::new_v4().simple())
}
pub fn authenticate(actual: &[u8], expected: &[u8]) -> bool {
    actual.ct_eq(expected).into()
}
pub fn verify_webhook(secret: &[u8], payload: &[u8], signature: &str) -> bool {
    let Ok(signature) = STANDARD.decode(signature) else {
        return false;
    };
    let Ok(mut mac) = Hmac::<Sha256>::new_from_slice(secret) else {
        return false;
    };
    mac.update(payload);
    mac.verify_slice(&signature).is_ok()
}
pub fn private_write(path: &Path, bytes: &[u8]) -> Result<()> {
    let mut opts = OpenOptions::new();
    opts.write(true).create_new(true);
    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt;
        opts.mode(0o600);
    }
    let mut file = opts
        .open(path)
        .context("Cannot create private runtime file")?;
    file.write_all(bytes)?;
    file.sync_all()?;
    Ok(())
}
pub fn private_directory(path: &Path) -> Result<()> {
    std::fs::create_dir_all(path)?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        std::fs::set_permissions(path, std::fs::Permissions::from_mode(0o700))?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn webhook_signature() {
        let payload = b"order";
        let mut mac = Hmac::<Sha256>::new_from_slice(b"secret").unwrap();
        mac.update(payload);
        let sig = STANDARD.encode(mac.finalize().into_bytes());
        assert!(verify_webhook(b"secret", payload, &sig));
        assert!(!verify_webhook(b"secret", b"changed", &sig));
        assert!(!verify_webhook(b"secret", payload, "invalid"));
    }
    #[test]
    fn bearer() {
        assert!(authenticate(b"token", b"token"));
        assert!(!authenticate(b"token", b"tokens"));
    }
    #[test]
    fn private_file_no_overwrite() {
        let d = tempfile::tempdir().unwrap();
        let p = d.path().join("token");
        private_write(&p, b"secret").unwrap();
        assert!(private_write(&p, b"other").is_err());
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            assert_eq!(
                std::fs::metadata(p).unwrap().permissions().mode() & 0o777,
                0o600
            );
        }
    }
}
