mod config;
mod db;
mod error;
mod handlers;
mod models;
mod routes;
mod services;
mod state;

use crate::config::Config;
use crate::db::init_pool;
use crate::routes::app_router;
use crate::services::blockchain::BlockchainService;
use crate::state::AppState;
use std::sync::Arc;
use tokio::net::TcpListener;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();

    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::try_from_default_env().unwrap_or_else(|_| {
            "backend_rust=debug,tower_http=debug,sqlx=warn".into()
        }))
        .with(tracing_subscriber::fmt::layer())
        .init();

    let config = Config::from_env()?;
    let db_pool = init_pool(&config.database_url).await?;
    let blockchain = BlockchainService::new(&config).await?;

    let state = Arc::new(AppState {
        db: db_pool,
        blockchain,
    });

    let app = app_router(state);
    let listener = TcpListener::bind(&config.server_addr).await?;

    tracing::info!("Backend Rust is running on http://{}", config.server_addr);
    axum::serve(listener, app).await?;

    Ok(())
}