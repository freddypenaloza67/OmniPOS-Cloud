import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { StoreSettings, PosUser, UserRole } from '../types';
import { 
  Settings, 
  Store, 
  DollarSign, 
  Cloud, 
  Save, 
  RefreshCw, 
  Download, 
  Upload, 
  Smartphone, 
  RotateCcw, 
  Check, 
  ShieldCheck, 
  KeyRound, 
  Crown, 
  Sparkles, 
  Clock, 
  Copy, 
  Users, 
  Building2, 
  Printer, 
  Plus, 
  Trash2, 
  Edit, 
  Lock, 
  CheckCircle2, 
  AlertCircle,
  X,
  Palette,
  Sun,
  Moon,
  Eye 
} from 'lucide-react';
import { formatLocal, formatUSD } from '../utils/formatters';
import { printThermalReceipt } from '../utils/thermalPrinter';
import logoImg from '../assets/images/aitech_soluciones_logo_1790636280793.jpg';

const AVAILABLE_CURRENCIES = [
  { code: 'VES', symbol: 'Bs.', name: 'Bolívar Digital (Venezuela)' },
  { code: 'COP', symbol: '$', name: 'Peso Colombiano (Colombia)' },
  { code: 'MXN', symbol: '$', name: 'Peso Mexicano (México)' },
  { code: 'EUR', symbol: '€', name: 'Euro (Unión Europea)' },
  { code: 'ARS', symbol: '$', name: 'Peso Argentino (Argentina)' },
  { code: 'PEN', symbol: 'S/.', name: 'Sol Peruano (Perú)' },
  { code: 'BRL', symbol: 'R$', name: 'Real Brasileño (Brasil)' },
  { code: 'CLP', symbol: '$', name: 'Peso Chileno (Chile)' },
];

type SettingsTab = 'general' | 'appearance' | 'currency' | 'users' | 'banks' | 'printer' | 'license' | 'backup';

export const SettingsView: React.FC = () => {
  const { 
    state, 
    updateSettings, 
    refreshExchangeRate, 
    resetToDemoData, 
    exportDataJSON, 
    importDataJSON,
    license,
    licenseInfo,
    setIsLicenseModalOpen,
    activateLicenseKey,
    addUser,
    updateUser,
    deleteUser,
    currentUser,
    theme,
    setTheme
  } = useStore();

  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [form, setForm] = useState<StoreSettings>({ 
    ...state.settings,
    configuredBanks: state.settings.configuredBanks || [
      'Banesco', 'Banco de Venezuela', 'Mercantil', 'BBVA Provincial', 'BNC', 'Bancaribe', 'Banplus', 'Otro'
    ],
    defaultThermalWidth: state.settings.defaultThermalWidth || '80mm'
  });
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [quickKey, setQuickKey] = useState('');
  const [quickActivating, setQuickActivating] = useState(false);
  const [quickMsg, setQuickMsg] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedSysId, setCopiedSysId] = useState(false);

  // Bank management state
  const [newBankName, setNewBankName] = useState('');

  // User management state
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<PosUser | null>(null);
  const [userForm, setUserForm] = useState<{
    name: string;
    role: UserRole;
    pin: string;
    email: string;
    active: boolean;
  }>({
    name: '',
    role: 'cajero',
    pin: '',
    email: '',
    active: true
  });
  const [userError, setUserError] = useState<string | null>(null);

  const usersList = state.users && state.users.length > 0 ? state.users : [];

  const handleQuickActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickKey.trim()) return;
    setQuickActivating(true);
    setQuickMsg(null);
    try {
      const res = await activateLicenseKey(quickKey.trim());
      setQuickMsg(res);
      if (res.success) {
        setQuickKey('');
      }
    } finally {
      setQuickActivating(false);
    }
  };

  const handleCopySystemId = () => {
    if (license?.systemId) {
      navigator.clipboard.writeText(license.systemId);
      setCopiedSysId(true);
      setTimeout(() => setCopiedSysId(false), 2000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateSettings(form);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleCurrencyChange = (code: string) => {
    const found = AVAILABLE_CURRENCIES.find(c => c.code === code);
    if (found) {
      setForm(prev => ({
        ...prev,
        secondaryCurrency: {
          code: found.code,
          symbol: found.symbol,
          name: found.name
        }
      }));
      refreshExchangeRate(found.code);
    }
  };

  const handleFetchRate = async () => {
    setIsRefreshing(true);
    try {
      await refreshExchangeRate(form.secondaryCurrency.code);
      setForm(prev => ({
        ...prev,
        exchangeRate: state.settings.exchangeRate
      }));
    } finally {
      setIsRefreshing(false);
    }
  };

  // Bank handling
  const handleAddBank = () => {
    if (!newBankName.trim()) return;
    const currentBanks = form.configuredBanks || [];
    if (!currentBanks.includes(newBankName.trim())) {
      const updated = [...currentBanks, newBankName.trim()];
      setForm(prev => ({ ...prev, configuredBanks: updated }));
      updateSettings({ ...form, configuredBanks: updated });
    }
    setNewBankName('');
  };

  const handleRemoveBank = (bankToRemove: string) => {
    const currentBanks = form.configuredBanks || [];
    const updated = currentBanks.filter(b => b !== bankToRemove);
    setForm(prev => ({ ...prev, configuredBanks: updated }));
    updateSettings({ ...form, configuredBanks: updated });
  };

  // User handling
  const handleOpenAddUser = () => {
    setEditingUser(null);
    setUserForm({
      name: '',
      role: 'cajero',
      pin: '',
      email: '',
      active: true
    });
    setUserError(null);
    setIsUserModalOpen(true);
  };

  const handleOpenEditUser = (user: PosUser) => {
    setEditingUser(user);
    setUserForm({
      name: user.name,
      role: user.role,
      pin: user.pin,
      email: user.email || '',
      active: user.active
    });
    setUserError(null);
    setIsUserModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserError(null);

    if (!userForm.name.trim()) {
      setUserError('El nombre del usuario es obligatorio.');
      return;
    }
    if (!userForm.pin || userForm.pin.length < 4) {
      setUserError('El PIN debe contener al menos 4 dígitos numéricos.');
      return;
    }

    // Check PIN uniqueness
    const pinConflict = usersList.find(u => u.pin === userForm.pin && (!editingUser || u.id !== editingUser.id));
    if (pinConflict) {
      setUserError(`El PIN ${userForm.pin} ya está asignado a ${pinConflict.name}. Use otro PIN.`);
      return;
    }

    if (editingUser) {
      await updateUser({
        ...editingUser,
        name: userForm.name.trim(),
        role: userForm.role,
        pin: userForm.pin.trim(),
        email: userForm.email.trim(),
        active: userForm.active
      });
    } else {
      await addUser({
        name: userForm.name.trim(),
        role: userForm.role,
        pin: userForm.pin.trim(),
        email: userForm.email.trim(),
        active: userForm.active
      });
    }

    setIsUserModalOpen(false);
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (usersList.length <= 1) {
      alert('No se puede eliminar el único usuario del sistema.');
      return;
    }
    if (confirm(`¿Está seguro de eliminar el usuario "${name}"?`)) {
      await deleteUser(id);
    }
  };

  const handleTestThermalPrint = () => {
    // Generate a quick test receipt
    const mockSale = state.sales[0] || {
      id: 'test-1',
      invoiceNumber: 'PRUEBA-001',
      date: new Date().toISOString(),
      customerName: 'Cliente de Prueba',
      items: [
        {
          productId: '1',
          productName: 'Producto de Prueba Térmica',
          sku: 'TEST',
          quantity: 1,
          unitPriceUSD: 5.0,
          subtotalUSD: 5.0,
          costUSD: 2.0
        }
      ],
      subtotalUSD: 5.0,
      discountUSD: 0,
      taxUSD: 0,
      totalUSD: 5.0,
      totalLocal: 5.0 * form.exchangeRate,
      exchangeRateUsed: form.exchangeRate,
      currencyCode: form.secondaryCurrency.code,
      currencySymbol: form.secondaryCurrency.symbol,
      paymentMethods: [
        {
          gateway: 'cash_usd' as const,
          gatewayName: 'Efectivo $',
          amountUSD: 5.0,
          amountLocal: 5.0 * form.exchangeRate
        }
      ],
      amountReceivedUSD: 5.0,
      changeGivenUSD: 0,
      changeGivenLocal: 0,
      status: 'completed' as const
    };
    printThermalReceipt(mockSale, form, form.defaultThermalWidth || '80mm');
  };

  const tabs: Array<{ id: SettingsTab; label: string; icon: any }> = [
    { id: 'general', label: 'Comercio', icon: Store },
    { id: 'appearance', label: 'Tema & Apariencia 3D', icon: Palette },
    { id: 'currency', label: 'Monedas & Tasa', icon: DollarSign },
    { id: 'users', label: 'Usuarios & PIN', icon: Users },
    { id: 'banks', label: 'Bancos & Cuentas', icon: Building2 },
    { id: 'printer', label: 'Impresora Térmica', icon: Printer },
    { id: 'license', label: 'Licencia & Sistema', icon: KeyRound },
    { id: 'backup', label: 'Base de Datos', icon: Cloud },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-[var(--text-main)] tracking-tight flex items-center gap-2">
            <span>⚙️</span>
            <span>Ajustes del Sistema</span>
          </h2>
          <p className="text-xs text-[var(--text-muted)] font-medium mt-0.5">
            Configuración global de tu negocio, apariencia 3D, monedas, usuarios y cuentas
          </p>
        </div>

        {savedSuccess && (
          <div className="px-4 py-2 clay-card-subtle text-xs font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>¡Cambios guardados con éxito!</span>
          </div>
        )}
      </div>

      {/* Tabs Bar (Separación de sub-ajustes) */}
      <div className="clay-card-subtle p-1.5 flex items-center gap-1.5 overflow-x-auto">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2.5 rounded-2xl text-xs font-black flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'clay-btn clay-btn-purple text-white shadow-md'
                  : 'clay-btn-surface text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              <Icon className="w-4 h-4 stroke-[2.5]" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB APARIENCIA: ESTILO 3D CLAYMORPHIC Y SELECCIÓN DE TEMAS                */}
      {/* ========================================================================= */}
      {activeTab === 'appearance' && (
        <div className="clay-card p-5 sm:p-7 space-y-6 shadow-xl">
          <div className="border-b border-[var(--clay-card-border)] pb-4">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-2xl clay-btn clay-btn-purple text-white shadow-sm">
                <Palette className="w-5 h-5 stroke-[2.5]" />
              </span>
              <div>
                <h3 className="text-base sm:text-lg font-black text-[var(--text-main)]">
                  Estilo 3D Claymorphic & Temas Visuales
                </h3>
                <p className="text-xs text-[var(--text-muted)] font-medium mt-0.5">
                  Personaliza la experiencia visual del cajero y administrador con superficies infladas 3D, relieves suaves y protección ocular.
                </p>
              </div>
            </div>
          </div>

          {/* Selector de los 3 Temas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            
            {/* 1. TEMA CLARO (SOFT DAYLIGHT) */}
            <div 
              onClick={() => setTheme('light')}
              className={`clay-card p-5 cursor-pointer relative transition-all group ${
                theme === 'light'
                  ? 'ring-3 ring-amber-400 shadow-xl scale-102 bg-white'
                  : 'hover:scale-101 opacity-90 hover:opacity-100'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-2xl clay-btn clay-btn-amber text-slate-950 flex items-center justify-center shadow-md">
                  <Sun className="w-5 h-5 stroke-[2.5]" />
                </div>
                {theme === 'light' && (
                  <span className="clay-badge clay-btn-emerald text-white text-[10px] font-black">
                    ✓ ACTIVO
                  </span>
                )}
              </div>
              <h4 className="text-sm font-black text-slate-900">Tema Claro (Daylight Clay)</h4>
              <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                Superficie blanca nácar con relieve táctil inflado, sombras difusas suaves y botones con brillo interior. Ideal para entornos luminosos y retail de día.
              </p>

              {/* Previsualización visual miniatura */}
              <div className="mt-4 p-3 rounded-2xl bg-[#eef2f7] border border-slate-200/80 space-y-2">
                <div className="p-2 rounded-xl bg-white shadow-sm border border-white flex justify-between items-center text-[10px] font-black text-slate-800">
                  <span>Tarjeta 3D Soft</span>
                  <span className="text-emerald-600">$ 45.00</span>
                </div>
                <div className="flex gap-1.5">
                  <div className="px-2 py-1 rounded-lg bg-gradient-to-br from-amber-400 to-amber-500 text-slate-950 text-[9px] font-black shadow-xs">
                    Botón Clay
                  </div>
                  <div className="px-2 py-1 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 text-white text-[9px] font-black shadow-xs">
                    Cobrar
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setTheme('light');
                  }}
                  className={`w-full py-2.5 rounded-xl font-black text-xs transition-all ${
                    theme === 'light'
                      ? 'clay-btn clay-btn-amber text-slate-950 shadow-md'
                      : 'clay-btn-surface text-slate-700 hover:text-slate-950'
                  }`}
                >
                  {theme === 'light' ? 'Tema Seleccionado' : 'Activar Tema Claro'}
                </button>
              </div>
            </div>

            {/* 2. TEMA OSCURO (MIDNIGHT CLAY) */}
            <div 
              onClick={() => setTheme('dark')}
              className={`clay-card p-5 cursor-pointer relative transition-all group bg-[#0f172a] text-white ${
                theme === 'dark'
                  ? 'ring-3 ring-purple-500 shadow-xl scale-102'
                  : 'hover:scale-101 opacity-90 hover:opacity-100'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-2xl clay-btn clay-btn-purple text-white flex items-center justify-center shadow-md">
                  <Moon className="w-5 h-5 stroke-[2.5]" />
                </div>
                {theme === 'dark' && (
                  <span className="clay-badge clay-btn-purple text-white text-[10px] font-black">
                    ✓ ACTIVO
                  </span>
                )}
              </div>
              <h4 className="text-sm font-black text-white">Tema Oscuro (Midnight Clay)</h4>
              <p className="text-xs text-slate-300 font-medium mt-1 leading-relaxed">
                Tono medianoche con bisel luminoso superior (ambient glow), sombras de profundidad envolventes y acentos de color eléctrico. Agradable y elegante.
              </p>

              {/* Previsualización visual miniatura */}
              <div className="mt-4 p-3 rounded-2xl bg-[#080c14] border border-white/10 space-y-2">
                <div className="p-2 rounded-xl bg-[#161f30] shadow-sm border border-white/10 flex justify-between items-center text-[10px] font-black text-white">
                  <span>Tarjeta 3D Dark</span>
                  <span className="text-emerald-400">$ 45.00</span>
                </div>
                <div className="flex gap-1.5">
                  <div className="px-2 py-1 rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 text-white text-[9px] font-black shadow-xs">
                    Botón Clay
                  </div>
                  <div className="px-2 py-1 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 text-white text-[9px] font-black shadow-xs">
                    Cobrar
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setTheme('dark');
                  }}
                  className={`w-full py-2.5 rounded-xl font-black text-xs transition-all ${
                    theme === 'dark'
                      ? 'clay-btn clay-btn-purple text-white shadow-md'
                      : 'clay-btn-surface text-slate-300 hover:text-white'
                  }`}
                >
                  {theme === 'dark' ? 'Tema Seleccionado' : 'Activar Tema Oscuro'}
                </button>
              </div>
            </div>

            {/* 3. TEMA DESCANSO OCULAR (WARM AMBER / SEPIA ANTI-FATIGA) */}
            <div 
              onClick={() => setTheme('eyecare')}
              className={`clay-card p-5 cursor-pointer relative transition-all group bg-[#fdfbf7] text-[#2b2014] ${
                theme === 'eyecare'
                  ? 'ring-3 ring-amber-500 shadow-xl scale-102 border-amber-300'
                  : 'hover:scale-101 opacity-90 hover:opacity-100'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-2xl bg-[#d97706] text-white flex items-center justify-center shadow-md border border-amber-300">
                  <Eye className="w-5 h-5 stroke-[2.5]" />
                </div>
                {theme === 'eyecare' && (
                  <span className="clay-badge bg-[#d97706] text-white text-[10px] font-black">
                    ✓ ACTIVO
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <h4 className="text-sm font-black text-[#2b2014]">Descanso Ocular</h4>
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-300">
                  Anti-fatiga
                </span>
              </div>
              <p className="text-xs text-[#7d6e5d] font-medium mt-1 leading-relaxed">
                Paleta cálida ámbar, pergamino y marfil suave que filtra la luz azul. Reduce drásticamente la tensión en los ojos durante turnos continuos de caja.
              </p>

              {/* Previsualización visual miniatura */}
              <div className="mt-4 p-3 rounded-2xl bg-[#f4ecdf] border border-[#e2d6c3] space-y-2">
                <div className="p-2 rounded-xl bg-[#fdfbf7] shadow-sm border border-white flex justify-between items-center text-[10px] font-black text-[#2b2014]">
                  <span>Tarjeta Cálida Sepia</span>
                  <span className="text-emerald-700">$ 45.00</span>
                </div>
                <div className="flex gap-1.5">
                  <div className="px-2 py-1 rounded-lg bg-amber-500 text-white text-[9px] font-black shadow-xs">
                    Luz Cálida
                  </div>
                  <div className="px-2 py-1 rounded-lg bg-emerald-600 text-white text-[9px] font-black shadow-xs">
                    0% Luz Azul
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setTheme('eyecare');
                  }}
                  className={`w-full py-2.5 rounded-xl font-black text-xs transition-all ${
                    theme === 'eyecare'
                      ? 'bg-[#d97706] text-white shadow-md border border-amber-300'
                      : 'clay-btn-surface text-[#7d6e5d] hover:text-[#2b2014]'
                  }`}
                >
                  {theme === 'eyecare' ? 'Tema Seleccionado' : 'Activar Descanso Ocular'}
                </button>
              </div>
            </div>

          </div>

          {/* Información adicional de confort visual */}
          <div className="p-4 rounded-2xl clay-card-subtle flex items-start gap-3 text-xs">
            <span className="text-lg">💡</span>
            <div className="text-[var(--text-muted)] space-y-1">
              <span className="font-black text-[var(--text-main)] block">
                Atajo rápido en barra superior
              </span>
              <p>
                También puedes alternar entre Claro, Oscuro y Descanso Ocular en cualquier momento desde los botones rápidos con iconos de <strong>Sol (☀️)</strong>, <strong>Luna (🌙)</strong> y <strong>Ojo (👁️)</strong> situados en la barra superior junto al indicador de estado. Tu preferencia se guarda automáticamente en el navegador y en los ajustes del sistema.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: COMERCIO & DATOS GENERALES                                         */}
      {/* ========================================================================= */}
      {activeTab === 'general' && (
        <form onSubmit={handleSubmit} className="bg-white p-5 sm:p-6 rounded-3xl border-2 border-slate-900 shadow-[4px_4px_0px_#0f172a] space-y-4">
          <div className="border-b-2 border-slate-100 pb-3">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Store className="w-5 h-5 text-amber-500" />
              <span>Identidad y Datos Fiscales del Negocio</span>
            </h3>
            <p className="text-xs text-slate-500">
              Esta información se imprime en el encabezado de las facturas y tickets térmicos
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-700 font-bold uppercase mb-1">Nombre del Establecimiento</label>
              <input
                type="text"
                required
                value={form.storeName}
                onChange={(e) => setForm({ ...form, storeName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-900 rounded-xl font-black text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-amber-400"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold uppercase mb-1">RIF / Cédula / Documento Fiscal</label>
              <input
                type="text"
                required
                value={form.taxId}
                onChange={(e) => setForm({ ...form, taxId: e.target.value })}
                placeholder="Ej: J-12345678-9"
                className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-900 rounded-xl font-black text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-amber-400 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold uppercase mb-1">Teléfonos de Contacto</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-900 rounded-xl font-bold text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-amber-400"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold uppercase mb-1">Correo Electrónico</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-900 rounded-xl font-bold text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-amber-400"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-slate-700 font-bold uppercase mb-1">Dirección Física del Local</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-900 rounded-xl font-medium text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-amber-400"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-slate-700 font-bold uppercase mb-1">Pie de Página del Ticket / Comprobante</label>
              <textarea
                rows={2}
                value={form.receiptFooter}
                onChange={(e) => setForm({ ...form, receiptFooter: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-900 rounded-xl font-medium text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-amber-400"
              />
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t-2 border-slate-100">
            <button
              type="submit"
              className="px-6 py-3 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black rounded-xl border-2 border-slate-900 shadow-[3px_3px_0px_#0f172a] active:translate-y-0.5 transition-all cursor-pointer flex items-center gap-2 text-xs"
            >
              <Save className="w-4 h-4" />
              <span>Guardar Datos del Negocio</span>
            </button>
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: MONEDAS, TASA DEL DÓLAR E IMPUESTOS                                */}
      {/* ========================================================================= */}
      {activeTab === 'currency' && (
        <form onSubmit={handleSubmit} className="bg-white p-5 sm:p-6 rounded-3xl border-2 border-slate-900 shadow-[4px_4px_0px_#0f172a] space-y-4">
          <div className="border-b-2 border-slate-100 pb-3">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              <span>Configuración Multimoneda & Tasa Oficial</span>
            </h3>
            <p className="text-xs text-slate-500">
              Manejo bimoneda automático (USD como base de catálogo y Bolívares / Moneda local)
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-700 font-bold uppercase mb-1">Moneda Secundaria (Local)</label>
              <select
                value={form.secondaryCurrency.code}
                onChange={(e) => handleCurrencyChange(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-900 rounded-xl font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer"
              >
                {AVAILABLE_CURRENCIES.map(c => (
                  <option key={c.code} value={c.code}>
                    {c.code} - {c.name} ({c.symbol})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-bold uppercase mb-1">Símbolo Monetario</label>
              <input
                type="text"
                value={form.secondaryCurrency.symbol}
                onChange={(e) => setForm({
                  ...form,
                  secondaryCurrency: { ...form.secondaryCurrency, symbol: e.target.value }
                })}
                className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-900 rounded-xl font-black text-slate-900 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold uppercase mb-1">
                Tasa de Cambio del Día (1 USD = X {form.secondaryCurrency.symbol})
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={form.exchangeRate}
                  onChange={(e) => setForm({ ...form, exchangeRate: parseFloat(e.target.value) || 0 })}
                  className="flex-1 px-3 py-2 bg-slate-50 border-2 border-slate-900 rounded-xl font-mono font-black text-slate-900 text-sm focus:outline-none focus:bg-white"
                />
                <button
                  type="button"
                  onClick={handleFetchRate}
                  disabled={isRefreshing}
                  className="px-3 py-2 bg-cyan-100 hover:bg-cyan-200 text-slate-950 border-2 border-slate-900 rounded-xl font-bold flex items-center gap-1 shadow-[1px_1px_0px_#0f172a] active:translate-y-0.5 cursor-pointer"
                  title="Consultar tasa en vivo"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Actualizar</span>
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Última actualización: {new Date(form.lastRateUpdate).toLocaleString()}</p>
            </div>

            <div>
              <label className="block text-slate-700 font-bold uppercase mb-1">Porcentaje de IVA / Impuestos (%)</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={form.taxPercentage}
                  onChange={(e) => setForm({ ...form, taxPercentage: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-900 rounded-xl font-black text-slate-900 focus:outline-none focus:bg-white"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 font-black text-slate-400">%</span>
              </div>
            </div>

            <div className="sm:col-span-2 pt-2">
              <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border-2 border-slate-900 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.autoUpdateRate}
                  onChange={(e) => setForm({ ...form, autoUpdateRate: e.target.checked })}
                  className="w-5 h-5 rounded-lg text-emerald-600 border-2 border-slate-900 focus:ring-0 cursor-pointer"
                />
                <div>
                  <span className="font-black text-slate-900 block text-xs">Actualización automática periódica</span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Sincronizar periódicamente la tasa oficial bancaria en segundo plano
                  </span>
                </div>
              </label>
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t-2 border-slate-100">
            <button
              type="submit"
              className="px-6 py-3 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black rounded-xl border-2 border-slate-900 shadow-[3px_3px_0px_#0f172a] active:translate-y-0.5 transition-all cursor-pointer flex items-center gap-2 text-xs"
            >
              <Save className="w-4 h-4" />
              <span>Guardar Configuración Monetaria</span>
            </button>
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: USUARIOS, ROLES Y PIN                                              */}
      {/* ========================================================================= */}
      {activeTab === 'users' && (
        <div className="bg-white p-5 sm:p-6 rounded-3xl border-2 border-slate-900 shadow-[4px_4px_0px_#0f172a] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                <span>Gestión de Usuarios, Cargos y PIN</span>
              </h3>
              <p className="text-xs text-slate-500">
                Control de acceso con PIN numérico de 4 dígitos y privilegios por cargo (Cajeros, Supervisores y Administradores)
              </p>
            </div>

            <button
              type="button"
              onClick={handleOpenAddUser}
              className="px-3.5 py-2 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] active:translate-y-0.5 transition-all cursor-pointer flex items-center gap-1.5 text-xs self-start sm:self-auto"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>+ Nuevo Usuario</span>
            </button>
          </div>

          {/* Role Privileges Infobox */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
            <div className="p-3 bg-amber-50 rounded-2xl border-2 border-slate-900">
              <div className="font-black text-slate-950 flex items-center gap-1.5 mb-1">
                <span>👑</span>
                <span>Administrador</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                Acceso total al sistema: Cierre Z definitivo, ajustes generales, anulación de ventas, edición de precios y reportes confidenciales.
              </p>
            </div>

            <div className="p-3 bg-cyan-50 rounded-2xl border-2 border-slate-900">
              <div className="font-black text-slate-950 flex items-center gap-1.5 mb-1">
                <span>🛡️</span>
                <span>Supervisor</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                Punto de venta, Arqueo parcial (Reporte X), compras e inventario, aprobación de descuentos y abonos de fiados.
              </p>
            </div>

            <div className="p-3 bg-emerald-50 rounded-2xl border-2 border-slate-900">
              <div className="font-black text-slate-950 flex items-center gap-1.5 mb-1">
                <span>💼</span>
                <span>Cajero</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                Acceso exclusivo a Caja POS: Escaneo de productos, cobros mixtos y registro de abonos. Bloqueado de reportes y ajustes.
              </p>
            </div>
          </div>

          {/* Users Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 border-b-2 border-slate-900 text-[10px] font-black uppercase text-slate-700">
                <tr>
                  <th className="py-2.5 px-3">Nombre</th>
                  <th className="py-2.5 px-3">Cargo / Rol</th>
                  <th className="py-2.5 px-3 text-center">PIN</th>
                  <th className="py-2.5 px-3 text-center">Estado</th>
                  <th className="py-2.5 px-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-slate-100 font-medium">
                {usersList.map((user) => {
                  const isCurrent = user.id === currentUser.id;
                  return (
                    <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-black text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
                          <span>{user.name}</span>
                          {isCurrent && (
                            <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded border border-emerald-300 text-[9px]">
                              Activo
                            </span>
                          )}
                        </div>
                        {user.email && <div className="text-[10px] text-slate-400 font-mono">{user.email}</div>}
                      </td>

                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-md font-black text-[11px] border ${
                          user.role === 'admin'
                            ? 'bg-amber-100 text-amber-900 border-amber-300'
                            : user.role === 'supervisor'
                            ? 'bg-cyan-100 text-cyan-900 border-cyan-300'
                            : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                        }`}>
                          {user.role === 'admin' ? '👑 Administrador' : user.role === 'supervisor' ? '🛡️ Supervisor' : '💼 Cajero'}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center font-mono font-black text-slate-700">
                        •••• ({user.pin})
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                          user.active ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {user.active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEditUser(user)}
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Editar usuario y PIN"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(user.id, user.name)}
                            disabled={usersList.length <= 1}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer disabled:opacity-30"
                            title="Eliminar usuario"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: BANCOS RECEPTORES Y CUENTAS                                        */}
      {/* ========================================================================= */}
      {activeTab === 'banks' && (
        <div className="bg-white p-5 sm:p-6 rounded-3xl border-2 border-slate-900 shadow-[4px_4px_0px_#0f172a] space-y-4">
          <div className="border-b-2 border-slate-100 pb-3">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-cyan-600" />
              <span>Bancos Receptores Configurados</span>
            </h3>
            <p className="text-xs text-slate-500">
              Lista de entidades financieras donde tu negocio recibe Pagos Móviles, Puntos de Venta y Transferencias
            </p>
          </div>

          {/* Add Bank Form */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newBankName}
              onChange={(e) => setNewBankName(e.target.value)}
              placeholder="Nombre del nuevo banco (ej: Bancamiga, Bancrecer)..."
              className="flex-1 px-3 py-2 bg-slate-50 border-2 border-slate-900 rounded-xl text-xs font-black text-slate-900 focus:outline-none focus:bg-white"
            />
            <button
              type="button"
              onClick={handleAddBank}
              className="px-4 py-2 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] active:translate-y-0.5 cursor-pointer text-xs"
            >
              + Agregar Banco
            </button>
          </div>

          {/* Banks Chips List */}
          <div className="pt-2">
            <label className="text-[10px] font-black uppercase text-slate-600 tracking-wider block mb-2">
              Bancos Disponibles para Cobros y Abonos:
            </label>
            <div className="flex flex-wrap gap-2">
              {(form.configuredBanks || []).map(bank => (
                <div
                  key={bank}
                  className="px-3 py-1.5 bg-slate-100 border-2 border-slate-900 rounded-xl text-xs font-black text-slate-900 flex items-center gap-2 shadow-[1px_1px_0px_#0f172a]"
                >
                  <Building2 className="w-3.5 h-3.5 text-slate-600" />
                  <span>{bank}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveBank(bank)}
                    className="text-slate-400 hover:text-rose-600 transition-colors ml-1 cursor-pointer"
                    title="Eliminar banco"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: IMPRESORA TÉRMICA & TICKETS                                        */}
      {/* ========================================================================= */}
      {activeTab === 'printer' && (
        <form onSubmit={handleSubmit} className="bg-white p-5 sm:p-6 rounded-3xl border-2 border-slate-900 shadow-[4px_4px_0px_#0f172a] space-y-4">
          <div className="border-b-2 border-slate-100 pb-3">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Printer className="w-5 h-5 text-amber-500" />
              <span>Configuración de Impresión Térmica (ESC/POS)</span>
            </h3>
            <p className="text-xs text-slate-500">
              Ajustes de papel para tickets de venta, abonos de fiado y Reportes X / Z
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-700 font-bold uppercase mb-1">
                Ancho de Papel Predeterminado
              </label>
              <select
                value={form.defaultThermalWidth || '80mm'}
                onChange={(e) => setForm({ ...form, defaultThermalWidth: e.target.value as '80mm' | '58mm' })}
                className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-900 rounded-xl font-black text-slate-900 focus:outline-none cursor-pointer"
              >
                <option value="80mm">80 mm - Estándar de Mostrador (Epson TM-T20, Xprinter, Bematech)</option>
                <option value="58mm">58 mm - Portátil / Mini Bluetooth (58mm Roll)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-bold uppercase mb-1">
                Prueba Rápida de Impresión
              </label>
              <button
                type="button"
                onClick={handleTestThermalPrint}
                className="w-full py-2 bg-slate-950 hover:bg-slate-800 text-white rounded-xl font-black flex items-center justify-center gap-2 border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] cursor-pointer"
              >
                <Printer className="w-4 h-4 text-amber-300" />
                <span>Imprimir Ticket de Prueba Térmico</span>
              </button>
            </div>
          </div>

          <div className="p-3 bg-slate-50 border-2 border-slate-900 rounded-2xl text-xs space-y-1 text-slate-600">
            <div className="font-black text-slate-900">💡 Consejos para Impresoras Térmicas:</div>
            <p>• La opción <strong>80 mm</strong> es la estándar en puntos de venta comerciales.</p>
            <p>• Si usas una impresora portátil pequeña de 2 pulgadas, selecciona <strong>58 mm</strong> para que el texto no se corte.</p>
            <p>• El sistema genera documentos limpios de alto contraste negro puro sin bordes ni encabezados del navegador.</p>
          </div>

          <div className="flex justify-end pt-3 border-t-2 border-slate-100">
            <button
              type="submit"
              className="px-6 py-3 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black rounded-xl border-2 border-slate-900 shadow-[3px_3px_0px_#0f172a] active:translate-y-0.5 transition-all cursor-pointer flex items-center gap-2 text-xs"
            >
              <Save className="w-4 h-4" />
              <span>Guardar Preferencias de Impresora</span>
            </button>
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: LICENCIA Y EMPRESA DISTRIBUIDORA                                   */}
      {/* ========================================================================= */}
      {activeTab === 'license' && (
        <div className="bg-white p-5 sm:p-6 rounded-3xl border-2 border-slate-900 shadow-[4px_4px_0px_#0f172a] space-y-5">
          <div className="border-b-2 border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-500" />
                <span>Estado de Licencia Comercial</span>
              </h3>
              <p className="text-xs text-slate-500">
                Información de validez, activación de clave y empresa distribuidora autorizada
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsLicenseModalOpen(true)}
              className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] active:translate-y-0.5 text-xs cursor-pointer"
            >
              Ver Planes & Modal
            </button>
          </div>

          {/* Quick Activate Form */}
          <form onSubmit={handleQuickActivate} className="p-4 bg-slate-50 border-2 border-slate-900 rounded-2xl space-y-2">
            <label className="text-xs font-black uppercase text-slate-800 tracking-wider block">
              Activar Clave de Licencia:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={quickKey}
                onChange={(e) => setQuickKey(e.target.value.toUpperCase())}
                placeholder="XXXX-XXXX-XXXX-XXXX"
                className="flex-1 px-3 py-2 bg-white border-2 border-slate-900 rounded-xl font-mono font-black text-slate-950 text-xs sm:text-sm uppercase tracking-wider focus:outline-none"
              />
              <button
                type="submit"
                disabled={quickActivating || !quickKey.trim()}
                className="px-4 py-2 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 text-slate-950 font-black rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] active:translate-y-0.5 text-xs cursor-pointer"
              >
                {quickActivating ? 'Validando...' : 'Activar'}
              </button>
            </div>
            {quickMsg && (
              <p className={`text-xs font-black ${quickMsg.success ? 'text-emerald-700' : 'text-rose-700'}`}>
                {quickMsg.message}
              </p>
            )}
          </form>

          {/* AiTech Authorized Distributor Box */}
          <div className="p-4 bg-slate-900 text-white rounded-2xl border-2 border-slate-900 flex flex-col sm:flex-row items-center gap-4">
            <img src={logoImg} alt="AiTech Soluciones" className="w-16 h-16 rounded-xl border-2 border-amber-400 object-cover" />
            <div className="space-y-1 text-center sm:text-left flex-1">
              <div className="text-sm font-black text-amber-300">AiTech Soluciones Informáticas</div>
              <p className="text-xs text-slate-300">
                Proveedor oficial de software para puntos de venta, licencias comerciales y soporte técnico especializado.
              </p>
              <div className="text-[11px] text-slate-400 font-bold">
                WhatsApp: +58 412-1234567 • Barinas / Todo el país
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 7: COPIA DE SEGURIDAD & BASE DE DATOS                                 */}
      {/* ========================================================================= */}
      {activeTab === 'backup' && (
        <div className="bg-white p-5 sm:p-6 rounded-3xl border-2 border-slate-900 shadow-[4px_4px_0px_#0f172a] space-y-4">
          <div className="border-b-2 border-slate-100 pb-3">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Cloud className="w-5 h-5 text-blue-600" />
              <span>Copia de Seguridad y Restauración de Datos</span>
            </h3>
            <p className="text-xs text-slate-500">
              Exporta un respaldo completo de tu catálogo, clientes, ventas y configuraciones en formato JSON
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => {
                const json = exportDataJSON();
                const blob = new Blob([json], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `OmniPOS_Backup_${new Date().toISOString().slice(0, 10)}.json`;
                a.click();
              }}
              className="p-4 bg-slate-50 hover:bg-slate-100 border-2 border-slate-900 rounded-2xl flex flex-col items-center text-center gap-2 shadow-[2px_2px_0px_#0f172a] active:translate-y-0.5 cursor-pointer"
            >
              <Download className="w-6 h-6 text-emerald-600" />
              <div>
                <span className="font-black text-xs text-slate-900 block">Descargar Respaldo JSON</span>
                <span className="text-[10px] text-slate-500">Guarda una copia en tu disco o pendrive</span>
              </div>
            </button>

            <label className="p-4 bg-slate-50 hover:bg-slate-100 border-2 border-slate-900 rounded-2xl flex flex-col items-center text-center gap-2 shadow-[2px_2px_0px_#0f172a] active:translate-y-0.5 cursor-pointer">
              <Upload className="w-6 h-6 text-cyan-600" />
              <div>
                <span className="font-black text-xs text-slate-900 block">Restaurar Respaldo</span>
                <span className="text-[10px] text-slate-500">Cargar un archivo .json previamente descargado</span>
              </div>
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const text = await file.text();
                    const ok = await importDataJSON(text);
                    if (ok) alert('¡Datos restaurados con éxito!');
                    else alert('Archivo de respaldo no válido.');
                  }
                }}
              />
            </label>

            <button
              type="button"
              onClick={async () => {
                if (confirm('¿Restablecer datos a la configuración inicial de demostración?')) {
                  await resetToDemoData();
                  alert('Datos restablecidos a la demo.');
                }
              }}
              className="p-4 bg-rose-50 hover:bg-rose-100 border-2 border-slate-900 rounded-2xl flex flex-col items-center text-center gap-2 shadow-[2px_2px_0px_#0f172a] active:translate-y-0.5 cursor-pointer"
            >
              <RotateCcw className="w-6 h-6 text-rose-600" />
              <div>
                <span className="font-black text-xs text-rose-950 block">Reiniciar Datos Demo</span>
                <span className="text-[10px] text-rose-700">Restablece catálogo y ventas iniciales</span>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL PARA AGREGAR / EDITAR USUARIO Y PIN                                 */}
      {/* ========================================================================= */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-[6px_6px_0px_#0f172a] w-full max-w-md overflow-hidden border-2 border-slate-900 flex flex-col">
            <div className="p-4 bg-slate-950 text-white flex justify-between items-center border-b-2 border-slate-900">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-300" />
                <h3 className="font-black text-sm text-white">
                  {editingUser ? 'Editar Usuario y PIN' : 'Crear Nuevo Usuario del Sistema'}
                </h3>
              </div>
              <button 
                onClick={() => setIsUserModalOpen(false)} 
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center border-2 border-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4 stroke-[3]" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="p-5 space-y-3.5 text-xs">
              {userError && (
                <div className="p-2.5 bg-rose-100 border-2 border-rose-900 rounded-xl text-xs font-black text-rose-950 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" />
                  <span>{userError}</span>
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-bold uppercase mb-1">Nombre Completo</label>
                <input
                  type="text"
                  required
                  value={userForm.name}
                  onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                  placeholder="Ej: Laura Pérez (Caja 1)"
                  className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-900 rounded-xl font-black text-slate-900 focus:outline-none focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold uppercase mb-1">Cargo / Privilegio</label>
                  <select
                    value={userForm.role}
                    onChange={(e) => setUserForm({ ...userForm, role: e.target.value as UserRole })}
                    className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-900 rounded-xl font-black text-slate-900 focus:outline-none cursor-pointer"
                  >
                    <option value="cajero">💼 Cajero</option>
                    <option value="supervisor">🛡️ Supervisor</option>
                    <option value="admin">👑 Administrador</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold uppercase mb-1">PIN Numérico (4-6 dígitos)</label>
                  <input
                    type="password"
                    maxLength={6}
                    required
                    value={userForm.pin}
                    onChange={(e) => setUserForm({ ...userForm, pin: e.target.value.replace(/\D/g, '') })}
                    placeholder="4 dígitos (ej: 4321)"
                    className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-900 rounded-xl font-mono font-black text-slate-900 focus:outline-none focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold uppercase mb-1">Correo (Opcional)</label>
                <input
                  type="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  placeholder="cajero@omnipos.com"
                  className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-900 rounded-xl font-medium text-slate-900 focus:outline-none"
                />
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={userForm.active}
                    onChange={(e) => setUserForm({ ...userForm, active: e.target.checked })}
                    className="w-4 h-4 rounded text-emerald-600 border-2 border-slate-900 cursor-pointer"
                  />
                  <span className="font-bold text-slate-900">Usuario Activo y Habilitado para Iniciar Sesión</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t-2 border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="px-4 py-2 border-2 border-slate-900 rounded-xl text-slate-700 font-bold hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] active:translate-y-0.5 cursor-pointer"
                >
                  Guardar Usuario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
