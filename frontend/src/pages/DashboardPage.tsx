import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  Service,
  Barber,
  Client,
  Appointment,
  Sale,
  DashboardMetrics,
  AppointmentStatus,
  User,
  UserRole,
  CashShift
} from '../types';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';
import { AgendaView } from '../components/AgendaView';
import { ServicesView } from '../components/ServicesView';
import { ClientsView } from '../components/ClientsView';
import { BarbersView } from '../components/BarbersView';
import { PosView } from '../components/PosView';
import { StatsView } from '../components/StatsView';
import { OrganizationsView } from '../components/OrganizationsView';
import { AppointmentModal } from '../components/AppointmentModal';
import { useAuth } from '../context/AuthContext';
import { Organization, OrganizationCreateData } from '../types';

const getLocalDateString = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const DashboardPage: React.FC = () => {
  const { user: authUser, switchRole, logout } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('agenda');

  // Fallback currentUser from auth context
  const currentUser: User = authUser || {
    id: 'usr-admin-01',
    email: 'admin@apolodigital.lat',
    full_name: 'Admin Recepción',
    role: 'admin',
    tenant_id: 'org_apolo_sopocachi',
  };

  // Cash Shifts (Arqueo Ciego)
  const [currentShift, setCurrentShift] = useState<CashShift | null>(null);
  const [isShiftOpen, setIsShiftOpen] = useState<boolean>(true);

  // Core Data
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);

  // Filters & State
  const [selectedDate, setSelectedDate] = useState<string>(getLocalDateString());
  const [selectedBarberId, setSelectedBarberId] = useState<string>('all');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Modals & POS Target
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [slotTimeForModal, setSlotTimeForModal] = useState<string>('10:00');
  const [slotBarberIdForModal, setSlotBarberIdForModal] = useState<string>('');
  const [posTargetAppointment, setPosTargetAppointment] = useState<Appointment | null>(null);

  // Enforce RBAC on tab switching: if barber is selected, disallow POS & Stats
  useEffect(() => {
    if (currentUser.role === 'barber') {
      if (currentTab === 'pos' || currentTab === 'stats' || currentTab === 'barbers') {
        setCurrentTab('agenda');
      }
      if (currentUser.barber_id) {
        setSelectedBarberId(currentUser.barber_id);
      }
    }
  }, [currentUser.role, currentUser.barber_id, currentTab]);

  // Initial Data Fetch
  const loadInitialData = async () => {
    try {
      setIsLoading(true);
      setConnectionError(null);

      const todayStr = getLocalDateString();
      const [srvs, brbs, clts, apts, sls, mtr, shiftData, orgsData] = await Promise.all([
        api.getServices(),
        api.getBarbers(),
        api.getClients(),
        api.getAppointments(todayStr),
        api.getSales(todayStr),
        api.getDashboardMetrics(todayStr).catch(() => null),
        api.getCurrentShift().catch(() => ({ is_open: false, shift: null })),
        api.getOrganizations().catch(() => []),
      ]);

      setServices(srvs);
      setBarbers(brbs);
      setClients(clts);
      setAppointments(apts);
      setSales(sls);
      setMetrics(mtr);
      setIsShiftOpen(shiftData.is_open);
      setCurrentShift(shiftData.shift);
      setOrganizations(orgsData);
    } catch (err: any) {
      console.error('Error loading data from backend:', err);
      setConnectionError('No se pudo conectar con el servidor backend. Revisa que el backend esté activo en el puerto 8008.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // When selectedDate changes, refresh appointments and stats
  useEffect(() => {
    const refreshDateData = async () => {
      try {
        const [apts, sls, mtr] = await Promise.all([
          api.getAppointments(selectedDate),
          api.getSales(selectedDate),
          api.getDashboardMetrics(selectedDate).catch(() => null),
        ]);
        setAppointments(apts);
        setSales(sls);
        setMetrics(mtr);
      } catch (err) {
        console.error('Error refreshing date data:', err);
      }
    };
    refreshDateData();
  }, [selectedDate]);

  // Switch User Role (Auditoría OWASP)
  const handleSwitchUserRole = async (role: UserRole) => {
    try {
      setIsLoading(true);
      const newUser = await switchRole(role);

      if (newUser.role === 'barber' && newUser.barber_id) {
        setSelectedBarberId(newUser.barber_id);
      } else {
        setSelectedBarberId('all');
      }

      if (newUser.role === 'superadmin') {
        setCurrentTab('organizations');
      }

      // Refresh data under the new user role
      const [apts, sls, mtr, orgs] = await Promise.all([
        api.getAppointments(selectedDate),
        api.getSales(selectedDate),
        api.getDashboardMetrics(selectedDate).catch(() => null),
        api.getOrganizations().catch(() => []),
      ]);
      setAppointments(apts);
      setSales(sls);
      setMetrics(mtr);
      setOrganizations(orgs);
    } catch (err) {
      console.error('Error switching user role:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Cash Shifts Handlers
  const handleOpenShift = async (initialCash: number, notes?: string) => {
    const res = await api.openCashShift(initialCash, notes);
    setIsShiftOpen(true);
    setCurrentShift(res.shift);
  };

  const handleCloseShift = async (actualCounted: number, notes?: string) => {
    const res = await api.closeCashShift(actualCounted, notes);
    setIsShiftOpen(false);
    setCurrentShift(res.shift);
    return { verdict: res.verdict, difference: res.difference };
  };

  // Handlers for Appointments
  const handleStatusChange = async (id: string, status: AppointmentStatus) => {
    try {
      await api.updateAppointmentStatus(id, status);
      const [apts, mtr, clts] = await Promise.all([
        api.getAppointments(selectedDate),
        api.getDashboardMetrics(selectedDate).catch(() => null),
        api.getClients(),
      ]);
      setAppointments(apts);
      setMetrics(mtr);
      setClients(clts);
    } catch (err: any) {
      console.error('Error updating status:', err);
      alert(err.message || 'Error al actualizar el estado de la cita.');
    }
  };

  const handleDeleteAppointment = async (id: string) => {
    try {
      await api.deleteAppointment(id);
      const [apts, mtr] = await Promise.all([
        api.getAppointments(selectedDate),
        api.getDashboardMetrics(selectedDate).catch(() => null),
      ]);
      setAppointments(apts);
      setMetrics(mtr);
    } catch (err: any) {
      console.error('Error deleting appointment:', err);
      alert(err.message || 'Error al cancelar la cita.');
    }
  };

  const handleSaveAppointment = async (data: Partial<Appointment>) => {
    await api.createAppointment(data);
    const [apts, clts, mtr] = await Promise.all([
      api.getAppointments(selectedDate),
      api.getClients(),
      api.getDashboardMetrics(selectedDate).catch(() => null),
    ]);
    setAppointments(apts);
    setClients(clts);
    setMetrics(mtr);
  };

  const handleOpenNewAtSlot = (time: string, barberId?: string) => {
    setSlotTimeForModal(time);
    if (barberId) setSlotBarberIdForModal(barberId);
    setIsAppointmentModalOpen(true);
  };

  const handleOpenCheckoutFromAppointment = (apt: Appointment) => {
    setPosTargetAppointment(apt);
    setCurrentTab('pos');
  };

  // Handlers for Checkout / Sales
  const handleProcessCheckout = async (checkoutData: any): Promise<Sale> => {
    const sale = await api.processCheckout(checkoutData);
    const [apts, sls, mtr, clts, shiftData] = await Promise.all([
      api.getAppointments(selectedDate),
      api.getSales(selectedDate),
      api.getDashboardMetrics(selectedDate).catch(() => null),
      api.getClients(),
      api.getCurrentShift().catch(() => ({ is_open: true, shift: null })),
    ]);
    setAppointments(apts);
    setSales(sls);
    setMetrics(mtr);
    setClients(clts);
    if (shiftData.shift) setCurrentShift(shiftData.shift);
    return sale;
  };

  // Handlers for Services
  const handleCreateService = async (serviceData: Partial<Service>) => {
    await api.createService(serviceData);
    const srvs = await api.getServices();
    setServices(srvs);
  };

  const handleUpdateService = async (id: string, serviceData: Partial<Service>) => {
    await api.updateService(id, serviceData);
    const srvs = await api.getServices();
    setServices(srvs);
  };

  const handleDeleteService = async (id: string) => {
    await api.deleteService(id);
    const srvs = await api.getServices();
    setServices(srvs);
  };

  // Handlers for Clients
  const handleCreateClient = async (clientData: Partial<Client>) => {
    await api.createClient(clientData);
    const clts = await api.getClients();
    setClients(clts);
  };

  const handleUpdateClient = async (id: string, clientData: Partial<Client>) => {
    await api.updateClient(id, clientData);
    const clts = await api.getClients();
    setClients(clts);
  };

  const handleDeleteClient = async (id: string) => {
    await api.deleteClient(id);
    const clts = await api.getClients();
    setClients(clts);
  };

  // Handlers for Barbers
  const handleCreateBarber = async (barberData: Partial<Barber>) => {
    await api.createBarber(barberData);
    const brbs = await api.getBarbers();
    setBarbers(brbs);
  };

  const handleUpdateBarber = async (id: string, barberData: Partial<Barber>) => {
    await api.updateBarber(id, barberData);
    const brbs = await api.getBarbers();
    setBarbers(brbs);
  };

  // Handlers for Organizations (Superadmin Multi-Tenant SaaS)
  const handleCreateOrganization = async (data: OrganizationCreateData) => {
    await api.createOrganization(data);
    const orgs = await api.getOrganizations();
    setOrganizations(orgs);
  };

  const handleUpdateOrganization = async (id: string, data: Partial<Organization>) => {
    await api.updateOrganization(id, data);
    const orgs = await api.getOrganizations();
    setOrganizations(orgs);
  };

  const handleDeleteOrganization = async (id: string) => {
    await api.deleteOrganization(id);
    const orgs = await api.getOrganizations();
    setOrganizations(orgs);
  };

  return (
    <div className="min-h-screen bg-[#0a1628] text-white flex flex-col font-sans relative selection:bg-[#1a4fd6] selection:text-white">
      {/* Top Navigation Bar with user badge & logout */}
      <Navbar
        currentTab={currentTab}
        currentUser={currentUser}
        onSwitchUserRole={handleSwitchUserRole}
        onLogout={logout}
        onOpenNewAppointment={() => {
          setSlotTimeForModal('10:00');
          setSlotBarberIdForModal('');
          setIsAppointmentModalOpen(true);
        }}
      />

      {/* Main Admin / Booksy Biz Management View */}
      <div className="flex-1 flex flex-col md:flex-row">
        <Sidebar
          currentTab={currentTab}
          setCurrentTab={setCurrentTab}
          currentUser={currentUser}
        />

        <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
          {connectionError && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-500/15 border border-rose-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-rose-300 text-xs">
              <div>
                <p className="font-bold text-sm text-rose-200">Error de comunicación con el Backend (Puerto 8008)</p>
                <p className="mt-0.5">{connectionError}</p>
              </div>
              <button
                onClick={loadInitialData}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold shrink-0 shadow-lg shadow-rose-600/30 transition-all"
              >
                Reintentar Conexión
              </button>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-10 h-10 border-4 border-[#1a4fd6] border-t-[#f0b429] rounded-full animate-spin"></div>
            </div>
          ) : (
            <>
              {currentTab === 'organizations' && (
                <OrganizationsView
                  organizations={organizations}
                  onCreateOrganization={handleCreateOrganization}
                  onUpdateOrganization={handleUpdateOrganization}
                  onDeleteOrganization={handleDeleteOrganization}
                />
              )}

              {currentTab === 'agenda' && (
                <AgendaView
                  appointments={appointments}
                  barbers={barbers}
                  selectedDate={selectedDate}
                  setSelectedDate={setSelectedDate}
                  selectedBarberId={selectedBarberId}
                  setSelectedBarberId={setSelectedBarberId}
                  currentUser={currentUser}
                  onStatusChange={handleStatusChange}
                  onOpenCheckout={handleOpenCheckoutFromAppointment}
                  onNewAppointmentAtSlot={handleOpenNewAtSlot}
                  onDeleteAppointment={handleDeleteAppointment}
                />
              )}

              {currentTab === 'services' && (
                <ServicesView
                  services={services}
                  onCreateService={handleCreateService}
                  onUpdateService={handleUpdateService}
                  onDeleteService={handleDeleteService}
                />
              )}

              {currentTab === 'clients' && (
                <ClientsView
                  clients={clients}
                  onCreateClient={handleCreateClient}
                  onUpdateClient={handleUpdateClient}
                  onDeleteClient={handleDeleteClient}
                />
              )}

              {currentTab === 'barbers' && (
                <BarbersView
                  barbers={barbers}
                  onCreateBarber={handleCreateBarber}
                  onUpdateBarber={handleUpdateBarber}
                />
              )}

              {currentTab === 'pos' && (
                <PosView
                  activeAppointments={appointments.filter((a) => a.status !== 'cancelled')}
                  barbers={barbers}
                  sales={sales}
                  currentShift={currentShift}
                  isShiftOpen={isShiftOpen}
                  currentUser={currentUser}
                  initialAppointment={posTargetAppointment}
                  onOpenShift={handleOpenShift}
                  onCloseShift={handleCloseShift}
                  onProcessCheckout={handleProcessCheckout}
                />
              )}

              {currentTab === 'stats' && (
                <StatsView metrics={metrics} sales={sales} />
              )}
            </>
          )}
        </main>
      </div>

      {/* Appointment Modal */}
      <AppointmentModal
        isOpen={isAppointmentModalOpen}
        onClose={() => setIsAppointmentModalOpen(false)}
        services={services}
        barbers={barbers}
        clients={clients}
        initialDate={selectedDate}
        initialTime={slotTimeForModal}
        initialBarberId={slotBarberIdForModal}
        onSave={handleSaveAppointment}
      />
    </div>
  );
};

export default DashboardPage;
