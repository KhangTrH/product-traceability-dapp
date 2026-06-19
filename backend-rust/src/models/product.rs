use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Deserialize)]
pub struct CreateProductRequest {
    pub product_id: i64,
    pub name: String,
    pub manufacturer: String,
    pub description: String,
}

#[derive(Debug, Deserialize)]
pub struct VerifyProductRequest {
    pub product_id: i64,
}

#[derive(Debug, Serialize, FromRow)]
pub struct ProductRow {
    pub id: i64,
    pub product_id: i64,
    pub name: String,
    pub manufacturer: String,
    pub description: String,
    pub product_hash: String,
    pub tx_hash: Option<String>,
    pub creator_address: Option<String>,
    pub chain_created_at: Option<i64>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
pub struct ProductResponse {
    pub id: i64,
    pub product_id: i64,
    pub name: String,
    pub manufacturer: String,
    pub description: String,
    pub product_hash: String,
    pub tx_hash: Option<String>,
    pub creator_address: Option<String>,
    pub chain_created_at: Option<i64>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
pub struct CreateProductResponse {
    pub message: String,
    pub product: ProductResponse,
}

#[derive(Debug, Serialize)]
pub struct VerifyProductResponse {
    pub product_id: i64,
    pub name: String,
    pub manufacturer: String,
    pub description: String,
    pub db_hash: String,
    pub recomputed_hash: String,
    pub blockchain_hash: String,
    pub db_integrity: bool,
    pub blockchain_verified: bool,
    pub status: VerifyStatus,
    pub message: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "UPPERCASE")]
pub enum VerifyStatus {
    Valid,
    Invalid,
}

impl From<ProductRow> for ProductResponse {
    fn from(row: ProductRow) -> Self {
        Self {
            id: row.id,
            product_id: row.product_id,
            name: row.name,
            manufacturer: row.manufacturer,
            description: row.description,
            product_hash: row.product_hash,
            tx_hash: row.tx_hash,
            creator_address: row.creator_address,
            chain_created_at: row.chain_created_at,
            created_at: row.created_at,
            updated_at: row.updated_at,
        }
    }
}