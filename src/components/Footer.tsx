import React from 'react';
import { Sparkles, ShieldCheck, Cpu } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import logoImg from '../assets/images/aitech_soluciones_logo_1790636280793.jpg';

export const Footer: React.FC = () => {
  const { setIsLicenseModalOpen, licenseInfo } = useStore();

  return (
    <footer className="mt-auto border-t border-slate-200/80 bg-white/80 backdrop-blur-md shadow-xs transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Brand & Developer Info with Logo */}
          <div className="flex items-center gap-3.5 text-center md:text-left">
            <div className="relative group shrink-0">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-indigo-600 rounded-xl blur-xs opacity-50 group-hover:opacity-75 transition duration-300"></div>
              <img
                src={logoImg}
                alt="AItech Soluciones, C. A."
                className="relative w-10 h-10 object-contain rounded-xl bg-slate-950 p-1 border border-slate-800 shadow-sm"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                }}
              />
            </div>

            <div>
              <div className="flex items-center justify-center md:justify-start gap-1.5 flex-wrap">
                <span className="text-xs sm:text-sm font-semibold text-slate-800 tracking-tight">
                  Desarrollado con IA por{' '}
                  <strong className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-700 via-indigo-600 to-cyan-600">
                    AItech Soluciones, C. A.
                  </strong>
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/70">
                  <Sparkles className="w-2.5 h-2.5 text-indigo-500" />
                  IA Retail
                </span>
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Soluciones integrales de software, automatización e Inteligencia Artificial aplicada a negocios
              </p>
            </div>
          </div>

          {/* Quick License & Tech Badges */}
          <div className="flex items-center gap-2.5 flex-wrap justify-center md:justify-end text-xs">
            <button
              type="button"
              onClick={() => setIsLicenseModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200/80 transition-colors text-xs font-semibold cursor-pointer shadow-2xs"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
              <span>
                {licenseInfo.isLifetime
                  ? 'Licencia Vitalicia AItech'
                  : licenseInfo.type === 'demo'
                  ? `Demo AItech (${licenseInfo.daysRemaining} días)`
                  : `Plan ${licenseInfo.typeName}`}
              </span>
            </button>

            <div className="hidden sm:inline-flex items-center gap-1 text-[11px] text-slate-600 px-2 py-1 bg-slate-50 rounded-md border border-slate-200/60">
              <Cpu className="w-3 h-3 text-cyan-600" />
              <span>OmniPOS Cloud v2.5</span>
            </div>
          </div>

        </div>

        {/* Micro copyright row */}
        <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-1 text-[10px] text-slate-600 text-center sm:text-left">
          <p>© {new Date().getFullYear()} AItech Soluciones, C. A. — Todos los derechos reservados.</p>
          <p className="flex items-center gap-1">
            Diseñado para alto rendimiento comercial multimoneda (USD / Bs.)
          </p>
        </div>
      </div>
    </footer>
  );
};
