import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { X, RefreshCw, DollarSign, Check, AlertCircle } from 'lucide-react';
import { formatLocal } from '../utils/formatters';

interface RateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const COMMON_CURRENCIES = [
  { code: 'VES', symbol: 'Bs.', name: 'Bolívar Digital (Venezuela)' },
  { code: 'COP', symbol: '$', name: 'Peso Colombiano (Colombia)' },
  { code: 'MXN', symbol: '$', name: 'Peso Mexicano (México)' },
  { code: 'EUR', symbol: '€', name: 'Euro (Unión Europea)' },
  { code: 'ARS', symbol: '$', name: 'Peso Argentino (Argentina)' },
  { code: 'PEN', symbol: 'S/.', name: 'Sol Peruano (Perú)' },
  { code: 'BRL', symbol: 'R$', name: 'Real Brasileño (Brasil)' },
  { code: 'CLP', symbol: '$', name: 'Peso Chileno (Chile)' }
];

export const RateModal: React.FC<RateModalProps> = ({ isOpen, onClose }) => {
  const { state, updateExchangeRateManually, refreshExchangeRate, updateSettings } = useStore();
  const [rateInput, setRateInput] = useState<string>(state.settings.exchangeRate.toString());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState(state.settings.secondaryCurrency.code);
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(rateInput);
    if (parsed > 0) {
      await updateExchangeRateManually(parsed);
      const curr = COMMON_CURRENCIES.find(c => c.code === selectedCurrency);
      if (curr && (curr.code !== state.settings.secondaryCurrency.code)) {
        await updateSettings({
          ...state.settings,
          exchangeRate: parsed,
          secondaryCurrency: {
            code: curr.code,
            symbol: curr.symbol,
            name: curr.name
          }
        });
      }
      setSuccessMsg('¡Tasa de cambio actualizada correctamente!');
      setTimeout(() => {
        setSuccessMsg('');
        onClose();
      }, 900);
    }
  };

  const handleAutoRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshExchangeRate(selectedCurrency);
      setSuccessMsg('Tasa sincronizada desde el mercado financiero');
      setRateInput(state.settings.exchangeRate.toString());
    } finally {
      setIsRefreshing(false);
      setTimeout(() => setSuccessMsg(''), 2000);
    }
  };

  const currentCurrency = COMMON_CURRENCIES.find(c => c.code === selectedCurrency) || state.settings.secondaryCurrency;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-5 text-white flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/15 rounded-xl">
              <DollarSign className="w-5 h-5 text-emerald-100" />
            </div>
            <div>
              <h3 className="font-semibold text-lg leading-tight">Tasa de Cambio del Día</h3>
              <p className="text-xs text-emerald-100">Actualización diaria y multimoneda</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors text-white/80 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-5">
          {successMsg && (
            <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Moneda Secundaria
            </label>
            <select
              value={selectedCurrency}
              onChange={(e) => {
                setSelectedCurrency(e.target.value);
                const found = COMMON_CURRENCIES.find(c => c.code === e.target.value);
                if (found) {
                  // Prompt fetch
                  refreshExchangeRate(found.code);
                }
              }}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
            >
              {COMMON_CURRENCIES.map(curr => (
                <option key={curr.code} value={curr.code}>
                  {curr.name} ({curr.symbol})
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Valor de 1 USD en {currentCurrency.code}
              </label>
              <button
                type="button"
                onClick={handleAutoRefresh}
                disabled={isRefreshing}
                className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1 hover:underline"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Consultando...' : 'Actualizar ahora'}
              </button>
            </div>
            
            <div className="relative">
              <input
                type="number"
                step="0.0001"
                min="0.0001"
                required
                value={rateInput}
                onChange={(e) => setRateInput(e.target.value)}
                className="w-full pl-4 pr-16 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                placeholder="52.40"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500">
                {currentCurrency.symbol}
              </span>
            </div>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/70 space-y-1.5 text-xs text-slate-600">
            <div className="flex justify-between">
              <span>Equivalencia de $10 USD:</span>
              <span className="font-semibold text-slate-800">
                {formatLocal(10 * (parseFloat(rateInput) || 1), currentCurrency.symbol, currentCurrency.code)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Equivalencia de $50 USD:</span>
              <span className="font-semibold text-slate-800">
                {formatLocal(50 * (parseFloat(rateInput) || 1), currentCurrency.symbol, currentCurrency.code)}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 pt-1 border-t border-slate-200">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Esta tasa se aplica en todos los cálculos del Punto de Venta, Inventario y Facturación.</span>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition-colors text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl shadow-sm hover:shadow transition-all text-sm"
            >
              Guardar Tasa
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
