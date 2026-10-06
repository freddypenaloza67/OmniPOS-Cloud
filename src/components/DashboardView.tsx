import React, { useMemo, useState } from 'react';
import { useStore } from '../context/StoreContext';
import { NavView } from './Navbar';
import { 
  TrendingUp, 
  ShoppingCart, 
  Package, 
  DollarSign, 
  AlertTriangle, 
  Users, 
  FileScan, 
  ArrowUpRight, 
  Sparkles, 
  Clock, 
  RefreshCw, 
  Receipt, 
  ChevronRight,
  ShieldCheck,
  Smartphone
} from 'lucide-react';
import { formatUSD, formatLocal, formatDual, formatDateTime } from '../utils/formatters';
import { ReceiptModal } from './ReceiptModal';
import { Sale } from '../types';

interface DashboardViewProps {
  onNavigate: (view: NavView) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const { state, refreshExchangeRate } = useStore();
  const rate = state.settings.exchangeRate;
  const currSymbol = state.settings.secondaryCurrency.symbol;
  const currCode = state.settings.secondaryCurrency.code;

  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [isRefreshingRate, setIsRefreshingRate] = useState(false);

  // Today calculations
  const todaySales = useMemo(() => {
    const todayStr = new Date().toDateString();
    return state.sales.filter(s => new Date(s.date).toDateString() === todayStr);
  }, [state.sales]);

  const todayRevenueUSD = useMemo(() => {
    return todaySales.reduce((acc, s) => acc + s.totalUSD, 0);
  }, [todaySales]);

  const todayCostUSD = useMemo(() => {
    return todaySales.reduce((acc, s) => {
      const itemsCost = s.items.reduce((sum, item) => sum + (item.costUSD * item.quantity), 0);
      return acc + itemsCost;
    }, 0);
  }, [todaySales]);

  const todayProfitUSD = Math.max(0, todayRevenueUSD - todayCostUSD);

  // Monthly Revenue
  const monthlyRevenueUSD = useMemo(() => {
    const now = new Date();
    return state.sales
      .filter(s => {
        const d = new Date(s.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((acc, s) => acc + s.totalUSD, 0);
  }, [state.sales]);

  // Low stock products
  const lowStockProducts = useMemo(() => {
    return state.products.filter(p => p.stock <= p.minStock);
  }, [state.products]);

  // Total receivables
  const totalReceivables = useMemo(() => {
    return state.customers.reduce((acc, c) => acc + c.currentDebtUSD, 0);
  }, [state.customers]);

  const handleRefreshRate = async () => {
    setIsRefreshingRate(true);
    try {
      await refreshExchangeRate();
    } finally {
      setIsRefreshingRate(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Exchange Rate & Cloud Status Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-2xl p-5 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 font-bold rounded-md text-[11px] uppercase tracking-wider flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Tasa Multimoneda del Día
            </span>
            <span className="text-xs text-slate-400">
              Auto-actualizada diariamente al iniciar la app
            </span>
          </div>
          <div className="flex items-baseline gap-3">
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              1 USD = {rate.toLocaleString('es-VE', { minimumFractionDigits: 2 })} {currSymbol}
            </h2>
            <span className="text-xs text-slate-300 font-medium">({currCode})</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefreshRate}
            disabled={isRefreshingRate}
            className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border border-white/10 cursor-pointer"
            title="Consultar y actualizar tasa oficial de cambio"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingRate ? 'animate-spin' : ''}`} />
            <span>{isRefreshingRate ? 'Sincronizando...' : 'Actualizar Tasa'}</span>
          </button>
        </div>
      </div>

      {/* Top 4 KPI Metrics (3D Clay) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Today's Sales */}
        <div className="clay-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-[var(--text-muted)] uppercase tracking-wider">
              Ventas de Hoy
            </span>
            <div className="w-8 h-8 rounded-2xl clay-btn clay-btn-emerald text-white flex items-center justify-center shadow-sm">
              <ShoppingCart className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
          <div className="text-2xl font-black text-[var(--text-main)] mt-2">
            {formatUSD(todayRevenueUSD)}
          </div>
          <div className="text-xs font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
            {formatLocal(todayRevenueUSD * rate, currSymbol, currCode)}
          </div>
          <div className="text-[11px] text-[var(--text-muted)] mt-2 flex items-center gap-1 font-bold">
            <span>{todaySales.length} comprobantes emitidos hoy</span>
          </div>
        </div>

        {/* Today's Net Profit */}
        <div className="clay-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-[var(--text-muted)] uppercase tracking-wider">
              Ganancia Neta Hoy
            </span>
            <div className="w-8 h-8 rounded-2xl clay-btn clay-btn-amber text-slate-950 flex items-center justify-center shadow-sm">
              <TrendingUp className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-500 mt-2">
            {formatUSD(todayProfitUSD)}
          </div>
          <div className="text-xs font-black text-amber-600 dark:text-amber-400 mt-0.5">
            {formatLocal(todayProfitUSD * rate, currSymbol, currCode)}
          </div>
          <div className="text-[11px] text-[var(--text-muted)] mt-2 font-bold">
            Margen de ganancia en tiempo real
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div 
          onClick={() => onNavigate('inventory')}
          className="clay-card p-5 cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-[var(--text-muted)] uppercase tracking-wider">
              Stock Bajo Alerta
            </span>
            <div className="w-8 h-8 rounded-2xl clay-btn clay-btn-purple text-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
              <AlertTriangle className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
          <div className="text-2xl font-black text-[var(--text-main)] mt-2">
            {lowStockProducts.length} <span className="text-sm font-normal text-[var(--text-muted)]">ítems</span>
          </div>
          <div className="text-xs font-black text-amber-600 dark:text-amber-400 mt-0.5">
            {lowStockProducts.filter(p => p.stock <= 0).length} agotados completamente
          </div>
          <div className="text-[11px] text-purple-600 dark:text-purple-400 font-bold mt-2 flex items-center gap-1">
            <span>Verificar en inventario</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Customer Receivables */}
        <div 
          onClick={() => onNavigate('customers')}
          className="clay-card p-5 cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-[var(--text-muted)] uppercase tracking-wider">
              Cuentas por Cobrar (Fiados)
            </span>
            <div className="w-8 h-8 rounded-2xl clay-btn clay-btn-rose text-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
              <Users className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-500 mt-2">
            {formatUSD(totalReceivables)}
          </div>
          <div className="text-xs font-black text-[var(--text-muted)] mt-0.5">
            {formatLocal(totalReceivables * rate, currSymbol, currCode)}
          </div>
          <div className="text-[11px] text-rose-600 dark:text-rose-400 font-bold mt-2 flex items-center gap-1">
            <span>Gestionar abonos de clientes</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
        </div>

      </div>

      {/* Quick Action Shortcuts (3D Clay) */}
      <div className="clay-card-subtle p-4 sm:p-5">
        <span className="text-xs font-black text-[var(--text-muted)] uppercase tracking-wider block mb-3">
          Acciones Rápidas del Administrador
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            onClick={() => onNavigate('pos')}
            className="p-4 clay-card text-left transition-all group cursor-pointer"
          >
            <div className="w-9 h-9 rounded-2xl clay-btn clay-btn-emerald text-white flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform">
              <ShoppingCart className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div className="font-black text-xs sm:text-sm text-[var(--text-main)]">Nueva Venta</div>
            <div className="text-[11px] text-[var(--text-muted)] font-medium">Punto de venta y caja</div>
          </button>

          <button
            onClick={() => onNavigate('purchases')}
            className="p-4 clay-card text-left transition-all group cursor-pointer"
          >
            <div className="w-9 h-9 rounded-2xl clay-btn clay-btn-amber text-slate-950 flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform">
              <Sparkles className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div className="font-black text-xs sm:text-sm text-[var(--text-main)]">Escanear Factura</div>
            <div className="text-[11px] text-[var(--text-muted)] font-medium">Carga con IA o foto</div>
          </button>

          <button
            onClick={() => onNavigate('inventory')}
            className="p-4 clay-card text-left transition-all group cursor-pointer"
          >
            <div className="w-9 h-9 rounded-2xl clay-btn clay-btn-purple text-white flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform">
              <Package className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div className="font-black text-xs sm:text-sm text-[var(--text-main)]">Inventario</div>
            <div className="text-[11px] text-[var(--text-muted)] font-medium">Ajustar o crear productos</div>
          </button>

          <button
            onClick={() => onNavigate('reports')}
            className="p-4 clay-card text-left transition-all group cursor-pointer"
          >
            <div className="w-9 h-9 rounded-2xl clay-btn clay-btn-surface text-[var(--text-main)] flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform shadow-sm">
              <TrendingUp className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div className="font-black text-xs sm:text-sm text-[var(--text-main)]">Reportes Financieros</div>
            <div className="text-[11px] text-[var(--text-muted)] font-medium">Márgenes y cierres</div>
          </button>
        </div>
      </div>

      {/* Two Column Layout: Recent Sales & Low Stock List (3D Clay) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left: Recent Sales Feed (7 cols) */}
        <div className="lg:col-span-7 clay-card overflow-hidden">
          <div className="p-4 border-b border-[var(--clay-card-border)] clay-card-subtle flex items-center justify-between">
            <h3 className="font-black text-[var(--text-main)] text-sm flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-600" />
              <span>Últimas Ventas Realizadas</span>
            </h3>
            <button
              onClick={() => onNavigate('pos')}
              className="text-xs text-emerald-600 dark:text-emerald-400 font-black cursor-pointer hover:underline"
            >
              Ir a Caja POS
            </button>
          </div>

          <div className="divide-y divide-[var(--clay-card-border)]">
            {state.sales.slice(0, 6).map(sale => (
              <div 
                key={sale.id}
                onClick={() => setSelectedSale(sale)}
                className="p-3.5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center justify-between gap-3 cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-2xl clay-btn clay-btn-surface text-[var(--text-main)] flex items-center justify-center shadow-xs">
                    <Receipt className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-black text-xs sm:text-sm text-[var(--text-main)] flex items-center gap-2">
                      <span>{sale.invoiceNumber}</span>
                      <span className="text-[10px] text-[var(--text-muted)] font-normal">
                        {sale.items.length} {sale.items.length === 1 ? 'producto' : 'productos'}
                      </span>
                    </div>
                    <div className="text-[11px] text-[var(--text-muted)] flex items-center gap-2 mt-0.5 font-medium">
                      <span>{sale.customerName}</span>
                      <span>•</span>
                      <span>{formatDateTime(sale.date)}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-black text-xs sm:text-sm text-[var(--text-main)] font-mono">
                    {formatUSD(sale.totalUSD)}
                  </div>
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold font-mono">
                    {formatLocal(sale.totalLocal, sale.currencySymbol, sale.currencyCode)}
                  </div>
                </div>
              </div>
            ))}

            {state.sales.length === 0 && (
              <div className="p-8 text-center text-xs text-[var(--text-muted)]">
                Aún no hay ventas registradas. Comienza vendiendo en el Punto de Venta.
              </div>
            )}
          </div>
        </div>

        {/* Right: Low Stock Alert Items (5 cols) */}
        <div className="lg:col-span-5 clay-card overflow-hidden">
          <div className="p-4 border-b border-[var(--clay-card-border)] clay-card-subtle flex items-center justify-between">
            <h3 className="font-black text-[var(--text-main)] text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>Alerta de Reabastecimiento</span>
            </h3>
            <span className="text-xs font-black text-amber-600 dark:text-amber-400 clay-badge clay-card-subtle">
              {lowStockProducts.length} críticos
            </span>
          </div>

          <div className="divide-y divide-[var(--clay-card-border)]">
            {lowStockProducts.slice(0, 5).map(prod => (
              <div key={prod.id} className="p-3.5 flex items-center justify-between gap-3 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                <div className="space-y-0.5 min-w-0">
                  <h5 className="font-black text-xs text-[var(--text-main)] truncate">{prod.name}</h5>
                  <div className="text-[10px] text-[var(--text-muted)] font-mono font-medium">
                    SKU: {prod.sku} • Costo: {formatUSD(prod.costUSD)}
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <span className={`clay-badge text-[11px] font-black ${
                    prod.stock <= 0 ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {prod.stock} / {prod.minStock} {prod.unit}
                  </span>
                </div>
              </div>
            ))}

            {lowStockProducts.length === 0 && (
              <div className="p-8 text-center text-xs text-emerald-600 dark:text-emerald-400 font-bold flex flex-col items-center gap-1.5">
                <ShieldCheck className="w-6 h-6 text-emerald-500" />
                <span>¡Inventario en niveles óptimos! No hay productos agotados.</span>
              </div>
            )}
          </div>

          <div className="p-3 clay-card-subtle border-t border-[var(--clay-card-border)] text-center">
            <button
              onClick={() => onNavigate('purchases')}
              className="text-xs font-black text-emerald-600 dark:text-emerald-400 hover:underline flex items-center justify-center gap-1 w-full cursor-pointer"
            >
              <span>Generar orden de compra o escanear factura de reposición</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>

      {/* Receipt Viewer Modal */}
      <ReceiptModal
        isOpen={!!selectedSale}
        sale={selectedSale}
        onClose={() => setSelectedSale(null)}
      />

    </div>
  );
};
