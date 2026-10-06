import React, { useState } from 'react';
import { Sparkles, ShieldCheck, Cpu, Crown } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import logoImg from '../assets/images/aitech_soluciones_logo_1790636280793.jpg';
import { SecretInstallerModal } from './SecretInstallerModal';
import { InstallAppModal } from './InstallAppModal';

export const Footer: React.FC = () => {
  const { setIsLicenseModalOpen, licenseInfo } = useStore();
  const [showSecretPin, setShowSecretPin] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);

  return (
    <footer className="mt-auto border-t border-[var(--clay-card-border)] bg-[var(--clay-card-bg)]/80 backdrop-blur-md shadow-xs transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Brand & Developer Info with Logo */}
          <div className="flex items-center gap-3.5 text-center md:text-left">
            <div className="relative group shrink-0">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-600 via-stone-600 to-amber-700 rounded-xl blur-xs opacity-40 group-hover:opacity-75 transition duration-300"></div>
              <img
                src={logoImg}
                alt="AITECH SOLUCIONES C.A."
                className="relative w-12 h-12 object-contain rounded-xl bg-white p-1 border border-slate-200 shadow-sm"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                }}
              />
            </div>

            <div>
              <div className="flex items-center justify-center md:justify-start gap-1.5 flex-wrap">
                <span className="text-xs sm:text-sm font-semibold text-[var(--text-main)] tracking-tight">
                  Desarrollado con IA por{' '}
                  <strong className="font-black text-[var(--text-main)] tracking-wide">
                    AITECH SOLUCIONES C.A.
                  </strong>
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                  <Sparkles className="w-2.5 h-2.5 text-amber-500" />
                  IA Retail
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                Soluciones integrales de software, automatización e Inteligencia Artificial aplicada a negocios
              </p>
            </div>
          </div>

          {/* Quick License & Tech Badges */}
          <div className="flex items-center gap-2.5 flex-wrap justify-center md:justify-end text-xs">
            <button
              type="button"
              onClick={() => setIsLicenseModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 transition-all text-xs font-black cursor-pointer shadow-xs hover:scale-102 active:scale-98"
              title="Licencia del Sistema - Click para gestionar o renovar"
            >
              <Crown className="w-3.5 h-3.5 text-amber-500 stroke-[2.5]" />
              <span>
                {licenseInfo.isLifetime
                  ? 'Licencia Vitalicia'
                  : licenseInfo.type === 'demo'
                  ? `Demo (${licenseInfo.daysRemaining} días)`
                  : `Plan ${licenseInfo.typeName}`}
              </span>
            </button>

            <div className="hidden sm:inline-flex items-center gap-1 text-[11px] text-[var(--text-muted)] px-2.5 py-1 bg-black/5 dark:bg-white/5 rounded-md border border-[var(--clay-card-border)]">
              <Cpu className="w-3 h-3 text-cyan-500" />
              <span>OmniPOS Retail System</span>
              <button
                type="button"
                onClick={() => setShowSecretPin(true)}
                className="ml-0.5 text-[var(--text-muted)] hover:text-blue-500 font-bold select-none cursor-default focus:outline-none transition-colors"
                title="OmniPOS Retail System®"
              >
                ®
              </button>
            </div>
          </div>

        </div>

        {/* Micro copyright row */}
        <div className="mt-3 pt-3 border-t border-[var(--clay-card-border)] flex flex-col sm:flex-row items-center justify-between gap-1 text-[10px] text-[var(--text-muted)] text-center sm:text-left">
          <p>
            © {new Date().getFullYear()} AITECH SOLUCIONES C.A. — OmniPOS Retail System
            <button
              type="button"
              onClick={() => setShowSecretPin(true)}
              className="ml-0.5 text-[var(--text-muted)] hover:text-blue-500 font-bold select-none cursor-default focus:outline-none transition-colors"
              title="OmniPOS Retail System®"
            >
              ®
            </button>
            . Todos los derechos reservados.
          </p>
          <p className="flex items-center gap-1">
            Diseñado para alto rendimiento comercial multimoneda (USD / Bs.)
          </p>
        </div>
      </div>

      {/* Secret PIN Modal for Technician Installer */}
      <SecretInstallerModal
        isOpen={showSecretPin}
        onClose={() => setShowSecretPin(false)}
        onSuccess={() => setShowInstallModal(true)}
      />

      {/* Install PWA Modal (Protected by Secret PIN) */}
      <InstallAppModal
        isOpen={showInstallModal}
        onClose={() => setShowInstallModal(false)}
      />
    </footer>
  );
};
