import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  currency: 'VES' | 'USD';
  requiresRef?: boolean;
  requiresBank?: boolean;
}

const GATEWAY_DEFINITIONS: GatewayConfig[] = [
  { type: 'card_terminal', name: 'Tarjeta de Débito / Punto', icon: CreditCard, currency: 'VES', requiresRef: true },
  { type: 'mobile_payment', name: 'Pago Móvil (Bs.)', icon: Smartphone, currency: 'VES', requiresRef: true, requiresBank: true },
  { type: 'cash_usd', name: 'Efectivo $ (Dólares)', icon: DollarSign, currency: 'USD' },
  { type: 'cash_local', name: 'Efectivo Bs. (Contado)', icon: Coins, currency: 'VES' },
  { type: 'bank_transfer', name: 'Transferencia Bancaria', icon: Building2, currency: 'VES', requiresRef: true, requiresBank: true },
  { type: 'zelle', name: 'Zelle ($)', icon: Send, currency: 'USD', requiresRef: true },
  { type: 'crypto_usdt', name: 'Binance Pay / USDT', icon: Coins, currency: 'USD', requiresRef: true },
  { type: 'credit', name: 'Fiado / Crédito', icon: UserCheck, currency: 'USD' },
];

const VENEZUELAN_BANKS = [
  'Banesco', 'Banco de Venezuela', 'Mercantil', 'BBVA Provincial', 'Bancaribe', 'BNC', 'BOD', 'BFC', 'Banplus', 'Otro'
];

const QUICK_DENOMINATIONS = [1, 5, 10, 20, 50, 100];

interface GatewayRowData {
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
  const rate = state.settings?.exchangeRate > 0 ? Number(state.settings.exchangeRate) : 52.40;
  const currSymbol = state.settings?.secondaryCurrency?.symbol || 'Bs.';
  const currCode = state.settings?.secondaryCurrency?.code || 'VES';

  // Descuento editable en tiempo real dentro del modal
  const [customDiscountUSD, setCustomDiscountUSD] = useState<string>('0.00');

  // Método activo en la tabla
  const [activeGateway, setActiveGateway] = useState<PaymentGatewayType>('card_terminal');

  // Datos asignados a cada método
  const [gatewayRows, setGatewayRows] = useState<Record<PaymentGatewayType, GatewayRowData>>({
    card_terminal: { amountUSD: '', amountLocal: '', reference: '', bank: 'Banesco' },
    mobile_payment: { amountUSD: '', amountLocal: '', reference: '', bank: 'Banesco' },
    cash_usd: { amountUSD: '', amountLocal: '', reference: '', bank: 'Banesco' },
    cash_local: { amountUSD: '', amountLocal: '', reference: '', bank: 'Banesco' },
    bank_transfer: { amountUSD: '', amountLocal: '', reference: '', bank: 'Banesco' },
    zelle: { amountUSD: '', amountLocal: '', reference: '', bank: 'Banesco' },
    crypto_usdt: { amountUSD: '', amountLocal: '', reference: '', bank: 'Banesco' },
    credit: { amountUSD: '', amountLocal: '', reference: '', bank: 'Banesco' },
    paypal: { amountUSD: '', amountLocal: '', reference: '', bank: 'Banesco' },
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const montoInputRef = useRef<HTMLInputElement>(null);

  const isTaxIncluded = state.settings?.taxCalculationMode !== 'additional';
  const taxPercentConfig = Number(state.settings?.taxPercentage) || 0;

  // Cálculos dinámicos del descuento y total a pagar
  const parsedDiscountUSD = Math.min(subtotalUSD, Math.max(0, parseFloat(customDiscountUSD) || 0));
  const effectiveBaseAfterDiscountUSD = Math.max(0, subtotalUSD - parsedDiscountUSD);

  let effectiveTotalUSD = 0;
  let effectiveTaxUSD = 0;
  let effectiveTaxableBaseUSD = 0;

  if (isTaxIncluded) {
    // PRECIOS CON IVA INCLUIDO: Total a pagar = Total venta - Descuento (el cliente paga exactamente lo mismo)
    effectiveTotalUSD = effectiveBaseAfterDiscountUSD;
    const taxRate = taxPercentConfig / 100;
    effectiveTaxableBaseUSD = taxRate > 0 ? (effectiveTotalUSD / (1 + taxRate)) : effectiveTotalUSD;
    effectiveTaxUSD = effectiveTotalUSD - effectiveTaxableBaseUSD;
  } else {
    // PRECIOS MÁS IVA ADICIONAL: Se suma el IVA al total
    effectiveTaxableBaseUSD = effectiveBaseAfterDiscountUSD;
    effectiveTaxUSD = (taxUSD > 0 && subtotalUSD > 0) ? (effectiveTaxableBaseUSD * (taxUSD / subtotalUSD)) : (effectiveTaxableBaseUSD * taxPercentConfig / 100);
    effectiveTotalUSD = effectiveTaxableBaseUSD + effectiveTaxUSD;
  }
  const effectiveTotalLocal = effectiveTotalUSD * rate;

  // Inicializar al abrir
  useEffect(() => {
    if (isOpen) {
      setCustomDiscountUSD(discountUSD > 0 ? discountUSD.toFixed(2) : '0.00');
      setActiveGateway('card_terminal');

      const initialTotalUSD = totalUSD.toFixed(2);
      const initialTotalLocal = (totalUSD * rate).toFixed(2);

      // Pre-cargar 100% en Punto de Venta para cobro instantáneo en 1 toque
      setGatewayRows({
        card_terminal: { amountUSD: initialTotalUSD, amountLocal: initialTotalLocal, reference: '', bank: 'Banesco' },
        mobile_payment: { amountUSD: '', amountLocal: '', reference: '', bank: 'Banesco' },
        cash_usd: { amountUSD: '', amountLocal: '', reference: '', bank: 'Banesco' },
        cash_local: { amountUSD: '', amountLocal: '', reference: '', bank: 'Banesco' },
        bank_transfer: { amountUSD: '', amountLocal: '', reference: '', bank: 'Banesco' },
        zelle: { amountUSD: '', amountLocal: '', reference: '', bank: 'Banesco' },
        crypto_usdt: { amountUSD: '', amountLocal: '', reference: '', bank: 'Banesco' },
        credit: { amountUSD: '', amountLocal: '', reference: '', bank: 'Banesco' },
        paypal: { amountUSD: '', amountLocal: '', reference: '', bank: 'Banesco' },
      });

      setTimeout(() => {
        montoInputRef.current?.focus();
        montoInputRef.current?.select();
      }, 60);
    }
  }, [isOpen, totalUSD, discountUSD, rate]);

  // Enfocar input al cambiar método
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        montoInputRef.current?.focus();
        montoInputRef.current?.select();
      }, 40);
    }
  }, [isOpen, activeGateway]);

  // Totales cubiertos y restantes
  const totalCoveredUSD = Object.entries(gatewayRows).reduce((acc, [_, data]) => {
    const val = parseFloat(data.amountUSD);
    return acc + (!isNaN(val) && val > 0 ? val : 0);
  }, 0);
  const totalCoveredLocal = totalCoveredUSD * rate;

  const remainingUSD = Math.max(0, effectiveTotalUSD - totalCoveredUSD);
  const remainingLocal = remainingUSD * rate;

  const changeUSD = Math.max(0, totalCoveredUSD - effectiveTotalUSD);
  const changeLocal = changeUSD * rate;

  const isValidToComplete = totalCoveredUSD >= effectiveTotalUSD && effectiveTotalUSD > 0;

  // Actualización bidireccional de montos
  const updateGatewayField = (type: PaymentGatewayType, field: keyof GatewayRowData, value: string) => {
    setGatewayRows(prev => {
      const current = prev[type] || { amountUSD: '', amountLocal: '', reference: '', bank: 'Banesco' };
      const updated = { ...current, [field]: value };

      if (field === 'amountLocal') {
        const bs = parseFloat(value);
        if (!isNaN(bs) && bs >= 0 && rate > 0) {
          updated.amountUSD = (bs / rate).toFixed(2);
        } else if (value === '') {
          updated.amountUSD = '';
        }
      } else if (field === 'amountUSD') {
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

  // Botón rápido para cubrir el saldo restante en el método activo
  const handleFillRemaining = () => {
    const activeDef = GATEWAY_DEFINITIONS.find(d => d.type === activeGateway)!;
    // Saldo restante considerando lo que este método ya tenía
    const currentActiveUSD = parseFloat(gatewayRows[activeGateway].amountUSD) || 0;
    const neededUSD = remainingUSD + currentActiveUSD;

    if (activeDef.currency === 'VES') {
      const neededLocal = (neededUSD * rate).toFixed(2);
      updateGatewayField(activeGateway, 'amountLocal', neededLocal);
    } else {
      updateGatewayField(activeGateway, 'amountUSD', neededUSD.toFixed(2));
    }

    setTimeout(() => {
      montoInputRef.current?.focus();
      montoInputRef.current?.select();
    }, 40);
  };

  // Limpiar monto de un método
  const handleClearMethod = (type: PaymentGatewayType, e?: React.MouseEvent) => {
    e?.stopPropagation();
    updateGatewayField(type, 'amountUSD', '');
    updateGatewayField(type, 'amountLocal', '');
  };

  // Procesar registro de venta
  const handleCompleteCheckout = useCallback(async () => {
    const activeRows = Object.entries(gatewayRows).filter(([_, data]) => {
      const val = parseFloat(data.amountUSD);
      return !isNaN(val) && val > 0;
    });

    if (activeRows.length === 0) {
      alert('Ingrese el monto en alguna forma de pago antes de continuar.');
      return;
    }

    if (totalCoveredUSD < effectiveTotalUSD) {
      alert(`Aún falta por cubrir ${formatUSD(remainingUSD)} (${formatLocal(remainingLocal, currSymbol, currCode)}).`);
      return;
    }

    // Validación de Fiado
    const creditData = gatewayRows['credit'];
    const creditAmountUSD = parseFloat(creditData?.amountUSD) || 0;
    if (creditAmountUSD > 0) {
      if (!customer || customer.id === 'cus-1') {
        alert('Para otorgar Fiado / Crédito debe seleccionar un cliente registrado.');
        return;
      }
      if (customer.creditLimitUSD > 0 && (customer.currentDebtUSD + creditAmountUSD > customer.creditLimitUSD)) {
        alert(`El cliente excede su límite de crédito autorizado ($${customer.creditLimitUSD.toFixed(2)}).`);
        return;
      }
    }

    const finalPayments: PaymentMethodEntry[] = activeRows.map(([typeKey, data]) => {
      const gwType = typeKey as PaymentGatewayType;
      const def = GATEWAY_DEFINITIONS.find(d => d.type === gwType) || { name: 'Pago', type: gwType };
      const amtUSD = parseFloat(data.amountUSD);
      const parsedLocal = parseFloat(data.amountLocal);
      const amtLocal = !isNaN(parsedLocal) && parsedLocal > 0 ? parsedLocal : amtUSD * rate;
      const entry: PaymentMethodEntry = {
        gateway: gwType,
        gatewayName: def.name,
        amountUSD: amtUSD,
        amountLocal: amtLocal
      };
      if (data.reference && data.reference.trim()) {
        entry.reference = data.reference.trim();
      }
      if (data.bank && data.bank.trim()) {
        entry.bank = data.bank.trim();
      }
      return entry;
    });

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
        subtotalUSD: isTaxIncluded ? effectiveTaxableBaseUSD : effectiveBaseAfterDiscountUSD,
        discountUSD: parsedDiscountUSD,
        taxUSD: effectiveTaxUSD,
        totalUSD: effectiveTotalUSD,
        totalLocal: effectiveTotalLocal,
        exchangeRateUsed: rate,
        currencyCode: currCode,
        currencySymbol: currSymbol,
        paymentMethods: finalPayments,
        amountReceivedUSD: totalCoveredUSD,
        changeGivenUSD: changeUSD,
        changeGivenLocal: changeLocal,
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
  }, [
    gatewayRows, 
    totalCoveredUSD, 
    effectiveTotalUSD, 
    remainingUSD, 
    remainingLocal, 
    rate, 
    currSymbol, 
    currCode, 
    customer, 
    cartItems, 
    subtotalUSD, 
    parsedDiscountUSD, 
    effectiveTaxUSD, 
    effectiveTotalLocal, 
    isTaxIncluded,
    effectiveTaxableBaseUSD,
    effectiveBaseAfterDiscountUSD,
    changeUSD, 
    changeLocal, 
    addSale, 
    onSaleCompleted, 
    onClose
  ]);

  // Atajos de teclado físicos (Enter, F12, Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'F12' || (e.key === 'Enter' && e.ctrlKey)) {
        e.preventDefault();
        if (isValidToComplete && !isProcessing) {
          handleCompleteCheckout();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isValidToComplete, isProcessing, handleCompleteCheckout, onClose]);

  if (!isOpen) return null;

  const activeDef = GATEWAY_DEFINITIONS.find(d => d.type === activeGateway) || GATEWAY_DEFINITIONS[0];
  const activeRowData = gatewayRows[activeGateway] || { amountUSD: '', amountLocal: '', reference: '', bank: 'Banesco' };
  const isLocalMethod = activeDef.currency === 'VES';
  const currentInputValue = isLocalMethod ? activeRowData.amountLocal : activeRowData.amountUSD;
  const ActiveIcon = activeDef.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-3 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150 select-none">
      <div className="bg-white dark:bg-slate-950 rounded-2xl sm:rounded-3xl shadow-[6px_6px_0px_#0f172a] w-full max-w-4xl lg:max-w-5xl overflow-hidden border-2 border-slate-900 flex flex-col max-h-[96vh]">
        
        {/* ========================================================================= */}
        {/* HEADER SUPERIOR SLEEK                                                     */}
        {/* ========================================================================= */}
        <div className="bg-slate-950 text-white px-3 sm:px-4 py-2 flex justify-between items-center border-b-2 border-slate-900 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-amber-400 border border-slate-900 flex items-center justify-center text-slate-950 font-black shrink-0 text-sm shadow-xs">
              💵
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <h3 className="font-black text-xs sm:text-sm text-white leading-tight shrink-0">
                Cobro de Venta (F12)
              </h3>
              <span className="text-slate-600 text-xs hidden sm:inline">·</span>
              <p className="text-[11px] text-slate-300 font-medium truncate max-w-[200px] sm:max-w-xs">
                Cliente: <span className="text-amber-300 font-bold">{customer ? customer.name : 'Cliente Ocasional'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="text-[10px] sm:text-xs font-mono font-black text-slate-950 bg-amber-300 px-2 py-0.5 rounded-md border border-slate-900 shadow-xs">
              1 $ = {rate.toFixed(2)} {currSymbol}
            </span>
            <button 
              onClick={onClose}
              className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center border border-slate-700 transition-colors cursor-pointer shrink-0"
              title="Cerrar modal (Esc)"
            >
              <X className="w-3.5 h-3.5 stroke-[3]" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 1. TRES RECTÁNGULOS DE COLORES SUPERIORES (ESTILO 1SISTEMA CON PALETA OMNIPOS) */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 p-2.5 sm:p-3 bg-slate-900 border-b-2 border-slate-900 shrink-0">
          
          {/* RECTÁNGULO 1 (VERDE ESMERALDA): TOTAL VENTA */}
          <div className="bg-emerald-950/90 border-2 border-emerald-500 rounded-2xl p-2 sm:p-2.5 flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between gap-1 mb-0.5">
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400">
                Total Venta
              </span>
              <span className="px-2 py-0.5 rounded-md bg-white text-slate-950 font-black font-mono text-[11px] shadow-xs">
                ${subtotalUSD.toFixed(2)}
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-300 tracking-tight leading-none truncate">
              {formatLocal(subtotalUSD * rate, currSymbol, currCode)}
            </div>
            <div className="text-[10px] text-emerald-400 font-bold mt-1 truncate">
              {isTaxIncluded ? (
                <span>🏷️ IVA ({taxPercentConfig}%) ya incluido · Precio Final</span>
              ) : (
                <span>Base imponible neta (sin IVA)</span>
              )}
            </div>
          </div>

          {/* RECTÁNGULO 2 (ÁMBAR / DORADO): DESCUENTO DIRECTO */}
          <div className="bg-amber-950/70 border-2 border-amber-500 rounded-2xl p-2 sm:p-2.5 flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between gap-1 mb-0.5">
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-300">
                Descuento ($ USD)
              </span>
              <span className="text-[10px] text-amber-200/80 font-bold">
                Opcional
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="relative flex-1">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 font-black text-xs text-amber-400">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={subtotalUSD}
                  value={customDiscountUSD}
                  onChange={(e) => setCustomDiscountUSD(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-5 pr-2 py-0.5 bg-slate-900 border-2 border-amber-400 rounded-xl font-mono font-black text-sm text-amber-200 focus:outline-none focus:ring-1 focus:ring-amber-300"
                  title="Aplicar descuento en dólares"
                />
              </div>
              <span className="text-[10px] font-mono font-bold text-amber-300 truncate max-w-[120px]">
                ({formatLocal(parsedDiscountUSD * rate, currSymbol, currCode)})
              </span>
            </div>
            <div className="text-[10px] text-amber-300 font-bold mt-1 truncate">
              {parsedDiscountUSD > 0 ? `-${formatUSD(parsedDiscountUSD)} descontados` : 'Sin descuento aplicado'}
            </div>
          </div>

          {/* RECTÁNGULO 3 (ROJO / CORAL / ACCENT): TOTAL A PAGAR */}
          <div className="bg-rose-950/90 border-2 border-rose-500 rounded-2xl p-2 sm:p-2.5 flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between gap-1 mb-0.5">
              <span className="text-[11px] font-black uppercase tracking-wider text-rose-300">
                Total a Pagar
              </span>
              <span className="px-2 py-0.5 rounded-md bg-white text-slate-950 font-black font-mono text-[11px] shadow-xs">
                ${effectiveTotalUSD.toFixed(2)}
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-white tracking-tight leading-none truncate">
              {formatLocal(effectiveTotalLocal, currSymbol, currCode)}
            </div>
            <div className="text-[10px] text-rose-300 font-bold mt-1 truncate">
              {isTaxIncluded ? (
                <span>✓ Monto a cobrar idéntico al total venta</span>
              ) : (
                <span>+{formatUSD(effectiveTaxUSD)} ({taxPercentConfig}% IVA sumado)</span>
              )}
            </div>
          </div>

        </div>

        {/* ========================================================================= */}
        {/* 2. CUERPO: LISTA DE FORMAS DE PAGO (IZQ) + ENTRADA DE TECLADO FÍSICO (DER) */}
        {/* ========================================================================= */}
        <div className="p-2.5 sm:p-3 flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12 gap-2.5">
          
          {/* TABLA / LISTA DE FORMAS DE PAGO (COLUMNA IZQUIERDA 60%) */}
          <div className="md:col-span-7 rounded-2xl border-2 border-slate-900 overflow-hidden bg-white dark:bg-slate-900 flex flex-col shadow-sm">
            
            {/* Encabezado de la tabla */}
            <div className="grid grid-cols-12 bg-slate-950 text-white text-[10px] font-black uppercase tracking-wider py-1.5 px-3 border-b-2 border-slate-900 shrink-0">
              <div className="col-span-5">Forma de pago</div>
              <div className="col-span-2 text-center">Tasa</div>
              <div className="col-span-3 text-right">Su Pago</div>
              <div className="col-span-2 text-right">Eq. ($/Bs)</div>
            </div>

            {/* Filas interactivas de la tabla */}
            <div className="flex-1 divide-y divide-slate-200 dark:divide-slate-800 overflow-y-auto">
              {GATEWAY_DEFINITIONS.map(gw => {
                const Icon = gw.icon;
                const row = gatewayRows[gw.type] || { amountUSD: '', amountLocal: '', reference: '', bank: 'Banesco' };
                const isSelected = activeGateway === gw.type;
                const amtUSD = parseFloat(row.amountUSD) || 0;
                const hasValue = amtUSD > 0;
                const isVES = gw.currency === 'VES';

                return (
                  <div
                    key={gw.type}
                    onClick={() => setActiveGateway(gw.type)}
                    className={`grid grid-cols-12 items-center px-3 py-1.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-purple-100 dark:bg-purple-950/60 font-black text-purple-950 dark:text-purple-100 border-l-4 border-l-purple-600'
                        : hasValue
                        ? 'bg-emerald-50/70 dark:bg-emerald-950/30 text-slate-900 dark:text-slate-100'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {/* Forma de pago con icono */}
                    <div className="col-span-5 flex items-center gap-1.5 min-w-0 pr-1">
                      <Icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-purple-600 dark:text-purple-400' : hasValue ? 'text-emerald-600' : 'text-slate-400'}`} />
                      <span className="text-xs truncate">{gw.name}</span>
                    </div>

                    {/* Tasa de cambio */}
                    <div className="col-span-2 text-center font-mono text-[11px] font-bold text-slate-500">
                      {isVES ? '1.00' : rate.toFixed(2)}
                    </div>

                    {/* Su Pago en moneda nativa */}
                    <div className="col-span-3 text-right font-mono font-black text-xs min-w-0 truncate">
                      {hasValue ? (
                        <span className="text-emerald-700 dark:text-emerald-400">
                          {isVES ? `${row.amountLocal} ${currSymbol}` : `$ ${amtUSD.toFixed(2)}`}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-normal">0.00</span>
                      )}
                    </div>

                    {/* Equivalente en la otra moneda y botón borrar */}
                    <div className="col-span-2 text-right font-mono text-[10px] text-slate-500 truncate flex items-center justify-end gap-1">
                      {hasValue ? (
                        <>
                          <span className="truncate">
                            {isVES ? `$${amtUSD.toFixed(2)}` : `${row.amountLocal}Bs`}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => handleClearMethod(gw.type, e)}
                            className="text-slate-400 hover:text-rose-600 p-0.5 rounded cursor-pointer shrink-0"
                            title="Quitar monto"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </>
                      ) : (
                        <span>0.00</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Barra informativa inferior de la lista */}
            <div className="p-1.5 bg-slate-100 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 text-[10px] text-slate-500 dark:text-slate-400 flex justify-between items-center px-3">
              <span>💡 Haz clic en una forma de pago para asignarle monto con el teclado.</span>
              <button
                type="button"
                onClick={() => {
                  GATEWAY_DEFINITIONS.forEach(g => updateGatewayField(g.type, 'amountUSD', ''));
                }}
                className="text-rose-600 dark:text-rose-400 hover:underline font-bold cursor-pointer"
              >
                Limpiar lista
              </button>
            </div>

          </div>

          {/* PANEL DE ENTRADA CON TECLADO FÍSICO (COLUMNA DERECHA 40%) */}
          <div className="md:col-span-5 rounded-2xl border-2 border-slate-900 bg-slate-50 dark:bg-slate-900/90 p-2.5 sm:p-3 flex flex-col justify-between shadow-sm">
            
            {/* Cabecera del método seleccionado */}
            <div>
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 dark:border-slate-800 mb-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <ActiveIcon className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                  <span className="font-black text-xs text-slate-900 dark:text-white truncate">
                    {activeDef.name}
                  </span>
                </div>
                <span className="text-[10px] font-black px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                  {isLocalMethod ? currSymbol : 'USD $'}
                </span>
              </div>

              {/* Input gigante directo para teclado físico / numpad */}
              <div className="space-y-1 mb-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-400">
                    Monto a registrar ({isLocalMethod ? currSymbol : '$'}):
                  </label>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-black">
                    = {isLocalMethod 
                        ? `$${(parseFloat(activeRowData.amountUSD) || 0).toFixed(2)} USD` 
                        : `${activeRowData.amountLocal || '0.00'} ${currSymbol}`}
                  </span>
                </div>

                <div className="relative">
                  <input
                    ref={montoInputRef}
                    type="number"
                    step="0.01"
                    min="0"
                    value={currentInputValue}
                    onChange={(e) => {
                      if (isLocalMethod) {
                        updateGatewayField(activeGateway, 'amountLocal', e.target.value);
                      } else {
                        updateGatewayField(activeGateway, 'amountUSD', e.target.value);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (isValidToComplete) {
                          handleCompleteCheckout();
                        } else if (remainingUSD > 0) {
                          handleFillRemaining();
                        }
                      }
                    }}
                    placeholder="0.00"
                    className="w-full pl-3 pr-9 py-2 bg-white dark:bg-slate-950 border-2 border-slate-900 rounded-xl font-mono font-black text-2xl text-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-400 placeholder:text-slate-400 shadow-inner"
                    title="Ingresa el monto con tu teclado numérico físico y presiona Enter"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 font-black text-sm text-slate-400">
                    {isLocalMethod ? currSymbol : '$'}
                  </span>
                </div>
              </div>

              {/* Botón rápido "+ Cubrir Saldo Restante" */}
              <button
                type="button"
                onClick={handleFillRemaining}
                className="w-full py-1.5 px-3 rounded-xl border-2 border-purple-500 bg-purple-100 hover:bg-purple-200 dark:bg-purple-950/60 dark:hover:bg-purple-900 text-purple-950 dark:text-purple-200 font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:translate-y-0.5 transition-all mb-2"
                title="Completar el saldo faltante automáticamente en este método"
              >
                <span>+ Cubrir Saldo Restante</span>
                <span className="font-mono underline">
                  ({isLocalMethod ? formatLocal(remainingLocal, currSymbol, currCode) : formatUSD(remainingUSD)})
                </span>
              </button>

              {/* Campos complementarios (Referencia y Banco si aplican) */}
              <div className="space-y-1.5">
                {activeDef.requiresRef && (
                  <div>
                    <label className="text-[9px] font-bold uppercase text-slate-500 block mb-0.5">
                      N° Referencia / Lote / Comprobante:
                    </label>
                    <input
                      type="text"
                      value={activeRowData.reference}
                      onChange={(e) => updateGatewayField(activeGateway, 'reference', e.target.value)}
                      placeholder="Ej: 9812401 o últimos 4 dígitos"
                      className="w-full px-2.5 py-1 bg-white dark:bg-slate-950 border border-slate-400 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-400"
                    />
                  </div>
                )}

                {activeDef.requiresBank && (
                  <div>
                    <label className="text-[9px] font-bold uppercase text-slate-500 block mb-0.5">
                      Banco Emisor / Receptor:
                    </label>
                    <select
                      value={activeRowData.bank}
                      onChange={(e) => updateGatewayField(activeGateway, 'bank', e.target.value)}
                      className="w-full px-2 py-1 bg-white dark:bg-slate-950 border border-slate-400 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white cursor-pointer"
                    >
                      {VENEZUELAN_BANKS.map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Billetes rápidos para Efectivo $ */}
                {activeGateway === 'cash_usd' && (
                  <div className="pt-0.5">
                    <span className="text-[9px] font-bold uppercase text-slate-500 block mb-1">
                      Billetes rápidos ($ USD):
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {QUICK_DENOMINATIONS.map(d => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => updateGatewayField('cash_usd', 'amountUSD', d.toFixed(2))}
                          className="px-2 py-0.5 bg-white dark:bg-slate-800 hover:bg-amber-100 border border-slate-900 rounded-md text-xs font-black text-slate-900 dark:text-white shadow-xs cursor-pointer active:translate-y-0.5"
                        >
                          ${d}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Resumen de estado inferior (Su Pago / Falta / Vuelto) */}
            <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="flex justify-between items-center text-xs font-bold text-slate-600 dark:text-slate-300">
                <span>Su Pago / Cubierto:</span>
                <span className="font-mono font-black text-slate-950 dark:text-white">
                  {formatUSD(totalCoveredUSD)} ({formatLocal(totalCoveredLocal, currSymbol, currCode)})
                </span>
              </div>

              {/* Si falta por cubrir */}
              {remainingUSD > 0 && (
                <div className="p-1.5 bg-rose-500/20 border-2 border-rose-500 rounded-xl text-rose-700 dark:text-rose-300 font-black text-xs flex justify-between items-center shadow-xs">
                  <div className="flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    <span>Falta por Pagar:</span>
                  </div>
                  <span className="font-mono">
                    {formatUSD(remainingUSD)} ({formatLocal(remainingLocal, currSymbol, currCode)})
                  </span>
                </div>
              )}

              {/* Si hay vuelto en efectivo */}
              {changeUSD > 0 && (
                <div className="p-1.5 bg-emerald-400 text-slate-950 rounded-xl border-2 border-slate-900 font-black text-xs flex justify-between items-center shadow-xs">
                  <span>🪙 Cambio / Vuelto:</span>
                  <span className="font-mono">
                    {formatUSD(changeUSD)} ({formatLocal(changeLocal, currSymbol, currCode)})
                  </span>
                </div>
              )}

              {/* Si está 100% exacto */}
              {isValidToComplete && changeUSD === 0 && (
                <div className="p-1 bg-emerald-500/20 border border-emerald-500 text-emerald-800 dark:text-emerald-300 rounded-lg font-black text-[11px] text-center">
                  ✓ Total cubierto al 100%
                </div>
              )}
            </div>

          </div>

        </div>

        {/* ========================================================================= */}
        {/* 3. FOOTER COMPACTO DOCKED (SIN SCROLLBAR)                                 */}
        {/* ========================================================================= */}
        <div className="px-3 sm:px-4 py-2 bg-slate-100 dark:bg-slate-950 border-t-2 border-slate-900 flex items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 border-2 border-slate-900 text-slate-800 dark:text-slate-200 font-black rounded-xl hover:bg-white dark:hover:bg-slate-900 text-xs transition-all cursor-pointer"
          >
            Regresar al Carrito (Esc)
          </button>

          <button
            type="button"
            onClick={handleCompleteCheckout}
            disabled={!isValidToComplete || isProcessing}
            className="px-6 py-2 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-40 disabled:hover:bg-emerald-400 text-slate-950 font-black rounded-xl border-2 border-slate-900 shadow-[3px_3px_0px_#0f172a] active:translate-y-0.5 text-xs sm:text-sm flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>
              {isProcessing 
                ? 'Registrando Venta...' 
                : '✓ FINALIZAR COBRO (Enter / F12)'}
            </span>
          </button>
        </div>

      </div>
    </div>
  );
};
