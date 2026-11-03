import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { CustomerBookingPage } from './pages/CustomerBookingPage';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Rutas Públicas de Reserva */}
          <Route path="/" element={<CustomerBookingPage />} />
          <Route path="/reservar" element={<CustomerBookingPage />} />
          <Route path="/reservar/:slug" element={<CustomerBookingPage />} />

          {/* Ruta de Autenticación */}
          <Route path="/login" element={<LoginPage />} />

          {/* Rutas Protegidas del Dashboard Operativo */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/admin" element={<Navigate to="/dashboard" replace />} />
          </Route>

          {/* Ruta pública directa por slug de barbería (ej. /apolo-sopocachi, /apolo-calacoto) */}
          <Route path="/:slug" element={<CustomerBookingPage />} />

          {/* Ruta de Captura / Redirección */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
