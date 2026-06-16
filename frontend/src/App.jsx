import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Scanner from './pages/Scanner';
import Verify from './pages/Verify';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/scanner" />} />
        <Route path="/scanner" element={<Scanner />} />
        <Route path="/verify/:id" element={<Verify />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;