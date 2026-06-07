// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title ProductTraceability
 * @dev Smart contract lưu trữ và xác thực hash sản phẩm trên Blockchain
 *      Đề tài: dApp Truy xuất nguồn gốc sản phẩm
 *      Thành viên 1 - Blockchain Developer
 */
contract ProductTraceability {
    // ─────────────────────────────────────────────
    //  Struct
    // ─────────────────────────────────────────────

    /**
     * @dev Cấu trúc lưu thông tin sản phẩm trên Blockchain
     * @param id         ID định danh sản phẩm
     * @param name       Tên sản phẩm
     * @param productHash Hash SHA256 của dữ liệu sản phẩm (bytes32)
     * @param creator    Địa chỉ ví người tạo
     * @param createdAt  Timestamp lúc tạo (Unix)
     */
    struct Product {
        uint256 id;
        string name;
        bytes32 productHash;
        address creator;
        uint256 createdAt;
    }

    // ─────────────────────────────────────────────
    //  State Variables
    // ─────────────────────────────────────────────

    /// @dev Lưu thông tin sản phẩm theo productId
    mapping(uint256 => Product) public products;

    /// @dev Đánh dấu productId đã tồn tại chưa (tránh tạo trùng)
    mapping(uint256 => bool) public productExists;

    /// @dev Địa chỉ chủ contract (admin)
    address public owner;

    // ─────────────────────────────────────────────
    //  Events
    // ─────────────────────────────────────────────

    /**
     * @dev Phát ra khi sản phẩm mới được tạo thành công
     * @param productId   ID sản phẩm
     * @param productHash Hash của sản phẩm
     * @param creator     Địa chỉ ví người tạo
     */
    event ProductCreated(
        uint256 indexed productId,
        bytes32 productHash,
        address indexed creator
    );

    // ─────────────────────────────────────────────
    //  Errors (Solidity 0.8+ custom errors - tiết kiệm gas)
    // ─────────────────────────────────────────────

    error ProductAlreadyExists(uint256 productId);
    error ProductNotFound(uint256 productId);
    error InvalidProductId();
    error InvalidProductHash();
    error EmptyProductName();

    // ─────────────────────────────────────────────
    //  Constructor
    // ─────────────────────────────────────────────

    constructor() {
        owner = msg.sender;
    }

    // ─────────────────────────────────────────────
    //  Functions
    // ─────────────────────────────────────────────

    /**
     * @notice Tạo sản phẩm mới trên Blockchain
     * @dev Lưu struct Product vào mapping và phát Event ProductCreated
     * @param productId   ID định danh sản phẩm (phải là duy nhất, > 0)
     * @param name        Tên sản phẩm (không được rỗng)
     * @param productHash Hash SHA256 của dữ liệu sản phẩm (không được là bytes32(0))
     *
     * Emits: {ProductCreated}
     *
     * Requirements:
     * - productId phải > 0
     * - productId chưa tồn tại
     * - productHash phải khác bytes32(0)
     * - name không được rỗng
     */
    function createProduct(
        uint256 productId,
        string memory name,
        bytes32 productHash
    ) public {
        // Validate productId
        if (productId == 0) revert InvalidProductId();

        // Validate không trùng
        if (productExists[productId]) revert ProductAlreadyExists(productId);

        // Validate hash không rỗng
        if (productHash == bytes32(0)) revert InvalidProductHash();

        // Validate name không rỗng
        if (bytes(name).length == 0) revert EmptyProductName();

        // Ghi dữ liệu lên Blockchain
        products[productId] = Product({
            id: productId,
            name: name,
            productHash: productHash,
            creator: msg.sender,
            createdAt: block.timestamp
        });

        // Đánh dấu đã tồn tại
        productExists[productId] = true;

        // Phát event để Rust backend có thể lắng nghe
        emit ProductCreated(productId, productHash, msg.sender);
    }

    /**
     * @notice Lấy thông tin đầy đủ của sản phẩm theo productId
     * @dev Trả về 5 giá trị: id, name, productHash, creator, createdAt
     * @param productId  ID sản phẩm cần truy vấn
     * @return id        ID sản phẩm
     * @return name      Tên sản phẩm
     * @return productHash Hash SHA256 đã lưu
     * @return creator   Địa chỉ ví người tạo
     * @return createdAt Timestamp lúc tạo
     *
     * Requirements:
     * - Sản phẩm phải tồn tại (productId đã được createProduct)
     */
    function getProduct(uint256 productId)
        public
        view
        returns (
            uint256 id,
            string memory name,
            bytes32 productHash,
            address creator,
            uint256 createdAt
        )
    {
        if (!productExists[productId]) revert ProductNotFound(productId);

        Product storage p = products[productId];
        return (p.id, p.name, p.productHash, p.creator, p.createdAt);
    }

    /**
     * @notice Xác thực hash của sản phẩm - so sánh hash truyền vào với hash trên Blockchain
     * @dev Đây là hàm cốt lõi trong luồng xác thực:
     *      Rust Backend tính lại hash từ DB → gọi hàm này → trả true/false
     * @param productId   ID sản phẩm cần xác thực
     * @param productHash Hash cần kiểm tra (Rust Backend tính từ dữ liệu DB)
     * @return bool       true = hash khớp (dữ liệu hợp lệ), false = hash khác (dữ liệu bị sửa)
     *
     * Requirements:
     * - Sản phẩm phải tồn tại
     */
    function verifyProduct(
        uint256 productId,
        bytes32 productHash
    ) public view returns (bool) {
        if (!productExists[productId]) revert ProductNotFound(productId);

        // So sánh hash được cung cấp với hash đã lưu trên Blockchain
        return products[productId].productHash == productHash;
    }

    /**
     * @notice Lấy chỉ hash của sản phẩm (tiện hơn getProduct khi chỉ cần hash)
     * @param productId  ID sản phẩm
     * @return bytes32   Hash SHA256 đã lưu trên Blockchain
     */
    function getProductHash(uint256 productId)
        public
        view
        returns (bytes32)
    {
        if (!productExists[productId]) revert ProductNotFound(productId);
        return products[productId].productHash;
    }

    /**
     * @notice Kiểm tra sản phẩm có tồn tại hay không (helper)
     * @param productId  ID sản phẩm
     * @return bool      true nếu đã tồn tại
     */
    function isProductExists(uint256 productId)
        public
        view
        returns (bool)
    {
        return productExists[productId];
    }
}
