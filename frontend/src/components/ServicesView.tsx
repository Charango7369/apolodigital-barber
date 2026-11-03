import React, { useState } from 'react';
import { Plus, Scissors, Clock, DollarSign, Tag, Edit2, Trash2 } from 'lucide-react';
import { Service } from '../types';

interface ServicesViewProps {
  services: Service[];
  onCreateService: (service: Partial<Service>) => Promise<void>;
  onUpdateService: (id: string, service: Partial<Service>) => Promise<void>;
  onDeleteService: (id: string) => Promise<void>;
}

export const ServicesView: React.FC<ServicesViewProps> = ({
  services,
  onCreateService,
  onUpdateService,
  onDeleteService,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Cortes');
  const [duration, setDuration] = useState(30);
  const [price, setPrice] = useState(45);
  const [description, setDescription] = useState('');

  const categories = ['all', 'Cortes', 'Barba', 'Combos', 'Tratamientos'];

  const filteredServices = selectedCategory === 'all'
    ? services
    : services.filter((s) => s.category.toLowerCase() === selectedCategory.toLowerCase());

  const handleOpenCreate = () => {
    setEditingService(null);
    setName('');
    setCategory('Cortes');
    setDuration(30);
    setPrice(45);
    setDescription('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (srv: Service) => {
    setEditingService(srv);
    setName(srv.name);
    setCategory(srv.category);
    setDuration(srv.duration_minutes);
    setPrice(srv.price);
    setDescription(srv.description || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingService) {
      await onUpdateService(editingService.id, {
        name,
        category,
        duration_minutes: Number(duration),
        price: Number(price),
        description,
      });
    } else {
      await onCreateService({
        name,
        category,
        duration_minutes: Number(duration),
        price: Number(price),
        description,
        is_active: true,
      });
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[#0d2347]/80 border border-[#3b82f6]/20">
        <div>
          <h2 className="font-heading font-extrabold text-xl text-white flex items-center gap-2">
            <Scissors className="w-5 h-5 text-[#f0b429]" />
            Catálogo de Servicios & Tarifas
          </h2>
          <p className="text-xs text-[#94a3b8] mt-1">
            Configura los servicios, tiempos en sillón y precios en Bolivianos (Bs.) para tu barbería.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#1a4fd6] to-[#2563eb] hover:brightness-110 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-[#1a4fd6]/25 border border-[#60a5fa]/30 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Servicio</span>
        </button>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategory === cat
                ? 'bg-[#1a4fd6] text-white border border-[#60a5fa]/40 shadow-md shadow-[#1a4fd6]/30'
                : 'bg-[#0d2347]/70 text-[#94a3b8] hover:text-white border border-[#3b82f6]/20'
            }`}
          >
            {cat === 'all' ? 'Todos los Servicios' : cat}
          </button>
        ))}
      </div>

      {/* Grid of Service Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredServices.map((srv) => (
          <div
            key={srv.id}
            className="p-5 rounded-2xl bg-[#0d2347]/70 border border-[#3b82f6]/20 hover:border-[#60a5fa]/50 transition-all flex flex-col justify-between group shadow-lg"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-3">
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#102a54] text-[#60a5fa] border border-[#3b82f6]/30 uppercase tracking-wider">
                  {srv.category}
                </span>
                <div className="font-heading font-extrabold text-xl text-[#f0b429]">
                  {srv.price} <span className="text-xs font-normal text-[#fbbf24]">Bs.</span>
                </div>
              </div>

              <h3 className="font-heading font-bold text-base text-white mb-2 group-hover:text-[#60a5fa] transition-colors">
                {srv.name}
              </h3>

              <p className="text-xs text-[#94a3b8] mb-4 line-clamp-2">
                {srv.description || 'Servicio profesional garantizado por el equipo de ApoloDigital Barber.'}
              </p>
            </div>

            <div className="pt-3 border-t border-[#3b82f6]/15 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-[#c8deff]">
                <Clock className="w-3.5 h-3.5 text-[#f0b429]" />
                <span>{srv.duration_minutes} minutos</span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleOpenEdit(srv)}
                  className="p-1.5 rounded-lg hover:bg-[#1a4fd6]/30 text-[#94a3b8] hover:text-[#60a5fa] transition-colors"
                  title="Editar servicio"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    if (confirm(`¿Eliminar servicio "${srv.name}"?`)) {
                      onDeleteService(srv.id);
                    }
                  }}
                  className="p-1.5 rounded-lg hover:bg-rose-500/20 text-[#94a3b8] hover:text-rose-400 transition-colors"
                  title="Eliminar servicio"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Create/Edit Service */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a1628]/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-[#0d2347] border border-[#3b82f6]/40 p-6 shadow-2xl relative">
            <h3 className="font-heading font-bold text-lg text-white mb-4">
              {editingService ? 'Editar Servicio' : 'Nuevo Servicio de Barbería'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#c8deff] mb-1">Nombre del Servicio</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Degradado Low Fade con Navaja"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a1628] border border-[#3b82f6]/30 text-white text-sm focus:outline-none focus:border-[#60a5fa]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#c8deff] mb-1">Categoría</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a1628] border border-[#3b82f6]/30 text-white text-sm focus:outline-none focus:border-[#60a5fa]"
                  >
                    <option value="Cortes">Cortes</option>
                    <option value="Barba">Barba</option>
                    <option value="Combos">Combos</option>
                    <option value="Tratamientos">Tratamientos</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#c8deff] mb-1">Duración (min)</label>
                  <input
                    type="number"
                    step="5"
                    min="10"
                    max="180"
                    required
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a1628] border border-[#3b82f6]/30 text-white text-sm focus:outline-none focus:border-[#60a5fa]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#c8deff] mb-1">Precio en Bolivianos (Bs.)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="5"
                    min="0"
                    required
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full pl-8 pr-3.5 py-2.5 rounded-xl bg-[#0a1628] border border-[#3b82f6]/30 text-white text-sm focus:outline-none focus:border-[#60a5fa]"
                  />
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-[#f0b429]">Bs</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#c8deff] mb-1">Descripción / Detalles</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detalles del corte, productos incluidos..."
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
                  {editingService ? 'Guardar Cambios' : 'Crear Servicio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
