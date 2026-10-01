import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { 
  BarChart3, 
  Calendar, 
  TrendingUp, 
  DollarSign, 
  Receipt, 
  CreditCard, 
  Printer, 
  Download, 
  PieChart, 
  ShoppingBag,
  ArrowUpRight,
  Zap,
  FileText,
  Users,
  Building2,
  Coins,
  Smartphone,
  Send,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Check,
  ShieldAlert
} from 'lucide-react';
import { formatUSD, formatLocal, formatDual, formatDate, formatDateTime } from '../utils/formatters';
import { printThermalZReport, ThermalPaperWidth } from '../utils/thermalPrinter';
import { ZReportRecord, Sale } from '../types';

type ReportTab = 'overview' | 'report_x' | 'report_z' | 'users_audit';

export const ReportsView: React.FC = () => {
  const { state, currentUser, saveZReport } = useStore();
  const rate = state.settings.exchangeRate;
  const currSymbol = state.settings.secondaryCurrency.symbol;
  const currCode = state.settings.secondaryCurrency.code;

  const [activeTab, setActiveTab] = useState<ReportTab>('report_x');
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all'>('today');
  const [selectedUserFilter, setSelectedUserFilter] = useState<string>('all');
  const [thermalWidth, setThermalWidth] = useState<ThermalPaperWidth>(
    state.settings.defaultThermalWidth || '80mm'
  );

  // Arqueo físico inputs for Reporte Z
  const [countedCashUSD, setCountedCashUSD] = useState<string>('');
  const [countedCashLocal, setCountedCashLocal] = useState<string>('');
  const [zReportNotes, setZReportNotes] = useState<string>('');
  const [zSuccessMessage, setZSuccessMessage] = useState<string | null>(null);

  const usersList = state.users && state.users.length > 0 ? state.users : [];

  // Filter sales for general reports
  const filteredSales = useMemo(() => {
    const now = new Date();
    return state.sales.filter(sale => {
      const saleDate = new Date(sale.date);
      if (dateFilter === 'today') {
        return saleDate.toDateString() === now.toDateString();
      }
      if (dateFilter === 'week') {
        const oneWeekAgo = new Date(now.getTime() - 7 * 86400000);
        return saleDate >= oneWeekAgo;
      }
      if (dateFilter === 'month') {
        return saleDate.getMonth() === now.getMonth() && saleDate.getFullYear() === now.getFullYear();
      }
      return true;
    });
  }, [state.sales, dateFilter]);

  // Today's sales specifically for Reporte X and Reporte Z
  const todaySales = useMemo(() => {
    const todayStr = new Date().toDateString();
    return state.sales.filter(sale => {
      const isToday = new Date(sale.date).toDateString() === todayStr;
      if (!isToday) return false;
      if (selectedUserFilter !== 'all') {
        return sale.cashierId === selectedUserFilter;
      }
      return true;
    });
  }, [state.sales, selectedUserFilter]);

  // Calculations for Today (Reporte X / Z)
  const reportTotals = useMemo(() => {
    let totalSalesUSD = 0;
    let totalSalesLocal = 0;
    let cashExpectedUSD = 0;
    let cashExpectedLocal = 0;

    const inflowsByGateway: Record<string, { name: string; amountUSD: number; amountLocal: number; count: number }> = {
      cash_usd: { name: 'Efectivo $ (Dólares)', amountUSD: 0, amountLocal: 0, count: 0 },
      cash_local: { name: `Efectivo ${currCode} (${currSymbol})`, amountUSD: 0, amountLocal: 0, count: 0 },
      mobile_payment: { name: 'Pago Móvil (Bs.)', amountUSD: 0, amountLocal: 0, count: 0 },
      card_terminal: { name: 'Punto de Venta / Tarjetas', amountUSD: 0, amountLocal: 0, count: 0 },
      bank_transfer: { name: 'Transferencias Bancarias', amountUSD: 0, amountLocal: 0, count: 0 },
      zelle: { name: 'Zelle ($)', amountUSD: 0, amountLocal: 0, count: 0 },
      crypto_usdt: { name: 'Binance Pay / USDT', amountUSD: 0, amountLocal: 0, count: 0 },
      credit: { name: 'Fiados / Créditos Pendientes', amountUSD: 0, amountLocal: 0, count: 0 },
    };

    const inflowsByBank: Record<string, { bank: string; amountUSD: number; amountLocal: number; count: number }> = {};
    const inflowsByUser: Record<string, { userId: string; userName: string; role: string; totalUSD: number; totalLocal: number; count: number }> = {};

    let firstInvoice = '';
    let lastInvoice = '';

    todaySales.forEach((sale, idx) => {
      if (idx === todaySales.length - 1) firstInvoice = sale.invoiceNumber;
      if (idx === 0) lastInvoice = sale.invoiceNumber;

      totalSalesUSD += sale.totalUSD;
      totalSalesLocal += sale.totalLocal;

      // Inflows by Gateway
      sale.paymentMethods.forEach(pm => {
        if (!inflowsByGateway[pm.gateway]) {
          inflowsByGateway[pm.gateway] = {
            name: pm.gatewayName || pm.gateway,
            amountUSD: 0,
            amountLocal: 0,
            count: 0
          };
        }
        inflowsByGateway[pm.gateway].amountUSD += pm.amountUSD;
        inflowsByGateway[pm.gateway].amountLocal += pm.amountLocal;
        inflowsByGateway[pm.gateway].count += 1;

        if (pm.gateway === 'cash_usd') {
          cashExpectedUSD += pm.amountUSD;
        } else if (pm.gateway === 'cash_local') {
          cashExpectedLocal += pm.amountLocal;
        }

        // Inflows by Bank
        if (pm.bank) {
          if (!inflowsByBank[pm.bank]) {
            inflowsByBank[pm.bank] = { bank: pm.bank, amountUSD: 0, amountLocal: 0, count: 0 };
          }
          inflowsByBank[pm.bank].amountUSD += pm.amountUSD;
          inflowsByBank[pm.bank].amountLocal += pm.amountLocal;
          inflowsByBank[pm.bank].count += 1;
        }
      });

      // Inflows by User / Cashier
      const uid = sale.cashierId || 'usr-admin';
      const uname = sale.cashierName || 'Administrador General';
      const urole = usersList.find(u => u.id === uid)?.role || 'cajero';

      if (!inflowsByUser[uid]) {
        inflowsByUser[uid] = {
          userId: uid,
          userName: uname,
          role: urole,
          totalUSD: 0,
          totalLocal: 0,
          count: 0
        };
      }
      inflowsByUser[uid].totalUSD += sale.totalUSD;
      inflowsByUser[uid].totalLocal += sale.totalLocal;
      inflowsByUser[uid].count += 1;
    });

    return {
      totalSalesUSD,
      totalSalesLocal,
      transactionsCount: todaySales.length,
      cashExpectedUSD,
      cashExpectedLocal,
      inflowsByGateway,
      inflowsByBank,
      inflowsByUser,
      firstInvoice: firstInvoice || todaySales[0]?.invoiceNumber || 'N/A',
      lastInvoice: lastInvoice || todaySales[todaySales.length - 1]?.invoiceNumber || 'N/A'
    };
  }, [todaySales, currCode, currSymbol, usersList]);

  // Print Reporte X (Corte Parcial)
  const handlePrintReportX = () => {
    const reportData: ZReportRecord = {
      id: `x-${Date.now()}`,
      zNumber: 0,
      date: new Date().toISOString().slice(0, 10),
      openedAt: todaySales[todaySales.length - 1]?.date || new Date().toISOString(),
      closedAt: new Date().toISOString(),
      closedByUserId: currentUser.id,
      closedByUserName: currentUser.name,
      totalSalesUSD: reportTotals.totalSalesUSD,
      totalSalesLocal: reportTotals.totalSalesLocal,
      transactionsCount: reportTotals.transactionsCount,
      firstInvoice: reportTotals.firstInvoice,
      lastInvoice: reportTotals.lastInvoice,
      inflowsByGateway: reportTotals.inflowsByGateway,
      inflowsByBank: reportTotals.inflowsByBank,
      inflowsByUser: reportTotals.inflowsByUser,
      cashExpectedUSD: reportTotals.cashExpectedUSD,
      cashExpectedLocal: reportTotals.cashExpectedLocal
    };

    printThermalZReport(reportData, state.settings, true, thermalWidth);
  };

  // Submit and Print Reporte Z (Cierre Fiscal Definitivo)
  const handleExecuteReportZ = async () => {
    const countedUSD = parseFloat(countedCashUSD) || 0;
    const countedLocal = parseFloat(countedCashLocal) || 0;
    const countedTotalInUSD = countedUSD + (rate > 0 ? countedLocal / rate : 0);
    const expectedTotalInUSD = reportTotals.cashExpectedUSD + (rate > 0 ? reportTotals.cashExpectedLocal / rate : 0);
    const differenceUSD = countedTotalInUSD - expectedTotalInUSD;

    const zRecord = await saveZReport({
      date: new Date().toISOString().slice(0, 10),
      openedAt: todaySales[todaySales.length - 1]?.date || new Date().toISOString(),
      closedAt: new Date().toISOString(),
      closedByUserId: currentUser.id,
      closedByUserName: currentUser.name,
      totalSalesUSD: reportTotals.totalSalesUSD,
      totalSalesLocal: reportTotals.totalSalesLocal,
      transactionsCount: reportTotals.transactionsCount,
      firstInvoice: reportTotals.firstInvoice,
      lastInvoice: reportTotals.lastInvoice,
      inflowsByGateway: reportTotals.inflowsByGateway,
      inflowsByBank: reportTotals.inflowsByBank,
      inflowsByUser: reportTotals.inflowsByUser,
      cashExpectedUSD: reportTotals.cashExpectedUSD,
      cashExpectedLocal: reportTotals.cashExpectedLocal,
      cashCountedUSD: countedUSD,
      cashCountedLocal: countedLocal,
      cashDifferenceUSD: differenceUSD,
      notes: zReportNotes.trim()
    });

    setZSuccessMessage(`¡Cierre Z N° ${String(zRecord.zNumber).padStart(4, '0')} registrado y guardado exitosamente!`);
    printThermalZReport(zRecord, state.settings, false, thermalWidth);
    setCountedCashUSD('');
    setCountedCashLocal('');
    setZReportNotes('');
    setTimeout(() => setZSuccessMessage(null), 5000);
  };

  // General Metrics
  const totalSalesUSD = useMemo(() => filteredSales.reduce((acc, s) => acc + s.totalUSD, 0), [filteredSales]);
  const totalCostUSD = useMemo(() => {
    return filteredSales.reduce((acc, s) => {
      const saleCost = s.items.reduce((sum, item) => sum + (item.costUSD * item.quantity), 0);
      return acc + saleCost;
    }, 0);
  }, [filteredSales]);
  const grossProfitUSD = Math.max(0, totalSalesUSD - totalCostUSD);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>📊</span>
            <span>Auditoría de Caja & Reportes X / Z</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Cortes parciales en cualquier momento (Reporte X), Cierre fiscal diario (Reporte Z) e informe por usuario
          </p>
        </div>

        {/* Paper selector for thermal printing */}
        <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-2xl border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] self-start sm:self-auto">
          <span className="text-[10px] font-black uppercase text-slate-500 pl-1">Papel:</span>
          <button
            type="button"
            onClick={() => setThermalWidth('80mm')}
            className={`px-2.5 py-1 rounded-xl text-xs font-black transition-all cursor-pointer ${
              thermalWidth === '80mm'
                ? 'bg-slate-950 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            80 mm
          </button>
          <button
            type="button"
            onClick={() => setThermalWidth('58mm')}
            className={`px-2.5 py-1 rounded-xl text-xs font-black transition-all cursor-pointer ${
              thermalWidth === '58mm'
                ? 'bg-slate-950 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            58 mm
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white p-1.5 rounded-2xl border-2 border-slate-900 shadow-[3px_3px_0px_#0f172a] flex items-center gap-1.5 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('report_x')}
          className={`px-3.5 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'report_x'
              ? 'bg-amber-400 text-slate-950 shadow-[2px_2px_0px_#0f172a]'
              : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100'
          }`}
        >
          <Zap className="w-4 h-4 stroke-[2.5]" />
          <span>⚡ Reporte X (Corte en Vivo)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('report_z')}
          className={`px-3.5 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'report_z'
              ? 'bg-emerald-400 text-slate-950 shadow-[2px_2px_0px_#0f172a]'
              : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-4 h-4 stroke-[2.5]" />
          <span>📑 Reporte Z (Cierre Diario)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('users_audit')}
          className={`px-3.5 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'users_audit'
              ? 'bg-cyan-300 text-slate-950 shadow-[2px_2px_0px_#0f172a]'
              : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4 stroke-[2.5]" />
          <span>👥 Ventas por Usuario</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`px-3.5 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-slate-950 text-white shadow-[2px_2px_0px_#0f172a]'
              : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100'
          }`}
        >
          <BarChart3 className="w-4 h-4 stroke-[2.5]" />
          <span>📊 Resumen Histórico</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB: REPORTE X (CORTE PARCIAL EN VIVO EN CUALQUIER MOMENTO)                */}
      {/* ========================================================================= */}
      {activeTab === 'report_x' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          
          {/* Action Header Card */}
          <div className="bg-amber-50 p-5 rounded-3xl border-2 border-slate-900 shadow-[4px_4px_0px_#0f172a] flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-amber-400 text-slate-950 font-black rounded-md text-[11px] border border-slate-900">
                  CORTE X EN VIVO
                </span>
                <span className="text-xs text-slate-500 font-bold">
                  {new Date().toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-slate-950 mt-1">
                Arqueo Parcial de Caja (Reporte X)
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Audita en cualquier instante todas las entradas de dinero y ventas por usuario sin reiniciar los contadores.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* User filter */}
              <select
                value={selectedUserFilter}
                onChange={(e) => setSelectedUserFilter(e.target.value)}
                className="px-3 py-2.5 bg-white border-2 border-slate-900 rounded-xl text-xs font-black text-slate-900 focus:outline-none cursor-pointer"
              >
                <option value="all">👥 Todos los Cajeros</option>
                {usersList.map(u => (
                  <option key={u.id} value={u.id}>👤 {u.name}</option>
                ))}
              </select>

              <button
                type="button"
                onClick={handlePrintReportX}
                className="px-4 py-2.5 bg-slate-950 hover:bg-slate-800 text-white rounded-xl text-xs font-black shadow-[3px_3px_0px_#0f172a] active:translate-y-0.5 transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap"
              >
                <Printer className="w-4 h-4 text-amber-300" />
                <span>Imprimir Reporte X Térmico</span>
              </button>
            </div>
          </div>

          {/* Grand Totals KPI Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="bg-white p-4 rounded-2xl border-2 border-slate-900 shadow-[3px_3px_0px_#0f172a]">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                Total Facturado Hoy (USD)
              </span>
              <div className="text-2xl font-black text-slate-950 mt-1">
                {formatUSD(reportTotals.totalSalesUSD)}
              </div>
              <span className="text-xs font-black text-emerald-600 mt-0.5 block">
                {formatLocal(reportTotals.totalSalesLocal, currSymbol, currCode)}
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border-2 border-slate-900 shadow-[3px_3px_0px_#0f172a]">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                Efectivo Esperado en Gaveta
              </span>
              <div className="text-2xl font-black text-emerald-700 mt-1">
                {formatUSD(reportTotals.cashExpectedUSD)}
              </div>
              <span className="text-xs font-bold text-slate-600 mt-0.5 block">
                + {formatLocal(reportTotals.cashExpectedLocal, currSymbol, currCode)} en Bs.
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border-2 border-slate-900 shadow-[3px_3px_0px_#0f172a]">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                Transacciones Realizadas
              </span>
              <div className="text-2xl font-black text-slate-950 mt-1">
                {reportTotals.transactionsCount} tickets
              </div>
              <span className="text-[11px] font-bold text-slate-400 mt-0.5 block">
                Facturas: {reportTotals.firstInvoice} a {reportTotals.lastInvoice}
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border-2 border-slate-900 shadow-[3px_3px_0px_#0f172a]">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                Usuario que Consulta
              </span>
              <div className="text-base font-black text-slate-950 truncate mt-1">
                {currentUser.name}
              </div>
              <span className="text-[11px] font-black text-amber-600 uppercase mt-0.5 block">
                {currentUser.role} • PIN verificado
              </span>
            </div>
          </div>

          {/* Breakdown Sections Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            
            {/* 1. Money Inflows by Payment Gateway */}
            <div className="bg-white p-5 rounded-3xl border-2 border-slate-900 shadow-[4px_4px_0px_#0f172a] space-y-3">
              <div className="flex items-center justify-between border-b-2 border-slate-100 pb-2.5">
                <h4 className="font-black text-sm text-slate-900 flex items-center gap-2">
                  <span>💰</span>
                  <span>Entradas de Dinero por Forma de Pago</span>
                </h4>
                <span className="text-[10px] font-black uppercase text-slate-400">Total Operaciones</span>
              </div>

              <div className="space-y-2 text-xs">
                {Object.entries(reportTotals.inflowsByGateway).map(([key, data]) => {
                  return (
                    <div 
                      key={key}
                      className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between"
                    >
                      <div>
                        <span className="font-black text-slate-900 block">{data.name}</span>
                        <span className="text-[10px] text-slate-500 font-bold">{data.count} operaciones</span>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-slate-950 text-sm block">
                          {formatUSD(data.amountUSD)}
                        </span>
                        <span className="text-[10px] font-bold text-emerald-700">
                          {formatLocal(data.amountLocal, currSymbol, currCode)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. Inflows by Destination Bank & Cashiers */}
            <div className="space-y-5">
              {/* By Destination Bank */}
              <div className="bg-white p-5 rounded-3xl border-2 border-slate-900 shadow-[4px_4px_0px_#0f172a] space-y-3">
                <div className="flex items-center justify-between border-b-2 border-slate-100 pb-2.5">
                  <h4 className="font-black text-sm text-slate-900 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-cyan-600" />
                    <span>Ingresos por Banco Receptor</span>
                  </h4>
                  <span className="text-[10px] font-black uppercase text-slate-400">Pago Móvil y Transf.</span>
                </div>

                {Object.keys(reportTotals.inflowsByBank).length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-2">No se han registrado pagos bancarios hoy.</p>
                ) : (
                  <div className="space-y-2 text-xs">
                    {Object.entries(reportTotals.inflowsByBank).map(([bank, data]) => (
                      <div key={bank} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                        <div>
                          <span className="font-black text-slate-900">{bank}</span>
                          <span className="text-[10px] text-slate-500 block font-bold">{data.count} pagos recibidos</span>
                        </div>
                        <div className="text-right">
                          <span className="font-black text-slate-950 text-sm block">{formatUSD(data.amountUSD)}</span>
                          <span className="text-[10px] font-bold text-emerald-700">
                            {formatLocal(data.amountLocal, currSymbol, currCode)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* By Cashier / User */}
              <div className="bg-white p-5 rounded-3xl border-2 border-slate-900 shadow-[4px_4px_0px_#0f172a] space-y-3">
                <div className="flex items-center justify-between border-b-2 border-slate-100 pb-2.5">
                  <h4 className="font-black text-sm text-slate-900 flex items-center gap-2">
                    <Users className="w-4 h-4 text-indigo-600" />
                    <span>Rendimiento por Cajero Hoy</span>
                  </h4>
                  <span className="text-[10px] font-black uppercase text-slate-400">Cobros</span>
                </div>

                <div className="space-y-2 text-xs">
                  {Object.entries(reportTotals.inflowsByUser).map(([uid, udata]) => (
                    <div key={uid} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                      <div>
                        <div className="font-black text-slate-900 flex items-center gap-1.5">
                          <span>{udata.userName}</span>
                          <span className="px-1.5 py-0.2 bg-slate-200 text-slate-700 text-[9px] rounded font-bold uppercase">
                            {udata.role}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-bold">{udata.count} ventas realizadas</span>
                      </div>
                      <div className="text-right font-black text-slate-950 text-sm">
                        {formatUSD(udata.totalUSD)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: REPORTE Z (CIERRE FISCAL DEFINITIVO DEL DÍA)                          */}
      {/* ========================================================================= */}
      {activeTab === 'report_z' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          
          {zSuccessMessage && (
            <div className="p-4 bg-emerald-100 border-2 border-emerald-600 rounded-2xl text-xs font-black text-emerald-950 flex items-center gap-2 shadow-[2px_2px_0px_#0f172a]">
              <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
              <span>{zSuccessMessage}</span>
            </div>
          )}

          {/* Report Z Form Card */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border-2 border-slate-900 shadow-[4px_4px_0px_#0f172a] space-y-4">
            <div className="border-b-2 border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-emerald-400 text-slate-950 font-black rounded-md text-[11px] border border-slate-900">
                    CIERRE Z FINAL
                  </span>
                  <span className="text-xs text-slate-500 font-bold">
                    Consecutivo Próximo: Z-000{(state.zReports?.length || 0) + 1}
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-black text-slate-950 mt-1">
                  Cierre de Caja Definitivo del Día (Reporte Z)
                </h3>
                <p className="text-xs text-slate-500">
                  Realiza el arqueo físico de efectivo (gaveta), compara contra el sistema y emite el ticket fiscal Z
                </p>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-black uppercase text-slate-500 block">Total a Cerrar</span>
                <span className="text-2xl font-black text-slate-950">{formatUSD(reportTotals.totalSalesUSD)}</span>
              </div>
            </div>

            {/* Arqueo de Caja Físico */}
            <div className="p-4 bg-slate-50 rounded-2xl border-2 border-slate-900 space-y-3">
              <h4 className="font-black text-xs uppercase text-slate-800 tracking-wider flex items-center gap-2">
                <span>🧮</span>
                <span>Conteo Físico de Efectivo en Gaveta (Arqueo Manual)</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Efectivo Dólares Contado en Gaveta ($ USD):
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={countedCashUSD}
                      onChange={(e) => setCountedCashUSD(e.target.value)}
                      placeholder={`Esperado: ${reportTotals.cashExpectedUSD.toFixed(2)}`}
                      className="w-full pl-7 pr-3 py-2 bg-white border-2 border-slate-900 rounded-xl font-black text-slate-900 text-sm focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Efectivo Bolívares Contado en Gaveta (Bs.):
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={countedCashLocal}
                      onChange={(e) => setCountedCashLocal(e.target.value)}
                      placeholder={`Esperado: ${reportTotals.cashExpectedLocal.toFixed(2)}`}
                      className="w-full px-3 py-2 bg-white border-2 border-slate-900 rounded-xl font-black text-slate-900 text-sm focus:outline-none"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-700 font-bold mb-1">
                    Notas u Observaciones del Cierre de Turno:
                  </label>
                  <input
                    type="text"
                    value={zReportNotes}
                    onChange={(e) => setZReportNotes(e.target.value)}
                    placeholder="Ej: Cierre de turno tarde sin novedades, dinero entregado a gerencia..."
                    className="w-full px-3 py-2 bg-white border-2 border-slate-900 rounded-xl text-xs text-slate-900 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Submit & Print Z Button */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t-2 border-slate-100">
              <div className="text-xs text-slate-500 font-bold">
                Responsable del Cierre: <strong className="text-slate-900">{currentUser.name}</strong> ({currentUser.role})
              </div>

              <button
                type="button"
                onClick={handleExecuteReportZ}
                className="w-full sm:w-auto px-6 py-3 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black rounded-xl border-2 border-slate-900 shadow-[3px_3px_0px_#0f172a] active:translate-y-0.5 transition-all cursor-pointer flex items-center justify-center gap-2 text-xs sm:text-sm"
              >
                <Printer className="w-4 h-4 stroke-[2.5]" />
                <span>Generar, Guardar e Imprimir Reporte Z</span>
              </button>
            </div>
          </div>

          {/* Historical Z Reports List */}
          {state.zReports && state.zReports.length > 0 && (
            <div className="bg-white p-5 rounded-3xl border-2 border-slate-900 shadow-[4px_4px_0px_#0f172a] space-y-3">
              <h4 className="font-black text-sm text-slate-900 flex items-center gap-2 border-b-2 border-slate-100 pb-2.5">
                <span>📚</span>
                <span>Historial de Cierres Z Anteriores</span>
              </h4>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 border-b-2 border-slate-900 text-[10px] font-black uppercase text-slate-700">
                    <tr>
                      <th className="p-2.5">N° Z</th>
                      <th className="p-2.5">Fecha / Hora</th>
                      <th className="p-2.5">Responsable</th>
                      <th className="p-2.5 text-right">Ventas ($)</th>
                      <th className="p-2.5 text-center">Tickets</th>
                      <th className="p-2.5 text-center">Reimprimir</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {state.zReports.map((zr) => (
                      <tr key={zr.id} className="hover:bg-slate-50">
                        <td className="p-2.5 font-mono font-black text-slate-900">
                          Z-{String(zr.zNumber).padStart(4, '0')}
                        </td>
                        <td className="p-2.5">{zr.date} · {new Date(zr.closedAt).toLocaleTimeString()}</td>
                        <td className="p-2.5 font-bold text-slate-800">{zr.closedByUserName}</td>
                        <td className="p-2.5 text-right font-black text-slate-950">{formatUSD(zr.totalSalesUSD)}</td>
                        <td className="p-2.5 text-center font-bold">{zr.transactionsCount}</td>
                        <td className="p-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => printThermalZReport(zr, state.settings, false, thermalWidth)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-900 rounded-lg text-[11px] font-black text-slate-900 cursor-pointer"
                          >
                            Reimprimir
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: RENDIMIENTO POR USUARIO / CAJERO                                     */}
      {/* ========================================================================= */}
      {activeTab === 'users_audit' && (
        <div className="bg-white p-5 sm:p-6 rounded-3xl border-2 border-slate-900 shadow-[4px_4px_0px_#0f172a] space-y-4 animate-in fade-in duration-150">
          <div className="border-b-2 border-slate-100 pb-3">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              <span>Desempeño y Cobranza por Usuario del Sistema</span>
            </h3>
            <p className="text-xs text-slate-500">
              Control de ventas, tickets emitidos y formas de cobro por cada cajero
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {usersList.map((user) => {
              const userSales = state.sales.filter(s => s.cashierId === user.id);
              const totalUSD = userSales.reduce((acc, s) => acc + s.totalUSD, 0);

              return (
                <div key={user.id} className="p-4 bg-slate-50 rounded-2xl border-2 border-slate-900 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-black text-sm text-slate-950 block">{user.name}</span>
                      <span className="text-[10px] text-slate-500 font-bold uppercase">{user.role} • PIN: ••••</span>
                    </div>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-black text-xs">
                      {userSales.length} transacciones
                    </span>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                    <span className="text-xs font-bold text-slate-600">Total Recaudado:</span>
                    <span className="text-base font-black text-slate-950">{formatUSD(totalUSD)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: RESUMEN HISTÓRICO                                                    */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          {/* Date Filter Bar */}
          <div className="bg-white p-3 rounded-2xl border-2 border-slate-900 shadow-[3px_3px_0px_#0f172a] flex items-center justify-between gap-3">
            <span className="text-xs font-black uppercase text-slate-700 pl-2">Período:</span>
            <div className="flex items-center gap-1">
              {(['today', 'week', 'month', 'all'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setDateFilter(filter)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    dateFilter === filter
                      ? 'bg-slate-950 text-white shadow-[1px_1px_0px_#0f172a]'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {filter === 'today' ? 'Hoy' : filter === 'week' ? 'Semana' : filter === 'month' ? 'Mes' : 'Histórico Total'}
                </button>
              ))}
            </div>
          </div>

          {/* Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="bg-white p-4 rounded-2xl border-2 border-slate-900 shadow-[3px_3px_0px_#0f172a]">
              <span className="text-[10px] font-black uppercase text-slate-500 block">Ventas Totales</span>
              <div className="text-2xl font-black text-slate-950 mt-1">{formatUSD(totalSalesUSD)}</div>
            </div>
            <div className="bg-white p-4 rounded-2xl border-2 border-slate-900 shadow-[3px_3px_0px_#0f172a]">
              <span className="text-[10px] font-black uppercase text-slate-500 block">Costo de Mercancía</span>
              <div className="text-2xl font-black text-slate-700 mt-1">{formatUSD(totalCostUSD)}</div>
            </div>
            <div className="bg-white p-4 rounded-2xl border-2 border-slate-900 shadow-[3px_3px_0px_#0f172a]">
              <span className="text-[10px] font-black uppercase text-slate-500 block">Ganancia Bruta</span>
              <div className="text-2xl font-black text-emerald-700 mt-1">{formatUSD(grossProfitUSD)}</div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
