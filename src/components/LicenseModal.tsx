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
  Terminal,
  Lock,
  Unlock,
  MessageCircle,
  Share2,
  Send,
  HelpCircle
} from 'lucide-react';
import { LICENSE_PLANS, generateLicenseKey, validateLicenseKey } from '../utils/licenseUtils';
import { LicenseType } from '../types/license';
import { formatPhoneForWhatsApp } from '../utils/ticketImage';
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
  
  // Activation form (Client)
  const [activationKey, setActivationKey] = useState('');
  const [businessName, setBusinessName] = useState(license?.licensedTo || state.settings.storeName);
  const [activating, setActivating] = useState(false);
  const [activationResult, setActivationResult] = useState<{ success: boolean; message: string } | null>(null);

  // Generator form (Distributor / Commercializer)
  const [genPlan, setGenPlan] = useState<LicenseType>('annual');
  const [targetSystemId, setTargetSystemId] = useState(license?.systemId || '');
  const [targetBusinessName, setTargetBusinessName] = useState(license?.licensedTo || state.settings.storeName);
  const [targetPhone, setTargetPhone] = useState('');
  const [generatedKey, setGeneratedKey] = useState('');
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedSysId, setCopiedSysId] = useState(false);

  // Security Lock for Generator (Admin/Distributor PIN: 1234 by default or admin PIN)
  const [isGeneratorUnlocked, setIsGeneratorUnlocked] = useState(false);
  const [distributorPin, setDistributorPin] = useState('');
  const [distributorPinError, setDistributorPinError] = useState('');

  if (!isLicenseModalOpen) return null;

  const DISTRIBUTOR_WHATSAPP = '584121234567'; // Central Distributor Line

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

  // Generate an official key for any client machine
  const handleGenerateKey = () => {
    const key = generateLicenseKey(genPlan, targetSystemId.trim() || undefined);
    setGeneratedKey(key);
  };

  // Quick apply generated key on this current terminal
  const handleDirectApplyGenerated = async () => {
    if (!generatedKey) return;
    setActivating(true);
    try {
      const res = await activateLicenseKey(generatedKey, targetBusinessName || businessName);
      setActivationResult(res);
      if (res.success) {
        setActiveTab('status');
      }
    } finally {
      setActivating(false);
    }
  };

  // Reset Demo to 15 days
  const handleResetDemo = async () => {
    if (confirm('¿Deseas reiniciar la Versión Demo por 15 días completos de evaluación?')) {
      await resetDemoLicense();
      setActiveTab('status');
    }
  };

  // Unlock Distributor Generator with Master PIN (Configured: 9900)
  const handleUnlockGenerator = (e: React.FormEvent) => {
    e.preventDefault();
    if (distributorPin.trim() === '9900') {
      setIsGeneratorUnlocked(true);
      setDistributorPinError('');
    } else {
      setDistributorPinError('PIN Maestro incorrecto. Acceso denegado.');
    }
  };

  // Client requests key to Distributor via WhatsApp
  const handleClientRequestKey = (planName?: string) => {
    const plan = planName || (genPlan.toUpperCase());
    const store = license?.licensedTo || state.settings.storeName;
    const sysId = license?.systemId || 'OMNI-DEFAULT';

    const msg = `👋 *Hola! Deseo activar la licencia de OmniPOS Retail para mi comercio.*

🏪 *Negocio:* ${store}
💻 *ID de Mi Equipo:* ${sysId}
📋 *Plan Deseado:* ${plan}

Por favor indícame los datos y métodos de pago (Pago Móvil, Zelle o Transferencia) para proceder con la activación. ¡Gracias!`;

    const url = `https://api.whatsapp.com/send?phone=${DISTRIBUTOR_WHATSAPP}&text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  // Distributor sends generated key to client via WhatsApp
  const handleSendKeyToClientWhatsApp = () => {
    if (!generatedKey) return;

    const planObj = LICENSE_PLANS.find(p => p.id === genPlan);
    const planLabel = planObj?.name || genPlan.toUpperCase();
    const cleanPhone = formatPhoneForWhatsApp(targetPhone);

    const msg = `🎉 *¡Tu Licencia Oficial de OmniPOS Retail ha sido Generada con Éxito!*

🏪 *Comercio Titular:* ${targetBusinessName || 'Tu Negocio'}
📋 *Plan Comercial:* ${planLabel} (${planObj?.periodLabel || 'Permanente'})
💻 *ID de Equipo Asociado:* ${targetSystemId || 'General'}

🔑 *CLAVE DE ACTIVACIÓN OFICIAL:*
${generatedKey}

*Instrucciones de Activación:*
1. Abre tu sistema OmniPOS en tu computador o punto de venta.
2. Haz clic en "Activar Licencia" (en la parte superior o en Ajustes).
3. Pega esta clave y presiona "Validar y Activar Licencia".

¡Tu sistema quedará completamente activado y operativo! Gracias por tu preferencia. 🚀`;

    const url = cleanPhone
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(msg)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;

    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[94vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-4 sm:p-6 flex items-center justify-between border-b border-slate-700/60">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-bold">Licenciamiento & Planes Comerciales</h3>
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
                Activación de terminales, suscripciones mensuales/anuales y venta comercial
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
            <span>Planes & Precios</span>
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
            title="Herramienta del Distribuidor para emitir licencias a clientes"
          >
            <Wrench className="w-3.5 h-3.5 text-indigo-500" />
            <span>Generador (Distribuidor)</span>
            {!isGeneratorUnlocked && <Lock className="w-3 h-3 text-slate-400 ml-1" />}
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">

          {/* TAB 1: STATUS */}
          {activeTab === 'status' && (
            <div className="space-y-5">
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

                    <h4 className="text-xl sm:text-2xl font-black text-slate-900 mt-2">
                      {licenseInfo.typeName}
                    </h4>
                    
                    <p className="text-xs text-slate-600 mt-1">
                      {licenseInfo.isLifetime
                        ? 'Acceso Vitalicio Ilimitado. Sin vencimiento ni cuotas mensuales.'
                        : licenseInfo.isExpired
                        ? 'Tu período ha expirado. Ingresa una nueva clave para continuar operando.'
                        : `Válido hasta: ${licenseInfo.formattedExpiry} (${licenseInfo.formattedRemaining})`}
                    </p>
                  </div>

                  {!licenseInfo.isLifetime && !licenseInfo.isExpired && (
                    <div className="bg-white p-3 rounded-xl border border-slate-200 text-center sm:text-right shadow-xs min-w-[140px]">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Tiempo Restante</span>
                      <div className="text-2xl font-black text-slate-900">
                        {licenseInfo.daysRemaining} <span className="text-xs font-normal text-slate-500">días</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden">
                        <div 
                          className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                          style={{ width: `${Math.max(5, 100 - licenseInfo.percentElapsed)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Technical / Machine Details */}
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
                    Este ID identifica este terminal único para emitir claves personalizadas.
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
            <div className="space-y-5">
              <div className="text-center max-w-lg mx-auto">
                <h4 className="text-lg font-bold text-slate-900">
                  Planes de Suscripción & Licenciamiento
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Planes diseñados para comercializar el sistema a clientes finales con diferentes períodos.
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
                          {plan.features.slice(0, 4).map((f, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <Check className="w-3.5 h-3.5 text-emerald-600 mt-0.5 flex-shrink-0" />
                              <span>{f}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="pt-4 mt-4 border-t border-slate-100 space-y-2">
                        {isCurrent ? (
                          <div className="w-full py-2 bg-emerald-50 text-emerald-800 rounded-xl text-center text-xs font-bold border border-emerald-200">
                            ✓ Plan Activo Actualmente
                          </div>
                        ) : (
                          <>
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
                              <span>Ingresar Clave para este Plan</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleClientRequestKey(plan.name)}
                              className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold border border-emerald-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>Pedir Clave por WhatsApp</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Demo Version Reset */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div>
                  <span className="font-bold text-slate-900 block">¿Versión Demo de Prueba?</span>
                  <span className="text-slate-500">
                    Tus clientes pueden evaluar todas las funciones sin restricciones durante 15 días continuos.
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

          {/* TAB 3: ACTIVATE (CLIENT FACING) */}
          {activeTab === 'activate' && (
            <div className="max-w-xl mx-auto space-y-5">
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

              {/* Client WhatsApp Request Helper */}
              <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl text-xs text-blue-900 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="space-y-1">
                  <span className="font-bold block">¿No tienes clave de activación?</span>
                  <p className="text-blue-800 text-[11px]">
                    Envía tu <strong>ID de Equipo ({license?.systemId})</strong> al distribuidor para adquirir tu clave en minutos.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleClientRequestKey()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Contactar Distribuidor</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: GENERATOR (ADMIN / DISTRIBUTOR WITH MASTER PIN SECURITY) */}
          {activeTab === 'generator' && (
            <div className="space-y-5">
              {!isGeneratorUnlocked ? (
                /* Master PIN Lock Screen to protect distributor tool from clients */
                <div className="max-w-md mx-auto py-6 space-y-4 text-center">
                  <div className="w-14 h-14 rounded-3xl bg-indigo-50 border-2 border-indigo-200 text-indigo-700 flex items-center justify-center mx-auto shadow-inner">
                    <Lock className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="text-base font-black text-slate-900">
                      Acceso Restringido a Distribuidores
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Esta herramienta permite emitir claves oficiales y controlar vencimientos. Ingrese el PIN de Distribuidor o Administrador para continuar.
                    </p>
                  </div>

                  <form onSubmit={handleUnlockGenerator} className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
                    <input
                      type="password"
                      autoFocus
                      placeholder="PIN Maestro"
                      value={distributorPin}
                      onChange={(e) => setDistributorPin(e.target.value)}
                      className="w-full text-center px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-base font-black font-mono tracking-widest text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />

                    {distributorPinError && (
                      <p className="text-xs font-bold text-rose-600">{distributorPinError}</p>
                    )}

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md transition-colors cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Unlock className="w-4 h-4" />
                      <span>Desbloquear Generador</span>
                    </button>
                  </form>
                </div>
              ) : (
                /* Unlocked Generator Tool */
                <div className="space-y-5">
                  <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white p-4 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-indigo-500 flex items-center justify-center text-white">
                        <Wrench className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-black text-sm text-indigo-200">Panel de Emisión de Licencias</div>
                        <div className="text-xs text-slate-300">Genera claves criptográficas oficiales para cualquier cliente o tienda</div>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsGeneratorUnlocked(false)}
                      className="text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 cursor-pointer"
                    >
                      Bloquear
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        1. Plan a Emitir
                      </label>
                      <select
                        value={genPlan}
                        onChange={(e) => setGenPlan(e.target.value as LicenseType)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="demo">Demo de Prueba (15 días)</option>
                        <option value="monthly">Mensual (30 días - $15)</option>
                        <option value="semiannual">Semestral (180 días - $75)</option>
                        <option value="annual">Anual (365 días - $120)</option>
                        <option value="lifetime">Vitalicio (Permanente - $290)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        2. ID de Equipo del Cliente
                      </label>
                      <input
                        type="text"
                        placeholder="Ej: OMNI-A1B2-C3D4"
                        value={targetSystemId}
                        onChange={(e) => setTargetSystemId(e.target.value.toUpperCase())}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        3. Teléfono WhatsApp Cliente
                      </label>
                      <input
                        type="tel"
                        placeholder="Ej: 0414-1234567"
                        value={targetPhone}
                        onChange={(e) => setTargetPhone(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800"
                      />
                    </div>
                  </div>

                  <div className="flex justify-center pt-1">
                    <button
                      type="button"
                      onClick={handleGenerateKey}
                      className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl text-xs shadow-md shadow-indigo-600/20 flex items-center gap-2 transition-all cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4 text-indigo-200" />
                      <span>Generar Clave Oficial Criptográfica</span>
                    </button>
                  </div>

                  {generatedKey && (
                    <div className="bg-slate-950 text-white p-4 sm:p-5 rounded-2xl space-y-3 border border-slate-800 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                          Clave Oficial Generada para el Cliente:
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-900 text-indigo-200 rounded-full">
                          PLAN: {genPlan.toUpperCase()}
                        </span>
                      </div>

                      <div className="font-mono text-sm sm:text-base font-black tracking-wider text-emerald-400 bg-slate-900 px-4 py-3 rounded-xl border border-slate-800 select-all break-all">
                        {generatedKey}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleCopyKey(generatedKey)}
                          className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                          <span>{copiedKey ? '¡Copiada!' : 'Copiar Clave'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleSendKeyToClientWhatsApp}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Enviar Clave al Cliente por WhatsApp</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleDirectApplyGenerated}
                          disabled={activating}
                          className="px-3.5 py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer ml-auto"
                          title="Aplica esta clave de inmediato en esta misma máquina"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Activar en este equipo</span>
                        </button>
                      </div>
                    </div>
                  )}
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
              alt="AITECH SOLUCIONES C.A." 
              className="w-7 h-7 rounded-lg object-contain bg-white p-0.5 border border-slate-300 shadow-2xs" 
              referrerPolicy="no-referrer"
            />
            <span className="font-semibold text-slate-800">AITECH SOLUCIONES C.A. — Plataforma Retail & Punto de Venta</span>
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
