import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Header from './components/Layout/Header';
import BottomNav from './components/Layout/BottomNav';
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';
import Services from './pages/Services';
import Scheduling from './pages/Scheduling';
import DailyRecap from './pages/DailyRecap';
import IncomeBreakdown from './pages/IncomeBreakdown';
import Inventory from './pages/Inventory';
import Pembukuan from './pages/Pembukuan';
import './index.css';

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <div className="app-container bg-mesh" style={{ minHeight: '100vh', paddingBottom: 'var(--bottom-nav-height)' }}>
          <Header />

          <main className="animate-fade-in" style={{
            minHeight: 'calc(100vh - var(--header-height) - var(--bottom-nav-height))',
            paddingTop: 'var(--header-height)'
          }}>
            <Routes>
              <Route path="/" element={<Navigate to="/analytics" replace />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/services" element={<Services />} />
              <Route path="/scheduling" element={<Scheduling />} />
              <Route path="/daily-recap" element={<DailyRecap />} />
              <Route path="/pembukuan" element={<Pembukuan />} />
              <Route path="/income-breakdown" element={<IncomeBreakdown />} />
              <Route path="/inventory" element={<Inventory />} />
            </Routes>
          </main>

          <BottomNav />
        </div>
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
