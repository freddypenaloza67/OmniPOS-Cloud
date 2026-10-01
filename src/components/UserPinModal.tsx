import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { X, Lock, KeyRound, ShieldCheck, User, Delete, Check } from 'lucide-react';
import { PosUser } from '../types';

interface UserPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  requiredRole?: 'admin' | 'supervisor';
  onSuccess?: () => void;
  title?: string;
}

export const UserPinModal: React.FC<UserPinModalProps> = ({
  isOpen,
  onClose,
  requiredRole,
  onSuccess,
  title
}) => {
  const { state, currentUser, switchUserByPin } = useStore();
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<PosUser | null>(null);

  if (!isOpen) return null;

  const usersList = state.users && state.users.length > 0 ? state.users : [];

  const handleKeyPress = (num: string) => {
    if (pin.length < 6) {
      setPin(prev => prev + num);
      setError(null);
    }
  };

  const handleClear = () => {
    setPin('');
    setError(null);
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
    setError(null);
  };

  const handleVerify = () => {
    if (pin.length < 4) {
      setError('El PIN debe tener al menos 4 dígitos.');
      return;
    }

    const res = switchUserByPin(pin);
    if (!res.success || !res.user) {
      setError(res.message || 'PIN incorrecto.');
      setPin('');
      return;
    }

    if (requiredRole === 'admin' && res.user.role !== 'admin') {
      setError('Este usuario no tiene privilegios de Administrador.');
      setPin('');
      return;
    }

    if (requiredRole === 'supervisor' && res.user.role === 'cajero') {
      setError('Se requieren privilegios de Supervisor o Administrador.');
      setPin('');
      return;
    }

    if (onSuccess) {
      onSuccess();
    }
    onClose();
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <span className="px-2 py-0.5 bg-amber-400 text-slate-950 font-black rounded text-[10px] border border-slate-900">👑 Admin</span>;
      case 'supervisor':
        return <span className="px-2 py-0.5 bg-cyan-300 text-slate-950 font-black rounded text-[10px] border border-slate-900">🛡️ Supervisor</span>;
      default:
        return <span className="px-2 py-0.5 bg-emerald-200 text-slate-950 font-black rounded text-[10px] border border-slate-900">💼 Cajero</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-[6px_6px_0px_#0f172a] w-full max-w-sm overflow-hidden border-2 border-slate-900 flex flex-col">
        
        {/* Header */}
        <div className="p-4 bg-slate-950 text-white flex justify-between items-center border-b-2 border-slate-900">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 border-2 border-slate-900 flex items-center justify-center font-black">
              <Lock className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-black text-sm text-white leading-tight">
                {title || 'Cambiar Usuario / PIN'}
              </h3>
              <p className="text-[11px] text-amber-300 font-bold">
                Actual: {currentUser.name}
              </p>
            </div>
          </div>

          <button 
            onClick={onClose} 
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center border-2 border-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4 stroke-[3]" />
          </button>
        </div>

        <div className="p-4 space-y-3.5">
          {/* User selector chips */}
          <div>
            <label className="text-[10px] font-black uppercase text-slate-600 tracking-wider block mb-1.5">
              Usuarios Disponibles:
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {usersList.filter(u => u.active).map(u => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => setSelectedUser(u)}
                  className={`p-2 rounded-xl border-2 text-left transition-all cursor-pointer ${
                    u.id === (selectedUser?.id || currentUser.id)
                      ? 'bg-amber-50 border-slate-900 shadow-[2px_2px_0px_#0f172a]'
                      : 'bg-white border-slate-200 hover:border-slate-400'
                  }`}
                >
                  <div className="font-black text-xs text-slate-900 truncate">{u.name}</div>
                  <div className="mt-1">{getRoleBadge(u.role)}</div>
                </button>
              ))}
            </div>
          </div>

          {/* PIN Input Display */}
          <div className="text-center space-y-1">
            <label className="text-xs font-black uppercase text-slate-700 tracking-wider">
              {selectedUser ? `Ingrese PIN para ${selectedUser.name}:` : 'Ingrese PIN de 4 dígitos:'}
            </label>
            <div className="flex items-center justify-center gap-2 py-2">
              {[0, 1, 2, 3].map(i => (
                <div
                  key={i}
                  className={`w-10 h-10 rounded-xl border-2 border-slate-900 flex items-center justify-center text-lg font-black transition-all ${
                    pin.length > i
                      ? 'bg-slate-950 text-white shadow-[2px_2px_0px_#0f172a]'
                      : 'bg-slate-100 text-transparent'
                  }`}
                >
                  {pin.length > i ? '●' : ''}
                </div>
              ))}
            </div>

            {error && (
              <p className="text-xs text-rose-700 font-black animate-shake">
                {error}
              </p>
            )}
          </div>

          {/* Numeric Keypad */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
              <button
                key={num}
                type="button"
                onClick={() => handleKeyPress(num)}
                className="py-3 bg-white hover:bg-slate-100 active:translate-y-0.5 border-2 border-slate-900 rounded-xl text-base font-black text-slate-950 shadow-[2px_2px_0px_#0f172a] transition-all cursor-pointer"
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              onClick={handleClear}
              className="py-3 bg-slate-100 hover:bg-slate-200 active:translate-y-0.5 border-2 border-slate-900 rounded-xl text-xs font-black text-slate-700 shadow-[2px_2px_0px_#0f172a] transition-all cursor-pointer"
            >
              Borrar
            </button>
            <button
              type="button"
              onClick={() => handleKeyPress('0')}
              className="py-3 bg-white hover:bg-slate-100 active:translate-y-0.5 border-2 border-slate-900 rounded-xl text-base font-black text-slate-950 shadow-[2px_2px_0px_#0f172a] transition-all cursor-pointer"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleBackspace}
              className="py-3 bg-slate-100 hover:bg-slate-200 active:translate-y-0.5 border-2 border-slate-900 rounded-xl text-xs font-black text-slate-700 shadow-[2px_2px_0px_#0f172a] transition-all cursor-pointer flex items-center justify-center"
            >
              <Delete className="w-4 h-4" />
            </button>
          </div>

          {/* Action buttons */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleVerify}
              disabled={pin.length < 4}
              className="w-full py-3 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-40 text-slate-950 border-2 border-slate-900 rounded-xl text-xs sm:text-sm font-black shadow-[3px_3px_0px_#0f172a] active:translate-y-0.5 transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Verificar PIN & Iniciar Turno</span>
            </button>
          </div>

          <div className="text-[10px] text-center text-slate-400 font-bold">
            Demo PINs: Admin (1234) • Supervisor (2024) • Cajero 1 (0000)
          </div>
        </div>

      </div>
    </div>
  );
};
