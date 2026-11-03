import React, { useState } from 'react';
import {
  Building2,
  Plus,
  Search,
  MapPin,
  Phone,
  Users,
  Calendar,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  X,
  Loader2,
  ExternalLink,
  Store,
  DollarSign
} from 'lucide-react';
import { Organization, OrganizationCreateData } from '../types';

interface OrganizationsViewProps {
  organizations: Organization[];
  onCreateOrganization: (data: OrganizationCreateData) => Promise<void>;
  onUpdateOrganization: (id: string, data: Partial<Organization>) => Promise<void>;
  onDeleteOrganization: (id: string) => Promise<void>;
}

export const OrganizationsView: React.FC<OrganizationsViewProps> = ({
  organizations,
  onCreateOrganization,
  onUpdateOrganization,
  onDeleteOrganization,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('+591 ');
  const [currency, setCurrency] = useState('Bs.');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('Apolo2026!');
  const [cloneServices, setCloneServices] = useState(true);

  // Auto-slugify as user types name
  const handleNameChange = (val: string) => {
    setName(val);
    const generated = val
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
    setSlug(generated);
  };

  const handleOpenModal = () => {
    setName('');
    setSlug('');
    setAddress('');
    setPhone('+591 ');
    setCurrency('Bs.');
    setAdminName('');
    setAdminEmail('');
    setAdminPassword('Apolo2026!');
    setCloneServices(true);
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      await onCreateOrganization({
        name: name.trim(),
        slug: slug.trim() || undefined,
        address: address.trim(),
        phone: phone.trim(),
        currency: currency.trim() || 'Bs.',
        admin_name: adminName.trim() || undefined,
        admin_email: adminEmail.trim() || undefined,
        admin_password: adminPassword || undefined,
        clone_default_services: cloneServices,
      });

      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Error creating organization:', err);
      setErrorMsg(err.message || 'Error al registrar la barbería');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = organizations.filter(
    (o) =>
      o.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.address && o.address.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalBarbers = organizations.reduce((acc, o) => acc + (o.barbers_count || 0), 0);
  const totalAppointments = organizations.reduce((acc, o) => acc + (o.appointments_count || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Banner: Superadmin SaaS Control */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-[#1a4fd6]/20 via-[#0d2347] to-[#0a1628] border border-[#3b82f6]/30">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-[#1a4fd6]/30 border border-[#3b82f6]/40 text-[#f0b429]">
              <Building2 className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-xl font-bold font-heading text-white">
                Red de Barberías (SaaS Multi-Tenant)
              </h2>
              <p className="text-xs text-[#94a3b8]">
                Panel exclusivo para Superadministrador: crea nuevas sucursales y franquicias independientes con base de datos segregada.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleOpenModal}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#f0b429] to-[#d4af37] hover:brightness-110 text-[#070d1e] font-extrabold text-xs shadow-lg shadow-[#f0b429]/30 transition-all transform active:scale-95 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>+ Nueva Barbería</span>
        </button>
      </div>

      {/* Network Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-[#0d2347]/60 border border-[#3b82f6]/20 flex items-center justify-between">
          <div>
            <p className="text-xs text-[#94a3b8] font-medium uppercase tracking-wider">Barberías Activas</p>
            <p className="text-2xl font-black text-white mt-1 font-heading">{organizations.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Store className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0d2347]/60 border border-[#3b82f6]/20 flex items-center justify-between">
          <div>
            <p className="text-xs text-[#94a3b8] font-medium uppercase tracking-wider">Barberos en la Red</p>
            <p className="text-2xl font-black text-[#60a5fa] mt-1 font-heading">{totalBarbers}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0d2347]/60 border border-[#3b82f6]/20 flex items-center justify-between">
          <div>
            <p className="text-xs text-[#94a3b8] font-medium uppercase tracking-wider">Turnos Globales</p>
            <p className="text-2xl font-black text-[#f0b429] mt-1 font-heading">{totalAppointments}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Calendar className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-[#94a3b8] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar barbería por nombre, slug o ubicación..."
          className="w-full bg-[#0d2347]/50 border border-[#3b82f6]/30 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-[#94a3b8] focus:outline-none focus:border-[#f0b429]"
        />
      </div>

      {/* Organizations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((org) => {
          const isMatriz = org.id === 'org_apolo_sopocachi';
          return (
            <div
              key={org.id}
              className={`p-5 rounded-2xl bg-[#0d2347]/80 backdrop-blur-md border transition-all ${
                isMatriz
                  ? 'border-[#f0b429]/50 shadow-lg shadow-[#f0b429]/5'
                  : 'border-[#3b82f6]/25 hover:border-[#3b82f6]/50'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-extrabold text-white font-heading">{org.name}</h3>
                    {isMatriz && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-bold">
                        Matriz Central
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#60a5fa] font-mono mt-0.5">ID: {org.id} • /{org.slug}</p>
                </div>

                <span
                  className={`px-2 py-1 rounded-lg text-[10px] font-semibold flex items-center gap-1 ${
                    org.is_active
                      ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${org.is_active ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
                  {org.is_active ? 'Operativa' : 'Inactiva'}
                </span>
              </div>

              {/* Details */}
              <div className="space-y-1.5 text-xs text-[#c8deff] mb-4">
                {org.address && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-[#f0b429] shrink-0" />
                    <span className="truncate">{org.address}</span>
                  </div>
                )}
                {org.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-[#60a5fa] shrink-0" />
                    <span>{org.phone}</span>
                  </div>
                )}
                {org.admin_email && (
                  <div className="flex items-center gap-2 text-[11px] text-[#94a3b8]">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Admin: <strong className="text-white">{org.admin_email}</strong></span>
                  </div>
                )}
              </div>

              {/* Stats Counters */}
              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[#3b82f6]/20 text-center text-xs">
                <div className="p-2 rounded-xl bg-[#0a1628]/60 border border-[#3b82f6]/15">
                  <p className="text-[10px] text-[#94a3b8]">Barberos</p>
                  <p className="font-bold text-white mt-0.5">{org.barbers_count ?? 0}</p>
                </div>
                <div className="p-2 rounded-xl bg-[#0a1628]/60 border border-[#3b82f6]/15">
                  <p className="text-[10px] text-[#94a3b8]">Citas</p>
                  <p className="font-bold text-white mt-0.5">{org.appointments_count ?? 0}</p>
                </div>
                <div className="p-2 rounded-xl bg-[#0a1628]/60 border border-[#3b82f6]/15">
                  <p className="text-[10px] text-[#94a3b8]">Moneda</p>
                  <p className="font-bold text-[#f0b429] mt-0.5">{org.currency || 'Bs.'}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Crear Nueva Barbería */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-lg bg-[#0a1628] border border-[#3b82f6]/30 rounded-3xl p-6 sm:p-7 shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            {/* Close */}
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-[#94a3b8] hover:text-white rounded-xl hover:bg-[#0d2347] transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-1">
                <span className="p-2 rounded-xl bg-[#1a4fd6]/20 border border-[#3b82f6]/40 text-[#f0b429]">
                  <Building2 className="w-5 h-5" />
                </span>
                <h3 className="text-lg font-bold font-heading text-white">
                  Registrar Nueva Barbería / Sucursal
                </h3>
              </div>
              <p className="text-xs text-[#94a3b8]">
                Crea una instancia multi-tenant completa con su propio catálogo, equipo de barberos y usuario administrador.
              </p>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#c8deff] mb-1">
                  Nombre de la Barbería *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Ej: Apolo Barber Studio - Calacoto"
                  required
                  className="w-full bg-[#070d1e] border border-[#3b82f6]/30 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-[#4b5563] focus:outline-none focus:border-[#f0b429]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#c8deff] mb-1">
                    Slug / Identificador URL
                  </label>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="apolo-calacoto"
                    className="w-full bg-[#070d1e] border border-[#3b82f6]/30 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-[#4b5563] focus:outline-none focus:border-[#f0b429]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#c8deff] mb-1">
                    Moneda Operativa
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full bg-[#070d1e] border border-[#3b82f6]/30 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#f0b429]"
                  >
                    <option value="Bs.">Bolivianos (Bs.)</option>
                    <option value="USD">Dólares ($ USD)</option>
                    <option value="EUR">Euros (€ EUR)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#c8deff] mb-1">
                  Dirección Física
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Ej: Av. Ballivián entre calles 15 y 16, Calacoto, La Paz"
                  className="w-full bg-[#070d1e] border border-[#3b82f6]/30 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-[#4b5563] focus:outline-none focus:border-[#f0b429]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#c8deff] mb-1">
                  Teléfono de Contacto
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+591 71234567"
                  className="w-full bg-[#070d1e] border border-[#3b82f6]/30 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-[#4b5563] focus:outline-none focus:border-[#f0b429]"
                />
              </div>

              {/* Initial Owner / Admin Setup */}
              <div className="p-3.5 rounded-2xl bg-[#0d2347]/60 border border-[#3b82f6]/25 space-y-3">
                <p className="text-[11px] font-bold text-[#60a5fa] uppercase tracking-wider">
                  Cuenta de Acceso para el Dueño de esta Barbería
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-[#c8deff] mb-1">Nombre del Dueño/Admin</label>
                    <input
                      type="text"
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      placeholder="Ej: Marcelo Vargas"
                      className="w-full bg-[#070d1e] border border-[#3b82f6]/30 rounded-xl px-3 py-2 text-xs text-white placeholder-[#4b5563] focus:outline-none focus:border-[#f0b429]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-[#c8deff] mb-1">Correo Electrónico</label>
                    <input
                      type="email"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      placeholder={slug ? `admin@${slug}.lat` : 'admin@sucursal.lat'}
                      className="w-full bg-[#070d1e] border border-[#3b82f6]/30 rounded-xl px-3 py-2 text-xs text-white placeholder-[#4b5563] focus:outline-none focus:border-[#f0b429]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-[#c8deff] mb-1">Contraseña Inicial</label>
                  <input
                    type="text"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="Apolo2026!"
                    className="w-full bg-[#070d1e] border border-[#3b82f6]/30 rounded-xl px-3 py-2 text-xs text-white placeholder-[#4b5563] focus:outline-none focus:border-[#f0b429]"
                  />
                </div>
              </div>

              {/* Option to clone standard services */}
              <label className="flex items-center gap-2 text-xs text-[#c8deff] cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={cloneServices}
                  onChange={(e) => setCloneServices(e.target.checked)}
                  className="rounded border-[#3b82f6]/40 text-[#f0b429] focus:ring-[#f0b429]"
                />
                <span>Cargar catálogo base con servicios recomendados (Corte, Barba, Fade, Combo)</span>
              </label>

              {/* Submit */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-[#0d2347] hover:bg-[#102a54] text-[#c8deff] text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#f0b429] to-[#d4af37] text-[#070d1e] font-extrabold text-xs shadow-lg shadow-[#f0b429]/30 flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Registrando Barbería...</span>
                    </>
                  ) : (
                    <span>Crear Barbería</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrganizationsView;
