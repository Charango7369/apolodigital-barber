import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Plus, Scissors, Shield, ChevronDown, Check, LogOut, ExternalLink } from 'lucide-react';
import { User, UserRole } from '../types';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  currentTab: string;
  currentUser: User | null;
  onOpenNewAppointment: () => void;
  onSwitchUserRole: (role: UserRole) => void;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onOpenNewAppointment,
  onSwitchUserRole,
  onLogout,
}) => {
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);
  const { logout } = useAuth();

  const handleLogoutClick = () => {
    if (onLogout) {
      onLogout();
    } else {
      logout();
    }
  };

  const todayFormatted = new Intl.DateTimeFormat('es-BO', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  }).format(new Date());

  const roleColors: Record<UserRole, { bg: string; text: string; label: string; icon: string }> = {
    superadmin: { bg: 'bg-fuchsia-500/20 border-fuchsia-500/40 text-fuchsia-300', text: 'text-fuchsia-300', label: 'Superadmin (SaaS Global)', icon: '⚡' },
    owner: { bg: 'bg-amber-500/20 border-amber-500/40 text-amber-300', text: 'text-amber-300', label: 'Dueño / Propietario', icon: '👑' },
    admin: { bg: 'bg-blue-500/20 border-blue-500/40 text-blue-300', text: 'text-blue-300', label: 'Admin / Recepción', icon: '🛡️' },
    barber: { bg: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300', text: 'text-emerald-300', label: 'Barbero (Staff)', icon: '✂️' },
    client: { bg: 'bg-purple-500/20 border-purple-500/40 text-purple-300', text: 'text-purple-300', label: 'Cliente (Público)', icon: '👤' },
  };

  const currentBadge = currentUser ? roleColors[currentUser.role] : roleColors.admin;

  return (
    <header className="sticky top-0 z-40 w-full bg-[#0a1628]/95 backdrop-blur-md border-b border-[#3b82f6]/20 px-4 md:px-8 py-3 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-3">
          <Link to="/dashboard" className="relative group cursor-pointer flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1a4fd6] to-[#0d2347] border border-[#3b82f6]/40 flex items-center justify-center p-1.5 shadow-lg shadow-[#1a4fd6]/20">
              <img
                src="/isotipo-apolo.png"
                alt="ApoloDigital"
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <Scissors className="w-5 h-5 text-[#f0b429] absolute drop-shadow" />
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-heading font-extrabold text-xl tracking-tight text-white">
                  Apolo<span className="text-[#60a5fa]">Digital</span>
                </span>
                <span className="text-[#f0b429] font-heading font-black text-xl tracking-wider">
                  BARBER
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-[#94a3b8]">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-white font-medium">Sopocachi, La Paz</span>
                <span className="text-[#f0b429]">•</span>
                <span className="text-[#c8deff]">Panel Operativo</span>
              </div>
            </div>
          </Link>
        </div>

        {/* Center / Date badge */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0d2347]/60 border border-[#3b82f6]/20 text-xs text-[#c8deff]">
          <Calendar className="w-3.5 h-3.5 text-[#f0b429]" />
          <span className="capitalize">{todayFormatted}</span>
          <span className="text-[#94a3b8]">|</span>
          <span className="text-[#60a5fa] font-medium">Bolivia (GMT-4)</span>
        </div>

        {/* Right Actions: Role Switcher, Public Portal Link, New Appointment & Logout */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* User Role Switcher (RBAC / SoD Testing) */}
          <div className="relative">
            <button
              onClick={() => setIsRoleMenuOpen(!isRoleMenuOpen)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${currentBadge.bg}`}
              title="Cambiar rol activo para probar permisos y SoD"
            >
              <span>{currentBadge.icon}</span>
              <span className="hidden sm:inline">{currentUser?.full_name || 'Admin'}</span>
              <span className="text-[10px] opacity-80 uppercase tracking-wider">({currentUser?.role || 'admin'})</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-60" />
            </button>

            {isRoleMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-[#0d2347] border border-[#3b82f6]/30 rounded-2xl p-2 shadow-2xl z-50 space-y-1">
                <div className="px-3 py-2 border-b border-[#3b82f6]/20">
                  <p className="text-[10px] text-[#94a3b8] uppercase font-bold tracking-wider">Simular Rol (Auditoría OWASP)</p>
                  <p className="text-xs text-white font-medium">{currentUser?.email}</p>
                </div>

                <button
                  onClick={() => {
                    onSwitchUserRole('superadmin');
                    setIsRoleMenuOpen(false);
                  }}
                  className="w-full px-3 py-2 rounded-xl flex items-center justify-between text-xs hover:bg-[#1a4fd6]/20 text-white transition-all text-left"
                >
                  <div className="flex items-center gap-2">
                    <span>⚡</span>
                    <div>
                      <p className="font-bold text-fuchsia-300">Super Administrador (SaaS)</p>
                      <p className="text-[10px] text-[#94a3b8]">Crea barberías y control de red</p>
                    </div>
                  </div>
                  {currentUser?.role === 'superadmin' && <Check className="w-4 h-4 text-emerald-400" />}
                </button>

                <button
                  onClick={() => {
                    onSwitchUserRole('owner');
                    setIsRoleMenuOpen(false);
                  }}
                  className="w-full px-3 py-2 rounded-xl flex items-center justify-between text-xs hover:bg-[#1a4fd6]/20 text-white transition-all text-left"
                >
                  <div className="flex items-center gap-2">
                    <span>👑</span>
                    <div>
                      <p className="font-bold text-amber-300">Dueño / Propietario</p>
                      <p className="text-[10px] text-[#94a3b8]">Control total y comisiones</p>
                    </div>
                  </div>
                  {currentUser?.role === 'owner' && <Check className="w-4 h-4 text-emerald-400" />}
                </button>

                <button
                  onClick={() => {
                    onSwitchUserRole('admin');
                    setIsRoleMenuOpen(false);
                  }}
                  className="w-full px-3 py-2 rounded-xl flex items-center justify-between text-xs hover:bg-[#1a4fd6]/20 text-white transition-all text-left"
                >
                  <div className="flex items-center gap-2">
                    <span>🛡️</span>
                    <div>
                      <p className="font-bold text-blue-300">Admin / Recepción</p>
                      <p className="text-[10px] text-[#94a3b8]">Caja, cobros y agenda total</p>
                    </div>
                  </div>
                  {currentUser?.role === 'admin' && <Check className="w-4 h-4 text-emerald-400" />}
                </button>

                <button
                  onClick={() => {
                    onSwitchUserRole('barber');
                    setIsRoleMenuOpen(false);
                  }}
                  className="w-full px-3 py-2 rounded-xl flex items-center justify-between text-xs hover:bg-[#1a4fd6]/20 text-white transition-all text-left"
                >
                  <div className="flex items-center gap-2">
                    <span>✂️</span>
                    <div>
                      <p className="font-bold text-emerald-300">Alex Mendoza (Barbero)</p>
                      <p className="text-[10px] text-[#94a3b8]">Solo sus citas, caja bloqueada (SoD)</p>
                    </div>
                  </div>
                  {currentUser?.role === 'barber' && <Check className="w-4 h-4 text-emerald-400" />}
                </button>
              </div>
            )}
          </div>

          {/* Link to Public Portal */}
          <Link
            to="/"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0d2347] hover:bg-[#102a54] border border-[#3b82f6]/30 text-xs text-[#c8deff] hover:text-[#f0b429] transition-all"
            title="Abrir el portal público de reservas de clientes en nueva pestaña"
          >
            <span>Portal Clientes</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>

          {/* Quick Action: New Appointment */}
          <button
            onClick={onOpenNewAppointment}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-[#1a4fd6] via-[#2563eb] to-[#3b82f6] hover:brightness-110 text-white text-xs md:text-sm font-semibold shadow-lg shadow-[#1a4fd6]/30 border border-[#60a5fa]/40 transition-all transform active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span className="hidden sm:inline">Nueva Cita</span>
          </button>

          {/* Logout Action */}
          <button
            onClick={handleLogoutClick}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 hover:text-rose-100 text-xs font-semibold transition-all group"
            title="Cerrar sesión segura y salir al login"
          >
            <LogOut className="w-4 h-4 text-rose-400 group-hover:rotate-12 transition-transform" />
            <span className="hidden sm:inline">Cerrar Sesión</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
