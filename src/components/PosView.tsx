import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { Product, Customer, Sale } from '../types';
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
  Keyboard
} from 'lucide-react';
import { formatUSD, formatLocal, formatDual } from '../utils/formatters';
import { CheckoutModal } from './CheckoutModal';
import { ReceiptModal } from './ReceiptModal';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { CustomerAbonoModal } from './CustomerAbonoModal';
import { EmptyCartIllustration } from './illustrations/VectorIllustrations';

interface CartItem {
  productId: string;
  productName: string;
  sku: string;
  barcode?: string;
  quantity: number;
  unitPriceUSD: number;
  subtotalUSD: number;
  costUSD: number;
  maxStock: number;
}

export const PosView: React.FC = () => {
  const { state, licenseInfo, setIsLicenseModalOpen, addCustomer } = useStore();
  const rate = state.settings.exchangeRate;
  const currSymbol = state.settings.secondaryCurrency.symbol;
  const currCode = state.settings.secondaryCurrency.code;

  // Barcode and cart state
  const [barcodeInput, setBarcodeInput] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('cus-1');
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [applyTax, setApplyTax] = useState<boolean>(true);
  
  // Feedback banners
  const [scanMessage, setScanMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Modals
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false);
  const [isAbonoModalOpen, setIsAbonoModalOpen] = useState(false);
  const [completedAbonoSale, setCompletedAbonoSale] = useState<Sale | null>(null);
  
  // Quick new customer form state
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerTaxId, setNewCustomerTaxId] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');

  // Search suggestions dropdown when typing non-exact barcode
  const [showSuggestions, setShowSuggestions] = useState(false);

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus barcode input on mount and after actions
  useEffect(() => {
    barcodeInputRef.current?.focus();
  }, [cart, isCheckoutOpen, isScannerOpen]);

  // Keyboard shortcut listener (F12 or Ctrl+Enter for checkout)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F12' || (e.ctrlKey && e.key === 'Enter')) {
        e.preventDefault();
        if (cart.length > 0 && !licenseInfo.isExpired) {
          setIsCheckoutOpen(true);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, licenseInfo.isExpired]);

  const selectedCustomer = useMemo(() => {
    return state.customers.find(c => c.id === selectedCustomerId) || null;
  }, [state.customers, selectedCustomerId]);

  // Product suggestions based on input
  const suggestions = useMemo(() => {
    const query = barcodeInput.trim().toLowerCase();
    if (!query || query.length < 2) return [];
    return state.products.filter(p => 
      p.name.toLowerCase().includes(query) ||
      p.sku.toLowerCase().includes(query) ||
      (p.barcode && p.barcode.toLowerCase().includes(query))
    ).slice(0, 5);
  }, [state.products, barcodeInput]);

  // Add product to cart helper
  const addProductToCart = (product: Product, quantityToAdd = 1) => {
    if (product.stock <= 0) {
      setScanMessage({ text: `El producto "${product.name}" está agotado en inventario.`, type: 'error' });
      setTimeout(() => setScanMessage(null), 3000);
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        const nextQty = existing.quantity + quantityToAdd;
        if (nextQty > product.stock) {
          setScanMessage({ 
            text: `Stock máximo alcanzado para "${product.name}" (${product.stock} disponibles).`, 
            type: 'error' 
          });
          setTimeout(() => setScanMessage(null), 3000);
          return prev;
        }
        setScanMessage({ text: `✓ Cantidad sumada: ${product.name} (Total: ${nextQty})`, type: 'success' });
        setTimeout(() => setScanMessage(null), 2500);
        return prev.map(item => 
          item.productId === product.id 
            ? { ...item, quantity: nextQty, subtotalUSD: nextQty * item.unitPriceUSD }
            : item
        );
      }

      const initialQty = Math.min(quantityToAdd, product.stock);
      setScanMessage({ text: `✓ Producto ingresado: ${product.name}`, type: 'success' });
      setTimeout(() => setScanMessage(null), 2500);

      return [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          barcode: product.barcode,
          quantity: initialQty,
          unitPriceUSD: product.priceUSD,
          subtotalUSD: initialQty * product.priceUSD,
          costUSD: product.costUSD,
          maxStock: product.stock
        }
      ];
    });

    setBarcodeInput('');
    setShowSuggestions(false);
    barcodeInputRef.current?.focus();
  };

  // Handle Enter key in barcode field
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = barcodeInput.trim();
    if (!raw) return;

    // Check for quantity multiplier e.g. "3*7591234"
    let multiplier = 1;
    let code = raw;
    if (raw.includes('*')) {
      const parts = raw.split('*');
      const parsedMult = parseInt(parts[0], 10);
      if (!isNaN(parsedMult) && parsedMult > 0 && parts[1]) {
        multiplier = parsedMult;
        code = parts[1].trim();
      }
    }

    // Exact barcode match first
    let matchedProduct = state.products.find(p => p.barcode && p.barcode.toLowerCase() === code.toLowerCase());

    // If not by barcode, check exact SKU
    if (!matchedProduct) {
      matchedProduct = state.products.find(p => p.sku.toLowerCase() === code.toLowerCase());
    }

    // If not exact SKU, check exact name
    if (!matchedProduct) {
      matchedProduct = state.products.find(p => p.name.toLowerCase() === code.toLowerCase());
    }

    // If still not matched, check if there is only 1 partial match
    if (!matchedProduct) {
      const partials = state.products.filter(p => 
        p.name.toLowerCase().includes(code.toLowerCase()) ||
        p.sku.toLowerCase().includes(code.toLowerCase())
      );
      if (partials.length === 1) {
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
    setCart([]);
    barcodeInputRef.current?.focus();
  };

  // Calculations
  const rawSubtotalUSD = cart.reduce((acc, item) => acc + item.subtotalUSD, 0);
  const discountAmountUSD = (rawSubtotalUSD * discountPercent) / 100;
  const taxableAmountUSD = Math.max(0, rawSubtotalUSD - discountAmountUSD);
  const taxAmountUSD = applyTax ? (taxableAmountUSD * state.settings.taxPercentage) / 100 : 0;
  const totalUSD = taxableAmountUSD + taxAmountUSD;
  const totalLocal = totalUSD * rate;
  const totalItemsCount = cart.reduce((acc, i) => acc + i.quantity, 0);

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-4">
      
      {/* ========================================================================= */}
      {/* 1. PARTE SUPERIOR: 2 RECTÁNGULOS (APILADOS EN MÓVIL, LADO A LADO EN PC)  */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 items-stretch">
        
        {/* RECTÁNGULO INFORMACIÓN DEL CLIENTE (3D CLAY) */}
        <div className="col-span-1 md:col-span-5 clay-card p-4 sm:p-5 flex flex-col justify-between">
          <div className="space-y-3">
            {/* Encabezado: Icono + Palabra "Cliente:" + Botón "+ Nuevo" */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-2xl clay-btn clay-btn-surface flex items-center justify-center text-sm shadow-sm select-none">
                  👤
                </div>
                <span className="text-xs sm:text-sm font-black uppercase text-[var(--text-main)] tracking-wider">
                  Cliente:
                </span>
              </div>

              <button
                type="button"
                onClick={() => setIsNewCustomerModalOpen(true)}
                className="px-3 py-1.5 clay-btn clay-btn-amber text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-sm active:translate-y-0.5 cursor-pointer transition-all shrink-0"
                title="Registrar nuevo cliente"
              >
                <UserPlus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>+ Nuevo</span>
              </button>
            </div>

            {/* Recuadro de Abajo: Contiene directamente el selector y la información sin duplicar el nombre */}
            <div className="clay-card-subtle p-3 sm:p-3.5 space-y-2.5">
              {/* Campo de selección de cliente incluido directamente aquí */}
              <div>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full px-3 py-2.5 clay-input text-xs sm:text-sm font-black text-[var(--text-main)] cursor-pointer transition-colors"
                >
                  {state.customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.taxId ? `(${c.taxId})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Ficha Detallada: Cédula/RIF y Teléfono */}
              {selectedCustomer && (
                <div className="pt-2 border-t border-[var(--clay-card-border)] space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="min-w-0">
                      <span className="text-[10px] text-[var(--text-muted)] font-bold block uppercase tracking-wider">
                        Cédula / RIF:
                      </span>
                      <span className="font-mono font-black text-[var(--text-main)] truncate block text-xs sm:text-sm">
                        {selectedCustomer.taxId || 'No registrado'}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <span className="text-[10px] text-[var(--text-muted)] font-bold block uppercase tracking-wider">
                        Teléfono:
                      </span>
                      <span className="font-mono font-bold text-[var(--text-main)] truncate block text-xs sm:text-sm">
                        {selectedCustomer.phone || 'No registrado'}
                      </span>
                    </div>
                  </div>
                  
                  {/* Deuda pendiente si tiene */}
                  {selectedCustomer.currentDebtUSD > 0 && (
                    <div className="pt-2 border-t border-rose-200/50 flex justify-between items-center text-rose-600 font-black text-xs gap-2">
                      <span className="flex items-center gap-1.5 min-w-0">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">Fiado Pendiente:</span>
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="clay-badge bg-rose-100 text-rose-800 font-mono font-black">
                          {formatUSD(selectedCustomer.currentDebtUSD)}
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsAbonoModalOpen(true)}
                          className="px-3 py-1 clay-btn clay-btn-emerald text-white text-[11px] font-black cursor-pointer shadow-sm"
                        >
                          + Abonar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RECTÁNGULO TOTAL A COBRAR Y BOTÓN DE COBRO (3D CLAY) */}
        <div className="col-span-1 md:col-span-7 clay-card-dark p-4 sm:p-5 flex flex-col justify-between shadow-xl">
          {/* Banner del Gran Total */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-black/30 border border-white/10 shadow-inner flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-300">
                  TOTAL A COBRAR
                </span>
                <span className="text-[10px] clay-badge clay-btn-amber text-slate-950 font-black px-2 py-0.5 shrink-0">
                  {totalItemsCount} {totalItemsCount === 1 ? 'artículo' : 'artículos'}
                </span>
              </div>
              <div className="text-xs sm:text-sm font-black text-emerald-300 truncate">
                ≈ {formatLocal(totalLocal, currSymbol, currCode)}
              </div>
            </div>

            <div className="text-right shrink-0">
              <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-amber-300 leading-none tracking-tight whitespace-nowrap">
                {formatUSD(totalUSD)}
              </div>
              <div className="text-[10px] text-slate-400 font-bold mt-1">
                Tasa: 1$ = {rate.toFixed(2)} {currSymbol}
              </div>
            </div>
          </div>

          {/* Botón de Cobro Gigante en 3D Claymorphic */}
          <div className="pt-3">
            {licenseInfo.isExpired ? (
              <button
                type="button"
                onClick={() => setIsLicenseModalOpen(true)}
                className="w-full py-3.5 clay-btn clay-btn-rose text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg"
              >
                <span>⚠️ DEMO VENCIDA • ACTIVAR LICENCIA</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsCheckoutOpen(true)}
                disabled={cart.length === 0}
                className="w-full py-3.5 sm:py-4 clay-btn clay-btn-emerald disabled:opacity-40 text-white font-black text-sm sm:text-base md:text-lg flex items-center justify-center gap-2 shadow-xl cursor-pointer tracking-wide"
              >
                <CreditCard className="w-5 h-5 stroke-[2.5] shrink-0" />
                <span className="truncate">COBRAR TRANSACCIÓN (F12) • {cart.length} PROD.</span>
              </button>
            )}
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 2. PARTE INFERIOR: CAMPO DE INSERCIÓN DEL CÓDIGO DE BARRAS (3D CLAY)      */}
      {/* ========================================================================= */}
      <div className="relative">
        <form onSubmit={handleBarcodeSubmit} className="clay-card p-3 sm:p-4 flex flex-col sm:flex-row gap-2.5 items-stretch shadow-md">
          
          <div className="relative flex-1">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-[var(--text-muted)] pointer-events-none">
              <Barcode className="w-5 h-5 stroke-[2.5]" />
            </div>

            <input
              ref={barcodeInputRef}
              type="text"
              value={barcodeInput}
              onChange={(e) => {
                setBarcodeInput(e.target.value);
                setShowSuggestions(true);
              }}
              placeholder="Escanear código con pistola, escribir código o nombre (Ej: 759123 o Harina) + ENTER..."
              className="w-full pl-11 pr-24 py-3 clay-input text-sm sm:text-base font-black text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:outline-none transition-all font-mono"
            />

            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black px-2 py-1 clay-badge clay-card-subtle text-[var(--text-muted)] hidden sm:inline">
              ↵ ENTER
            </span>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="submit"
              className="px-5 py-3 clay-btn clay-btn-amber text-slate-950 text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Agregar</span>
            </button>

            <button
              type="button"
              onClick={() => setIsScannerOpen(true)}
              className="px-4 py-3 clay-btn clay-btn-surface text-[var(--text-main)] text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer"
              title="Abrir cámara del teléfono o PC como lector de código de barras"
            >
              <Barcode className="w-4 h-4 stroke-[2.5]" />
              <span className="hidden md:inline">Cámara</span>
            </button>
          </div>
        </form>

        {/* Dropdown de Sugerencias Rápidas si escribe texto */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-30 mt-2 clay-card shadow-2xl overflow-hidden divide-y divide-[var(--clay-card-border)]">
            <div className="p-2.5 clay-card-subtle text-[10px] font-black uppercase text-[var(--text-muted)] flex justify-between items-center">
              <span>Sugerencias rápidas encontradas:</span>
              <button onClick={() => setShowSuggestions(false)} className="text-[var(--text-muted)] hover:text-[var(--text-main)]">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            {suggestions.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => addProductToCart(p, 1)}
                className="w-full p-3 text-left flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-xs cursor-pointer"
              >
                <div>
                  <div className="font-black text-[var(--text-main)]">{p.name}</div>
                  <div className="text-[10px] text-[var(--text-muted)] font-mono">
                    Código: {p.barcode || p.sku} · Stock: {p.stock}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-black text-[var(--text-main)]">{formatUSD(p.priceUSD)}</div>
                  <div className="text-[10px] font-bold text-emerald-600">
                    {formatLocal(p.priceUSD * rate, currSymbol, currCode)}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Notificación de Escaneo / Error */}
        {scanMessage && (
          <div className={`mt-2 p-3 rounded-2xl clay-card-subtle text-xs font-black flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-150 ${
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

      {/* ========================================================================= */}
      {/* 3. DEBAJO: LISTA / TABLA DE LOS PRODUCTOS QUE SE VAN REGISTRANDO (3D CLAY) */}
      {/* ========================================================================= */}
      <div className="clay-card overflow-hidden shadow-xl">
        
        {/* Cabecera de la Lista */}
        <div className="p-3 sm:p-4 clay-card-dark flex items-center justify-between border-b border-[var(--clay-card-border)]">
          <div className="flex items-center gap-2">
            <span className="text-base">📋</span>
            <h4 className="font-black text-white text-xs sm:text-sm uppercase tracking-wider">
              Productos en Ticket de Venta ({cart.length})
            </h4>
          </div>

          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="text-xs text-rose-300 hover:text-white font-black flex items-center gap-1 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Vaciar Lista</span>
            </button>
          )}
        </div>

        {/* Tabla o Estado Vacío */}
        {cart.length === 0 ? (
          <div className="p-10 sm:p-14 flex flex-col items-center justify-center text-center space-y-3">
            <EmptyCartIllustration className="w-36 h-36" />
            <div>
              <p className="text-base font-black text-[var(--text-main)]">La lista de venta está vacía</p>
              <p className="text-xs text-[var(--text-muted)] max-w-md mt-1">
                Utiliza el lector de código de barras, escribe el código arriba y presiona <strong>ENTER</strong>, o usa la cámara para comenzar a registrar productos.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="clay-card-subtle border-b border-[var(--clay-card-border)] text-[10px] font-black uppercase text-[var(--text-muted)] tracking-wider">
                <tr>
                  <th className="py-3 px-3 w-12 text-center">#</th>
                  <th className="py-3 px-3">Código / Barcode</th>
                  <th className="py-3 px-3">Descripción del Producto</th>
                  <th className="py-3 px-3 w-36 text-center">Cantidad</th>
                  <th className="py-3 px-3 text-right">Precio ($)</th>
                  <th className="py-3 px-3 text-right">Total ($)</th>
                  <th className="py-3 px-3 text-right">Total (Bs.)</th>
                  <th className="py-3 px-3 w-16 text-center">Quitar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--clay-card-border)] font-medium">
                {cart.map((item, index) => (
                  <tr key={item.productId} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                    <td className="py-3.5 px-3 text-center font-mono font-bold text-[var(--text-muted)]">
                      {index + 1}
                    </td>
                    <td className="py-3.5 px-3 font-mono font-bold text-[var(--text-muted)]">
                      {item.barcode || item.sku}
                    </td>
                    <td className="py-3.5 px-3 font-black text-[var(--text-main)] text-sm">
                      {item.productName}
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                          className="w-7 h-7 rounded-xl clay-btn clay-btn-surface flex items-center justify-center text-[var(--text-main)] font-black cursor-pointer shadow-sm"
                        >
                          <Minus className="w-3.5 h-3.5 stroke-[3]" />
                        </button>
                        
                        <input
                          type="number"
                          min="1"
                          max={item.maxStock}
                          value={item.quantity}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            if (!isNaN(val)) updateQuantity(item.productId, val);
                          }}
                          className="w-12 py-1 text-center font-black text-xs sm:text-sm clay-input text-[var(--text-main)] focus:outline-none"
                        />

                        <button
                          type="button"
                          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                          disabled={item.quantity >= item.maxStock}
                          className="w-7 h-7 rounded-xl clay-btn clay-btn-amber flex items-center justify-center text-slate-950 font-black cursor-pointer shadow-sm disabled:opacity-40"
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[3]" />
                        </button>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-right font-bold text-[var(--text-main)] font-mono">
                      {formatUSD(item.unitPriceUSD)}
                    </td>
                    <td className="py-3.5 px-3 text-right font-black text-[var(--text-main)] text-sm font-mono">
                      {formatUSD(item.subtotalUSD)}
                    </td>
                    <td className="py-3.5 px-3 text-right font-black text-emerald-600 dark:text-emerald-400 text-xs font-mono">
                      {formatLocal(item.subtotalUSD * rate, currSymbol, currCode)}
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.productId)}
                        className="p-1.5 text-[var(--text-muted)] hover:text-rose-600 rounded-xl hover:bg-rose-50/20 transition-colors cursor-pointer"
                        title="Eliminar fila"
                      >
                        <Trash2 className="w-4 h-4 mx-auto" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Barra de Resumen al pie de la tabla */}
        {cart.length > 0 && (
          <div className="p-3 sm:p-4 clay-card-subtle border-t border-[var(--clay-card-border)] flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="text-[var(--text-muted)] font-bold flex items-center gap-2">
              <Keyboard className="w-4 h-4 text-[var(--text-muted)]" />
              <span>Atajo de teclado: presiona <strong>F12</strong> o <strong>Ctrl + Enter</strong> para cobrar inmediatamente.</span>
            </div>
            <div className="flex items-center gap-4 text-sm font-black text-[var(--text-main)]">
              <span>Total ítems: <strong>{totalItemsCount}</strong></span>
              <span>Total a pagar: <strong className="text-amber-500 text-base">{formatUSD(totalUSD)}</strong></span>
            </div>
          </div>
        )}

      </div>

      {/* ========================================================================= */}
      {/* MODAL RÁPIDO PARA CREAR CLIENTE NUEVO DESDE CAJA (3D CLAY)                */}
      {/* ========================================================================= */}
      {isNewCustomerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="clay-card w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-4 clay-card-dark flex justify-between items-center border-b border-[var(--clay-card-border)]">
              <div className="flex items-center gap-2">
                <span className="text-lg">👤</span>
                <h4 className="font-black text-sm text-white">Registrar Nuevo Cliente Rápido</h4>
              </div>
              <button 
                onClick={() => setIsNewCustomerModalOpen(false)} 
                className="w-8 h-8 rounded-xl clay-btn clay-btn-surface text-[var(--text-main)] flex items-center justify-center"
              >
                <X className="w-4 h-4 stroke-[3]" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="p-5 space-y-3.5">
              <div>
                <label className="text-[10px] font-black uppercase text-[var(--text-muted)] block mb-1">
                  Nombre Completo / Razón Social: *
                </label>
                <input
                  type="text"
                  required
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  placeholder="Ej: María Pérez o Abasto El Triunfo"
                  className="w-full px-3 py-2.5 clay-input text-xs font-bold text-[var(--text-main)] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-[var(--text-muted)] block mb-1">
                  Cédula / RIF / NIT:
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
          addProductToCart(product, 1);
        }}
      />
    </div>
  );
};
