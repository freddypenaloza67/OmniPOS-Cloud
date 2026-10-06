import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { Product, Customer, Sale, CartItem } from '../types';
import { 
  Barcode, 
  Plus, 
  Minus, 
  Trash2, 
  User, 
  UserPlus, 
  RotateCcw, 
  CreditCard, 
  Search, 
  AlertCircle, 
  CheckCircle2, 
  Percent, 
  X,
  Keyboard,
  Zap,
  Hash
} from 'lucide-react';
import { formatUSD, formatLocal, formatDual } from '../utils/formatters';
import { CheckoutModal } from './CheckoutModal';
import { ReceiptModal } from './ReceiptModal';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { CustomerAbonoModal } from './CustomerAbonoModal';
import { EmptyCartIllustration } from './illustrations/VectorIllustrations';

export const PosView: React.FC = () => {
  const { 
    state, 
    licenseInfo, 
    setIsLicenseModalOpen, 
    addCustomer,
    posCart: cart,
    setPosCart: setCart,
    posCustomerId: selectedCustomerId,
    setPosCustomerId: setSelectedCustomerId,
    posDiscountPercent: discountPercent,
    setPosDiscountPercent: setDiscountPercent,
    posApplyTax: applyTax,
    setPosApplyTax: setApplyTax,
    clearPosCart
  } = useStore();

  const rawRate = Number(state.settings?.exchangeRate);
  const rate = !isNaN(rawRate) && rawRate > 0 ? rawRate : 52.40;
  const currSymbol = state.settings?.secondaryCurrency?.symbol || 'Bs.';
  const currCode = state.settings?.secondaryCurrency?.code || 'VES';

  // Barcode and quick quantity local input state
  const [barcodeInput, setBarcodeInput] = useState('');
  const [quickQty, setQuickQty] = useState<number>(1);
  
  // Feedback banners
  const [scanMessage, setScanMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Modals
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false);
  const [isAbonoModalOpen, setIsAbonoModalOpen] = useState(false);
  const [completedAbonoSale, setCompletedAbonoSale] = useState<Sale | null>(null);

  // Quick Quantity Modal for last added item (Triggered via F4 or *)
  const [isQuickQtyModalOpen, setIsQuickQtyModalOpen] = useState(false);
  const [quickQtyTargetItem, setQuickQtyTargetItem] = useState<CartItem | null>(null);
  const [quickQtyModalValue, setQuickQtyModalValue] = useState<string>('1');
  const quickQtyModalInputRef = useRef<HTMLInputElement>(null);
  
  // Quick new customer form state
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerTaxId, setNewCustomerTaxId] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');

  // Search suggestions dropdown & keyboard navigation
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState<number>(0);

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus barcode input on mount and after actions
  useEffect(() => {
    if (!isCheckoutOpen && !isScannerOpen && !isNewCustomerModalOpen && !isAbonoModalOpen && !isQuickQtyModalOpen) {
      barcodeInputRef.current?.focus();
    }
  }, [cart, isCheckoutOpen, isScannerOpen, isNewCustomerModalOpen, isAbonoModalOpen, isQuickQtyModalOpen]);

  // Global keyboard shortcut listener (F12 checkout, F4 quick quantity)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F12 or Ctrl+Enter for checkout
      if (e.key === 'F12' || (e.ctrlKey && e.key === 'Enter')) {
        e.preventDefault();
        if (cart.length > 0 && !licenseInfo.isExpired) {
          setIsCheckoutOpen(true);
        }
        return;
      }

      // F4 to change quantity of the last added item
      if (e.key === 'F4') {
        e.preventDefault();
        if (cart.length > 0) {
          const lastItem = cart[cart.length - 1];
          openQuickQtyModal(lastItem);
        }
        return;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, licenseInfo.isExpired]);

  // Open Quick Quantity Modal
  const openQuickQtyModal = (item: CartItem) => {
    setQuickQtyTargetItem(item);
    setQuickQtyModalValue(String(item.quantity));
    setIsQuickQtyModalOpen(true);
    setTimeout(() => {
      quickQtyModalInputRef.current?.focus();
      quickQtyModalInputRef.current?.select();
    }, 50);
  };

  const handleQuickQtyModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickQtyTargetItem) return;
    const parsed = parseInt(quickQtyModalValue, 10);
    if (!isNaN(parsed) && parsed > 0) {
      updateQuantity(quickQtyTargetItem.productId, parsed);
    }
    setIsQuickQtyModalOpen(false);
    setQuickQtyTargetItem(null);
    barcodeInputRef.current?.focus();
  };

  const selectedCustomer = useMemo(() => {
    return state.customers.find(c => c.id === selectedCustomerId) || null;
  }, [state.customers, selectedCustomerId]);

  // Helper to parse multiplier e.g. "5*harina", "10*759123", "harina*5", "3xqueso"
  const parseMultiplierAndCode = (raw: string, defaultQty = 1) => {
    let multiplier = defaultQty > 1 ? defaultQty : 1;
    let code = raw.trim();

    if (!code) return { multiplier, code: '' };

    // Check for "5*harina" or "5*759123" or "harina*5"
    if (code.includes('*')) {
      const parts = code.split('*');
      const first = parseInt(parts[0], 10);
      const second = parseInt(parts[1], 10);
      if (!isNaN(first) && first > 0 && parts[1]) {
        multiplier = first;
        code = parts[1].trim();
      } else if (!isNaN(second) && second > 0 && parts[0]) {
        multiplier = second;
        code = parts[0].trim();
      }
    } 
    // Check for "5xhar" or "5 x harina"
    else if (/^\d+\s*[xX]\s*/.test(code)) {
      const match = code.match(/^(\d+)\s*[xX]\s*(.*)$/);
      if (match && match[2]) {
        multiplier = parseInt(match[1], 10);
        code = match[2].trim();
      }
    }

    return { multiplier, code };
  };

  // Extract current query string and multiplier dynamically
  const { multiplier: activeMultiplier, code: activeSearchCode } = useMemo(() => {
    return parseMultiplierAndCode(barcodeInput, quickQty);
  }, [barcodeInput, quickQty]);

  // Product suggestions based on current search code
  const suggestions = useMemo(() => {
    const query = activeSearchCode.toLowerCase();
    if (!query || query.length < 2) return [];
    return state.products.filter(p => 
      p.name.toLowerCase().includes(query) ||
      p.sku.toLowerCase().includes(query) ||
      (p.barcode && p.barcode.toLowerCase().includes(query))
    ).slice(0, 6);
  }, [state.products, activeSearchCode]);

  // Reset selection index when suggestions change
  useEffect(() => {
    setSelectedSuggestionIndex(0);
  }, [suggestions]);

  // Add product to cart helper
  const addProductToCart = (product: Product, quantityToAdd = 1) => {
    if (product.stock <= 0) {
      setScanMessage({ text: `El producto "${product.name}" está agotado en inventario.`, type: 'error' });
      setTimeout(() => setScanMessage(null), 3000);
      return;
    }

    const qty = quantityToAdd > 0 ? quantityToAdd : 1;

    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        const nextQty = existing.quantity + qty;
        if (nextQty > product.stock) {
          setScanMessage({ 
            text: `Stock máximo para "${product.name}" es ${product.stock} unidades.`, 
            type: 'error' 
          });
          setTimeout(() => setScanMessage(null), 3000);
          return prev;
        }
        setScanMessage({ text: `✓ Cantidad sumada (+${qty}): ${product.name} (Total: ${nextQty})`, type: 'success' });
        setTimeout(() => setScanMessage(null), 2500);
        return prev.map(item => 
          item.productId === product.id 
            ? { ...item, quantity: nextQty, subtotalUSD: nextQty * item.unitPriceUSD }
            : item
        );
      }

      const initialQty = Math.min(qty, product.stock);
      setScanMessage({ 
        text: `✓ Ingresado (${initialQty} ud${initialQty > 1 ? 's' : ''}): ${product.name}`, 
        type: 'success' 
      });
      setTimeout(() => setScanMessage(null), 2500);

      return [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          barcode: product.barcode,
          quantity: initialQty,
          unitPriceUSD: Number(product.priceUSD) || 0,
          subtotalUSD: initialQty * (Number(product.priceUSD) || 0),
          costUSD: Number(product.costUSD) || 0,
          maxStock: Number(product.stock) || 9999
        }
      ];
    });

    setBarcodeInput('');
    setQuickQty(1); // Reset quantity multiplier back to 1 for the next item
    setShowSuggestions(false);
    barcodeInputRef.current?.focus();
  };

  // Keyboard navigation inside the barcode input field
  const handleBarcodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // If suggestions are open, navigate with ArrowDown / ArrowUp
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedSuggestionIndex(prev => (prev + 1) % suggestions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedSuggestionIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowSuggestions(false);
        return;
      }
    }

    // When the barcode input is completely empty and cart has items:
    // Allow numpad '+' to increment, '-' to decrement, '*' or 'F4' to set quantity of last item!
    if (barcodeInput === '' && cart.length > 0) {
      const lastItem = cart[cart.length - 1];
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        updateQuantity(lastItem.productId, lastItem.quantity + 1);
        return;
      }
      if (e.key === '-') {
        e.preventDefault();
        updateQuantity(lastItem.productId, lastItem.quantity - 1);
        return;
      }
      if (e.key === '*') {
        e.preventDefault();
        openQuickQtyModal(lastItem);
        return;
      }
    }
  };

  // Handle Enter key in barcode field
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = barcodeInput.trim();
    if (!raw) return;

    const { multiplier, code } = parseMultiplierAndCode(raw, quickQty);

    // 1. If suggestions are open and visible, choose the active highlighted suggestion
    if (showSuggestions && suggestions.length > 0) {
      const target = suggestions[selectedSuggestionIndex] || suggestions[0];
      addProductToCart(target, multiplier);
      return;
    }

    // 2. Exact barcode match first
    let matchedProduct = state.products.find(p => p.barcode && p.barcode.toLowerCase() === code.toLowerCase());

    // 3. If not by barcode, check exact SKU
    if (!matchedProduct) {
      matchedProduct = state.products.find(p => p.sku.toLowerCase() === code.toLowerCase());
    }

    // 4. If not exact SKU, check exact name
    if (!matchedProduct) {
      matchedProduct = state.products.find(p => p.name.toLowerCase() === code.toLowerCase());
    }

    // 5. If still not matched, check if there are partial matches
    if (!matchedProduct) {
      const partials = state.products.filter(p => 
        p.name.toLowerCase().includes(code.toLowerCase()) ||
        p.sku.toLowerCase().includes(code.toLowerCase())
      );
      if (partials.length > 0) {
        matchedProduct = partials[0];
      }
    }

    if (matchedProduct) {
      addProductToCart(matchedProduct, multiplier);
    } else {
      setScanMessage({ text: `❌ Código o producto "${code}" no encontrado en el sistema.`, type: 'error' });
      setTimeout(() => setScanMessage(null), 3500);
      setShowSuggestions(true);
    }
  };

  const updateQuantity = (productId: string, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prev => prev.map(item => {
      if (item.productId === productId) {
        const validatedQty = Math.min(newQty, item.maxStock);
        return {
          ...item,
          quantity: validatedQty,
          subtotalUSD: validatedQty * item.unitPriceUSD
        };
      }
      return item;
    }));
    barcodeInputRef.current?.focus();
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.productId !== productId));
    barcodeInputRef.current?.focus();
  };

  const clearCart = () => {
    clearPosCart();
    barcodeInputRef.current?.focus();
  };

  // Calculations
  const isTaxIncluded = state.settings?.taxCalculationMode !== 'additional';
  const taxPercentConfig = Number(state.settings?.taxPercentage) || 0;

  const rawSubtotalUSD = cart.reduce((acc, item) => {
    const itemSubtotal = Number(item.subtotalUSD);
    if (!isNaN(itemSubtotal) && itemSubtotal > 0) return acc + itemSubtotal;
    const qty = Number(item.quantity) || 1;
    const price = Number(item.unitPriceUSD) || 0;
    return acc + (qty * price);
  }, 0);
  const discountAmountUSD = (rawSubtotalUSD * discountPercent) / 100;
  const netAfterDiscountUSD = Math.max(0, rawSubtotalUSD - discountAmountUSD);

  let taxableAmountUSD = 0;
  let taxAmountUSD = 0;
  let totalUSD = 0;

  if (isTaxIncluded) {
    // MODALIDAD: PRECIOS CON IVA INCLUIDO (El cliente paga exactamente el total de los productos)
    totalUSD = netAfterDiscountUSD;
    const taxRate = taxPercentConfig / 100;
    taxableAmountUSD = taxRate > 0 ? (totalUSD / (1 + taxRate)) : totalUSD;
    taxAmountUSD = totalUSD - taxableAmountUSD;
  } else {
    // MODALIDAD: PRECIOS MÁS IVA ADICIONAL (Se calcula y recarga el IVA sobre el subtotal)
    taxableAmountUSD = netAfterDiscountUSD;
    taxAmountUSD = applyTax ? (taxableAmountUSD * taxPercentConfig) / 100 : 0;
    totalUSD = taxableAmountUSD + taxAmountUSD;
  }
  const totalLocal = totalUSD * rate;
  const totalItemsCount = cart.reduce((acc, i) => acc + (Math.max(1, Number(i.quantity) || 1)), 0);
  const localFormattedStr = formatLocal(totalLocal, currSymbol, currCode);
  const bolivaresFontClass =
    localFormattedStr.length > 15
      ? 'text-3xl sm:text-4xl md:text-[38px]'
      : localFormattedStr.length > 11
      ? 'text-4xl sm:text-5xl md:text-[46px] lg:text-[52px]'
      : localFormattedStr.length > 8
      ? 'text-4xl sm:text-5xl md:text-6xl lg:text-[58px]'
      : 'text-5xl sm:text-6xl md:text-7xl';

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerName.trim()) return;

    const created = await addCustomer({
      name: newCustomerName.trim(),
      taxId: newCustomerTaxId.trim(),
      phone: newCustomerPhone.trim(),
      email: '',
      address: '',
      creditLimitUSD: 0,
      currentDebtUSD: 0
    });

    setSelectedCustomerId(created.id);
    setNewCustomerName('');
    setNewCustomerTaxId('');
    setNewCustomerPhone('');
    setIsNewCustomerModalOpen(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 space-y-3">
      
      {/* ========================================================================= */}
      {/* SECCIÓN SUPERIOR FIJA / STICKY: CLIENTE, TOTALES Y BARRA DE ESCÁNER       */}
      {/* Permanece anclada arriba para que nunca se oculte al desplazarse           */}
      {/* ========================================================================= */}
      <div className="sticky top-16 z-20 bg-[var(--bg-main)]/95 backdrop-blur-md pt-1 pb-2 space-y-2.5">
        
        {/* 1. RECTÁNGULOS DE INFORMACIÓN DE CLIENTE Y TOTALES (20% REDUCIDOS, SIN DOBLE MARCO) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 sm:gap-3 items-stretch">
          
          {/* RECTÁNGULO INFORMACIÓN DEL CLIENTE (COMPACTO Y DIRECTO) */}
          <div className="col-span-1 md:col-span-5 clay-card p-2.5 sm:p-3 flex flex-col justify-between">
            <div className="space-y-1.5">
              {/* Encabezado: Icono + Palabra "Cliente:" + Botón "+ Nuevo" */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-xs">👤</span>
                  <span className="text-[11px] sm:text-xs font-black uppercase text-[var(--text-main)] tracking-wider">
                    Cliente
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsNewCustomerModalOpen(true)}
                  className="px-2.5 py-1 clay-btn clay-btn-amber text-slate-950 text-[10px] sm:text-[11px] font-black flex items-center gap-1 shadow-xs active:translate-y-0.5 cursor-pointer transition-all shrink-0"
                  title="Registrar nuevo cliente"
                >
                  <UserPlus className="w-3 h-3 stroke-[2.5]" />
                  <span>+ Nuevo</span>
                </button>
              </div>

              {/* Selector de Cliente directo */}
              <div>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full px-2.5 py-1.5 clay-input text-xs font-black text-[var(--text-main)] cursor-pointer transition-colors"
                >
                  {state.customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.taxId ? `(${c.taxId})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Fila compacta con RIF, Teléfono y Fiado */}
              {selectedCustomer && (
                <div className="flex items-center justify-between gap-2 text-[11px] pt-1 border-t border-[var(--clay-card-border)]/60">
                  <div className="flex items-center gap-2.5 text-[11px] text-[var(--text-muted)] min-w-0 truncate">
                    <span className="truncate">
                      RIF: <strong className="font-mono text-[var(--text-main)]">{selectedCustomer.taxId || 'N/A'}</strong>
                    </span>
                    <span className="truncate">
                      Telf: <strong className="font-mono text-[var(--text-main)]">{selectedCustomer.phone || 'N/A'}</strong>
                    </span>
                  </div>

                  {selectedCustomer.currentDebtUSD > 0 && (
                    <div className="flex items-center gap-1.5 text-rose-600 font-black text-[10px] sm:text-[11px] shrink-0">
                      <span className="hidden sm:inline">Fiado:</span>
                      <span className="clay-badge bg-rose-100 text-rose-800 font-mono text-[10px]">
                        {formatUSD(selectedCustomer.currentDebtUSD)}
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsAbonoModalOpen(true)}
                        className="px-2 py-0.5 clay-btn clay-btn-emerald text-white text-[10px] font-black cursor-pointer shadow-xs"
                      >
                        Abonar
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* RECTÁNGULO DE TOTALES Y COBRO (MÁXIMA VISIBILIDAD, ANCHO COMPLETO PARA BOLÍVARES, CERO DESBORDAMIENTO) */}
          <div className="col-span-1 md:col-span-7 clay-card-dark p-3 sm:p-3.5 flex flex-col justify-between shadow-2xl relative min-h-[160px] md:h-44 rounded-2xl sm:rounded-3xl border-2 border-white/10 overflow-hidden">
            
            {/* 1. Parte Superior: Indicador discreto a la izquierda y Botón naranja de artículos a la derecha */}
            <div className="flex items-center justify-between w-full shrink-0">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 select-none">
                Total en {currSymbol}:
              </span>
              <span className="text-xs sm:text-sm font-black clay-badge clay-btn-amber text-slate-950 px-3.5 py-0.5 rounded-xl shrink-0 shadow-sm select-none">
                {totalItemsCount} {totalItemsCount === 1 ? 'artículo' : 'artículos'}
              </span>
            </div>

            {/* 2. Área Central: Monto en Bolívares (PRIMERA DIVISA) en ancho completo sin competir horizontalmente con botones */}
            <div className="my-auto py-0.5 w-full overflow-hidden flex items-baseline">
              <span className={`${bolivaresFontClass} font-black text-emerald-400 font-mono tracking-tight leading-none whitespace-nowrap block drop-shadow-2xl select-none truncate`}>
                {localFormattedStr}
              </span>
            </div>

            {/* 3. Fila Inferior: Monto Referencia USD (~25% altura) + Botón COBRAR (F12) siempre visibles a la derecha */}
            <div className="flex items-center justify-end gap-2.5 sm:gap-3 shrink-0 pt-0.5">
              <span className="inline-block text-xs sm:text-sm font-bold text-slate-200 font-mono bg-white/10 px-3 py-1.5 rounded-xl border border-white/15 shadow-inner select-none">
                Ref: <strong className="text-white font-black font-mono">{formatUSD(totalUSD)}</strong>
              </span>

              <button
                type="button"
                onClick={() => setIsCheckoutOpen(true)}
                disabled={cart.length === 0 || licenseInfo.isExpired}
                className="px-5 py-2 clay-btn clay-btn-emerald text-white text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-xl hover:scale-102 active:scale-98 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shrink-0"
                title="Proceder al pago (Atajo: F12 o Ctrl+Enter)"
              >
                <CreditCard className="w-4 h-4 stroke-[2.5]" />
                <span>COBRAR (F12)</span>
              </button>
            </div>
          </div>

        </div>

        {/* 2. BARRA DE LECTURA DEL LECTOR Y BÚSQUEDA DE PRODUCTOS */}
        <div className="relative">
          <form onSubmit={handleBarcodeSubmit} className="clay-card p-2 sm:p-2.5 flex flex-col sm:flex-row gap-2 items-stretch shadow-md">
            
            {/* Selector de Cantidad Rápida Directa */}
            <div className="flex items-center gap-1 shrink-0 bg-black/5 dark:bg-white/5 p-1 rounded-xl border border-[var(--clay-card-border)]">
              <span className="text-[10px] font-black uppercase text-[var(--text-muted)] pl-1">
                Cant:
              </span>
              <input
                type="number"
                min="1"
                max="9999"
                value={quickQty}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setQuickQty(isNaN(val) || val <= 0 ? 1 : val);
                }}
                onFocus={(e) => e.target.select()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    barcodeInputRef.current?.focus();
                  }
                }}
                className="w-12 sm:w-14 py-1.5 text-center clay-input font-black text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 font-mono"
                title="Cantidad a agregar del producto (Ej: escribe 5 y busca el producto)"
              />
            </div>

            {/* Campo de búsqueda / lector con pistola de códigos */}
            <div className="relative flex-1">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-[var(--text-muted)] pointer-events-none">
                <Barcode className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
              </div>

              <input
                ref={barcodeInputRef}
                type="text"
                value={barcodeInput}
                onChange={(e) => {
                  setBarcodeInput(e.target.value);
                  setShowSuggestions(true);
                }}
                onKeyDown={handleBarcodeKeyDown}
                placeholder="Escanear código o escribir producto + ENTER..."
                className="w-full pl-9 sm:pl-10 pr-20 py-2 sm:py-2.5 clay-input text-xs sm:text-sm font-black text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:outline-none transition-all font-mono"
              />

              {/* Indicador de multiplicador detectado en tiempo real */}
              {activeMultiplier > 1 && (
                <span className="absolute right-12 top-1/2 -translate-y-1/2 text-[10px] font-black px-1.5 py-0.5 rounded-lg clay-btn clay-btn-amber text-slate-950 shadow-sm animate-pulse">
                  × {activeMultiplier}
                </span>
              )}

              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-black px-1.5 py-0.5 clay-badge clay-card-subtle text-[var(--text-muted)] hidden sm:inline">
                ↵ ENTER
              </span>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                type="submit"
                className="px-4 py-2 sm:py-2.5 clay-btn clay-btn-amber text-slate-950 text-xs font-black flex items-center justify-center gap-1 shadow-md transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>Agregar {activeMultiplier > 1 ? `(×${activeMultiplier})` : ''}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsScannerOpen(true)}
                className="px-3 py-2 sm:py-2.5 clay-btn clay-btn-surface text-[var(--text-main)] text-xs font-black flex items-center justify-center gap-1 shadow-md transition-all cursor-pointer"
                title="Abrir cámara como lector óptico"
              >
                <Barcode className="w-3.5 h-3.5 stroke-[2.5]" />
                <span className="hidden md:inline">Cámara</span>
              </button>
            </div>
          </form>

          {/* Fila de atajos rápidos de cantidad común para el cajero */}
          <div className="mt-1 px-1 flex items-center justify-between flex-wrap gap-1.5 text-[10px] text-[var(--text-muted)]">
            <div className="flex items-center gap-1 flex-wrap">
              <span className="font-bold text-[9px] uppercase tracking-wider text-[var(--text-muted)]">
                Cant:
              </span>
              {[1, 2, 3, 4, 5, 6, 10, 12, 24].map((qty) => (
                <button
                  key={qty}
                  type="button"
                  onClick={() => {
                    setQuickQty(qty);
                    barcodeInputRef.current?.focus();
                  }}
                  className={`px-1.5 py-0.2 rounded-md font-black text-[10px] transition-all cursor-pointer ${
                    quickQty === qty 
                      ? 'clay-btn clay-btn-purple text-white shadow-xs' 
                      : 'clay-card-subtle hover:bg-black/10 dark:hover:bg-white/10 text-[var(--text-main)]'
                  }`}
                  title={`Configurar cantidad a ${qty}`}
                >
                  x{qty}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 font-bold text-[9px] hidden md:flex">
              <span>💡 <code className="bg-black/10 dark:bg-white/10 px-1 rounded font-black text-amber-500">5*harina</code> vende 5 directo</span>
              <span>·</span>
              <span><code className="bg-black/10 dark:bg-white/10 px-1 rounded font-black text-purple-500">F4</code> cambiar cantidad</span>
            </div>
          </div>

          {/* Dropdown de Sugerencias con Navegación por Teclado */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-30 mt-1.5 clay-card shadow-2xl overflow-hidden divide-y divide-[var(--clay-card-border)] animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="p-2 clay-card-subtle text-[10px] font-black uppercase text-[var(--text-muted)] flex justify-between items-center">
                <span>Sugerencias rápidas (Usa flechas ↑↓ y presiona ENTER para agregar {activeMultiplier > 1 ? `×${activeMultiplier}` : ''}):</span>
                <button onClick={() => setShowSuggestions(false)} className="text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              {suggestions.map((p, index) => {
                const isSelected = index === selectedSuggestionIndex;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => addProductToCart(p, activeMultiplier)}
                    className={`w-full p-2.5 text-left flex items-center justify-between transition-colors text-xs cursor-pointer ${
                      isSelected 
                        ? 'bg-amber-500/15 dark:bg-amber-500/25 ring-2 ring-inset ring-amber-500/50' 
                        : 'hover:bg-black/5 dark:hover:bg-white/5'
                    }`}
                  >
                    <div className="min-w-0 pr-3">
                      <div className="font-black text-[var(--text-main)] flex items-center gap-1.5">
                        <span>{p.name}</span>
                        {activeMultiplier > 1 && (
                          <span className="text-[10px] clay-btn clay-btn-amber text-slate-950 font-black px-1.5 py-0.2 rounded">
                            Agregar ×{activeMultiplier}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-[var(--text-muted)] font-mono mt-0.5">
                        Código: {p.barcode || p.sku} · Stock: <strong>{p.stock} ud</strong>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-black text-[var(--text-main)] font-mono">
                        {formatUSD(p.priceUSD * (activeMultiplier > 1 ? activeMultiplier : 1))}
                      </div>
                      <div className="text-[10px] font-bold text-emerald-600 font-mono">
                        {formatLocal(p.priceUSD * (activeMultiplier > 1 ? activeMultiplier : 1) * rate, currSymbol, currCode)}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Notificación de Escaneo / Error */}
          {scanMessage && (
            <div className={`mt-1.5 p-2.5 rounded-xl clay-card-subtle text-xs font-black flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-150 ${
              scanMessage.type === 'success' 
                ? 'text-emerald-700 dark:text-emerald-300' 
                : 'text-rose-700 dark:text-rose-300'
            }`}>
              {scanMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              )}
              <span>{scanMessage.text}</span>
            </div>
          )}
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 3. DEBAJO: TABLA DE LOS PRODUCTOS EN EL TICKET DE VENTA (3D CLAY)         */}
      {/* Con scroll interno dedicado para que los productos no empujen la pantalla */}
      {/* ========================================================================= */}
      <div className="clay-card overflow-hidden shadow-xl">
        
        {/* Cabecera de la Lista */}
        <div className="p-2.5 sm:p-3 clay-card-dark flex items-center justify-between border-b border-[var(--clay-card-border)]">
          <div className="flex items-center gap-2">
            <span className="text-sm">📋</span>
            <h4 className="font-black text-white text-xs uppercase tracking-wider">
              Productos en Ticket de Venta ({cart.length})
            </h4>
          </div>

          <div className="flex items-center gap-3">
            {cart.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={() => openQuickQtyModal(cart[cart.length - 1])}
                  className="text-xs text-amber-300 hover:text-white font-black flex items-center gap-1 transition-colors cursor-pointer"
                  title="Cambiar cantidad del último producto (Atajo: F4)"
                >
                  <Zap className="w-3 h-3" />
                  <span className="hidden sm:inline">Cambiar Cantidad (F4)</span>
                </button>

                <button
                  onClick={clearCart}
                  className="text-xs text-rose-300 hover:text-white font-black flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Vaciar Lista</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Tabla o Estado Vacío con contenedor scrollable dedicado */}
        {cart.length === 0 ? (
          <div className="p-8 sm:p-12 flex flex-col items-center justify-center text-center space-y-2">
            <EmptyCartIllustration className="w-28 h-28 sm:w-32 sm:h-32" />
            <div>
              <p className="text-sm sm:text-base font-black text-[var(--text-main)]">La lista de venta está vacía</p>
              <p className="text-xs text-[var(--text-muted)] max-w-md mt-0.5">
                Utiliza el lector de código de barras o escribe el código o nombre arriba y presiona <strong>ENTER</strong> para comenzar.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[calc(100vh-320px)] min-h-[260px] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 z-10 clay-card-subtle border-b border-[var(--clay-card-border)] text-[10px] font-black uppercase text-[var(--text-muted)] tracking-wider">
                <tr>
                  <th className="py-2.5 px-3 w-12 text-center">#</th>
                  <th className="py-2.5 px-3">Código / Barcode</th>
                  <th className="py-2.5 px-3">Descripción del Producto</th>
                  <th className="py-2.5 px-3 w-36 text-center">Cantidad</th>
                  <th className="py-2.5 px-3 text-right">Precio ($)</th>
                  <th className="py-2.5 px-3 text-right">Total ($)</th>
                  <th className="py-2.5 px-3 text-right">Total (Bs.)</th>
                  <th className="py-2.5 px-3 w-14 text-center">Quitar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--clay-card-border)] font-medium">
                {cart.map((item, index) => (
                  <tr key={item.productId} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-[var(--text-muted)]">
                      {index + 1}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-[var(--text-muted)]">
                      {item.barcode || item.sku}
                    </td>
                    <td className="py-2.5 px-3 font-black text-[var(--text-main)] text-xs sm:text-sm">
                      {item.productName}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                          className="w-6 h-6 rounded-lg clay-btn clay-btn-surface flex items-center justify-center text-[var(--text-main)] font-black cursor-pointer shadow-xs active:scale-95"
                          title="Restar 1"
                        >
                          <Minus className="w-3 h-3 stroke-[3]" />
                        </button>
                        
                        <input
                          type="number"
                          min="1"
                          max={item.maxStock}
                          value={item.quantity}
                          onFocus={(e) => e.target.select()}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              barcodeInputRef.current?.focus();
                            }
                          }}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            if (!isNaN(val)) updateQuantity(item.productId, val);
                          }}
                          className="w-12 py-1 text-center font-black text-xs clay-input text-[var(--text-main)] focus:outline-none font-mono"
                          title="Escribe la cantidad y presiona ENTER"
                        />

                        <button
                          type="button"
                          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                          disabled={item.quantity >= item.maxStock}
                          className="w-6 h-6 rounded-lg clay-btn clay-btn-amber flex items-center justify-center text-slate-950 font-black cursor-pointer shadow-xs active:scale-95 disabled:opacity-40"
                          title="Sumar 1"
                        >
                          <Plus className="w-3 h-3 stroke-[3]" />
                        </button>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-[var(--text-main)] font-mono">
                      {formatUSD(item.unitPriceUSD)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-black text-[var(--text-main)] text-xs sm:text-sm font-mono">
                      {formatUSD(item.subtotalUSD)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-black text-emerald-600 dark:text-emerald-400 text-xs font-mono">
                      {formatLocal(item.subtotalUSD * rate, currSymbol, currCode)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.productId)}
                        className="w-6 h-6 rounded-lg clay-btn clay-btn-rose text-white flex items-center justify-center cursor-pointer shadow-xs active:scale-95 mx-auto"
                        title="Eliminar este artículo del ticket"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: CAMBIO ULTRARRÁPIDO DE CANTIDAD (F4 o tecla *)                    */}
      {/* ========================================================================= */}
      {isQuickQtyModalOpen && quickQtyTargetItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="w-full max-w-sm clay-card p-5 space-y-4 shadow-2xl border-2 border-amber-500/40">
            <div className="flex items-center justify-between border-b border-[var(--clay-card-border)] pb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-xl">⚡</span>
                <div>
                  <h3 className="text-sm font-black text-[var(--text-main)] uppercase tracking-wide">
                    Cambiar Cantidad
                  </h3>
                  <p className="text-[11px] text-[var(--text-muted)] truncate max-w-[200px]">
                    {quickQtyTargetItem.productName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsQuickQtyModalOpen(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-main)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleQuickQtyModalSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-[var(--text-muted)] block mb-1.5">
                  Nueva cantidad (Disponibles en inventario: {quickQtyTargetItem.maxStock} uds):
                </label>
                <input
                  ref={quickQtyModalInputRef}
                  type="number"
                  min="1"
                  max={quickQtyTargetItem.maxStock}
                  value={quickQtyModalValue}
                  onChange={(e) => setQuickQtyModalValue(e.target.value)}
                  className="w-full py-3 text-center text-3xl font-black font-mono clay-input text-amber-500 focus:outline-none"
                  placeholder="1"
                />
              </div>

              {/* Botones de cantidades frecuentes */}
              <div className="grid grid-cols-4 gap-1.5 pt-1">
                {[2, 3, 5, 6, 10, 12, 20, 24].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => {
                      setQuickQtyModalValue(String(n));
                      quickQtyModalInputRef.current?.focus();
                    }}
                    className="py-1.5 clay-card-subtle hover:bg-amber-500/20 text-xs font-black text-[var(--text-main)] rounded-xl"
                  >
                    {n} uds
                  </button>
                ))}
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsQuickQtyModalOpen(false)}
                  className="w-1/3 py-2.5 clay-btn clay-btn-surface text-[var(--text-main)] text-xs font-bold"
                >
                  Cancelar (Esc)
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-2.5 clay-btn clay-btn-amber text-slate-950 text-xs font-black shadow-md flex items-center justify-center gap-1.5"
                >
                  <span>Guardar (Enter)</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: CREACIÓN RÁPIDA DE CLIENTE                                       */}
      {/* ========================================================================= */}
      {isNewCustomerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md clay-card p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--clay-card-border)] pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-amber-500 stroke-[2.5]" />
                <h3 className="text-sm font-black text-[var(--text-main)] uppercase tracking-wider">
                  Nuevo Cliente Rápido
                </h3>
              </div>
              <button
                onClick={() => setIsNewCustomerModalOpen(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-main)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-3">
              <div>
                <label className="text-[10px] font-black uppercase text-[var(--text-muted)] block mb-1">
                  Nombre Completo / Razón Social: *
                </label>
                <input
                  type="text"
                  required
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  placeholder="Ej: Juan Pérez"
                  className="w-full px-3 py-2.5 clay-input text-xs font-bold text-[var(--text-main)] focus:outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-[var(--text-muted)] block mb-1">
                  Cédula o RIF:
                </label>
                <input
                  type="text"
                  value={newCustomerTaxId}
                  onChange={(e) => setNewCustomerTaxId(e.target.value)}
                  placeholder="Ej: V-18456789 o J-30123456-7"
                  className="w-full px-3 py-2.5 clay-input text-xs font-mono font-bold text-[var(--text-main)] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-[var(--text-muted)] block mb-1">
                  Teléfono / WhatsApp:
                </label>
                <input
                  type="tel"
                  value={newCustomerPhone}
                  onChange={(e) => setNewCustomerPhone(e.target.value)}
                  placeholder="Ej: 0414-1234567"
                  className="w-full px-3 py-2.5 clay-input text-xs font-mono font-bold text-[var(--text-main)] focus:outline-none"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-[var(--clay-card-border)]">
                <button
                  type="button"
                  onClick={() => setIsNewCustomerModalOpen(false)}
                  className="px-4 py-2.5 clay-btn clay-btn-surface text-[var(--text-main)] font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 clay-btn clay-btn-emerald text-white font-black text-xs shadow-md"
                >
                  Guardar y Seleccionar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        subtotalUSD={rawSubtotalUSD}
        discountUSD={discountAmountUSD}
        taxUSD={taxAmountUSD}
        totalUSD={totalUSD}
        customer={selectedCustomer}
        cartItems={cart}
        onSaleCompleted={(sale) => {
          setCompletedSale(sale);
          clearCart();
        }}
      />

      {/* Printable Receipt Modal for Sales */}
      <ReceiptModal
        isOpen={!!completedSale}
        sale={completedSale}
        onClose={() => setCompletedSale(null)}
      />

      {/* Customer Abono Modal (Directly accessible from POS) */}
      <CustomerAbonoModal
        customer={selectedCustomer}
        isOpen={isAbonoModalOpen}
        onClose={() => setIsAbonoModalOpen(false)}
        onAbonoCompleted={(sale) => setCompletedAbonoSale(sale)}
      />

      {/* Printable Receipt Modal for Abonos */}
      <ReceiptModal
        isOpen={!!completedAbonoSale}
        sale={completedAbonoSale}
        onClose={() => setCompletedAbonoSale(null)}
      />

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onProductFound={(product) => {
          addProductToCart(product, quickQty);
        }}
      />
    </div>
  );
};
