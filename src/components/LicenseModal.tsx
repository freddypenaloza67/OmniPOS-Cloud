import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { 
  ShieldCheck, 
  KeyRound, 
  Sparkles, 
  Clock, 
  Calendar, 
  Copy, 
  Check, 
  AlertTriangle, 
  X, 
  Award, 
  Crown, 
  Layers, 
  Wrench, 
  RotateCcw,
  CheckCircle2,
  ExternalLink,
  Store,
  Terminal
} from 'lucide-react';
import { LICENSE_PLANS, generateLicenseKey, validateLicenseKey } from '../utils/licenseUtils';
import { LicenseType } from '../types/license';
import logoImg from '../assets/images/aitech_soluciones_logo_1790636280793.jpg';

export const LicenseModal: React.FC = () => {
  const { 
    license, 
    licenseInfo, 
    isLicenseModalOpen, 
    setIsLicenseModalOpen, 
    activateLicenseKey,
    resetDemoLicense,
    state 
  } = useStore();

  const [activeTab, setActiveTab] = useState<'status' | 'plans' | 'activate' | 'generator'>('status');
  
  // Activation form
  const [activationKey, setActivationKey] = useState('');
  const [businessName, setBusinessName] = useState(license?.licensedTo || state.settings.storeName);
  const [activating, setActivating] = useState(false);
  const [activationResult, setActivationResult] = useState<{ success: boolean; message: string } | null>(null);

  // Generator form (Admin/Distributor)
  const [genPlan, setGenPlan] = useState<LicenseType>('annual');
  const [generatedKey, setGeneratedKey] = useState('');
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedSysId, setCopiedSysId] = useState(false);

  if (!isLicenseModalOpen) return null;

  const handleCopySystemId = () => {
    if (license?.systemId) {
      navigator.clipboard.writeText(license.systemId);
      setCopiedSysId(true);
      setTimeout(() => setCopiedSysId(false), 2000);
    }
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activationKey.trim()) return;

    setActivating(true);
    setActivationResult(null);

    try {
      const res = await activateLicenseKey(activationKey.trim(), businessName.trim() || undefined);
      setActivationResult(res);
      if (res.success) {
        setActivationKey('');
        setTimeout(() => {
          setActiveTab('status');
        }, 1800);
      }
    } finally {
      setActivating(false);
    }
  };

  const handleGenerateKey = () => {
    const key = generateLicenseKey(genPlan, license?.systemId);
    setGeneratedKey(key);
  };

  const handleDirectApplyGenerated = async () => {
    if (!generatedKey) return;
    setActivating(true);
    try {
      const res = await activateLicenseKey(generatedKey, businessName);
      setActivationResult(res);
      if (res.success) {
        setActiveTab('status');
      }
    } finally {
      setActivating(false);
    }
  };

  const handleResetDemo = async () => {
    if (confirm('¿Deseas reiniciar la Versión Demo por 15 días completos de evaluación?')) {
      await resetDemoLicense();
      setActiveTab('status');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-5 sm:p-6 flex items-center justify-between border-b border-slate-700/60">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-bold">Licenciamiento & Planes OmniPOS</h3>
                {licenseInfo.isLifetime ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-400 text-slate-950 flex items-center gap-1 shadow-xs">
                    <Crown className="w-3 h-3" /> Vitalicio
                  </span>
                ) : licenseInfo.type === 'demo' ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-400 text-slate-950 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Demo 15 Días
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-teal-400 text-slate-950">
                    Comercial
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Control de acceso, activación de terminal y suscripciones comerciales
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsLicenseModalOpen(false)}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50/80 px-4 sm:px-6 gap-1 overflow-x-auto">
          <button
            onClick={() => { setActiveTab('status'); setActivationResult(null); }}
            className={`py-3 px-3.5 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'status'
                ? 'border-emerald-600 text-emerald-800 font-bold bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Estado de Licencia</span>
          </button>

          <button
            onClick={() => { setActiveTab('plans'); setActivationResult(null); }}
            className={`py-3 px-3.5 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'plans'
                ? 'border-emerald-600 text-emerald-800 font-bold bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Planes Disponibles</span>
          </button>

          <button
            onClick={() => { setActiveTab('activate'); setActivationResult(null); }}
            className={`py-3 px-3.5 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'activate'
                ? 'border-emerald-600 text-emerald-800 font-bold bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>Activar Licencia</span>
          </button>

          <button
            onClick={() => { setActiveTab('generator'); setActivationResult(null); }}
            className={`py-3 px-3.5 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ml-auto ${
              activeTab === 'generator'
                ? 'border-indigo-600 text-indigo-700 font-bold bg-white'
                : 'border-transparent text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50/50'
            }`}
          >
            <Wrench className="w-3.5 h-3.5 text-indigo-500" />
            <span>Generador de Claves (Admin)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">

          {/* TAB 1: STATUS */}
          {activeTab === 'status' && (
            <div className="space-y-6">
              {/* Primary Status Card */}
              <div className={`p-5 rounded-2xl border ${
                licenseInfo.isExpired
                  ? 'bg-rose-50/70 border-rose-200'
                  : licenseInfo.isExpiringSoon
                  ? 'bg-amber-50/70 border-amber-200'
                  : 'bg-emerald-50/70 border-emerald-200'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs uppercase font-extrabold px-2.5 py-0.5 rounded-full ${
                        licenseInfo.isExpired 
                          ? 'bg-rose-600 text-white' 
                          : licenseInfo.isExpiringSoon 
                          ? 'bg-amber-500 text-white' 
                          : 'bg-emerald-600 text-white'
                      }`}>
                        {licenseInfo.isExpired ? 'Licencia Vencida' : licenseInfo.isExpiringSoon ? 'Por Vencer Pronto' : 'Licencia Activa'}
                      </span>
                      <span className="text-xs font-semibold text-slate-500">
                        {license.type.toUpperCase()}
                      </span>
                    </div>

                    <h4 className="text-xl sm:text-2xl font-black text-slate-900 mt-1.5">
                      {licenseInfo.typeName}
                    </h4>

                    <p className="text-xs sm:text-sm text-slate-600 mt-1">
                      {licenseInfo.isLifetime ? (
                        'Acceso permanente de por vida. Todas las funciones de OmniPOS se encuentran activadas sin restricciones.'
                      ) : licenseInfo.isExpired ? (
                        'El tiempo asignado a este equipo ha finalizado. Activa una licencia para continuar facturando y registrando compras.'
                      ) : (
                        `Período de prueba y funcionamiento completo: le quedan ${licenseInfo.formattedRemaining}.`
                      )}
                    </p>
                  </div>

                  <div className="text-left sm:text-right bg-white sm:bg-transparent p-3 sm:p-0 rounded-xl border sm:border-0 border-slate-200">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Tiempo Restante:
                    </span>
                    <span className={`text-2xl font-black ${
                      licenseInfo.isExpired 
                        ? 'text-rose-600' 
                        : licenseInfo.isExpiringSoon 
                        ? 'text-amber-600' 
                        : 'text-emerald-700'
                    }`}>
                      {licenseInfo.isLifetime ? '∞ Infinito' : licenseInfo.formattedRemaining}
                    </span>
                    {!licenseInfo.isLifetime && (
                      <span className="text-[11px] text-slate-500 block mt-0.5">
                        Vence: {licenseInfo.formattedExpiry}
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress bar for time elapsed in demo / plan */}
                {!licenseInfo.isLifetime && (
                  <div className="mt-4 pt-4 border-t border-slate-200/80">
                    <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1.5">
                      <span>Progreso del Período</span>
                      <span>{licenseInfo.percentElapsed}% transcurrido</span>
                    </div>
                    <div className="w-full h-3 bg-slate-200/90 rounded-full overflow-hidden p-0.5">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          licenseInfo.isExpired
                            ? 'bg-rose-500'
                            : licenseInfo.isExpiringSoon
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${licenseInfo.percentElapsed}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Technical / Store Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* System ID Card */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5 text-slate-600" />
                      ID de Instalación / Equipo
                    </span>
                    <button
                      onClick={handleCopySystemId}
                      className="text-xs text-emerald-700 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      {copiedSysId ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>¡Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copiar ID</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="font-mono text-sm font-bold text-slate-800 bg-white px-3 py-2 rounded-xl border border-slate-200 select-all">
                    {license?.systemId || 'OMNI-SYS-DEFAULT'}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Proporciona este ID a tu distribuidor para generar licencias específicas de tu máquina.
                  </p>
                </div>

                {/* Licensed To Card */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                  <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                    <Store className="w-3.5 h-3.5 text-slate-600" />
                    Comercio Titular
                  </span>
                  <div className="font-bold text-sm text-slate-900 bg-white px-3 py-2 rounded-xl border border-slate-200 truncate">
                    {license?.licensedTo || state.settings.storeName}
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-slate-500">
                    <span>Clave activa:</span>
                    <span className="font-mono font-semibold text-slate-700 truncate max-w-[170px]">
                      {license?.licenseKey || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Unlocked Features */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-3">
                <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Funciones Habilitadas en esta Licencia (Versión Completa)
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700">
                  {(license?.features || []).map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-50">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('plans')}
                  className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Layers className="w-4 h-4 text-emerald-400" />
                  <span>Ver Planes Comerciales</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('activate')}
                  className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>Ingresar Clave de Activación</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: PLANS */}
          {activeTab === 'plans' && (
            <div className="space-y-6">
              <div className="text-center max-w-lg mx-auto">
                <h4 className="text-lg font-bold text-slate-900">
                  Planes de Licenciamiento OmniPOS
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Comienza con los 15 días gratis de prueba y adquiere el plan que mejor se adapte a tu comercio.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {LICENSE_PLANS.filter(p => p.id !== 'demo').map((plan) => {
                  const isCurrent = license?.type === plan.id && !licenseInfo.isExpired;
                  return (
                    <div 
                      key={plan.id}
                      className={`relative bg-white rounded-2xl border p-5 flex flex-col justify-between transition-all ${
                        plan.recommended 
                          ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-lg' 
                          : 'border-slate-200 hover:border-slate-300 shadow-xs'
                      }`}
                    >
                      {plan.badge && (
                        <span className={`absolute -top-2.5 right-4 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                          plan.recommended 
                            ? 'bg-emerald-600 text-white' 
                            : 'bg-slate-900 text-white'
                        }`}>
                          {plan.badge}
                        </span>
                      )}

                      <div className="space-y-3">
                        <div>
                          <h5 className="font-bold text-base text-slate-900">{plan.name}</h5>
                          <span className="text-xs font-semibold text-slate-400">{plan.periodLabel}</span>
                        </div>

                        <div className="py-2 border-y border-slate-100 flex items-baseline gap-1">
                          <span className="text-3xl font-black text-slate-900">${plan.priceUSD}</span>
                          <span className="text-xs text-slate-500 font-medium">USD</span>
                        </div>

                        <p className="text-xs text-slate-600 min-h-[36px]">
                          {plan.description}
                        </p>

                        <ul className="space-y-1.5 text-[11px] text-slate-600 pt-2">
                          {plan.features.slice(0, 5).map((f, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <Check className="w-3.5 h-3.5 text-emerald-600 mt-0.5 flex-shrink-0" />
                              <span>{f}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="pt-4 mt-4 border-t border-slate-100">
                        {isCurrent ? (
                          <div className="w-full py-2 bg-emerald-50 text-emerald-800 rounded-xl text-center text-xs font-bold border border-emerald-200">
                            ✓ Plan Activo Actualmente
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab('activate');
                              setGenPlan(plan.id);
                            }}
                            className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                              plan.recommended
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20'
                                : 'bg-slate-900 hover:bg-slate-800 text-white'
                            }`}
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                            <span>Activar este Plan</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Demo Version Info Banner */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div>
                  <span className="font-bold text-slate-900 block">¿Aún en período de prueba?</span>
                  <span className="text-slate-500">
                    La versión demo incluye todas las características durante 15 días continuos sin limitaciones.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleResetDemo}
                  className="px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                  <span>Reiniciar Demo (15 días)</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: ACTIVATE */}
          {activeTab === 'activate' && (
            <div className="max-w-xl mx-auto space-y-6">
              <div className="text-center">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2 border border-emerald-100">
                  <KeyRound className="w-6 h-6" />
                </div>
                <h4 className="text-lg font-bold text-slate-900">
                  Activar Clave de Licencia
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Ingresa la clave oficial proporcionada por tu distribuidor para habilitar o renovar tu sistema.
                </p>
              </div>

              {activationResult && (
                <div className={`p-4 rounded-2xl border text-xs font-semibold flex items-center gap-2.5 ${
                  activationResult.success
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                    : 'bg-rose-50 text-rose-900 border-rose-200'
                }`}>
                  {activationResult.success ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
                  )}
                  <span>{activationResult.message}</span>
                </div>
              )}

              <form onSubmit={handleActivate} className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                    Clave de Licencia (Product Key)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="OMNI-XXXX-XXXX-XXXX-XXXX"
                    value={activationKey}
                    onChange={(e) => setActivationKey(e.target.value.toUpperCase())}
                    className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900 uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Formato estándar: OMNI-(TIPO)-(DURACIÓN)-(CÓDIGO)-(CHECKSUM)
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                    Nombre del Negocio / Titular de la Licencia
                  </label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={activating || !activationKey.trim()}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold rounded-xl text-sm shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>{activating ? 'Validando Licencia...' : 'Validar y Activar Licencia'}</span>
                  </button>
                </div>
              </form>

              {/* Instructions box */}
              <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl text-xs text-blue-900 space-y-1">
                <span className="font-bold block">¿Cómo adquirir una clave oficial?</span>
                <p className="text-blue-800 text-[11px]">
                  Contáctanos indicando tu <strong>ID de Instalación ({license?.systemId})</strong> y el plan seleccionado (Mensual, Semestral, Anual o Vitalicio). Recibirás tu clave de inmediato para activación permanente.
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: GENERATOR (ADMIN/DISTRIBUTOR) */}
          {activeTab === 'generator' && (
            <div className="space-y-6">
              <div className="bg-indigo-50/70 p-4 rounded-2xl border border-indigo-200 flex items-start gap-3">
                <Wrench className="w-5 h-5 text-indigo-700 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-indigo-950 space-y-0.5">
                  <span className="font-bold block">Herramienta del Distribuidor & Administrador</span>
                  <p className="text-indigo-800">
                    Genera claves de activación oficiales con algoritmos criptográficos para cualquier cliente o terminal. Puedes copiar la clave o activarla al instante en este equipo.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                    Seleccionar Plan a Generar
                  </label>
                  <select
                    value={genPlan}
                    onChange={(e) => setGenPlan(e.target.value as LicenseType)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="demo">Demo de Prueba (15 días)</option>
                    <option value="monthly">Mensual (30 días)</option>
                    <option value="semiannual">Semestral (180 días)</option>
                    <option value="annual">Anual (365 días) - Más Popular</option>
                    <option value="lifetime">Vitalicio (Permanente de por vida)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                    Asociar a ID de Sistema (Opcional)
                  </label>
                  <input
                    type="text"
                    value={license?.systemId || ''}
                    readOnly
                    className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-700"
                  />
                </div>
              </div>

              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={handleGenerateKey}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md shadow-indigo-600/20 flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-indigo-200" />
                  <span>Generar Nueva Clave Oficial</span>
                </button>
              </div>

              {generatedKey && (
                <div className="bg-slate-900 text-white p-5 rounded-2xl space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                      Clave de Activación Generada:
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-950 text-indigo-300 rounded-full border border-indigo-800">
                      PLAN {genPlan.toUpperCase()}
                    </span>
                  </div>

                  <div className="font-mono text-base sm:text-lg font-black tracking-wider text-emerald-400 bg-slate-950 px-4 py-3 rounded-xl border border-slate-800 select-all break-all">
                    {generatedKey}
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleCopyKey(generatedKey)}
                      className="w-full sm:w-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {copiedKey ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>¡Clave Copiada!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-400" />
                          <span>Copiar Clave al Portapapeles</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleDirectApplyGenerated}
                      disabled={activating}
                      className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer ml-auto"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Activar Directamente en este Equipo</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-5 sm:px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2.5">
            <img 
              src={logoImg} 
              alt="AItech Soluciones, C. A." 
              className="w-5 h-5 rounded-md object-contain bg-slate-900 p-0.5 border border-slate-700" 
              referrerPolicy="no-referrer"
            />
            <span className="font-medium text-slate-700">Desarrollado con IA por AItech Soluciones, C. A.</span>
          </div>
          <button
            onClick={() => setIsLicenseModalOpen(false)}
            className="px-4 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
