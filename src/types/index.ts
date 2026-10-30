export interface Branch {
  id: string;
  name_ar: string;
  name_en: string;
  city: string;
  address_ar: string;
  phone: string;
  maps_url: string;
  plus_code: string;
  deposit_amount: number;
  instapay_phone: string;
  daily_open_time: string;
  daily_close_time: string;
  slot_duration_minutes: number;
  slot_capacity: number;
  is_active: number;
}

export interface Service {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  category: string;
  base_price: number;
  description_ar: string;
  is_active: number;
}

export interface ToothRecord {
  tooth_number: number;
  condition: 'healthy' | 'caries' | 'filling' | 'rct' | 'extracted' | 'crown' | 'implant';
  notes?: string;
  updated_at?: string;
}

export interface Appointment {
  id: string;
  reference_number: string;
  branch_id: string;
  branch_name?: string;
  branch_city?: string;
  patient_id?: string;
  patient_name: string;
  patient_phone: string;
  appointment_date: string;
  slot_time: string;
  service_id?: string;
  service_name?: string;
  instapay_phone?: string;
  receipt_url?: string;
  deposit_amount: number;
  deposit_status: 'unpaid' | 'pending_verification' | 'verified' | 'rejected' | 'exempted';
  status: 'pending_review' | 'pending_payment' | 'confirmed' | 'rejected' | 'cancelled' | 'completed' | 'no_show';
  revisit_code?: string;
  rejection_reason?: string;
  notes?: string;
  is_walkin?: number;
  payment_method?: string;
  rescheduled_from?: string;
  rescheduled_at?: string;
  check_in_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface SlotItem {
  time: string;
  capacity: number;
  booked_count: number;
  remaining_capacity: number;
  is_available: boolean;
  is_closed: boolean;
  closed_reason?: string;
  tag?: string | null;
}

export interface Patient {
  id: string;
  full_name: string;
  phone: string;
  email?: string;
  age?: number;
  gender?: string;
  medical_notes?: string;
  chronic_diseases?: string;
  allergies?: string;
  visit_count?: number;
  total_billed?: number;
  total_paid?: number;
  current_balance?: number;
  created_at: string;
  updated_at: string;
}

export interface InvoiceItem {
  id?: string;
  service_id?: string;
  service_name: string;
  quantity: number;
  unit_price: number;
  discount: number;
  total: number;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  patient_id: string;
  patient_name?: string;
  patient_phone?: string;
  appointment_id?: string;
  branch_id?: string;
  branch_name?: string;
  booking_ref?: string;
  subtotal: number;
  total_discount: number;
  deposit_deducted: number;
  total_amount: number;
  paid_amount: number;
  remaining_balance: number;
  status: 'unpaid' | 'partial' | 'paid';
  notes?: string;
  items?: InvoiceItem[];
  created_at: string;
}

export interface Payment {
  id: string;
  invoice_id: string;
  patient_id: string;
  amount: number;
  payment_method: 'cash' | 'instapay' | 'bank_transfer' | 'visa';
  transaction_ref?: string;
  notes?: string;
  recorded_by_id: string;
  created_at: string;
}

export interface RevisitCode {
  id: string;
  code: string;
  patient_id?: string | null;
  patient_name?: string;
  patient_phone?: string;
  discount_type: 'full_exemption' | 'fixed_fee';
  fee_amount: number;
  payment_channel: 'cash_on_arrival' | 'instapay';
  max_uses: number;
  used_count: number;
  is_used: number;
  used_at?: string;
  used_by_appointment_id?: string;
  booking_ref?: string;
  expires_at?: string;
  created_at: string;
}

export interface AuthUser {
  id: string;
  username: string;
  full_name: string;
  role: 'doctor' | 'secretary' | 'admin';
  phone?: string;
}

export interface AuditLogItem {
  id: string;
  user_id?: string;
  user_role?: string;
  user_name?: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  details_json?: string;
  ip_address?: string;
  created_at: string;
}
