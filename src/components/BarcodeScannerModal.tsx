import React, { useState, useRef, useEffect } from 'react';
import { X, Camera, Barcode, Search, AlertCircle } from 'lucide-react';
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
  const { state } = useStore();
  const [manualCode, setManualCode] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    setErrorMsg('');
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          setCameraActive(true);
        }
      } else {
        setErrorMsg('Cámara no compatible en este navegador. Use la búsqueda manual.');
      }
    } catch (err: any) {
      console.warn('Camera access denied or unavailable:', err);
      setErrorMsg('No se pudo acceder a la cámara. Verifique los permisos del navegador.');
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 flex flex-col">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Barcode className="w-5 h-5 text-emerald-400" />
            <h3 className="font-semibold text-base">Escanear Código de Barras / SKU</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video / Camera Viewport */}
        <div className="p-4 space-y-4">
          <div className="relative bg-slate-950 rounded-xl overflow-hidden aspect-video flex items-center justify-center border border-slate-800">
            {cameraActive ? (
              <>
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  autoPlay
                  muted
                />
                {/* Laser scan line overlay */}
                <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-0.5 bg-red-500 shadow-[0_0_12px_#ef4444] animate-pulse" />
                <div className="absolute inset-8 border-2 border-emerald-400/70 rounded-lg pointer-events-none" />
                <div className="absolute bottom-2 inset-x-0 text-center text-[10px] text-white/80 bg-black/40 py-1">
                  Apunte la cámara al código de barras del producto
                </div>
              </>
            ) : (
              <div className="text-center p-6 text-slate-400 space-y-2">
                <Camera className="w-8 h-8 mx-auto text-slate-600" />
                <p className="text-xs">Cámara inactiva o sin permisos.</p>
                <button
                  type="button"
                  onClick={startCamera}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs rounded-lg font-medium transition-colors"
                >
                  Activar Cámara
                </button>
              </div>
            )}
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Quick Demo barcode chips */}
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase block mb-1.5">
              Productos rápidos para probar:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {state.products.slice(0, 4).map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSearchCode(p.barcode || p.sku)}
                  className="px-2 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 border border-slate-200 rounded-lg text-[11px] font-mono transition-all truncate max-w-[190px]"
                >
                  {p.barcode || p.sku} ({p.name.substring(0, 14)}...)
                </button>
              ))}
            </div>
          </div>

          {/* Manual Entry Form */}
          <form onSubmit={handleSubmitManual} className="pt-2 border-t border-slate-100">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              O ingresar código manualmente:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Ej: 7591016000018 o HAR-PAN-001"
                className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              />
              <button
                type="submit"
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Buscar</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
