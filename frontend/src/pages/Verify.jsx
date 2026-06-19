import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { 
  ShieldCheck, ShieldAlert, ArrowLeft, RefreshCw, 
  CheckCircle, XCircle, ChevronDown, ChevronUp, Database, Cpu, Link2, Info 
} from 'lucide-react';
import { getMockProducts, calculateSha256, getCanonicalPayload, initializeMockData } from '../utils/demoHelper';

const Verify = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [demoMode, setDemoMode] = useState(localStorage.getItem('demo_mode') === 'true');
  const [isAccordionOpen, setIsAccordionOpen] = useState(false);

  useEffect(() => {
    const handleDemoModeChange = () => {
      const currentMode = localStorage.getItem('demo_mode') === 'true';
      setDemoMode(currentMode);
    };
    window.addEventListener('demo_mode_changed', handleDemoModeChange);
    return () => window.removeEventListener('demo_mode_changed', handleDemoModeChange);
  }, []);

  const verifyProduct = async () => {
    setLoading(true);
    setError(null);

    if (demoMode) {
      await initializeMockData();
      await new Promise(resolve => setTimeout(resolve, 800));
      const mockList = getMockProducts();
      const mockProd = mockList.find(p => p.product_id === Number(id));

      if (!mockProd) {
        setError(`Không tìm thấy sản phẩm với ID #${id} trong cơ sở dữ liệu mẫu!`);
        setLoading(false);
        return;
      }

      const currentPayload = getCanonicalPayload(mockProd.product_id, mockProd.name, mockProd.manufacturer, mockProd.description);
      const recomputedHash = await calculateSha256(currentPayload);
      const dbHash = mockProd.product_hash;
      const blockchainHash = mockProd.product_hash;
      const isDbIntact = dbHash === recomputedHash;
      const isBlockchainVerified = recomputedHash === blockchainHash;
      const isValid = isDbIntact && isBlockchainVerified;

      setProduct({
        product_id: mockProd.product_id,
        name: mockProd.name,
        manufacturer: mockProd.manufacturer,
        description: mockProd.description,
        db_hash: dbHash,
        recomputed_hash: recomputedHash,
        blockchain_hash: blockchainHash,
        db_integrity: isDbIntact,
        blockchain_verified: isBlockchainVerified,
        status: isValid ? "VALID" : "INVALID",
        message: isValid 
          ? "Sản phẩm chính hãng và dữ liệu được xác thực toàn vẹn!" 
          : "Cảnh báo! Dữ liệu sản phẩm đã bị thay đổi trái phép so với Blockchain!"
      });
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post('http://127.0.0.1:3000/api/verify', { product_id: Number(id) });
      setProduct(response.data);
    } catch (err) {
      setError(err.response?.data?.message || "Không thể kết nối đến máy chủ Blockchain.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    verifyProduct();
  }, [id, demoMode]);

  if (loading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '60vh', textAlign: 'center' }}>
        <div>
          <div className="spinner-sm" style={{ width: '32px', height: '32px', borderWidth: '3px', marginBottom: '16px' }}></div>
          <h2 style={{ fontSize: '20px', color: 'var(--ink-1)' }}>Đang xác thực thông tin...</h2>
          <p style={{ color: 'var(--ink-4)', marginTop: '8px' }}>Đối chiếu thông số mật mã 3 lớp</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <main style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
        <section className="card-3d" style={{ padding: '40px 24px' }}>
          <ShieldAlert size={48} style={{ color: 'var(--red)', marginBottom: '16px' }} />
          <h2 style={{ fontSize: '22px', color: 'var(--ink-1)', marginBottom: '10px' }}>Lỗi xác thực</h2>
          <p style={{ color: 'var(--ink-2)', marginBottom: '32px', lineHeight: '1.6' }}>{error}</p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <Link to="/scanner" className="btn btn-ghost"><ArrowLeft size={14} /> Quay lại</Link>
            <button className="btn btn-primary" onClick={verifyProduct}><RefreshCw size={14} /> Thử lại</button>
          </div>
        </section>
      </main>
    );
  }

  // --- LOGIC XÁC THỰC 3 TRẠNG THÁI (3-STATE VERIFICATION LOGIC) ---
  // 1. Kiểm tra tính toàn vẹn của CSDL cục bộ (Database Integrity):
  //    So sánh mã băm lưu trong DB (db_hash) với mã băm tính toán lại từ các thuộc tính hiện tại (recomputed_hash).
  //    Nếu bằng nhau, nghĩa là dữ liệu trong CSDL PostgreSQL chưa từng bị chỉnh sửa bất hợp pháp.
  const isDbIntact = product ? product.db_hash === product.recomputed_hash : false;

  // 2. Kiểm tra xem sản phẩm đã được đăng ký trên Blockchain hay chưa (isNotOnChain):
  //    Môi trường Hardhat Local chạy trên RAM nên khi khởi động lại node, dữ liệu trên Blockchain sẽ bị mất (Genesis Block reset)
  //    trong khi PostgreSQL vẫn lưu dữ liệu sản phẩm cũ. Lúc này API verify sẽ trả về blockchain_hash rỗng ("")
  //    hoặc message báo lỗi "Product exists in database but not on blockchain".
  const isNotOnChain = product ? (product.blockchain_hash === "" || product.message === "Product exists in database but not on blockchain" || product.message?.includes("not on blockchain")) : false;

  // 3. Phân loại 3 trạng thái xác thực để render giao diện phù hợp:
  //    - VERIFIED: Dữ liệu CSDL toàn vẹn VÀ khớp 100% với mã băm đã khóa trên Blockchain (Khiên Xanh).
  //    - PENDING_SYNC: Dữ liệu CSDL toàn vẹn nhưng Blockchain chưa ghi nhận (Khiên Cam, báo trạng thái chờ đồng bộ).
  //    - TAMPERED: Phát hiện dữ liệu trong CSDL đã bị chỉnh sửa bất hợp pháp (Khiên Đỏ, cảnh báo gian lận).
  let verificationState = "TAMPERED"; // Trạng thái mặc định là cảnh báo gian lận
  if (product) {
    if (isNotOnChain) {
      verificationState = isDbIntact ? "PENDING_SYNC" : "TAMPERED_OFFCHAIN";
    } else if (product.blockchain_verified && isDbIntact) {
      verificationState = "VERIFIED";
    }
  }

  let borderLeftColor = "var(--red)";
  let badgeBg = "var(--red-soft)";
  let badgeColor = "var(--red)";

  if (verificationState === "VERIFIED") {
    borderLeftColor = "var(--green)";
    badgeBg = "var(--green-soft)";
    badgeColor = "var(--green)";
  } else if (verificationState === "PENDING_SYNC") {
    borderLeftColor = "var(--amber)";
    badgeBg = "var(--amber-soft)";
    badgeColor = "var(--amber)";
  }

  return (
    <main style={{ maxWidth: '650px', margin: '0 auto', textAlign: 'left' }}>
      {/* Navigation */}
      <Link to="/scanner" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--ink-3)', textDecoration: 'none', marginBottom: '24px', fontWeight: '600', fontSize: '13.5px' }}>
        <ArrowLeft size={13} /> Quay lại Quét QR
      </Link>

      {/* 3D Status Card with Shield Sphere */}
      <section className="card-3d" style={{ 
        borderLeft: `4px solid ${borderLeftColor}`,
        marginBottom: '24px'
      }}>
        <div className="card-body" style={{ padding: '32px', textAlign: 'center' }}>
          {verificationState === "VERIFIED" && (
            <div>
              {/* 3D Green Shield Sphere */}
              <div className="shield-3d success" style={{ margin: '0 auto 18px' }}>
                <ShieldCheck size={28} style={{ color: '#FFFFFF', position: 'relative', zIndex: 2 }} />
              </div>
              <h1 style={{ fontSize: '22px', color: 'var(--green)', fontWeight: '900', letterSpacing: '-0.02em', marginBottom: '8px' }}>
                SẢN PHẨM CHÍNH HÃNG
              </h1>
              <p style={{ color: 'var(--ink-3)', fontSize: '14px', maxWidth: '480px', margin: '0 auto', lineHeight: '1.6' }}>
                Xác thực thành công! Bằng chứng mã hóa hoàn toàn trùng khớp với bản ghi gốc trên Blockchain.
              </p>
            </div>
          )}

          {verificationState === "PENDING_SYNC" && (
            <div>
              {/* 3D Amber Shield Sphere */}
              <div className="shield-3d warning" style={{ margin: '0 auto 18px' }}>
                <Info size={28} style={{ color: '#FFFFFF', position: 'relative', zIndex: 2 }} />
              </div>
              <h1 style={{ fontSize: '22px', color: 'var(--amber)', fontWeight: '900', letterSpacing: '-0.02em', marginBottom: '8px' }}>
                ĐANG CHỜ ĐỒNG BỘ CHUỖI
              </h1>
              <p style={{ color: 'var(--ink-3)', fontSize: '14px', maxWidth: '480px', margin: '0 auto', lineHeight: '1.6' }}>
                Dữ liệu nội bộ của sản phẩm hoàn toàn <strong>toàn vẹn</strong>. Tuy nhiên, thông tin chưa được đăng ký trên Blockchain (có thể do blockchain node thử nghiệm vừa được khởi động lại hoặc giao dịch đang chờ đồng bộ).
              </p>
            </div>
          )}

          {(verificationState === "TAMPERED" || verificationState === "TAMPERED_OFFCHAIN") && (
            <div>
              {/* 3D Red Shield Sphere */}
              <div className="shield-3d error" style={{ margin: '0 auto 18px' }}>
                <ShieldAlert size={28} style={{ color: '#FFFFFF', position: 'relative', zIndex: 2 }} />
              </div>
              <h1 style={{ fontSize: '22px', color: 'var(--red)', fontWeight: '900', letterSpacing: '-0.02em', marginBottom: '8px' }}>
                CẢNH BÁO GIAN LẬN!
              </h1>
              <p style={{ color: 'var(--red)', fontWeight: '600', fontSize: '14px', maxWidth: '480px', margin: '0 auto', lineHeight: '1.6' }}>
                {verificationState === "TAMPERED_OFFCHAIN"
                  ? "Cảnh báo! Dữ liệu lưu trữ nội bộ đã bị sửa đổi trái phép (và sản phẩm cũng chưa có bản ghi gốc trên Blockchain)!"
                  : "Dữ liệu lưu trữ nội bộ đã bị sửa đổi trái phép so với giá trị băm được khóa trên Blockchain!"}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Product Info */}
      <section className="card-3d" style={{ marginBottom: '24px' }}>
        <div className="card-head" style={{ padding: '18px 24px' }}>
          <h2 style={{ fontSize: '16px' }}>Thông tin truy xuất nguồn gốc</h2>
          <span className="badge" style={{ fontSize: '11px', background: badgeBg, color: badgeColor }}>
            ID #{product?.product_id}
          </span>
        </div>
        <div className="card-body" style={{ padding: '24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '10px 16px', fontSize: '14px' }}>
            <span style={{ fontWeight: '700', color: 'var(--ink-4)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Tên sản phẩm</span>
            <span style={{ fontWeight: '600', color: 'var(--ink-1)' }}>{product?.name}</span>
            <span style={{ fontWeight: '700', color: 'var(--ink-4)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Nhà sản xuất</span>
            <span style={{ fontWeight: '500' }}>{product?.manufacturer}</span>
            <span style={{ fontWeight: '700', color: 'var(--ink-4)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Mô tả</span>
            <span style={{ color: 'var(--ink-3)', lineHeight: '1.6' }}>{product?.description || "Không có mô tả."}</span>
          </div>
        </div>
      </section>

      {/* 3D Integrity Indicators */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        <div className="card-3d" style={{ flex: 1, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          {isDbIntact ? <CheckCircle size={18} style={{ color: 'var(--green)' }} /> : <XCircle size={18} style={{ color: 'var(--red)' }} />}
          <div>
            <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>1. Dữ liệu CSDL</div>
            <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--ink-1)', marginTop: '2px' }}>
              {isDbIntact ? "Toàn vẹn" : "Đã bị sửa trộm"}
            </div>
          </div>
        </div>
        <div className="card-3d" style={{ flex: 1, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          {verificationState === "VERIFIED" ? (
            <CheckCircle size={18} style={{ color: 'var(--green)' }} />
          ) : isNotOnChain ? (
            <Info size={18} style={{ color: 'var(--amber)' }} />
          ) : (
            <XCircle size={18} style={{ color: 'var(--red)' }} />
          )}
          <div>
            <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>2. Xác thực chuỗi</div>
            <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--ink-1)', marginTop: '2px' }}>
              {verificationState === "VERIFIED"
                ? "Chính hãng"
                : isNotOnChain
                ? "Chờ đồng bộ"
                : "Giả mạo"}
            </div>
          </div>
        </div>
      </div>

      {/* Accordion for detailed hashes */}
      <div className="accordion">
        <button className="accordion-trigger" onClick={() => setIsAccordionOpen(!isAccordionOpen)}>
          <span>Chứng cứ mã hóa chi tiết (Kiểm toán viên)</span>
          {isAccordionOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        <div className={`accordion-content ${isAccordionOpen ? 'open' : ''}`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'left' }}>
            
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--ink-3)', marginBottom: '6px', fontSize: '12px', fontWeight: '600' }}>
                <Database size={13} /> <span>1. Database Hash</span>
              </div>
              <div className="hash-block"><code>{product?.db_hash}</code></div>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent)', marginBottom: '6px', fontSize: '12px', fontWeight: '600' }}>
                <Cpu size={13} /> <span>2. Recomputed Hash</span>
              </div>
              <div className="hash-block">
                <code style={{ color: isDbIntact ? 'var(--ink-1)' : 'var(--red)', fontWeight: isDbIntact ? 'normal' : 'bold' }}>
                  {product?.recomputed_hash}
                </code>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: isNotOnChain ? 'var(--amber)' : 'var(--green)', marginBottom: '6px', fontSize: '12px', fontWeight: '600' }}>
                <Link2 size={13} /> <span>3. Blockchain Hash</span>
              </div>
              <div className="hash-block">
                <code style={{ 
                  color: isNotOnChain ? 'var(--amber)' : (product?.blockchain_verified ? 'var(--green)' : 'var(--red)'), 
                  fontWeight: 'bold' 
                }}>
                  {isNotOnChain ? "CHƯA GHI NHẬN (Blockchain Node Reset hoặc đang chờ đồng bộ)" : product?.blockchain_hash}
                </code>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start', color: 'var(--ink-4)', fontSize: '11.5px', lineHeight: '1.5', marginTop: '6px' }}>
              <Info size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>Nếu CSDL bị hack hoặc Blockchain bị reset, mã băm tính toán lại (2) sẽ lệch với Blockchain (3), lập tức kích hoạt cảnh báo.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Developer Sandbox Diagnostics Box */}
      {isNotOnChain && (
        <section className="card-3d" style={{ 
          marginTop: '24px', 
          borderLeft: '4px solid var(--amber)', 
          background: 'var(--amber-soft)', 
          padding: '24px' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--amber)', fontWeight: '800', fontSize: '14px', marginBottom: '10px' }}>
            <Cpu size={15} /> <span>Hộp chẩn đoán Môi trường Thử nghiệm (Sandbox Diagnostics)</span>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--ink-2)', lineHeight: '1.6' }}>
            <p style={{ margin: '0 0 10px 0' }}>
              <strong>Nguyên nhân kỹ thuật:</strong> Blockchain cục bộ (Hardhat Node) đang chạy trong bộ nhớ RAM tạm thời. Mỗi khi bạn khởi động lại backend, Hardhat node sẽ reset về khối số 0 (genesis). Trong khi đó, database PostgreSQL vẫn lưu các dòng sản phẩm cũ.
            </p>
            <p style={{ margin: '0 0 10px 0' }}>
              <strong>Ý nghĩa bảo mật Blockchain:</strong> Sự lệch pha này chứng minh cơ chế bảo mật của dự án: dù database SQL có tồn tại dữ liệu, nhưng nếu không được đối chiếu khớp với mã băm trên sổ cái Blockchain thì sản phẩm vẫn không được chứng thực.
            </p>
            <p style={{ margin: 0 }}>
              <strong>Cách đồng bộ thử nghiệm:</strong> Hãy vào Dashboard để tạo sản phẩm mới (sẽ ghi vào Blockchain hiện hành), hoặc xóa bớt dòng cũ trong database PostgreSQL để đồng bộ.
            </p>
          </div>
        </section>
      )}

      {/* Return */}
      <div style={{ textAlign: 'center', marginTop: '32px', marginBottom: '40px' }}>
        <Link to="/scanner" className="btn btn-primary" style={{ padding: '12px 32px' }}>
          Quét sản phẩm khác
        </Link>
      </div>
    </main>
  );
};

export default Verify;