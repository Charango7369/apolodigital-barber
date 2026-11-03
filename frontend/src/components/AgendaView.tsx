import React, { useState, useEffect, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Phone,
  MessageCircle,
  Scissors,
  CheckCircle2,
  DollarSign,
  AlertCircle,
  Printer,
  Globe,
  Search,
  Filter,
  Sparkles,
  Calendar,
  XCircle,
  Plus
} from 'lucide-react';
import { Appointment, Barber, AppointmentStatus, User } from '../types';

interface AgendaViewProps {
  appointments: Appointment[];
  barbers: Barber[];
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  selectedBarberId: string;
  setSelectedBarberId: (id: string) => void;
  currentUser?: User | null;
  onStatusChange: (id: string, status: AppointmentStatus) => void;
  onOpenCheckout: (appointment: Appointment) => void;
  onNewAppointmentAtSlot: (time: string, barberId?: string) => void;
  onDeleteAppointment: (id: string) => void;
}

// Helpers
const timeToMinutes = (timeStr: string): number => {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

const minutesToTime = (min: number): string => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

export const AgendaView: React.FC<AgendaViewProps> = ({
  appointments,
  barbers,
  selectedDate,
  setSelectedDate,
  selectedBarberId,
  setSelectedBarberId,
  currentUser,
  onStatusChange,
  onOpenCheckout,
  onNewAppointmentAtSlot,
  onDeleteAppointment,
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [clientSearch, setClientSearch] = useState<string>('');
  const [announcement, setAnnouncement] = useState<string>('');

  // SoD: Si el usuario es barbero, forzar su sillón asignado
  useEffect(() => {
    if (currentUser?.role === 'barber' && currentUser.barber_id) {
      setSelectedBarberId(currentUser.barber_id);
    }
  }, [currentUser, setSelectedBarberId]);

  const formatDateYMD = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        return;
      }
      if (e.key === 't' || e.key === 'T') {
        setSelectedDate(formatDateYMD(new Date()));
        announce('Cambiado al día de hoy');
      } else if (e.key === 'n' || e.key === 'N') {
        onNewAppointmentAtSlot('10:00');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setSelectedDate, onNewAppointmentAtSlot]);

  const announce = (msg: string) => {
    setAnnouncement(msg);
    setTimeout(() => setAnnouncement(''), 3000);
  };

  // Date controls
  const handlePrevDay = () => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() - 1);
    setSelectedDate(formatDateYMD(d));
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() + 1);
    setSelectedDate(formatDateYMD(d));
  };

  const handleToday = () => {
    setSelectedDate(formatDateYMD(new Date()));
  };

  // Formatted date for header (Print & Screen)
  const fullDateFormatted = useMemo(() => {
    try {
      const d = new Date(selectedDate + 'T00:00:00');
      return new Intl.DateTimeFormat('es-BO', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(d);
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  // Filter Barbers
  const filteredBarbers = useMemo(() => {
    if (selectedBarberId === 'all') return barbers;
    return barbers.filter((b) => b.id === selectedBarberId);
  }, [barbers, selectedBarberId]);

  // Filter Appointments by status & search
  const filteredAppointments = useMemo(() => {
    return appointments.filter((apt) => {
      if (statusFilter !== 'all' && apt.status !== statusFilter) return false;
      if (
        clientSearch.trim() &&
        !apt.client_name.toLowerCase().includes(clientSearch.toLowerCase()) &&
        !apt.service_name.toLowerCase().includes(clientSearch.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [appointments, statusFilter, clientSearch]);

  // Gap Aggregation: calculate contiguous free blocks for a barber
  const calculateTimelineBlocks = (barberId: string) => {
    const barberApts = filteredAppointments
      .filter((a) => a.barber_id === barberId && a.status !== 'cancelled')
      .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));

    const openMin = timeToMinutes('08:00');
    const closeMin = timeToMinutes('21:00');

    type Block =
      | { type: 'appointment'; data: Appointment; start: number; end: number; duration: number }
      | { type: 'gap'; start: number; end: number; duration: number };

    const blocks: Block[] = [];
    let currentMin = openMin;

    for (const apt of barberApts) {
      const aptStart = timeToMinutes(apt.time);
      const aptDuration = Math.max(15, apt.duration_minutes || 30);
      const aptEnd = aptStart + aptDuration;

      // If there's a free gap before this appointment
      if (aptStart > currentMin) {
        blocks.push({
          type: 'gap',
          start: currentMin,
          end: aptStart,
          duration: aptStart - currentMin,
        });
      }

      blocks.push({
        type: 'appointment',
        data: apt,
        start: aptStart,
        end: aptEnd,
        duration: aptDuration,
      });

      currentMin = Math.max(currentMin, aptEnd);
    }

    // Remaining gap until closing
    if (currentMin < closeMin) {
      blocks.push({
        type: 'gap',
        start: currentMin,
        end: closeMin,
        duration: closeMin - currentMin,
      });
    }

    return blocks;
  };

  // WCAG Accessible Badges (Icon + Explicit Text + Color)
  const renderStatusBadge = (status: AppointmentStatus) => {
    switch (status) {
      case 'in_progress':
        return (
          <span
            role="status"
            className="px-2.5 py-1 rounded-md text-xs font-black bg-[#f0b429]/20 text-[#fbbf24] border border-[#f0b429] flex items-center gap-1.5 shadow-sm"
          >
            <span className="w-2 h-2 rounded-full bg-[#f0b429] animate-ping" aria-hidden="true" />
            <Scissors className="w-3.5 h-3.5" aria-hidden="true" />
            <span>EN SILLÓN</span>
          </span>
        );
      case 'completed':
        return (
          <span
            role="status"
            className="px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500 flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
            <span>COMPLETADA</span>
          </span>
        );
      case 'cancelled':
        return (
          <span
            role="status"
            className="px-2.5 py-1 rounded-md text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500 flex items-center gap-1.5"
          >
            <XCircle className="w-3.5 h-3.5 text-rose-400" aria-hidden="true" />
            <span>CANCELADA</span>
          </span>
        );
      case 'no_show':
        return (
          <span
            role="status"
            className="px-2.5 py-1 rounded-md text-xs font-bold bg-gray-500/20 text-gray-300 border border-gray-400 flex items-center gap-1.5"
          >
            <AlertCircle className="w-3.5 h-3.5 text-gray-400" aria-hidden="true" />
            <span>NO ASISTIÓ</span>
          </span>
        );
      default:
        return (
          <span
            role="status"
            className="px-2.5 py-1 rounded-md text-xs font-bold bg-[#1a4fd6]/25 text-[#93c5fd] border border-[#60a5fa] flex items-center gap-1.5"
          >
            <Clock className="w-3.5 h-3.5 text-[#60a5fa]" aria-hidden="true" />
            <span>CONFIRMADA</span>
          </span>
        );
    }
  };

  const sendWhatsAppReminder = (apt: Appointment) => {
    const cleanPhone = apt.client_phone.replace(/\D/g, '');
    const phoneWithCode = cleanPhone.startsWith('591') ? cleanPhone : `591${cleanPhone}`;
    const text = encodeURIComponent(
      `Hola *${apt.client_name}*! Te recordamos tu cita de *${apt.service_name}* con *${apt.barber_name}* para hoy a las *${apt.time}* en *ApoloDigital Barber*. Te esperamos puntual en el sillón 💈`
    );
    window.open(`https://wa.me/${phoneWithCode}?text=${text}`, '_blank');
  };

  return (
    <section className="space-y-4" aria-label="Calendario de turnos de barbería">
      {/* Live Region for Screen Readers */}
      <div role="status" aria-live="polite" className="sr-only">
        {announcement}
      </div>

      {/* 1. Persistent Print-Ready Header */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#0d2347]/90 border border-[#3b82f6]/30 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-heading font-extrabold text-xs text-[#60a5fa] uppercase tracking-wider">
              Control Operativo de Agenda
            </span>
            <span className="text-[#94a3b8]">•</span>
            <span className="text-xs text-[#fbbf24] flex items-center gap-1">
              <Globe className="w-3 h-3" />
              Zona Horaria: America/La_Paz (GMT-4 / Bolivia)
            </span>
          </div>

          <h2 className="font-heading font-black text-xl sm:text-2xl text-white capitalize flex items-center gap-2">
            <Calendar className="w-6 h-6 text-[#f0b429]" aria-hidden="true" />
            {fullDateFormatted}
          </h2>
        </div>

        {/* Date Selector & Print Button */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#0a1628] border border-[#3b82f6]/30">
            <button
              onClick={handlePrevDay}
              className="p-2 rounded-lg text-[#c8deff] hover:text-white hover:bg-[#1a4fd6]/30 focus-visible:ring-2 focus-visible:ring-[#f0b429]"
              aria-label="Ir al día anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              aria-label="Seleccionar fecha de la agenda"
              className="px-2 py-1 rounded-lg bg-transparent text-white text-xs font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f0b429]"
            />
            <button
              onClick={handleNextDay}
              className="p-2 rounded-lg text-[#c8deff] hover:text-white hover:bg-[#1a4fd6]/30 focus-visible:ring-2 focus-visible:ring-[#f0b429]"
              aria-label="Ir al día siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleToday}
            className="px-3.5 py-2 rounded-xl bg-[#1a4fd6]/40 hover:bg-[#1a4fd6]/70 text-xs font-bold text-[#93c5fd] border border-[#3b82f6]/40 transition-all focus-visible:ring-2 focus-visible:ring-[#f0b429]"
          >
            Hoy [T]
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#102a54] hover:bg-[#1a4fd6]/40 text-xs font-bold text-white border border-[#3b82f6]/30 shadow transition-all focus-visible:ring-2 focus-visible:ring-[#f0b429]"
            title="Imprimir hoja de ruta del día"
            aria-label="Imprimir hoja de citas del día"
          >
            <Printer className="w-4 h-4 text-[#f0b429]" aria-hidden="true" />
            <span>Imprimir</span>
          </button>
        </div>
      </div>

      {/* 2. Reactive Filter Toolbar */}
      <div className="p-3.5 rounded-2xl bg-[#0d2347]/70 border border-[#3b82f6]/20 flex flex-wrap items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
          <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-[#94a3b8]" aria-hidden="true" />
          <input
            type="text"
            value={clientSearch}
            onChange={(e) => setClientSearch(e.target.value)}
            placeholder="Buscar por cliente o servicio..."
            aria-label="Buscar cita por cliente o servicio"
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#0a1628] border border-[#3b82f6]/30 text-white text-xs placeholder-[#94a3b8] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f0b429]"
          />
        </div>

        {/* Barber Filter */}
        <div className="flex items-center gap-2">
          <label htmlFor="barber-select-filter" className="text-xs text-[#c8deff] font-medium hidden sm:inline">
            Barbero:
          </label>
          <select
            id="barber-select-filter"
            value={selectedBarberId}
            disabled={currentUser?.role === 'barber'}
            onChange={(e) => setSelectedBarberId(e.target.value)}
            aria-label="Filtrar por profesional"
            className={`px-3 py-1.5 rounded-xl bg-[#0a1628] border border-[#3b82f6]/30 text-white text-xs font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f0b429] ${
              currentUser?.role === 'barber' ? 'opacity-70 cursor-not-allowed bg-emerald-950/40 border-emerald-500/40 text-emerald-300' : ''
            }`}
          >
            {currentUser?.role !== 'barber' && (
              <option value="all">💈 Todos los Sillones ({barbers.length})</option>
            )}
            {barbers.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.nickname || b.specialty})
              </option>
            ))}
          </select>
        </div>

        {/* Status Chips Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1" role="group" aria-label="Filtro por estado de cita">
          {[
            { id: 'all', label: 'Todos' },
            { id: 'confirmed', label: 'Confirmadas' },
            { id: 'in_progress', label: 'En Sillón' },
            { id: 'completed', label: 'Completadas' },
            { id: 'cancelled', label: 'Canceladas' },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setStatusFilter(st.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all border ${
                statusFilter === st.id
                  ? 'bg-[#1a4fd6] text-white border-[#60a5fa] shadow-sm'
                  : 'bg-[#0a1628]/60 text-[#94a3b8] border-[#3b82f6]/20 hover:text-white'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* SoD Notice Banner for Barbers */}
      {currentUser?.role === 'barber' && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5">
          <Scissors className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>
            <strong>Sillón Personal de {currentUser.full_name}:</strong> Por principio de segregación de funciones (SoD), estás visualizando únicamente tu agenda operativa asignada.
          </span>
        </div>
      )}

      {/* 3. Multi-Barber Timeline Columns */}
      <div className="overflow-x-auto pb-4">
        <div
          className="grid gap-4 min-w-[760px]"
          style={{
            gridTemplateColumns: `repeat(${Math.max(1, filteredBarbers.length)}, minmax(320px, 1fr))`,
          }}
        >
          {filteredBarbers.map((barber) => {
            const blocks = calculateTimelineBlocks(barber.id);
            const activeAppointmentsCount = filteredAppointments.filter(
              (a) => a.barber_id === barber.id && a.status !== 'cancelled'
            ).length;

            return (
              <div
                key={barber.id}
                className="rounded-2xl bg-[#0d2347]/60 border border-[#3b82f6]/25 p-3.5 flex flex-col h-full shadow-lg"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#3b82f6]/20">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl overflow-hidden border-2 border-[#f0b429]/60 bg-[#0a1628] shrink-0">
                      <img
                        src={barber.photo_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                        alt={`Foto de ${barber.name}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <h3 className="font-heading font-extrabold text-sm text-white">{barber.name}</h3>
                      <p className="text-[11px] text-[#fbbf24] font-semibold">{barber.nickname || barber.specialty}</p>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#102a54] text-[#93c5fd] border border-[#3b82f6]/30">
                    {activeAppointmentsCount} {activeAppointmentsCount === 1 ? 'cita' : 'citas'}
                  </span>
                </div>

                {/* Timeline Content */}
                <div className="space-y-3 flex-1" role="feed" aria-label={`Citas del día para ${barber.name}`}>
                  {blocks.length === 0 ? (
                    <div className="p-8 text-center text-xs text-[#94a3b8] border border-dashed border-[#3b82f6]/20 rounded-xl">
                      Sin citas registradas
                    </div>
                  ) : (
                    blocks.map((block, idx) => {
                      // Unified Gap Block
                      if (block.type === 'gap') {
                        const durationHours = (block.duration / 60).toFixed(1).replace('.0', '');
                        const startTimeStr = minutesToTime(block.start);
                        const endTimeStr = minutesToTime(block.end);

                        return (
                          <button
                            key={`gap-${idx}-${block.start}`}
                            onClick={() => onNewAppointmentAtSlot(startTimeStr, barber.id)}
                            className="w-full p-3 rounded-xl border border-dashed border-emerald-500/40 bg-emerald-500/5 hover:bg-emerald-500/15 text-left transition-all group flex items-center justify-between gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0b429]"
                            aria-label={`Hueco disponible de ${startTimeStr} a ${endTimeStr} para ${barber.name}. Pulse Enter para agendar cita.`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-emerald-400 group-hover:animate-ping" aria-hidden="true" />
                              <div>
                                <div className="text-xs font-extrabold text-emerald-300">
                                  Hueco disponible: {startTimeStr} – {endTimeStr}
                                </div>
                                <div className="text-[11px] text-[#94a3b8]">
                                  Espacio libre continuo de {durationHours}h ({block.duration} min)
                                </div>
                              </div>
                            </div>

                            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold text-[11px] border border-emerald-500/30 group-hover:scale-105 transition-transform flex items-center gap-1">
                              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>Agendar</span>
                            </span>
                          </button>
                        );
                      }

                      // Appointment Card with Proportional Height
                      const apt = block.data;
                      const duration = block.duration;
                      // Height proportional: 30min -> ~100px, 60min -> ~160px, 90min -> ~220px
                      const cardMinHeight = Math.max(90, Math.min(260, 70 + (duration / 30) * 45));

                      return (
                        <article
                          key={apt.id}
                          tabIndex={0}
                          style={{ minHeight: `${cardMinHeight}px` }}
                          aria-label={`Cita de ${apt.client_name} para ${apt.service_name} a las ${apt.time}, duración ${duration} minutos. Estado: ${apt.status}`}
                          className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0b429] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a1628] ${
                            apt.status === 'in_progress'
                              ? 'bg-gradient-to-br from-[#102a54] to-[#1a386b] border-2 border-[#f0b429] shadow-lg shadow-[#f0b429]/20'
                              : apt.status === 'completed'
                              ? 'bg-[#0a1628]/80 border-emerald-500/50'
                              : apt.status === 'cancelled'
                              ? 'bg-[#0a1628]/40 border-rose-500/30 opacity-70'
                              : 'bg-[#102a54]/90 border-[#3b82f6]/40 hover:border-[#60a5fa]'
                          }`}
                        >
                          <div>
                            {/* Top Badge & Time */}
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex items-center gap-1.5 text-xs font-bold text-[#93c5fd]">
                                <Clock className="w-3.5 h-3.5 text-[#f0b429]" aria-hidden="true" />
                                <span>{apt.time} – {minutesToTime(timeToMinutes(apt.time) + duration)}</span>
                                <span className="text-[11px] font-medium text-[#c8deff]">
                                  ({duration} min)
                                </span>
                              </div>
                              {renderStatusBadge(apt.status)}
                            </div>

                            {/* Client & Service */}
                            <div className="text-sm font-extrabold text-white mb-1 tracking-tight">
                              {apt.client_name}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-[#c8deff] mb-2 font-medium">
                              <Scissors className="w-3.5 h-3.5 text-[#fbbf24] shrink-0" aria-hidden="true" />
                              <span className="truncate">{apt.service_name}</span>
                              <span className="font-extrabold text-[#f0b429] ml-auto shrink-0">
                                {apt.price} Bs.
                              </span>
                            </div>

                            {/* Client Note */}
                            {apt.notes && (
                              <p className="text-[11px] text-[#c8deff] italic bg-[#0a1628]/80 p-2 rounded-lg mb-2 border border-[#3b82f6]/15 line-clamp-2">
                                "{apt.notes}"
                              </p>
                            )}
                          </div>

                          {/* Action Buttons with High Contrast */}
                          <div className="flex items-center justify-between gap-1.5 pt-2.5 border-t border-[#3b82f6]/20">
                            {/* WhatsApp Button */}
                            <button
                              onClick={() => sendWhatsAppReminder(apt)}
                              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 text-xs font-bold border border-emerald-500/50 transition-all focus-visible:ring-2 focus-visible:ring-[#f0b429]"
                              aria-label={`Enviar mensaje de recordatorio WhatsApp a ${apt.client_name}`}
                            >
                              <MessageCircle className="w-3.5 h-3.5" aria-hidden="true" />
                              <span className="hidden sm:inline">WhatsApp</span>
                            </button>

                            {/* Status State-Machine Controls */}
                            <div className="flex items-center gap-1.5">
                              {apt.status === 'confirmed' && (
                                <button
                                  onClick={() => {
                                    onStatusChange(apt.id, 'in_progress');
                                    announce(`Cita de ${apt.client_name} pasada a sillón`);
                                  }}
                                  className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#f0b429] to-[#fbbf24] text-[#0a1628] text-xs font-black shadow-md hover:brightness-110 transition-all focus-visible:ring-2 focus-visible:ring-white"
                                >
                                  A Sillón
                                </button>
                              )}

                              {apt.status === 'in_progress' && (
                                <button
                                  onClick={() => onOpenCheckout(apt)}
                                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 hover:brightness-110 text-white text-xs font-black shadow-md shadow-emerald-500/25 transition-all focus-visible:ring-2 focus-visible:ring-white"
                                >
                                  <DollarSign className="w-3.5 h-3.5" aria-hidden="true" />
                                  <span>Cobrar</span>
                                </button>
                              )}

                              {apt.status === 'completed' && (
                                <button
                                  onClick={() => onOpenCheckout(apt)}
                                  className="px-2.5 py-1.5 rounded-lg bg-[#102a54] hover:bg-[#1a4fd6]/40 text-[#93c5fd] text-xs font-bold border border-[#3b82f6]/30"
                                >
                                  Ver Recibo
                                </button>
                              )}

                              {apt.status !== 'completed' && apt.status !== 'cancelled' && (
                                <button
                                  onClick={() => {
                                    if (confirm(`¿Cancelar la cita de ${apt.client_name}?`)) {
                                      onStatusChange(apt.id, 'cancelled');
                                      announce(`Cita de ${apt.client_name} cancelada`);
                                    }
                                  }}
                                  className="p-1.5 rounded-lg hover:bg-rose-500/20 text-[#94a3b8] hover:text-rose-400 text-xs focus-visible:ring-2 focus-visible:ring-rose-400"
                                  title="Cancelar cita"
                                  aria-label={`Cancelar cita de ${apt.client_name}`}
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        </article>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
