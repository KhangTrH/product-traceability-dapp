import { QRCodeCanvas } from 'qrcode.react';

const QRCodeDisplay = ({ productId }) => {
  // Tạo ra cái link hoàn chỉnh để quét
  // Ví dụ: http://localhost:5173/verify/1
  const verifyUrl = `${window.location.origin}/verify/${productId}`;

  return (
    <div style={{ textAlign: 'center', padding: '15px', background: 'white', borderRadius: '8px', display: 'inline-block', border: '1px solid var(--border-3)', flexShrink: 0 }}>
      <QRCodeCanvas 
        value={verifyUrl} 
        size={200} 
        level={"H"} // Mức độ chống mờ/trầy xước QR cao nhất
        style={{ width: '200px', height: '200px', aspectRatio: '1 / 1', display: 'block', margin: '0 auto' }}
      />
      <p style={{ marginTop: '10px', fontWeight: 'bold', fontFamily: 'sans-serif', color: '#0F172A' }}>
        Mã SP: #{productId}
      </p>
    </div>
  );
};

export default QRCodeDisplay;