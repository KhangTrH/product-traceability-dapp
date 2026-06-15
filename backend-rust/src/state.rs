use crate::services::blockchain::BlockchainService;
use sqlx::PgPool;

#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,
    pub blockchain: BlockchainService,
}