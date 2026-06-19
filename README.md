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

## Giao diện Frontend & Hệ thống Quét QR (ReactJS / Vite)

Phần này bao gồm **Web Dashboard** dành cho doanh nghiệp và **Hệ thống Web Scanner** dành cho người dùng cuối nhằm thực hiện truy xuất nguồn gốc sản phẩm.

### Cài đặt và khởi chạy

Mở một Terminal mới và thực hiện các lệnh sau:

```bash
# Di chuyển vào thư mục frontend
cd frontend

# Cài đặt các thư viện cần thiết
# (bao gồm html5-qrcode, qrcode.react, react-router-dom, axios,...)
npm install

# Khởi động ứng dụng frontend
npm run dev
```

Sau khi khởi động thành công, truy cập:

```text
http://localhost:5173
```

---

## Hướng dẫn luồng truy xuất nguồn gốc bằng QR Code

### 1. Sinh tem QR (Phía doanh nghiệp)

* Sau khi tạo sản phẩm thành công trên Dashboard, hệ thống sẽ tự động sinh mã QR chứa đường dẫn định danh của sản phẩm (ví dụ: `/verify/1`).
* Doanh nghiệp có thể tải xuống hoặc lưu mã QR để in và dán lên bao bì sản phẩm.

### 2. Quét mã QR bằng camera (Phía người dùng)

* Truy cập đường dẫn:

```text
http://localhost:5173/scanner
```

* Trình duyệt sẽ yêu cầu quyền truy cập camera.
* Đưa mã QR của sản phẩm vào khung hình để hệ thống tự động nhận diện và giải mã.

### 3. Kiểm tra và đối chiếu dữ liệu Blockchain

* Sau khi quét thành công, hệ thống sẽ tự động chuyển hướng đến trang xác thực sản phẩm (`/verify/:id`).

* Frontend gửi yêu cầu đến Rust Backend để thực hiện đối chiếu ba lớp dữ liệu:

  * Database Hash
  * Recomputed Hash
  * Blockchain Hash

* Kết quả xác thực được hiển thị trực quan thông qua **3 trạng thái**:

  * **SẢN PHẨM CHÍNH HÃNG (VERIFIED)**: Khi cả ba giá trị hash trùng khớp hoàn toàn, chứng minh sản phẩm là thật và cơ sở dữ liệu chưa bị thay đổi. (Giao diện xanh lá)
  * **ĐANG CHỜ ĐỒNG BỘ CHUỖI (PENDING SYNC)**: Khi CSDL cục bộ vẫn an toàn và toàn vẹn, nhưng Blockchain không có bản ghi sản phẩm (thường xảy ra khi Hardhat node local bị restart về block 0). Hệ thống hiển thị màu cam kèm hộp chẩn đoán Sandbox thay vì báo lỗi giả mạo để tránh hiểu lầm.
  * **CẢNH BÁO GIAN LẬN (TAMPERED)**: Khi phát hiện sai lệch giữa giá trị băm trong CSDL và sổ cái Blockchain, cho thấy dữ liệu CSDL đã bị chỉnh sửa hoặc can thiệp trái phép. (Giao diện màu đỏ)

---

## 💡 Hướng dẫn dành cho Team Phát triển (Development & Integration Guide)

### 1. Cách vận hành & đồng bộ hóa môi trường Sandbox
Khi làm việc trên Localhost, do **Hardhat Node chạy trên bộ nhớ tạm (RAM)** nên mỗi khi tắt/khởi động lại máy tính, blockchain sẽ quay về block 0 (Genesis block) trong khi database PostgreSQL vẫn lưu dữ liệu cũ. Để đồng bộ lại:
1. **Khởi động Blockchain Node**: `npm run node`
2. **Deploy lại Smart Contract**: `npm run deploy:local` (Nhớ cập nhật địa chỉ Contract mới từ `deployments/deployment-info.json` vào `.env` của Rust Backend và restart backend).
3. **Đăng ký sản phẩm mới**: Hãy đăng ký sản phẩm mới trên Dashboard để sinh dữ liệu khớp với Blockchain hiện hành. Hoặc bạn có thể xóa các dòng cũ trong bảng `products` của PostgreSQL để làm sạch môi trường.

### 2. Các tệp tin Frontend được nâng cấp
*   [Verify.jsx](file:///e:/05.%20UEH/An%20toan%20ung%20dung%20web/Cuoi%20ki/product-traceability-dapp/frontend/src/pages/Verify.jsx): Tích hợp logic 3 trạng thái và **Hộp chẩn đoán Sandbox** giải thích bản chất bất biến của Blockchain khi gặp lỗi lệch pha dữ liệu.
*   [Dashboard.jsx](file:///e:/05.%20UEH/An%20toan%20ung%20dung%20web/Cuoi%20ki/product-traceability-dapp/frontend/src/pages/Dashboard.jsx): Tích hợp gọi `/api/verify` trong Drawer chi tiết sản phẩm để hiển thị **Trạng thái Blockchain** thời gian thực, đồng thời áp dụng **Lưới 3 cột hợp nhất (Unified Grid)** để căn thẳng hàng tuyệt đối.
*   [QRCodeDisplay.jsx](file:///e:/05.%20UEH/An%20toan%20ung%20dung%20web/Cuoi%20ki/product-traceability-dapp/frontend/src/components/QRCodeDisplay.jsx): Sử dụng thuộc tính `level="H"` cho QRCodeCanvas giúp tăng khả năng chống mờ/xước mã vạch lên đến 30%.
*   [Footer.jsx](file:///e:/05.%20UEH/An%20toan%20ung%20dung%20web/Cuoi%20ki/product-traceability-dapp/frontend/src/components/Footer.jsx): Cập nhật tên môn học thành **Blockchain**.
