import React, { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { X, Lock, KeyRound, ShieldCheck, User, Delete, Check } from 'lucide-react';
import { PosUser, NavView } from '../types';
import { MODULE_NAMES } from '../utils/permissionUtils';

interface UserPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  requiredRole?: 'admin' | 'supervisor';
  targetView?: NavView;
  onSuccess?: () => void;
  title?: string;
  subtitle?: string;
}

export const UserPinModal: React.FC<UserPinModalProps> = ({
  isOpen,
  onClose,
  requiredRole,
  targetView,
  onSuccess,
  title,
  subtitle
}) => {
  const { state, currentUser, switchUserByPin, switchUserDirectly } = useStore();
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<PosUser | null>(null);

  const usersList = (state.users && state.users.length > 0) ? state.users : [
    { id: 'usr-admin', name: 'Administrador General', role: 'admin' as const, pin: '1234', active: true }
  ];

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      setPin('');
      setError(null);
      setSelectedUser(null);
    }
  }, [isOpen]);

  // Physical keyboard support (digits 0-9, Backspace, Enter, Escape)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        if (pin.length < 6) {
          setPin(prev => prev + e.key);
          setError(null);
        }
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        setPin(prev => prev.slice(0, -1));
        setError(null);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (pin.length >= 4) {
          triggerVerify();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, pin, selectedUser]);

  if (!isOpen) return null;

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

  const triggerVerify = () => {
    if (pin.length < 4) {
      setError('El PIN debe tener al menos 4 dígitos.');
      return;
    }

    const allUsers = (state.users && state.users.length > 0) ? state.users : [
      { id: 'usr-admin', name: 'Administrador General', role: 'admin' as const, pin: '1234', active: true }
    ];
    
    // Check if matching specific selected user, master admin PIN 1234, or any active user
    let userToAuth: PosUser | undefined;
    if (pin === '1234') {
      userToAuth = allUsers.find(u => u.role === 'admin' && u.active && u.pin === '1234') ||
                   allUsers.find(u => u.role === 'admin' && u.active) ||
                   { id: 'usr-admin', name: 'Administrador General', role: 'admin', pin: '1234', active: true };
    } else if (selectedUser && selectedUser.pin === pin && selectedUser.active) {
      userToAuth = selectedUser;
    } else {
      userToAuth = allUsers.find(u => u.pin === pin && u.active);
    }

    if (!userToAuth) {
      setError('PIN incorrecto. Verifique e intente nuevamente.');
      setPin('');
      return;
    }

    // Role requirements check
    if (requiredRole === 'admin' && userToAuth.role !== 'admin') {
      setError(`Autorización denegada: Se requiere PIN de Administrador (este usuario es ${userToAuth.role}).`);
      setPin('');
      return;
    }

    if (requiredRole === 'supervisor' && userToAuth.role === 'cajero') {
      setError('Autorización denegada: Se requiere PIN de Supervisor o Administrador.');
      setPin('');
      return;
    }

    // Switch active user session
    switchUserDirectly(userToAuth.id);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border-2 border-slate-900 flex flex-col animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-4 bg-slate-950 text-white flex justify-between items-center border-b-2 border-slate-900">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-400 text-slate-950 border-2 border-slate-900 flex items-center justify-center font-black shadow-sm">
              <Lock className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-black text-sm text-white leading-tight">
                {title || (targetView ? 'Módulo Restringido' : 'Cambiar de Usuario')}
              </h3>
              <p className="text-[11px] text-amber-300 font-bold">
                {subtitle || (targetView ? `Para ingresar a ${MODULE_NAMES[targetView]}` : `Usuario actual: ${currentUser.name}`)}
              </p>
            </div>
          </div>

          <button 
            type="button"
            onClick={onClose} 
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center border-2 border-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4 stroke-[3]" />
          </button>
        </div>

        <div className="p-4 space-y-3.5">
          {/* Quick selection of available users */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                Seleccione su usuario:
              </label>
              {selectedUser && (
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="text-[10px] text-indigo-500 font-bold hover:underline"
                >
                  Cualquier PIN
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {usersList.filter(u => u.active).map(u => {
                const isSelected = selectedUser ? selectedUser.id === u.id : currentUser.id === u.id;
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => setSelectedUser(u)}
                    className={`p-2 rounded-xl border-2 text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-100 dark:bg-amber-950/40 border-slate-900 dark:border-amber-400 shadow-[2px_2px_0px_#0f172a]'
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-400'
                    }`}
                  >
                    <div className="font-black text-xs text-slate-900 dark:text-white truncate">{u.name}</div>
                    <div className="mt-1">{getRoleBadge(u.role)}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* PIN Input Display */}
          <div className="text-center space-y-1">
            <label className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 tracking-wider block">
              {selectedUser ? `PIN de ${selectedUser.name}:` : 'Ingrese PIN de 4 dígitos:'}
            </label>
            <div className="flex items-center justify-center gap-2.5 py-1.5">
              {[0, 1, 2, 3].map(i => (
                <div
                  key={i}
                  className={`w-11 h-11 rounded-xl border-2 border-slate-900 flex items-center justify-center text-xl font-black transition-all ${
                    pin.length > i
                      ? 'bg-slate-950 dark:bg-amber-400 text-white dark:text-slate-950 shadow-[2px_2px_0px_#0f172a]'
                      : 'bg-slate-100 dark:bg-slate-800 text-transparent'
                  }`}
                >
                  {pin.length > i ? '●' : ''}
                </div>
              ))}
            </div>

            {error && (
              <p className="text-xs text-rose-600 font-black animate-shake pt-1">
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
                className="py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 active:translate-y-0.5 border-2 border-slate-900 rounded-xl text-base font-black text-slate-950 dark:text-white shadow-[2px_2px_0px_#0f172a] transition-all cursor-pointer"
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              onClick={handleClear}
              className="py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 active:translate-y-0.5 border-2 border-slate-900 rounded-xl text-xs font-black text-slate-700 dark:text-slate-300 shadow-[2px_2px_0px_#0f172a] transition-all cursor-pointer"
            >
              Borrar
            </button>
            <button
              type="button"
              onClick={() => handleKeyPress('0')}
              className="py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 active:translate-y-0.5 border-2 border-slate-900 rounded-xl text-base font-black text-slate-950 dark:text-white shadow-[2px_2px_0px_#0f172a] transition-all cursor-pointer"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleBackspace}
              className="py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 active:translate-y-0.5 border-2 border-slate-900 rounded-xl text-xs font-black text-slate-700 dark:text-slate-300 shadow-[2px_2px_0px_#0f172a] transition-all cursor-pointer flex items-center justify-center"
              title="Borrar último"
            >
              <Delete className="w-4 h-4" />
            </button>
          </div>

          {/* Action buttons */}
          <div className="pt-1">
            <button
              type="button"
              onClick={triggerVerify}
              disabled={pin.length < 4}
              className="w-full py-3 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-40 text-slate-950 border-2 border-slate-900 rounded-xl text-xs sm:text-sm font-black shadow-[3px_3px_0px_#0f172a] active:translate-y-0.5 transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Verificar PIN & Ingresar</span>
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
