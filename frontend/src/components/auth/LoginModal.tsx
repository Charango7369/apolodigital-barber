import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Scissors, Lock, Mail, Eye, EyeOff, Loader2, AlertCircle, X, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Rate limiting attempts state
  const [failedAttempts, setFailedAttempts] = useState<number>(0);
  const [lockoutTimer, setLockoutTimer] = useState<number>(0);

  // Handle countdown timer for client lockout
  React.useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (lockoutTimer > 0) {
      timer = setTimeout(() => {
        setLockoutTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [lockoutTimer]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutTimer > 0) return;

    if (!email.trim() || !password.trim()) {
      setErrorMessage('Por favor ingresa tu correo electrónico y contraseña.');
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email.trim())) {
      setErrorMessage('Ingresa un formato de correo electrónico válido.');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage(null);
      await login(email.trim(), password);
      onClose();
      if (onSuccess) {
        onSuccess();
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);

      if (newAttempts >= 5) {
        setLockoutTimer(30);
        setErrorMessage('Demasiados intentos fallidos. Bloqueado temporalmente por 30 segundos.');
      } else {
        const remaining = 5 - newAttempts;
        setErrorMessage(
          err.message || `Credenciales incorrectas. Te quedan ${remaining} ${remaining === 1 ? 'intento' : 'intentos'}.`
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleFillDemoAdmin = () => {
    setEmail('admin@apolodigital.lat');
    setPassword('Apolo2026!');
    setErrorMessage(null);
  };

  const handleFillSuperAdmin = () => {
    setEmail('superadmin@apolodigital.lat');
    setPassword('Apolo2026!');
    setErrorMessage(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md bg-[#0a1628] border border-[#3b82f6]/30 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/80 overflow-hidden">
        {/* Subtle Top Glow line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#f0b429] to-transparent"></div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-[#94a3b8] hover:text-white rounded-xl hover:bg-[#0d2347] transition-all"
          title="Cerrar ventana"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-[#1a4fd6] to-[#0d2347] border border-[#3b82f6]/40 shadow-lg shadow-[#1a4fd6]/30 mb-3 p-2 relative">
            <Scissors className="w-6 h-6 text-[#f0b429] drop-shadow" />
          </div>

          <div className="flex items-center justify-center gap-1.5 mb-1">
            <span className="font-heading font-extrabold text-xl tracking-tight text-white">
              Apolo<span className="text-[#60a5fa]">Digital</span>
            </span>
            <span className="text-[#f0b429] font-heading font-black text-xl tracking-wider">
              BARBER
            </span>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#102a54]/80 border border-[#3b82f6]/30 text-[10px] text-[#c8deff] font-semibold uppercase tracking-wider mt-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Acceso Operativo</span>
          </div>

          <p className="text-xs text-[#94a3b8] mt-2">
            Ingresa para gestionar citas, caja y barberos.
          </p>
        </div>

        {/* Error Banner */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-500/15 border border-rose-500/40 flex items-start gap-2.5 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-rose-200">Error</p>
              <p className="mt-0.5 leading-relaxed">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#c8deff] mb-1.5">
              Correo Electrónico
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#94a3b8] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@apolodigital.lat"
                required
                disabled={isLoading || lockoutTimer > 0}
                className="w-full bg-[#070d1e] border border-[#3b82f6]/30 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-[#4b5563] focus:outline-none focus:border-[#f0b429] focus:ring-1 focus:ring-[#f0b429] transition-all disabled:opacity-50"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-[#c8deff]">
                Contraseña
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[11px] text-[#60a5fa] hover:text-[#93c5fd] font-medium flex items-center gap-1"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showPassword ? 'Ocultar' : 'Mostrar'}</span>
              </button>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#94a3b8] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                disabled={isLoading || lockoutTimer > 0}
                className="w-full bg-[#070d1e] border border-[#3b82f6]/30 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-[#4b5563] focus:outline-none focus:border-[#f0b429] focus:ring-1 focus:ring-[#f0b429] transition-all disabled:opacity-50"
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading || lockoutTimer > 0}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#1a4fd6] via-[#2563eb] to-[#3b82f6] hover:brightness-110 active:scale-[0.99] text-white font-bold text-sm shadow-lg shadow-[#1a4fd6]/40 border border-[#60a5fa]/40 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#f0b429]" />
                <span>Iniciando Sesión...</span>
              </>
            ) : lockoutTimer > 0 ? (
              <span>Reintentar en {lockoutTimer}s</span>
            ) : (
              <span>Ingresar al Sistema</span>
            )}
          </button>
        </form>

        {/* Demo Helper */}
        <div className="mt-4 pt-3 border-t border-[#3b82f6]/20 text-center">
          <p className="text-[10px] text-[#94a3b8] mb-2">Acceso rápido para demostración:</p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={handleFillDemoAdmin}
              className="px-2.5 py-1 rounded-lg bg-[#0d2347] hover:bg-[#102a54] border border-[#3b82f6]/30 text-[11px] text-[#60a5fa] font-medium transition-all"
            >
              🛡️ Admin Barbería
            </button>
            <button
              type="button"
              onClick={handleFillSuperAdmin}
              className="px-2.5 py-1 rounded-lg bg-[#1a0b2e] hover:bg-[#2e1065] border border-fuchsia-500/40 text-[11px] text-fuchsia-300 font-bold transition-all shadow-md shadow-fuchsia-950/40"
            >
              ⚡ Superadmin (SaaS)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;
