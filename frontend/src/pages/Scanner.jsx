import { useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useNavigate } from 'react-router-dom';

const Scanner = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Cấu hình khung camera quét
    const scanner = new Html5QrcodeScanner(
      "reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false
    );

    // Xử lý khi quét thành công
    scanner.render(
      (decodedText) => {
        // Cắt lấy ID ở cuối chuỗi (Phòng trường hợp QR chứa nguyên 1 cái đường link)
        const parts = decodedText.split('/');
        const id = parts[parts.length - 1];

        // Tắt camera và chuyển qua trang kiểm tra
        scanner.clear(); 
        navigate(`/verify/${id}`);
      },
      (error) => {
        // Bỏ qua các lỗi ko tìm thấy QR lặt vặt
      }
    );

    // Dọn dẹp camera khi chuyển trang
    return () => {
      scanner.clear().catch(error => console.error("Lỗi tắt camera:", error));
    };
  }, [navigate]);

  return (
    <div style={{ textAlign: 'center', marginTop: '50px', fontFamily: 'sans-serif' }}>
      <h2>Quét Mã QR Sản Phẩm</h2>
      <p style={{ color: '#666' }}>Đưa mã QR vào khung hình để kiểm tra nguồn gốc</p>
      <div id="reader" style={{ width: '100%', maxWidth: '500px', margin: '20px auto' }}></div>
    </div>
  );
};

export default Scanner;