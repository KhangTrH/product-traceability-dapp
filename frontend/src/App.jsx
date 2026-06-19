import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Footer from './components/Footer';
import Dashboard from './pages/Dashboard';
import Scanner from './pages/Scanner';
import Verify from './pages/Verify';

function App() {
  return (
    <BrowserRouter>
      <div className="app-layout">
        {/* Decorative 3D Background Orbs */}
        <div className="bg-orb bg-orb--1" aria-hidden="true"></div>
        <div className="bg-orb bg-orb--2" aria-hidden="true"></div>
        <div className="bg-orb bg-orb--3" aria-hidden="true"></div>

        <Sidebar />
        <div className="main-content-layout">
          <div className="page-view-wrapper">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/scanner" element={<Scanner />} />
              <Route path="/verify/:id" element={<Verify />} />
            </Routes>
          </div>
          <Footer />
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;