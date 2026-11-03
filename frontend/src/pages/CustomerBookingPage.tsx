import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Scissors, MapPin, Phone, Calendar, Clock, Sparkles, Building2, ChevronDown, Check } from 'lucide-react';
import { Service, Barber, Appointment, Organization } from '../types';
import { api } from '../services/api';
import { ClientBookingView } from '../components/ClientBookingView';

export const CustomerBookingPage: React.FC = () => {
  const { slug } = useParams<{ slug?: string }>();
  const navigate = useNavigate();

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [isBranchSelectorOpen, setIsBranchSelectorOpen] = useState(false);

  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // 1. Load all public organizations
  useEffect(() => {
    const fetchOrgs = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);
        const orgs = await api.getPublicOrganizations();
        setOrganizations(orgs);

        // Resolve active organization:
        // By slug param, or fallback to first
        let active: Organization | undefined;
        if (slug) {
          active = orgs.find((o) => o.slug === slug || o.id === slug);
        }
        if (!active && orgs.length > 0) {
          active = orgs[0];
        }

        setSelectedOrg(active || null);
      } catch (err: any) {
        console.error('Error al cargar barberías:', err);
        setLoadError('No se pudo conectar con el servidor de la barbería. Por favor reintenta.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrgs();
  }, [slug]);

  // 2. Load services and barbers for the selected organization
  useEffect(() => {
    if (!selectedOrg) return;

    const fetchOrgData = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);
        const [srvs, brbs] = await Promise.all([
          api.getServices(undefined, selectedOrg.id, selectedOrg.slug),
          api.getBarbers(selectedOrg.id, selectedOrg.slug),
        ]);
        setServices(srvs);
        setBarbers(brbs);
      } catch (err: any) {
        console.error('Error al cargar datos de la sucursal:', err);
        setLoadError('No se pudo cargar el catálogo de servicios de esta sucursal.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrgData();
  }, [selectedOrg]);

  const handleSelectBranch = (org: Organization) => {
    setSelectedOrg(org);
    setIsBranchSelectorOpen(false);
    navigate(`/${org.slug}`, { replace: true });
  };

  const handleBookAppointment = async (aptData: Partial<Appointment>): Promise<Appointment> => {
    return await api.createAppointment({
      ...aptData,
      tenant_id: selectedOrg?.id,
    });
  };

  return (
    <div className="min-h-screen bg-[#070d1e] text-white flex flex-col font-sans selection:bg-[#1a4fd6] selection:text-white">
      {/* Customer Header - 100% Client Focused (No Staff/Admin Access Buttons) */}
      <header className="sticky top-0 z-40 w-full bg-[#0a1628]/95 backdrop-blur-md border-b border-[#3b82f6]/20 px-4 md:px-8 py-3.5 transition-all">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          {/* Brand Logo & Specific Barbershop Name */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1a4fd6] to-[#0d2347] border border-[#3b82f6]/40 flex items-center justify-center p-1.5 shadow-lg shadow-[#1a4fd6]/20">
              <img
                src="/isotipo-apolo.png"
                alt="ApoloDigital"
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <Scissors className="w-5 h-5 text-[#f0b429] drop-shadow" />
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-heading font-extrabold text-xl tracking-tight text-white">
                  Apolo<span className="text-[#60a5fa]">Digital</span>
                </span>
                <span className="text-[#f0b429] font-heading font-black text-xl tracking-wider">
                  BARBER
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-[#94a3b8]">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-white font-medium">
                  {selectedOrg ? selectedOrg.name : 'Barbería Oficial'}
                </span>
                <span className="text-[#f0b429]">•</span>
                <span className="text-[#c8deff]">Reserva Online</span>
              </div>
            </div>
          </div>

          {/* Right: Branch Selector & Schedule Badge */}
          <div className="flex items-center gap-3">
            {/* Multi-Branch Selector if more than 1 organization exists */}
            {organizations.length > 1 && (
              <div className="relative">
                <button
                  onClick={() => setIsBranchSelectorOpen(!isBranchSelectorOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0d2347] hover:bg-[#102a54] border border-[#3b82f6]/30 text-xs text-[#c8deff] font-semibold transition-all cursor-pointer"
                  title="Cambiar sucursal de barbería"
                >
                  <Building2 className="w-3.5 h-3.5 text-[#f0b429]" />
                  <span className="max-w-[130px] sm:max-w-[200px] truncate">
                    {selectedOrg?.name || 'Seleccionar Barbería'}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-[#94a3b8]" />
                </button>

                {isBranchSelectorOpen && (
                  <div className="absolute right-0 mt-2 w-72 bg-[#0a1628] border border-[#3b82f6]/30 rounded-2xl p-2 shadow-2xl z-50 space-y-1">
                    <p className="px-3 py-1.5 text-[10px] text-[#94a3b8] uppercase font-bold tracking-wider border-b border-[#3b82f6]/20">
                      Sucursales Disponibles
                    </p>
                    {organizations.map((org) => {
                      const isSelected = selectedOrg?.id === org.id;
                      return (
                        <button
                          key={org.id}
                          onClick={() => handleSelectBranch(org)}
                          className={`w-full px-3 py-2 rounded-xl flex items-center justify-between text-xs transition-all text-left cursor-pointer ${
                            isSelected
                              ? 'bg-[#1a4fd6]/30 text-[#f0b429] font-bold border border-[#3b82f6]/40'
                              : 'text-white hover:bg-[#102a54]'
                          }`}
                        >
                          <div>
                            <p className="text-xs font-semibold">{org.name}</p>
                            {org.address && (
                              <p className="text-[10px] text-[#94a3b8] truncate max-w-[220px]">
                                {org.address}
                              </p>
                            )}
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Operating Hours Badge */}
            <div className="hidden sm:flex items-center gap-2 text-xs text-[#c8deff] bg-[#0d2347]/60 border border-[#3b82f6]/20 px-3 py-1.5 rounded-xl">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="font-semibold text-white">08:00 - 21:00</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 py-4 md:py-6">
        {isLoading ? (
          <div className="min-h-[50vh] flex flex-col items-center justify-center text-center p-6">
            <div className="w-12 h-12 border-4 border-[#1a4fd6]/20 border-t-[#f0b429] rounded-full animate-spin mb-4"></div>
            <p className="text-sm text-[#94a3b8] font-medium">
              Cargando disponibilidad de {selectedOrg?.name || 'la barbería'}...
            </p>
          </div>
        ) : loadError ? (
          <div className="max-w-md mx-auto my-12 p-6 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-center">
            <p className="text-sm font-semibold text-rose-200 mb-2">Error de conexión</p>
            <p className="text-xs text-rose-300 mb-4">{loadError}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer"
            >
              Reintentar
            </button>
          </div>
        ) : (
          <ClientBookingView
            services={services}
            barbers={barbers}
            onBookAppointment={handleBookAppointment}
            tenantId={selectedOrg?.id}
            slug={selectedOrg?.slug}
            organizationName={selectedOrg?.name}
            organizationAddress={selectedOrg?.address}
            organizationPhone={selectedOrg?.phone}
            currency={selectedOrg?.currency || 'Bs.'}
          />
        )}
      </main>

      {/* Footer - Strictly Public and Branded to Selected Barbería */}
      <footer className="w-full bg-[#0a1628] border-t border-[#3b82f6]/20 py-8 px-4 text-center text-xs text-[#94a3b8]">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#f0b429] shrink-0" />
            <span className="font-medium text-white">
              {selectedOrg?.name}: {selectedOrg?.address || 'La Paz, Bolivia'}
            </span>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-[#60a5fa]">
            {selectedOrg?.phone && (
              <>
                <Phone className="w-3.5 h-3.5 text-[#f0b429]" />
                <span className="text-white">{selectedOrg.phone}</span>
                <span>•</span>
              </>
            )}
            <Clock className="w-3.5 h-3.5 text-[#f0b429]" />
            <span>Lunes a Sábado: 08:00 - 21:00</span>
          </div>
        </div>
        <p className="mt-4 text-[11px] text-[#64748b]">
          © 2026 {selectedOrg?.name || 'ApoloDigital Barber'} • Sistema de Reservas Online Multi-Tenant • Todos los derechos reservados
        </p>
      </footer>
    </div>
  );
};

export default CustomerBookingPage;
