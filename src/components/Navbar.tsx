import React, { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { 
  Store, 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Truck, 
  Users, 
  BarChart3, 
  Settings, 
  Cloud, 
  Menu, 
  X,
  FileScan,
  ShieldCheck,
  Sun,
  Moon,
  Eye,
  Maximize,
  Minimize,
  Lock
} from 'lucide-react';
import { RateModal } from './RateModal';
import { CloudSyncModal } from './CloudSyncModal';
import { LicenseModal } from './LicenseModal';
import { UserPinModal } from './UserPinModal';
import { NavView } from '../types';
export type { NavView };
import { hasModulePermission } from '../utils/permissionUtils';

interface NavbarProps {
  currentView: NavView;
  onNavigate: (view: NavView) => void;
}

interface NavItem {
  id: NavView;
  label: string;
  icon: any;
  highlight?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate }) => {
  const { state, syncing, firebaseStatus, licenseInfo, setIsLicenseModalOpen, theme, setTheme, posCart, currentUser } = useStore();
  const [isRateModalOpen, setIsRateModalOpen] = useState(false);
  const [isCloudModalOpen, setIsCloudModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const primaryNavItems: NavItem[] = [
    { id: 'dashboard', label: 'Inicio', icon: LayoutDashboard },
    { 
      id: 'pos', 
      label: posCart.length > 0 ? `Caja POS (${posCart.length})` : 'Caja POS', 
      icon: ShoppingCart, 
      highlight: true 
    },
    { id: 'purchases', label: 'Compras', icon: FileScan },
    { id: 'inventory', label: 'Inventario', icon: Package },
    { id: 'reports', label: 'Reportes', icon: BarChart3 },
  ];

  const secondaryNavItems: NavItem[] = [
    { id: 'customers', label: 'Clientes', icon: Users },
    { id: 'suppliers', label: 'Proveedores', icon: Truck },
    { id: 'settings', label: 'Ajustes', icon: Settings },
  ];

  const allNavItems: NavItem[] = [...primaryNavItems, ...secondaryNavItems];

  return (
    <>
      <header className="sticky top-0 z-40 backdrop-blur-md bg-[var(--nav-bg)] border-b border-[var(--clay-card-border)] shadow-[0_10px_25px_-5px_rgba(0,0,0,0.06)] w-full transition-colors duration-200">
        <div className="w-full px-2 sm:px-4">
          <div className="flex items-center justify-between h-16 gap-2">
            
            {/* 1. Left Cluster: Brand + Divider + Main Navigation */}
            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
              {/* Brand Logo & Store Name */}
              <button 
                onClick={() => onNavigate('dashboard')}
                className="flex items-center gap-2.5 text-left group cursor-pointer shrink-0"
                title="Ir al Inicio / Dashboard"
              >
                <div className="w-9 h-9 rounded-2xl clay-btn clay-btn-amber flex items-center justify-center text-slate-950 font-black shadow-md shrink-0">
                  <Store className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h1 
                    className="font-black text-[var(--text-main)] leading-tight text-xs sm:text-sm md:text-base whitespace-nowrap block" 
                    title={state.settings.storeName}
                  >
                    {state.settings.storeName}
                  </h1>
                  <p className="text-[10px] text-[var(--text-muted)] font-bold leading-none mt-0.5 whitespace-nowrap hidden sm:block">
                    OmniPOS 3D • Retail
                  </p>
                </div>
              </button>

              {/* Elegant Vertical Divider */}
              <div className="hidden lg:block h-6 w-px bg-[var(--clay-card-border)]/80 mx-0.5" />

              {/* 2. Primary Navigation Links: Always in fixed order, uniform spacing, never disappear */}
              <nav className="hidden lg:flex items-center gap-1.5 shrink-0">
                {primaryNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentView === item.id;
                  const isRestricted = !hasModulePermission(currentUser, item.id as NavView);

                  return (
                    <button
                      key={item.id}
                      onClick={() => onNavigate(item.id as NavView)}
                      title={isRestricted ? `${item.label} (Requiere PIN de Supervisor o Admin)` : item.label}
                      className={`h-8.5 px-2.5 sm:px-3 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                        isActive
                          ? item.highlight
                            ? 'clay-btn clay-btn-emerald text-white shadow-md ring-2 ring-emerald-400/60 scale-102'
                            : 'clay-btn clay-btn-purple text-white shadow-md ring-2 ring-purple-400/60 scale-102'
                          : item.highlight
                          ? 'clay-btn clay-btn-emerald text-white opacity-90 hover:opacity-100 shadow-xs hover:scale-102'
                          : isRestricted
                          ? 'clay-btn-surface text-[var(--text-muted)] opacity-75 hover:opacity-100'
                          : 'clay-btn-surface text-[var(--text-main)] hover:scale-102'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>{item.label}</span>
                      {isRestricted && (
                        <span className="w-3.5 h-3.5 rounded bg-amber-500/20 text-amber-500 flex items-center justify-center -mr-0.5">
                          <Lock className="w-2.5 h-2.5 stroke-[3]" />
                        </span>
                      )}
                    </button>
                  );
                })}

                {/* Additional modules on wide monitors (2xl >= 1536px) */}
                {secondaryNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentView === item.id;
                  const isRestricted = !hasModulePermission(currentUser, item.id as NavView);

                  return (
                    <button
                      key={item.id}
                      onClick={() => onNavigate(item.id as NavView)}
                      title={isRestricted ? `${item.label} (Requiere PIN de Supervisor o Admin)` : item.label}
                      className={`h-8.5 px-2.5 sm:px-3 rounded-xl text-xs font-black hidden 2xl:flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                        isActive
                          ? 'clay-btn clay-btn-purple text-white shadow-md ring-2 ring-purple-400/60 scale-102'
                          : isRestricted
                          ? 'clay-btn-surface text-[var(--text-muted)] opacity-75 hover:opacity-100'
                          : 'clay-btn-surface text-[var(--text-main)] hover:scale-102'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>{item.label}</span>
                      {isRestricted && (
                        <span className="w-3.5 h-3.5 rounded bg-amber-500/20 text-amber-500 flex items-center justify-center -mr-0.5">
                          <Lock className="w-2.5 h-2.5 stroke-[3]" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* 3. Status Cluster (Theme + Rate + Cloud + User + Fullscreen + Menu Toggle) */}
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 ml-auto">
              
              {/* Theme Switcher 3D Pill */}
              <div className="h-8.5 flex items-center p-0.5 bg-black/5 dark:bg-white/5 rounded-xl border border-white/20 shadow-inner">
                <button
                  type="button"
                  onClick={() => setTheme('light')}
                  title="Tema Claro 3D"
                  className={`w-6 h-6.5 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                    theme === 'light'
                      ? 'clay-btn-amber shadow-xs scale-105'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
                >
                  <Sun className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  title="Tema Oscuro 3D"
                  className={`w-6 h-6.5 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                    theme === 'dark'
                      ? 'clay-btn-purple text-white shadow-xs scale-105'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
                >
                  <Moon className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setTheme('eyecare')}
                  title="Tema Descanso Ocular (Sepia)"
                  className={`w-6 h-6.5 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                    theme === 'eyecare'
                      ? 'bg-[#d97706] text-white shadow-xs scale-105 border border-amber-300'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Daily Exchange Rate Badge: Visible ONLY when not in dashboard */}
              {currentView !== 'dashboard' && (
                <button
                  onClick={() => setIsRateModalOpen(true)}
                  title={`Tasa del día: 1 USD = ${state.settings.exchangeRate.toLocaleString('es-VE')} ${state.settings.secondaryCurrency.symbol} (Click para editar)`}
                  className="h-8.5 flex items-center gap-1.5 px-2 clay-btn clay-btn-surface rounded-xl text-[var(--text-main)] transition-all text-xs font-black active:translate-y-0.5 cursor-pointer shrink-0 shadow-xs"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <span className="whitespace-nowrap font-black font-mono text-[11px]">
                    1 $ = {state.settings.exchangeRate.toLocaleString('es-VE', { maximumFractionDigits: 0 })} {state.settings.secondaryCurrency.symbol}
                  </span>
                </button>
              )}

              {/* Firebase Cloud Sync Button */}
              <button
                onClick={() => setIsCloudModalOpen(true)}
                title={`Firebase: ${firebaseStatus.isOnline ? 'En línea y sincronizado con la nube' : 'Modo Offline (Caja Local)'}`}
                className={`h-8.5 px-2 rounded-xl transition-all text-xs font-black flex items-center gap-1.5 cursor-pointer clay-btn active:translate-y-0.5 shrink-0 shadow-xs ${
                  firebaseStatus.isOnline
                    ? 'clay-btn-surface text-[var(--text-main)]'
                    : 'clay-btn-amber text-slate-950'
                }`}
              >
                <Cloud className={`w-3.5 h-3.5 stroke-[2.5] ${syncing ? 'animate-bounce' : ''}`} />
                <span className="hidden sm:inline text-xs">
                  {firebaseStatus.isOnline ? 'Nube' : 'Offline'}
                </span>
                <span className={`w-1.5 h-1.5 rounded-full ${firebaseStatus.isOnline ? 'bg-emerald-500' : 'bg-amber-500'} ${syncing ? 'animate-ping' : ''}`} />
              </button>

              {/* Active User Switcher Chip */}
              <button
                type="button"
                onClick={() => setIsUserModalOpen(true)}
                title={`Usuario activo: ${currentUser.name} (${currentUser.role}). Clic para cambiar de usuario con PIN.`}
                className="h-8.5 px-2 rounded-xl clay-btn clay-btn-surface flex items-center gap-1 text-xs font-black cursor-pointer shadow-xs active:translate-y-0.5 shrink-0 hover:scale-102 transition-all"
              >
                <span className="text-xs">
                  {currentUser.role === 'admin' ? '👑' : currentUser.role === 'supervisor' ? '🛡️' : '💼'}
                </span>
                <span className="hidden 2xl:inline max-w-[85px] truncate text-[var(--text-main)] font-black text-xs">
                  {currentUser.name}
                </span>
                <span className={`px-1.5 py-0.2 rounded text-[9px] uppercase font-black shrink-0 ${
                  currentUser.role === 'admin' 
                    ? 'bg-amber-400 text-slate-950' 
                    : currentUser.role === 'supervisor' 
                    ? 'bg-cyan-300 text-slate-950' 
                    : 'bg-emerald-300 text-slate-950'
                }`}>
                  {currentUser.role}
                </span>
              </button>

              {/* Fullscreen Kiosk Mode (Hides Chrome Titlebar) */}
              <button
                onClick={toggleFullscreen}
                title={isFullscreen ? "Salir de Pantalla Completa" : "Pantalla Completa Kiosk POS (Oculta la barra superior de Windows)"}
                className="h-8.5 w-8.5 sm:h-9 sm:w-9 rounded-xl transition-all flex items-center justify-center cursor-pointer clay-btn clay-btn-surface text-[var(--text-main)] active:translate-y-0.5 shrink-0 shadow-xs hover:scale-105"
              >
                {isFullscreen ? <Minimize className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" /> : <Maximize className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />}
              </button>

              {/* Menu Toggle Button ("Las tres rayitas") */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="h-8.5 w-8.5 sm:h-9 sm:w-9 rounded-xl clay-btn clay-btn-purple text-white flex items-center justify-center transition-all shrink-0 cursor-pointer shadow-md hover:scale-105 active:scale-95"
                aria-label="Abrir menú"
                title="Menú completo del sistema (Todos los módulos)"
              >
                {mobileMenuOpen ? <X className="w-4 h-4 stroke-[2.5]" /> : <Menu className="w-4 h-4 stroke-[2.5]" />}
              </button>
            </div>

          </div>
        </div>

        {/* Navigation Drawer / Dropdown */}
        {mobileMenuOpen && (
          <div className="border-t border-[var(--clay-card-border)] bg-[var(--clay-card-bg)] px-4 py-3 space-y-2 shadow-2xl animate-in slide-in-from-top-2 duration-150">
            {/* Mobile / Laptop Theme Switcher */}
            <div className="p-2.5 clay-card-subtle flex items-center justify-between mb-2">
              <span className="text-xs font-black text-[var(--text-muted)]">Tema Visual 3D:</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setTheme('light')}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1 ${
                    theme === 'light' ? 'clay-btn-amber shadow-sm' : 'text-[var(--text-muted)]'
                  }`}
                >
                  <Sun className="w-3.5 h-3.5" /> Claro
                </button>
                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1 ${
                    theme === 'dark' ? 'clay-btn-purple text-white shadow-sm' : 'text-[var(--text-muted)]'
                  }`}
                >
                  <Moon className="w-3.5 h-3.5" /> Oscuro
                </button>
                <button
                  type="button"
                  onClick={() => setTheme('eyecare')}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1 ${
                    theme === 'eyecare' ? 'bg-[#d97706] text-white shadow-sm' : 'text-[var(--text-muted)]'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" /> Descanso
                </button>
              </div>
            </div>

            {/* Current Active User Session Card in Drawer */}
            <div className="p-3 clay-card-subtle flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">
                  {currentUser.role === 'admin' ? '👑' : currentUser.role === 'supervisor' ? '🛡️' : '💼'}
                </span>
                <div>
                  <div className="text-xs font-black text-[var(--text-main)] flex items-center gap-1.5">
                    <span>{currentUser.name}</span>
                    <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-amber-400 text-slate-950 font-black">
                      {currentUser.role}
                    </span>
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)] font-medium">
                    PIN Activo · Privilegios del sistema
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setIsUserModalOpen(true);
                }}
                className="px-2.5 py-1.5 clay-btn clay-btn-amber text-slate-950 text-xs font-black rounded-xl shadow-xs cursor-pointer"
              >
                Cambiar Usuario
              </button>
            </div>

            {/* Navigation links - All 8 Modules */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-1.5">
              {allNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                const isRestricted = !hasModulePermission(currentUser, item.id as NavView);
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onNavigate(item.id as NavView);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-black flex items-center justify-between transition-colors ${
                      isActive
                        ? 'clay-btn clay-btn-purple text-white shadow-md'
                        : isRestricted
                        ? 'clay-btn-surface text-[var(--text-muted)] opacity-85'
                        : 'clay-btn-surface text-[var(--text-main)]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4 stroke-[2.5]" />
                      <span>{item.label}</span>
                    </div>
                    {isRestricted ? (
                      <span className="flex items-center gap-1 text-[10px] text-amber-500 font-bold">
                        <Lock className="w-3 h-3" /> Bloqueado
                      </span>
                    ) : item.highlight && !isActive ? (
                      <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full">
                        Caja Rápida
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            {/* License Direct Access */}
            <div className="pt-2 border-t border-[var(--clay-card-border)] mt-2">
              <button
                onClick={() => {
                  setIsLicenseModalOpen(true);
                  setMobileMenuOpen(false);
                }}
                className="w-full px-3.5 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-between text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100/70 border border-emerald-200/80 dark:border-emerald-800/60 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Licencia: {licenseInfo.isLifetime ? 'Vitalicia' : licenseInfo.formattedRemaining}</span>
                </div>
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Ver Planes →</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Floating Bottom Nav for Mobile Phones Only */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-[var(--nav-bg)]/95 backdrop-blur-md border-t border-[var(--clay-card-border)] py-1.5 px-3 flex items-center justify-around shadow-lg">
        <button
          onClick={() => onNavigate('pos')}
          className={`flex flex-col items-center py-1 px-2.5 rounded-xl transition-all ${
            currentView === 'pos' ? 'text-emerald-600 font-bold' : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          <div className={`p-1 rounded-lg ${currentView === 'pos' ? 'bg-emerald-100 dark:bg-emerald-950' : ''}`}>
            <ShoppingCart className="w-5 h-5" />
          </div>
          <span className="text-[10px] mt-0.5">Caja POS</span>
        </button>

        <button
          onClick={() => onNavigate('dashboard')}
          className={`flex flex-col items-center py-1 px-2.5 rounded-xl transition-all ${
            currentView === 'dashboard' ? 'text-blue-600 font-bold' : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          <div className={`p-1 rounded-lg ${currentView === 'dashboard' ? 'bg-blue-100 dark:bg-blue-950' : ''}`}>
            <LayoutDashboard className="w-5 h-5" />
          </div>
          <span className="text-[10px] mt-0.5">Dashboard</span>
        </button>

        <button
          onClick={() => onNavigate('inventory')}
          className={`flex flex-col items-center py-1 px-2.5 rounded-xl transition-all ${
            currentView === 'inventory' ? 'text-purple-600 font-bold' : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          <div className={`p-1 rounded-lg ${currentView === 'inventory' ? 'bg-purple-100 dark:bg-purple-950' : ''}`}>
            <Package className="w-5 h-5" />
          </div>
          <span className="text-[10px] mt-0.5">Inventario</span>
        </button>

        <button
          onClick={() => onNavigate('purchases')}
          className={`flex flex-col items-center py-1 px-2.5 rounded-xl transition-all ${
            currentView === 'purchases' ? 'text-amber-600 font-bold' : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          <div className={`p-1 rounded-lg ${currentView === 'purchases' ? 'bg-amber-100 dark:bg-amber-950' : ''}`}>
            <FileScan className="w-5 h-5" />
          </div>
          <span className="text-[10px] mt-0.5">Compras IA</span>
        </button>

        <button
          onClick={() => onNavigate('reports')}
          className={`flex flex-col items-center py-1 px-2.5 rounded-xl transition-all ${
            currentView === 'reports' ? 'text-cyan-600 font-bold' : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          <div className={`p-1 rounded-lg ${currentView === 'reports' ? 'bg-cyan-100 dark:bg-cyan-950' : ''}`}>
            <BarChart3 className="w-5 h-5" />
          </div>
          <span className="text-[10px] mt-0.5">Reportes</span>
        </button>
      </div>

      {/* Modals */}
      <RateModal isOpen={isRateModalOpen} onClose={() => setIsRateModalOpen(false)} />
      <CloudSyncModal isOpen={isCloudModalOpen} onClose={() => setIsCloudModalOpen(false)} />
      <LicenseModal />
      <UserPinModal 
        isOpen={isUserModalOpen} 
        onClose={() => setIsUserModalOpen(false)} 
        title="Cambiar Usuario / Turno" 
      />
    </>
  );
};
