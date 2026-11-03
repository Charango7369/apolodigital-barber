import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Scissors, Lock, Mail, Eye, EyeOff, Loader2, AlertCircle, ArrowLeft, ShieldCheck, CheckCircle2, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, login, logout, isAuthenticated } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Rate limiting attempts state
  const [failedAttempts, setFailedAttempts] = useState<number>(0);
  const [lockoutTimer, setLockoutTimer] = useState<number>(0);

  // Resolve target redirect from URL search query (e.g., /login?redirect=/dashboard)
  const searchParams = new URLSearchParams(location.search);
  const redirectTarget = searchParams.get('redirect') || '/dashboard';

  // Handle countdown timer for client lockout
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (lockoutTimer > 0) {
      timer = setTimeout(() => {
        setLockoutTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [lockoutTimer]);

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
      navigate(redirectTarget, { replace: true });
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
    <div className="min-h-screen bg-[#070d1e] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(26,79,214,0.25),rgba(255,255,255,0))] text-white flex flex-col justify-between p-4 sm:p-6 md:p-8 font-sans selection:bg-[#1a4fd6] selection:text-white">
      {/* Top Bar: Return Link */}
      <header className="max-w-6xl w-full mx-auto flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#94a3b8] hover:text-[#f0b429] transition-colors py-2 px-3 rounded-xl hover:bg-[#0d2347]/40 border border-transparent hover:border-[#3b82f6]/20"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al portal de reservas</span>
        </Link>

        <div className="flex items-center gap-1.5 text-[11px] text-[#94a3b8] bg-[#0a1628]/80 px-3 py-1.5 rounded-full border border-[#3b82f6]/20">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Acceso Seguro Encriptado (JWT)</span>
        </div>
      </header>

      {/* Main Login Card */}
      <main className="flex-1 flex items-center justify-center py-10">
        <div className="w-full max-w-md bg-[#0a1628]/95 backdrop-blur-xl border border-[#3b82f6]/25 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-[#000]/60 relative overflow-hidden">
          {/* Subtle Top Glow line */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#f0b429] to-transparent"></div>

          {/* Logo & Heading */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1a4fd6] to-[#0d2347] border border-[#3b82f6]/40 shadow-lg shadow-[#1a4fd6]/30 mb-4 p-2 relative">
              <Scissors className="w-7 h-7 text-[#f0b429] drop-shadow" />
            </div>

            <div className="flex items-center justify-center gap-1.5 mb-1">
              <span className="font-heading font-extrabold text-2xl tracking-tight text-white">
                Apolo<span className="text-[#60a5fa]">Digital</span>
              </span>
              <span className="text-[#f0b429] font-heading font-black text-2xl tracking-wider">
                BARBER
              </span>
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#102a54]/80 border border-[#3b82f6]/30 text-[11px] text-[#c8deff] font-semibold uppercase tracking-wider mt-1">
              Acceso Operativo
            </div>

            <p className="text-xs text-[#94a3b8] mt-3">
              Ingresa tus credenciales para administrar la agenda, caja y barberos.
            </p>
          </div>

          {/* Active Session Notice if authenticated */}
          {isAuthenticated && user && (
            <div className="mb-6 p-4 rounded-2xl bg-[#0d2347] border border-[#3b82f6]/40 text-xs space-y-3">
              <div className="flex items-center gap-2 text-emerald-300 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Sesión activa detectada</span>
              </div>
              <p className="text-[#c8deff]">
                Has iniciado sesión como <strong className="text-white">{user.full_name}</strong> ({user.role}).
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="flex-1 py-2 px-3 rounded-xl bg-[#1a4fd6] hover:bg-[#2563eb] text-white font-bold text-center transition-all"
                >
                  Ir al Dashboard →
                </button>
                <button
                  type="button"
                  onClick={logout}
                  className="p-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 transition-all flex items-center gap-1.5"
                  title="Cerrar sesión"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="text-[11px]">Salir</span>
                </button>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-6 p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/40 flex items-start gap-3 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-rose-200">Error de autenticación</p>
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
                  className="w-full bg-[#070d1e] border border-[#3b82f6]/30 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-[#4b5563] focus:outline-none focus:border-[#f0b429] focus:ring-1 focus:ring-[#f0b429] transition-all disabled:opacity-50"
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
                  className="w-full bg-[#070d1e] border border-[#3b82f6]/30 rounded-xl pl-10 pr-10 py-3 text-sm text-white placeholder-[#4b5563] focus:outline-none focus:border-[#f0b429] focus:ring-1 focus:ring-[#f0b429] transition-all disabled:opacity-50"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || lockoutTimer > 0}
              className="w-full mt-2 py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#1a4fd6] via-[#2563eb] to-[#3b82f6] hover:brightness-110 active:scale-[0.99] text-white font-bold text-sm shadow-lg shadow-[#1a4fd6]/40 border border-[#60a5fa]/40 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#f0b429]" />
                  <span>Verificando Credenciales...</span>
                </>
              ) : lockoutTimer > 0 ? (
                <span>Reintentar en {lockoutTimer}s</span>
              ) : (
                <span>Iniciar Sesión</span>
              )}
            </button>
          </form>

          {/* Quick Demo Access Aid */}
          <div className="mt-6 pt-5 border-t border-[#3b82f6]/20 text-center">
            <p className="text-[11px] text-[#94a3b8] mb-2.5">Acceso rápido para demostración / pruebas:</p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={handleFillDemoAdmin}
                className="px-3 py-1.5 rounded-xl bg-[#0d2347] hover:bg-[#102a54] border border-[#3b82f6]/30 text-xs text-[#60a5fa] font-medium transition-all"
              >
                🛡️ Admin Barbería
              </button>
              <button
                type="button"
                onClick={handleFillSuperAdmin}
                className="px-3 py-1.5 rounded-xl bg-[#1a0b2e] hover:bg-[#2e1065] border border-fuchsia-500/40 text-xs text-fuchsia-300 font-bold transition-all shadow-md shadow-fuchsia-950/40"
              >
                ⚡ Superadmin (SaaS)
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-[#64748b] py-3">
        © 2026 ApoloDigital Barber • Sopocachi, La Paz, Bolivia • Todos los derechos reservados
      </footer>
    </div>
  );
};

export default LoginPage;
