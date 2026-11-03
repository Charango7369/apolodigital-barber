import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, Scissors, User, Phone, Sparkles, AlertTriangle } from 'lucide-react';
import { Service, Barber, Client, Appointment } from '../types';

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  services: Service[];
  barbers: Barber[];
  clients: Client[];
  initialDate?: string;
  initialTime?: string;
  initialBarberId?: string;
  onSave: (data: Partial<Appointment>) => Promise<void>;
}

export const AppointmentModal: React.FC<AppointmentModalProps> = ({
  isOpen,
  onClose,
  services,
  barbers,
  clients,
  initialDate,
  initialTime,
  initialBarberId,
  onSave,
}) => {
  const [clientType, setClientType] = useState<'existing' | 'new'>('new');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('+591 ');
  const [barberId, setBarberId] = useState(initialBarberId || barbers[0]?.id || '');
  const [serviceId, setServiceId] = useState(services[0]?.id || '');
  const [date, setDate] = useState(initialDate || new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(initialTime || '10:00');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (initialDate) setDate(initialDate);
    if (initialTime) setTime(initialTime);
    if (initialBarberId) setBarberId(initialBarberId);
    setErrorMsg('');
  }, [initialDate, initialTime, initialBarberId, isOpen]);

  if (!isOpen) return null;

  const handleSelectExistingClient = (cid: string) => {
    setSelectedClientId(cid);
    const c = clients.find((item) => item.id === cid);
    if (c) {
      setClientName(c.name);
      setClientPhone(c.phone);
      if (c.notes) setNotes(c.notes);
    }
  };

  const currentService = services.find((s) => s.id === serviceId) || services[0];
  const currentBarber = barbers.find((b) => b.id === barberId) || barbers[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || !clientPhone.trim()) return;

    setIsSaving(true);
    setErrorMsg('');
    try {
      await onSave({
        client_name: clientName,
        client_phone: clientPhone,
        client_id: clientType === 'existing' ? selectedClientId : undefined,
        barber_id: currentBarber.id,
        barber_name: currentBarber.name,
        service_id: currentService.id,
        service_name: currentService.name,
        date: date,
        time: time,
        duration_minutes: currentService.duration_minutes,
        price: currentService.price,
        status: 'confirmed',
        notes: notes,
      });
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Error al guardar la cita.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a1628]/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg rounded-2xl bg-[#0d2347] border border-[#3b82f6]/40 p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-[#94a3b8] hover:text-white hover:bg-[#102a54]"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="font-heading font-extrabold text-xl text-white mb-3 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-[#f0b429]" />
          Agendar Nueva Cita en Sillón
        </h3>

        {errorMsg && (
          <div className="mb-4 p-3.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-2.5 animate-in fade-in">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="font-medium leading-relaxed">{errorMsg}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Client Type switch */}
          <div className="flex items-center gap-2 p-1 rounded-xl bg-[#0a1628] border border-[#3b82f6]/25">
            <button
              type="button"
              onClick={() => setClientType('new')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                clientType === 'new'
                  ? 'bg-[#1a4fd6] text-white'
                  : 'text-[#94a3b8] hover:text-white'
              }`}
            >
              Nuevo Cliente
            </button>
            <button
              type="button"
              onClick={() => setClientType('existing')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                clientType === 'existing'
                  ? 'bg-[#1a4fd6] text-white'
                  : 'text-[#94a3b8] hover:text-white'
              }`}
            >
              Cliente del Directorio ({clients.length})
            </button>
          </div>

          {clientType === 'existing' ? (
            <div>
              <label className="block text-xs font-semibold text-[#c8deff] mb-1">
                Seleccionar Cliente Existente
              </label>
              <select
                value={selectedClientId}
                onChange={(e) => handleSelectExistingClient(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a1628] border border-[#3b82f6]/30 text-white text-sm focus:outline-none focus:border-[#60a5fa]"
              >
                <option value="">-- Buscar en directorio --</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.phone}) - {c.total_visits} visitas
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#c8deff] mb-1">
                  Nombre del Cliente
                </label>
                <input
                  type="text"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Ej: Marcelo Suárez"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a1628] border border-[#3b82f6]/30 text-white text-sm focus:outline-none focus:border-[#60a5fa]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#c8deff] mb-1">
                  Celular / WhatsApp
                </label>
                <input
                  type="text"
                  required
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="+591 7XXXXXXX"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a1628] border border-[#3b82f6]/30 text-white text-sm focus:outline-none focus:border-[#60a5fa]"
                />
              </div>
            </div>
          )}

          {/* Barber & Service selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#c8deff] mb-1 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-[#f0b429]" />
                Barbero Asignado
              </label>
              <select
                value={barberId}
                onChange={(e) => setBarberId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a1628] border border-[#3b82f6]/30 text-white text-sm focus:outline-none focus:border-[#60a5fa]"
              >
                {barbers.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.nickname || b.specialty})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#c8deff] mb-1 flex items-center gap-1">
                <Scissors className="w-3.5 h-3.5 text-[#60a5fa]" />
                Servicio a Realizar
              </label>
              <select
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a1628] border border-[#3b82f6]/30 text-white text-sm focus:outline-none focus:border-[#60a5fa]"
              >
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.price} Bs. • {s.duration_minutes}m)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date & Time selection */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#c8deff] mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#f0b429]" />
                Fecha
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a1628] border border-[#3b82f6]/30 text-white text-sm focus:outline-none focus:border-[#60a5fa]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#c8deff] mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-[#f0b429]" />
                Hora
              </label>
              <input
                type="time"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a1628] border border-[#3b82f6]/30 text-white text-sm focus:outline-none focus:border-[#60a5fa]"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-[#c8deff] mb-1">
              Notas de Corte / Estilo para el Barbero
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Fade #1 alto, navaja en contornos..."
              className="w-full px-3.5 py-2 rounded-xl bg-[#0a1628] border border-[#3b82f6]/30 text-white text-sm focus:outline-none focus:border-[#60a5fa]"
            />
          </div>

          {/* Price preview & Submit */}
          <div className="pt-2 flex items-center justify-between">
            <div>
              <span className="text-xs text-[#94a3b8]">Tarifa estimada:</span>
              <div className="font-heading font-extrabold text-lg text-[#f0b429]">
                {currentService.price} Bs.{' '}
                <span className="text-xs font-normal text-[#c8deff]">
                  ({currentService.duration_minutes} min)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-[#102a54] text-[#c8deff] hover:text-white text-xs font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#1a4fd6] to-[#2563eb] text-white text-xs font-bold shadow-lg shadow-[#1a4fd6]/30 hover:brightness-110"
              >
                {isSaving ? 'Agendando...' : 'Confirmar Cita'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
