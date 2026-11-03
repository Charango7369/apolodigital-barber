import React, { useState } from 'react';
import { Sparkles, Plus, Star, Percent, Phone, Scissors, Check, Edit2 } from 'lucide-react';
import { Barber } from '../types';

interface BarbersViewProps {
  barbers: Barber[];
  onCreateBarber: (barber: Partial<Barber>) => Promise<void>;
  onUpdateBarber: (id: string, barber: Partial<Barber>) => Promise<void>;
}

export const BarbersView: React.FC<BarbersViewProps> = ({
  barbers,
  onCreateBarber,
  onUpdateBarber,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBarber, setEditingBarber] = useState<Barber | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [phone, setPhone] = useState('+591 ');
  const [specialty, setSpecialty] = useState('Fades y Diseños Urbanos');
  const [commissionRate, setCommissionRate] = useState(50);

  const handleOpenCreate = () => {
    setEditingBarber(null);
    setName('');
    setNickname('');
    setPhotoUrl('https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150');
    setPhone('+591 ');
    setSpecialty('Fades y Diseños Urbanos');
    setCommissionRate(50);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (b: Barber) => {
    setEditingBarber(b);
    setName(b.name);
    setNickname(b.nickname || '');
    setPhotoUrl(b.photo_url || '');
    setPhone(b.phone || '+591 ');
    setSpecialty(b.specialty || '');
    setCommissionRate(Math.round(b.commission_rate * 100));
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingBarber) {
      await onUpdateBarber(editingBarber.id, {
        name,
        nickname,
        photo_url: photoUrl,
        phone,
        specialty,
        commission_rate: commissionRate / 100,
      });
    } else {
      await onCreateBarber({
        name,
        nickname,
        photo_url: photoUrl,
        phone,
        specialty,
        commission_rate: commissionRate / 100,
        rating: 5.0,
        is_active: true,
      });
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[#0d2347]/80 border border-[#3b82f6]/20">
        <div>
          <h2 className="font-heading font-extrabold text-xl text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#f0b429]" />
            Equipo de Barberos & Estilistas
          </h2>
          <p className="text-xs text-[#94a3b8] mt-1">
            Administra los sillones asignados, especialidades, comisiones de cortes y disponibilidades.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#1a4fd6] to-[#2563eb] hover:brightness-110 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-[#1a4fd6]/25 border border-[#60a5fa]/30 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Registrar Barbero</span>
        </button>
      </div>

      {/* Barbers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {barbers.map((barber) => (
          <div
            key={barber.id}
            className="p-5 rounded-2xl bg-[#0d2347]/70 border border-[#3b82f6]/20 hover:border-[#f0b429]/50 transition-all flex flex-col justify-between group shadow-xl relative overflow-hidden"
          >
            {/* Active Pill top corner */}
            <div className="absolute top-4 right-4">
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                  barber.is_active
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${barber.is_active ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
                {barber.is_active ? 'Activo' : 'Inactivo'}
              </span>
            </div>

            <div>
              {/* Photo & Badge */}
              <div className="relative w-20 h-20 mx-auto mb-4">
                <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-[#f0b429] p-0.5 bg-[#0a1628] shadow-lg shadow-[#f0b429]/20">
                  <img
                    src={barber.photo_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                    alt={barber.name}
                    className="w-full h-full object-cover rounded-xl"
                  />
                </div>
                <div className="absolute -bottom-2 -right-2 px-1.5 py-0.5 rounded-md bg-[#0a1628] border border-[#f0b429] text-[10px] font-bold text-[#f0b429] flex items-center gap-0.5 shadow">
                  <Star className="w-3 h-3 fill-[#f0b429]" />
                  <span>{barber.rating.toFixed(1)}</span>
                </div>
              </div>

              {/* Names */}
              <div className="text-center mb-3">
                <h3 className="font-heading font-extrabold text-base text-white">{barber.name}</h3>
                <div className="text-xs font-semibold text-[#f0b429]">
                  {barber.nickname || 'Master Barber'}
                </div>
              </div>

              {/* Specialty & Details */}
              <div className="space-y-2 mb-4">
                <div className="p-2.5 rounded-xl bg-[#0a1628]/80 border border-[#3b82f6]/20 text-center">
                  <div className="text-[10px] font-bold text-[#60a5fa] uppercase tracking-wider mb-0.5">
                    Especialidad
                  </div>
                  <div className="text-xs text-white font-medium">{barber.specialty}</div>
                </div>

                <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#102a54]/50 border border-[#3b82f6]/15 text-xs">
                  <span className="text-[#94a3b8] flex items-center gap-1">
                    <Percent className="w-3.5 h-3.5 text-[#f0b429]" />
                    Comisión:
                  </span>
                  <span className="font-bold text-white">
                    {Math.round(barber.commission_rate * 100)}%
                  </span>
                </div>

                {barber.phone && (
                  <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#102a54]/50 border border-[#3b82f6]/15 text-xs">
                    <span className="text-[#94a3b8] flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-[#60a5fa]" />
                      Celular:
                    </span>
                    <span className="text-[#c8deff] font-medium">{barber.phone}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Edit button */}
            <div className="pt-3 border-t border-[#3b82f6]/15">
              <button
                onClick={() => handleOpenEdit(barber)}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#102a54] hover:bg-[#1a4fd6]/40 text-[#c8deff] hover:text-white text-xs font-semibold border border-[#3b82f6]/25 transition-all"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Editar Perfil & Comisión</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Create/Edit Barber */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a1628]/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-[#0d2347] border border-[#3b82f6]/40 p-6 shadow-2xl relative">
            <h3 className="font-heading font-bold text-lg text-white mb-4">
              {editingBarber ? 'Editar Barbero' : 'Registrar Nuevo Barbero'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#c8deff] mb-1">Nombre Completo</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: David Salazar"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a1628] border border-[#3b82f6]/30 text-white text-sm focus:outline-none focus:border-[#60a5fa]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#c8deff] mb-1">Apodo / Título</label>
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="Ej: El Mago"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a1628] border border-[#3b82f6]/30 text-white text-sm focus:outline-none focus:border-[#60a5fa]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#c8deff] mb-1">Comisión (%)</label>
                  <input
                    type="number"
                    min="10"
                    max="100"
                    required
                    value={commissionRate}
                    onChange={(e) => setCommissionRate(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a1628] border border-[#3b82f6]/30 text-white text-sm focus:outline-none focus:border-[#60a5fa]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#c8deff] mb-1">Especialidad Principal</label>
                <input
                  type="text"
                  required
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  placeholder="Ej: Fade Militar, Barbas Tradicionales, etc."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a1628] border border-[#3b82f6]/30 text-white text-sm focus:outline-none focus:border-[#60a5fa]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#c8deff] mb-1">Teléfono Celular</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+591 7XXXXXXX"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a1628] border border-[#3b82f6]/30 text-white text-sm focus:outline-none focus:border-[#60a5fa]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#c8deff] mb-1">URL de Foto de Perfil</label>
                <input
                  type="url"
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a1628] border border-[#3b82f6]/30 text-white text-sm focus:outline-none focus:border-[#60a5fa]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#102a54] text-[#c8deff] hover:text-white text-xs font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#1a4fd6] to-[#2563eb] text-white text-xs font-bold shadow-lg shadow-[#1a4fd6]/30"
                >
                  {editingBarber ? 'Guardar Cambios' : 'Registrar Barbero'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
