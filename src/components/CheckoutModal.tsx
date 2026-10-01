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
  UserCheck, 
  Check, 
  Shuffle, 
  AlertCircle 
} from 'lucide-react';
import { formatUSD, formatLocal } from '../utils/formatters';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  subtotalUSD: number;
  discountUSD: number;
  taxUSD: number;
  totalUSD: number;
  customer: Customer | null;
  cartItems: Array<{
    productId: string;
    productName: string;
    sku: string;
    quantity: number;
    unitPriceUSD: number;
    subtotalUSD: number;
    costUSD: number;
  }>;
  onSaleCompleted: (completedSale: Sale) => void;
}

interface GatewayConfig {
  type: PaymentGatewayType;
  name: string;
  icon: any;
  requiresRef?: boolean;
  requiresBank?: boolean;
}

const GATEWAY_DEFINITIONS: GatewayConfig[] = [
  { type: 'cash_usd', name: 'Efectivo $ (Dólares)', icon: DollarSign },
  { type: 'mobile_payment', name: 'Pago Móvil (Bs.)', icon: Smartphone, requiresRef: true, requiresBank: true },
  { type: 'card_terminal', name: 'Punto de Venta / Tarjeta', icon: CreditCard, requiresRef: true },
  { type: 'cash_local', name: 'Efectivo Bs.', icon: Coins },
  { type: 'zelle', name: 'Zelle ($)', icon: Send, requiresRef: true },
  { type: 'crypto_usdt', name: 'Binance Pay / USDT', icon: Coins, requiresRef: true },
  { type: 'bank_transfer', name: 'Transferencia Bancaria', icon: Building2, requiresRef: true, requiresBank: true },
  { type: 'credit', name: 'Fiado / Crédito', icon: UserCheck },
];

const VENEZUELAN_BANKS = [
  'Banesco', 'Banco de Venezuela', 'Mercantil', 'BBVA Provincial', 'Bancaribe', 'BNC', 'BOD', 'BFC', 'Banplus', 'Otro'
];

const QUICK_DENOMINATIONS = [1, 5, 10, 20, 50, 100];

interface MixedRowData {
  amountUSD: string;
  amountLocal: string;
  reference: string;
  bank: string;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  subtotalUSD,
  discountUSD,
  taxUSD,
  totalUSD,
  customer,
  cartItems,
  onSaleCompleted
}) => {
  const { state, addSale } = useStore();
  const rate = state.settings.exchangeRate;
  const currSymbol = state.settings.secondaryCurrency.symbol;
  const currCode = state.settings.secondaryCurrency.code;

  const totalLocal = totalUSD * rate;

  // Mode: 'single' (full 100% payment by clicked button) or 'mixed' (Cobro Mixto direct rows)
  const [checkoutMode, setCheckoutMode] = useState<'single' | 'mixed'>('single');

  // Single payment state
  const [activeSingleGateway, setActiveSingleGateway] = useState<PaymentGatewayType>('cash_usd');
  const [singleCashReceivedUSD, setSingleCashReceivedUSD] = useState<string>(totalUSD.toFixed(2));
  const [singleCashReceivedLocal, setSingleCashReceivedLocal] = useState<string>(totalLocal.toFixed(2));
  const [singleReference, setSingleReference] = useState('');
  const [singleBank, setSingleBank] = useState('Banesco');

  // Mixed payment state: direct row values for each payment method
  const [mixedRows, setMixedRows] = useState<Record<PaymentGatewayType, MixedRowData>>({
    cash_usd: { amountUSD: '', amountLocal: '', reference: '', bank: 'Banesco' },
    mobile_payment: { amountUSD: '', amountLocal: '', reference: '', bank: 'Banesco' },
    card_terminal: { amountUSD: '', amountLocal: '', reference: '', bank: 'Banesco' },
    cash_local: { amountUSD: '', amountLocal: '', reference: '', bank: 'Banesco' },
    zelle: { amountUSD: '', amountLocal: '', reference: '', bank: 'Banesco' },
    crypto_usdt: { amountUSD: '', amountLocal: '', reference: '', bank: 'Banesco' },
    bank_transfer: { amountUSD: '', amountLocal: '', reference: '', bank: 'Banesco' },
    paypal: { amountUSD: '', amountLocal: '', reference: '', bank: 'Banesco' },
    credit: { amountUSD: '', amountLocal: '', reference: '', bank: 'Banesco' },
  });

  const [isProcessing, setIsProcessing] = useState(false);

  // Reset when opening modal
  useEffect(() => {
    if (isOpen) {
      setCheckoutMode('single');
      setActiveSingleGateway('cash_usd');
      setSingleCashReceivedUSD(totalUSD.toFixed(2));
      setSingleCashReceivedLocal(totalLocal.toFixed(2));
      setSingleReference('');
      setSingleBank('Banesco');

      setMixedRows({
        cash_usd: { amountUSD: '', amountLocal: '', reference: '', bank: 'Banesco' },
        mobile_payment: { amountUSD: '', amountLocal: '', reference: '', bank: 'Banesco' },
        card_terminal: { amountUSD: '', amountLocal: '', reference: '', bank: 'Banesco' },
        cash_local: { amountUSD: '', amountLocal: '', reference: '', bank: 'Banesco' },
        zelle: { amountUSD: '', amountLocal: '', reference: '', bank: 'Banesco' },
        crypto_usdt: { amountUSD: '', amountLocal: '', reference: '', bank: 'Banesco' },
        bank_transfer: { amountUSD: '', amountLocal: '', reference: '', bank: 'Banesco' },
        paypal: { amountUSD: '', amountLocal: '', reference: '', bank: 'Banesco' },
        credit: { amountUSD: '', amountLocal: '', reference: '', bank: 'Banesco' },
      });
    }
  }, [isOpen, totalUSD, totalLocal]);

  if (!isOpen) return null;

  // Single payment calculations
  const singleReceivedUSDNum = parseFloat(singleCashReceivedUSD) || 0;
  const singleReceivedLocalNum = parseFloat(singleCashReceivedLocal) || 0;

  let singleChangeUSD = 0;
  let singleChangeLocal = 0;
  let isSingleValid = true;

  if (activeSingleGateway === 'cash_usd') {
    singleChangeUSD = Math.max(0, singleReceivedUSDNum - totalUSD);
    singleChangeLocal = singleChangeUSD * rate;
    isSingleValid = singleReceivedUSDNum >= totalUSD;
  } else if (activeSingleGateway === 'cash_local') {
    singleChangeLocal = Math.max(0, singleReceivedLocalNum - totalLocal);
    singleChangeUSD = rate > 0 ? singleChangeLocal / rate : 0;
    isSingleValid = singleReceivedLocalNum >= totalLocal;
  } else if (activeSingleGateway === 'credit') {
    if (!customer || customer.id === 'cus-1') {
      isSingleValid = false;
    } else if (customer.creditLimitUSD > 0 && (customer.currentDebtUSD + totalUSD > customer.creditLimitUSD)) {
      isSingleValid = false;
    }
  }

  // Mixed payment calculations (direct sum of all row inputs)
  const mixedCoveredUSD = Object.entries(mixedRows).reduce((acc, [_, data]) => {
    const val = parseFloat(data.amountUSD);
    return acc + (!isNaN(val) && val > 0 ? val : 0);
  }, 0);

  const mixedRemainingUSD = Math.max(0, totalUSD - mixedCoveredUSD);
  const mixedChangeUSD = Math.max(0, mixedCoveredUSD - totalUSD);
  const mixedChangeLocal = mixedChangeUSD * rate;
  const isMixedValid = mixedCoveredUSD >= totalUSD;

  const updateMixedRow = (type: PaymentGatewayType, field: keyof MixedRowData, value: string) => {
    setMixedRows(prev => {
      const current = prev[type] || { amountUSD: '', amountLocal: '', reference: '', bank: 'Banesco' };
      const updated = { ...current, [field]: value };

      // Automatic conversion: When entering amount in Bolívares (amountLocal), convert to USD immediately
      if (field === 'amountLocal') {
        const bs = parseFloat(value);
        if (!isNaN(bs) && bs >= 0 && rate > 0) {
          updated.amountUSD = (bs / rate).toFixed(2);
        } else if (value === '') {
          updated.amountUSD = '';
        }
      } 
      // Automatic conversion: When entering amount in USD (amountUSD), convert to Bolívares immediately
      else if (field === 'amountUSD') {
        const usd = parseFloat(value);
        if (!isNaN(usd) && usd >= 0 && rate > 0) {
          updated.amountLocal = (usd * rate).toFixed(2);
        } else if (value === '') {
          updated.amountLocal = '';
        }
      }

      return {
        ...prev,
        [type]: updated
      };
    });
  };

  const handleCompleteCheckout = async () => {
    let finalPayments: PaymentMethodEntry[] = [];
    let amountReceivedUSD = totalUSD;
    let changeGivenUSD = 0;
    let changeGivenLocal = 0;

    if (checkoutMode === 'single') {
      const def = GATEWAY_DEFINITIONS.find(d => d.type === activeSingleGateway)!;

      if (activeSingleGateway === 'cash_usd') {
        if (singleReceivedUSDNum < totalUSD) {
          alert('El monto en efectivo recibido es menor al total.');
          return;
        }
        amountReceivedUSD = singleReceivedUSDNum;
        changeGivenUSD = singleChangeUSD;
        changeGivenLocal = singleChangeLocal;
        finalPayments = [{
          gateway: 'cash_usd',
          gatewayName: def.name,
          amountUSD: totalUSD,
          amountLocal: totalLocal
        }];
      } else if (activeSingleGateway === 'cash_local') {
        if (singleReceivedLocalNum < totalLocal) {
          alert('El monto en efectivo recibido es menor al total en bolívares.');
          return;
        }
        amountReceivedUSD = rate > 0 ? singleReceivedLocalNum / rate : totalUSD;
        changeGivenUSD = singleChangeUSD;
        changeGivenLocal = singleChangeLocal;
        finalPayments = [{
          gateway: 'cash_local',
          gatewayName: def.name,
          amountUSD: totalUSD,
          amountLocal: totalLocal
        }];
      } else if (activeSingleGateway === 'credit') {
        if (!customer || customer.id === 'cus-1') {
          alert('Para otorgar fiado/crédito debe seleccionar un cliente registrado.');
          return;
        }
        if (customer.creditLimitUSD > 0 && (customer.currentDebtUSD + totalUSD > customer.creditLimitUSD)) {
          alert('El cliente supera su límite de crédito autorizado.');
          return;
        }
        finalPayments = [{
          gateway: 'credit',
          gatewayName: def.name,
          amountUSD: totalUSD,
          amountLocal: totalLocal
        }];
      } else {
        // Digital payment: 100% of the sale
        const singleEntry: PaymentMethodEntry = {
          gateway: activeSingleGateway,
          gatewayName: def.name,
          amountUSD: totalUSD,
          amountLocal: totalLocal
        };
        if (def.requiresRef && singleReference && singleReference.trim()) {
          singleEntry.reference = singleReference.trim();
        }
        if (def.requiresBank && singleBank && singleBank.trim()) {
          singleEntry.bank = singleBank.trim();
        }
        finalPayments = [singleEntry];
      }
    } else {
      // Mixed mode: collect all rows where amountUSD > 0
      const activeRows = Object.entries(mixedRows).filter(([_, data]) => {
        const val = parseFloat(data.amountUSD);
        return !isNaN(val) && val > 0;
      });

      if (activeRows.length === 0) {
        alert('Ingrese al menos un monto en alguna de las formas de pago del Cobro Mixto.');
        return;
      }

      if (mixedCoveredUSD < totalUSD) {
        alert(`Aún falta por cubrir ${formatUSD(mixedRemainingUSD)} para completar el total.`);
        return;
      }

      finalPayments = activeRows.map(([typeKey, data]) => {
        const gwType = typeKey as PaymentGatewayType;
        const def = GATEWAY_DEFINITIONS.find(d => d.type === gwType)!;
        const amtUSD = parseFloat(data.amountUSD);
        const parsedLocal = parseFloat(data.amountLocal);
        const amtLocal = !isNaN(parsedLocal) && parsedLocal > 0 ? parsedLocal : amtUSD * rate;
        const entry: PaymentMethodEntry = {
          gateway: gwType,
          gatewayName: def.name,
          amountUSD: amtUSD,
          amountLocal: amtLocal
        };
        if (def.requiresRef && data.reference && data.reference.trim()) {
          entry.reference = data.reference.trim();
        }
        if (def.requiresBank && data.bank && data.bank.trim()) {
          entry.bank = data.bank.trim();
        }
        return entry;
      });

      amountReceivedUSD = mixedCoveredUSD;
      changeGivenUSD = mixedChangeUSD;
      changeGivenLocal = mixedChangeLocal;
    }

    setIsProcessing(true);
    try {
      const completedSale = await addSale({
        date: new Date().toISOString(),
        customerId: customer?.id || '',
        customerName: customer ? customer.name : 'Cliente Casual (Venta Mostrador)',
        customerTaxId: customer?.taxId || '',
        items: cartItems.map(item => ({
          productId: item.productId,
          productName: item.productName,
          sku: item.sku,
          quantity: item.quantity,
          unitPriceUSD: item.unitPriceUSD,
          subtotalUSD: item.subtotalUSD,
          costUSD: item.costUSD
        })),
        subtotalUSD,
        discountUSD,
        taxUSD,
        totalUSD,
        totalLocal,
        exchangeRateUsed: rate,
        currencyCode: currCode,
        currencySymbol: currSymbol,
        paymentMethods: finalPayments,
        amountReceivedUSD,
        changeGivenUSD,
        changeGivenLocal,
        status: 'completed'
      });

      onSaleCompleted(completedSale);
      onClose();
    } catch (err) {
      console.error(err);
      alert('Ocurrió un error al registrar la venta');
    } finally {
      setIsProcessing(false);
    }
  };

  const activeSingleDef = GATEWAY_DEFINITIONS.find(d => d.type === activeSingleGateway)!;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-[6px_6px_0px_#0f172a] w-full max-w-3xl overflow-hidden border-2 border-slate-900 flex flex-col max-h-[94vh]">
        
        {/* Header */}
        <div className="bg-slate-950 text-white p-4 sm:p-5 flex justify-between items-center border-b-2 border-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400 border-2 border-slate-900 flex items-center justify-center text-slate-950 font-black shadow-[2px_2px_0px_#f59e0b]">
              💵
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg text-white leading-tight">Cobrar Venta en Caja</h3>
              <p className="text-xs text-slate-400 font-medium">
                Cliente: <span className="text-amber-300 font-bold">{customer ? customer.name : 'Cliente Ocasional'}</span>
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

        {/* Total Summary Banner */}
        <div className="bg-amber-300 border-b-2 border-slate-900 p-4 sm:px-6 flex flex-wrap items-center justify-between gap-3 text-slate-950">
          <div>
            <span className="text-[11px] font-black uppercase tracking-wider block text-slate-800">
              Total a Pagar
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-950 leading-none">
                {formatUSD(totalUSD)}
              </span>
              <span className="text-sm sm:text-base font-extrabold text-slate-800">
                / {formatLocal(totalLocal, currSymbol, currCode)}
              </span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-slate-800 font-black uppercase block">Tasa del día:</span>
            <span className="text-xs font-black text-slate-950 bg-white px-2.5 py-1 rounded-lg border-2 border-slate-900 shadow-[1px_1px_0px_#0f172a]">
              1 $ = {rate.toFixed(2)} {currSymbol}
            </span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          
          {/* BOTONES PRINCIPALES DE SELECCIÓN */}
          <div>
            <label className="block text-xs font-black text-slate-900 uppercase tracking-wider mb-2">
              Selecciona Forma de Pago:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              
              {/* Botones de Pago Único (El pago se hace 100% por este botón) */}
              {GATEWAY_DEFINITIONS.map(gw => {
                const Icon = gw.icon;
                const isSelected = checkoutMode === 'single' && activeSingleGateway === gw.type;
                return (
                  <button
                    key={gw.type}
                    type="button"
                    onClick={() => {
                      setCheckoutMode('single');
                      setActiveSingleGateway(gw.type);
                    }}
                    className={`p-2.5 rounded-xl border-2 text-left transition-all flex flex-col justify-between h-20 cursor-pointer ${
                      isSelected
                        ? 'border-slate-950 bg-slate-950 text-white shadow-[2px_2px_0px_#0f172a] -translate-y-0.5'
                        : 'border-slate-300 bg-white hover:border-slate-950 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <Icon className={`w-5 h-5 ${isSelected ? 'text-amber-300' : 'text-slate-600'}`} />
                      {isSelected && <span className="text-xs">✓</span>}
                    </div>
                    <span className="text-xs font-black leading-tight line-clamp-2">
                      {gw.name}
                    </span>
                  </button>
                );
              })}

              {/* BOTÓN ESPECÍFICO DE COBRO MIXTO */}
              <button
                type="button"
                onClick={() => setCheckoutMode('mixed')}
                className={`p-2.5 rounded-xl border-2 text-left transition-all flex flex-col justify-between h-20 cursor-pointer ${
                  checkoutMode === 'mixed'
                    ? 'border-purple-600 bg-purple-950 text-white shadow-[2px_2px_0px_#7e22ce] -translate-y-0.5'
                    : 'border-purple-400 bg-purple-50 hover:bg-purple-100 hover:border-purple-600 text-purple-950 shadow-[1px_1px_0px_#7e22ce]'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <Shuffle className={`w-5 h-5 ${checkoutMode === 'mixed' ? 'text-purple-300' : 'text-purple-700'}`} />
                  {checkoutMode === 'mixed' && <span className="text-xs">✓</span>}
                </div>
                <div>
                  <span className="text-xs font-black leading-tight block">
                    🔀 Cobro Mixto
                  </span>
                  <span className="text-[10px] font-bold text-purple-600 block leading-none">
                    (Dividir Pago)
                  </span>
                </div>
              </button>

            </div>
          </div>

          {/* ========================================================================= */}
          {/* CASO A: MODO PAGO ÚNICO (SOLO SEGÚN ESE BOTÓN)                            */}
          {/* ========================================================================= */}
          {checkoutMode === 'single' && (
            <div className="space-y-4">
              <div className="bg-slate-50 border-2 border-slate-900 rounded-2xl p-4 space-y-3 shadow-[2px_2px_0px_#0f172a]">
                
                <div className="flex items-center justify-between border-b-2 border-slate-200 pb-2">
                  <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                    <span>Pago total con:</span>
                    <span className="text-emerald-700 font-extrabold underline">{activeSingleDef.name}</span>
                  </span>
                  <span className="text-xs font-black text-slate-800 bg-slate-200 px-2.5 py-0.5 rounded-md">
                    100% de la venta
                  </span>
                </div>

                {/* Sub-caso 1: Efectivo en Dólares ($) */}
                {activeSingleGateway === 'cash_usd' && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                        Billetes recibidos / Monto Rápido:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {QUICK_DENOMINATIONS.map(d => (
                          <button
                            key={d}
                            type="button"
                            onClick={() => {
                              setSingleCashReceivedUSD(d.toFixed(2));
                              setSingleCashReceivedLocal((d * rate).toFixed(2));
                            }}
                            className="px-2.5 py-1 bg-white hover:bg-amber-100 border-2 border-slate-900 rounded-lg text-xs font-black text-slate-900 shadow-[1px_1px_0px_#0f172a] active:translate-y-0.5 cursor-pointer transition-all"
                          >
                            ${d}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            setSingleCashReceivedUSD(totalUSD.toFixed(2));
                            setSingleCashReceivedLocal(totalLocal.toFixed(2));
                          }}
                          className="px-3 py-1 bg-emerald-400 hover:bg-emerald-300 border-2 border-slate-900 rounded-lg text-xs font-black text-slate-950 shadow-[1px_1px_0px_#0f172a] active:translate-y-0.5 cursor-pointer transition-all ml-auto"
                        >
                          Monto Exacto (${totalUSD.toFixed(2)})
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-black text-slate-700 uppercase block mb-1">
                          Monto Recibido ($ USD):
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={singleCashReceivedUSD}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSingleCashReceivedUSD(val);
                              const num = parseFloat(val);
                              if (!isNaN(num)) {
                                setSingleCashReceivedLocal((num * rate).toFixed(2));
                              }
                            }}
                            className="w-full pl-7 pr-3 py-2 bg-white border-2 border-slate-900 rounded-xl text-sm font-black text-slate-950 focus:outline-none focus:ring-2 focus:ring-amber-400"
                          />
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 font-black">$</span>
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-black text-slate-700 uppercase block mb-1">
                          Equivalente en {currCode} ({currSymbol}):
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            readOnly
                            value={singleCashReceivedLocal}
                            className="w-full pl-3 pr-8 py-2 bg-slate-100 border-2 border-slate-300 rounded-xl text-sm font-bold text-slate-700 cursor-not-allowed"
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 font-black text-xs">{currSymbol}</span>
                        </div>
                      </div>
                    </div>

                    {singleChangeUSD > 0 && (
                      <div className="p-3 bg-emerald-400 text-slate-950 rounded-xl border-2 border-slate-900 flex justify-between items-center font-black">
                        <span className="flex items-center gap-1.5 text-xs">
                          <span>🪙</span>
                          <span>VUELTO / CAMBIO A ENTREGAR:</span>
                        </span>
                        <span className="text-base sm:text-lg">
                          {formatUSD(singleChangeUSD)} <span className="text-xs">({formatLocal(singleChangeLocal, currSymbol, currCode)})</span>
                        </span>
                      </div>
                    )}

                    {singleReceivedUSDNum < totalUSD && (
                      <div className="p-2.5 bg-rose-100 text-rose-950 rounded-xl border-2 border-rose-300 text-xs font-black flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                        <span>Falta por recibir: {formatUSD(totalUSD - singleReceivedUSDNum)}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Sub-caso 2: Efectivo en Moneda Local (Bs.) */}
                {activeSingleGateway === 'cash_local' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-black text-slate-700 uppercase block mb-1">
                          Monto Recibido en {currCode} ({currSymbol}):
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.01"
                            value={singleCashReceivedLocal}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSingleCashReceivedLocal(val);
                              const num = parseFloat(val);
                              if (!isNaN(num) && rate > 0) {
                                setSingleCashReceivedUSD((num / rate).toFixed(2));
                              }
                            }}
                            className="w-full pl-3 pr-8 py-2 bg-white border-2 border-slate-900 rounded-xl text-sm font-black text-slate-950 focus:outline-none focus:ring-2 focus:ring-amber-400"
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 font-black text-xs">{currSymbol}</span>
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-black text-slate-700 uppercase block mb-1">
                          Total Exacto a Pagar:
                        </label>
                        <div className="px-3 py-2 bg-slate-100 border-2 border-slate-300 rounded-xl text-sm font-bold text-slate-800">
                          {formatLocal(totalLocal, currSymbol, currCode)} ({formatUSD(totalUSD)})
                        </div>
                      </div>
                    </div>

                    {singleChangeLocal > 0 && (
                      <div className="p-3 bg-emerald-400 text-slate-950 rounded-xl border-2 border-slate-900 flex justify-between items-center font-black">
                        <span className="flex items-center gap-1.5 text-xs">
                          <span>🪙</span>
                          <span>VUELTO A ENTREGAR EN {currCode}:</span>
                        </span>
                        <span className="text-base sm:text-lg">
                          {formatLocal(singleChangeLocal, currSymbol, currCode)}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Sub-caso 3: Métodos Digitales */}
                {activeSingleGateway !== 'cash_usd' && activeSingleGateway !== 'cash_local' && activeSingleGateway !== 'credit' && (
                  <div className="space-y-3">
                    <div className="p-2.5 bg-cyan-50 border-2 border-cyan-200 rounded-xl text-xs font-bold text-cyan-950 flex justify-between items-center">
                      <span>Monto Total a Procesar:</span>
                      <span className="text-sm font-black">
                        {activeSingleGateway === 'zelle' || activeSingleGateway === 'crypto_usdt'
                          ? formatUSD(totalUSD)
                          : `${formatLocal(totalLocal, currSymbol, currCode)} (${formatUSD(totalUSD)})`}
                      </span>
                    </div>

                    {activeSingleDef.requiresBank && (
                      <div>
                        <label className="text-[10px] font-black text-slate-700 uppercase block mb-1">
                          Banco Receptor / Emisor:
                        </label>
                        <select
                          value={singleBank}
                          onChange={(e) => setSingleBank(e.target.value)}
                          className="w-full px-3 py-2 bg-white border-2 border-slate-900 rounded-xl text-xs font-bold text-slate-900 cursor-pointer"
                        >
                          {VENEZUELAN_BANKS.map(b => (
                            <option key={b} value={b}>{b}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {activeSingleDef.requiresRef && (
                      <div>
                        <label className="text-[10px] font-black text-slate-700 uppercase block mb-1">
                          N° de Referencia / Comprobante (opcional):
                        </label>
                        <input
                          type="text"
                          placeholder="Ej: 9812401 o últimos 4 dígitos"
                          value={singleReference}
                          onChange={(e) => setSingleReference(e.target.value)}
                          className="w-full px-3 py-2 bg-white border-2 border-slate-900 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Sub-caso 4: Fiado / Crédito */}
                {activeSingleGateway === 'credit' && (
                  <div className="space-y-2">
                    <div className="p-3 bg-rose-50 border-2 border-rose-300 rounded-xl text-xs font-bold text-rose-950 space-y-1">
                      <div className="flex justify-between items-center">
                        <span>Total a cargar como cuenta por cobrar:</span>
                        <span className="text-sm font-black">{formatUSD(totalUSD)}</span>
                      </div>
                      {customer ? (
                        <div className="text-[11px] text-slate-600 pt-1 border-t border-rose-200">
                          Cliente: <strong>{customer.name}</strong> (Deuda previa: ${customer.currentDebtUSD.toFixed(2)})
                        </div>
                      ) : (
                        <div className="text-rose-700 font-black">
                          ⚠️ Debe seleccionar un cliente registrado para poder fiar.
                        </div>
                      )}
                    </div>
                  </div>
                )}

              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* CASO B: MODO COBRO MIXTO DIRECTO (BOTÓN A LA IZQ + CAMPOS AL LADO)        */}
          {/* ========================================================================= */}
          {checkoutMode === 'mixed' && (
            <div className="space-y-3">
              
              {/* Encabezado del modo mixto */}
              <div className="p-3 bg-purple-50 border-2 border-purple-300 rounded-2xl flex items-center justify-between gap-2 text-xs">
                <div>
                  <span className="font-black text-purple-950 block">MODO COBRO MIXTO (DIRECTO)</span>
                  <span className="text-[11px] text-purple-800">
                    Introduce el monto en los métodos que el cliente desee utilizar hasta cubrir {formatUSD(totalUSD)}.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setCheckoutMode('single')}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 border-2 border-purple-400 text-purple-950 rounded-lg text-[11px] font-black cursor-pointer"
                >
                  Volver a Pago Único
                </button>
              </div>

              {/* LISTA DE FILAS DE COBRO MIXTO */}
              <div className="space-y-2">
                {GATEWAY_DEFINITIONS.map(gw => {
                  const Icon = gw.icon;
                  const rowData = mixedRows[gw.type];
                  const numVal = parseFloat(rowData.amountUSD) || 0;
                  const hasAmount = numVal > 0;

                  return (
                    <div 
                      key={gw.type}
                      className={`p-2.5 rounded-2xl border-2 transition-all ${
                        hasAmount 
                          ? 'bg-purple-50/70 border-purple-700 shadow-[2px_2px_0px_#7e22ce]' 
                          : 'bg-white border-slate-300 hover:border-slate-500'
                      }`}
                    >
                      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2">
                        
                        {/* 1. Botón / Identificador del Método a la Izquierda */}
                        <div className="w-full md:w-44 flex-shrink-0 flex items-center justify-between p-2 rounded-xl bg-slate-100 border-2 border-slate-900">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Icon className={`w-4 h-4 flex-shrink-0 ${hasAmount ? 'text-purple-700' : 'text-slate-700'}`} />
                            <span className="text-xs font-black text-slate-900 truncate">{gw.name}</span>
                          </div>

                          {/* Botón rápido "+ Resto" para completar saldo en 1 toque */}
                          {mixedRemainingUSD > 0 && !hasAmount && (
                            <button
                              type="button"
                              onClick={() => {
                                if (gw.type === 'cash_local') {
                                  const exactBs = (mixedRemainingUSD * rate).toFixed(2);
                                  updateMixedRow('cash_local', 'amountLocal', exactBs);
                                } else {
                                  updateMixedRow(gw.type, 'amountUSD', mixedRemainingUSD.toFixed(2));
                                }
                              }}
                              className="text-[10px] font-black bg-purple-200 hover:bg-purple-300 text-purple-950 px-1.5 py-0.5 rounded border border-purple-400 cursor-pointer ml-1"
                              title="Poner el resto de la cuenta en este método"
                            >
                              + Resto
                            </button>
                          )}
                        </div>

                        {/* 2. ÁREA ESPECIALIZADA: EFECTIVO EN BOLÍVARES (CONTAR BS -> CONVIERTE A USD A LA DERECHA) */}
                        {gw.type === 'cash_local' ? (
                          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 bg-emerald-50/70 p-2 rounded-xl border-2 border-emerald-500/70">
                            {/* Casilla 1 (Izquierda): Contar Efectivo en Bolívares */}
                            <div>
                              <div className="flex items-center justify-between mb-0.5">
                                <label className="text-[10px] font-black text-emerald-950 uppercase flex items-center gap-1">
                                  <span>💵</span>
                                  <span>Efectivo Bs. Contado:</span>
                                </label>
                                {mixedRemainingUSD > 0 && !hasAmount && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const exactBs = (mixedRemainingUSD * rate).toFixed(2);
                                      updateMixedRow('cash_local', 'amountLocal', exactBs);
                                    }}
                                    className="text-[9px] font-black text-emerald-800 bg-emerald-200/90 hover:bg-emerald-300 px-1.5 py-0.5 rounded border border-emerald-400 cursor-pointer"
                                    title="Llenar con los Bolívares exactos restantes"
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
                                  value={rowData.amountLocal}
                                  onChange={(e) => updateMixedRow('cash_local', 'amountLocal', e.target.value)}
                                  placeholder={`0.00 ${currSymbol}`}
                                  className="w-full pl-3 pr-8 py-2 bg-white border-2 border-emerald-600 rounded-xl text-xs sm:text-sm font-black text-slate-950 focus:outline-none focus:ring-2 focus:ring-emerald-400 placeholder:text-slate-400"
                                />
                                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-emerald-800 font-black text-xs">
                                  {currSymbol}
                                </span>
                              </div>
                            </div>

                            {/* Casilla 2 (A la derecha): Convierte automáticamente a Dólares y descuenta del monto final */}
                            <div>
                              <div className="flex items-center justify-between mb-0.5">
                                <label className="text-[10px] font-black text-slate-800 uppercase flex items-center gap-1">
                                  <span>➡️</span>
                                  <span>Convierte a $ USD:</span>
                                </label>
                                {hasAmount && (
                                  <span className="text-[9px] font-black text-emerald-700 bg-emerald-100 px-1 py-0.5 rounded border border-emerald-300">
                                    ✓ Descontado del final
                                  </span>
                                )}
                              </div>
                              <div className="relative">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 font-black text-xs">$</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={rowData.amountUSD}
                                  onChange={(e) => updateMixedRow('cash_local', 'amountUSD', e.target.value)}
                                  placeholder="0.00"
                                  className="w-full pl-6 pr-2 py-2 bg-amber-50/70 border-2 border-slate-900 rounded-xl text-xs sm:text-sm font-black text-slate-950 focus:outline-none focus:ring-2 focus:ring-amber-400 placeholder:text-slate-400"
                                />
                              </div>
                              {hasAmount && (
                                <div className="text-[10px] text-emerald-700 font-extrabold mt-0.5 truncate flex items-center gap-1">
                                  <span>📉 Descuenta del total:</span>
                                  <strong>-{formatUSD(numVal)}</strong>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : gw.type === 'mobile_payment' ? (
                          /* ÁREA DE PAGO MÓVIL: ENTRADA EN BS O DÓLARES CON REFERENCIA Y BANCO */
                          <div className="flex-1 flex flex-col md:flex-row items-stretch md:items-center gap-2">
                            <div className="w-full md:w-32 flex-shrink-0">
                              <label className="text-[9px] font-bold text-slate-500 uppercase block md:hidden mb-0.5">
                                Monto en {currCode} ({currSymbol}):
                              </label>
                              <div className="relative">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={rowData.amountLocal}
                                  onChange={(e) => updateMixedRow(gw.type, 'amountLocal', e.target.value)}
                                  placeholder={`Monto en ${currSymbol}`}
                                  className="w-full pl-2.5 pr-7 py-2 bg-white border-2 border-slate-900 rounded-xl text-xs sm:text-sm font-black text-slate-950 focus:outline-none focus:ring-2 focus:ring-purple-400 placeholder:text-slate-400"
                                />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 font-black text-xs">{currSymbol}</span>
                              </div>
                            </div>

                            <div className="w-full md:w-28 flex-shrink-0">
                              <label className="text-[9px] font-bold text-slate-500 uppercase block md:hidden mb-0.5">
                                Monto en Dólares ($):
                              </label>
                              <div className="relative">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 font-black text-xs">$</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={rowData.amountUSD}
                                  onChange={(e) => updateMixedRow(gw.type, 'amountUSD', e.target.value)}
                                  placeholder="0.00 $"
                                  className="w-full pl-6 pr-2 py-2 bg-white border-2 border-slate-900 rounded-xl text-xs sm:text-sm font-black text-slate-950 focus:outline-none focus:ring-2 focus:ring-purple-400"
                                />
                              </div>
                            </div>

                            <div className="flex-1 min-w-[120px]">
                              <input
                                type="text"
                                value={rowData.reference}
                                onChange={(e) => updateMixedRow(gw.type, 'reference', e.target.value)}
                                placeholder="N° Referencia Pago Móvil"
                                className="w-full px-2.5 py-2 bg-white border-2 border-slate-900 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-400"
                              />
                            </div>

                            <div className="w-full md:w-36 flex-shrink-0">
                              <select
                                value={rowData.bank}
                                onChange={(e) => updateMixedRow(gw.type, 'bank', e.target.value)}
                                className="w-full px-2 py-2 bg-white border-2 border-slate-900 rounded-xl text-xs font-bold text-slate-900 cursor-pointer"
                              >
                                {VENEZUELAN_BANKS.map(b => (
                                  <option key={b} value={b}>{b}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        ) : (
                          /* MÉTODOS ESTÁNDAR */
                          <div className="flex-1 flex flex-col md:flex-row items-stretch md:items-center gap-2">
                            <div className="w-full md:w-36 flex-shrink-0">
                              <div className="relative">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 font-black text-xs">$</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={rowData.amountUSD}
                                  onChange={(e) => updateMixedRow(gw.type, 'amountUSD', e.target.value)}
                                  placeholder="0.00"
                                  className="w-full pl-6 pr-2 py-2 bg-white border-2 border-slate-900 rounded-xl text-xs sm:text-sm font-black text-slate-950 focus:outline-none focus:ring-2 focus:ring-purple-400"
                                />
                              </div>
                              {hasAmount && (
                                <div className="text-[10px] text-emerald-700 font-bold mt-0.5 truncate">
                                  = {formatLocal(numVal * rate, currSymbol, currCode)}
                                </div>
                              )}
                            </div>

                            {gw.requiresRef ? (
                              <div className="flex-1 min-w-[130px]">
                                <input
                                  type="text"
                                  value={rowData.reference}
                                  onChange={(e) => updateMixedRow(gw.type, 'reference', e.target.value)}
                                  placeholder="N° Referencia / Lote"
                                  className="w-full px-2.5 py-2 bg-white border-2 border-slate-900 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-400"
                                />
                              </div>
                            ) : (
                              <div className="hidden md:block flex-1" />
                            )}

                            {gw.requiresBank && (
                              <div className="w-full md:w-36 flex-shrink-0">
                                <select
                                  value={rowData.bank}
                                  onChange={(e) => updateMixedRow(gw.type, 'bank', e.target.value)}
                                  className="w-full px-2 py-2 bg-white border-2 border-slate-900 rounded-xl text-xs font-bold text-slate-900 cursor-pointer"
                                >
                                  {VENEZUELAN_BANKS.map(b => (
                                    <option key={b} value={b}>{b}</option>
                                  ))}
                                </select>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Botón para borrar monto si tiene valor */}
                        {hasAmount && (
                          <button
                            type="button"
                            onClick={() => {
                              updateMixedRow(gw.type, 'amountUSD', '');
                              updateMixedRow(gw.type, 'amountLocal', '');
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors self-end md:self-center"
                            title="Quitar este monto"
                          >
                            <X className="w-4 h-4 stroke-[3]" />
                          </button>
                        )}

                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Totales y Saldo del Cobro Mixto */}
              <div className="bg-slate-950 text-white rounded-2xl p-4 space-y-2 border-2 border-slate-900 mt-3">
                <div className="flex justify-between text-xs text-slate-300 font-bold">
                  <span>Total cubierto con Cobro Mixto:</span>
                  <span className="text-white font-black text-sm">
                    {formatUSD(mixedCoveredUSD)} ({formatLocal(mixedCoveredUSD * rate, currSymbol, currCode)})
                  </span>
                </div>

                {mixedChangeUSD > 0 && (
                  <div className="p-3 bg-emerald-400 text-slate-950 rounded-xl border-2 border-slate-900 flex justify-between items-center font-black mt-2">
                    <span className="flex items-center gap-1.5 text-xs">
                      <span>🪙</span>
                      <span>VUELTO A ENTREGAR:</span>
                    </span>
                    <span className="text-base sm:text-lg">
                      {formatUSD(mixedChangeUSD)} <span className="text-xs">({formatLocal(mixedChangeLocal, currSymbol, currCode)})</span>
                    </span>
                  </div>
                )}

                {mixedRemainingUSD > 0 && (
                  <div className="flex justify-between items-center text-xs font-black text-rose-400 pt-1 border-t border-slate-800">
                    <span>Falta por cubrir:</span>
                    <span>{formatUSD(mixedRemainingUSD)} ({formatLocal(mixedRemainingUSD * rate, currSymbol, currCode)})</span>
                  </div>
                )}
              </div>

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-100 border-t-2 border-slate-900 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 border-2 border-slate-900 text-slate-800 font-black rounded-xl hover:bg-white text-xs sm:text-sm transition-all cursor-pointer"
          >
            Regresar al Carrito
          </button>

          <button
            type="button"
            onClick={handleCompleteCheckout}
            disabled={isProcessing || (checkoutMode === 'single' ? !isSingleValid : !isMixedValid)}
            className="px-6 py-2.5 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-40 disabled:hover:bg-emerald-400 text-slate-950 font-black rounded-xl border-2 border-slate-900 shadow-[3px_3px_0px_#0f172a] active:translate-y-0.5 text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>
              {isProcessing 
                ? 'Registrando...' 
                : checkoutMode === 'single'
                ? `Pagar 100% con ${activeSingleDef.name}`
                : 'Finalizar Cobro Mixto e Imprimir'}
            </span>
          </button>
        </div>

      </div>
    </div>
  );
};
