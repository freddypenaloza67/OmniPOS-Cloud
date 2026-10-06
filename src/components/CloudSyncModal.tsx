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
  Layers,
  MessageCircle,
  ExternalLink,
  HelpCircle,
  Info,
  AlertTriangle
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
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);

  // In AI Studio development, dev URLs (ais-dev-) are strictly private to the container/author session.
  // The shared preview URL (ais-pre-) is the public endpoint accessible by mobile phones and other devices.
  const resolvePublicUrl = () => {
    if (typeof window === 'undefined') return 'https://app.tu-dominio.com';
    let raw = window.location.origin;
    if (raw.includes('ais-dev-')) {
      return raw.replace('ais-dev-', 'ais-pre-');
    }
    return raw;
  };

  const defaultPublicUrl = resolvePublicUrl();
  const [activeUrl, setActiveUrl] = useState<string>(defaultPublicUrl);

  if (!isOpen) return null;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(activeUrl);
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

  // Send link to WhatsApp so user can tap it from their phone
  const handleSendToWhatsApp = () => {
    const msg = `📱 *Enlace de Acceso a OmniPOS Retail:*

Abre este enlace desde Google Chrome en tu celular para ingresar al Punto de Venta:
${activeUrl}

(Recuerda tener tu sesión de Google activa si te solicita autenticación).`;

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  // High-reliability QR Code via API with margin
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=${encodeURIComponent(activeUrl)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/65 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-600 to-indigo-700 p-4 sm:p-5 text-white flex justify-between items-center shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/15 backdrop-blur-md rounded-2xl shadow-inner">
              <Cloud className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg leading-tight">Sincronización Firebase Cloud & Terminales Móviles</h3>
              <p className="text-xs text-blue-100 mt-0.5">Acceso simultáneo desde teléfonos, tablets y computadoras</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Firebase Real-Time & Offline Status Card */}
          <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl ${firebaseStatus.isOnline ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                  {firebaseStatus.isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">Base de Datos Firestore</div>
                  <div className="flex items-center gap-1.5 text-xs font-bold">
                    <span className={`w-2 h-2 rounded-full ${
                      firebaseStatus.isOnline 
                        ? 'bg-emerald-500 animate-pulse' 
                        : 'bg-amber-500'
                    }`} />
                    <span className={firebaseStatus.isOnline ? 'text-emerald-700' : 'text-amber-700'}>
                      {firebaseStatus.isOnline ? 'En Vivo (Sincronizado en la Nube)' : 'Modo Offline (Caché Local)'}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleTriggerSync}
                disabled={isManualSyncing || syncing}
                className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                title="Forzar actualización completa con Firebase"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isManualSyncing || syncing ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
                <span>{isManualSyncing ? 'Sincronizando...' : 'Sincronizar'}</span>
              </button>
            </div>

            {firebaseStatus.lastCloudSync && (
              <p className="text-[11px] text-slate-500 text-right">
                Último pulso en la nube: {formatDateTime(firebaseStatus.lastCloudSync)}
              </p>
            )}

            {syncSuccessMsg && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-bold text-center">
                {syncSuccessMsg}
              </div>
            )}
          </div>

          {/* Connect from Mobile Section */}
          <div className="border border-slate-200 rounded-2xl p-4 sm:p-5 bg-gradient-to-b from-white to-slate-50/70 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-100 text-indigo-700 rounded-xl">
                  <Smartphone className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-slate-900 text-sm">Abrir en Celulares y Tablets Móviles</h4>
              </div>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-200">
                Punto de Venta Móvil
              </span>
            </div>

            <p className="text-xs text-slate-600">
              Escanea este código QR con la cámara de tu teléfono móvil o tableta para abrir el sistema. Cualquier venta, cobro o inventario se actualiza en tiempo real entre todos los dispositivos gracias a Firebase.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200">
              {/* QR Code Container */}
              <div className="p-2 bg-white border-2 border-indigo-100 rounded-2xl shadow-xs shrink-0 flex flex-col items-center">
                <img
                  src={qrCodeUrl}
                  alt="Código QR de acceso móvil"
                  className="w-40 h-40 rounded-xl object-contain"
                />
                <span className="text-[10px] font-bold text-slate-400 mt-1">Escanea con la Cámara</span>
              </div>

              {/* URL & Direct Action Options */}
              <div className="flex-1 space-y-3 w-full">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700 uppercase">
                      Enlace de Acceso Móvil
                    </label>
                    <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Público (ais-pre)
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={activeUrl}
                      onChange={(e) => setActiveUrl(e.target.value)}
                      className="w-full text-xs font-mono bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold select-all"
                      title="Puedes cambiar o pegar tu dominio/IP personalizada aquí si deseas"
                    />
                    <button
                      onClick={handleCopyUrl}
                      className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all shadow-xs cursor-pointer"
                      title="Copiar enlace al portapapeles"
                    >
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? '¡Copiado!' : 'Copiar'}</span>
                    </button>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    El código QR se actualiza automáticamente si modificas este enlace.
                  </span>
                </div>

                {/* WhatsApp & Browser Direct Buttons */}
                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleSendToWhatsApp}
                    className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Enviar a mi WhatsApp</span>
                  </button>

                  <a
                    href={activeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all border border-slate-300 text-center"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                    <span>Probar en Navegador</span>
                  </a>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Conexión segura SSL / HTTPS en tiempo real</span>
                </div>
              </div>
            </div>

            {/* Troubleshooting Guide Box */}
            <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3.5 space-y-2">
              <button
                type="button"
                onClick={() => setShowTroubleshooting(!showTroubleshooting)}
                className="w-full flex items-center justify-between text-xs font-bold text-amber-900 cursor-pointer text-left"
              >
                <div className="flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>¿Por qué el celular no abría la app al escanear? (Solución)</span>
                </div>
                <span className="text-amber-700 text-xs">{showTroubleshooting ? '▲ Ocultar' : '▼ Ver causas y solución'}</span>
              </button>

              {showTroubleshooting && (
                <div className="text-[11px] text-amber-950 space-y-2 pt-1 border-t border-amber-200/60 animate-in fade-in">
                  <p>
                    <strong>1. Enlace de Desarrollo vs Enlace Compartido:</strong> Anteriormente el código QR apuntaba a la dirección privada de desarrollo (<code className="bg-amber-100 px-1 py-0.5 rounded text-amber-900 font-mono">ais-dev-</code>), que Google bloquea para dispositivos externos. <strong>Ya lo hemos corregido</strong> para que apunte siempre al enlace público (<code className="bg-amber-100 px-1 py-0.5 rounded text-amber-900 font-mono">ais-pre-</code>).
                  </p>
                  <p>
                    <strong>2. Lector QR del Celular:</strong> Algunos escáneres de cámara usan navegadores internos muy básicos. Te recomendamos presionar el botón <strong>"Enviar a mi WhatsApp"</strong> y abrir el link directamente en <strong>Google Chrome</strong> en tu teléfono.
                  </p>
                  <p>
                    <strong>3. Sesión de Google:</strong> Si el celular te solicita inicio de sesión, simplemente accede con tu cuenta de Google (<code className="bg-amber-100 px-1 py-0.5 rounded text-amber-900 font-mono">ddanez.fact.dist@gmail.com</code>).
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Backup & Restore Local JSON */}
          <div className="border border-slate-200 rounded-2xl p-4 space-y-3 bg-slate-50/50">
            <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
              Copias de Seguridad y Respaldo Local (JSON)
            </h4>

            {importStatus && (
              <div className={`p-2.5 rounded-xl text-xs font-bold ${
                importStatus.includes('éxito') ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
              }`}>
                {importStatus}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={handleExportBackup}
                className="p-3 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-xl text-left flex items-start gap-2.5 transition-all cursor-pointer shadow-xs"
              >
                <Download className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-bold text-slate-800 text-xs">Descargar Respaldo</div>
                  <div className="text-[11px] text-slate-500">Guardar archivo JSON de datos</div>
                </div>
              </button>

              <label className="p-3 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-xl text-left flex items-start gap-2.5 transition-all cursor-pointer shadow-xs">
                <Upload className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-bold text-slate-800 text-xs">Restaurar Respaldo</div>
                  <div className="text-[11px] text-slate-500">Subir archivo JSON previo</div>
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
        <div className="bg-slate-50 border-t border-slate-200 px-5 sm:px-6 py-3 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-blue-600" />
            <span className="font-medium text-slate-700">Firebase Firestore Cloud Sync</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
