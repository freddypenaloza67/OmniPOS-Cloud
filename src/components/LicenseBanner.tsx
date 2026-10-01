import React from 'react';
import { useStore } from '../context/StoreContext';
import { AlertTriangle, Clock, KeyRound, Sparkles, X } from 'lucide-react';

export const LicenseBanner: React.FC = () => {
  const { licenseInfo, setIsLicenseModalOpen } = useStore();
  const [dismissed, setDismissed] = React.useState(false);

  // If lifetime or more than 3 days remaining on demo/active license, don't show banner
  if (licenseInfo.isLifetime) return null;
  if (!licenseInfo.isExpired && !licenseInfo.isExpiringSoon) return null;
  if (dismissed && !licenseInfo.isExpired) return null;

  return (
    <aside aria-label="Aviso de licencia" className={`w-full px-4 py-2 text-xs font-semibold flex items-center justify-between shadow-xs transition-colors ${
      licenseInfo.isExpired
        ? 'bg-rose-600 text-white'
        : 'bg-amber-500 text-slate-950'
    }`}>
      <div className="max-w-7xl mx-auto w-full flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {licenseInfo.isExpired ? (
            <AlertTriangle className="w-4 h-4 text-white flex-shrink-0 animate-bounce" />
          ) : (
            <Clock className="w-4 h-4 text-slate-950 flex-shrink-0 animate-pulse" />
          )}
          <span>
            {licenseInfo.isExpired ? (
              <strong>Tu período de prueba ha finalizado:</strong>
            ) : (
              <strong>Versión Demo por vencer:</strong>
            )}{' '}
            {licenseInfo.isExpired ? (
              <span>Activa tu licencia comercial para continuar cobrando y registrando compras.</span>
            ) : (
              <span>Te quedan {licenseInfo.formattedRemaining}. ¡Adquiere tu plan para asegurar el funcionamiento continuo!</span>
            )}
          </span>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={() => setIsLicenseModalOpen(true)}
            className={`px-3 py-1 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
              licenseInfo.isExpired
                ? 'bg-white text-rose-700 hover:bg-rose-50'
                : 'bg-slate-950 text-white hover:bg-slate-900'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Activar Licencia</span>
          </button>

          {!licenseInfo.isExpired && (
            <button
              onClick={() => setDismissed(true)}
              className="p-1 hover:bg-amber-600/30 rounded-lg text-slate-900 transition-colors"
              title="Ocultar aviso"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
