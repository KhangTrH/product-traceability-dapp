#  Blockchain Developer 

Phần Smart Contract của dApp **Truy xuất nguồn gốc sản phẩm**  
Công nghệ: **Solidity 0.8.19 + Hardhat + Mocha/Chai**

---

##  Cấu trúc thư mục

```
blockchain-member1/
├── contracts/
│   └── ProductTraceability.sol     ← Smart Contract chính
├── scripts/
│   └── deploy.js                   ← Script deploy
├── test/
│   └── ProductTraceability.test.js ← Test suite (7 test cases)
├── deployments/                    ← Tự sinh sau khi deploy
│   └── deployment-info.json
├── hardhat.config.js
├── package.json
├── .env.example
└── .gitignore
```

---

##  Cài đặt

```bash
npm install
cp .env.example .env
```

---

##  Compile & Deploy

```bash
# Compile contract
npm run compile

# Deploy lên Hardhat in-process
npm run deploy

# Deploy lên localhost node (chạy `npm run node` trước)
npm run node          # Terminal 1
npm run deploy:local  # Terminal 2
```

---

##  Chạy Test

```bash
npm test
```

### Kết quả mong đợi

```
ProductTraceability
  [TC-01] createProduct() - Tạo sản phẩm thành công
    ✓ Nên lưu đúng thông tin sản phẩm vào Blockchain
    ✓ Nên cập nhật đúng createdAt (timestamp > 0)
    ✓ Nên cho phép tạo nhiều sản phẩm với productId khác nhau

  [TC-02] createProduct() - Không cho tạo trùng productId
    ✓ Nên revert với lỗi ProductAlreadyExists khi tạo trùng ID
    ✓ Nên revert khi productId = 0 (không hợp lệ)
    ✓ Nên revert khi name rỗng

  [TC-03] createProduct() - Không cho hash rỗng (bytes32(0))
    ✓ Nên revert với lỗi InvalidProductHash khi truyền ZERO_HASH
    ✓ Nên chấp nhận hash hợp lệ (khác bytes32(0))

  [TC-04] getProduct() - Trả về đúng dữ liệu
    ✓ Nên trả về đầy đủ 5 trường: id, name, hash, creator, createdAt
    ✓ Nên revert với ProductNotFound khi productId không tồn tại
    ✓ Nên trả về đúng creator khi người tạo là addr1

  [TC-05] verifyProduct() - Trả về true khi hash đúng
    ✓ Nên trả về true khi hash truyền vào khớp với hash trên Blockchain
    ✓ Nên trả về true nhất quán cho nhiều lần gọi với hash đúng

  [TC-06] verifyProduct() - Trả về false khi hash sai
    ✓ Nên trả về false khi hash truyền vào KHÁC với hash trên Blockchain
    ✓ Nên trả về false khi truyền ZERO_HASH so với hash hợp lệ
    ✓ Nên revert với ProductNotFound khi verify sản phẩm không tồn tại
    ✓ Nên phân biệt đúng giữa hai sản phẩm khác nhau

  [TC-07] Event ProductCreated - Phát ra đúng khi tạo sản phẩm
    ✓ Nên emit event ProductCreated với đúng productId, productHash, creator
    ✓ Nên emit event với creator là addr1 khi addr1 gọi createProduct
    ✓ Nên emit event cho mỗi sản phẩm mới được tạo
    ✓ Nên KHÔNG emit event khi createProduct bị revert

22 passing
```

---

##  Smart Contract – Tổng quan

### Struct Product
| Field | Type | Mô tả |
|---|---|---|
| `id` | `uint256` | ID sản phẩm |
| `name` | `string` | Tên sản phẩm |
| `productHash` | `bytes32` | SHA256 hash từ Rust Backend |
| `creator` | `address` | Ví người tạo |
| `createdAt` | `uint256` | Unix timestamp |

### Functions
| Hàm | Mô tả |
|---|---|
| `createProduct(id, name, hash)` | Tạo sản phẩm, lưu hash lên chain |
| `getProduct(id)` | Trả về thông tin đầy đủ |
| `verifyProduct(id, hash)` | So sánh hash → true/false |
| `getProductHash(id)` | Lấy hash đã lưu |
| `isProductExists(id)` | Kiểm tra tồn tại |

### Ràng buộc
- `productId > 0` và chưa tồn tại
- `productHash != bytes32(0)`
- `name` không rỗng

---

##  Tích hợp với Rust Backend

Sau khi deploy, copy `contractAddress` từ `deployments/deployment-info.json` vào `.env` của backend-rust:

```env
CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
RPC_URL=http://127.0.0.1:8545
```

Backend dùng `ethers-rs` để gọi 3 hàm:
- `createProduct()` → lưu hash khi tạo sản phẩm
- `getProduct()` → lấy thông tin
- `verifyProduct()` → xác thực hash

---

## 💻 Giao diện Frontend & Hệ thống Quét QR (ReactJS / Vite)

Phần này bao gồm Web Dashboard dành cho doanh nghiệp và Hệ thống Web Scanner dành cho người dùng cuối để truy xuất nguồn gốc.

### Cài đặt và Khởi chạy
Mở một Terminal mới và chạy các lệnh sau:

```bash
# Di chuyển vào thư mục frontend
cd frontend

# Cài đặt thư viện (bao gồm html5-qrcode, qrcode.react, react-router-dom, axios)
npm install

# Khởi động server giao diện
npm run dev

Truy cập trình duyệt tại: http://localhost:5173

```
🔍 Hướng dẫn luồng Truy xuất nguồn gốc (QR Code Scanner)
1. Sinh tem QR (Phía Doanh nghiệp): - Sau khi tạo sản phẩm thành công trên Dashboard, hệ thống tự động sinh ra một mã QR chứa đường dẫn định danh của sản phẩm (VD: /verify/1).
  - Doanh nghiệp có thể lưu mã QR này để dán lên bao bì sản phẩm.

2. Sử dụng Camera quét mã (Phía Người dùng):
  - Truy cập vào đường dẫn http://localhost:5173/scanner.
  - Trình duyệt sẽ yêu cầu quyền sử dụng Camera.
  - Đưa tem QR sản phẩm vào khung hình để hệ thống tự động nhận diện.

3. Kiểm tra và Đối chiếu Blockchain:
  - Ngay khi đọc được mã, hệ thống chuyển hướng sang trang Xác thực (/verify/:id).
  - Frontend sẽ gọi API xuống Rust Backend để đối chiếu 3 lớp dữ liệu: Database Hash, Recomputed Hash, và Blockchain Hash.
  - Kết quả trả về: Hiển thị mác ✅ SẢN PHẨM CHÍNH HÃNG (Nếu toàn vẹn) hoặc ❌ CẢNH BÁO GIAN LẬN (Nếu dữ liệu Database đã bị can thiệp trái phép).