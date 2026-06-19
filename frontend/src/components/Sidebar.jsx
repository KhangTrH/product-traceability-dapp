import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  ShieldCheck, LayoutDashboard, QrCode, Database, 
  Link2, Info 
} from 'lucide-react';
import axios from 'axios';

const Sidebar = () => {
  const location = useLocation();
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [apiStatus, setApiStatus] = useState('checking');
  const [blockchainStatus, setBlockchainStatus] = useState('checking');
  const [demoMode, setDemoMode] = useState(localStorage.getItem('demo_mode') === 'true');

  // Theme management
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  // Health checking
  useEffect(() => {
    const checkHealth = async () => {
      if (demoMode) {
        setApiStatus('online');
        setBlockchainStatus('online');
        return;
      }

      try {
        const res = await axios.get('http://127.0.0.1:3000/health', { timeout: 2000 });
        if (res.status === 200) {
          setApiStatus('online');
          setBlockchainStatus('online');
        } else {
          setApiStatus('offline');
          setBlockchainStatus('offline');
        }
      } catch (err) {
        setApiStatus('offline');
        setBlockchainStatus('offline');
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 8000);
    return () => clearInterval(interval);
  }, [demoMode]);

  // Demo mode management
  const toggleDemoMode = () => {
    const nextMode = !demoMode;
    setDemoMode(nextMode);
    localStorage.setItem('demo_mode', String(nextMode));
    window.dispatchEvent(new Event('demo_mode_changed'));
  };

  return (
    <aside className="sidebar-aside">
      {/* Brand — 3D Sphere Logo */}
      <div className="sidebar-brand">
        <div className="brand-sphere">
          <ShieldCheck size={18} />
        </div>
        <div className="sidebar-brand-text">
          <div className="brand-name">TraceChain</div>
          <div className="brand-sub">on Blockchain</div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="sidebar-nav-menu">
        <span className="kicker" style={{ paddingLeft: '16px', fontSize: '10px', marginBottom: '10px' }}>Chức năng chính</span>
        
        <Link to="/" className={`sidebar-nav-item ${location.pathname === '/' ? 'active' : ''}`}>
          <LayoutDashboard size={18} />
          <span>Bảng điều khiển</span>
        </Link>
        
        <Link to="/scanner" className={`sidebar-nav-item ${location.pathname === '/scanner' ? 'active' : ''}`}>
          <QrCode size={18} />
          <span>Quét mã tem QR</span>
        </Link>
      </nav>

      {/* Footer Controls */}
      <div className="sidebar-footer">
        <span className="kicker" style={{ fontSize: '10px' }}>Hệ thống</span>

        {/* Demo Switch */}
        <button 
          className={`sidebar-demo-btn ${demoMode ? 'active' : ''}`}
          onClick={toggleDemoMode}
          title="Kích hoạt chế độ demo nếu không chạy blockchain node và database"
        >
          <Info size={14} />
          <span>{demoMode ? 'Demo Mode: BẬT' : 'Demo Mode: TẮT'}</span>
        </button>

        {/* Connection status with 3D spheres */}
        <div className="sidebar-statuses">
          <div className="sidebar-status-pill" title="Trạng thái Rust Backend">
            <Database size={12} />
            <span>API Server</span>
            <span className={`status-sphere ${apiStatus === 'online' ? 'active' : apiStatus === 'checking' ? 'checking' : 'inactive'}`}></span>
          </div>
          
          <div className="sidebar-status-pill" title="Trạng thái Hardhat Node">
            <Link2 size={12} />
            <span>Blockchain</span>
            <span className={`status-sphere ${blockchainStatus === 'online' ? 'active' : blockchainStatus === 'checking' ? 'checking' : 'inactive'}`}></span>
          </div>
        </div>

        {/* Dark/Light Switcher */}
        <div className="sidebar-controls">
          <button 
            className="btn-theme-toggle" 
            onClick={toggleTheme}
            aria-label="Toggle light/dark theme"
            title="Chuyển chế độ sáng/tối"
          >
            <span className="theme-orb"></span>
            <span className="theme-stars">
              <span className="theme-star theme-star--1"></span>
              <span className="theme-star theme-star--2"></span>
              <span className="theme-star theme-star--3"></span>
            </span>
          </button>

          <span style={{ color: 'var(--ink-4)', fontSize: '12px', fontWeight: '500' }}>Chế độ màu</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
