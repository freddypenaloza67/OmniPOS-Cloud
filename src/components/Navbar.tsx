import React, { useState } from 'react';
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
  Receipt, 
  Cloud, 
  Smartphone, 
  DollarSign, 
  Menu, 
  X,
  FileScan,
  ShieldCheck,
  Crown,
  Sparkles,
  Clock,
  Sun,
  Moon,
  Eye
} from 'lucide-react';
import { RateModal } from './RateModal';
import { CloudSyncModal } from './CloudSyncModal';
import { LicenseModal } from './LicenseModal';

export type NavView = 
  | 'dashboard' 
  | 'pos' 
  | 'purchases' 
  | 'inventory' 
  | 'suppliers' 
  | 'customers' 
  | 'reports' 
  | 'settings';

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
  const { state, syncing, firebaseStatus, licenseInfo, setIsLicenseModalOpen, theme, setTheme } = useStore();
  const [isRateModalOpen, setIsRateModalOpen] = useState(false);
  const [isCloudModalOpen, setIsCloudModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'pos', label: 'Punto de Venta (Caja)', icon: ShoppingCart, highlight: true },
    { id: 'purchases', label: 'Compras & Escáner IA', icon: FileScan },
    { id: 'inventory', label: 'Inventario', icon: Package },
    { id: 'suppliers', label: 'Proveedores', icon: Truck },
    { id: 'customers', label: 'Clientes & Fiados', icon: Users },
    { id: 'reports', label: 'Reportes en Vivo', icon: BarChart3 },
    { id: 'settings', label: 'Ajustes', icon: Settings },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 backdrop-blur-md bg-[var(--nav-bg)] border-b border-[var(--clay-card-border)] shadow-[0_10px_25px_-5px_rgba(0,0,0,0.06)] max-w-full overflow-x-hidden transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-2 sm:gap-4">
            
            {/* Brand Logo & Name */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <button 
                onClick={() => onNavigate('dashboard')}
                className="flex items-center gap-2 sm:gap-2.5 text-left group cursor-pointer min-w-0"
              >
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl clay-btn clay-btn-amber flex items-center justify-center text-slate-950 font-black shadow-md shrink-0">
                  <Store className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
                </div>
                <div className="min-w-0">
                  <h1 
                    className="font-black text-[var(--text-main)] leading-tight text-xs sm:text-base md:text-lg truncate block" 
                    title={state.settings.storeName}
                  >
                    {state.settings.storeName}
                  </h1>
                  <p className="text-[10px] sm:text-[11px] text-[var(--text-muted)] font-bold leading-none mt-0.5 truncate hidden sm:block">
                    OmniPOS 3D • Retail & Caja
                  </p>
                </div>
              </button>
            </div>

            {/* Desktop Navigation Links (3D Clay Style) */}
            <nav className="hidden xl:flex items-center gap-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id as NavView)}
                    className={`px-3 py-2 rounded-2xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                      isActive
                        ? 'clay-btn clay-btn-purple text-white shadow-md'
                        : item.highlight
                        ? 'clay-btn clay-btn-emerald text-white shadow-md'
                        : 'clay-btn-surface text-[var(--text-main)] hover:scale-102'
                    }`}
                  >
                    <Icon className="w-4 h-4 stroke-[2.5]" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Quick Actions (Tema 3D + Licencia + Tasa del Día + Sincronización) */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              
              {/* SELECTOR DE TEMAS 3D CLAYMORPHIC */}
              <div className="flex items-center p-0.5 sm:p-1 bg-black/5 dark:bg-white/5 rounded-2xl border border-white/40 shadow-inner">
                <button
                  type="button"
                  onClick={() => setTheme('light')}
                  title="Tema Claro 3D Claymorphic"
                  className={`p-1.5 sm:px-2 py-1 rounded-xl text-xs font-black flex items-center gap-1 transition-all cursor-pointer ${
                    theme === 'light'
                      ? 'clay-btn-amber shadow-sm scale-102'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
                >
                  <Sun className="w-3.5 h-3.5" />
                  <span className="hidden md:inline text-[10px]">Claro</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  title="Tema Oscuro 3D Midnight Clay"
                  className={`p-1.5 sm:px-2 py-1 rounded-xl text-xs font-black flex items-center gap-1 transition-all cursor-pointer ${
                    theme === 'dark'
                      ? 'clay-btn-purple text-white shadow-sm scale-102'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
                >
                  <Moon className="w-3.5 h-3.5" />
                  <span className="hidden md:inline text-[10px]">Oscuro</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTheme('eyecare')}
                  title="Tema Descanso Ocular (Luz Cálida Sepia / Anti-fatiga)"
                  className={`p-1.5 sm:px-2 py-1 rounded-xl text-xs font-black flex items-center gap-1 transition-all cursor-pointer ${
                    theme === 'eyecare'
                      ? 'bg-[#d97706] text-white shadow-sm scale-102 border border-amber-300'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span className="hidden md:inline text-[10px]">Descanso</span>
                </button>
              </div>

              {/* License Status Badge in 3D Clay */}
              <button
                onClick={() => setIsLicenseModalOpen(true)}
                title="Estado de Licencia del Sistema (Click para ver detalles o activar planes)"
                className={`flex items-center gap-1 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-2xl transition-all text-xs font-black shadow-sm active:translate-y-0.5 cursor-pointer shrink-0 clay-btn ${
                  licenseInfo.isLifetime
                    ? 'clay-btn-amber text-slate-950'
                    : licenseInfo.isExpired
                    ? 'clay-btn-rose text-white animate-pulse'
                    : licenseInfo.isExpiringSoon
                    ? 'clay-btn-amber text-slate-950'
                    : 'clay-btn-emerald text-white'
                }`}
              >
                {licenseInfo.isLifetime ? (
                  <Crown className="w-3.5 h-3.5 stroke-[2.5]" />
                ) : licenseInfo.isExpired ? (
                  <Clock className="w-3.5 h-3.5 stroke-[2.5]" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 stroke-[2.5]" />
                )}
                
                <span className="hidden sm:inline font-black">
                  {licenseInfo.isLifetime
                    ? 'Vitalicio'
                    : licenseInfo.isExpired
                    ? 'Vencida'
                    : licenseInfo.type === 'demo'
                    ? `Demo: ${licenseInfo.daysRemaining > 0 ? `${licenseInfo.daysRemaining}d` : `${licenseInfo.hoursRemaining}h`}`
                    : `${licenseInfo.typeName.replace('Licencia ', '')} (${licenseInfo.daysRemaining}d)`}
                </span>

                <span className="sm:hidden font-black text-[11px]">
                  {licenseInfo.isLifetime ? '💎' : licenseInfo.isExpired ? '⚠️' : `${licenseInfo.daysRemaining}d`}
                </span>
              </button>

              {/* Daily Exchange Rate Badge */}
              <button
                onClick={() => setIsRateModalOpen(true)}
                title="Tasa de cambio del dólar del día (Click para editar o consultar)"
                className="flex items-center gap-1 px-2 py-1 sm:px-2.5 sm:py-1.5 clay-btn clay-btn-surface rounded-2xl text-[var(--text-main)] transition-all text-xs font-black active:translate-y-0.5 cursor-pointer shrink-0 shadow-sm"
              >
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span className="hidden sm:inline font-bold text-[var(--text-muted)]">Tasa:</span>
                <span className="hidden sm:inline font-black">
                  1 $ = {state.settings.exchangeRate.toLocaleString('es-VE', { minimumFractionDigits: 2 })} {state.settings.secondaryCurrency.symbol}
                </span>
                <span className="sm:hidden font-black text-[11px] whitespace-nowrap">
                  {state.settings.exchangeRate.toLocaleString('es-VE', { maximumFractionDigits: 0 })} {state.settings.secondaryCurrency.symbol}
                </span>
              </button>

              {/* Firebase Cloud Sync Button */}
              <button
                onClick={() => setIsCloudModalOpen(true)}
                title="Sincronización Firebase en tiempo real y soporte offline para caja"
                className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-2xl transition-all text-xs font-black flex items-center gap-1.5 cursor-pointer clay-btn active:translate-y-0.5 shrink-0 shadow-sm ${
                  firebaseStatus.isOnline
                    ? 'clay-btn-surface text-[var(--text-main)]'
                    : 'clay-btn-amber text-slate-950'
                }`}
              >
                <Cloud className={`w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5] ${syncing ? 'animate-bounce' : ''}`} />
                <span className="hidden md:inline">
                  {firebaseStatus.isOnline ? 'Firebase' : 'Offline'}
                </span>
                <span className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${firebaseStatus.isOnline ? 'bg-emerald-500' : 'bg-amber-500'} ${syncing ? 'animate-ping' : ''}`} />
              </button>

              {/* Mobile Menu Toggle Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="xl:hidden p-1.5 text-[var(--text-main)] hover:bg-black/5 dark:hover:bg-white/5 rounded-2xl transition-colors shrink-0"
                aria-label="Abrir menú"
              >
                {mobileMenuOpen ? <X className="w-5 h-5 sm:w-6 sm:h-6" /> : <Menu className="w-5 h-5 sm:w-6 sm:h-6" />}
              </button>
            </div>

          </div>
        </div>

        {/* Mobile Navigation Drawer / Dropdown */}
        {mobileMenuOpen && (
          <div className="xl:hidden border-t border-[var(--clay-card-border)] bg-[var(--clay-card-bg)] px-4 py-3 space-y-2 shadow-xl animate-in slide-in-from-top-2 duration-150">
            {/* Mobile Theme Switcher */}
            <div className="p-2.5 clay-card-subtle flex items-center justify-between mb-2">
              <span className="text-xs font-black text-[var(--text-muted)]">Tema Visual 3D:</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setTheme('light')}
                  className={`px-2 py-1 rounded-xl text-xs font-black flex items-center gap-1 ${
                    theme === 'light' ? 'clay-btn-amber shadow-sm' : 'text-[var(--text-muted)]'
                  }`}
                >
                  <Sun className="w-3.5 h-3.5" /> Claro
                </button>
                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  className={`px-2 py-1 rounded-xl text-xs font-black flex items-center gap-1 ${
                    theme === 'dark' ? 'clay-btn-purple text-white shadow-sm' : 'text-[var(--text-muted)]'
                  }`}
                >
                  <Moon className="w-3.5 h-3.5" /> Oscuro
                </button>
                <button
                  type="button"
                  onClick={() => setTheme('eyecare')}
                  className={`px-2 py-1 rounded-xl text-xs font-black flex items-center gap-1 ${
                    theme === 'eyecare' ? 'bg-[#d97706] text-white shadow-sm' : 'text-[var(--text-muted)]'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" /> Descanso
                </button>
              </div>
            </div>

            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.id as NavView);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full px-3.5 py-2.5 rounded-2xl text-sm font-black flex items-center justify-between transition-colors ${
                    isActive
                      ? 'clay-btn-purple text-white shadow-md'
                      : 'clay-btn-surface text-[var(--text-main)]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.highlight && !isActive && (
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                      Caja Rápida
                    </span>
                  )}
                </button>
              );
            })}

            {/* Mobile License Direct Access */}
            <div className="pt-2 border-t border-slate-100 mt-2">
              <button
                onClick={() => {
                  setIsLicenseModalOpen(true);
                  setMobileMenuOpen(false);
                }}
                className="w-full px-3.5 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-between text-emerald-800 bg-emerald-50 hover:bg-emerald-100/70 border border-emerald-200/80 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Licencia: {licenseInfo.isLifetime ? 'Vitalicia' : licenseInfo.formattedRemaining}</span>
                </div>
                <span className="text-xs font-bold text-emerald-700">Ver Planes →</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Floating Bottom Nav for Mobile Cashiers / Admin on Phone */}
      <div className="xl:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200/90 py-1.5 px-3 flex items-center justify-around shadow-lg">
        <button
          onClick={() => onNavigate('pos')}
          className={`flex flex-col items-center py-1 px-2.5 rounded-xl transition-all ${
            currentView === 'pos' ? 'text-emerald-600 font-bold' : 'text-slate-600'
          }`}
        >
          <div className={`p-1 rounded-lg ${currentView === 'pos' ? 'bg-emerald-100' : ''}`}>
            <ShoppingCart className="w-5 h-5" />
          </div>
          <span className="text-[10px] mt-0.5">Caja POS</span>
        </button>

        <button
          onClick={() => onNavigate('dashboard')}
          className={`flex flex-col items-center py-1 px-2.5 rounded-xl transition-all ${
            currentView === 'dashboard' ? 'text-blue-600 font-bold' : 'text-slate-600'
          }`}
        >
          <div className={`p-1 rounded-lg ${currentView === 'dashboard' ? 'bg-blue-100' : ''}`}>
            <LayoutDashboard className="w-5 h-5" />
          </div>
          <span className="text-[10px] mt-0.5">Dashboard</span>
        </button>

        <button
          onClick={() => onNavigate('inventory')}
          className={`flex flex-col items-center py-1 px-2.5 rounded-xl transition-all ${
            currentView === 'inventory' ? 'text-purple-600 font-bold' : 'text-slate-600'
          }`}
        >
          <div className={`p-1 rounded-lg ${currentView === 'inventory' ? 'bg-purple-100' : ''}`}>
            <Package className="w-5 h-5" />
          </div>
          <span className="text-[10px] mt-0.5">Inventario</span>
        </button>

        <button
          onClick={() => onNavigate('purchases')}
          className={`flex flex-col items-center py-1 px-2.5 rounded-xl transition-all ${
            currentView === 'purchases' ? 'text-amber-600 font-bold' : 'text-slate-600'
          }`}
        >
          <div className={`p-1 rounded-lg ${currentView === 'purchases' ? 'bg-amber-100' : ''}`}>
            <FileScan className="w-5 h-5" />
          </div>
          <span className="text-[10px] mt-0.5">Compras IA</span>
        </button>

        <button
          onClick={() => onNavigate('reports')}
          className={`flex flex-col items-center py-1 px-2.5 rounded-xl transition-all ${
            currentView === 'reports' ? 'text-cyan-600 font-bold' : 'text-slate-600'
          }`}
        >
          <div className={`p-1 rounded-lg ${currentView === 'reports' ? 'bg-cyan-100' : ''}`}>
            <BarChart3 className="w-5 h-5" />
          </div>
          <span className="text-[10px] mt-0.5">Reportes</span>
        </button>
      </div>

      {/* Modals */}
      <RateModal isOpen={isRateModalOpen} onClose={() => setIsRateModalOpen(false)} />
      <CloudSyncModal isOpen={isCloudModalOpen} onClose={() => setIsCloudModalOpen(false)} />
      <LicenseModal />
    </>
  );
};
