import React, { useState, useEffect } from 'react';
import { Customer, PaymentGatewayType, PaymentMethodEntry, Sale } from '../types';
import { useStore } from '../context/StoreContext';
import { 
  X, 
  DollarSign, 
  CreditCard, 
  Smartphone, 
  Building2, 
  Send, 
  Coins, 
  CheckCircle2, 
  AlertCircle, 
  Check, 
  Printer, 
  Plus, 
  Trash2 
} from 'lucide-react';
import { formatUSD, formatLocal } from '../utils/formatters';

interface CustomerAbonoModalProps {
  customer: Customer | null;
  isOpen: boolean;
  onClose: () => void;
  onAbonoCompleted?: (sale: Sale) => void;
}

interface PaymentRow {
  id: string;
  gateway: PaymentGatewayType;
  amountUSD: string;
  amountLocal: string;
  reference: string;
  bank: string;
}

const GATEWAY_OPTIONS: Array<{ type: PaymentGatewayType; label: string; icon: any; isCash: boolean }> = [
  { type: 'cash_usd', label: 'Efectivo $ (Dólares)', icon: DollarSign, isCash: true },
  { type: 'mobile_payment', label: 'Pago Móvil (Bs.)', icon: Smartphone, isCash: false },
  { type: 'card_terminal', label: 'Punto de Venta / Tarjeta', icon: CreditCard, isCash: false },
  { type: 'cash_local', label: 'Efectivo Bs.', icon: Coins, isCash: true },
  { type: 'bank_transfer', label: 'Transferencia Bancaria', icon: Building2, isCash: false },
  { type: 'zelle', label: 'Zelle ($)', icon: Send, isCash: false },
  { type: 'crypto_usdt', label: 'Binance Pay / USDT', icon: Coins, isCash: false },
];

export const CustomerAbonoModal: React.FC<CustomerAbonoModalProps> = ({
  customer,
  isOpen,
  onClose,
  onAbonoCompleted
}) => {
  const { state, recordCustomerPayment, currentUser } = useStore();
  const rate = state.settings.exchangeRate;
  const currSymbol = state.settings.secondaryCurrency.symbol;
  const currCode = state.settings.secondaryCurrency.code;

  const banksList = state.settings.configuredBanks && state.settings.configuredBanks.length > 0 
    ? state.settings.configuredBanks 
    : ['Banesco', 'Banco de Venezuela', 'Mercantil', 'BBVA Provincial', 'BNC', 'Bancaribe', 'Banplus', 'Otro'];

  // Rows for mixed payments
  const [paymentRows, setPaymentRows] = useState<PaymentRow[]>([]);
  const [notes, setNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Initialize with a single row covering the current debt or empty
  useEffect(() => {
    if (isOpen && customer) {
      setPaymentRows([
        {
          id: `row-${Date.now()}`,
          gateway: 'cash_usd',
          amountUSD: customer.currentDebtUSD.toFixed(2),
          amountLocal: (customer.currentDebtUSD * rate).toFixed(2),
          reference: '',
          bank: banksList[0] || 'Banesco'
        }
      ]);
      setNotes('');
      setErrorMessage(null);
    }
  }, [isOpen, customer, rate]);

  if (!isOpen || !customer) return null;

  const debtUSD = customer.currentDebtUSD;
  const debtLocal = debtUSD * rate;

  // Add a new payment method row
  const addRow = (gateway: PaymentGatewayType = 'mobile_payment') => {
    const currentTotalUSD = paymentRows.reduce((acc, r) => acc + (parseFloat(r.amountUSD) || 0), 0);
    const remaining = Math.max(0, debtUSD - currentTotalUSD);
    const newRow: PaymentRow = {
      id: `row-${Date.now()}-${Math.random()}`,
      gateway,
      amountUSD: remaining > 0 ? remaining.toFixed(2) : '0.00',
      amountLocal: remaining > 0 ? (remaining * rate).toFixed(2) : '0.00',
      reference: '',
      bank: banksList[0] || 'Banesco'
    };
    setPaymentRows([...paymentRows, newRow]);
  };

  const removeRow = (id: string) => {
    if (paymentRows.length <= 1) return;
    setPaymentRows(paymentRows.filter(r => r.id !== id));
  };

  const updateRow = (id: string, updates: Partial<PaymentRow>) => {
    setPaymentRows(prev => prev.map(r => {
      if (r.id !== id) return r;
      const updated = { ...r, ...updates };

      // Synchronize amountUSD and amountLocal if one changes
      if (updates.amountUSD !== undefined && updates.amountLocal === undefined) {
        const valUSD = parseFloat(updates.amountUSD);
        if (!isNaN(valUSD) && valUSD >= 0) {
          updated.amountLocal = (valUSD * rate).toFixed(2);
        } else if (updates.amountUSD === '') {
          updated.amountUSD = '';
          updated.amountLocal = '';
        }
      } else if (updates.amountLocal !== undefined && updates.amountUSD === undefined) {
        const valLocal = parseFloat(updates.amountLocal);
        if (!isNaN(valLocal) && valLocal >= 0 && rate > 0) {
          updated.amountUSD = (valLocal / rate).toFixed(2);
        } else if (updates.amountLocal === '') {
          updated.amountUSD = '';
          updated.amountLocal = '';
        }
      }

      return updated;
    }));
  };

  // Calculations
  const totalPayingUSD = paymentRows.reduce((acc, r) => acc + (parseFloat(r.amountUSD) || 0), 0);
  const totalPayingLocal = totalPayingUSD * rate;
  const remainingDebtUSD = Math.max(0, debtUSD - totalPayingUSD);
  const remainingDebtLocal = remainingDebtUSD * rate;

  const handleFullPayoff = () => {
    if (paymentRows.length === 1) {
      updateRow(paymentRows[0].id, {
        amountUSD: debtUSD.toFixed(2),
        amountLocal: debtLocal.toFixed(2)
      });
    } else {
      setPaymentRows([
        {
          id: `row-${Date.now()}`,
          gateway: 'cash_usd',
          amountUSD: debtUSD.toFixed(2),
          amountLocal: debtLocal.toFixed(2),
          reference: '',
          bank: banksList[0] || 'Banesco'
        }
      ]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (totalPayingUSD <= 0) {
      setErrorMessage('Debe ingresar un monto válido a abonar.');
      return;
    }

    // Validation: Non-cash payments MUST provide reference
    for (const row of paymentRows) {
      const valUSD = parseFloat(row.amountUSD) || 0;
      if (valUSD <= 0) continue;

      const opt = GATEWAY_OPTIONS.find(g => g.type === row.gateway);
      if (opt && !opt.isCash) {
        if (!row.reference || row.reference.trim().length === 0) {
          setErrorMessage(`Por favor ingrese el número de referencia para el pago con ${opt.label}.`);
          return;
        }
        if (!row.bank || row.bank.trim().length === 0) {
          setErrorMessage(`Por favor indique el banco de destino para el pago con ${opt.label}.`);
          return;
        }
      }
    }

    setIsProcessing(true);
    try {
      // Build PaymentMethodEntry array
      const entries: PaymentMethodEntry[] = paymentRows
        .filter(r => (parseFloat(r.amountUSD) || 0) > 0)
        .map(r => {
          const valUSD = parseFloat(r.amountUSD) || 0;
          const opt = GATEWAY_OPTIONS.find(g => g.type === r.gateway);
          return {
            gateway: r.gateway,
            gatewayName: opt ? opt.label : 'Pago',
            amountUSD: valUSD,
            amountLocal: valUSD * rate,
            reference: opt && !opt.isCash ? r.reference.trim() : undefined,
            bank: opt && !opt.isCash ? r.bank : undefined,
            notes: `Abono de fiado por ${customer.name}`
          };
        });

      const abonoSale = await recordCustomerPayment(
        customer.id,
        entries,
        notes.trim() || `Abono a cuenta de fiado por ${customer.name}. Cajero: ${currentUser.name}`
      );

      if (onAbonoCompleted) {
        onAbonoCompleted(abonoSale);
      }
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error procesando el abono');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-[6px_6px_0px_#0f172a] w-full max-w-xl overflow-hidden border-2 border-slate-900 flex flex-col max-h-[94vh]">
        
        {/* Header */}
        <div className="p-4 bg-slate-950 text-white flex justify-between items-center border-b-2 border-slate-900">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 border-2 border-slate-900 flex items-center justify-center font-black">
              💰
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base text-white leading-tight">
                Abono a Fiado / Cuenta Corriente
              </h3>
              <p className="text-[11px] text-amber-300 font-bold truncate max-w-[280px]">
                {customer.name} {customer.taxId ? `(${customer.taxId})` : ''}
              </p>
            </div>
          </div>

          <button 
            onClick={onClose} 
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center border-2 border-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4 stroke-[3]" />
          </button>
        </div>

        {/* Debt Summary Banner */}
        <div className="bg-rose-50 p-3.5 border-b-2 border-slate-900 flex items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-black uppercase text-rose-700 tracking-wider block">
              Deuda Pendiente Actual:
            </span>
            <div className="text-xl sm:text-2xl font-black text-rose-950 leading-tight">
              {formatUSD(debtUSD)}
            </div>
            <div className="text-[11px] text-rose-700 font-bold">
              ≈ {formatLocal(debtLocal, currSymbol, currCode)} (Tasa: 1$ = {rate.toFixed(2)} {currSymbol})
            </div>
          </div>

          <button
            type="button"
            onClick={handleFullPayoff}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white border-2 border-slate-900 rounded-xl text-xs font-black shadow-[2px_2px_0px_#0f172a] active:translate-y-0.5 transition-all cursor-pointer whitespace-nowrap"
          >
            Pagar Todo el Fiado
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {errorMessage && (
            <div className="p-3 bg-rose-100 border-2 border-rose-900 rounded-xl text-xs font-black text-rose-950 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Mixed Payment Rows Header */}
          <div className="flex items-center justify-between">
            <label className="text-xs font-black uppercase text-slate-800 tracking-wider">
              Desglose de Formas de Pago (Pago Mixto):
            </label>
            <button
              type="button"
              onClick={() => addRow('mobile_payment')}
              className="px-2.5 py-1 bg-cyan-100 hover:bg-cyan-200 text-slate-950 border-2 border-slate-900 rounded-lg text-xs font-black flex items-center gap-1 shadow-[1px_1px_0px_#0f172a] cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Agregar Método</span>
            </button>
          </div>

          {/* Payment Rows List */}
          <div className="space-y-3">
            {paymentRows.map((row, index) => {
              const opt = GATEWAY_OPTIONS.find(g => g.type === row.gateway);
              const isNonCash = opt && !opt.isCash;

              return (
                <div 
                  key={row.id}
                  className="bg-slate-50 p-3 rounded-2xl border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
                      Método #{index + 1}
                    </span>
                    {paymentRows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeRow(row.id)}
                        className="text-rose-600 hover:text-rose-800 p-1 cursor-pointer"
                        title="Eliminar este método"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Method & Amount Grid */}
                  {row.gateway === 'cash_local' ? (
                    /* ÁREA ESPECIALIZADA: EFECTIVO EN BOLÍVARES (CONTAR BS -> CONVIERTE A USD A LA DERECHA) */
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                      {/* Selector de Método */}
                      <div className="sm:col-span-4">
                        <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                          Forma de Pago:
                        </label>
                        <select
                          value={row.gateway}
                          onChange={(e) => updateRow(row.id, { gateway: e.target.value as PaymentGatewayType })}
                          className="w-full px-2.5 py-2 bg-white border-2 border-slate-900 rounded-xl text-xs font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer"
                        >
                          {GATEWAY_OPTIONS.map(g => (
                            <option key={g.type} value={g.type}>
                              {g.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Casilla 1 (Izquierda): Contar Efectivo en Bolívares */}
                      <div className="sm:col-span-4 bg-emerald-50/80 p-2 rounded-xl border-2 border-emerald-600">
                        <div className="flex items-center justify-between mb-0.5">
                          <label className="text-[10px] font-black text-emerald-950 uppercase flex items-center gap-1">
                            <span>💵</span>
                            <span>Efectivo Bs. Contado:</span>
                          </label>
                          {remainingDebtUSD > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                const currentOtherUSD = paymentRows
                                  .filter(r => r.id !== row.id)
                                  .reduce((acc, r) => acc + (parseFloat(r.amountUSD) || 0), 0);
                                const neededUSD = Math.max(0, debtUSD - currentOtherUSD);
                                const exactBs = (neededUSD * rate).toFixed(2);
                                updateRow(row.id, { amountLocal: exactBs });
                              }}
                              className="text-[9px] font-black text-emerald-800 bg-emerald-200/90 hover:bg-emerald-300 px-1 py-0.5 rounded border border-emerald-400 cursor-pointer"
                              title="Llenar con los Bolívares requeridos para cubrir la deuda"
                            >
                              + Resto en Bs.
                            </button>
                          )}
                        </div>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={row.amountLocal}
                            onChange={(e) => updateRow(row.id, { amountLocal: e.target.value })}
                            placeholder={`0.00 ${currSymbol}`}
                            className="w-full pl-3 pr-8 py-2 bg-white border-2 border-emerald-600 rounded-xl text-xs sm:text-sm font-black text-slate-950 focus:outline-none focus:ring-2 focus:ring-emerald-400 placeholder:text-slate-400"
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-emerald-800 font-black text-xs">
                            {currSymbol}
                          </span>
                        </div>
                      </div>

                      {/* Casilla 2 (A la derecha): Convierte automáticamente a Dólares y descuenta del monto final */}
                      <div className="sm:col-span-4 bg-amber-50/70 p-2 rounded-xl border-2 border-slate-900">
                        <div className="flex items-center justify-between mb-0.5">
                          <label className="text-[10px] font-black text-slate-800 uppercase flex items-center gap-1">
                            <span>➡️</span>
                            <span>Convierte a $ USD:</span>
                          </label>
                          {parseFloat(row.amountUSD) > 0 && (
                            <span className="text-[9px] font-black text-emerald-700 bg-emerald-100 px-1 py-0.5 rounded border border-emerald-300">
                              ✓ Descuenta fiado
                            </span>
                          )}
                        </div>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 font-black text-xs">$</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={row.amountUSD}
                            onChange={(e) => updateRow(row.id, { amountUSD: e.target.value })}
                            placeholder="0.00"
                            className="w-full pl-6 pr-2 py-2 bg-white border-2 border-slate-900 rounded-xl text-xs sm:text-sm font-black text-slate-950 focus:outline-none focus:ring-2 focus:ring-amber-400 placeholder:text-slate-400"
                          />
                        </div>
                        {parseFloat(row.amountUSD) > 0 && (
                          <div className="text-[10px] text-emerald-700 font-extrabold mt-0.5 truncate">
                            📉 Descuenta del monto final: -{formatUSD(parseFloat(row.amountUSD))}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* OTROS MÉTODOS (DÓLARES / DIGITALES) */
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                      {/* Method Selector */}
                      <div className="sm:col-span-5">
                        <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                          Forma de Pago:
                        </label>
                        <select
                          value={row.gateway}
                          onChange={(e) => updateRow(row.id, { gateway: e.target.value as PaymentGatewayType })}
                          className="w-full px-2.5 py-2 bg-white border-2 border-slate-900 rounded-xl text-xs font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer"
                        >
                          {GATEWAY_OPTIONS.map(g => (
                            <option key={g.type} value={g.type}>
                              {g.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Amount USD */}
                      <div className="sm:col-span-4">
                        <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                          Monto ($ USD):
                        </label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={row.amountUSD}
                            onChange={(e) => updateRow(row.id, { amountUSD: e.target.value })}
                            className="w-full pl-6 pr-2 py-2 bg-white border-2 border-slate-900 rounded-xl text-xs font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                          />
                        </div>
                      </div>

                      {/* Amount Local (Bs.) */}
                      <div className="sm:col-span-3">
                        <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                          Equivalente en {currCode}:
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={row.amountLocal}
                            onChange={(e) => updateRow(row.id, { amountLocal: e.target.value })}
                            className="w-full pl-2 pr-7 py-2 bg-slate-50 border-2 border-slate-900 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 font-black text-xs">{currSymbol}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Reference & Destination Bank for Non-Cash */}
                  {isNonCash && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1.5 border-t border-slate-200">
                      <div>
                        <label className="text-[10px] font-black text-slate-700 uppercase block mb-1">
                          N° Referencia / Comprobante: <span className="text-rose-600">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={row.reference}
                          onChange={(e) => updateRow(row.id, { reference: e.target.value })}
                          placeholder="Ej: 849201 o 4 últimos dígitos"
                          className="w-full px-3 py-1.5 bg-white border-2 border-slate-900 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400 placeholder:text-slate-400"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-black text-slate-700 uppercase block mb-1">
                          Banco de Destino: <span className="text-rose-600">*</span>
                        </label>
                        <select
                          value={row.bank}
                          onChange={(e) => updateRow(row.id, { bank: e.target.value })}
                          className="w-full px-3 py-1.5 bg-white border-2 border-slate-900 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer"
                        >
                          {banksList.map(b => (
                            <option key={b} value={b}>{b}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Quick Notes */}
          <div>
            <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
              Observaciones / Notas del Abono (Opcional):
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Abono parcial acordado por WhatsApp..."
              className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-900 rounded-xl text-xs text-slate-900 focus:outline-none focus:bg-white"
            />
          </div>

          {/* Summary Box */}
          <div className="p-3 bg-amber-50 border-2 border-slate-900 rounded-2xl space-y-1.5 text-xs">
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-700">Total a Abonar:</span>
              <span className="font-black text-slate-950 text-sm">
                {formatUSD(totalPayingUSD)} ({formatLocal(totalPayingLocal, currSymbol, currCode)})
              </span>
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-amber-200">
              <span className="font-bold text-slate-700">Deuda Restante:</span>
              <span className={`font-black text-sm ${remainingDebtUSD === 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                {remainingDebtUSD === 0 ? '¡DEUDA TOTALMENTE SALDADA! 🎉' : `${formatUSD(remainingDebtUSD)} (${formatLocal(remainingDebtLocal, currSymbol, currCode)})`}
              </span>
            </div>
            <div className="text-[10px] text-slate-500 pt-0.5">
              Cajero responsable: <strong className="text-slate-800">{currentUser.name}</strong> ({currentUser.role})
            </div>
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t-2 border-slate-900">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 border-2 border-slate-900 rounded-xl text-xs font-black text-slate-800 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isProcessing || totalPayingUSD <= 0}
              className="px-5 py-2.5 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 text-slate-950 border-2 border-slate-900 rounded-xl text-xs font-black shadow-[3px_3px_0px_#0f172a] active:translate-y-0.5 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>{isProcessing ? 'Procesando Abono...' : 'Confirmar e Imprimir Comprobante'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
