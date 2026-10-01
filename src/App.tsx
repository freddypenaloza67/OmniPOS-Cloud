import React, { useState, useEffect } from 'react';
import { StoreProvider, useStore } from './context/StoreContext';
import { Navbar, NavView } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { PosView } from './components/PosView';
import { PurchasesView } from './components/PurchasesView';
import { InventoryView } from './components/InventoryView';
import { SuppliersView } from './components/SuppliersView';
import { CustomersView } from './components/CustomersView';
import { ReportsView } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';
import { LicenseBanner } from './components/LicenseBanner';
import { Footer } from './components/Footer';
import { Loader2 } from 'lucide-react';

const MainContent: React.FC = () => {
  const { loading, theme } = useStore();
  const [currentView, setCurrentView] = useState<NavView>('dashboard');

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        return;
      }
      if (e.key === 'F1') {
        e.preventDefault();
        setCurrentView('pos');
      } else if (e.key === 'F2') {
        e.preventDefault();
        setCurrentView('dashboard');
      } else if (e.key === 'F3') {
        e.preventDefault();
        setCurrentView('purchases');
      } else if (e.key === 'F4') {
        e.preventDefault();
        setCurrentView('inventory');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center animate-pulse">
          <Loader2 className="w-6 h-6 animate-spin text-white" />
        </div>
        <div className="text-center">
          <h2 className="text-lg font-bold">Cargando OmniPOS Retail...</h2>
          <p className="text-xs text-slate-400 mt-1">Conectando y sincronizando con la nube</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col font-sans antialiased pb-20 xl:pb-6 w-full max-w-full overflow-x-hidden transition-colors duration-200 ${
      theme === 'dark' 
        ? 'bg-[#080c14] text-slate-100' 
        : theme === 'eyecare' 
        ? 'bg-[#f7f2e8] text-[#2b2014]' 
        : 'bg-[#eef2f7] text-slate-900'
    }`}>
      {/* Top Navbar */}
      <Navbar currentView={currentView} onNavigate={setCurrentView} />

      {/* License Expiration Banner */}
      <LicenseBanner />

      {/* Main View Area */}
      <main className="flex-1">
        {currentView === 'dashboard' && <DashboardView onNavigate={setCurrentView} />}
        {currentView === 'pos' && <PosView />}
        {currentView === 'purchases' && <PurchasesView />}
        {currentView === 'inventory' && <InventoryView />}
        {currentView === 'suppliers' && <SuppliersView />}
        {currentView === 'customers' && <CustomersView />}
        {currentView === 'reports' && <ReportsView />}
        {currentView === 'settings' && <SettingsView />}
      </main>

      {/* Developer Footer */}
      <Footer />
    </div>
  );
};

export default function App() {
  return (
    <StoreProvider>
      <MainContent />
    </StoreProvider>
  );
}
