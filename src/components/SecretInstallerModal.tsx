import React, { useState, useEffect, useRef } from 'react';
import { X, Lock, ShieldAlert, KeyRound, Check } from 'lucide-react';

interface SecretInstallerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const SECRET_PIN = '9900';

export const SecretInstallerModal: React.FC<SecretInstallerModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setError(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (pin === SECRET_PIN) {
      setError(false);
      onClose();
      onSuccess();
    } else {
      setError(true);
      setPin('');
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (num: string) => {
    if (pin.length < 4) {
      const nextPin = pin + num;
      setPin(nextPin);
      setError(false);
      if (nextPin.length === 4) {
        if (nextPin === SECRET_PIN) {
          setTimeout(() => {
            onClose();
            onSuccess();
          }, 150);
        } else {
          setTimeout(() => {
            setError(true);
            setPin('');
          }, 200);
        }
      }
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
    setError(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-xs bg-slate-900 border-2 border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden p-6 flex flex-col items-center text-center space-y-4 animate-in zoom-in-95 duration-200 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Icon */}
        <div className="relative">
          <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center shadow-inner">
            <Lock className={`w-7 h-7 ${error ? 'text-rose-500 animate-bounce' : 'text-amber-400'}`} />
          </div>
          <button
            onClick={onClose}
            className="absolute -top-2 -right-16 w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div>
          <h3 className="text-base font-black text-white tracking-wide">
            Acceso Técnico
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Ingrese la clave de seguridad del instalador
          </p>
        </div>

        {/* Pin Dots */}
        <div className="flex items-center justify-center gap-3 py-2">
          {[0, 1, 2, 3].map((index) => {
            const isFilled = pin.length > index;
            return (
              <div
                key={index}
                className={`w-3.5 h-3.5 rounded-full transition-all duration-150 ${
                  error
                    ? 'bg-rose-500 ring-4 ring-rose-500/20'
                    : isFilled
                    ? 'bg-amber-400 ring-4 ring-amber-400/20 scale-110'
                    : 'bg-slate-800 border border-slate-700'
                }`}
              />
            );
          })}
        </div>

        {/* Error message */}
        {error && (
          <p className="text-xs font-bold text-rose-400 animate-pulse">
            Clave no válida. Intente nuevamente.
          </p>
        )}

        {/* Hidden keyboard input for physical typing */}
        <form onSubmit={handleSubmit} className="w-full">
          <input
            ref={inputRef}
            type="password"
            maxLength={4}
            value={pin}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '').slice(0, 4);
              setPin(val);
              setError(false);
              if (val.length === 4) {
                if (val === SECRET_PIN) {
                  onClose();
                  onSuccess();
                } else {
                  setError(true);
                  setPin('');
                }
              }
            }}
            className="sr-only"
            autoFocus
          />
        </form>

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-2 w-full pt-1">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((key) => {
            const isAction = key === 'C' || key === '⌫';
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  if (key === 'C') {
                    setPin('');
                    setError(false);
                  } else if (key === '⌫') {
                    handleDelete();
                  } else {
                    handleKeyPress(key);
                  }
                }}
                className={`h-12 rounded-2xl font-black text-sm flex items-center justify-center transition-all active:scale-90 cursor-pointer ${
                  isAction
                    ? 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    : 'bg-slate-800/80 hover:bg-slate-700 text-white shadow-sm border border-slate-700/50'
                }`}
              >
                {key}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
