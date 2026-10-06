import React, { useState, useRef, useEffect } from 'react';
import { X, Camera, Barcode, Search, AlertCircle, RefreshCw, CheckCircle, PlusCircle } from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { useStore } from '../context/StoreContext';
import { Product } from '../types';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductFound: (product: Product) => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onProductFound
}) => {
  const { state, addProduct } = useStore();
  const [manualCode, setManualCode] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [detectedCode, setDetectedCode] = useState<string | null>(null);
  const [scannedProduct, setScannedProduct] = useState<Product | null>(null);
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isStoppingRef = useRef(false);

  // Play modern POS beep
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.16);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.16);
    } catch {
      // ignore audio context restrictions
    }
  };

  useEffect(() => {
    if (isOpen) {
      initAndStartScanner();
    } else {
      stopScanner();
    }
    return () => {
      stopScanner();
    };
  }, [isOpen]);

  const stopScanner = async () => {
    if (isStoppingRef.current) return;
    isStoppingRef.current = true;
    try {
      if (scannerRef.current) {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
        scannerRef.current = null;
      }
    } catch (e) {
      console.warn('Error stopping scanner:', e);
    } finally {
      setIsScanning(false);
      setIsStarting(false);
      isStoppingRef.current = false;
    }
  };

  const initAndStartScanner = async (cameraIdOverride?: string) => {
    setErrorMsg('');
    setDetectedCode(null);
    setScannedProduct(null);
    setIsStarting(true);

    try {
      // 1. Get available cameras
      let availableCameras: Array<{ id: string; label: string }> = [];
      try {
        availableCameras = await Html5Qrcode.getCameras();
        setCameras(availableCameras);
      } catch (camErr) {
        console.warn('Error fetching cameras:', camErr);
      }

      // Pick camera: user selection -> rear/back camera -> first available camera
      let targetCameraId = cameraIdOverride || selectedCameraId;
      if (!targetCameraId && availableCameras.length > 0) {
        const backCam = availableCameras.find(c => /back|rear|environment|trasera/i.test(c.label));
        targetCameraId = backCam ? backCam.id : availableCameras[0].id;
      }
      if (targetCameraId) {
        setSelectedCameraId(targetCameraId);
      }

      // 2. Stop any existing instance
      await stopScanner();

      // 3. Initialize Html5Qrcode
      const html5QrCode = new Html5Qrcode("barcode-scanner-viewport", {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.QR_CODE
        ],
        verbose: false
      });
      scannerRef.current = html5QrCode;

      // 4. Start stream & recognition
      const cameraConfig = targetCameraId ? targetCameraId : { facingMode: "environment" };

      await html5QrCode.start(
        cameraConfig,
        {
          fps: 15,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            return {
              width: Math.floor(minEdge * 0.9),
              height: Math.floor(minEdge * 0.55)
            };
          },
          aspectRatio: 1.777778
        },
        (decodedText) => {
          handleBarcodeDecoded(decodedText);
        },
        () => {
          // Frame evaluation error (standard while searching for barcode in stream)
        }
      );

      setIsScanning(true);
    } catch (err: any) {
      console.warn('Html5Qrcode start error:', err);
      const isDenied = err.name === 'NotAllowedError' || String(err).includes('Permission');
      if (isDenied) {
        setErrorMsg('Permiso de cámara denegado. Permite el acceso a la cámara en el icono superior del navegador.');
      } else {
        setErrorMsg(`No se pudo iniciar el escáner de cámara: ${err?.message || 'Verifique conexión'}`);
      }
    } finally {
      setIsStarting(false);
    }
  };

  const handleBarcodeDecoded = (code: string) => {
    const cleanCode = code.trim();
    if (!cleanCode) return;

    playBeep();
    setDetectedCode(cleanCode);

    // Stop scanner so it doesn't repeatedly scan the same code in 1 second
    stopScanner();

    // Check if product is in the catalog
    const found = state.products.find(p => 
      (p.barcode && p.barcode.toLowerCase() === cleanCode.toLowerCase()) || 
      p.sku?.toLowerCase() === cleanCode.toLowerCase()
    );

    if (found) {
      setScannedProduct(found);
      setTimeout(() => {
        onProductFound(found);
        onClose();
      }, 700);
    } else {
      setManualCode(cleanCode);
      setErrorMsg(`Código escaneado: "${cleanCode}". Este producto no está registrado aún en inventario.`);
    }
  };

  const handleSearchCode = (code: string) => {
    const clean = code.trim().toLowerCase();
    if (!clean) return;

    const found = state.products.find(p => 
      p.barcode?.toLowerCase() === clean || 
      p.sku?.toLowerCase() === clean ||
      p.name?.toLowerCase().includes(clean)
    );

    if (found) {
      onProductFound(found);
      onClose();
    } else {
      setErrorMsg(`No se encontró ningún producto con el código "${code}"`);
    }
  };

  const handleSubmitManual = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearchCode(manualCode);
  };

  // Quick helper to register this unscanned product directly with demo info
  const handleQuickRegisterProduct = async () => {
    if (!detectedCode) return;
    const newProd = {
      name: `Producto ${detectedCode}`,
      sku: `SKU-${detectedCode.slice(-4)}`,
      barcode: detectedCode,
      category: 'Víveres',
      costUSD: 1.00,
      priceUSD: 1.50,
      stock: 50,
      minStock: 10,
      unit: 'ud'
    };
    await addProduct(newProd);
    const added = state.products.find(p => p.barcode === detectedCode) || {
      id: `prod-${Date.now()}`,
      ...newProd
    };
    onProductFound(added as Product);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-3.5 sm:p-4 bg-slate-950 text-white flex justify-between items-center border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Barcode className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-black text-xs sm:text-sm uppercase tracking-wider">Lector Láser de Códigos</h3>
              <p className="text-[10px] text-slate-400">Escaneo de barras EAN-13, UPC, Code-128</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 rounded-xl hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera Selector (if multiple cameras available) */}
        {cameras.length > 1 && (
          <div className="px-4 py-2 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
            <span className="font-bold text-[11px] text-slate-600 dark:text-slate-300">Cámara activa:</span>
            <select
              value={selectedCameraId}
              onChange={(e) => {
                setSelectedCameraId(e.target.value);
                initAndStartScanner(e.target.value);
              }}
              className="px-2 py-1 bg-white dark:bg-slate-900 rounded-lg border border-slate-300 dark:border-slate-600 text-xs font-bold text-[var(--text-main)] cursor-pointer"
            >
              {cameras.map(c => (
                <option key={c.id} value={c.id}>
                  {c.label || `Cámara ${c.id.substring(0, 5)}`}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Viewport Area */}
        <div className="p-4 space-y-3.5 overflow-y-auto">
          
          <div className="relative bg-black rounded-2xl overflow-hidden aspect-video sm:aspect-16/10 flex items-center justify-center border border-slate-800 shadow-inner">
            
            {/* The dedicated html5-qrcode container */}
            <div 
              id="barcode-scanner-viewport" 
              className="w-full h-full object-cover [&>video]:w-full [&>video]:h-full [&>video]:object-cover"
            />

            {/* Scanning Laser Line Overlay */}
            {isScanning && !detectedCode && (
              <>
                <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-0.5 bg-red-500 shadow-[0_0_15px_#ef4444] animate-pulse pointer-events-none z-10" />
                <div className="absolute inset-8 border-2 border-emerald-400/80 rounded-xl pointer-events-none shadow-[0_0_20px_rgba(52,211,153,0.3)] z-10" />
                <div className="absolute bottom-2 inset-x-4 text-center text-[10px] font-bold text-white/90 bg-black/60 backdrop-blur-xs py-1 px-2 rounded-lg z-10">
                  Coloque las barras del producto dentro del recuadro
                </div>
              </>
            )}

            {/* Starting status */}
            {isStarting && (
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center text-white z-20 space-y-2">
                <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
                <span className="text-xs font-black">Encendiendo lector de cámara...</span>
              </div>
            )}

            {/* Success Detected Overlay */}
            {detectedCode && (
              <div className="absolute inset-0 bg-emerald-950/90 backdrop-blur-xs flex flex-col items-center justify-center text-white p-4 z-20 animate-in zoom-in-95 duration-150">
                <CheckCircle className="w-12 h-12 text-emerald-400 mb-2 animate-bounce" />
                <span className="text-sm font-black uppercase tracking-wider">¡Código de Barras Leído!</span>
                <span className="font-mono text-base font-black text-amber-300 mt-1 bg-black/40 px-3 py-1 rounded-xl">
                  {detectedCode}
                </span>
                {scannedProduct ? (
                  <p className="text-xs text-emerald-200 mt-2 font-bold">
                    ✓ {scannedProduct.name} agregada al ticket
                  </p>
                ) : (
                  <p className="text-xs text-amber-200 mt-2 font-medium">
                    Buscando en inventario...
                  </p>
                )}
              </div>
            )}

            {/* Retry Button if stopped or failed */}
            {!isScanning && !isStarting && !detectedCode && (
              <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center text-slate-300 space-y-3 z-10">
                <Camera className="w-10 h-10 text-slate-500" />
                <p className="text-xs font-bold text-white">Lector en pausa o inactivo</p>
                <button
                  type="button"
                  onClick={() => initAndStartScanner()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-lg transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reactivar Escáner</span>
                </button>
              </div>
            )}

          </div>

          {/* Feedback messages */}
          {errorMsg && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 text-xs rounded-2xl space-y-2">
              <div className="flex items-center gap-2 font-black">
                <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
              {detectedCode && !scannedProduct && (
                <div className="pt-2 border-t border-amber-500/20 flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-[11px] text-amber-700 dark:text-amber-300">
                    ¿Deseas registrar este artículo con código <strong>{detectedCode}</strong>?
                  </span>
                  <button
                    type="button"
                    onClick={handleQuickRegisterProduct}
                    className="px-3 py-1 bg-amber-500 text-slate-950 rounded-lg font-black text-xs hover:bg-amber-400 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>+ Registrar y Agregar</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Quick Demo barcode chips */}
          <div className="pt-1">
            <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
              Productos rápidos para probar:
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {state.products.slice(0, 4).map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSearchCode(p.barcode || p.sku)}
                  className="p-2 bg-slate-100 dark:bg-slate-800/60 hover:bg-emerald-500/10 hover:border-emerald-500/50 border border-slate-200 dark:border-slate-700 rounded-xl text-left transition-all cursor-pointer group"
                >
                  <div className="text-xs font-black text-slate-800 dark:text-slate-200 truncate group-hover:text-emerald-500">
                    {p.name}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">
                    {p.barcode || p.sku}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Manual Entry Form */}
          <form onSubmit={handleSubmitManual} className="pt-2 border-t border-slate-200 dark:border-slate-800">
            <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              O ingresar código manualmente:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Ej: 7592648698228 o HAR-PAN-001"
                className="flex-1 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="submit"
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <Search className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Buscar</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
