import React, { useState, useRef } from 'react';
import { useStore } from '../context/StoreContext';
import { Purchase, PurchaseItem, Supplier } from '../types';
import { 
  FileScan, 
  Upload, 
  Camera, 
  Sparkles, 
  Check, 
  AlertCircle, 
  Plus, 
  Trash2, 
  Building2, 
  Calendar, 
  DollarSign, 
  Clock, 
  Eye, 
  X, 
  RefreshCw, 
  ShoppingBag,
  FileText,
  Coins,
  ArrowRightLeft,
  Hash
} from 'lucide-react';
import { formatUSD, formatLocal, formatDate, formatDateTime } from '../utils/formatters';

interface ScannedItem {
  code?: string;
  name: string;
  quantity: number;
  unitCostOriginal: number;
  totalCostOriginal: number;
  unitCostUSD: number;
  totalCostUSD: number;
  category?: string;
  unit?: string;
}

interface ScannedInvoiceData {
  supplierName: string;
  supplierTaxId?: string;
  supplierPhone?: string;
  supplierAddress?: string;
  invoiceNumber: string;
  invoiceDate?: string;
  currencyDetected?: string;
  currencySymbol?: string;
  exchangeRateOnInvoice?: number;
  subtotalOriginal?: number;
  taxOriginal?: number;
  totalOriginal?: number;
  totalUSD?: number;
  notes?: string;
  items: ScannedItem[];
}

export const PurchasesView: React.FC = () => {
  const { state, addPurchase, addSupplier, licenseInfo, setIsLicenseModalOpen } = useStore();
  const rate = state.settings.exchangeRate;
  const currSymbol = state.settings.secondaryCurrency.symbol;
  const currCode = state.settings.secondaryCurrency.code;

  // Tabs / Active mode
  const [activeTab, setActiveTab] = useState<'history' | 'scan' | 'manual'>('history');

  // Scanner state (supports PDF and images)
  const [selectedFile, setSelectedFile] = useState<{
    dataUrl: string;
    name: string;
    type: string;
    size: number;
  } | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Interactive scanned invoice data & currency controls
  const [scannedData, setScannedData] = useState<ScannedInvoiceData | null>(null);
  const [appliedCurrency, setAppliedCurrency] = useState<'VES' | 'USD' | 'OTRA'>('VES');
  const [appliedExchangeRate, setAppliedExchangeRate] = useState<number>(rate);

  // Manual purchase form state
  const [manualSupplierId, setManualSupplierId] = useState<string>(state.suppliers[0]?.id || '');
  const [manualSupplierName, setManualSupplierName] = useState<string>('');
  const [manualInvoiceNum, setManualInvoiceNum] = useState<string>('');
  const [manualPaymentStatus, setManualPaymentStatus] = useState<'paid' | 'pending'>('paid');
  const [manualPaymentMethod, setManualPaymentMethod] = useState<string>('Transferencia Bancaria');
  const [manualItems, setManualItems] = useState<Array<{
    productId: string;
    productName: string;
    sku: string;
    quantity: number;
    unitCostUSD: number;
    totalCostUSD: number;
  }>>([
    {
      productId: state.products[0]?.id || '',
      productName: state.products[0]?.name || '',
      sku: state.products[0]?.sku || '',
      quantity: 10,
      unitCostUSD: state.products[0]?.costUSD || 1.0,
      totalCostUSD: (state.products[0]?.costUSD || 1.0) * 10
    }
  ]);

  // Selected purchase for detail modal
  const [viewingPurchase, setViewingPurchase] = useState<Purchase | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Process and optimize file upload (PDF or Image)
  const handleIncomingFile = async (file: File) => {
    setScanError(null);
    setScannedData(null);

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isImage = file.type.startsWith('image/');

    if (!isPdf && !isImage) {
      setScanError('Por favor seleccione un archivo PDF o una imagen válida (JPG, PNG, WEBP).');
      return;
    }

    try {
      if (isPdf) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const fullDataUrl = (e.target?.result as string) || '';
          const commaIdx = fullDataUrl.indexOf(',');
          const base64 = commaIdx >= 0 ? fullDataUrl.substring(commaIdx + 1).replace(/\s+/g, '') : fullDataUrl.replace(/\s+/g, '');
          setSelectedFile({
            dataUrl: fullDataUrl,
            name: file.name,
            type: 'application/pdf',
            size: file.size
          });
        };
        reader.readAsDataURL(file);
      } else {
        // Image: auto-orient & optimize to max 2048px for instant, high-precision OCR
        const reader = new FileReader();
        reader.onload = (e) => {
          const rawUrl = (e.target?.result as string) || '';
          const img = new Image();
          img.onload = () => {
            const MAX_DIM = 2048;
            let w = img.width;
            let h = img.height;
            if (w > MAX_DIM || h > MAX_DIM) {
              if (w > h) {
                h = Math.round((h * MAX_DIM) / w);
                w = MAX_DIM;
              } else {
                w = Math.round((w * MAX_DIM) / h);
                h = MAX_DIM;
              }
            }

            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, w, h);
              const optimizedDataUrl = canvas.toDataURL('image/jpeg', 0.90);
              setSelectedFile({
                dataUrl: optimizedDataUrl,
                name: file.name,
                type: 'image/jpeg',
                size: Math.round((optimizedDataUrl.length * 3) / 4)
              });
            } else {
              setSelectedFile({
                dataUrl: rawUrl,
                name: file.name,
                type: file.type || 'image/jpeg',
                size: file.size
              });
            }
          };
          img.onerror = () => {
            setSelectedFile({
              dataUrl: rawUrl,
              name: file.name,
              type: file.type || 'image/jpeg',
              size: file.size
            });
          };
          img.src = rawUrl;
        };
        reader.readAsDataURL(file);
      }
    } catch (err: any) {
      console.error('File load error:', err);
      setScanError('Error al leer el archivo. Intente nuevamente.');
    }
  };

  // Run Gemini OCR extraction via backend
  const handleProcessScan = async () => {
    if (!selectedFile) return;

    setIsScanning(true);
    setScanError(null);

    try {
      // Safely extract pure base64 without regex failures
      const fullUrl = selectedFile.dataUrl;
      const commaIdx = fullUrl.indexOf(',');
      const rawBase64 = commaIdx >= 0 ? fullUrl.substring(commaIdx + 1) : fullUrl;
      const cleanBase64 = rawBase64.replace(/\s+/g, '');
      const mimeType = selectedFile.type || (selectedFile.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');

      const res = await fetch('/api/scan-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          imageBase64: cleanBase64, 
          mimeType,
          currentExchangeRate: rate,
          localCurrencyCode: currCode,
          localCurrencySymbol: currSymbol
        })
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        const detail = json.details ? ` (${json.details})` : '';
        throw new Error((json.error || 'Error analizando la factura con IA') + detail);
      }

      const data: ScannedInvoiceData = json.data;
      const isUSD = data.currencyDetected === 'USD';
      const invoiceRate = (data.exchangeRateOnInvoice && Number(data.exchangeRateOnInvoice) > 0)
        ? Number(data.exchangeRateOnInvoice)
        : rate;

      setAppliedCurrency(isUSD ? 'USD' : 'VES');
      setAppliedExchangeRate(invoiceRate);
      
      // Ensure all items have valid numbers and normalized fields
      const formattedItems = (data.items || []).map(item => {
        const qty = Number(item.quantity) || 1;
        const origCost = Number(item.unitCostOriginal) || Number(item.unitCostUSD) || 0;
        let usdCost = Number(item.unitCostUSD);
        if (!usdCost || usdCost <= 0) {
          usdCost = isUSD ? origCost : Number((origCost / invoiceRate).toFixed(4));
        }
        return {
          ...item,
          code: item.code || '',
          quantity: qty,
          unitCostOriginal: origCost,
          totalCostOriginal: Number((origCost * qty).toFixed(2)),
          unitCostUSD: usdCost,
          totalCostUSD: Number((usdCost * qty).toFixed(2))
        };
      });

      const sumUSD = Number(formattedItems.reduce((acc, i) => acc + i.totalCostUSD, 0).toFixed(2));

      setScannedData({
        ...data,
        items: formattedItems,
        totalUSD: sumUSD
      });
    } catch (err: any) {
      console.error('Scan error:', err);
      setScanError(err.message || 'Error al procesar el archivo. Asegúrese de que sea un PDF o foto legible.');
    } finally {
      setIsScanning(false);
    }
  };

  // Recalculate all item costs when currency or exchange rate changes
  const recalculateAllWithRate = (newRate: number, currType: 'VES' | 'USD' | 'OTRA') => {
    if (!scannedData) return;
    const effRate = newRate > 0 ? newRate : 1;
    const updatedItems = scannedData.items.map(item => {
      const orig = Number(item.unitCostOriginal) || 0;
      const qty = Number(item.quantity) || 1;
      const unitUSD = currType === 'USD' ? orig : Number((orig / effRate).toFixed(4));
      const totUSD = Number((unitUSD * qty).toFixed(2));
      return {
        ...item,
        unitCostUSD: unitUSD,
        totalCostUSD: totUSD
      };
    });

    const sumUSD = Number(updatedItems.reduce((acc, i) => acc + i.totalCostUSD, 0).toFixed(2));
    setScannedData({
      ...scannedData,
      items: updatedItems,
      totalUSD: sumUSD
    });
  };

  const handleCurrencyChange = (newCurr: 'VES' | 'USD') => {
    setAppliedCurrency(newCurr);
    recalculateAllWithRate(appliedExchangeRate, newCurr);
  };

  const handleRateChange = (newRate: number) => {
    const validRate = newRate > 0 ? newRate : 1;
    setAppliedExchangeRate(validRate);
    recalculateAllWithRate(validRate, appliedCurrency);
  };

  const handleUpdateItemOriginalCost = (index: number, val: number) => {
    if (!scannedData) return;
    const updated = [...scannedData.items];
    const item = { ...updated[index] };
    const costOrig = Math.max(0, val);
    item.unitCostOriginal = costOrig;
    item.totalCostOriginal = Number((costOrig * item.quantity).toFixed(2));
    if (appliedCurrency === 'USD') {
      item.unitCostUSD = costOrig;
    } else {
      const effRate = appliedExchangeRate > 0 ? appliedExchangeRate : 1;
      item.unitCostUSD = Number((costOrig / effRate).toFixed(4));
    }
    item.totalCostUSD = Number((item.unitCostUSD * item.quantity).toFixed(2));
    updated[index] = item;
    const sumUSD = Number(updated.reduce((acc, i) => acc + i.totalCostUSD, 0).toFixed(2));
    setScannedData({ ...scannedData, items: updated, totalUSD: sumUSD });
  };

  const handleUpdateItemUSDCost = (index: number, val: number) => {
    if (!scannedData) return;
    const updated = [...scannedData.items];
    const item = { ...updated[index] };
    const costUSD = Math.max(0, val);
    item.unitCostUSD = costUSD;
    item.totalCostUSD = Number((costUSD * item.quantity).toFixed(2));
    if (appliedCurrency === 'USD') {
      item.unitCostOriginal = costUSD;
    } else {
      item.unitCostOriginal = Number((costUSD * appliedExchangeRate).toFixed(2));
    }
    item.totalCostOriginal = Number((item.unitCostOriginal * item.quantity).toFixed(2));
    updated[index] = item;
    const sumUSD = Number(updated.reduce((acc, i) => acc + i.totalCostUSD, 0).toFixed(2));
    setScannedData({ ...scannedData, items: updated, totalUSD: sumUSD });
  };

  const handleUpdateItemQty = (index: number, qty: number) => {
    if (!scannedData) return;
    const updated = [...scannedData.items];
    const item = { ...updated[index] };
    const validQty = Math.max(1, qty);
    item.quantity = validQty;
    item.totalCostOriginal = Number((item.unitCostOriginal * validQty).toFixed(2));
    item.totalCostUSD = Number((item.unitCostUSD * validQty).toFixed(2));
    updated[index] = item;
    const sumUSD = Number(updated.reduce((acc, i) => acc + i.totalCostUSD, 0).toFixed(2));
    setScannedData({ ...scannedData, items: updated, totalUSD: sumUSD });
  };

  const handleAddItemToScanned = () => {
    if (!scannedData) return;
    const newItem: ScannedItem = {
      code: '',
      name: '',
      quantity: 1,
      unitCostOriginal: appliedCurrency === 'USD' ? 1.0 : appliedExchangeRate,
      totalCostOriginal: appliedCurrency === 'USD' ? 1.0 : appliedExchangeRate,
      unitCostUSD: 1.0,
      totalCostUSD: 1.0,
      category: 'General',
      unit: 'ud'
    };
    const updated = [...scannedData.items, newItem];
    const sumUSD = Number(updated.reduce((acc, i) => acc + i.totalCostUSD, 0).toFixed(2));
    setScannedData({ ...scannedData, items: updated, totalUSD: sumUSD });
  };

  // Confirm and ingest scanned invoice into store inventory
  const handleConfirmScannedPurchase = async () => {
    if (licenseInfo.isExpired) {
      setIsLicenseModalOpen(true);
      alert('Tu período de prueba o licencia ha finalizado. Por favor activa tu licencia comercial para continuar ingresando compras.');
      return;
    }

    if (!scannedData || !scannedData.items || scannedData.items.length === 0) return;

    // Check if supplier exists or create
    let supplier = state.suppliers.find(s => 
      s.name.toLowerCase().trim() === scannedData.supplierName.toLowerCase().trim()
    );

    if (!supplier) {
      supplier = await addSupplier({
        name: scannedData.supplierName.trim() || 'Proveedor General',
        taxId: scannedData.supplierTaxId || 'J-00000000',
        phone: scannedData.supplierPhone || 'N/A',
        email: '',
        address: scannedData.supplierAddress || 'Dirección no especificada',
        paymentTerms: 'Contado'
      });
    }

    const purchaseItems: PurchaseItem[] = scannedData.items.map(item => {
      // match existing product by SKU or name
      const existingProduct = state.products.find(p => 
        (item.code && p.sku.toLowerCase().trim() === item.code.toLowerCase().trim()) ||
        p.name.toLowerCase().trim() === item.name.toLowerCase().trim()
      );
      return {
        productId: existingProduct ? existingProduct.id : `prod-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        productName: item.name.trim() || 'Producto sin nombre',
        sku: existingProduct ? existingProduct.sku : (item.code?.trim() || `SKU-${Math.floor(1000 + Math.random() * 9000)}`),
        quantity: Number(item.quantity) || 1,
        unitCostUSD: Number(item.unitCostUSD) || 0,
        totalCostUSD: Number(item.totalCostUSD) || ((Number(item.quantity) || 1) * (Number(item.unitCostUSD) || 0))
      };
    });

    const totalUSD = Number(purchaseItems.reduce((acc, i) => acc + i.totalCostUSD, 0).toFixed(2));

    await addPurchase({
      invoiceNumber: scannedData.invoiceNumber?.trim() || undefined,
      date: scannedData.invoiceDate ? new Date(scannedData.invoiceDate).toISOString() : new Date().toISOString(),
      supplierId: supplier.id,
      supplierName: supplier.name,
      items: purchaseItems,
      totalUSD: totalUSD,
      totalLocal: Number((totalUSD * appliedExchangeRate).toFixed(2)),
      exchangeRateUsed: appliedExchangeRate,
      paymentStatus: 'paid',
      paymentMethod: 'Factura / Escáner IA',
      notes: `Factura ${scannedData.invoiceNumber || 'S/N'}. Moneda: ${appliedCurrency === 'USD' ? 'USD ($)' : 'VES (' + currSymbol + ')'}. Tasa: ${appliedExchangeRate} ${currSymbol}/USD. Registrada con escáner inteligente.`
    }, true);

    alert(`¡Éxito! Se registraron ${purchaseItems.length} productos y se actualizó el inventario correctamente con sus costos en USD.`);
    setSelectedFile(null);
    setScannedData(null);
    setActiveTab('history');
  };

  // Manual purchase handlers
  const handleAddManualItem = () => {
    const prod = state.products[0];
    setManualItems(prev => [
      ...prev,
      {
        productId: prod?.id || '',
        productName: prod?.name || '',
        sku: prod?.sku || '',
        quantity: 1,
        unitCostUSD: prod?.costUSD || 1.0,
        totalCostUSD: prod?.costUSD || 1.0
      }
    ]);
  };

  const handleUpdateManualItem = (index: number, field: string, value: any) => {
    setManualItems(prev => prev.map((item, idx) => {
      if (idx !== index) return item;
      const updated = { ...item, [field]: value };
      if (field === 'productId') {
        const prod = state.products.find(p => p.id === value);
        if (prod) {
          updated.productName = prod.name;
          updated.sku = prod.sku;
          updated.unitCostUSD = prod.costUSD;
          updated.totalCostUSD = prod.costUSD * updated.quantity;
        }
      }
      if (field === 'quantity' || field === 'unitCostUSD') {
        const qty = field === 'quantity' ? Number(value) : updated.quantity;
        const cost = field === 'unitCostUSD' ? Number(value) : updated.unitCostUSD;
        updated.totalCostUSD = Number((qty * cost).toFixed(2));
      }
      return updated;
    }));
  };

  const handleRemoveManualItem = (index: number) => {
    setManualItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveManualPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (licenseInfo.isExpired) {
      setIsLicenseModalOpen(true);
      alert('Tu período de prueba o licencia ha finalizado. Por favor activa tu licencia comercial para continuar registrando compras.');
      return;
    }

    if (manualItems.length === 0) {
      alert('Debe agregar al menos un producto a la compra');
      return;
    }

    let supplier = state.suppliers.find(s => s.id === manualSupplierId);
    let supplierName = supplier?.name || manualSupplierName || 'Proveedor General';

    const totalUSD = manualItems.reduce((acc, i) => acc + i.totalCostUSD, 0);

    await addPurchase({
      date: new Date().toISOString(),
      supplierId: supplier?.id,
      supplierName,
      items: manualItems,
      totalUSD,
      totalLocal: totalUSD * rate,
      exchangeRateUsed: rate,
      paymentStatus: manualPaymentStatus,
      paymentMethod: manualPaymentMethod,
      notes: manualInvoiceNum ? `N° Factura: ${manualInvoiceNum}` : 'Compra registrada manualmente'
    }, true);

    alert('¡Compra registrada e ingresada al inventario con éxito!');
    setActiveTab('history');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Top Banner & Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <ShoppingBag className="w-6 h-6 text-emerald-600" />
            <span>Módulo de Compras y Carga de Facturas</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Registra abastecimientos de mercancía manualmente o mediante escaneo inteligente con IA.
          </p>
        </div>

        {/* Action Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'history' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Historial de Compras ({state.purchases.length})
          </button>

          <button
            onClick={() => setActiveTab('scan')}
            className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'scan' ? 'bg-emerald-600 text-white shadow-xs' : 'text-emerald-700 hover:bg-emerald-50'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Escanear Factura con IA</span>
          </button>

          <button
            onClick={() => setActiveTab('manual')}
            className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'manual' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Nueva Compra Manual
          </button>
        </div>
      </div>

      {/* TAB 1: AI Invoice Scanner */}
      {activeTab === 'scan' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left Column: File Upload & Camera Capture (5 columns) */}
            <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <FileScan className="w-4 h-4 text-emerald-600" />
                  <span>Carga de Factura (PDF, Imagen o Foto)</span>
                </h3>
                {selectedFile && (
                  <button
                    onClick={() => {
                      setSelectedFile(null);
                      setScannedData(null);
                      setScanError(null);
                    }}
                    className="text-xs text-rose-600 hover:underline font-medium"
                  >
                    Cambiar archivo
                  </button>
                )}
              </div>

              {!selectedFile ? (
                <div 
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) handleIncomingFile(file);
                  }}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all space-y-4 ${
                    isDragging 
                      ? 'border-emerald-500 bg-emerald-50/50' 
                      : 'border-slate-300 hover:border-emerald-400 bg-slate-50/70 hover:bg-emerald-50/20'
                  }`}
                >
                  <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center shadow-xs">
                    <Upload className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">
                      Arrastra o selecciona tu factura comercial
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                      Compatible con documentos <strong className="text-slate-700">PDF</strong> y fotos/imágenes <strong className="text-slate-700">(JPG, PNG, WEBP)</strong>.
                    </p>
                  </div>

                  {/* Dual Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-2.5 justify-center pt-1">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <Upload className="w-4 h-4 text-emerald-400" />
                      <span>Seleccionar Archivo (PDF / Imagen)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <Camera className="w-4 h-4 text-white" />
                      <span>Tomar Foto con Cámara</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* File preview: PDF or Image */}
                  {selectedFile.type === 'application/pdf' ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 flex flex-col items-center justify-center text-center space-y-3">
                      <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shadow-sm">
                        <FileText className="w-9 h-9" />
                      </div>
                      <div>
                        <div className="inline-block px-2.5 py-0.5 bg-rose-600 text-white font-bold text-[10px] rounded-full uppercase tracking-wider mb-1">
                          Documento PDF
                        </div>
                        <h5 className="font-bold text-slate-900 text-sm break-all max-w-xs">
                          {selectedFile.name}
                        </h5>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Tamaño: {(selectedFile.size / 1024).toFixed(1)} KB • Listo para procesar
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-950 aspect-[3/4] max-h-[380px] flex items-center justify-center">
                      <img
                        src={selectedFile.dataUrl}
                        alt="Factura para escanear"
                        className="w-full h-full object-contain"
                      />
                      <div className="absolute bottom-2 left-2 right-2 bg-slate-900/80 backdrop-blur-xs text-white p-2 rounded-lg text-xs truncate">
                        📷 {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleProcessScan}
                    disabled={isScanning}
                    className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold rounded-xl text-sm shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Sparkles className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
                    <span>{isScanning ? 'Analizando con IA y Contabilidad...' : 'Extraer Productos con IA'}</span>
                  </button>
                </div>
              )}

              {/* Standard File Picker (PDFs, Images, Gallery) */}
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,.pdf,image/png,image/jpeg,image/jpg,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleIncomingFile(file);
                  e.target.value = '';
                }}
              />

              {/* Direct Camera Capture (Mobile) */}
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleIncomingFile(file);
                  e.target.value = '';
                }}
              />

              {scanError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
                    <span className="font-medium">{scanError}</span>
                  </div>
                  <div className="flex items-center gap-2 pt-1 pl-6">
                    <button
                      type="button"
                      onClick={handleProcessScan}
                      disabled={isScanning}
                      className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-[11px] font-bold shadow-xs cursor-pointer flex items-center gap-1"
                    >
                      <RefreshCw className={`w-3 h-3 ${isScanning ? 'animate-spin' : ''}`} />
                      Reintentar Análisis
                    </button>
                    <button
                      type="button"
                      onClick={() => setScanError(null)}
                      className="px-2.5 py-1 bg-white hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-md text-[11px] font-semibold cursor-pointer"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              )}

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
                <span className="font-semibold text-slate-800 block">💡 Formatos soportados:</span>
                <p>
                  Puedes subir archivos digitales en formato <strong className="text-slate-700">PDF</strong> (facturas electrónicas o notas de entrega) o fotos en <strong className="text-slate-700">JPG, PNG o WEBP</strong>. La IA procesará automáticamente los renglones, costos unitarios y existencias.
                </p>
              </div>
            </div>

            {/* Right Column: Extracted Products & Approval (7 columns) */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <span>Revisión de Productos Extraídos</span>
                    {scannedData && (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold rounded-full">
                        {scannedData.items.length} {scannedData.items.length === 1 ? 'producto' : 'productos'}
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Ajusta la moneda, tasa de cambio y precios antes de ingresar al inventario.
                  </p>
                </div>

                {scannedData && (
                  <button
                    onClick={handleConfirmScannedPurchase}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Ingresar al Inventario</span>
                  </button>
                )}
              </div>

              {!scannedData ? (
                <div className="p-12 text-center text-slate-400 space-y-3">
                  <Sparkles className="w-10 h-10 mx-auto text-slate-300" />
                  <p className="text-sm font-medium">Sube una factura y presiona "Extraer Productos con IA".</p>
                  <p className="text-xs text-slate-400">
                    Detectará automáticamente al proveedor, moneda original, cantidades y precios unitarios en USD y moneda local.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Extracted Metadata Header */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs">
                    <div>
                      <span className="text-slate-400 block font-medium">Proveedor Detectado:</span>
                      <input
                        type="text"
                        value={scannedData.supplierName}
                        onChange={(e) => setScannedData({ ...scannedData, supplierName: e.target.value })}
                        className="font-bold text-slate-900 bg-white border border-slate-200 px-2 py-1 rounded w-full mt-0.5"
                      />
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">RIF / Identificación Fiscal:</span>
                      <input
                        type="text"
                        value={scannedData.supplierTaxId || ''}
                        onChange={(e) => setScannedData({ ...scannedData, supplierTaxId: e.target.value })}
                        placeholder="Ej: J-40137367-4"
                        className="font-bold text-slate-900 bg-white border border-slate-200 px-2 py-1 rounded w-full mt-0.5"
                      />
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">N° Factura / Control:</span>
                      <input
                        type="text"
                        value={scannedData.invoiceNumber || ''}
                        onChange={(e) => setScannedData({ ...scannedData, invoiceNumber: e.target.value })}
                        placeholder="Ej: B00000001"
                        className="font-bold text-slate-900 bg-white border border-slate-200 px-2 py-1 rounded w-full mt-0.5"
                      />
                    </div>
                  </div>

                  {/* Multi-currency & Exchange Rate Conversion Bar */}
                  <div className="p-3.5 bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-slate-50 rounded-xl border border-blue-200/80 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                      {/* Currency Selector */}
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-700 flex items-center gap-1">
                          <Coins className="w-3.5 h-3.5 text-blue-600" />
                          Moneda de la Factura:
                        </span>
                        <div className="inline-flex rounded-lg p-0.5 bg-slate-200 border border-slate-300">
                          <button
                            type="button"
                            onClick={() => handleCurrencyChange('VES')}
                            className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                              appliedCurrency === 'VES'
                                ? 'bg-white text-blue-700 shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            🇻🇪 Bolívares ({currSymbol})
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCurrencyChange('USD')}
                            className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                              appliedCurrency === 'USD'
                                ? 'bg-white text-emerald-700 shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            🇺🇸 Dólares ($ USD)
                          </button>
                        </div>
                      </div>

                      {/* Exchange Rate Input */}
                      {appliedCurrency !== 'USD' && (
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-600">Tasa aplicada:</span>
                          <div className="flex items-center bg-white border border-blue-300 rounded-lg overflow-hidden px-2 py-0.5 shadow-2xs">
                            <input
                              type="number"
                              step="0.01"
                              min="0.01"
                              value={appliedExchangeRate}
                              onChange={(e) => handleRateChange(Number(e.target.value))}
                              className="w-20 font-bold text-slate-900 text-xs focus:outline-hidden"
                            />
                            <span className="text-[11px] text-slate-500 font-medium pl-1">
                              {currSymbol}/USD
                            </span>
                          </div>
                          {appliedExchangeRate !== rate && (
                            <button
                              type="button"
                              onClick={() => handleRateChange(rate)}
                              className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded text-[11px] font-semibold transition-colors cursor-pointer"
                              title="Restablecer a la tasa actual configurada en el sistema"
                            >
                              Tasa del día ({rate})
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Conversion Banner Summary */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-blue-200/50 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">Monto total detectado:</span>
                        <span className="font-extrabold text-slate-800">
                          {appliedCurrency === 'USD'
                            ? formatUSD(scannedData.totalUSD || 0)
                            : formatLocal((scannedData.totalUSD || 0) * appliedExchangeRate, currSymbol, currCode)}
                        </span>
                        <ArrowRightLeft className="w-3.5 h-3.5 text-blue-500" />
                        <span className="text-slate-500">Equivalente contable para inventario:</span>
                        <span className="font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          {formatUSD(scannedData.totalUSD || 0)} USD
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 italic">
                        💡 Los productos se registrarán con su costo real en USD
                      </span>
                    </div>
                  </div>

                  {/* Items Table */}
                  <div className="border border-slate-200 rounded-xl overflow-x-auto">
                    <table className="w-full text-left text-xs min-w-[620px]">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                        <tr>
                          <th className="p-2.5 w-24">Ref / Código</th>
                          <th className="p-2.5">Descripción del Producto</th>
                          <th className="p-2.5 w-16 text-center">Cant</th>
                          <th className="p-2.5 w-28 text-right">
                            Costo Unit ({appliedCurrency === 'USD' ? '$' : currSymbol})
                          </th>
                          <th className="p-2.5 w-24 text-right">Costo Unit ($)</th>
                          <th className="p-2.5 w-24 text-right">Total ($)</th>
                          <th className="p-2.5 w-8"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {scannedData.items.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/80">
                            {/* Code / Ref */}
                            <td className="p-2">
                              <input
                                type="text"
                                value={item.code || ''}
                                onChange={(e) => {
                                  const updated = [...scannedData.items];
                                  updated[idx].code = e.target.value;
                                  setScannedData({ ...scannedData, items: updated });
                                }}
                                placeholder="Ref."
                                className="w-full bg-white border border-slate-200 rounded px-1.5 py-1 text-[11px] font-mono text-slate-700 uppercase"
                              />
                            </td>

                            {/* Name */}
                            <td className="p-2">
                              <input
                                type="text"
                                value={item.name}
                                onChange={(e) => {
                                  const updated = [...scannedData.items];
                                  updated[idx].name = e.target.value;
                                  setScannedData({ ...scannedData, items: updated });
                                }}
                                className="w-full bg-white border border-slate-200 rounded px-2 py-1 font-medium text-slate-800"
                              />
                            </td>

                            {/* Quantity */}
                            <td className="p-2 text-center">
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => handleUpdateItemQty(idx, Number(e.target.value))}
                                className="w-14 text-center bg-white border border-slate-200 rounded px-1 py-1 font-bold text-slate-800"
                              />
                            </td>

                            {/* Cost in Original Currency (Bs. or $) */}
                            <td className="p-2 text-right">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.unitCostOriginal}
                                onChange={(e) => handleUpdateItemOriginalCost(idx, Number(e.target.value))}
                                className="w-24 text-right bg-white border border-blue-200 rounded px-1.5 py-1 font-bold text-slate-800 focus:border-blue-500"
                              />
                            </td>

                            {/* Cost in USD */}
                            <td className="p-2 text-right">
                              <input
                                type="number"
                                step="0.0001"
                                min="0.0001"
                                value={item.unitCostUSD}
                                onChange={(e) => handleUpdateItemUSDCost(idx, Number(e.target.value))}
                                className="w-20 text-right bg-white border border-emerald-200 rounded px-1.5 py-1 font-bold text-emerald-800 focus:border-emerald-500"
                              />
                            </td>

                            {/* Total USD */}
                            <td className="p-2 text-right font-bold text-slate-900 whitespace-nowrap">
                              {formatUSD(item.totalCostUSD)}
                            </td>

                            {/* Delete */}
                            <td className="p-2 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = scannedData.items.filter((_, i) => i !== idx);
                                  const sumUSD = Number(updated.reduce((acc, i) => acc + i.totalCostUSD, 0).toFixed(2));
                                  setScannedData({ ...scannedData, items: updated, totalUSD: sumUSD });
                                }}
                                className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                                title="Eliminar este renglón"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Add Row Button and Final Summary Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleAddItemToScanned}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Agregar Renglón Faltante</span>
                    </button>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-slate-400 text-[11px] block">Total Compra:</span>
                        <div className="text-base font-extrabold text-emerald-700">
                          {formatUSD(scannedData.totalUSD || 0)}
                          <span className="text-xs text-slate-500 font-normal ml-1">
                            ({formatLocal((scannedData.totalUSD || 0) * appliedExchangeRate, currSymbol, currCode)})
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={handleConfirmScannedPurchase}
                        className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md flex items-center gap-2 transition-all cursor-pointer"
                      >
                        <Check className="w-4 h-4" />
                        <span>Confirmar e Incrementar Stock en Inventario</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* TAB 2: Manual Purchase Form */}
      {activeTab === 'manual' && (
        <form onSubmit={handleSaveManualPurchase} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Registrar Compra Manual</h3>
              <p className="text-xs text-slate-500">
                Ingresa los datos del proveedor y los productos a reponer en almacén.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddManualItem}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Agregar Producto</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Proveedor
              </label>
              <select
                value={manualSupplierId}
                onChange={(e) => setManualSupplierId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
              >
                {state.suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.taxId})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                N° Factura / Control
              </label>
              <input
                type="text"
                placeholder="Ej: FAC-88912"
                value={manualInvoiceNum}
                onChange={(e) => setManualInvoiceNum(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Estado del Pago
              </label>
              <select
                value={manualPaymentStatus}
                onChange={(e) => setManualPaymentStatus(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
              >
                <option value="paid">Pagado (Contado)</option>
                <option value="pending">Por Pagar (Crédito Proveedor)</option>
              </select>
            </div>
          </div>

          {/* Items List */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                <tr>
                  <th className="p-3">Seleccionar Producto</th>
                  <th className="p-3 w-28 text-center">Cantidad</th>
                  <th className="p-3 w-32 text-right">Costo Unit ($)</th>
                  <th className="p-3 w-32 text-right">Total ($)</th>
                  <th className="p-3 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {manualItems.map((item, idx) => (
                  <tr key={idx}>
                    <td className="p-2.5">
                      <select
                        value={item.productId}
                        onChange={(e) => handleUpdateManualItem(idx, 'productId', e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-800"
                      >
                        {state.products.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name} (Stock actual: {p.stock})
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-2.5 text-center">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleUpdateManualItem(idx, 'quantity', e.target.value)}
                        className="w-20 text-center bg-white border border-slate-200 rounded-lg px-2 py-1 font-bold text-slate-800"
                      />
                    </td>
                    <td className="p-2.5 text-right">
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={item.unitCostUSD}
                        onChange={(e) => handleUpdateManualItem(idx, 'unitCostUSD', e.target.value)}
                        className="w-24 text-right bg-white border border-slate-200 rounded-lg px-2 py-1 font-bold text-slate-800"
                      />
                    </td>
                    <td className="p-2.5 text-right font-bold text-slate-900">
                      {formatUSD(item.totalCostUSD)}
                    </td>
                    <td className="p-2.5 text-center">
                      {manualItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveManualItem(idx)}
                          className="text-slate-400 hover:text-rose-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <div>
              <span className="text-xs text-slate-400 block uppercase font-bold">Total Compra:</span>
              <div className="text-xl font-black text-slate-900">
                {formatUSD(manualItems.reduce((acc, i) => acc + i.totalCostUSD, 0))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm"
              >
                Guardar y Recibir en Inventario
              </button>
            </div>
          </div>
        </form>
      )}

      {/* TAB 3: History Table */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm">
              Registro de Facturas de Compras Recibidas
            </h3>
            <span className="text-xs text-slate-500 font-medium">
              Total de compras: {state.purchases.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="p-3.5">N° Factura / Control</th>
                  <th className="p-3.5">Fecha</th>
                  <th className="p-3.5">Proveedor</th>
                  <th className="p-3.5 text-center">Ítems</th>
                  <th className="p-3.5 text-right">Total ($ USD)</th>
                  <th className="p-3.5 text-right">Total ({currCode})</th>
                  <th className="p-3.5 text-center">Estado</th>
                  <th className="p-3.5 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {state.purchases.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      No hay compras registradas aún.
                    </td>
                  </tr>
                ) : (
                  state.purchases.map(purchase => (
                    <tr key={purchase.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5 font-bold font-mono text-slate-900">
                        {purchase.invoiceNumber}
                      </td>
                      <td className="p-3.5 text-slate-500 whitespace-nowrap">
                        {formatDateTime(purchase.date)}
                      </td>
                      <td className="p-3.5 font-semibold text-slate-800">
                        {purchase.supplierName}
                      </td>
                      <td className="p-3.5 text-center font-bold text-slate-700">
                        {purchase.items.reduce((acc, i) => acc + i.quantity, 0)} uds
                      </td>
                      <td className="p-3.5 text-right font-extrabold text-slate-900">
                        {formatUSD(purchase.totalUSD)}
                      </td>
                      <td className="p-3.5 text-right font-bold text-emerald-700">
                        {formatLocal(purchase.totalLocal, currSymbol, currCode)}
                      </td>
                      <td className="p-3.5 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          purchase.paymentStatus === 'paid'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {purchase.paymentStatus === 'paid' ? 'Pagado' : 'Por Pagar'}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <button
                          onClick={() => setViewingPurchase(purchase)}
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Ver detalle"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {viewingPurchase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 flex flex-col max-h-[85vh]">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <h4 className="font-bold text-base">Detalle de Compra: {viewingPurchase.invoiceNumber}</h4>
                <p className="text-xs text-slate-400">Proveedor: {viewingPurchase.supplierName}</p>
              </div>
              <button 
                onClick={() => setViewingPurchase(null)}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs text-slate-700">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 block font-medium">Fecha:</span>
                  <span className="font-semibold text-slate-800">{formatDateTime(viewingPurchase.date)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Total:</span>
                  <span className="font-bold text-emerald-700">{formatUSD(viewingPurchase.totalUSD)} ({formatLocal(viewingPurchase.totalLocal, currSymbol, currCode)})</span>
                </div>
              </div>

              <div>
                <h5 className="font-bold text-slate-800 mb-2 uppercase tracking-wider text-[11px]">
                  Productos Ingresados:
                </h5>
                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                  {viewingPurchase.items.map((item, i) => (
                    <div key={i} className="p-2.5 flex justify-between items-center">
                      <div>
                        <div className="font-semibold text-slate-800">{item.productName}</div>
                        <div className="text-[11px] text-slate-400">{item.quantity} unidades @ {formatUSD(item.unitCostUSD)}</div>
                      </div>
                      <div className="font-bold text-slate-900">
                        {formatUSD(item.totalCostUSD)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {viewingPurchase.notes && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-500">
                  <span className="font-semibold text-slate-700 block mb-0.5">Notas:</span>
                  <span>{viewingPurchase.notes}</span>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setViewingPurchase(null)}
                className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-semibold"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
