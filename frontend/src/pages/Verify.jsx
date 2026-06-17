import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';

const Verify = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const verifyProduct = async () => {
      try {
        // Gửi yêu cầu đến API Backend để xác thực dữ liệu sản phẩm
        const response = await axios.post('http://127.0.0.1:3000/api/verify', {
          product_id: Number(id)
        });
        setProduct(response.data);
      } catch (err) {
        setError(err.response?.data?.message || "Không thể kết nối đến máy chủ Blockchain!");
      } finally {
        setLoading(false);
      }
    };

    verifyProduct();
  }, [id]);

  if (loading) return <h2 style={{ textAlign: 'center', marginTop: '100px' }}>Đang xác thực dữ liệu trên Blockchain...</h2>;
  if (error) return <h2 style={{ textAlign: 'center', color: 'red', marginTop: '100px' }}>Lỗi: {error}</h2>;

  // Kiểm tra trạng thái xác thực từ phản hồi của hệ thống
  const isValid = product?.status === "VALID" || product?.blockchain_verified === true;

  return (
    <div style={{ maxWidth: '600px', margin: '50px auto', padding: '30px', border: '1px solid #ccc', borderRadius: '12px', fontFamily: 'sans-serif', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
      <h2 style={{ textAlign: 'center', color: isValid ? '#28a745' : '#dc3545', fontSize: '28px' }}>
        {isValid ? "SẢN PHẨM CHÍNH HÃNG" : "CẢNH BÁO GIAN LẬN"}
      </h2>
      
      {!isValid && (
        <p style={{ textAlign: 'center', color: 'red', fontWeight: 'bold' }}>
          Dữ liệu sản phẩm đã bị thay đổi trái phép trong cơ sở dữ liệu!
        </p>
      )}

      <div style={{ marginTop: '30px', lineHeight: '1.8', fontSize: '16px' }}>
        <p><strong>Mã sản phẩm (ID):</strong> {product?.product_id}</p>
        <p><strong>Tên sản phẩm:</strong> {product?.name}</p>

        <hr style={{ margin: '25px 0', borderColor: '#eee' }}/>
        
        <h3 style={{ fontSize: '18px', color: '#333' }}>Bằng Chứng Blockchain (Hash):</h3>
        
        <p style={{ wordWrap: 'break-word', fontSize: '14px', background: '#f8f9fa', padding: '10px', borderRadius: '6px' }}>
          <strong>Hash lưu trong Database:</strong> <br/>
          <span style={{ color: '#555', fontFamily: 'monospace' }}>{product?.db_hash || "Không có dữ liệu"}</span>
        </p>
        
        <p style={{ wordWrap: 'break-word', fontSize: '14px', background: isValid ? '#e8f5e9' : '#ffebee', padding: '10px', borderRadius: '6px' }}>
          <strong>Hash gốc trên Blockchain:</strong> <br/>
          <span style={{ color: isValid ? '#2e7d32' : '#c62828', fontFamily: 'monospace', fontWeight: 'bold' }}>
            {product?.blockchain_hash || "Không có dữ liệu"}
          </span>
        </p>

        <div style={{ textAlign: 'center', marginTop: '40px' }}>
          <Link to="/scanner" style={{ padding: '12px 24px', background: '#007BFF', color: 'white', textDecoration: 'none', borderRadius: '8px', fontWeight: 'bold' }}>
            Quét sản phẩm khác
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Verify;