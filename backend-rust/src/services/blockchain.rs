use crate::config::Config;
use crate::error::AppError;
use ethers::abi::Abi;
use ethers::contract::Contract;
use ethers::middleware::SignerMiddleware;
use ethers::providers::{Http, Provider};
use ethers::signers::{LocalWallet, Signer};
use ethers::types::{Address, H256, U256};
use std::sync::Arc;
use std::time::Duration;

const PRODUCT_TRACEABILITY_ABI: &str = r#"
[
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "productId",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "name",
        "type": "string"
      },
      {
        "internalType": "bytes32",
        "name": "productHash",
        "type": "bytes32"
      }
    ],
    "name": "createProduct",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "productId",
        "type": "uint256"
      }
    ],
    "name": "getProduct",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "name",
        "type": "string"
      },
      {
        "internalType": "bytes32",
        "name": "productHash",
        "type": "bytes32"
      },
      {
        "internalType": "address",
        "name": "creator",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "createdAt",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "productId",
        "type": "uint256"
      },
      {
        "internalType": "bytes32",
        "name": "productHash",
        "type": "bytes32"
      }
    ],
    "name": "verifyProduct",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "productId",
        "type": "uint256"
      }
    ],
    "name": "getProductHash",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "productId",
        "type": "uint256"
      }
    ],
    "name": "isProductExists",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
]
"#;

type EthClient = SignerMiddleware<Provider<Http>, LocalWallet>;

#[derive(Clone)]
pub struct BlockchainService {
    contract: Contract<EthClient>,
}

#[derive(Debug, Clone)]
pub struct ChainProduct {
    pub id: U256,
    pub name: String,
    pub product_hash: H256,
    pub creator: Address,
    pub created_at: U256,
}

impl BlockchainService {
    pub async fn new(config: &Config) -> Result<Self, AppError> {
        let provider = Provider::<Http>::try_from(config.rpc_url.as_str())
            .map_err(|e| AppError::Blockchain(e.to_string()))?
            .interval(Duration::from_millis(10));

        let wallet = config
            .private_key
            .parse::<LocalWallet>()
            .map_err(|e| AppError::Blockchain(e.to_string()))?
            .with_chain_id(config.chain_id);

        let client = Arc::new(SignerMiddleware::new(provider, wallet));

        let abi: Abi = serde_json::from_str(PRODUCT_TRACEABILITY_ABI)
            .map_err(|e| AppError::Internal(e.to_string()))?;

        let contract = Contract::new(config.contract_address, abi, client);

        Ok(Self { contract })
    }

    pub async fn create_product(
        &self,
        product_id: i64,
        name: &str,
        product_hash: H256,
    ) -> Result<String, AppError> {
        let id = to_u256(product_id)?;

        let call = self
            .contract
            .method::<_, ()>("createProduct", (id, name.to_string(), product_hash))
            .map_err(|e| AppError::Blockchain(e.to_string()))?;

        let pending_tx = call
            .send()
            .await
            .map_err(|e| AppError::Blockchain(e.to_string()))?;

        let tx_hash = pending_tx.tx_hash();

        pending_tx
            .await
            .map_err(|e| AppError::Blockchain(e.to_string()))?
            .ok_or_else(|| AppError::Blockchain("Transaction dropped before receipt".to_string()))?;

        Ok(format!("{:#x}", tx_hash))
    }

    pub async fn get_product(&self, product_id: i64) -> Result<ChainProduct, AppError> {
        let id = to_u256(product_id)?;

        let (id, name, product_hash, creator, created_at): (
            U256,
            String,
            H256,
            Address,
            U256,
        ) = self
            .contract
            .method::<_, (U256, String, H256, Address, U256)>("getProduct", id)
            .map_err(|e| AppError::Blockchain(e.to_string()))?
            .call()
            .await
            .map_err(|e| AppError::Blockchain(e.to_string()))?;

        Ok(ChainProduct {
            id,
            name,
            product_hash,
            creator,
            created_at,
        })
    }

    pub async fn verify_product(
        &self,
        product_id: i64,
        product_hash: H256,
    ) -> Result<bool, AppError> {
        let id = to_u256(product_id)?;

        self.contract
            .method::<_, bool>("verifyProduct", (id, product_hash))
            .map_err(|e| AppError::Blockchain(e.to_string()))?
            .call()
            .await
            .map_err(|e| AppError::Blockchain(e.to_string()))
    }

    pub async fn get_product_hash(&self, product_id: i64) -> Result<H256, AppError> {
        let id = to_u256(product_id)?;

        self.contract
            .method::<_, H256>("getProductHash", id)
            .map_err(|e| AppError::Blockchain(e.to_string()))?
            .call()
            .await
            .map_err(|e| AppError::Blockchain(e.to_string()))
    }

    pub async fn is_product_exists(&self, product_id: i64) -> Result<bool, AppError> {
        let id = to_u256(product_id)?;

        self.contract
            .method::<_, bool>("isProductExists", id)
            .map_err(|e| AppError::Blockchain(e.to_string()))?
            .call()
            .await
            .map_err(|e| AppError::Blockchain(e.to_string()))
    }
}

fn to_u256(product_id: i64) -> Result<U256, AppError> {
    if product_id <= 0 {
        return Err(AppError::BadRequest(
            "product_id must be greater than 0".to_string(),
        ));
    }

    Ok(U256::from(product_id as u64))
}