use crate::handlers::{health, product, verify};
use crate::state::AppState;
use axum::{
    routing::{get, post},
    Router,
};
use std::sync::Arc;
use tower_http::{cors::CorsLayer, trace::TraceLayer};

pub fn app_router(state: Arc<AppState>) -> Router {
    Router::new()
        .route("/health", get(health::health_check))
        .route(
            "/api/products",
            post(product::create_product).get(product::list_products),
        )
        .route("/api/products/{product_id}", get(product::get_product))
        .route("/api/verify", post(verify::verify_product))
        .with_state(state)
        .layer(CorsLayer::permissive())
        .layer(TraceLayer::new_for_http())
}