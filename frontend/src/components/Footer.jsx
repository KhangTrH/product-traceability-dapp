import { Award, FileText } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-text">
          <strong>TraceChain</strong> — Hệ thống quản trị truy xuất nguồn gốc sản phẩm
          <div style={{ fontSize: '11.5px', marginTop: '4px', color: 'var(--ink-4)' }}>
            Đồ án môn học: Blockchain · Đại học Kinh tế TP. Hồ Chí Minh (UEH)
          </div>
        </div>

        <div className="footer-badges">
          <span className="tech-badge" title="Smart Contract Compiler">Solidity 0.8.19</span>
          <span className="tech-badge" title="Blockchain Node">Hardhat</span>
          <span className="tech-badge" title="Rust Axum microservice">Rust Axum</span>
          <span className="tech-badge" title="Client library">React 19</span>
          <span className="tech-badge" title="Database">PostgreSQL</span>
        </div>

        <div style={{ display: 'flex', gap: '16px', color: 'var(--ink-4)', fontSize: '12px' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Award size={13} /> Smart Contract Verified
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <FileText size={13} /> SHA256 Integrity Secured
          </span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
