import React, { useState } from 'react';
import { CreditCard, QrCode, Banknote, CheckCircle, Printer, Sparkles, AlertCircle, Lock, Unlock, ShieldAlert, DollarSign } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Appointment, Barber, Sale, CashShift, User } from '../types';

interface PosViewProps {
  activeAppointments: Appointment[];
  barbers: Barber[];
  sales: Sale[];
  currentShift: CashShift | null;
  isShiftOpen: boolean;
  currentUser?: User | null;
  initialAppointment?: Appointment | null;
  onOpenShift: (initialCash: number, notes?: string) => Promise<void>;
  onCloseShift: (actualCounted: number, notes?: string) => Promise<{ verdict: string; difference: number }>;
  onProcessCheckout: (data: {
    appointment_id?: string;
    client_name: string;
    barber_id: string;
    barber_name: string;
    services_total: number;
    products_total?: number;
    tip?: number;
    total: number;
    payment_method: string;
    qr_reference_code?: string;
    notes?: string;
  }) => Promise<Sale>;
}

export const PosView: React.FC<PosViewProps> = ({
  activeAppointments,
  barbers,
  sales,
  currentShift,
  isShiftOpen,
  currentUser,
  initialAppointment,
  onOpenShift,
  onCloseShift,
  onProcessCheckout,
}) => {
  const [selectedAptId, setSelectedAptId] = useState<string>(initialAppointment?.id || '');
  const [clientName, setClientName] = useState(initialAppointment?.client_name || '');
  const [selectedBarberId, setSelectedBarberId] = useState(initialAppointment?.barber_id || barbers[0]?.id || '');
  const [serviceAmount, setServiceAmount] = useState<number>(initialAppointment?.price || 50);
  const [productAmount, setProductAmount] = useState<number>(0);
  const [tipAmount, setTipAmount] = useState<number>(5);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qr_simple' | 'card'>('qr_simple');
  const [qrReferenceCode, setQrReferenceCode] = useState('');
  const [cashReceived, setCashReceived] = useState<number>(60);
  const [notes, setNotes] = useState('');

  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Shift Modals
  const [isOpenShiftModalOpen, setIsOpenShiftModalOpen] = useState(false);
  const [isCloseShiftModalOpen, setIsCloseShiftModalOpen] = useState(false);
  const [initialCashInput, setInitialCashInput] = useState<number>(200);
  const [actualCashCountedInput, setActualCashCountedInput] = useState<number>(0);
  const [shiftNotesInput, setShiftNotesInput] = useState<string>('');
  const [closeShiftVerdict, setCloseShiftVerdict] = useState<{ verdict: string; difference: number } | null>(null);

  // When selected appointment changes
  const handleAppointmentSelect = (aptId: string) => {
    setSelectedAptId(aptId);
    setErrorMsg(null);
    if (!aptId) return;
    const apt = activeAppointments.find((a) => a.id === aptId);
    if (apt) {
      setClientName(apt.client_name);
      setSelectedBarberId(apt.barber_id);
      setServiceAmount(apt.price);
      setCashReceived(apt.price + tipAmount);
    }
  };

  const currentBarber = barbers.find((b) => b.id === selectedBarberId) || barbers[0];
  const subtotal = serviceAmount + productAmount;
  const total = subtotal + tipAmount;
  const changeDue = Math.max(0, cashReceived - total);

  // Check SoD Permissions
  const isBarberUser = currentUser?.role === 'barber';

  const handleSubmitCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (isBarberUser) {
      setErrorMsg('Segregación de Funciones (SoD): Tu rol actual es Barbero. Solo Recepción o Administrador pueden cobrar.');
      return;
    }

    if (!isShiftOpen) {
      setErrorMsg('Caja Cerrada: Debe abrir un turno de caja antes de registrar cobros.');
      return;
    }

    if (paymentMethod === 'qr_simple' && !qrReferenceCode.trim()) {
      setErrorMsg('Normativa QR Simple: El Código de Autorización/Referencia bancaria es obligatorio.');
      return;
    }

    if (!clientName.trim() || total <= 0) return;

    setIsProcessing(true);
    try {
      const sale = await onProcessCheckout({
        appointment_id: selectedAptId || undefined,
        client_name: clientName,
        barber_id: currentBarber?.id || 'bar-1',
        barber_name: currentBarber?.name || 'Alex Mendoza',
        services_total: serviceAmount,
        products_total: productAmount,
        tip: tipAmount,
        total: total,
        payment_method: paymentMethod,
        qr_reference_code: paymentMethod === 'qr_simple' ? qrReferenceCode.trim() : undefined,
        notes: notes || undefined,
      });

      setCompletedSale(sale);

      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#f0b429', '#1a4fd6', '#60a5fa', '#ffffff'],
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al registrar la venta en caja.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenShiftSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onOpenShift(initialCashInput, shiftNotesInput);
      setIsOpenShiftModalOpen(false);
      setShiftNotesInput('');
    } catch (err: any) {
      alert(err.message || 'Error al abrir caja');
    }
  };

  const handleCloseShiftSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await onCloseShift(actualCashCountedInput, shiftNotesInput);
      setCloseShiftVerdict(result);
    } catch (err: any) {
      alert(err.message || 'Error al cerrar caja');
    }
  };

  const handleNewCheckout = () => {
    setCompletedSale(null);
    setSelectedAptId('');
    setClientName('');
    setServiceAmount(50);
    setProductAmount(0);
    setTipAmount(5);
    setCashReceived(60);
    setQrReferenceCode('');
    setNotes('');
    setErrorMsg(null);
  };

  return (
    <div className="space-y-6">
      {/* Caja / Shift Control Banner */}
      <div className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
        isShiftOpen
          ? 'bg-[#0d2347]/90 border-emerald-500/30'
          : 'bg-rose-950/40 border-rose-500/30'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
            isShiftOpen ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400' : 'bg-rose-500/10 border-rose-500/40 text-rose-400'
          }`}>
            {isShiftOpen ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`inline-block w-2 h-2 rounded-full ${isShiftOpen ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`}></span>
              <h3 className="font-heading font-bold text-white text-base">
                {isShiftOpen ? 'Turno de Caja Activo' : 'Caja Cerrada (Sin Turno Activo)'}
              </h3>
            </div>
            <p className="text-xs text-[#94a3b8] mt-0.5">
              {isShiftOpen
                ? `Iniciado por ${currentShift?.opened_by_name || 'Admin'} con fondo inicial de Bs. ${currentShift?.initial_cash.toFixed(2) || '0.00'}`
                : 'Se requiere iniciar sesión de caja para procesar cobros y emitir comprobantes.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isShiftOpen ? (
            <button
              onClick={() => {
                setActualCashCountedInput(0);
                setIsCloseShiftModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center gap-2 transition-all"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Cerrar Caja (Arqueo Ciego)</span>
            </button>
          ) : (
            <button
              onClick={() => setIsOpenShiftModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all"
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>Abrir Turno de Caja</span>
            </button>
          )}
        </div>
      </div>

      {/* SoD Warning for Barbers */}
      {isBarberUser && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-amber-300 text-xs">
          <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-sm text-amber-200">Segregación de Funciones (SoD) Aplicada</p>
            <p className="mt-0.5 text-amber-300/90">
              Has iniciado sesión con el rol <strong>Barbero</strong>. Por normativa de auditoría y prevención de fugas de efectivo, los profesionales no pueden cobrar sus propios servicios. El cobro debe ser realizado por Recepción.
            </p>
          </div>
        </div>
      )}

      {/* POS Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form & Selector */}
        <div className="lg:col-span-7 space-y-6">
          {completedSale ? (
            /* Completed Receipt View */
            <div className="p-6 rounded-2xl bg-[#0d2347]/90 border border-emerald-500/40 text-center space-y-5">
              <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400">
                <CheckCircle className="w-8 h-8" />
              </div>
              <div>
                <h3 className="font-heading font-extrabold text-2xl text-white">¡Cobro Registrado con Éxito!</h3>
                <p className="text-sm text-[#94a3b8] mt-1">
                  Venta <span className="font-mono text-emerald-400 font-bold">{completedSale.id}</span>
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#0a1628]/80 border border-[#3b82f6]/20 text-left space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#94a3b8]">Cliente:</span>
                  <span className="text-white font-medium">{completedSale.client_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#94a3b8]">Barbero:</span>
                  <span className="text-white font-medium">{completedSale.barber_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#94a3b8]">Método de Pago:</span>
                  <span className="text-white capitalize">{completedSale.payment_method.replace('_', ' ')}</span>
                </div>
                {completedSale.qr_reference_code && (
                  <div className="flex justify-between text-amber-300">
                    <span>Referencia QR Simple:</span>
                    <span className="font-mono font-bold">{completedSale.qr_reference_code}</span>
                  </div>
                )}
                <div className="border-t border-[#3b82f6]/20 pt-2 flex justify-between font-bold text-sm text-white">
                  <span>Total Cobrado:</span>
                  <span className="text-[#f0b429]">Bs. {completedSale.total.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2.5 rounded-xl bg-[#1a4fd6] hover:bg-[#2563eb] text-white text-xs font-semibold flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir Recibo</span>
                </button>
                <button
                  onClick={handleNewCheckout}
                  className="px-4 py-2.5 rounded-xl bg-[#0d2347] hover:bg-[#1a386b] border border-[#3b82f6]/30 text-white text-xs font-semibold"
                >
                  Nuevo Cobro
                </button>
              </div>
            </div>
          ) : (
            /* Checkout Form */
            <form onSubmit={handleSubmitCheckout} className="p-6 rounded-2xl bg-[#0d2347]/80 border border-[#3b82f6]/20 space-y-5">
              {errorMsg && (
                <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Pending Appointments Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-[#94a3b8] mb-1.5">
                  Vincular a Cita Pendiente de Cobro
                </label>
                <select
                  value={selectedAptId}
                  onChange={(e) => handleAppointmentSelect(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a1628] border border-[#3b82f6]/30 text-white text-xs focus:outline-none focus:border-[#f0b429]"
                >
                  <option value="">-- Cobro manual express (Sin cita previa) --</option>
                  {activeAppointments.map((apt) => (
                    <option key={apt.id} value={apt.id}>
                      {apt.time} - {apt.client_name} ({apt.service_name} • Bs. {apt.price}) [{apt.barber_name}]
                    </option>
                  ))}
                </select>
              </div>

              {/* Client & Barber */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#94a3b8] mb-1.5">Nombre del Cliente *</label>
                  <input
                    type="text"
                    required
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Ej. Juan Pablo Claure"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a1628] border border-[#3b82f6]/30 text-white text-xs focus:outline-none focus:border-[#f0b429]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#94a3b8] mb-1.5">Barbero que atendió *</label>
                  <select
                    value={selectedBarberId}
                    onChange={(e) => setSelectedBarberId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a1628] border border-[#3b82f6]/30 text-white text-xs focus:outline-none focus:border-[#f0b429]"
                  >
                    {barbers.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.specialty})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Amounts Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#94a3b8] mb-1.5">Total Servicios (Bs.)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={serviceAmount}
                    onChange={(e) => setServiceAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a1628] border border-[#3b82f6]/30 text-white text-xs focus:outline-none focus:border-[#f0b429]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#94a3b8] mb-1.5">Productos / Cera (Bs.)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={productAmount}
                    onChange={(e) => setProductAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a1628] border border-[#3b82f6]/30 text-white text-xs focus:outline-none focus:border-[#f0b429]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#94a3b8] mb-1.5">Propina Barbero (Bs.)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={tipAmount}
                    onChange={(e) => setTipAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a1628] border border-[#3b82f6]/30 text-white text-xs focus:outline-none focus:border-[#f0b429]"
                  />
                </div>
              </div>

              {/* Payment Methods */}
              <div>
                <label className="block text-xs font-semibold text-[#94a3b8] mb-2">Método de Pago</label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('qr_simple')}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 text-xs transition-all ${
                      paymentMethod === 'qr_simple'
                        ? 'bg-gradient-to-br from-[#1a4fd6] to-[#0d2347] border-[#f0b429] text-white shadow-md'
                        : 'bg-[#0a1628] border-[#3b82f6]/20 text-[#94a3b8]'
                    }`}
                  >
                    <QrCode className="w-5 h-5 text-[#f0b429]" />
                    <span className="font-semibold">QR Simple</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cash')}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 text-xs transition-all ${
                      paymentMethod === 'cash'
                        ? 'bg-gradient-to-br from-[#1a4fd6] to-[#0d2347] border-[#f0b429] text-white shadow-md'
                        : 'bg-[#0a1628] border-[#3b82f6]/20 text-[#94a3b8]'
                    }`}
                  >
                    <Banknote className="w-5 h-5 text-emerald-400" />
                    <span className="font-semibold">Efectivo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 text-xs transition-all ${
                      paymentMethod === 'card'
                        ? 'bg-gradient-to-br from-[#1a4fd6] to-[#0d2347] border-[#f0b429] text-white shadow-md'
                        : 'bg-[#0a1628] border-[#3b82f6]/20 text-[#94a3b8]'
                    }`}
                  >
                    <CreditCard className="w-5 h-5 text-[#60a5fa]" />
                    <span className="font-semibold">Tarjeta</span>
                  </button>
                </div>
              </div>

              {/* QR Reference Code Input (Anti-Fraude OWASP) */}
              {paymentMethod === 'qr_simple' && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-amber-300">
                      Código de Autorización / Referencia QR Simple *
                    </label>
                    <span className="text-[10px] text-amber-400/80">Validación Anti-Fraude</span>
                  </div>
                  <input
                    type="text"
                    required
                    value={qrReferenceCode}
                    onChange={(e) => setQrReferenceCode(e.target.value)}
                    placeholder="Ej. BNB-982341 o Código de Autorización del Banco"
                    className="w-full px-3.5 py-2 rounded-lg bg-[#0a1628] border border-amber-500/40 text-amber-200 text-xs font-mono focus:outline-none focus:border-amber-400"
                  />
                  <p className="text-[11px] text-amber-300/70">
                    Ingresa los dígitos de autorización que aparecen en el comprobante del cliente. El sistema verifica que no haya sido utilizado previamente.
                  </p>
                </div>
              )}

              {/* Cash Change Calculator */}
              {paymentMethod === 'cash' && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
                  <div>
                    <label className="text-xs text-emerald-300 block">Efectivo Recibido (Bs.)</label>
                    <input
                      type="number"
                      value={cashReceived}
                      onChange={(e) => setCashReceived(parseFloat(e.target.value) || 0)}
                      className="w-24 mt-1 px-2.5 py-1.5 rounded-lg bg-[#0a1628] border border-emerald-500/40 text-white text-xs font-mono"
                    />
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-[#94a3b8]">Cambio a devolver:</span>
                    <p className="font-heading font-black text-lg text-emerald-400">Bs. {changeDue.toFixed(2)}</p>
                  </div>
                </div>
              )}

              {/* Submit Checkout Button */}
              <button
                type="submit"
                disabled={isProcessing || isBarberUser || !isShiftOpen}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#f0b429] to-[#fbbf24] hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed text-[#0a1628] font-heading font-extrabold text-sm shadow-lg shadow-[#f0b429]/25 flex items-center justify-center gap-2 transition-all active:scale-98"
              >
                {isProcessing ? (
                  <span>Procesando cobro en caja...</span>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    <span>Confirmar y Cobrar Bs. {total.toFixed(2)}</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Right Column: Live Summary & Shift Info */}
        <div className="lg:col-span-5 space-y-6">
          {/* Ticket Preview */}
          <div className="p-5 rounded-2xl bg-[#0a1628] border border-[#3b82f6]/20 space-y-4">
            <div className="flex items-center justify-between border-b border-[#3b82f6]/20 pb-3">
              <h3 className="font-heading font-bold text-white text-sm">Resumen de Venta</h3>
              <span className="text-[11px] text-[#f0b429] font-medium">Pre-factura</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-[#94a3b8]">
                <span>Servicios:</span>
                <span className="text-white font-mono">Bs. {serviceAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[#94a3b8]">
                <span>Productos:</span>
                <span className="text-white font-mono">Bs. {productAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[#94a3b8]">
                <span>Propina asignada:</span>
                <span className="text-white font-mono">Bs. {tipAmount.toFixed(2)}</span>
              </div>
              <div className="border-t border-[#3b82f6]/20 pt-2 flex justify-between font-heading font-extrabold text-base text-white">
                <span>Total a Cobrar:</span>
                <span className="text-[#f0b429]">Bs. {total.toFixed(2)}</span>
              </div>
            </div>

            {/* Simulated Commission Snapshot */}
            <div className="p-3 rounded-xl bg-[#0d2347]/60 border border-[#3b82f6]/20 text-[11px] text-[#94a3b8] space-y-1">
              <div className="flex justify-between">
                <span>Barbero:</span>
                <span className="text-white font-medium">{currentBarber?.name}</span>
              </div>
              <div className="flex justify-between">
                <span>Comisión snapshot:</span>
                <span className="text-emerald-400 font-mono">
                  {((currentBarber?.commission_rate || 0.5) * 100).toFixed(0)}% (Bs. {(serviceAmount * (currentBarber?.commission_rate || 0.5)).toFixed(2)})
                </span>
              </div>
            </div>
          </div>

          {/* Recent Sales for this shift */}
          <div className="p-5 rounded-2xl bg-[#0d2347]/80 border border-[#3b82f6]/20 space-y-3">
            <h3 className="font-heading font-bold text-white text-xs uppercase tracking-wider text-[#94a3b8]">
              Ventas Recientes del Día ({sales.length})
            </h3>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {sales.slice(0, 5).map((s) => (
                <div key={s.id} className="p-2.5 rounded-xl bg-[#0a1628]/80 border border-[#3b82f6]/15 flex items-center justify-between text-xs">
                  <div>
                    <p className="text-white font-medium">{s.client_name}</p>
                    <p className="text-[10px] text-[#94a3b8]">
                      {s.barber_name} • {s.payment_method.toUpperCase()}
                    </p>
                  </div>
                  <span className="font-heading font-bold text-[#f0b429]">Bs. {s.total.toFixed(2)}</span>
                </div>
              ))}
              {sales.length === 0 && (
                <p className="text-xs text-[#94a3b8] text-center py-4">No hay ventas registradas aún hoy.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Apertura de Turno de Caja */}
      {isOpenShiftModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0d2347] border border-[#3b82f6]/30 rounded-2xl p-6 space-y-5 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <Unlock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-lg text-white">Apertura de Turno de Caja</h3>
                <p className="text-xs text-[#94a3b8]">Ingresa el fondo fijo de efectivo inicial en gaveta.</p>
              </div>
            </div>

            <form onSubmit={handleOpenShiftSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#94a3b8] mb-1.5">Fondo Inicial (Bs.) *</label>
                <input
                  type="number"
                  min="0"
                  step="5"
                  required
                  value={initialCashInput}
                  onChange={(e) => setInitialCashInput(parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a1628] border border-[#3b82f6]/30 text-white font-mono text-base focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#94a3b8] mb-1.5">Notas de Apertura (Opcional)</label>
                <input
                  type="text"
                  value={shiftNotesInput}
                  onChange={(e) => setShiftNotesInput(e.target.value)}
                  placeholder="Ej. Billetes de 20 y 10 para cambio"
                  className="w-full px-3.5 py-2 rounded-xl bg-[#0a1628] border border-[#3b82f6]/30 text-white text-xs"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpenShiftModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-[#94a3b8] hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30"
                >
                  Confirmar Apertura
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Arqueo Ciego y Cierre de Caja (Blind Reconciliation) */}
      {isCloseShiftModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0d2347] border border-[#3b82f6]/30 rounded-2xl p-6 space-y-5 shadow-2xl">
            {closeShiftVerdict ? (
              /* Verdict screen */
              <div className="text-center space-y-4">
                <div className={`w-14 h-14 rounded-full mx-auto flex items-center justify-center ${
                  closeShiftVerdict.difference === 0
                    ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-400'
                    : 'bg-amber-500/15 border border-amber-500/40 text-amber-400'
                }`}>
                  <CheckCircle className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="font-heading font-extrabold text-xl text-white">Arqueo de Caja Finalizado</h3>
                  <p className="text-sm font-bold text-amber-300 mt-1">{closeShiftVerdict.verdict}</p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#0a1628] border border-[#3b82f6]/20 text-xs text-left space-y-1.5 font-mono">
                  <div className="flex justify-between text-[#94a3b8]">
                    <span>Diferencia contable:</span>
                    <span className={closeShiftVerdict.difference < 0 ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                      Bs. {closeShiftVerdict.difference.toFixed(2)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setIsCloseShiftModalOpen(false);
                    setCloseShiftVerdict(null);
                  }}
                  className="w-full py-2.5 rounded-xl bg-[#1a4fd6] text-white text-xs font-bold"
                >
                  Entendido y Finalizar
                </button>
              </div>
            ) : (
              /* Blind Count Form */
              <>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-lg text-white">Arqueo Ciego de Caja</h3>
                    <p className="text-xs text-[#94a3b8]">Procedimiento de auditoría sin revelación de saldo teórico.</p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
                  Por normativa de seguridad OWASP, cuenta físicamente todos los billetes y monedas en la gaveta e introduce el total exacto. El sistema calculará la discrepancia de forma inmutable.
                </div>

                <form onSubmit={handleCloseShiftSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#94a3b8] mb-1.5">
                      Efectivo Total Contado Físicamente (Bs.) *
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      required
                      value={actualCashCountedInput}
                      onChange={(e) => setActualCashCountedInput(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a1628] border border-[#3b82f6]/30 text-white font-mono text-lg focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#94a3b8] mb-1.5">Observaciones de Cierre</label>
                    <input
                      type="text"
                      value={shiftNotesInput}
                      onChange={(e) => setShiftNotesInput(e.target.value)}
                      placeholder="Ej. Billetes deteriorados o redondeos"
                      className="w-full px-3.5 py-2 rounded-xl bg-[#0a1628] border border-[#3b82f6]/30 text-white text-xs"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsCloseShiftModalOpen(false)}
                      className="px-4 py-2 rounded-xl text-xs text-[#94a3b8] hover:text-white"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-black text-xs font-bold shadow-lg shadow-amber-500/25"
                    >
                      Procesar Cierre y Arqueo
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
