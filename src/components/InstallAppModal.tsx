import React, { useState, useEffect } from 'react';
import { 
  X, 
  Download, 
  Monitor, 
  Smartphone, 
  CheckCircle2, 
  ArrowRight, 
  ShieldCheck, 
  Zap, 
  WifiOff, 
  ExternalLink,
  Laptop,
  Copy,
  Check,
  AlertTriangle
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [installSuccess, setInstallSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'windows' | 'mobile'>('windows');
  const [copied, setCopied] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);

  useEffect(() => {
    try {
      setIsInIframe(window.self !== window.top);
    } catch {
      setIsInIframe(true);
    }
  }, []);

  if (!isOpen) return null;

  const cleanAppUrl = window.location.origin;

  const handleInstallClick = async () => {
    if (isInstallable) {
      const success = await install();
      if (success) {
        setInstallSuccess(true);
        setTimeout(() => {
          onClose();
        }, 2000);
      }
    } else if (isInIframe) {
      // In iframe, open the direct clean URL in a new standalone tab where Chrome can install it
      window.open(cleanAppUrl, '_blank');
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(cleanAppUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleOpenDirect = () => {
    window.open(cleanAppUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl bg-[var(--clay-card-bg)] border border-[var(--clay-card-border)] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative p-5 sm:p-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shrink-0 shadow-lg p-2">
              <img src="/icon.svg" alt="OmniPOS Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-black tracking-wider uppercase backdrop-blur-sm mb-1">
                <Laptop className="w-3 h-3" /> PWA de Escritorio
              </div>
              <h2 className="text-lg sm:text-xl font-black leading-tight text-white drop-shadow-sm">
                Instalar OmniPOS en la Computadora
              </h2>
              <p className="text-xs text-blue-100 font-medium hidden sm:block">
                Instalación limpia en Windows sin chat ni marcos de AI Studio
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer shrink-0 ml-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 text-[var(--text-main)]">
          
          {/* CRITICAL EXPLANATION: Inside AI Studio vs Clean Window */}
          {isInIframe && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border-2 border-amber-500/40 text-[var(--text-main)] space-y-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-black text-xs sm:text-sm text-amber-600 dark:text-amber-400">
                    ¡Por esto se te instaló AI Studio con el chat!
                  </h4>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                    Actualmente estás viendo la previa dentro del editor de <strong>Google AI Studio</strong>. Por seguridad, Chrome no permite que una página dentro de un marco (iframe) se instale directamente, por lo que el botón del navegador instalaba la página exterior de AI Studio.
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-amber-500/20 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <button
                  onClick={handleOpenDirect}
                  className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
                >
                  <ExternalLink className="w-4 h-4 stroke-[2.5]" />
                  <span>1. Abrir Sistema en Pestaña Limpia</span>
                </button>
                <button
                  onClick={handleCopyLink}
                  className="px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? '¡Enlace Copiado!' : 'Copiar Enlace Directo'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Status Banner */}
          {isInstalled || installSuccess ? (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-6 h-6 shrink-0" />
              <div>
                <p className="font-black text-sm">¡OmniPOS ya está instalada en este equipo!</p>
                <p className="text-xs opacity-90">Ya tienes el acceso directo limpio y oficial en tu Escritorio de Windows.</p>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <p className="font-black text-sm text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                  Instalación en la PC del Cliente
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  Crea un icono en el Escritorio con ventana independiente dedicada para la caja.
                </p>
              </div>
              
              <button
                onClick={handleInstallClick}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl font-black text-xs text-white bg-blue-600 hover:bg-blue-700 active:scale-95 shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all shrink-0"
              >
                {isInIframe ? (
                  <>
                    <ExternalLink className="w-4 h-4 stroke-[2.5]" />
                    <span>Abrir Limpio para Instalar</span>
                  </>
                ) : isInstallable ? (
                  <>
                    <Download className="w-4 h-4 stroke-[2.5]" />
                    <span>Instalar Ahora en Esta PC</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 stroke-[2.5]" />
                    <span>Ver Paso a Paso de Instalación</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Enlace directo para la PC del cliente */}
          <div className="p-3.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-wider">
                Enlace Directo del Sistema (Para abrir en la PC del cliente):
              </span>
              <button
                onClick={handleCopyLink}
                className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? '¡Copiado!' : 'Copiar'}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={cleanAppUrl}
                className="flex-1 px-3 py-2 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl select-all"
              />
              <button
                onClick={handleOpenDirect}
                title="Abrir en pestaña nueva"
                className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl cursor-pointer transition-all shrink-0"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Instructions Tabs */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 border-b border-[var(--clay-card-border)] pb-2">
              <button
                onClick={() => setActiveTab('windows')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'windows' 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                Paso a Paso en Windows (Instalación Limpia)
              </button>
              <button
                onClick={() => setActiveTab('mobile')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'mobile' 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                En Celular o Tablet
              </button>
            </div>

            {activeTab === 'windows' ? (
              <div className="space-y-3 text-xs">
                {/* Paso 1 */}
                <div className="p-3.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-white/10 space-y-1.5">
                  <p className="font-black text-xs text-blue-600 dark:text-blue-400 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-black">1</span>
                    Abre el enlace directo en una pestaña normal (fuera de AI Studio):
                  </p>
                  <p className="text-[var(--text-muted)] pl-7">
                    Haz clic en el botón amarillo de arriba <strong>"Abrir Sistema en Pestaña Limpia"</strong> o copia el enlace y pégalo en una pestaña nueva de Chrome o Edge.
                  </p>
                </div>

                {/* Paso 2 */}
                <div className="p-3.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-white/10 space-y-1.5">
                  <p className="font-black text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-black">2</span>
                    En esa nueva pestaña, verás el icono de instalación oficial:
                  </p>
                  <p className="text-[var(--text-muted)] pl-7">
                    En la barra de direcciones de Chrome arriba a la derecha aparecerá:  
                    <strong className="text-[var(--text-main)]"> "Instalar OmniPOS Retail"</strong> (con el ícono de pantalla y flecha hacia abajo 🖥️ ⬇️).
                  </p>
                </div>

                {/* Paso 3 */}
                <div className="p-3.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-white/10 space-y-1.5">
                  <p className="font-black text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-black">3</span>
                    Haz clic en "Instalar" y listo:
                  </p>
                  <p className="text-[var(--text-muted)] pl-7">
                    Se cerrará la pestaña del navegador y se abrirá <strong>únicamente la ventana de OmniPOS</strong>, limpia, a pantalla completa, con su icono en el Escritorio de Windows y en la barra de tareas.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-white/10 space-y-2">
                  <p className="font-black text-sm text-emerald-600 dark:text-emerald-400">
                    📱 En Celulares o Tablets Android (Google Chrome):
                  </p>
                  <p className="text-[var(--text-muted)]">
                    Abre el enlace directo en Chrome, presiona los tres puntos (⋮) en la esquina superior y pulsa <strong>"Instalar aplicación"</strong> o <strong>"Agregar a la pantalla principal"</strong>.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-white/10 space-y-2">
                  <p className="font-black text-sm text-sky-600 dark:text-sky-400">
                    🍏 En iPhone o iPad (Apple Safari):
                  </p>
                  <p className="text-[var(--text-muted)]">
                    Abre el enlace en Safari, presiona el botón <strong>Compartir</strong> (el cuadrado azul con una flecha hacia arriba) y selecciona <strong>"Agregar al inicio" (Add to Home Screen)</strong>.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-black/5 dark:bg-white/5 border-t border-[var(--clay-card-border)] flex items-center justify-between">
          <p className="text-[11px] text-[var(--text-muted)] flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            Instalador PWA estándar para Windows 10/11 y macOS
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-[var(--text-main)] hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
