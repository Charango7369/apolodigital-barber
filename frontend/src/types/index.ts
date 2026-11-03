export type AppointmentStatus = 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
export type UserRole = 'superadmin' | 'owner' | 'admin' | 'barber' | 'client';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  address?: string;
  phone?: string;
  currency: string;
  is_active: boolean;
  created_at: string;
  barbers_count?: number;
  appointments_count?: number;
  clients_count?: number;
  admin_email?: string;
}

export interface OrganizationCreateData {
  name: string;
  slug?: string;
  address?: string;
  phone?: string;
  currency?: string;
  admin_name?: string;
  admin_email?: string;
  admin_password?: string;
  clone_default_services?: boolean;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  tenant_id: string;
  barber_id?: string;
  organization?: {
    id: string;
    name: string;
    slug: string;
    address?: string;
    phone?: string;
    currency: string;
  };
}

export interface CashShift {
  id: string;
  tenant_id: string;
  opened_by_user_id: string;
  opened_by_name: string;
  opened_at: string;
  initial_cash: number;
  closed_by_user_id?: string;
  closed_by_name?: string;
  closed_at?: string;
  status: 'open' | 'closed';
  system_cash_sales: number;
  system_qr_sales: number;
  system_total_sales: number;
  expected_cash_in_drawer: number;
  actual_cash_counted: number;
  difference: number;
  notes?: string;
  sales_count?: number;
}

export interface Service {
  id: string;
  name: string;
  category: string;
  duration_minutes: number;
  price: number;
  description?: string;
  is_active: boolean;
}

export interface Barber {
  id: string;
  name: string;
  nickname?: string;
  photo_url?: string;
  phone?: string;
  specialty?: string;
  commission_rate: number;
  rating: number;
  is_active: boolean;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  email?: string;
  notes?: string;
  total_visits: number;
  total_spent: number;
  last_visit?: string;
  created_at: string;
}

export interface Appointment {
  id: string;
  tenant_id?: string;
  client_id?: string;
  client_name: string;
  client_phone: string;
  barber_id: string;
  barber_name: string;
  service_id: string;
  service_name: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  duration_minutes: number;
  price: number;
  status: AppointmentStatus;
  notes?: string;
  created_at: string;
}

export interface Sale {
  id: string;
  tenant_id?: string;
  cash_shift_id?: string;
  appointment_id?: string;
  client_name: string;
  barber_id: string;
  barber_name: string;
  subtotal: number;
  tip: number;
  total: number;
  payment_method: 'cash' | 'qr_simple' | 'card';
  qr_reference_code?: string;
  service_price_snapshot?: number;
  commission_percentage_snapshot?: number;
  commission_amount?: number;
  notes?: string;
  created_at: string;
}

export interface DashboardMetrics {
  date: string;
  revenue_today: number;
  tips_today: number;
  commissions_today?: number;
  sales_count: number;
  total_appointments: number;
  completed_appointments: number;
  in_progress_appointments: number;
  confirmed_appointments: number;
  occupancy_rate_percent: number;
  top_barbers: {
    name: string;
    appointments: number;
    revenue: number;
  }[];
  top_services: {
    name: string;
    count: number;
    revenue: number;
  }[];
  payment_breakdown: {
    method: string;
    total: number;
    count: number;
  }[];
  active_barbers_count: number;
}

export interface BusinessInfo {
  name: string;
  slogan: string;
  phone: string;
  address: string;
  currency: string;
  website: string;
  schedule_start: string;
  schedule_end: string;
  slot_interval_minutes: number;
}
