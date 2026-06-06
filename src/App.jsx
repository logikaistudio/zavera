import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppProvider, useAppContext } from './context/AppContext';
import Header from './components/Layout/Header';
import BottomNav from './components/Layout/BottomNav';
import MigrationModal from './components/common/MigrationModal';
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
import './index.css';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAppContext();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
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
        <Routes>
          <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />} />
          
          {/* Protected Routes */}
          <Route path="/" element={<ProtectedRoute><Navigate to="/analytics" replace /></ProtectedRoute>} />
          <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/services" element={<ProtectedRoute><Services /></ProtectedRoute>} />
          <Route path="/scheduling" element={<ProtectedRoute><Scheduling /></ProtectedRoute>} />
          <Route path="/daily-recap" element={<ProtectedRoute><DailyRecap /></ProtectedRoute>} />
          <Route path="/pembukuan" element={<ProtectedRoute><Pembukuan /></ProtectedRoute>} />
          <Route path="/income-breakdown" element={<ProtectedRoute><IncomeBreakdown /></ProtectedRoute>} />
          <Route path="/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        </Routes>
      </main>

      {!isLoginPage && isAuthenticated && <BottomNav />}
    </div>
  );
};

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        {/* <MigrationModal /> */}
        <AppContent />
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
