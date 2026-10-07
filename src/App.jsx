import { Navigate, Route, Routes } from 'react-router-dom';
import SystemsListPage from './pages/SystemsListPage.jsx';
import SystemDetailPage from './pages/SystemDetailPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<SystemsListPage />} />
      <Route path="/systems/:id" element={<SystemDetailPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}