import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  UserCheck,
  Plus,
  KeyRound,
  Trash2,
  Edit2,
  Lock,
  Mail,
  User as UserIcon,
  Search,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  AlertTriangle,
  Sparkles,
  Crown
} from 'lucide-react';
import { SystemUser, Barber, User, UserRole, UserCreateData, UserUpdateData } from '../types';
import { api } from '../services/api';

interface UsersViewProps {
  currentUser?: User | null;
  barbers: Barber[];
}

export const UsersView: React.FC<UsersViewProps> = ({ currentUser, barbers }) => {
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Selected User for actions
  const [selectedUser, setSelectedUser] = useState<SystemUser | null>(null);

  // Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<UserRole>('barber');
  const [linkedBarberId, setLinkedBarberId] = useState<string>('');
  const [isActive, setIsActive] = useState<boolean>(true);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const isSuperadmin = currentUser?.role === 'superadmin';
  const isOwner = currentUser?.role === 'owner' || isSuperadmin;

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await api.getUsers();
      setUsers(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar las credenciales');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const showNotification = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  // Open Create
  const handleOpenCreate = () => {
    setFullName('');
    setEmail('');
    setPassword('Apolo2026!');
    setConfirmPassword('Apolo2026!');
    setRole('barber');
    setLinkedBarberId('');
    setIsActive(true);
    setShowPassword(false);
    setIsCreateModalOpen(true);
  };

  // Open Edit
  const handleOpenEdit = (u: SystemUser) => {
    setSelectedUser(u);
    setFullName(u.full_name);
    setEmail(u.email);
    setRole(u.role);
    setLinkedBarberId(u.barber_id || '');
    setIsActive(u.is_active);
    setIsEditModalOpen(true);
  };

  // Open Change Password
  const handleOpenPassword = (u: SystemUser) => {
    setSelectedUser(u);
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setIsPasswordModalOpen(true);
  };

  // Open Delete
  const handleOpenDelete = (u: SystemUser) => {
    setSelectedUser(u);
    setIsDeleteModalOpen(true);
  };

  // Submit Create
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert('Las contraseñas no coinciden.');
      return;
    }
    try {
      const payload: UserCreateData = {
        full_name: fullName,
        email: email.trim().toLowerCase(),
        password,
        role,
        barber_id: linkedBarberId ? linkedBarberId : undefined,
        is_active: isActive,
      };
      await api.createUser(payload);
      setIsCreateModalOpen(false);
      showNotification(`Credencial creada exitosamente para ${fullName}`);
      loadUsers();
    } catch (err: any) {
      alert(err.message || 'Error al crear credencial');
    }
  };

  // Submit Edit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      const payload: UserUpdateData = {
        full_name: fullName,
        email: email.trim().toLowerCase(),
        role,
        barber_id: linkedBarberId ? linkedBarberId : '',
        is_active: isActive,
      };
      await api.updateUser(selectedUser.id, payload);
      setIsEditModalOpen(false);
      showNotification(`Credencial de ${fullName} actualizada correctamente`);
      loadUsers();
    } catch (err: any) {
      alert(err.message || 'Error al actualizar credencial');
    }
  };

  // Submit Password Change
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    if (password.length < 4) {
      alert('La contraseña debe tener al menos 4 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      alert('Las contraseñas no coinciden.');
      return;
    }
    try {
      await api.updateUser(selectedUser.id, { password });
      setIsPasswordModalOpen(false);
      showNotification(`Contraseña de ${selectedUser.full_name} actualizada exitosamente`);
    } catch (err: any) {
      alert(err.message || 'Error al cambiar contraseña');
    }
  };

  // Submit Delete
  const handleDeleteSubmit = async () => {
    if (!selectedUser) return;
    try {
      await api.deleteUser(selectedUser.id);
      setIsDeleteModalOpen(false);
      showNotification(`Usuario ${selectedUser.full_name} eliminado del sistema`);
      loadUsers();
    } catch (err: any) {
      alert(err.message || 'Error al eliminar credencial');
    }
  };

  // Toggle active status
  const handleToggleActive = async (u: SystemUser) => {
    try {
      await api.updateUser(u.id, { is_active: !u.is_active });
      loadUsers();
    } catch (err: any) {
      alert(err.message || 'Error al cambiar estado');
    }
  };

  // Filtered users
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.barber_name && u.barber_name.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getRoleBadge = (r: UserRole) => {
    switch (r) {
      case 'superadmin':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30">
            <Sparkles className="w-3 h-3" /> Superadmin
          </span>
        );
      case 'owner':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#f0b429]/15 text-[#f0b429] border border-[#f0b429]/30">
            <Crown className="w-3 h-3" /> Dueño
          </span>
        );
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
            <ShieldCheck className="w-3 h-3" /> Administrador
          </span>
        );
      case 'barber':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            <UserCheck className="w-3 h-3" /> Barbero
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#102a54] text-[#c8deff] border border-[#3b82f6]/30">
            {r}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-[#0d2347] to-[#102a54] p-6 rounded-2xl border border-[#3b82f6]/30 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-[#1a4fd6]/40 text-[#60a5fa] border border-[#3b82f6]/40">
              Seguridad & RBAC Multi-Tenant
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold font-heading text-white">
            Credenciales & Accesos al Sistema
          </h2>
          <p className="text-xs md:text-sm text-[#94a3b8] mt-1">
            Administra correos, contraseñas y permisos del dueño, administradores y barberos para iniciar sesión.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#1a4fd6] to-[#2563eb] text-white font-bold text-xs md:text-sm shadow-lg shadow-[#1a4fd6]/40 hover:from-[#2563eb] hover:to-[#3b82f6] transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Credencial</span>
        </button>
      </div>

      {/* Toast Notification */}
      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#60a5fa]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre o correo..."
            className="w-full pl-10 pr-3.5 py-2 rounded-xl bg-[#0a1628] border border-[#3b82f6]/30 text-white text-xs placeholder:text-[#64748b] focus:outline-none focus:border-[#60a5fa]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1">
          {['all', 'owner', 'admin', 'barber'].map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                roleFilter === r
                  ? 'bg-gradient-to-r from-[#1a4fd6] to-[#2563eb] text-white shadow-md shadow-[#1a4fd6]/30'
                  : 'bg-[#0d2347] text-[#c8deff] hover:bg-[#102a54] border border-[#3b82f6]/20'
              }`}
            >
              {r === 'all' ? 'Todos' : r === 'owner' ? 'Dueños' : r === 'admin' ? 'Admins' : 'Barberos'}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table / Cards */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-3 border-[#1a4fd6] border-t-[#f0b429] rounded-full animate-spin"></div>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-12 rounded-2xl bg-[#0d2347]/50 border border-[#3b82f6]/20 p-6">
          <KeyRound className="w-12 h-12 text-[#60a5fa]/40 mx-auto mb-3" />
          <p className="text-white font-bold text-sm">No se encontraron credenciales</p>
          <p className="text-xs text-[#94a3b8] mt-1">Registra un nuevo usuario para otorgarle acceso al sistema.</p>
        </div>
      ) : (
        <div className="rounded-2xl bg-[#0d2347]/80 border border-[#3b82f6]/30 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0a1628] text-[#94a3b8] uppercase font-bold border-b border-[#3b82f6]/20">
                <tr>
                  <th className="py-3.5 px-4">Usuario / Nombre</th>
                  <th className="py-3.5 px-4">Correo (Login)</th>
                  <th className="py-3.5 px-4">Rol & Permisos</th>
                  <th className="py-3.5 px-4">Barbero Vinculado</th>
                  <th className="py-3.5 px-4 text-center">Estado</th>
                  <th className="py-3.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#3b82f6]/15">
                {filteredUsers.map((u) => {
                  const isCurrent = currentUser?.id === u.id;
                  const canModify =
                    isSuperadmin ||
                    (isOwner && (u.role !== 'owner' || isCurrent)) ||
                    (currentUser?.role === 'admin' && u.role === 'barber');

                  return (
                    <tr key={u.id} className="hover:bg-[#102a54]/40 transition-colors">
                      {/* Name & Avatar */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#1a4fd6] to-[#0ea5e9] flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-md">
                            {u.full_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-white flex items-center gap-1.5">
                              <span>{u.full_name}</span>
                              {isCurrent && (
                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                  Tú
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-[#94a3b8]">ID: {u.id}</div>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-white font-medium">
                          <Mail className="w-3.5 h-3.5 text-[#60a5fa]" />
                          <span>{u.email}</span>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="py-3.5 px-4">{getRoleBadge(u.role)}</td>

                      {/* Linked Barber */}
                      <td className="py-3.5 px-4">
                        {u.barber_name ? (
                          <span className="text-[#c8deff] font-medium flex items-center gap-1">
                            💈 {u.barber_name}
                          </span>
                        ) : (
                          <span className="text-[#64748b] italic">Sin vinculación</span>
                        )}
                      </td>

                      {/* Status Toggle */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          disabled={!canModify || isCurrent}
                          onClick={() => handleToggleActive(u)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold transition-all ${
                            u.is_active
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25'
                              : 'bg-rose-500/15 text-rose-400 border border-rose-500/30 hover:bg-rose-500/25'
                          } ${(!canModify || isCurrent) && 'opacity-60 cursor-not-allowed'}`}
                        >
                          {u.is_active ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          <span>{u.is_active ? 'Activo' : 'Inactivo'}</span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Change password button */}
                          <button
                            disabled={!canModify}
                            onClick={() => handleOpenPassword(u)}
                            title="Cambiar Contraseña"
                            className="p-1.5 rounded-lg bg-[#102a54] hover:bg-[#1a4fd6]/50 text-[#f0b429] hover:text-white border border-[#3b82f6]/20 transition-all disabled:opacity-40"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit user button */}
                          <button
                            disabled={!canModify}
                            onClick={() => handleOpenEdit(u)}
                            title="Editar Datos"
                            className="p-1.5 rounded-lg bg-[#102a54] hover:bg-[#1a4fd6]/50 text-[#60a5fa] hover:text-white border border-[#3b82f6]/20 transition-all disabled:opacity-40"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete user button */}
                          <button
                            disabled={!canModify || isCurrent}
                            onClick={() => handleOpenDelete(u)}
                            title="Eliminar Credencial"
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/20 transition-all disabled:opacity-40"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* Modal: Crear Usuario */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a1628]/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-[#0d2347] border border-[#3b82f6]/40 p-6 shadow-2xl relative">
            <h3 className="font-heading font-bold text-lg text-white mb-1 flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-[#f0b429]" />
              <span>Registrar Nueva Credencial</span>
            </h3>
            <p className="text-xs text-[#94a3b8] mb-4">
              Crea un acceso de inicio de sesión con correo y contraseña.
            </p>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#c8deff] mb-1">Nombre Completo</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ej: Marcelo Suarez"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a1628] border border-[#3b82f6]/30 text-white text-xs focus:outline-none focus:border-[#60a5fa]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#c8deff] mb-1">Correo Electrónico (Login)</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@apolodigital.lat"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a1628] border border-[#3b82f6]/30 text-white text-xs focus:outline-none focus:border-[#60a5fa]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#c8deff] mb-1">Rol en el Sistema</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a1628] border border-[#3b82f6]/30 text-white text-xs focus:outline-none focus:border-[#60a5fa]"
                  >
                    <option value="barber">💈 Barbero (Agenda Propia)</option>
                    <option value="admin">🛡️ Administrador (Operativo)</option>
                    {isOwner && <option value="owner">👑 Dueño (Acceso Total)</option>}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#c8deff] mb-1">Vincular a Barbero</label>
                  <select
                    value={linkedBarberId}
                    onChange={(e) => setLinkedBarberId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a1628] border border-[#3b82f6]/30 text-white text-xs focus:outline-none focus:border-[#60a5fa]"
                  >
                    <option value="">Ninguno (Administración)</option>
                    {barbers.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#c8deff] mb-1">Contraseña Inicial</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 4 caracteres"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a1628] border border-[#3b82f6]/30 text-white text-xs focus:outline-none focus:border-[#60a5fa] pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#c8deff] mb-1">Confirmar Contraseña</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repite la contraseña"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a1628] border border-[#3b82f6]/30 text-white text-xs focus:outline-none focus:border-[#60a5fa]"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="create_is_active"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded border-[#3b82f6]/40 text-[#1a4fd6] focus:ring-0"
                />
                <label htmlFor="create_is_active" className="text-xs text-[#c8deff]">
                  Cuenta activa para iniciar sesión inmediatamente
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#3b82f6]/20">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#102a54] text-[#c8deff] hover:text-white text-xs font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#1a4fd6] to-[#2563eb] text-white text-xs font-bold shadow-lg shadow-[#1a4fd6]/30"
                >
                  Crear Credencial
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Usuario */}
      {isEditModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a1628]/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-[#0d2347] border border-[#3b82f6]/40 p-6 shadow-2xl relative">
            <h3 className="font-heading font-bold text-lg text-white mb-1 flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-[#60a5fa]" />
              <span>Editar Credencial</span>
            </h3>
            <p className="text-xs text-[#94a3b8] mb-4">Modifica los datos del usuario {selectedUser.full_name}.</p>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#c8deff] mb-1">Nombre Completo</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a1628] border border-[#3b82f6]/30 text-white text-xs focus:outline-none focus:border-[#60a5fa]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#c8deff] mb-1">Correo Electrónico (Login)</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a1628] border border-[#3b82f6]/30 text-white text-xs focus:outline-none focus:border-[#60a5fa]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#c8deff] mb-1">Rol</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a1628] border border-[#3b82f6]/30 text-white text-xs focus:outline-none focus:border-[#60a5fa]"
                  >
                    <option value="barber">💈 Barbero</option>
                    <option value="admin">🛡️ Administrador</option>
                    {isOwner && <option value="owner">👑 Dueño</option>}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#c8deff] mb-1">Barbero Vinculado</label>
                  <select
                    value={linkedBarberId}
                    onChange={(e) => setLinkedBarberId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a1628] border border-[#3b82f6]/30 text-white text-xs focus:outline-none focus:border-[#60a5fa]"
                  >
                    <option value="">Ninguno</option>
                    {barbers.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="edit_is_active"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded border-[#3b82f6]/40 text-[#1a4fd6] focus:ring-0"
                />
                <label htmlFor="edit_is_active" className="text-xs text-[#c8deff]">
                  Cuenta activa
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#3b82f6]/20">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#102a54] text-[#c8deff] hover:text-white text-xs font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#1a4fd6] to-[#2563eb] text-white text-xs font-bold shadow-lg shadow-[#1a4fd6]/30"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Cambiar Contraseña */}
      {isPasswordModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a1628]/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-[#0d2347] border border-[#3b82f6]/40 p-6 shadow-2xl relative">
            <h3 className="font-heading font-bold text-lg text-white mb-1 flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-[#f0b429]" />
              <span>Cambiar Contraseña</span>
            </h3>
            <p className="text-xs text-[#94a3b8] mb-4">
              Restablece la clave de acceso para <strong className="text-white">{selectedUser.full_name}</strong> ({selectedUser.email}).
            </p>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#c8deff] mb-1">Nueva Contraseña</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 4 caracteres"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a1628] border border-[#3b82f6]/30 text-white text-xs focus:outline-none focus:border-[#60a5fa] pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#c8deff] mb-1">Repetir Nueva Contraseña</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repite la clave"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a1628] border border-[#3b82f6]/30 text-white text-xs focus:outline-none focus:border-[#60a5fa]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#3b82f6]/20">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#102a54] text-[#c8deff] hover:text-white text-xs font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#f0b429] to-[#d97706] text-[#0a1628] text-xs font-bold shadow-lg shadow-[#f0b429]/20"
                >
                  Actualizar Contraseña
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirmar Eliminación */}
      {isDeleteModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a1628]/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-[#0d2347] border border-rose-500/40 p-6 shadow-2xl relative text-center">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center mx-auto mb-3 text-rose-400">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-heading font-bold text-base text-white mb-1">¿Eliminar Credencial?</h3>
            <p className="text-xs text-[#94a3b8] mb-5">
              Se eliminará el acceso para <strong className="text-white">{selectedUser.full_name}</strong> ({selectedUser.email}). Esta acción revocará su sesión de inmediato.
            </p>

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#102a54] text-[#c8deff] hover:text-white text-xs font-medium"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteSubmit}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30"
              >
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
