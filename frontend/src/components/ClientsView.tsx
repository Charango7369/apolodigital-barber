import React, { useState } from 'react';
import { Users, Search, Plus, Phone, Mail, MessageCircle, Calendar, Star, DollarSign, Edit3, Trash2 } from 'lucide-react';
import { Client } from '../types';

interface ClientsViewProps {
  clients: Client[];
  onCreateClient: (client: Partial<Client>) => Promise<void>;
  onUpdateClient: (id: string, client: Partial<Client>) => Promise<void>;
  onDeleteClient: (id: string) => Promise<void>;
}

export const ClientsView: React.FC<ClientsViewProps> = ({
  clients,
  onCreateClient,
  onUpdateClient,
  onDeleteClient,
}) => {
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+591 ');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');

  const filteredClients = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search)
  );

  const handleOpenCreate = () => {
    setEditingClient(null);
    setName('');
    setPhone('+591 ');
    setEmail('');
    setNotes('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c: Client) => {
    setEditingClient(c);
    setName(c.name);
    setPhone(c.phone);
    setEmail(c.email || '');
    setNotes(c.notes || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;

    if (editingClient) {
      await onUpdateClient(editingClient.id, {
        name,
        phone,
        email,
        notes,
      });
    } else {
      await onCreateClient({
        name,
        phone,
        email,
        notes,
      });
    }
    setIsModalOpen(false);
  };

  const openWhatsAppChat = (client: Client) => {
    const cleanPhone = client.phone.replace(/\D/g, '');
    const phoneWithCode = cleanPhone.startsWith('591') ? cleanPhone : `591${cleanPhone}`;
    const text = encodeURIComponent(
      `Hola ${client.name}! Te escribimos desde *ApoloDigital Barber*. ¿Listo para tu próximo corte o perfilado de barba? Puedes agendar tu turno directamente respondiendo a este mensaje 💈✂️`
    );
    window.open(`https://wa.me/${phoneWithCode}?text=${text}`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[#0d2347]/80 border border-[#3b82f6]/20">
        <div>
          <h2 className="font-heading font-extrabold text-xl text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-[#f0b429]" />
            Directorio de Clientes & CRM
          </h2>
          <p className="text-xs text-[#94a3b8] mt-1">
            Fidelización, historial de cortes, notas de preferencia y contacto directo por WhatsApp.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#1a4fd6] to-[#2563eb] hover:brightness-110 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-[#1a4fd6]/25 border border-[#60a5fa]/30 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Registrar Cliente</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-[#94a3b8]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar cliente por nombre o número de celular..."
          className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#0d2347]/70 border border-[#3b82f6]/20 text-white text-sm placeholder-[#94a3b8] focus:outline-none focus:border-[#60a5fa]"
        />
      </div>

      {/* Clients Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClients.map((client) => (
          <div
            key={client.id}
            className="p-5 rounded-2xl bg-[#0d2347]/70 border border-[#3b82f6]/20 hover:border-[#60a5fa]/50 transition-all flex flex-col justify-between shadow-lg"
          >
            <div>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-[#102a54] border border-[#3b82f6]/30 flex items-center justify-center font-heading font-bold text-base text-[#60a5fa]">
                    {client.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-base text-white">{client.name}</h3>
                    <div className="flex items-center gap-1.5 text-xs text-[#94a3b8]">
                      <Phone className="w-3 h-3 text-[#f0b429]" />
                      <span>{client.phone}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-[11px] font-bold text-[#f0b429] bg-[#f0b429]/10 px-2 py-0.5 rounded-lg border border-[#f0b429]/25">
                  <Star className="w-3 h-3 fill-[#f0b429]" />
                  <span>{client.total_visits} visitas</span>
                </div>
              </div>

              {/* Style / Preference Note */}
              <div className="p-2.5 rounded-xl bg-[#0a1628]/80 border border-[#3b82f6]/15 mb-3">
                <div className="text-[10px] font-bold text-[#60a5fa] uppercase tracking-wider mb-0.5">
                  Preferencia de Corte / Estilo
                </div>
                <div className="text-xs text-[#c8deff] italic">
                  {client.notes ? `"${client.notes}"` : 'Sin notas registradas todavía.'}
                </div>
              </div>

              {/* Stats pill */}
              <div className="flex items-center justify-between text-xs text-[#94a3b8] mb-3 px-1">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-[#60a5fa]" />
                  <span>Última: {client.last_visit || 'Reciente'}</span>
                </div>
                <div className="flex items-center gap-1 font-semibold text-[#f0b429]">
                  <DollarSign className="w-3 h-3" />
                  <span>Total: {client.total_spent || 0} Bs.</span>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-3 border-t border-[#3b82f6]/15 flex items-center justify-between gap-2">
              <button
                onClick={() => openWhatsAppChat(client)}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 text-xs font-semibold border border-emerald-500/30 transition-all"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Enviar WhatsApp</span>
              </button>

              <button
                onClick={() => handleOpenEdit(client)}
                className="p-2 rounded-xl bg-[#102a54] hover:bg-[#1a4fd6]/40 text-[#c8deff] hover:text-white border border-[#3b82f6]/20 transition-all"
                title="Editar cliente y notas"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => {
                  if (confirm(`¿Eliminar a ${client.name} del directorio?`)) {
                    onDeleteClient(client.id);
                  }
                }}
                className="p-2 rounded-xl bg-[#102a54] hover:bg-rose-500/20 text-[#94a3b8] hover:text-rose-400 border border-[#3b82f6]/20 transition-all"
                title="Eliminar cliente"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Create/Edit Client */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a1628]/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-[#0d2347] border border-[#3b82f6]/40 p-6 shadow-2xl relative">
            <h3 className="font-heading font-bold text-lg text-white mb-4">
              {editingClient ? 'Editar Perfil de Cliente' : 'Registrar Nuevo Cliente'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#c8deff] mb-1">Nombre Completo</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Marcelo Suárez"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a1628] border border-[#3b82f6]/30 text-white text-sm focus:outline-none focus:border-[#60a5fa]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#c8deff] mb-1">
                  Número de Celular / WhatsApp
                </label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+591 7XXXXXXX"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a1628] border border-[#3b82f6]/30 text-white text-sm focus:outline-none focus:border-[#60a5fa]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#c8deff] mb-1">
                  Correo Electrónico (Opcional)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ejemplo@correo.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a1628] border border-[#3b82f6]/30 text-white text-sm focus:outline-none focus:border-[#60a5fa]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#c8deff] mb-1">
                  Preferencia de Estilo / Notas para el Barbero
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej: Fade en 1.5 alto, navaja suave en patillas, café con azúcar..."
                  className="w-full px-3.5 py-2 rounded-xl bg-[#0a1628] border border-[#3b82f6]/30 text-white text-sm focus:outline-none focus:border-[#60a5fa]"
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
                  {editingClient ? 'Guardar Cambios' : 'Registrar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
