import { Service, Barber, Client, Appointment, Sale, DashboardMetrics, BusinessInfo, User, CashShift, Organization, OrganizationCreateData } from '../types';

const API_BASE = (import.meta.env.VITE_API_URL as string) || '/api';

// Token Management
let authToken: string | null = localStorage.getItem('apolo_barber_jwt_token');

export const setAuthToken = (token: string | null) => {
  authToken = token;
  if (token) {
    localStorage.setItem('apolo_barber_jwt_token', token);
  } else {
    localStorage.removeItem('apolo_barber_jwt_token');
  }
};

export const getAuthToken = () => authToken;

const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const headers = new Headers(options.headers || {});
  if (authToken) {
    headers.set('Authorization', `Bearer ${authToken}`);
  }
  return fetch(url, { ...options, headers });
};

export const api = {
  // Authentication & Session
  async login(email: string, password: string): Promise<{ access_token: string; user: User }> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Error al iniciar sesión');
    }
    const data = await res.json();
    setAuthToken(data.access_token);
    return data;
  },

  async getCurrentUser(): Promise<{ user: User; organization?: any }> {
    const res = await fetchWithAuth(`${API_BASE}/auth/me`);
    if (!res.ok) throw new Error('Sesión no válida o expirada');
    return res.json();
  },

  // Services
  async getServices(category?: string, tenantId?: string, slug?: string): Promise<Service[]> {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (tenantId) params.append('tenant_id', tenantId);
    if (slug) params.append('slug', slug);
    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await fetchWithAuth(`${API_BASE}/services${qs}`);
    if (!res.ok) throw new Error('Error al cargar servicios');
    return res.json();
  },

  async createService(data: Partial<Service>): Promise<Service> {
    const res = await fetchWithAuth(`${API_BASE}/services`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Error al crear servicio');
    }
    return res.json();
  },

  async updateService(id: string, data: Partial<Service>): Promise<Service> {
    const res = await fetchWithAuth(`${API_BASE}/services/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Error al actualizar servicio');
    }
    return res.json();
  },

  async deleteService(id: string): Promise<void> {
    const res = await fetchWithAuth(`${API_BASE}/services/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Error al eliminar servicio');
    }
  },

  // Barbers
  async getBarbers(tenantId?: string, slug?: string): Promise<Barber[]> {
    const params = new URLSearchParams();
    if (tenantId) params.append('tenant_id', tenantId);
    if (slug) params.append('slug', slug);
    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await fetchWithAuth(`${API_BASE}/barbers${qs}`);
    if (!res.ok) throw new Error('Error al cargar equipo de barberos');
    return res.json();
  },

  async createBarber(data: Partial<Barber>): Promise<Barber> {
    const res = await fetchWithAuth(`${API_BASE}/barbers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Error al registrar barbero');
    }
    return res.json();
  },

  async updateBarber(id: string, data: Partial<Barber>): Promise<Barber> {
    const res = await fetchWithAuth(`${API_BASE}/barbers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Error al actualizar datos de barbero');
    }
    return res.json();
  },

  async deleteBarber(id: string): Promise<void> {
    const res = await fetchWithAuth(`${API_BASE}/barbers/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Error al dar de baja al barbero');
    }
  },

  // Clients
  async getClients(search?: string): Promise<Client[]> {
    const url = search ? `${API_BASE}/clients?search=${encodeURIComponent(search)}` : `${API_BASE}/clients`;
    const res = await fetchWithAuth(url);
    if (!res.ok) throw new Error('Error al cargar base de clientes');
    return res.json();
  },

  async createClient(data: Partial<Client>): Promise<Client> {
    const res = await fetchWithAuth(`${API_BASE}/clients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Error al registrar cliente');
    }
    return res.json();
  },

  async updateClient(id: string, data: Partial<Client>): Promise<Client> {
    const res = await fetchWithAuth(`${API_BASE}/clients/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Error al actualizar cliente');
    }
    return res.json();
  },

  async deleteClient(id: string): Promise<void> {
    const res = await fetchWithAuth(`${API_BASE}/clients/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Error al eliminar cliente');
    }
  },

  // Appointments & Availability
  async getAppointments(date?: string, barberId?: string): Promise<Appointment[]> {
    let url = `${API_BASE}/appointments`;
    const params = new URLSearchParams();
    if (date) params.append('date', date);
    if (barberId && barberId !== 'all') params.append('barber_id', barberId);
    if (params.toString()) url += `?${params.toString()}`;

    const res = await fetchWithAuth(url);
    if (!res.ok) throw new Error('Error al cargar agenda de turnos');
    return res.json();
  },

  async getAvailability(date: string, serviceId: string, barberId?: string, tenantId?: string, slug?: string): Promise<{
    date: string;
    service_id: string;
    service_name: string;
    duration_minutes: number;
    barber_id?: string;
    available_slots: string[];
  }> {
    const params = new URLSearchParams();
    params.append('date', date);
    params.append('service_id', serviceId);
    if (barberId && barberId !== 'all') params.append('barber_id', barberId);
    if (tenantId) params.append('tenant_id', tenantId);
    if (slug) params.append('slug', slug);

    const res = await fetch(`${API_BASE}/appointments/availability?${params.toString()}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Error al consultar disponibilidad');
    }
    return res.json();
  },

  async createAppointment(data: Partial<Appointment>): Promise<Appointment> {
    const res = await fetchWithAuth(`${API_BASE}/appointments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Error al programar cita');
    }
    return res.json();
  },

  async updateAppointmentStatus(id: string, status: string): Promise<Appointment> {
    const res = await fetchWithAuth(`${API_BASE}/appointments/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Error al actualizar estado de cita');
    }
    return res.json();
  },

  async updateAppointment(id: string, data: Partial<Appointment>): Promise<Appointment> {
    const res = await fetchWithAuth(`${API_BASE}/appointments/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Error al actualizar cita');
    }
    return res.json();
  },

  async deleteAppointment(id: string): Promise<void> {
    const res = await fetchWithAuth(`${API_BASE}/appointments/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Error al cancelar cita');
    }
  },

  // Cash Shifts (Arqueo Ciego)
  async getCurrentShift(): Promise<{ is_open: boolean; shift: CashShift | null }> {
    const res = await fetchWithAuth(`${API_BASE}/cash/current`);
    if (!res.ok) throw new Error('Error al consultar estado de caja');
    return res.json();
  },

  async openCashShift(initial_cash: number, notes?: string): Promise<{ message: string; shift: CashShift }> {
    const res = await fetchWithAuth(`${API_BASE}/cash/open`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initial_cash, notes }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Error al abrir turno de caja');
    }
    return res.json();
  },

  async closeCashShift(actual_cash_counted: number, notes?: string): Promise<{
    message: string;
    verdict: string;
    difference: number;
    shift: CashShift;
  }> {
    const res = await fetchWithAuth(`${API_BASE}/cash/close`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actual_cash_counted, notes }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Error al procesar arqueo de caja');
    }
    return res.json();
  },

  // Checkout / Sales
  async processCheckout(data: {
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
  }): Promise<Sale> {
    const res = await fetchWithAuth(`${API_BASE}/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Error al procesar cobro en caja');
    }
    return res.json();
  },

  async getSales(date?: string): Promise<Sale[]> {
    const url = date ? `${API_BASE}/checkout/sales?date=${encodeURIComponent(date)}` : `${API_BASE}/checkout/sales`;
    const res = await fetchWithAuth(url);
    if (!res.ok) throw new Error('Error al cargar ventas');
    return res.json();
  },

  // Stats
  async getDashboardMetrics(date?: string): Promise<DashboardMetrics> {
    const url = date ? `${API_BASE}/stats/dashboard?target_date=${encodeURIComponent(date)}` : `${API_BASE}/stats/dashboard`;
    const res = await fetchWithAuth(url);
    if (!res.ok) throw new Error('Error al cargar métricas');
    return res.json();
  },

  async getBusinessInfo(): Promise<BusinessInfo> {
    const res = await fetch(`${API_BASE}/stats/business-info`);
    if (!res.ok) throw new Error('Error al cargar información del negocio');
    return res.json();
  },

  // Organizations / Barberías (Multi-Tenant SaaS)
  async getPublicOrganizations(): Promise<Organization[]> {
    const res = await fetch(`${API_BASE}/organizations/public`);
    if (!res.ok) throw new Error('Error al listar las barberías públicas');
    return res.json();
  },

  async getPublicOrganization(slugOrId: string): Promise<Organization> {
    const res = await fetch(`${API_BASE}/organizations/public/${encodeURIComponent(slugOrId)}`);
    if (!res.ok) throw new Error(`Barbería '${slugOrId}' no encontrada`);
    return res.json();
  },

  async getOrganizations(): Promise<Organization[]> {
    const res = await fetchWithAuth(`${API_BASE}/organizations`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Error al listar las barberías');
    }
    return res.json();
  },

  async createOrganization(data: OrganizationCreateData): Promise<Organization> {
    const res = await fetchWithAuth(`${API_BASE}/organizations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Error al registrar la nueva barbería');
    }
    return res.json();
  },

  async updateOrganization(id: string, data: Partial<Organization>): Promise<Organization> {
    const res = await fetchWithAuth(`${API_BASE}/organizations/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Error al actualizar datos de la barbería');
    }
    return res.json();
  },

  async deleteOrganization(id: string): Promise<void> {
    const res = await fetchWithAuth(`${API_BASE}/organizations/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Error al desactivar la barbería');
    }
  }
};
