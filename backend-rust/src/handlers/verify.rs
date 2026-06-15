use crate::error::{AppError, AppResult};
use crate::models::product::{ProductRow, VerifyProductRequest, VerifyProductResponse, VerifyStatus};
use crate::services::hash;
use crate::state::AppState;
use axum::{extract::State, Json};
use std::sync::Arc;

pub async fn verify_product(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<VerifyProductRequest>,
) -> AppResult<Json<VerifyProductResponse>> {
    if payload.product_id <= 0 {
        return Err(AppError::BadRequest(
            "product_id must be greater than 0".to_string(),
        ));
    }

    let row = sqlx::query_as::<_, ProductRow>(
        r#"
        SELECT
            id,
            product_id,
            name,
            manufacturer,
            description,
            product_hash,
            tx_hash,
            creator_address,
            chain_created_at,
            created_at,
            updated_at
        FROM products
        WHERE product_id = $1
        "#,
    )
    .bind(payload.product_id)
    .fetch_optional(&state.db)
    .await?
    .ok_or(AppError::NotFound)?;

    let recomputed_hash = hash::generate_product_hash_hex(
        row.product_id,
        &row.name,
        &row.manufacturer,
        &row.description,
    );

    let recomputed_h256 = hash::generate_product_hash_h256(
        row.product_id,
        &row.name,
        &row.manufacturer,
        &row.description,
    );

    let chain_exists = state.blockchain.is_product_exists(row.product_id).await?;

    if !chain_exists {
        return Ok(Json(VerifyProductResponse {
            product_id: row.product_id,
            name: row.name,
            db_hash: row.product_hash,
            recomputed_hash,
            blockchain_hash: String::new(),
            db_integrity: false,
            blockchain_verified: false,
            status: VerifyStatus::Invalid,
            message: "Product exists in database but not on blockchain".to_string(),
        }));
    }

    let blockchain_hash = state.blockchain.get_product_hash(row.product_id).await?;
    let blockchain_hash_hex = hash::h256_to_hex(blockchain_hash);

    let blockchain_verified = state
        .blockchain
        .verify_product(row.product_id, recomputed_h256)
        .await?;

    let db_integrity = row.product_hash == recomputed_hash;
    let hash_matches_chain = recomputed_hash == blockchain_hash_hex;
    let is_valid = db_integrity && hash_matches_chain && blockchain_verified;

    Ok(Json(VerifyProductResponse {
        product_id: row.product_id,
        name: row.name,
        db_hash: row.product_hash,
        recomputed_hash,
        blockchain_hash: blockchain_hash_hex,
        db_integrity,
        blockchain_verified,
        status: if is_valid {
            VerifyStatus::Valid
        } else {
            VerifyStatus::Invalid
        },
        message: if is_valid {
            "Product data is valid and matches blockchain hash".to_string()
        } else {
            "Product data is invalid or does not match blockchain hash".to_string()
        },
    }))
}