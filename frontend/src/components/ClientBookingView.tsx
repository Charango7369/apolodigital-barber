import React, { useState, useEffect } from 'react';
import {
  Scissors,
  Sparkles,
  Calendar,
  Clock,
  User,
  Phone,
  CheckCircle2,
  ChevronRight,
  ArrowLeft,
  MessageCircle,
  MapPin,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Service, Barber, Appointment } from '../types';
import { api } from '../services/api';

interface ClientBookingViewProps {
  services: Service[];
  barbers: Barber[];
  onBookAppointment: (data: Partial<Appointment>) => Promise<Appointment>;
  tenantId?: string;
  slug?: string;
  organizationName?: string;
  organizationAddress?: string;
  organizationPhone?: string;
  currency?: string;
}

export const ClientBookingView: React.FC<ClientBookingViewProps> = ({
  services,
  barbers,
  onBookAppointment,
  tenantId,
  slug,
  organizationName,
  organizationAddress,
  organizationPhone,
  currency = 'Bs.',
}) => {
  const [step, setStep] = useState<number>(1);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null);
  const [bookingDate, setBookingDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [bookingTime, setBookingTime] = useState<string>('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('+591 ');
  const [clientNotes, setClientNotes] = useState('');

  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState<boolean>(false);
  const [slotError, setSlotError] = useState<string>('');

  const [confirmedBooking, setConfirmedBooking] = useState<Appointment | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>('');

  // Fetch real available slots when entering Step 3 or when date/barber changes
  useEffect(() => {
    if (step === 3 && selectedService) {
      const fetchSlots = async () => {
        setIsLoadingSlots(true);
        setSlotError('');
        try {
          const res = await api.getAvailability(
            bookingDate,
            selectedService.id,
            selectedBarber ? selectedBarber.id : undefined,
            tenantId,
            slug
          );
          setAvailableSlots(res.available_slots);
          if (res.available_slots.length > 0) {
            setBookingTime(res.available_slots[0]);
          } else {
            setBookingTime('');
          }
        } catch (err: any) {
          setSlotError(err.message || 'Error al consultar disponibilidad');
        } finally {
          setIsLoadingSlots(false);
        }
      };
      fetchSlots();
    }
  }, [step, bookingDate, selectedService, selectedBarber]);

  const handleServiceSelect = (srv: Service) => {
    setSelectedService(srv);
    setStep(2);
  };

  const handleBarberSelect = (barber: Barber | null) => {
    setSelectedBarber(barber);
    setStep(3);
  };

  const handleDateTimeNext = () => {
    if (!bookingTime) return;
    setStep(4);
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService || !clientName.trim() || !clientPhone.trim()) return;

    setIsSubmitting(true);
    try {
      const barber = selectedBarber || barbers[0];
      const res = await onBookAppointment({
        tenant_id: tenantId,
        client_name: clientName,
        client_phone: clientPhone,
        barber_id: barber.id,
        barber_name: barber.name,
        service_id: selectedService.id,
        service_name: selectedService.name,
        date: bookingDate,
        time: bookingTime,
        duration_minutes: selectedService.duration_minutes,
        price: selectedService.price,
        status: 'confirmed',
        notes: clientNotes ? `Reserva Online: ${clientNotes}` : 'Reserva Online desde Portal Cliente',
      });

      setConfirmedBooking(res);
      setStep(5);

      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.5 },
        colors: ['#f0b429', '#1a4fd6', '#60a5fa', '#ffffff'],
      });
    } catch (err: any) {
      console.error(err);
      setSubmitError(err.message || 'Error al procesar la reserva. Por favor intenta con otro horario.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openWhatsAppConfirmation = () => {
    if (!confirmedBooking) return;
    const destPhone = organizationPhone ? organizationPhone.replace(/\D/g, '') : '59171234567';
    const phoneWithCode = destPhone.startsWith('591') ? destPhone : `591${destPhone}`;
    const orgTitle = organizationName || 'ApoloDigital Barber';
    const text = encodeURIComponent(
      `¡Hola *${orgTitle}*! Acabo de reservar mi cita para *${confirmedBooking.service_name}* con *${confirmedBooking.barber_name}* el día *${confirmedBooking.date}* a las *${confirmedBooking.time}*. Mi nombre es *${confirmedBooking.client_name}*. ¡Nos vemos pronto! 💈✂️`
    );
    window.open(`https://wa.me/${phoneWithCode}?text=${text}`, '_blank');
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Client Header & Branding */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#102a54] border border-[#3b82f6]/30 text-xs text-[#60a5fa]">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Agenda Abierta • Reserva en 1 minuto</span>
        </div>

        <h1 className="font-heading font-black text-3xl md:text-4xl text-white tracking-tight">
          {organizationName ? (
            <span>{organizationName}</span>
          ) : (
            <>Apolo<span className="text-[#60a5fa]">Digital</span> <span className="text-[#f0b429]">BARBER</span></>
          )}
        </h1>
        <p className="text-xs text-[#c8deff] max-w-md mx-auto">
          Reserva tu cita con los mejores estilistas y barberos profesionales. Sin llamadas ni esperas.
        </p>

        <div className="flex items-center justify-center gap-2 text-xs text-[#94a3b8] pt-1">
          <MapPin className="w-3.5 h-3.5 text-[#f0b429]" />
          <span>{organizationAddress || 'Sopocachi, La Paz, Bolivia'} • Horario: Lun a Sáb 08:00 - 21:00</span>
        </div>
      </div>

      {/* Booking Steps Progress */}
      {step < 5 && (
        <div className="flex items-center justify-center gap-2 text-xs font-semibold">
          {[
            { num: 1, label: 'Servicio' },
            { num: 2, label: 'Barbero' },
            { num: 3, label: 'Horario' },
            { num: 4, label: 'Tus Datos' },
          ].map((s) => (
            <div key={s.num} className="flex items-center gap-2">
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-all ${
                  step === s.num
                    ? 'bg-[#f0b429] text-[#0a1628] shadow-md shadow-[#f0b429]/30'
                    : step > s.num
                    ? 'bg-emerald-500 text-white'
                    : 'bg-[#102a54] text-[#94a3b8]'
                }`}
              >
                {step > s.num ? '✓' : s.num}
              </span>
              <span
                className={`hidden sm:inline ${
                  step === s.num ? 'text-white font-bold' : 'text-[#94a3b8]'
                }`}
              >
                {s.label}
              </span>
              {s.num < 4 && <ChevronRight className="w-3.5 h-3.5 text-[#3b82f6]/40" />}
            </div>
          ))}
        </div>
      )}

      {/* Step 1: Select Service */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="font-heading font-extrabold text-lg text-white">
            1. Elige tu Servicio de Barbería
          </h2>

          <div className="space-y-3">
            {services.map((srv) => (
              <div
                key={srv.id}
                onClick={() => handleServiceSelect(srv)}
                className="p-4 rounded-2xl bg-[#0d2347]/70 border border-[#3b82f6]/20 hover:border-[#f0b429] hover:bg-[#102a54] cursor-pointer transition-all flex items-center justify-between gap-4 group shadow-md"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-heading font-bold text-base text-white group-hover:text-[#60a5fa] transition-colors">
                      {srv.name}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#0a1628] text-[#60a5fa] border border-[#3b82f6]/30">
                      {srv.duration_minutes} min
                    </span>
                  </div>
                  <p className="text-xs text-[#94a3b8] line-clamp-1">{srv.description}</p>
                </div>

                <div className="text-right shrink-0">
                  <div className="font-heading font-extrabold text-xl text-[#f0b429]">
                    {srv.price} <span className="text-xs font-normal">Bs.</span>
                  </div>
                  <span className="text-[11px] text-[#60a5fa] font-medium group-hover:underline">
                    Seleccionar →
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Select Barber */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-1 text-xs text-[#94a3b8] hover:text-white"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Volver a servicios</span>
            </button>
            <span className="text-xs text-[#f0b429] font-medium">
              Servicio: {selectedService?.name} ({selectedService?.price} Bs.)
            </span>
          </div>

          <h2 className="font-heading font-extrabold text-lg text-white">
            2. Elige tu Barbero de Confianza
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Any barber option */}
            <div
              onClick={() => handleBarberSelect(null)}
              className="p-4 rounded-2xl bg-[#0d2347]/70 border border-[#3b82f6]/20 hover:border-[#f0b429] cursor-pointer transition-all flex items-center gap-3.5 group shadow"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1a4fd6] to-[#0d2347] border border-[#3b82f6]/40 flex items-center justify-center shrink-0 text-[#f0b429]">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <div className="font-heading font-bold text-sm text-white group-hover:text-[#60a5fa]">
                  Cualquier Barbero
                </div>
                <div className="text-xs text-[#94a3b8]">Primer sillón disponible</div>
              </div>
            </div>

            {/* Individual Barbers */}
            {barbers.map((barber) => (
              <div
                key={barber.id}
                onClick={() => handleBarberSelect(barber)}
                className="p-4 rounded-2xl bg-[#0d2347]/70 border border-[#3b82f6]/20 hover:border-[#f0b429] cursor-pointer transition-all flex items-center gap-3.5 group shadow"
              >
                <div className="w-12 h-12 rounded-xl overflow-hidden border border-[#f0b429]/40 shrink-0">
                  <img
                    src={barber.photo_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                    alt={barber.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <div className="font-heading font-bold text-sm text-white group-hover:text-[#60a5fa]">
                    {barber.name}
                  </div>
                  <div className="text-xs text-[#f0b429]">{barber.nickname || barber.specialty}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 3: Select Date & Time */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setStep(2)}
              className="flex items-center gap-1 text-xs text-[#94a3b8] hover:text-white"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Volver a barberos</span>
            </button>
            <span className="text-xs text-[#60a5fa] font-medium">
              Con: {selectedBarber ? selectedBarber.name : 'Cualquier barbero'}
            </span>
          </div>

          <h2 className="font-heading font-extrabold text-lg text-white">
            3. Selecciona la Fecha y Horario
          </h2>

          <div className="p-4 rounded-2xl bg-[#0d2347]/70 border border-[#3b82f6]/20 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#c8deff] mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#f0b429]" />
                Fecha de la cita
              </label>
              <input
                type="date"
                min={new Date().toISOString().split('T')[0]}
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[#0a1628] border border-[#3b82f6]/30 text-white text-sm focus:outline-none focus:border-[#60a5fa]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-[#c8deff] flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#f0b429]" />
                  <span>Horarios Disponibles (Sin Solapamiento)</span>
                </label>
                <span className="text-[11px] text-[#94a3b8]">
                  Duración: <strong className="text-[#f0b429]">{selectedService?.duration_minutes} min</strong>
                </span>
              </div>

              {isLoadingSlots ? (
                <div className="p-8 text-center bg-[#0a1628]/60 rounded-xl border border-[#3b82f6]/20 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-6 h-6 text-[#f0b429] animate-spin" />
                  <span className="text-xs text-[#94a3b8]">Verificando agenda y disponibilidad en tiempo real...</span>
                </div>
              ) : slotError ? (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
                  {slotError}
                </div>
              ) : availableSlots.length === 0 ? (
                <div className="p-6 text-center bg-[#0a1628]/60 rounded-xl border border-amber-500/30 text-xs space-y-2">
                  <AlertTriangle className="w-6 h-6 text-[#f0b429] mx-auto" />
                  <div className="font-bold text-white">No hay horarios libres para esta fecha</div>
                  <p className="text-[#94a3b8] max-w-sm mx-auto">
                    El barbero tiene su agenda completa o no atiende en el horario seleccionado. Prueba con otra fecha o selecciona "Cualquier Barbero".
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-56 overflow-y-auto pr-1">
                  {availableSlots.map((time) => (
                    <button
                      key={time}
                      type="button"
                      onClick={() => setBookingTime(time)}
                      className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                        bookingTime === time
                          ? 'bg-[#f0b429] text-[#0a1628] border-[#fbbf24] shadow-lg shadow-[#f0b429]/25 scale-105'
                          : 'bg-[#102a54] text-[#c8deff] border-[#3b82f6]/20 hover:text-white hover:border-[#60a5fa]'
                      }`}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleDateTimeNext}
            disabled={!bookingTime || availableSlots.length === 0}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[#1a4fd6] to-[#2563eb] disabled:opacity-40 text-white font-bold text-sm shadow-lg shadow-[#1a4fd6]/30 transition-all"
          >
            {bookingTime ? `Continuar con el horario ${bookingTime} →` : 'Selecciona un horario libre'}
          </button>
        </div>
      )}

      {/* Step 4: Client Info */}
      {step === 4 && (
        <div className="space-y-4">
          <button
            onClick={() => setStep(3)}
            className="flex items-center gap-1 text-xs text-[#94a3b8] hover:text-white"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Modificar horario</span>
          </button>

          <h2 className="font-heading font-extrabold text-lg text-white">
            4. Ingresa tus Datos de Contacto
          </h2>

          {/* Booking Summary Box */}
          <div className="p-4 rounded-xl bg-[#0a1628] border border-[#f0b429]/30 text-xs flex justify-between items-center">
            <div>
              <div className="font-bold text-white text-sm">{selectedService?.name}</div>
              <div className="text-[#94a3b8]">
                {bookingDate} a las {bookingTime} • {selectedBarber ? selectedBarber.name : 'Cualquier barbero'}
              </div>
            </div>
            <div className="font-heading font-extrabold text-xl text-[#f0b429]">
              {selectedService?.price} Bs.
            </div>
          </div>

          <form onSubmit={handleFinalSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#c8deff] mb-1">
                Tu Nombre y Apellido
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-3.5 text-[#94a3b8]" />
                <input
                  type="text"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Ej: Marcelo Suárez"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0d2347] border border-[#3b82f6]/30 text-white text-sm focus:outline-none focus:border-[#60a5fa]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#c8deff] mb-1">
                Número de Celular / WhatsApp (para recordatorio)
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3.5 top-3.5 text-[#94a3b8]" />
                <input
                  type="text"
                  required
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="+591 7XXXXXXX"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0d2347] border border-[#3b82f6]/30 text-white text-sm focus:outline-none focus:border-[#60a5fa]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#c8deff] mb-1">
                Detalles de tu corte / Preferencias (Opcional)
              </label>
              <textarea
                rows={2}
                value={clientNotes}
                onChange={(e) => setClientNotes(e.target.value)}
                placeholder="Ej: Fade en 1.5 alto, navaja en contornos..."
                className="w-full px-3.5 py-2 rounded-xl bg-[#0d2347] border border-[#3b82f6]/30 text-white text-sm focus:outline-none focus:border-[#60a5fa]"
              />
            </div>

            {submitError && (
              <div className="p-3.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !clientName.trim()}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#f0b429] via-[#fbbf24] to-[#f59e0b] hover:brightness-110 text-[#0a1628] font-heading font-black text-sm shadow-xl shadow-[#f0b429]/30 transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Confirmando...' : 'Confirmar Mi Turno en la Barbería'}</span>
            </button>
          </form>
        </div>
      )}

      {/* Step 5: Confirmed Booking Screen */}
      {step === 5 && confirmedBooking && (
        <div className="p-6 md:p-8 rounded-2xl bg-[#0d2347] border-2 border-[#f0b429]/50 shadow-2xl text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-[#0a1628] border-2 border-[#f0b429] mx-auto flex items-center justify-center text-[#f0b429]">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <h2 className="font-heading font-black text-2xl md:text-3xl text-white">
            ¡Tu Turno Está Confirmado!
          </h2>
          <p className="text-xs text-[#c8deff] max-w-sm mx-auto">
            Te hemos asignado el sillón en ApoloDigital Barber. ¡Prepárate para lucir tu mejor versión!
          </p>

          <div className="p-4 rounded-xl bg-[#0a1628] border border-[#3b82f6]/20 text-left space-y-2.5 text-xs max-w-md mx-auto">
            <div className="flex justify-between">
              <span className="text-[#94a3b8]">Servicio:</span>
              <span className="font-bold text-white">{confirmedBooking.service_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#94a3b8]">Barbero:</span>
              <span className="font-semibold text-[#60a5fa]">{confirmedBooking.barber_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#94a3b8]">Fecha & Hora:</span>
              <span className="font-bold text-[#f0b429]">
                {confirmedBooking.date} a las {confirmedBooking.time}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#94a3b8]">Precio estimado:</span>
              <span className="font-bold text-white">{confirmedBooking.price} Bs.</span>
            </div>
          </div>

          <div className="space-y-2.5 pt-2 max-w-md mx-auto">
            <button
              onClick={openWhatsAppConfirmation}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-lg shadow-emerald-500/30 transition-all"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Enviar confirmación por WhatsApp a la Barbería</span>
            </button>

            <button
              onClick={() => {
                setStep(1);
                setConfirmedBooking(null);
                setSelectedService(null);
              }}
              className="w-full py-2.5 rounded-xl bg-[#102a54] text-[#c8deff] hover:text-white text-xs font-semibold"
            >
              Hacer otra reserva
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
