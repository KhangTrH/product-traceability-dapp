import { useEffect, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useNavigate } from 'react-router-dom';
import { QrCode, Camera, AlertCircle, Play } from 'lucide-react';

const Scanner = () => {
  const navigate = useNavigate();
  const [manualId, setManualId] = useState('');
  const [manualError, setManualError] = useState('');

  useEffect(() => {
    // Khởi tạo camera quét mã QR sử dụng thư viện html5-qrcode
    const scanner = new Html5QrcodeScanner(
      "reader",
      { 
        fps: 15, // Tần số quét (khung hình trên giây)
        qrbox: { width: 250, height: 250 }, // Kích thước khung quét QR
        aspectRatio: 1.0 // Tỷ lệ khung hình vuông
      },
      false
    );

    // Bắt đầu render camera và lắng nghe kết quả quét
    scanner.render(
      (decodedText) => {
        // Callback khi quét thành công mã QR
        // Giải mã URL từ mã QR để trích xuất Product ID (ví dụ URL có dạng: http://.../verify/:id)
        const parts = decodedText.split('/');
        const id = parts[parts.length - 1];
        
        // Dừng quét camera trước khi chuyển trang để giải phóng tài nguyên hệ thống
        scanner.clear()
          .then(() => { navigate(`/verify/${id}`); })
          .catch(err => {
            console.error("Lỗi dừng camera:", err);
            navigate(`/verify/${id}`);
          });
      },
      (error) => { /* Bỏ qua thông báo lỗi quét liên tục trong console để tránh quá tải log */ }
    );

    // Hàm dọn dẹp (cleanup) khi Component bị unmount (người dùng rời khỏi trang quét)
    return () => {
      scanner.clear().catch(error => console.warn("Dọn dẹp camera:", error));
    };
  }, [navigate]);

  const handleManualCheck = (e) => {
    e.preventDefault();
    if (!manualId || isNaN(Number(manualId)) || Number(manualId) <= 0) {
      setManualError("Vui lòng nhập mã ID sản phẩm hợp lệ (> 0)!");
      return;
    }
    navigate(`/verify/${manualId}`);
  };

  return (
    <main style={{ maxWidth: '620px', margin: '0 auto', textAlign: 'left' }}>
      <div style={{ marginBottom: '32px', textAlign: 'center' }}>
        <span className="kicker" style={{ justifyContent: 'center', display: 'flex', gap: '6px', alignItems: 'center' }}>
          <QrCode size={12} /> Hệ thống Web Scanner
        </span>
        <h1 style={{ fontSize: '30px', marginBottom: '10px', fontWeight: '900' }}>Xác thực nguồn gốc</h1>
        <p style={{ color: 'var(--ink-3)', fontSize: '14px', maxWidth: '480px', margin: '0 auto' }}>
          Đưa mã tem QR dán trên sản phẩm vào trước camera hoặc nhập mã số sản phẩm để bắt đầu truy xuất đối chiếu Blockchain.
        </p>
      </div>

      {/* Camera Scanner — 3D Scanning Portal */}
      <section className="card-3d" style={{ marginBottom: '24px' }}>
        <div className="card-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Camera size={18} style={{ color: 'var(--accent)' }} />
            <h2 style={{ fontSize: '17px' }}>Quét bằng Camera</h2>
          </div>
          <span className="badge badge-success">Sẵn sàng</span>
        </div>
        <div className="card-body" style={{ padding: '24px', background: 'var(--bg-deep)' }}>
          <div className="scanner-viewport">
            {/* Neon Corner Brackets */}
            <div className="scanner-corner tl"></div>
            <div className="scanner-corner tr"></div>
            <div className="scanner-corner bl"></div>
            <div className="scanner-corner br"></div>
            {/* Laser with glow trail */}
            <div className="scanner-laser"></div>
            <div id="reader" style={{ width: '100%', border: 'none' }}></div>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--ink-4)', textAlign: 'center', marginTop: '16px', lineHeight: '1.5' }}>
            Cho phép quyền truy cập camera. Đặt mã QR vuông góc và căn chỉnh vào trung tâm khung quét.
          </p>
        </div>
      </section>

      {/* Manual Verification */}
      <section className="card-3d">
        <div className="card-head">
          <h2 style={{ fontSize: '17px' }}>Kiểm tra thủ công</h2>
        </div>
        <div className="card-body">
          {manualError && (
            <div className="alert alert-error" style={{ padding: '12px 16px', marginBottom: '16px' }}>
              <AlertCircle size={16} />
              <div className="alert-body" style={{ fontSize: '13px' }}>
                <span>{manualError}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleManualCheck} style={{ display: 'flex', gap: '10px' }}>
            <div style={{ flex: 1 }}>
              <input 
                type="number" 
                className="input-control" 
                placeholder="Nhập mã ID sản phẩm (ví dụ: 1001)" 
                value={manualId}
                onChange={(e) => {
                  setManualId(e.target.value);
                  setManualError('');
                }}
                min="1"
                style={{ height: '42px' }}
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ height: '42px', padding: '0 24px' }}>
              <Play size={14} /> Kiểm tra
            </button>
          </form>
          <p style={{ fontSize: '11.5px', color: 'var(--ink-4)', marginTop: '10px' }}>
            Dành cho trường hợp thiết bị không hỗ trợ camera hoặc mã tem QR bị mờ trầy xước.
          </p>
        </div>
      </section>
    </main>
  );
};

export default Scanner;
