/**
 * ProductTraceability.test.js
 * ─────────────────────────────────────────────────────────────────
 * Test suite cho Smart Contract ProductTraceability
 * Framework: Hardhat + Mocha + Chai + ethers.js v6
 *
 * Cách chạy:
 *   npx hardhat test
 *   npx hardhat test --grep "createProduct"   (chạy test cụ thể)
 *
 * Test cases:
 *   [TC-01] Tạo sản phẩm thành công
 *   [TC-02] Không cho tạo trùng productId
 *   [TC-03] Không cho tạo sản phẩm với hash rỗng
 *   [TC-04] getProduct() trả về đúng dữ liệu
 *   [TC-05] verifyProduct() trả về true khi hash đúng
 *   [TC-06] verifyProduct() trả về false khi hash sai
 *   [TC-07] Event ProductCreated được phát ra đúng
 * ─────────────────────────────────────────────────────────────────
 */

const { expect }     = require("chai");
const { ethers }     = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

// ──────────────────────────────────────────────────────────────────
//  Helpers
// ──────────────────────────────────────────────────────────────────

/**
 * Tạo bytes32 hash từ chuỗi string (giả lập SHA256 hash của Rust Backend)
 * Dùng ethers.keccak256 + ethers.toUtf8Bytes để tạo hash 32 bytes
 */
function makeHash(data) {
  return ethers.keccak256(ethers.toUtf8Bytes(data));
}

/**
 * Hash rỗng = bytes32(0) = 64 ký tự 0 với prefix 0x
 */
const ZERO_HASH = ethers.ZeroHash; // "0x0000...0000" (32 bytes)

// ──────────────────────────────────────────────────────────────────
//  Fixture: deploy contract một lần, dùng lại cho tất cả test
// ──────────────────────────────────────────────────────────────────

async function deployContractFixture() {
  const [owner, addr1, addr2] = await ethers.getSigners();

  const ProductTraceability = await ethers.getContractFactory(
    "ProductTraceability"
  );
  const contract = await ProductTraceability.deploy();
  await contract.waitForDeployment();

  return { contract, owner, addr1, addr2 };
}

// ──────────────────────────────────────────────────────────────────
//  Test Suite
// ──────────────────────────────────────────────────────────────────

describe("ProductTraceability", function () {
  // ── Dữ liệu test mẫu ─────────────────────────────────────────────
  const PRODUCT_ID    = 1n;
  const PRODUCT_NAME  = "Cafe Arabica";
  // Giả lập hash Rust Backend tạo từ: "1|Cafe Arabica|ABC Farm|San pham ca phe sach|2026-05-01"
  const PRODUCT_HASH  = makeHash("1|Cafe Arabica|ABC Farm|San pham ca phe sach|2026-05-01");
  const WRONG_HASH    = makeHash("tampered_data");

  // ╔══════════════════════════════════════════════════════════════╗
  //  [TC-01] Tạo sản phẩm thành công
  // ╚══════════════════════════════════════════════════════════════╝
  describe("[TC-01] createProduct() - Tạo sản phẩm thành công", function () {
    it("Nên lưu đúng thông tin sản phẩm vào Blockchain", async function () {
      const { contract, owner } = await loadFixture(deployContractFixture);

      // Gọi createProduct
      const tx = await contract.createProduct(
        PRODUCT_ID,
        PRODUCT_NAME,
        PRODUCT_HASH
      );
      await tx.wait();

      // Kiểm tra productExists
      expect(await contract.productExists(PRODUCT_ID)).to.equal(true);

      // Kiểm tra dữ liệu lưu đúng
      const [id, name, hash, creator] = await contract.getProduct(PRODUCT_ID);
      expect(id).to.equal(PRODUCT_ID);
      expect(name).to.equal(PRODUCT_NAME);
      expect(hash).to.equal(PRODUCT_HASH);
      expect(creator).to.equal(owner.address);
    });

    it("Nên cập nhật đúng createdAt (timestamp > 0)", async function () {
      const { contract } = await loadFixture(deployContractFixture);

      await contract.createProduct(PRODUCT_ID, PRODUCT_NAME, PRODUCT_HASH);
      const [, , , , createdAt] = await contract.getProduct(PRODUCT_ID);

      expect(createdAt).to.be.gt(0n);
    });

    it("Nên cho phép tạo nhiều sản phẩm với productId khác nhau", async function () {
      const { contract } = await loadFixture(deployContractFixture);

      const hash2 = makeHash("product_2_data");
      const hash3 = makeHash("product_3_data");

      await contract.createProduct(1n, "San pham 1", PRODUCT_HASH);
      await contract.createProduct(2n, "San pham 2", hash2);
      await contract.createProduct(3n, "San pham 3", hash3);

      expect(await contract.productExists(1n)).to.equal(true);
      expect(await contract.productExists(2n)).to.equal(true);
      expect(await contract.productExists(3n)).to.equal(true);
    });
  });

  // ╔══════════════════════════════════════════════════════════════╗
  //  [TC-02] Không cho tạo trùng productId
  // ╚══════════════════════════════════════════════════════════════╝
  describe("[TC-02] createProduct() - Không cho tạo trùng productId", function () {
    it("Nên revert với lỗi ProductAlreadyExists khi tạo trùng ID", async function () {
      const { contract } = await loadFixture(deployContractFixture);

      // Tạo lần đầu - thành công
      await contract.createProduct(PRODUCT_ID, PRODUCT_NAME, PRODUCT_HASH);

      // Tạo lần 2 với cùng productId - phải revert
      await expect(
        contract.createProduct(PRODUCT_ID, "San pham khac", WRONG_HASH)
      )
        .to.be.revertedWithCustomError(contract, "ProductAlreadyExists")
        .withArgs(PRODUCT_ID);
    });

    it("Nên revert khi productId = 0 (không hợp lệ)", async function () {
      const { contract } = await loadFixture(deployContractFixture);

      await expect(
        contract.createProduct(0n, PRODUCT_NAME, PRODUCT_HASH)
      ).to.be.revertedWithCustomError(contract, "InvalidProductId");
    });

    it("Nên revert khi name rỗng", async function () {
      const { contract } = await loadFixture(deployContractFixture);

      await expect(
        contract.createProduct(PRODUCT_ID, "", PRODUCT_HASH)
      ).to.be.revertedWithCustomError(contract, "EmptyProductName");
    });
  });

  // ╔══════════════════════════════════════════════════════════════╗
  //  [TC-03] Không cho tạo sản phẩm với hash rỗng
  // ╚══════════════════════════════════════════════════════════════╝
  describe("[TC-03] createProduct() - Không cho hash rỗng (bytes32(0))", function () {
    it("Nên revert với lỗi InvalidProductHash khi truyền ZERO_HASH", async function () {
      const { contract } = await loadFixture(deployContractFixture);

      await expect(
        contract.createProduct(PRODUCT_ID, PRODUCT_NAME, ZERO_HASH)
      ).to.be.revertedWithCustomError(contract, "InvalidProductHash");
    });

    it("Nên chấp nhận hash hợp lệ (khác bytes32(0))", async function () {
      const { contract } = await loadFixture(deployContractFixture);

      // Hash hợp lệ không được revert
      await expect(
        contract.createProduct(PRODUCT_ID, PRODUCT_NAME, PRODUCT_HASH)
      ).to.not.be.reverted;
    });
  });

  // ╔══════════════════════════════════════════════════════════════╗
  //  [TC-04] getProduct() trả về đúng dữ liệu
  // ╚══════════════════════════════════════════════════════════════╝
  describe("[TC-04] getProduct() - Trả về đúng dữ liệu", function () {
    it("Nên trả về đầy đủ 5 trường: id, name, hash, creator, createdAt", async function () {
      const { contract, owner } = await loadFixture(deployContractFixture);

      await contract.createProduct(PRODUCT_ID, PRODUCT_NAME, PRODUCT_HASH);

      const [id, name, hash, creator, createdAt] =
        await contract.getProduct(PRODUCT_ID);

      expect(id).to.equal(PRODUCT_ID);
      expect(name).to.equal(PRODUCT_NAME);
      expect(hash).to.equal(PRODUCT_HASH);
      expect(creator).to.equal(owner.address);
      expect(createdAt).to.be.gt(0n);
    });

    it("Nên revert với ProductNotFound khi productId không tồn tại", async function () {
      const { contract } = await loadFixture(deployContractFixture);

      await expect(contract.getProduct(999n))
        .to.be.revertedWithCustomError(contract, "ProductNotFound")
        .withArgs(999n);
    });

    it("Nên trả về đúng creator khi người tạo là addr1 (không phải owner)", async function () {
      const { contract, addr1 } = await loadFixture(deployContractFixture);

      // addr1 tạo sản phẩm
      await contract
        .connect(addr1)
        .createProduct(PRODUCT_ID, PRODUCT_NAME, PRODUCT_HASH);

      const [, , , creator] = await contract.getProduct(PRODUCT_ID);
      expect(creator).to.equal(addr1.address);
    });
  });

  // ╔══════════════════════════════════════════════════════════════╗
  //  [TC-05] verifyProduct() trả về true khi hash đúng
  // ╚══════════════════════════════════════════════════════════════╝
  describe("[TC-05] verifyProduct() - Trả về true khi hash đúng", function () {
    it("Nên trả về true khi hash truyền vào khớp với hash trên Blockchain", async function () {
      const { contract } = await loadFixture(deployContractFixture);

      await contract.createProduct(PRODUCT_ID, PRODUCT_NAME, PRODUCT_HASH);

      const result = await contract.verifyProduct(PRODUCT_ID, PRODUCT_HASH);
      expect(result).to.equal(true);
    });

    it("Nên trả về true nhất quán cho nhiều lần gọi với hash đúng", async function () {
      const { contract } = await loadFixture(deployContractFixture);

      await contract.createProduct(PRODUCT_ID, PRODUCT_NAME, PRODUCT_HASH);

      // Gọi nhiều lần - kết quả phải luôn true
      for (let i = 0; i < 5; i++) {
        expect(
          await contract.verifyProduct(PRODUCT_ID, PRODUCT_HASH)
        ).to.equal(true);
      }
    });
  });

  // ╔══════════════════════════════════════════════════════════════╗
  //  [TC-06] verifyProduct() trả về false khi hash sai
  // ╚══════════════════════════════════════════════════════════════╝
  describe("[TC-06] verifyProduct() - Trả về false khi hash sai", function () {
    it("Nên trả về false khi hash truyền vào KHÁC với hash trên Blockchain", async function () {
      const { contract } = await loadFixture(deployContractFixture);

      await contract.createProduct(PRODUCT_ID, PRODUCT_NAME, PRODUCT_HASH);

      // Truyền hash sai (giả lập dữ liệu DB đã bị sửa)
      const result = await contract.verifyProduct(PRODUCT_ID, WRONG_HASH);
      expect(result).to.equal(false);
    });

    it("Nên trả về false khi truyền ZERO_HASH so với hash hợp lệ", async function () {
      const { contract } = await loadFixture(deployContractFixture);

      await contract.createProduct(PRODUCT_ID, PRODUCT_NAME, PRODUCT_HASH);

      const result = await contract.verifyProduct(PRODUCT_ID, ZERO_HASH);
      expect(result).to.equal(false);
    });

    it("Nên revert với ProductNotFound khi verify sản phẩm không tồn tại", async function () {
      const { contract } = await loadFixture(deployContractFixture);

      await expect(contract.verifyProduct(999n, PRODUCT_HASH))
        .to.be.revertedWithCustomError(contract, "ProductNotFound")
        .withArgs(999n);
    });

    it("Nên phân biệt đúng giữa hai sản phẩm khác nhau (không bị nhầm hash)", async function () {
      const { contract } = await loadFixture(deployContractFixture);

      const hash2 = makeHash("product_2_completely_different");

      await contract.createProduct(1n, "San pham A", PRODUCT_HASH);
      await contract.createProduct(2n, "San pham B", hash2);

      // Kiểm tra chéo: hash của sản phẩm 1 không match sản phẩm 2
      expect(await contract.verifyProduct(1n, PRODUCT_HASH)).to.equal(true);
      expect(await contract.verifyProduct(1n, hash2)).to.equal(false);
      expect(await contract.verifyProduct(2n, hash2)).to.equal(true);
      expect(await contract.verifyProduct(2n, PRODUCT_HASH)).to.equal(false);
    });
  });

  // ╔══════════════════════════════════════════════════════════════╗
  //  [TC-07] Event ProductCreated phát ra đúng
  // ╚══════════════════════════════════════════════════════════════╝
  describe("[TC-07] Event ProductCreated - Phát ra đúng khi tạo sản phẩm", function () {
    it("Nên emit event ProductCreated với đúng productId, productHash, creator", async function () {
      const { contract, owner } = await loadFixture(deployContractFixture);

      // Kiểm tra event được phát ra với đúng arguments
      await expect(
        contract.createProduct(PRODUCT_ID, PRODUCT_NAME, PRODUCT_HASH)
      )
        .to.emit(contract, "ProductCreated")
        .withArgs(PRODUCT_ID, PRODUCT_HASH, owner.address);
    });

    it("Nên emit event với creator là addr1 khi addr1 gọi createProduct", async function () {
      const { contract, addr1 } = await loadFixture(deployContractFixture);

      await expect(
        contract.connect(addr1).createProduct(PRODUCT_ID, PRODUCT_NAME, PRODUCT_HASH)
      )
        .to.emit(contract, "ProductCreated")
        .withArgs(PRODUCT_ID, PRODUCT_HASH, addr1.address);
    });

    it("Nên emit event cho mỗi sản phẩm mới được tạo", async function () {
      const { contract, owner } = await loadFixture(deployContractFixture);

      const hash2 = makeHash("product_2_data");

      // Sản phẩm 1
      await expect(
        contract.createProduct(1n, "San pham 1", PRODUCT_HASH)
      ).to.emit(contract, "ProductCreated");

      // Sản phẩm 2
      await expect(
        contract.createProduct(2n, "San pham 2", hash2)
      ).to.emit(contract, "ProductCreated");
    });

    it("Nên KHÔNG emit event khi createProduct bị revert (trùng ID)", async function () {
      const { contract } = await loadFixture(deployContractFixture);

      // Tạo lần đầu thành công
      await contract.createProduct(PRODUCT_ID, PRODUCT_NAME, PRODUCT_HASH);

      // Lần 2 bị revert - không có event
      await expect(
        contract.createProduct(PRODUCT_ID, "Dup", WRONG_HASH)
      ).to.be.revertedWithCustomError(contract, "ProductAlreadyExists");
    });
  });

  // ╔══════════════════════════════════════════════════════════════╗
  //  Bonus: isProductExists() và getProductHash()
  // ╚══════════════════════════════════════════════════════════════╝
  describe("Helper functions - isProductExists() và getProductHash()", function () {
    it("isProductExists() nên trả về false trước khi tạo", async function () {
      const { contract } = await loadFixture(deployContractFixture);
      expect(await contract.isProductExists(PRODUCT_ID)).to.equal(false);
    });

    it("isProductExists() nên trả về true sau khi tạo", async function () {
      const { contract } = await loadFixture(deployContractFixture);
      await contract.createProduct(PRODUCT_ID, PRODUCT_NAME, PRODUCT_HASH);
      expect(await contract.isProductExists(PRODUCT_ID)).to.equal(true);
    });

    it("getProductHash() nên trả về đúng hash đã lưu", async function () {
      const { contract } = await loadFixture(deployContractFixture);
      await contract.createProduct(PRODUCT_ID, PRODUCT_NAME, PRODUCT_HASH);
      const storedHash = await contract.getProductHash(PRODUCT_ID);
      expect(storedHash).to.equal(PRODUCT_HASH);
    });
  });
});
