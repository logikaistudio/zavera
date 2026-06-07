import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppProvider, useAppContext } from './context/AppContext';
import Header from './components/Layout/Header';
import BottomNav from './components/Layout/BottomNav';
import MigrationModal from './components/common/MigrationModal';
import ErrorBoundary from './components/common/ErrorBoundary';
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';
import Services from './pages/Services';
import Scheduling from './pages/Scheduling';
import DailyRecap from './pages/DailyRecap';
import IncomeBreakdown from './pages/IncomeBreakdown';
import Inventory from './pages/Inventory';
import Pembukuan from './pages/Pembukuan';
import Settings from './pages/Settings';
import Login from './pages/Login';
import UserManagement from './pages/UserManagement';
import './index.css';

const ProtectedRoute = ({ children, requiredPermission }) => {
  const { isAuthenticated, hasPermission } = useAppContext();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚫</div>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>Akses Ditolak</h2>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '24px' }}>Anda tidak memiliki izin untuk mengakses halaman ini.</p>
        <button 
          onClick={() => window.history.back()} 
          style={{ padding: '10px 24px', background: 'var(--gradient-primary)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
        >
          Kembali
        </button>
      </div>
    );
  }

  return children;
};

const AppContent = () => {
  const { isAuthenticated } = useAppContext();
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  return (
    <div className={`app-container ${isLoginPage ? '' : 'bg-mesh'}`} style={{ minHeight: '100vh', paddingBottom: isLoginPage ? '0' : 'var(--bottom-nav-height)' }}>
      {!isLoginPage && isAuthenticated && <Header />}

      <main className="animate-fade-in" style={{
        minHeight: isLoginPage ? '100vh' : 'calc(100vh - var(--header-height) - var(--bottom-nav-height))',
        paddingTop: isLoginPage ? '0' : 'var(--header-height)'
      }}>
        <ErrorBoundary>
        <Routes>
          <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />} />
          
          {/* Protected Routes */}
          <Route path="/" element={<ProtectedRoute><Navigate to="/settings" replace /></ProtectedRoute>} />
          <Route path="/analytics" element={<ProtectedRoute requiredPermission="view_analytics"><Analytics /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute requiredPermission="view_analytics"><Dashboard /></ProtectedRoute>} />
          <Route path="/services" element={<ProtectedRoute requiredPermission="view_services"><Services /></ProtectedRoute>} />
          <Route path="/scheduling" element={<ProtectedRoute requiredPermission="view_scheduling"><Scheduling /></ProtectedRoute>} />
          <Route path="/daily-recap" element={<ProtectedRoute requiredPermission="view_recap"><DailyRecap /></ProtectedRoute>} />
          <Route path="/pembukuan" element={<ProtectedRoute requiredPermission="view_finance"><Pembukuan /></ProtectedRoute>} />
          <Route path="/income-breakdown" element={<ProtectedRoute requiredPermission="view_finance"><IncomeBreakdown /></ProtectedRoute>} />
          <Route path="/inventory" element={<ProtectedRoute requiredPermission="view_inventory"><Inventory /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/user-management" element={<ProtectedRoute requiredPermission="manage_users"><UserManagement /></ProtectedRoute>} />
        </Routes>
        </ErrorBoundary>
      </main>

      {!isLoginPage && isAuthenticated && <BottomNav />}
    </div>
  );
};

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <MigrationModal />
        <AppContent />
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
