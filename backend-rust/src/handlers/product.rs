use crate::error::{AppError, AppResult};
use crate::models::product::{CreateProductRequest, CreateProductResponse, ProductResponse, ProductRow};
use crate::services::hash;
use crate::state::AppState;
use axum::{
    extract::{Path, State},
    Json,
};
use std::sync::Arc;

pub async fn create_product(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<CreateProductRequest>,
) -> AppResult<Json<CreateProductResponse>> {
    validate_create_payload(&payload)?;

    let existing_db = sqlx::query_scalar::<_, i64>(
        "SELECT product_id FROM products WHERE product_id = $1",
    )
    .bind(payload.product_id)
    .fetch_optional(&state.db)
    .await?;

    if existing_db.is_some() {
        return Err(AppError::Conflict);
    }

    let chain_exists = state.blockchain.is_product_exists(payload.product_id).await?;
    if chain_exists {
        return Err(AppError::Conflict);
    }

    let product_hash_hex = hash::generate_product_hash_hex(
        payload.product_id,
        &payload.name,
        &payload.manufacturer,
        &payload.description,
    );

    let product_hash_h256 = hash::generate_product_hash_h256(
        payload.product_id,
        &payload.name,
        &payload.manufacturer,
        &payload.description,
    );

    let tx_hash = state
        .blockchain
        .create_product(payload.product_id, payload.name.trim(), product_hash_h256)
        .await?;

    let chain_product = state.blockchain.get_product(payload.product_id).await?;

    let row = sqlx::query_as::<_, ProductRow>(
        r#"
        INSERT INTO products (
            product_id,
            name,
            manufacturer,
            description,
            product_hash,
            tx_hash,
            creator_address,
            chain_created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING
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
        "#,
    )
    .bind(payload.product_id)
    .bind(payload.name.trim())
    .bind(payload.manufacturer.trim())
    .bind(payload.description.trim())
    .bind(product_hash_hex)
    .bind(tx_hash)
    .bind(format!("{:#x}", chain_product.creator))
    .bind(chain_product.created_at.as_u64() as i64)
    .fetch_one(&state.db)
    .await?;

    Ok(Json(CreateProductResponse {
        message: "Product created successfully".to_string(),
        product: row.into(),
    }))
}

pub async fn list_products(
    State(state): State<Arc<AppState>>,
) -> AppResult<Json<Vec<ProductResponse>>> {
    let rows = sqlx::query_as::<_, ProductRow>(
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
        ORDER BY created_at DESC
        "#,
    )
    .fetch_all(&state.db)
    .await?;

    let products = rows.into_iter().map(ProductResponse::from).collect();
    Ok(Json(products))
}

pub async fn get_product(
    State(state): State<Arc<AppState>>,
    Path(product_id): Path<i64>,
) -> AppResult<Json<ProductResponse>> {
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
    .bind(product_id)
    .fetch_optional(&state.db)
    .await?
    .ok_or(AppError::NotFound)?;

    Ok(Json(row.into()))
}

fn validate_create_payload(payload: &CreateProductRequest) -> AppResult<()> {
    if payload.product_id <= 0 {
        return Err(AppError::BadRequest(
            "product_id must be greater than 0".to_string(),
        ));
    }

    if payload.name.trim().is_empty() {
        return Err(AppError::BadRequest("name must not be empty".to_string()));
    }

    if payload.manufacturer.trim().is_empty() {
        return Err(AppError::BadRequest(
            "manufacturer must not be empty".to_string(),
        ));
    }

    Ok(())
}