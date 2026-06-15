use ethers::types::H256;
use sha2::{Digest, Sha256};

/// Canonical input format used by the backend:
/// product_id|name|manufacturer|description
///
/// This keeps hash generation stable for both create and verify flows.
pub fn canonical_product_payload(
    product_id: i64,
    name: &str,
    manufacturer: &str,
    description: &str,
) -> String {
    format!(
        "{}|{}|{}|{}",
        product_id,
        name.trim(),
        manufacturer.trim(),
        description.trim()
    )
}

pub fn generate_product_hash_bytes(
    product_id: i64,
    name: &str,
    manufacturer: &str,
    description: &str,
) -> [u8; 32] {
    let payload = canonical_product_payload(product_id, name, manufacturer, description);
    let digest = Sha256::digest(payload.as_bytes());

    let mut bytes = [0u8; 32];
    bytes.copy_from_slice(&digest);

    bytes
}

pub fn generate_product_hash_hex(
    product_id: i64,
    name: &str,
    manufacturer: &str,
    description: &str,
) -> String {
    hex::encode(generate_product_hash_bytes(
        product_id,
        name,
        manufacturer,
        description,
    ))
}

pub fn generate_product_hash_h256(
    product_id: i64,
    name: &str,
    manufacturer: &str,
    description: &str,
) -> H256 {
    H256::from(generate_product_hash_bytes(
        product_id,
        name,
        manufacturer,
        description,
    ))
}

pub fn h256_to_hex(hash: H256) -> String {
    hex::encode(hash.as_bytes())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn same_product_data_has_same_hash() {
        let h1 = generate_product_hash_hex(1, "Coffee", "ABC", "Original");
        let h2 = generate_product_hash_hex(1, "Coffee", "ABC", "Original");

        assert_eq!(h1, h2);
        assert_eq!(h1.len(), 64);
    }

    #[test]
    fn changed_description_changes_hash() {
        let h1 = generate_product_hash_hex(1, "Coffee", "ABC", "Original");
        let h2 = generate_product_hash_hex(1, "Coffee", "ABC", "Changed");

        assert_ne!(h1, h2);
    }
}