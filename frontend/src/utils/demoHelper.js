// Helper simulation for Offline Demo mode (Mock Mode)

// Calculate SHA-256 in browser using Web Crypto API
export async function calculateSha256(payload) {
  const msgBuffer = new TextEncoder().encode(payload);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

// Canonical input format matching Rust backend: product_id|name|manufacturer|description
export function getCanonicalPayload(productId, name, manufacturer, description) {
  return `${productId}|${name.trim()}|${manufacturer.trim()}|${description.trim()}`;
}

const INITIAL_MOCK_PRODUCTS = [
  {
    id: 1,
    product_id: 1001,
    name: "Cà phê Robusta Đắk Lắk",
    manufacturer: "Hợp tác xã Cà phê Ban Mê",
    description: "Hạt cà phê chín đỏ được thu hái thủ công, lên men tự nhiên và rang mộc nguyên bản.",
    product_hash: "44c38a775d95289776d079e5bccc0577265a15b67ae875aa8dedd364fe10d468", // real hash
    tx_hash: "0x39ba678ac90efb41c098df4e9a8f27cf8c222ff804e784d7bf4f2ff8089abcd44",
    creator_address: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 24).toISOString()
  },
  {
    id: 2,
    product_id: 1002,
    name: "Mật ong rừng U Minh Hạ",
    manufacturer: "Công ty Mật Ong Cà Mau",
    description: "Mật ong rừng ngập mặn tự nhiên nguyên chất 100% thu hoạch thủ công vào mùa hoa tràm.",
    product_hash: "875176d979193241b63c1969518bc0f254030f259f00f7a3bbdb70a4188392e0", // real hash
    tx_hash: "0x892a678ac90efb41c098df4e9a8f27cf8c222ff804e784d7bf4f2ff8089abc123",
    creator_address: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
    created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 5).toISOString()
  },
  {
    id: 3,
    product_id: 1003,
    name: "Gạo ST25 Sóc Trăng",
    manufacturer: "Doanh nghiệp Tư nhân Hồ Quang Trí",
    description: "Gạo ngon nhất thế giới, hạt gạo dài, trắng trong, cơm dẻo mềm, thơm hương lá dứa tự nhiên.",
    product_hash: "b23f7b6f5efa582f6134d0d764d76796ccc60d39373e09f802f7a884564783ec", // real hash
    tx_hash: "0x442a678ac90efb41c098df4e9a8f27cf8c222ff804e784d7bf4f2ff8089abc888",
    creator_address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    created_at: new Date(Date.now() - 3600000).toISOString(),
    updated_at: new Date(Date.now() - 3600000).toISOString()
  }
];

export async function initializeMockData() {
  const stored = localStorage.getItem('mock_products');
  if (!stored) {
    // Generate real sha256 hashes for initial mock products so that they verify correctly by default!
    for (let p of INITIAL_MOCK_PRODUCTS) {
      const payload = getCanonicalPayload(p.product_id, p.name, p.manufacturer, p.description);
      p.product_hash = await calculateSha256(payload);
    }
    localStorage.setItem('mock_products', JSON.stringify(INITIAL_MOCK_PRODUCTS));
  } else {
    // Auto-migrate: check if the stored products contain legacy dummy hashes and correct them
    let products = JSON.parse(stored);
    let updated = false;

    const dummyHashes = [
      "8a70c8d17bfa42194b6d0e82e8e98345c222ff804e784d7bf4f2ff8089abcd44",
      "4bc0c8d17bfa42194b6d0e82e8e98345c222ff804e784d7bf4f2ff8089abcf23",
      "2df0c8d17bfa42194b6d0e82e8e98345c222ff804e784d7bf4f2ff8089abc999"
    ];

    for (let p of products) {
      if (dummyHashes.includes(p.product_hash) || !p.product_hash) {
        const origName = p.original_data ? p.original_data.name : p.name;
        const origManuf = p.original_data ? p.original_data.manufacturer : p.manufacturer;
        const payload = getCanonicalPayload(p.product_id, origName, origManuf, p.description);
        p.product_hash = await calculateSha256(payload);
        updated = true;
      }
    }

    if (updated) {
      localStorage.setItem('mock_products', JSON.stringify(products));
    }
  }
}

export function getMockProducts() {
  const data = localStorage.getItem('mock_products');
  return data ? JSON.parse(data) : [];
}

export function saveMockProducts(products) {
  localStorage.setItem('mock_products', JSON.stringify(products));
}

// Add a product in mock mode
export async function addMockProduct(productId, name, manufacturer, description) {
  const products = getMockProducts();
  const exists = products.some(p => p.product_id === Number(productId));
  if (exists) {
    throw new Error("Conflict: Sản phẩm đã tồn tại!");
  }

  const payload = getCanonicalPayload(productId, name, manufacturer, description);
  const realHash = await calculateSha256(payload);

  const newProduct = {
    id: Date.now(),
    product_id: Number(productId),
    name: name.trim(),
    manufacturer: manufacturer.trim(),
    description: description.trim(),
    product_hash: realHash,
    tx_hash: "0x" + Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join(''),
    creator_address: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    // Keep track of database alterations for demo
    is_tampered: false,
    original_data: null
  };

  products.unshift(newProduct);
  saveMockProducts(products);
  return newProduct;
}

// Simulate database tampering
export function tamperMockProduct(productId) {
  const products = getMockProducts();
  const index = products.findIndex(p => p.product_id === Number(productId));
  
  if (index !== -1) {
    const p = products[index];
    if (!p.is_tampered) {
      p.original_data = {
        name: p.name,
        manufacturer: p.manufacturer
      };
      p.is_tampered = true;
      p.name = p.name + " (Đã bị sửa đổi)";
      p.manufacturer = "Hãng giả mạo";
      saveMockProducts(products);
      return { success: true, product: p };
    }
  }
  return { success: false };
}

// Reset tampered state
export function restoreMockProduct(productId) {
  const products = getMockProducts();
  const index = products.findIndex(p => p.product_id === Number(productId));
  
  if (index !== -1) {
    const p = products[index];
    if (p.is_tampered && p.original_data) {
      p.name = p.original_data.name;
      p.manufacturer = p.original_data.manufacturer;
      p.is_tampered = false;
      p.original_data = null;
      saveMockProducts(products);
      return { success: true, product: p };
    }
  }
  return { success: false };
}
