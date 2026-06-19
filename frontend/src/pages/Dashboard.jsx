import { useState, useEffect } from 'react';
import { 
  Plus, Search, QrCode, AlertTriangle, 
  CheckCircle, Download, RefreshCw, AlertCircle, Copy, Check, RotateCcw, X, 
  Box, ShieldCheck, Cpu, ArrowRight, Database, Activity
} from 'lucide-react';
import axios from 'axios';
import { 
  getMockProducts, addMockProduct, tamperMockProduct, 
  restoreMockProduct, initializeMockData 
} from '../utils/demoHelper';
import QRCodeDisplay from '../components/QRCodeDisplay';

const Dashboard = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Form states
  const [productId, setProductId] = useState('');
  const [name, setName] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // UI Drawer states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [verifyingSelected, setVerifyingSelected] = useState(false);
  const [selectedVerification, setSelectedVerification] = useState(null);

  // List states
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [demoMode, setDemoMode] = useState(localStorage.getItem('demo_mode') === 'true');

  // Load products
  const loadProducts = async () => {
    setLoading(true);
    setError(null);

    if (demoMode) {
      await initializeMockData();
      setProducts(getMockProducts());
      setLoading(false);
      return;
    }

    try {
      const res = await axios.get('http://127.0.0.1:3000/api/products');
      setProducts(res.data);
    } catch (err) {
      setError(
        err.response?.data?.message || 
        "Không thể kết nối đến Rust API server. Hãy chạy Server hoặc bật chế độ 'Demo Mode' ở góc trên bên phải để trải nghiệm."
      );
    } finally {
      setLoading(false);
    }
  };

  // Sync demo mode state changes
  useEffect(() => {
    const handleDemoModeChange = () => {
      const currentMode = localStorage.getItem('demo_mode') === 'true';
      setDemoMode(currentMode);
    };

    window.addEventListener('demo_mode_changed', handleDemoModeChange);
    return () => window.removeEventListener('demo_mode_changed', handleDemoModeChange);
  }, []);

  // Reload products whenever demoMode changes
  useEffect(() => {
    loadProducts();
  }, [demoMode]);

  // Form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!productId || !name || !manufacturer) {
      setSubmitError("Vui lòng điền đầy đủ các thông tin bắt buộc!");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    if (demoMode) {
      try {
        await new Promise(resolve => setTimeout(resolve, 800));
        const newProduct = await addMockProduct(productId, name, manufacturer, description);
        setSubmitSuccess(true);
        setProductId('');
        setName('');
        setManufacturer('');
        setDescription('');
        setProducts(getMockProducts());
        
        // Auto-display the QR code of the newly registered product
        setSelectedProduct(newProduct);
        setIsDetailOpen(true);
        
        setTimeout(() => {
          setIsCreateOpen(false);
          setSubmitSuccess(false);
        }, 1500);
      } catch (err) {
        setSubmitError(err.message || "Lỗi tạo sản phẩm demo");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    try {
      const res = await axios.post('http://127.0.0.1:3000/api/products', {
        product_id: Number(productId),
        name: name,
        manufacturer: manufacturer,
        description: description
      });
      
      setSubmitSuccess(true);
      setProductId('');
      setName('');
      setManufacturer('');
      setDescription('');
      
      // Auto-display the QR code of the newly registered product
      if (res.data && res.data.product) {
        setSelectedProduct(res.data.product);
        setIsDetailOpen(true);
      }
      
      loadProducts();

      setTimeout(() => {
        setIsCreateOpen(false);
        setSubmitSuccess(false);
      }, 1500);
    } catch (err) {
      setSubmitError(
        err.response?.data?.message || 
        "Lỗi gửi dữ liệu lên server. Hãy chắc chắn ID sản phẩm chưa trùng lặp."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Tampering handlers (Demo Mode)
  const handleTamper = (id) => {
    const res = tamperMockProduct(id);
    if (res.success) {
      setProducts(getMockProducts());
      if (selectedProduct && selectedProduct.product_id === Number(id)) {
        setSelectedProduct(res.product);
      }
    }
  };

  const handleRestore = (id) => {
    const res = restoreMockProduct(id);
    if (res.success) {
      setProducts(getMockProducts());
      if (selectedProduct && selectedProduct.product_id === Number(id)) {
        setSelectedProduct(res.product);
      }
    }
  };

  // Copy helper
  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // QR Code download helper
  const downloadQRCode = () => {
    const canvas = document.querySelector('.qr-container-box canvas');
    if (canvas) {
      const pngUrl = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
      let downloadLink = document.createElement("a");
      downloadLink.href = pngUrl;
      downloadLink.download = `qrcode-product-${selectedProduct.product_id}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    }
  };

  // Metrics
  const totalProducts = products.length;
  const tamperedCount = products.filter(p => p.is_tampered).length;
  const integrityRate = totalProducts > 0 
    ? Math.round(((totalProducts - tamperedCount) / totalProducts) * 100) 
    : 100;
  const activeTxCount = products.filter(p => p.tx_hash).length;

  // Filtered products list
  const filteredProducts = products.filter(p => {
    const query = searchQuery.toLowerCase();
    return (
      String(p.product_id).includes(query) ||
      p.name.toLowerCase().includes(query) ||
      p.manufacturer.toLowerCase().includes(query)
    );
  });

  // Hàm mở drawer chi tiết sản phẩm và gọi API xác thực thời gian thực với Blockchain
  const openDetailsDrawer = async (product) => {
    setSelectedProduct(product);
    setIsDetailOpen(true);
    setSelectedVerification(null); // Reset trạng thái xác thực cũ
    setVerifyingSelected(true); // Bật trạng thái loading đối chiếu

    // 1. Nếu đang ở chế độ Demo (không kết nối server thật)
    if (demoMode) {
      setTimeout(() => {
        const isTampered = product.is_tampered;
        setSelectedVerification({
          blockchain_verified: !isTampered,
          db_integrity: !isTampered,
          blockchain_hash: product.product_hash,
          recomputed_hash: product.product_hash,
          db_hash: product.product_hash,
          status: isTampered ? "INVALID" : "VALID",
          message: isTampered ? "Dữ liệu bị sửa đổi!" : "Khớp Blockchain."
        });
        setVerifyingSelected(false);
      }, 500);
      return;
    }

    // 2. Chế độ thật: Gọi REST API `/api/verify` về Rust Backend để đối chiếu DB với Smart Contract
    try {
      const res = await axios.post('http://127.0.0.1:3000/api/verify', {
        product_id: Number(product.product_id)
      });
      setSelectedVerification(res.data);
    } catch (err) {
      console.error("Lỗi xác thực blockchain:", err);
      setSelectedVerification({
        error: true,
        message: "Không thể kết nối đến Rust API server để kiểm tra Blockchain."
      });
    } finally {
      setVerifyingSelected(false); // Tắt trạng thái loading đối chiếu
    }
  };

  // SVG Progress circle values
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (circumference * integrityRate) / 100;

  return (
    <div style={{ textAlign: 'left' }}>

      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <span className="kicker">TraceChain Overview</span>
        <h1 style={{ fontSize: '30px', fontWeight: '900', marginBottom: '8px' }}>Bảng quản trị chuỗi cung ứng</h1>
        <p style={{ color: 'var(--ink-3)', fontSize: '14px', maxWidth: '600px' }}>
          Hệ thống giám sát nguồn gốc sản phẩm thời gian thực được bảo mật bằng mật mã khối Blockchain.
        </p>
      </div>

      {/* ═══ UNIFIED DASHBOARD GRID SYSTEM (3-Column Pixel-Perfect Grid) ═══ */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(3, 1fr)', 
        gap: '24px', 
        alignItems: 'stretch',
        marginBottom: '40px'
      }}>
        
        {/* Card 1: Total Products (Top Row) */}
        <div className="stat-card-3d indigo" style={{ gridColumn: 'span 1' }}>
          <div>
            <div style={{ fontSize: '10.5px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--ink-4)' }}>
              Sản phẩm đăng ký
            </div>
            <div style={{ fontSize: '34px', fontWeight: '900', marginTop: '6px', fontFamily: 'var(--font-mono)', color: 'var(--ink-1)' }}>
              {totalProducts}
            </div>
            <div style={{ fontSize: '12px', marginTop: '4px', color: 'var(--ink-3)', fontWeight: 500 }}>
              Tổng số tem QR đã phát hành
            </div>
          </div>
          <div className="stat-sphere">
            <Box size={22} />
          </div>
        </div>

        {/* Card 2: Database Integrity (Top Row) */}
        <div className="stat-card-3d emerald" style={{ gridColumn: 'span 1' }}>
          <div>
            <div style={{ fontSize: '10.5px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--ink-4)' }}>
              Tỉ lệ toàn vẹn CSDL
            </div>
            <div style={{ fontSize: '34px', fontWeight: '900', marginTop: '6px', fontFamily: 'var(--font-mono)', color: integrityRate < 100 ? 'var(--red)' : 'var(--ink-1)' }}>
              {integrityRate}%
            </div>
            <div style={{ fontSize: '12px', marginTop: '4px', color: 'var(--ink-3)', fontWeight: 500 }}>
              {tamperedCount > 0 ? `Phát hiện ${tamperedCount} bản ghi bị sửa` : "Dữ liệu CSDL an toàn"}
            </div>
          </div>
          <div className="stat-sphere">
            <ShieldCheck size={22} />
          </div>
        </div>

        {/* Card 3: Blockchain Transactions (Top Row) */}
        <div className="stat-card-3d blue" style={{ gridColumn: 'span 1' }}>
          <div>
            <div style={{ fontSize: '10.5px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--ink-4)' }}>
              Giao dịch Blockchain
            </div>
            <div style={{ fontSize: '34px', fontWeight: '900', marginTop: '6px', fontFamily: 'var(--font-mono)', color: 'var(--ink-1)' }}>
              {activeTxCount}
            </div>
            <div style={{ fontSize: '12px', marginTop: '4px', color: 'var(--ink-3)', fontWeight: 500 }}>
              Cam kết trên chain
            </div>
          </div>
          <div className="stat-sphere">
            <Cpu size={22} />
          </div>
        </div>

        {/* Left: Wave Chart (Middle Row - spans 2 columns) */}
        <div className="card-3d" style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '24px', height: '100%', boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span className="kicker">Blockchain Traffic</span>
              <h2 style={{ fontSize: '17px', fontWeight: '800' }}>Tốc độ xử lý giao dịch ghi khối</h2>
            </div>
            <span style={{ fontSize: '11px', background: 'var(--accent-soft)', color: 'var(--accent)', padding: '4px 10px', borderRadius: 'var(--r-pill)', fontWeight: '700' }}>
              Block ~12s
            </span>
          </div>

          {/* SVG Wave Chart */}
          <div className="svg-chart-container">
            <svg viewBox="0 0 600 100" width="100%" height="100%" style={{ overflow: 'visible' }}>
              <defs>
                <linearGradient id="chart-glow-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.20" />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              {/* Grid */}
              <line x1="0" y1="20" x2="600" y2="20" stroke="var(--border-2)" strokeWidth="0.5" strokeDasharray="4 4" />
              <line x1="0" y1="55" x2="600" y2="55" stroke="var(--border-2)" strokeWidth="0.5" strokeDasharray="4 4" />
              <line x1="0" y1="90" x2="600" y2="90" stroke="var(--border-2)" strokeWidth="0.5" strokeDasharray="4 4" />
              
              {/* Gradient fill */}
              <path 
                d="M0,90 Q75,45 150,75 T300,30 T450,65 T600,20 L600,100 L0,100 Z" 
                fill="url(#chart-glow-grad)"
              />
              {/* Line */}
              <path 
                d="M0,90 Q75,45 150,75 T300,30 T450,65 T600,20" 
                fill="none" 
                stroke="var(--accent)" 
                strokeWidth="2.5" 
                strokeLinecap="round"
                className="chart-stroke"
              />
              {/* Hot points */}
              <circle cx="300" cy="30" r="4" fill="var(--accent)" stroke="#FFFFFF" strokeWidth="2">
                <animate attributeName="r" values="4;6;4" dur="2s" repeatCount="indefinite" />
              </circle>
              <circle cx="600" cy="20" r="4" fill="var(--accent)" stroke="#FFFFFF" strokeWidth="2">
                <animate attributeName="r" values="4;6;4" dur="2s" begin="0.5s" repeatCount="indefinite" />
              </circle>
            </svg>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', color: 'var(--ink-4)', fontWeight: '600', borderTop: '1px solid var(--border-2)', paddingTop: '14px', marginTop: '10px' }}>
            <span>Thứ hai</span>
            <span>Thứ ba</span>
            <span>Thứ tư</span>
            <span>Thứ năm</span>
            <span>Thứ sáu</span>
          </div>
        </div>

        {/* Right: 3D Glass Dial Progress Ring (Middle Row - spans 1 column) */}
        <div className="card-3d" style={{ gridColumn: 'span 1', padding: '24px', display: 'flex', alignItems: 'center', gap: '20px', height: '100%', boxSizing: 'border-box' }}>
          <div className="progress-ring-box">
            <svg width="120" height="120" style={{ overflow: 'visible' }}>
              <circle cx="60" cy="60" r={radius} fill="none" stroke="var(--border-2)" strokeWidth="7" />
              <circle 
                cx="60" cy="60" r={radius} 
                fill="none" 
                stroke={integrityRate < 100 ? 'var(--red)' : 'var(--green)'}
                strokeWidth="7" 
                strokeDasharray={circumference} 
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="progress-ring-circle"
                style={{
                  filter: `drop-shadow(0 0 6px ${integrityRate < 100 ? 'var(--red)' : 'var(--green)'})`
                }}
              />
            </svg>
            <div className="progress-ring-text" style={{ 
              color: integrityRate < 100 ? 'var(--red)' : 'var(--ink-1)',
            }}>
              {integrityRate}%
            </div>
          </div>

          <div style={{ flex: 1 }}>
            <span className="kicker">Chỉ số an toàn</span>
            <h3 style={{ fontSize: '15px', fontWeight: '800', marginBottom: '6px' }}>Đồng bộ mã băm</h3>
            <p style={{ fontSize: '12.5px', color: 'var(--ink-3)', lineHeight: '1.6' }}>
              {integrityRate < 100 
                ? "Cảnh báo! Có dữ liệu sản phẩm bị thay đổi trái phép so với blockchain." 
                : "Tất cả các bản ghi ở cơ sở dữ liệu đều khớp chính xác với chữ ký blockchain."
              }
            </p>
          </div>
        </div>

        {/* Product List (Bottom Row - spans 2 columns) */}
        <section className="card-3d" style={{ gridColumn: 'span 2', minHeight: '400px', height: '100%', boxSizing: 'border-box' }}>
          <div className="card-head">
            <div>
              <h2 style={{ fontSize: '17px', fontWeight: '800' }}>Toàn bộ sản phẩm</h2>
              <p style={{ fontSize: '11.5px', color: 'var(--ink-4)', marginTop: '2px' }}>
                Hệ thống truy xuất nguồn gốc Blockchain
              </p>
            </div>
            
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div style={{ position: 'relative' }}>
                <input 
                  type="text" 
                  className="input-control" 
                  placeholder="Tìm sản phẩm..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ paddingLeft: '34px', width: '180px', height: '36px', fontSize: '13px' }}
                />
                <Search size={13} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--ink-4)' }} />
              </div>
              
              <button className="btn-icon" onClick={loadProducts} title="Tải lại" style={{ height: '36px', width: '36px' }}>
                <RefreshCw size={13} />
              </button>

              <button 
                className="btn btn-primary" 
                onClick={() => {
                  const nextId = products.length > 0
                    ? Math.max(...products.map(p => Number(p.product_id))) + 1
                    : 1001;
                  setProductId(String(nextId));
                  setIsCreateOpen(true);
                }}
                style={{ height: '36px', fontSize: '12.5px', padding: '0 14px' }}
              >
                <Plus size={14} /> Đăng ký
              </button>
            </div>
          </div>

          <div className="card-body" style={{ padding: '0' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--ink-4)' }}>
                <div className="spinner-sm" style={{ marginBottom: '10px' }}></div>
                <p>Đang tải danh sách...</p>
              </div>
            ) : error ? (
              <div style={{ padding: '40px 24px', textAlign: 'center' }}>
                <AlertCircle size={36} style={{ color: 'var(--red)', marginBottom: '12px' }} />
                <p style={{ color: 'var(--ink-2)', marginBottom: '20px', fontSize: '13.5px', lineHeight: '1.6' }}>{error}</p>
                <button className="btn btn-primary" onClick={loadProducts}>
                  <RefreshCw size={12} /> Thử lại
                </button>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div style={{ padding: '80px 24px', textAlign: 'center', color: 'var(--ink-4)' }}>
                <Search size={36} style={{ marginBottom: '12px', opacity: 0.4 }} />
                <p style={{ fontSize: '14px' }}>Không tìm thấy sản phẩm nào.</p>
              </div>
            ) : (
              <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {filteredProducts.map((p) => (
                  <div 
                    key={p.id} 
                    className="product-row-3d"
                    onClick={() => openDetailsDrawer(p)}
                  >
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '800', color: 'var(--accent)' }}>
                      #{p.product_id}
                    </span>
                    <div style={{ overflow: 'hidden', paddingRight: '12px' }}>
                      <div style={{ fontWeight: '700', color: 'var(--ink-1)', fontSize: '14px' }}>{p.name}</div>
                      <div style={{ fontSize: '11.5px', color: 'var(--ink-4)', marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.description}
                      </div>
                    </div>
                    <span style={{ fontWeight: '600', fontSize: '13px', color: 'var(--ink-2)' }}>
                      {p.manufacturer}
                    </span>
                    <div style={{ textAlign: 'center' }}>
                      {p.is_tampered ? (
                        <span className="badge badge-error">Bị sửa đổi</span>
                      ) : (
                        <span className="badge badge-success">Toàn vẹn</span>
                      )}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: '11.5px' }} onClick={(e) => { e.stopPropagation(); openDetailsDrawer(p); }}>
                        <QrCode size={12} /> Tem
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Recent Activities Timeline (Bottom Row - spans 1 column) */}
        <section className="card-3d" style={{ padding: '24px', height: '100%', boxSizing: 'border-box', gridColumn: 'span 1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '800' }}>Hoạt động gần đây</h2>
            <span style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Activity size={11} /> Live
            </span>
          </div>

          <div className="timeline-list">
            {/* Dynamic products */}
            {products.slice(0, 2).map((p) => (
              <div className="timeline-item" key={p.id}>
                <div className="timeline-dot-wrapper">
                  <div className="timeline-sphere indigo"></div>
                </div>
                <div className="timeline-content">
                  <div className="timeline-title">Đăng ký sản phẩm #{p.product_id}</div>
                  <div style={{ fontSize: '12px', color: 'var(--ink-3)', marginTop: '2px' }}>
                    {p.name} - {p.manufacturer}
                  </div>
                  <div className="timeline-meta">Tx: {p.tx_hash ? p.tx_hash.substring(0, 14) + '...' : '—'}</div>
                </div>
              </div>
            ))}

            {/* Contract deployed */}
            <div className="timeline-item">
              <div className="timeline-dot-wrapper">
                <div className="timeline-sphere emerald"></div>
              </div>
              <div className="timeline-content">
                <div className="timeline-title">Deploy Smart Contract</div>
                <div style={{ fontSize: '12px', color: 'var(--ink-3)', marginTop: '2px' }}>
                  ProductTraceability khóa trên chuỗi
                </div>
                <div className="timeline-meta">0x5FbDB...80aa3</div>
              </div>
            </div>

            {/* Blockchain node */}
            <div className="timeline-item">
              <div className="timeline-dot-wrapper">
                <div className="timeline-sphere blue"></div>
              </div>
              <div className="timeline-content">
                <div className="timeline-title">Blockchain Node khởi động</div>
                <div style={{ fontSize: '12px', color: 'var(--ink-3)', marginTop: '2px' }}>
                  Hardhat local RPC node
                </div>
                <div className="timeline-meta">http://127.0.0.1:8545</div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ════ DRAWER: ĐĂNG KÝ SẢN PHẨM MỚI ════ */}
      <div className={`drawer-overlay ${isCreateOpen ? 'open' : ''}`} onClick={() => setIsCreateOpen(false)}></div>
      <div className={`drawer-container ${isCreateOpen ? 'open' : ''}`} style={{ textAlign: 'left' }}>
        <div className="drawer-header">
          <h2 style={{ fontSize: '18px', fontWeight: '800' }}>Đăng ký sản phẩm mới</h2>
          <button className="btn-icon" onClick={() => setIsCreateOpen(false)} style={{ borderRadius: '50%', width: '32px', height: '32px' }}>
            <X size={15} />
          </button>
        </div>
        <div className="drawer-body">
          {submitSuccess && (
            <div className="alert alert-success" style={{ marginBottom: '20px' }}>
              <CheckCircle size={16} />
              <div className="alert-body">
                <span className="alert-title">Thành công!</span>
                <span>Mã băm sản phẩm đã ghi nhận thành công lên Blockchain.</span>
              </div>
            </div>
          )}

          {submitError && (
            <div className="alert alert-error" style={{ marginBottom: '20px' }}>
              <AlertTriangle size={16} />
              <div className="alert-body">
                <span className="alert-title">Lỗi đăng ký</span>
                <span>{submitError}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Mã ID sản phẩm <span style={{ color: 'var(--red)' }}>*</span></label>
              <input type="number" className="input-control" placeholder="Ví dụ: 1004" value={productId} onChange={(e) => setProductId(e.target.value)} required min="1" disabled={submitting} />
            </div>
            <div className="form-group">
              <label className="form-label">Tên sản phẩm <span style={{ color: 'var(--red)' }}>*</span></label>
              <input type="text" className="input-control" placeholder="Ví dụ: Gạo ST25 Sóc Trăng" value={name} onChange={(e) => setName(e.target.value)} required disabled={submitting} />
            </div>
            <div className="form-group">
              <label className="form-label">Nhà sản xuất <span style={{ color: 'var(--red)' }}>*</span></label>
              <input type="text" className="input-control" placeholder="Ví dụ: DNTN Hồ Quang Trí" value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} required disabled={submitting} />
            </div>
            <div className="form-group" style={{ marginBottom: '28px' }}>
              <label className="form-label">Mô tả sản phẩm</label>
              <textarea className="input-control" placeholder="Mô tả đặc điểm sản phẩm, nguồn gốc..." value={description} onChange={(e) => setDescription(e.target.value)} rows="4" style={{ resize: 'vertical', fontFamily: 'inherit' }} disabled={submitting} />
            </div>
            <button type="submit" className="btn btn-primary w-full" disabled={submitting} style={{ height: '44px', justifyContent: 'center' }}>
              {submitting ? (
                <><span className="spinner-sm" style={{ borderRightColor: 'transparent', width: '14px', height: '14px' }}></span> <span>Đang ghi lên Blockchain...</span></>
              ) : (
                <><Plus size={15} /> <span>Xác nhận &amp; Ghi Blockchain</span></>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* ════ DRAWER: CHI TIẾT SẢN PHẨM ════ */}
      <div className={`drawer-overlay ${isDetailOpen ? 'open' : ''}`} onClick={() => setIsDetailOpen(false)}></div>
      <div className={`drawer-container ${isDetailOpen ? 'open' : ''}`} style={{ textAlign: 'left' }}>
        <div className="drawer-header">
          <h2 style={{ fontSize: '18px', fontWeight: '800' }}>Sản phẩm #{selectedProduct?.product_id}</h2>
          <button className="btn-icon" onClick={() => setIsDetailOpen(false)} style={{ borderRadius: '50%', width: '32px', height: '32px' }}>
            <X size={15} />
          </button>
        </div>
        
        {selectedProduct && (
          <div className="drawer-body" style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
            
            {/* Info */}
            <div>
              <span className="kicker">Chi tiết</span>
              <h3 style={{ fontSize: '16px', color: 'var(--ink-1)', marginBottom: '10px' }}>{selectedProduct.name}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13.5px', lineHeight: '1.6' }}>
                <div><strong style={{ color: 'var(--ink-3)' }}>Nhà sản xuất:</strong> {selectedProduct.manufacturer}</div>
                <div><strong style={{ color: 'var(--ink-3)' }}>Mô tả:</strong> {selectedProduct.description || "Không có mô tả thêm."}</div>
                <div><strong style={{ color: 'var(--ink-3)' }}>Ví tạo:</strong> <code className="mono" style={{ fontSize: '11px', wordBreak: 'break-all' }}>{selectedProduct.creator_address}</code></div>
                <div>
                  <strong style={{ color: 'var(--ink-3)' }}>Trạng thái Blockchain:</strong>{' '}
                  {verifyingSelected ? (
                    <span style={{ color: 'var(--ink-4)', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                      <RefreshCw size={12} style={{ animation: 'spin 2s linear infinite' }} /> Đang đối chiếu Blockchain...
                    </span>
                  ) : selectedVerification ? (
                    selectedVerification.error ? (
                      <span className="badge badge-error" style={{ display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
                        Lỗi kết nối RPC
                      </span>
                    ) : (selectedVerification.blockchain_hash === "" || selectedVerification.message?.includes("not on blockchain")) ? (
                      <span className="badge" style={{ background: 'var(--amber-soft)', color: 'var(--amber)', fontWeight: '700' }}>
                        Chờ đồng bộ chuỗi
                      </span>
                    ) : (selectedVerification.status === "VALID" || selectedVerification.blockchain_verified) ? (
                      <span className="badge badge-success">
                        Đã xác thực &amp; Khóa Blockchain
                      </span>
                    ) : (
                      <span className="badge badge-error">
                        Dữ liệu bị sửa đổi trái phép!
                      </span>
                    )
                  ) : (
                    <span style={{ color: 'var(--ink-4)' }}>Chưa có thông tin</span>
                  )}
                </div>
              </div>
            </div>

            {/* QR Card with Holographic Shimmer */}
            <div className="holo-card" style={{ textAlign: 'center', flexShrink: 0 }}>
              <div className="holo-shimmer"></div>
              <span className="kicker" style={{ textAlign: 'center', marginBottom: '12px' }}>Mã QR Truy xuất</span>
              
              <div className="qr-container-box" style={{ 
                display: 'inline-block',
                marginBottom: '12px'
              }}>
                <QRCodeDisplay productId={selectedProduct.product_id} />
              </div>
              
              <div>
                <button className="btn btn-primary" onClick={downloadQRCode} style={{ fontSize: '12px', padding: '8px 16px' }}>
                  <Download size={12} /> Tải tem QR PNG
                </button>
              </div>
            </div>

            {/* Cryptographic hash proof */}
            <div>
              <span className="kicker">Chứng cứ bảo mật (SHA-256 Proof)</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                <div className="hash-block">
                  <div style={{ fontSize: '10px', color: 'var(--ink-4)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '3px' }}>
                    Mã băm sản phẩm
                  </div>
                  <code>{selectedProduct.product_hash}</code>
                </div>
                <div className="hash-block">
                  <div style={{ fontSize: '10px', color: 'var(--ink-4)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '3px' }}>
                    Mã giao dịch Blockchain (Tx Hash)
                  </div>
                  <code>{selectedProduct.tx_hash}</code>
                </div>
              </div>
            </div>

            {/* Synchronization Warning Alert Box for admin/developer */}
            {selectedVerification && (selectedVerification.blockchain_hash === "" || selectedVerification.message?.includes("not on blockchain")) && (
              <div className="alert" style={{ background: 'var(--amber-soft)', border: '1px solid var(--amber)', padding: '14px', borderRadius: '8px', fontSize: '12.5px', color: 'var(--ink-2)', display: 'flex', flexDirection: 'column', gap: '4px', margin: '0' }}>
                <div style={{ fontWeight: 'bold', color: 'var(--amber)' }}>Lưu ý thử nghiệm (Sandbox Sync):</div>
                <span>Sản phẩm này chưa tồn tại trên Blockchain hiện tại. Có thể Hardhat node cục bộ vừa được khởi động lại. Mã giao dịch (Tx Hash) hiển thị ở trên là lịch sử từ phiên trước.</span>
              </div>
            )}

            {/* Tampering simulator */}
            {demoMode && (
              <div style={{ borderTop: '1px solid var(--border-2)', paddingTop: '18px', marginTop: '6px' }}>
                <span className="kicker">Giả lập sửa đổi (Demo)</span>
                {selectedProduct.is_tampered ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                    <div className="alert alert-error" style={{ padding: '8px 12px', fontSize: '12px', margin: '0' }}>
                      <AlertTriangle size={14} />
                      <div className="alert-body"><span>Database bị sửa đổi trái phép.</span></div>
                    </div>
                    <button className="btn w-full" style={{ background: 'var(--green-soft)', color: 'var(--green)', height: '36px', fontSize: '12.5px', justifyContent: 'center' }} onClick={() => handleRestore(selectedProduct.product_id)}>
                      <RotateCcw size={13} /> Khôi phục CSDL
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                    <button className="btn w-full" style={{ background: 'var(--red-soft)', color: 'var(--red)', height: '36px', fontSize: '12.5px', justifyContent: 'center' }} onClick={() => handleTamper(selectedProduct.product_id)}>
                      <AlertTriangle size={13} /> Chỉnh sửa trái phép Database
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
