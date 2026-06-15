CREATE TABLE IF NOT EXISTS products (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT UNIQUE NOT NULL CHECK (product_id > 0),
    name VARCHAR(255) NOT NULL CHECK (length(trim(name)) > 0),
    manufacturer VARCHAR(255) NOT NULL CHECK (length(trim(manufacturer)) > 0),
    description TEXT NOT NULL DEFAULT '',
    product_hash CHAR(64) NOT NULL CHECK (length(product_hash) = 64),
    tx_hash VARCHAR(100),
    creator_address VARCHAR(100),
    chain_created_at BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_product_id ON products(product_id);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);