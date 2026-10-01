import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { 
  X, 
  Cloud, 
  Smartphone, 
  RefreshCw, 
  Copy, 
  Check, 
  Download, 
  Upload, 
  ShieldCheck, 
  Wifi, 
  WifiOff, 
  Database,
  Layers
} from 'lucide-react';
import { formatDateTime } from '../utils/formatters';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({ isOpen, onClose }) => {
  const { 
    state, 
    syncing, 
    lastSynced, 
    syncError, 
    firebaseStatus,
    forceFirebaseSync,
    exportDataJSON, 
    importDataJSON 
  } = useStore();
  const [copied, setCopied] = useState(false);
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentUrl = typeof window !== 'undefined' ? window.location.origin : 'https://app.tu-dominio.com';

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTriggerSync = async () => {
    setIsManualSyncing(true);
    setSyncSuccessMsg(null);
    const success = await forceFirebaseSync();
    setIsManualSyncing(false);
    if (success) {
      setSyncSuccessMsg('¡Sincronización completa con Firebase Firestore exitosa!');
      setTimeout(() => setSyncSuccessMsg(null), 3500);
    }
  };

  const handleExportBackup = () => {
    const jsonStr = exportDataJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `omnipos-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      const success = await importDataJSON(content);
      if (success) {
        setImportStatus('¡Respaldo importado y sincronizado con éxito!');
      } else {
        setImportStatus('Error: El archivo no tiene el formato válido de OmniPOS.');
      }
      setTimeout(() => setImportStatus(null), 3000);
    };
    reader.readAsText(file);
  };

  // QR Code URL via free reliable SVG QR generator
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(currentUrl)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 p-5 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/15 rounded-xl">
              <Cloud className="w-5 h-5 text-blue-100" />
            </div>
            <div>
              <h3 className="font-semibold text-lg leading-tight">Sincronización Firebase Cloud & Móvil</h3>
              <p className="text-xs text-blue-100">Base de datos en tiempo real y soporte offline para caja</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors text-white/80 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5 text-sm text-slate-700">
          
          {/* Firebase Real-Time & Offline Status Card */}
          <div className="border border-indigo-100 bg-gradient-to-br from-indigo-50/70 via-blue-50/50 to-slate-50 p-4 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-lg ${firebaseStatus.isOnline ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                  {firebaseStatus.isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                </div>
                <div>
                  <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <span>Google Cloud Firestore</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      firebaseStatus.isOnline 
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300/50' 
                        : 'bg-amber-100 text-amber-800 border border-amber-300/50'
                    }`}>
                      {firebaseStatus.isOnline ? '● En Vivo (Tiempo Real)' : 'Modo Offline (Caché)'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {firebaseStatus.isOnline 
                      ? 'Cambios sincronizados al instante en todos los dispositivos' 
                      : 'Operando con caché local IndexedDB. Sincronizará al volver la conexión'}
                  </p>
                </div>
              </div>

              <button
                onClick={handleTriggerSync}
                disabled={syncing || isManualSyncing}
                title="Forzar actualización completa con Firebase"
                className="px-3 py-1.5 bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 text-xs font-semibold rounded-lg shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncing || isManualSyncing ? 'animate-spin' : ''}`} />
                <span>{syncing || isManualSyncing ? 'Sincronizando' : 'Sincronizar'}</span>
              </button>
            </div>

            {/* Offline-First Capability Info */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-indigo-100/70 text-[11px]">
              <div className="flex items-center gap-1.5 text-slate-600">
                <Database className="w-3.5 h-3.5 text-indigo-600" />
                <span>Caché local IndexedDB: <strong>Activa</strong></span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-600">
                <Layers className="w-3.5 h-3.5 text-cyan-600" />
                <span>Ventas sin internet: <strong>Habilitadas</strong></span>
              </div>
            </div>

            {firebaseStatus.lastCloudSync && (
              <p className="text-[10px] text-slate-500 text-right">
                Último pulso en la nube: {formatDateTime(firebaseStatus.lastCloudSync)}
              </p>
            )}

            {syncSuccessMsg && (
              <div className="p-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg font-medium text-center">
                {syncSuccessMsg}
              </div>
            )}
          </div>

          {syncError && (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl">
              {syncError}
            </div>
          )}

          {/* Connect from Mobile Section */}
          <div className="border border-slate-200 rounded-xl p-5 bg-gradient-to-b from-white to-slate-50/50">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg">
                <Smartphone className="w-4 h-4" />
              </div>
              <h4 className="font-semibold text-slate-800">Conectar desde cualquier Celular / Móvil</h4>
            </div>

            <p className="text-xs text-slate-500 mb-4">
              Escanea este código QR con la cámara de tu teléfono móvil o tableta para abrir el punto de venta. Cualquier venta, producto o cobro se actualiza en tiempo real gracias a Firebase.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-5">
              <div className="p-2.5 bg-white border border-slate-200 rounded-xl shadow-xs">
                <img
                  src={qrCodeUrl}
                  alt="Código QR de acceso móvil"
                  className="w-36 h-36 rounded-lg object-contain"
                />
              </div>

              <div className="flex-1 space-y-2.5 w-full">
                <label className="text-xs font-medium text-slate-500 block">Enlace directo para compartir:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={currentUrl}
                    className="w-full text-xs font-mono bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 select-all"
                  />
                  <button
                    onClick={handleCopyUrl}
                    className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 flex-shrink-0 transition-all shadow-xs"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copiado' : 'Copiar'}</span>
                  </button>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-slate-500 pt-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Conexión segura cifrada SSL / HTTPS</span>
                </div>
              </div>
            </div>
          </div>

          {/* Backup & Restore */}
          <div className="border border-slate-200 rounded-xl p-4 space-y-3">
            <h4 className="font-semibold text-slate-800 text-xs uppercase tracking-wider">
              Copias de Seguridad y Respaldo Local (JSON)
            </h4>

            {importStatus && (
              <div className={`p-2.5 rounded-lg text-xs font-medium ${
                importStatus.includes('éxito') ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'
              }`}>
                {importStatus}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleExportBackup}
                className="p-3 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-xl text-left flex items-start gap-2.5 transition-all"
              >
                <Download className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium text-slate-800 text-xs">Descargar Respaldo</div>
                  <div className="text-[11px] text-slate-500">Guardar archivo JSON</div>
                </div>
              </button>

              <label className="p-3 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-xl text-left flex items-start gap-2.5 transition-all cursor-pointer">
                <Upload className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium text-slate-800 text-xs">Restaurar Respaldo</div>
                  <div className="text-[11px] text-slate-500">Importar datos JSON</div>
                </div>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileImport}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-sm font-medium transition-colors cursor-pointer"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
