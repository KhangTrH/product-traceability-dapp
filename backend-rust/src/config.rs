use anyhow::{Context, Result};
use ethers::types::Address;
use std::env;
use std::str::FromStr;

#[derive(Clone, Debug)]
pub struct Config {
    pub server_addr: String,
    pub database_url: String,
    pub rpc_url: String,
    pub chain_id: u64,
    pub contract_address: Address,
    pub private_key: String,
}

impl Config {
    pub fn from_env() -> Result<Self> {
        let server_addr = env::var("SERVER_ADDR").unwrap_or_else(|_| "127.0.0.1:3000".to_string());
        let database_url = env::var("DATABASE_URL").context("DATABASE_URL is required")?;
        let rpc_url = env::var("RPC_URL").unwrap_or_else(|_| "http://127.0.0.1:8545".to_string());

        let chain_id = env::var("CHAIN_ID")
            .unwrap_or_else(|_| "31337".to_string())
            .parse::<u64>()
            .context("CHAIN_ID must be a valid u64")?;

        let contract_address = Address::from_str(
            &env::var("CONTRACT_ADDRESS").context("CONTRACT_ADDRESS is required")?,
        )
        .context("CONTRACT_ADDRESS is invalid")?;

        let private_key = env::var("PRIVATE_KEY").context("PRIVATE_KEY is required")?;

        Ok(Self {
            server_addr,
            database_url,
            rpc_url,
            chain_id,
            contract_address,
            private_key,
        })
    }
}