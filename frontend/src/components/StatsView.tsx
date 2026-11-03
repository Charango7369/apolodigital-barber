import React from 'react';
import {
  TrendingUp,
  DollarSign,
  CalendarCheck,
  Percent,
  Sparkles,
  Scissors,
  QrCode,
  Banknote,
  CreditCard,
  Award
} from 'lucide-react';
import { DashboardMetrics, Sale } from '../types';

interface StatsViewProps {
  metrics: DashboardMetrics | null;
  sales: Sale[];
}

export const StatsView: React.FC<StatsViewProps> = ({ metrics, sales }) => {
  if (!metrics) {
    return (
      <div className="p-12 text-center text-[#94a3b8]">
        Cargando métricas de negocio...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Revenue */}
        <div className="p-5 rounded-2xl bg-[#0d2347]/80 border border-[#3b82f6]/20 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-[#60a5fa] uppercase tracking-wider">
              Ingresos de Hoy
            </span>
            <div className="p-2 rounded-xl bg-[#102a54] text-[#f0b429]">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="font-heading font-extrabold text-3xl text-white">
            {metrics.revenue_today} <span className="text-sm font-normal text-[#f0b429]">Bs.</span>
          </div>
          <div className="text-[11px] text-[#94a3b8] mt-2 flex items-center gap-1">
            <span className="text-emerald-400 font-semibold">+{metrics.tips_today} Bs.</span> en propinas de barberos
          </div>
        </div>

        {/* Appointments */}
        <div className="p-5 rounded-2xl bg-[#0d2347]/80 border border-[#3b82f6]/20 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-[#60a5fa] uppercase tracking-wider">
              Citas del Día
            </span>
            <div className="p-2 rounded-xl bg-[#102a54] text-[#60a5fa]">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="font-heading font-extrabold text-3xl text-white">
            {metrics.total_appointments}
          </div>
          <div className="text-[11px] text-[#94a3b8] mt-2">
            <span className="text-[#fbbf24] font-semibold">{metrics.completed_appointments} atendidas</span> • {metrics.in_progress_appointments} en sillón
          </div>
        </div>

        {/* Occupancy Rate */}
        <div className="p-5 rounded-2xl bg-[#0d2347]/80 border border-[#3b82f6]/20 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-[#60a5fa] uppercase tracking-wider">
              Ocupación Sillones
            </span>
            <div className="p-2 rounded-xl bg-[#102a54] text-emerald-400">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="font-heading font-extrabold text-3xl text-white">
            {metrics.occupancy_rate_percent}%
          </div>
          <div className="text-[11px] text-[#94a3b8] mt-2">
            Capacidad para {metrics.active_barbers_count} barberos activos
          </div>
        </div>

        {/* Average Ticket */}
        <div className="p-5 rounded-2xl bg-[#0d2347]/80 border border-[#3b82f6]/20 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-[#60a5fa] uppercase tracking-wider">
              Ticket Promedio
            </span>
            <div className="p-2 rounded-xl bg-[#102a54] text-[#f0b429]">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="font-heading font-extrabold text-3xl text-white">
            {metrics.sales_count > 0 ? Math.round(metrics.revenue_today / metrics.sales_count) : 0}{' '}
            <span className="text-sm font-normal text-[#f0b429]">Bs.</span>
          </div>
          <div className="text-[11px] text-[#94a3b8] mt-2">
            {metrics.sales_count} ventas cerradas hoy
          </div>
        </div>
      </div>

      {/* Rankings: Top Barbers & Top Services */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Barbers */}
        <div className="p-5 rounded-2xl bg-[#0d2347]/70 border border-[#3b82f6]/20 shadow-lg">
          <h3 className="font-heading font-extrabold text-base text-white flex items-center gap-2 mb-4">
            <Award className="w-5 h-5 text-[#f0b429]" />
            Rendimiento por Barbero (Hoy)
          </h3>

          <div className="space-y-3">
            {metrics.top_barbers.length === 0 ? (
              <div className="text-xs text-[#94a3b8]">No hay citas registradas hoy aún.</div>
            ) : (
              metrics.top_barbers.map((b, idx) => (
                <div
                  key={b.name}
                  className="flex items-center justify-between p-3 rounded-xl bg-[#0a1628]/70 border border-[#3b82f6]/15"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                        idx === 0
                          ? 'bg-[#f0b429] text-[#0a1628]'
                          : idx === 1
                          ? 'bg-slate-300 text-slate-900'
                          : 'bg-[#102a54] text-[#60a5fa]'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <div>
                      <div className="text-sm font-bold text-white">{b.name}</div>
                      <div className="text-[11px] text-[#94a3b8]">{b.appointments} citas atendidas</div>
                    </div>
                  </div>

                  <div className="font-heading font-bold text-sm text-[#f0b429]">
                    {b.revenue} Bs.
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top Services */}
        <div className="p-5 rounded-2xl bg-[#0d2347]/70 border border-[#3b82f6]/20 shadow-lg">
          <h3 className="font-heading font-extrabold text-base text-white flex items-center gap-2 mb-4">
            <Scissors className="w-5 h-5 text-[#60a5fa]" />
            Servicios Más Solicitados
          </h3>

          <div className="space-y-3">
            {metrics.top_services.length === 0 ? (
              <div className="text-xs text-[#94a3b8]">No hay registros disponibles hoy.</div>
            ) : (
              metrics.top_services.map((srv) => (
                <div
                  key={srv.name}
                  className="flex items-center justify-between p-3 rounded-xl bg-[#0a1628]/70 border border-[#3b82f6]/15"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-2 h-2 rounded-full bg-[#f0b429]"></div>
                    <span className="text-xs font-bold text-white">{srv.name}</span>
                  </div>

                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-[#94a3b8]">{srv.count} veces</span>
                    <span className="font-bold text-[#60a5fa]">{srv.revenue} Bs.</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Payment methods breakdown & Sales List */}
      <div className="p-5 rounded-2xl bg-[#0d2347]/70 border border-[#3b82f6]/20 shadow-lg">
        <h3 className="font-heading font-extrabold text-base text-white mb-4">
          Transacciones Recientes de Caja
        </h3>

        {sales.length === 0 ? (
          <div className="text-xs text-[#94a3b8] py-4 text-center">
            No se han registrado transacciones de cobro en esta fecha.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="text-[10px] uppercase text-[#94a3b8] border-b border-[#3b82f6]/20">
                <tr>
                  <th className="py-2.5 px-3">Hora / ID</th>
                  <th className="py-2.5 px-3">Cliente</th>
                  <th className="py-2.5 px-3">Barbero</th>
                  <th className="py-2.5 px-3">Método</th>
                  <th className="py-2.5 px-3">Propina</th>
                  <th className="py-2.5 px-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#3b82f6]/10">
                {sales.map((s) => (
                  <tr key={s.id} className="hover:bg-[#102a54]/40">
                    <td className="py-3 px-3 font-mono text-[#60a5fa]">
                      {s.created_at.substring(11, 16)} • {s.id}
                    </td>
                    <td className="py-3 px-3 font-bold text-white">{s.client_name}</td>
                    <td className="py-3 px-3 text-[#c8deff]">{s.barber_name}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#102a54] text-[#f0b429] border border-[#f0b429]/30">
                        {s.payment_method === 'qr_simple'
                          ? 'QR Simple'
                          : s.payment_method === 'cash'
                          ? 'Efectivo'
                          : 'Tarjeta'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-[#fbbf24]">+{s.tip} Bs.</td>
                    <td className="py-3 px-3 text-right font-bold text-[#f0b429]">{s.total} Bs.</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
