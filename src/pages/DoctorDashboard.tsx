/**
 * Doctor Executive Clinical, Financial & Management Dashboard (/doctor)
 * Dr. Mohamed Sabra Elnaggar Dental Clinic
 */
import React, { useState, useEffect } from 'react';
import { 
  DollarSign, Users, Calendar, Plus, Search, FileText, CheckCircle2, 
  RefreshCw, Download, ShieldCheck, Printer, Key, Settings, History, 
  Trash2, X, Eye, ArrowUpRight, ArrowDownLeft, CreditCard, Activity,
  AlertCircle, Lock, Database
} from 'lucide-react';
import { ClinicLogo } from '../components/ClinicLogo.tsx';
import type { Patient, Invoice, AuthUser, RevisitCode } from '../types/index.ts';

interface DoctorDashboardProps {
  currentUser: AuthUser;
  onLogout: () => void;
  onNavigate: (path: string) => void;
}

export const DoctorDashboard: React.FC<DoctorDashboardProps> = ({
  currentUser,
  onLogout,
  onNavigate,
}) => {
  // Navigation tabs: 'overview' | 'patients' | 'invoices' | 'revisit_codes' | 'sheets_sync' | 'audit_logs' | 'settings'
  const [activeTab, setActiveTab] = useState<
    'overview' | 'patients' | 'invoices' | 'revisit_codes' | 'sheets_sync' | 'audit_logs' | 'settings'
  >('overview');

  // Executive overview state
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [kpis, setKpis] = useState({
    total_billed: 0,
    total_collected: 0,
    total_receivables: 0,
    total_patients: 0,
    total_appointments: 0,
    active_revisit_codes: 0,
  });
  const [todaySchedule, setTodaySchedule] = useState<any[]>([]);
  const [recentInvoices, setRecentInvoices] = useState<any[]>([]);

  // Patients state
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatientDossier, setSelectedPatientDossier] = useState<any | null>(null);
  const [showAddPatientModal, setShowAddPatientModal] = useState(false);
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientPhone, setNewPatientPhone] = useState('');
  const [newPatientNotes, setNewPatientNotes] = useState('');

  // Invoices state
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [showNewInvoiceModal, setShowNewInvoiceModal] = useState(false);
  const [printableInvoice, setPrintableInvoice] = useState<any | null>(null);
  const [invoicePatientId, setInvoicePatientId] = useState('');
  const [invoiceItems, setInvoiceItems] = useState<
    { service_name: string; quantity: number; unit_price: number; discount: number }[]
  >([
    { service_name: 'تقويم الأسنان المتقدم', quantity: 1, unit_price: 2500, discount: 0 }
  ]);
  const [initialPayment, setInitialPayment] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'instapay' | 'bank_transfer'>('cash');
  const [invoiceNotes, setInvoiceNotes] = useState('');

  // Payment Recording Modal
  const [showPayModal, setShowPayModal] = useState(false);
  const [targetInvoice, setTargetInvoice] = useState<Invoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [recordPayMethod, setRecordPayMethod] = useState<'cash' | 'instapay' | 'bank_transfer'>('cash');
  const [paymentNotes, setPaymentNotes] = useState('');

  // Re-visit Codes state
  const [revisitCodes, setRevisitCodes] = useState<RevisitCode[]>([]);
  const [showNewCodeModal, setShowNewCodeModal] = useState(false);
  const [codePatientId, setCodePatientId] = useState('');
  const [codeDiscountType, setCodeDiscountType] = useState<'full_exemption' | 'fixed_fee'>('full_exemption');
  const [codeFeeAmount, setCodeFeeAmount] = useState<number>(0);
  const [codeChannel, setCodeChannel] = useState<'cash_on_arrival' | 'instapay'>('cash_on_arrival');
  const [codeExpiryDays, setCodeExpiryDays] = useState<number>(30);

  // Sheets Sync state
  const [sheetsData, setSheetsData] = useState<any | null>(null);
  const [syncingNow, setSyncingNow] = useState(false);

  // Audit Logs state
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Settings state
  const [settings, setSettings] = useState<any>({});
  const [savingSettings, setSavingSettings] = useState(false);

  const token = localStorage.getItem('drsabra_token') || '';
  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  // Fetch Overview
  const fetchOverview = async () => {
    try {
      setLoadingOverview(true);
      const res = await fetch('/api/doctor/dashboard', { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        setKpis(data.kpis);
        setTodaySchedule(data.today_schedule || []);
        setRecentInvoices(data.recent_invoices || []);
      }
    } catch (err) {
      console.error('Failed to load doctor dashboard:', err);
    } finally {
      setLoadingOverview(false);
    }
  };

  // Fetch Patients
  const fetchPatients = async () => {
    try {
      const url = patientSearch ? `/api/doctor/patients?search=${encodeURIComponent(patientSearch)}` : '/api/doctor/patients';
      const res = await fetch(url, { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        setPatients(data.patients || []);
      }
    } catch (err) {
      console.error('Failed to fetch patients:', err);
    }
  };

  // Fetch Patient Dossier
  const fetchPatientDossier = async (patientId: string) => {
    try {
      const res = await fetch(`/api/doctor/patients/${patientId}`, { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        setSelectedPatientDossier(data);
      }
    } catch (err) {
      console.error('Failed to fetch patient dossier:', err);
    }
  };

  // Fetch Invoices
  const fetchInvoices = async () => {
    try {
      const res = await fetch('/api/doctor/invoices', { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        setInvoices(data.invoices || []);
      }
    } catch (err) {
      console.error('Failed to fetch invoices:', err);
    }
  };

  // Fetch Revisit Codes
  const fetchRevisitCodes = async () => {
    try {
      const res = await fetch('/api/doctor/revisit-codes', { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        setRevisitCodes(data.revisit_codes || []);
      }
    } catch (err) {
      console.error('Failed to fetch revisit codes:', err);
    }
  };

  // Fetch Sheets Sync
  const fetchSheetsSync = async () => {
    try {
      const res = await fetch('/api/doctor/sheets-sync', { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        setSheetsData(data);
      }
    } catch (err) {
      console.error('Failed to fetch sheets sync:', err);
    }
  };

  // Trigger Sheets Sync
  const handleTriggerSync = async () => {
    try {
      setSyncingNow(true);
      const res = await fetch('/api/doctor/sheets-sync/trigger', { method: 'POST', headers: authHeaders });
      if (res.ok) {
        fetchSheetsSync();
      }
    } catch (err) {
      console.error('Failed to trigger sync:', err);
    } finally {
      setSyncingNow(false);
    }
  };

  // Fetch Audit Logs
  const fetchAuditLogs = async () => {
    try {
      const res = await fetch('/api/doctor/audit-logs', { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.audit_logs || []);
      }
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    }
  };

  // Fetch Settings
  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/doctor/settings', { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings || {});
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    }
  };

  useEffect(() => {
    fetchOverview();
    fetchPatients();
  }, []);

  useEffect(() => {
    if (activeTab === 'patients') fetchPatients();
    if (activeTab === 'invoices') fetchInvoices();
    if (activeTab === 'revisit_codes') fetchRevisitCodes();
    if (activeTab === 'sheets_sync') fetchSheetsSync();
    if (activeTab === 'audit_logs') fetchAuditLogs();
    if (activeTab === 'settings') fetchSettings();
  }, [activeTab]);

  // Handle Add Patient
  const handleAddPatientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/doctor/patients', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          full_name: newPatientName,
          phone: newPatientPhone,
          medical_notes: newPatientNotes,
        }),
      });
      if (res.ok) {
        setShowAddPatientModal(false);
        setNewPatientName('');
        setNewPatientPhone('');
        setNewPatientNotes('');
        fetchPatients();
      }
    } catch (err) {
      console.error('Failed to add patient:', err);
    }
  };

  // Add line item to invoice
  const addInvoiceItem = () => {
    setInvoiceItems([...invoiceItems, { service_name: '', quantity: 1, unit_price: 500, discount: 0 }]);
  };

  const removeInvoiceItem = (index: number) => {
    if (invoiceItems.length > 1) {
      setInvoiceItems(invoiceItems.filter((_, i) => i !== index));
    }
  };

  // Handle Create Invoice
  const handleCreateInvoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/doctor/invoices', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          patient_id: invoicePatientId,
          items: invoiceItems,
          initial_payment_amount: initialPayment,
          initial_payment_method: paymentMethod,
          notes: invoiceNotes,
        }),
      });

      if (res.ok) {
        setShowNewInvoiceModal(false);
        fetchInvoices();
        fetchOverview();
      }
    } catch (err) {
      console.error('Failed to create invoice:', err);
    }
  };

  // Handle Record Payment
  const handleRecordPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetInvoice) return;
    try {
      const res = await fetch('/api/doctor/payments', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          invoice_id: targetInvoice.id,
          amount: paymentAmount,
          payment_method: recordPayMethod,
          notes: paymentNotes,
        }),
      });

      if (res.ok) {
        setShowPayModal(false);
        setTargetInvoice(null);
        fetchInvoices();
        fetchOverview();
      }
    } catch (err) {
      console.error('Failed to record payment:', err);
    }
  };

  // Handle Generate Revisit Code
  const handleGenerateCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/doctor/revisit-codes', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          patient_id: codePatientId,
          discount_type: codeDiscountType,
          fee_amount: codeFeeAmount,
          payment_channel: codeChannel,
          expires_in_days: codeExpiryDays,
        }),
      });

      if (res.ok) {
        setShowNewCodeModal(false);
        fetchRevisitCodes();
        fetchOverview();
      }
    } catch (err) {
      console.error('Failed to generate code:', err);
    }
  };

  // Cancel Revisit Code
  const handleCancelCode = async (id: string) => {
    if (!confirm('هل تريد إلغاء كود الإعادة هذا؟')) return;
    try {
      const res = await fetch(`/api/doctor/revisit-codes/${id}/cancel`, {
        method: 'POST',
        headers: authHeaders,
      });
      if (res.ok) {
        fetchRevisitCodes();
      }
    } catch (err) {
      console.error('Failed to cancel code:', err);
    }
  };

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingSettings(true);
      const res = await fetch('/api/doctor/settings', {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        alert('تم حفظ إعدادات النظام بنجاح');
      }
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleDownloadDb = () => {
    window.open('/api/doctor/download-db', '_blank');
  };

  const handleDownloadSql = () => {
    window.open('/api/doctor/download-sql', '_blank');
  };

  const handleDownloadJsonBackup = () => {
    window.open('/api/doctor/backup', '_blank');
  };

  // Computed Invoice Total
  const invoiceSubtotal = invoiceItems.reduce((acc, item) => acc + (item.quantity * item.unit_price), 0);
  const invoiceDiscount = invoiceItems.reduce((acc, item) => acc + item.discount, 0);
  const invoiceTotal = Math.max(0, invoiceSubtotal - invoiceDiscount);

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#4B4350]">
      {/* Top Bar */}
      <header className="bg-[#2E1B3A] text-white border-b border-[#5A4268] sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ClinicLogo size="sm" variant="badge" inverted={true} />
            <div>
              <span className="text-sm font-bold text-white block">بوابة الدكتور — الإدارة الإكلينيكية والمالية</span>
              <span className="text-[11px] text-[#E8D7A1]">د. محمد صبرة النجار</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/api/doctor/backup"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs text-[#D8CDE0] hover:text-white px-3 py-1.5 rounded-lg border border-white/10 transition-colors"
              title="تصدير نسخة احتياطية كاملة من قاعدة البيانات"
            >
              <Database className="w-3.5 h-3.5 text-[#E8D7A1]" />
              <span>نسخة احتياطية</span>
            </a>
            <button
              onClick={() => onNavigate('/')}
              className="cursor-pointer text-xs text-[#D8CDE0] hover:text-white px-3 py-1.5 rounded-lg border border-white/10 transition-colors"
            >
              عرض الموقع
            </button>
            <button
              onClick={onLogout}
              className="cursor-pointer text-xs font-semibold bg-rose-500/20 text-rose-200 hover:bg-rose-500/30 px-3 py-1.5 rounded-lg transition-colors"
            >
              تسجيل الخروج
            </button>
          </div>
        </div>
      </header>

      {/* Main Layout with Tabs */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Navigation Tabs Bar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-[#D9CCDF] pb-2">
          {[
            { id: 'overview', label: 'نظرة عامة والجدول الإكلينيكي', icon: Activity },
            { id: 'patients', label: 'سجلات المرضى (EMR)', icon: Users },
            { id: 'invoices', label: 'الفواتير والتحصيل المالي', icon: DollarSign },
            { id: 'revisit_codes', label: 'أكواد إعادة الزيارة', icon: Key },
            { id: 'sheets_sync', label: 'مزامنة Google Sheets', icon: FileText },
            { id: 'audit_logs', label: 'سجل العمليات (Audit)', icon: History },
            { id: 'settings', label: 'إعدادات العيادة', icon: Settings },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`cursor-pointer px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-[#4E2E63] text-white shadow-xs'
                    : 'text-[#4B4350] hover:bg-neutral-100'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#E8D7A1]' : 'text-[#6F4785]'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: EXECUTIVE OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Financial & Clinical KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-white border border-[#D9CCDF] shadow-xs space-y-1">
                <span className="text-xs text-neutral-400 font-medium">إجمالي التكاليف المسجلة</span>
                <div className="text-2xl font-extrabold text-[#2E1B3A] font-mono tabular-nums">
                  {kpis.total_billed.toLocaleString()} ج.م
                </div>
                <div className="text-[11px] text-[#6F4785]">إجمالي الفواتير الصادرة</div>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-[#D9CCDF] shadow-xs space-y-1">
                <span className="text-xs text-neutral-400 font-medium">إجمالي التحصيل الفعلي</span>
                <div className="text-2xl font-extrabold text-emerald-700 font-mono tabular-nums">
                  {kpis.total_collected.toLocaleString()} ج.م
                </div>
                <div className="text-[11px] text-emerald-600">سدادات نقدية وإنستاباي</div>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-[#D9CCDF] shadow-xs space-y-1">
                <span className="text-xs text-neutral-400 font-medium">الأرصدة المستحقة (المديونيات)</span>
                <div className="text-2xl font-extrabold text-amber-700 font-mono tabular-nums">
                  {kpis.total_receivables.toLocaleString()} ج.م
                </div>
                <div className="text-[11px] text-amber-600">متبقي على المرضى</div>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-[#D9CCDF] shadow-xs space-y-1">
                <span className="text-xs text-neutral-400 font-medium">قاعدة المرضى المسجلين</span>
                <div className="text-2xl font-extrabold text-[#4E2E63] font-mono tabular-nums">
                  {kpis.total_patients} مريض
                </div>
                <div className="text-[11px] text-neutral-400">أكواد إعادة نشطة: {kpis.active_revisit_codes}</div>
              </div>
            </div>

            {/* Two Column Layout: Today's Clinical Schedule & Recent Financial Records */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Today's Schedule */}
              <div className="p-6 rounded-2xl bg-white border border-[#D9CCDF] shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#D9CCDF]">
                  <h3 className="font-bold text-base text-[#2E1B3A] flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#6F4785]" />
                    <span>جدول كشوفات اليوم</span>
                  </h3>
                  <span className="text-xs font-mono font-bold text-[#4E2E63] px-2.5 py-1 rounded-lg bg-[#FAF7F2]">
                    {todaySchedule.length} موعد اليوم
                  </span>
                </div>

                {todaySchedule.length === 0 ? (
                  <div className="py-8 text-center text-xs text-neutral-400">
                    لا توجد كشوفات مسجلة لهذا اليوم.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {todaySchedule.map((app) => (
                      <div
                        key={app.id}
                        className="p-3.5 rounded-xl border border-[#D9CCDF] hover:border-[#6F4785] transition-colors flex items-center justify-between text-xs"
                      >
                        <div className="space-y-1">
                          <div className="font-bold text-sm text-[#2E1B3A]">{app.patient_name}</div>
                          <div className="text-neutral-500 flex items-center gap-2">
                            <span dir="ltr">{app.patient_phone}</span>
                            <span>•</span>
                            <span className="font-mono text-[#4E2E63]">{app.reference_number}</span>
                          </div>
                          {app.medical_notes && (
                            <div className="text-[11px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded w-fit">
                              ملاحظة: {app.medical_notes}
                            </div>
                          )}
                        </div>
                        <div className="text-left space-y-1">
                          <span className="font-mono font-bold text-base text-[#4E2E63] block">
                            {app.slot_time}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            {app.status === 'confirmed' ? 'مؤكد' : app.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Invoices */}
              <div className="p-6 rounded-2xl bg-white border border-[#D9CCDF] shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#D9CCDF]">
                  <h3 className="font-bold text-base text-[#2E1B3A] flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    <span>أحدث الفواتير والتحصيلات</span>
                  </h3>
                  <button
                    onClick={() => setActiveTab('invoices')}
                    className="cursor-pointer text-xs font-bold text-[#6F4785] hover:underline"
                  >
                    عرض الكل
                  </button>
                </div>

                {recentInvoices.length === 0 ? (
                  <div className="py-8 text-center text-xs text-neutral-400">
                    لم يتم تسجيل فواتير بعد.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentInvoices.map((inv) => (
                      <div
                        key={inv.id}
                        className="p-3.5 rounded-xl border border-[#D9CCDF] flex items-center justify-between text-xs"
                      >
                        <div className="space-y-0.5">
                          <span className="font-bold text-[#2E1B3A]">{inv.patient_name}</span>
                          <span className="text-[11px] text-neutral-400 block font-mono">{inv.invoice_number}</span>
                        </div>
                        <div className="text-left space-y-0.5">
                          <span className="font-mono font-bold text-sm text-[#2E1B3A] block">
                            {inv.total_amount.toLocaleString()} ج.م
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              inv.status === 'paid'
                                ? 'bg-emerald-100 text-emerald-800'
                                : inv.status === 'partial'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {inv.status === 'paid' ? 'مسدد' : inv.status === 'partial' ? `متبقي ${inv.remaining_balance}` : 'غير مسدد'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PATIENTS DIRECTORY (EMR) */}
        {activeTab === 'patients' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-white border border-[#D9CCDF] shadow-xs flex flex-wrap items-center justify-between gap-4">
              <div className="relative">
                <Search className="w-4 h-4 text-neutral-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchPatients()}
                  placeholder="بحث باسم المريض أو الهاتف أو المعرف..."
                  className="pl-3 pr-9 py-2 rounded-xl border border-[#D9CCDF] text-xs w-72 focus:outline-none focus:border-[#6F4785]"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAddPatientModal(true)}
                  className="cursor-pointer px-4 py-2 rounded-xl text-xs font-bold bg-[#4E2E63] text-white hover:bg-[#6F4785] transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>فتح ملف مريض جديد</span>
                </button>
              </div>
            </div>

            {/* Patients Table */}
            <div className="rounded-2xl bg-white border border-[#D9CCDF] shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#FAF7F2] border-b border-[#D9CCDF] text-[#4E2E63] font-bold">
                    <tr>
                      <th className="py-3 px-4">معرف المريض</th>
                      <th className="py-3 px-4">الاسم الثلاثي</th>
                      <th className="py-3 px-4">رقم الهاتف</th>
                      <th className="py-3 px-4">عدد الزيارات</th>
                      <th className="py-3 px-4">إجمالي المطلوب</th>
                      <th className="py-3 px-4">المسدد</th>
                      <th className="py-3 px-4">الرصيد المتبقي</th>
                      <th className="py-3 px-4 text-center">الملف الطبي الكامل</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D9CCDF]/60">
                    {patients.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-neutral-400">
                          لا يوجد مرضى مطابقين للبحث.
                        </td>
                      </tr>
                    ) : (
                      patients.map((pt) => (
                        <tr key={pt.id} className="hover:bg-neutral-50/70 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-[#4E2E63]">{pt.id}</td>
                          <td className="py-3 px-4 font-semibold text-[#2E1B3A]">{pt.full_name}</td>
                          <td className="py-3 px-4 font-mono text-neutral-500" dir="ltr">{pt.phone}</td>
                          <td className="py-3 px-4 font-mono">{pt.visit_count || 0}</td>
                          <td className="py-3 px-4 font-mono">{(pt.total_billed || 0).toLocaleString()} ج.م</td>
                          <td className="py-3 px-4 font-mono text-emerald-700">{(pt.total_paid || 0).toLocaleString()} ج.م</td>
                          <td className="py-3 px-4 font-mono font-bold text-amber-800">
                            {(pt.current_balance || 0).toLocaleString()} ج.م
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => fetchPatientDossier(pt.id)}
                              className="cursor-pointer px-3 py-1 rounded-lg text-xs font-semibold bg-[#E9DFF0] text-[#4E2E63] hover:bg-[#D9CCDF] transition-colors"
                            >
                              عرض السجل الطبي
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: INVOICES & TREATMENT BILLING */}
        {activeTab === 'invoices' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-white border border-[#D9CCDF] shadow-xs flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-[#2E1B3A]">الفواتير الإكلينيكية وسندات القبض</h3>
                <p className="text-xs text-[#4B4350]">إصدار فواتير الخدمات والعلاجات وتسجيل الدفعات النقدية وإنستاباي</p>
              </div>

              <button
                onClick={() => {
                  if (patients.length > 0 && !invoicePatientId) {
                    setInvoicePatientId(patients[0].id);
                  }
                  setShowNewInvoiceModal(true);
                }}
                className="cursor-pointer px-4 py-2 rounded-xl text-xs font-bold bg-[#4E2E63] text-white hover:bg-[#6F4785] transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>إصدار فاتورة علاج جديدة</span>
              </button>
            </div>

            {/* Invoices List Table */}
            <div className="rounded-2xl bg-white border border-[#D9CCDF] shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#FAF7F2] border-b border-[#D9CCDF] text-[#4E2E63] font-bold">
                    <tr>
                      <th className="py-3 px-4">رقم الفاتورة</th>
                      <th className="py-3 px-4">المريض</th>
                      <th className="py-3 px-4">الهاتف</th>
                      <th className="py-3 px-4">الإجمالي المستحق</th>
                      <th className="py-3 px-4">المدفوع</th>
                      <th className="py-3 px-4">المتبقي</th>
                      <th className="py-3 px-4">حالة السداد</th>
                      <th className="py-3 px-4">تاريخ الفاتورة</th>
                      <th className="py-3 px-4 text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D9CCDF]/60">
                    {invoices.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-neutral-400">
                          لا توجد فواتير علاجية مسجلة بعد.
                        </td>
                      </tr>
                    ) : (
                      invoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-neutral-50/70 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-[#4E2E63]">{inv.invoice_number}</td>
                          <td className="py-3 px-4 font-semibold text-[#2E1B3A]">{inv.patient_name}</td>
                          <td className="py-3 px-4 font-mono text-neutral-500" dir="ltr">{inv.patient_phone}</td>
                          <td className="py-3 px-4 font-mono font-bold">{inv.total_amount.toLocaleString()} ج.م</td>
                          <td className="py-3 px-4 font-mono text-emerald-700">{inv.paid_amount.toLocaleString()} ج.م</td>
                          <td className="py-3 px-4 font-mono font-bold text-amber-800">
                            {inv.remaining_balance.toLocaleString()} ج.م
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                inv.status === 'paid'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : inv.status === 'partial'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {inv.status === 'paid' ? 'مسدد بالكامل' : inv.status === 'partial' ? 'سداد جزئي' : 'غير مسدد'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-neutral-400 text-[11px]">{inv.created_at.slice(0, 10)}</td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {inv.remaining_balance > 0 && (
                                <button
                                  onClick={() => {
                                    setTargetInvoice(inv);
                                    setPaymentAmount(inv.remaining_balance);
                                    setShowPayModal(true);
                                  }}
                                  className="cursor-pointer px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                                >
                                  تحصيل دفعة
                                </button>
                              )}
                              <button
                                onClick={() => setPrintableInvoice(inv)}
                                className="cursor-pointer p-1.5 rounded-lg border border-[#D9CCDF] hover:bg-neutral-100 text-[#4E2E63]"
                                title="طباعة الفاتورة"
                              >
                                <Printer className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: REVISIT CODES */}
        {activeTab === 'revisit_codes' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-white border border-[#D9CCDF] shadow-xs flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-[#2E1B3A]">أكواد إعادة الزيارة (Re-visit Codes)</h3>
                <p className="text-xs text-[#4B4350]">
                  توليد أكواد استخدام لمرة واحدة مخصصة لمرضى المتابعة والتقويم مع إعفاء كامل أو رسوم محددة
                </p>
              </div>

              <button
                onClick={() => {
                  if (patients.length > 0 && !codePatientId) {
                    setCodePatientId(patients[0].id);
                  }
                  setShowNewCodeModal(true);
                }}
                className="cursor-pointer px-4 py-2 rounded-xl text-xs font-bold bg-[#4E2E63] text-white hover:bg-[#6F4785] transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>إنشاء كود إعادة لمريض</span>
              </button>
            </div>

            {/* Codes Table */}
            <div className="rounded-2xl bg-white border border-[#D9CCDF] shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#FAF7F2] border-b border-[#D9CCDF] text-[#4E2E63] font-bold">
                    <tr>
                      <th className="py-3 px-4">كود الإعادة</th>
                      <th className="py-3 px-4">المريض المخصص له</th>
                      <th className="py-3 px-4">هاتف المريض</th>
                      <th className="py-3 px-4">نوع الخصم</th>
                      <th className="py-3 px-4">الرسوم المحددة</th>
                      <th className="py-3 px-4">حالة الاستخدام</th>
                      <th className="py-3 px-4">تاريخ الانتهاء</th>
                      <th className="py-3 px-4 text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D9CCDF]/60">
                    {revisitCodes.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-neutral-400">
                          لا توجد أكواد إعادة صادرة حاليًا.
                        </td>
                      </tr>
                    ) : (
                      revisitCodes.map((code) => (
                        <tr key={code.id} className="hover:bg-neutral-50/70 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-base text-[#4E2E63] tracking-wider">
                            {code.code}
                          </td>
                          <td className="py-3 px-4 font-semibold text-[#2E1B3A]">{code.patient_name}</td>
                          <td className="py-3 px-4 font-mono text-neutral-500" dir="ltr">{code.patient_phone}</td>
                          <td className="py-3 px-4">
                            {code.discount_type === 'full_exemption' ? (
                              <span className="px-2 py-0.5 rounded text-[11px] bg-purple-100 text-purple-800 font-bold">
                                إعفاء كامل (عربون 0 ج.م)
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[11px] bg-amber-100 text-amber-800 font-bold">
                                رسوم محددة
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono">{code.fee_amount} ج.م</td>
                          <td className="py-3 px-4">
                            {code.is_used === 1 ? (
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-neutral-200 text-neutral-700">
                                مستخدم (في حجز {code.booking_ref || ''})
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                                متاح للاستخدام
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono text-neutral-400">{code.expires_at || 'بدون انتهاء'}</td>
                          <td className="py-3 px-4 text-center">
                            {code.is_used === 0 && (
                              <button
                                onClick={() => handleCancelCode(code.id)}
                                className="cursor-pointer text-xs text-rose-600 hover:text-rose-800 font-semibold"
                              >
                                إلغاء الكود
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: GOOGLE SHEETS SYNC CONTROL CENTER */}
        {activeTab === 'sheets_sync' && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-white border border-[#D9CCDF] shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-base text-[#2E1B3A]">مركز التحكم في مزامنة Google Sheets API</h3>
                  <p className="text-xs text-[#4B4350] mt-0.5">
                    مزامنة ثنائية منفصلة: شيت السكرتارية (البيانات التشغيلية فقط) وشيت الدكتور (السجلات المالية والطبية).
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleTriggerSync}
                    disabled={syncingNow}
                    className="cursor-pointer px-4 py-2 rounded-xl text-xs font-bold bg-[#4E2E63] text-white hover:bg-[#6F4785] transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${syncingNow ? 'animate-spin' : ''}`} />
                    <span>مزامنة فورية الآن</span>
                  </button>

                  <a
                    href="/api/doctor/export-csv/invoices"
                    className="px-3 py-2 rounded-xl text-xs font-bold bg-white border border-[#D9CCDF] hover:bg-neutral-50 text-[#4E2E63] transition-colors flex items-center gap-1"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>تصدير شيت الدكتور (CSV)</span>
                  </a>

                  <a
                    href="/api/secretary/export-csv"
                    className="px-3 py-2 rounded-xl text-xs font-bold bg-white border border-[#D9CCDF] hover:bg-neutral-50 text-[#4E2E63] transition-colors flex items-center gap-1"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>تصدير شيت السكرتارية (CSV)</span>
                  </a>
                </div>
              </div>

              {/* Status Banner */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-purple-50/70 border border-[#A985BA]/30 text-xs">
                  <span className="text-neutral-400 block">شيت الدكتور المالي</span>
                  <strong className="text-[#4E2E63] text-sm block mt-0.5">محمي (صلاحيات الدكتور فقط)</strong>
                </div>

                <div className="p-3 rounded-xl bg-purple-50/70 border border-[#A985BA]/30 text-xs">
                  <span className="text-neutral-400 block">شيت السكرتارية التشغيلي</span>
                  <strong className="text-[#4E2E63] text-sm block mt-0.5">خالٍ تمامًا من البيانات المالية</strong>
                </div>

                <div className="p-3 rounded-xl bg-purple-50/70 border border-[#A985BA]/30 text-xs">
                  <span className="text-neutral-400 block">معاملات Outbox في الانتظار</span>
                  <strong className="text-[#4E2E63] text-sm block mt-0.5">{sheetsData?.stats?.pending || 0} عملية</strong>
                </div>
              </div>

              {/* Outbox Activity Log */}
              <div className="space-y-2 pt-2">
                <div className="font-bold text-xs text-[#2E1B3A]">سجل طابور الإرسال (Transactional Outbox):</div>
                <div className="rounded-xl border border-[#D9CCDF] overflow-hidden">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-[#FAF7F2] text-[#4E2E63] font-bold">
                      <tr>
                        <th className="p-2.5">المعرف</th>
                        <th className="p-2.5">نوع الكيان</th>
                        <th className="p-2.5">الشيت المستهدف</th>
                        <th className="p-2.5">الحالة</th>
                        <th className="p-2.5">المحاولات</th>
                        <th className="p-2.5">التوقيت</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#D9CCDF]/50">
                      {!sheetsData?.recent_outbox || sheetsData.recent_outbox.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-4 text-center text-neutral-400">
                            لا توجد عمليات مسجلة في الطابور.
                          </td>
                        </tr>
                      ) : (
                        sheetsData.recent_outbox.map((row: any) => (
                          <tr key={row.id} className="hover:bg-neutral-50/50">
                            <td className="p-2.5 font-mono text-[11px]">{row.id.slice(0, 16)}</td>
                            <td className="p-2.5 font-semibold">{row.entity_type}</td>
                            <td className="p-2.5">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${row.target_sheet === 'doctor' ? 'bg-purple-100 text-purple-900' : 'bg-blue-100 text-blue-900'}`}>
                                {row.target_sheet === 'doctor' ? 'شيت الدكتور' : 'شيت السكرتارية'}
                              </span>
                            </td>
                            <td className="p-2.5">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${row.status === 'synced' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                                {row.status === 'synced' ? 'تمت المزامنة' : 'قيد المعالجة'}
                              </span>
                            </td>
                            <td className="p-2.5 font-mono">{row.attempts}</td>
                            <td className="p-2.5 text-neutral-400 text-[11px]">{row.created_at}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: AUDIT LOGS */}
        {activeTab === 'audit_logs' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-white border border-[#D9CCDF] shadow-xs flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-[#2E1B3A]">سجل التدقيق الأمني والعمليات (Audit Trail)</h3>
                <p className="text-xs text-[#4B4350]">توثيق زمني غير قابل للتعديل لكافة الإجراءات الإدارية والمالية والحجوزات</p>
              </div>
              <button
                onClick={fetchAuditLogs}
                className="cursor-pointer p-2 rounded-xl border border-[#D9CCDF] hover:bg-neutral-50 text-[#4E2E63]"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-2xl bg-white border border-[#D9CCDF] shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#FAF7F2] border-b border-[#D9CCDF] text-[#4E2E63] font-bold">
                    <tr>
                      <th className="py-3 px-4">التوقيت</th>
                      <th className="py-3 px-4">نوع العملية</th>
                      <th className="py-3 px-4">المستخدم المسؤول</th>
                      <th className="py-3 px-4">الدور</th>
                      <th className="py-3 px-4">الكيان</th>
                      <th className="py-3 px-4">التفاصيل</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D9CCDF]/60">
                    {auditLogs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-neutral-400">
                          لا توجد سجلات تدقيق مسجلة حتى الآن.
                        </td>
                      </tr>
                    ) : (
                      auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-neutral-50/70 transition-colors">
                          <td className="py-3 px-4 font-mono text-[11px] text-neutral-400">{log.created_at}</td>
                          <td className="py-3 px-4 font-mono font-bold text-[#4E2E63]">{log.action}</td>
                          <td className="py-3 px-4 font-semibold text-[#2E1B3A]">{log.user_name || 'النظام'}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-100 text-neutral-700">
                              {log.user_role || 'system'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-neutral-500">{log.entity_type}</td>
                          <td className="py-3 px-4 font-mono text-[11px] text-neutral-600 max-w-xs truncate">
                            {log.details_json}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: CLINIC SYSTEM SETTINGS */}
        {activeTab === 'settings' && (
          <div className="space-y-6 max-w-3xl">
            <form onSubmit={handleSaveSettings} className="p-6 rounded-2xl bg-white border border-[#D9CCDF] shadow-xs space-y-6">
              <div className="pb-3 border-b border-[#D9CCDF]">
              <h3 className="font-bold text-base text-[#2E1B3A]">إعدادات العيادة والحجز المالي</h3>
              <p className="text-xs text-[#4B4350]">تعديل قيمة العربون وتعليمات إنستاباي وبيانات التواصل</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#2E1B3A] mb-1">قيمة العربون المعتمدة (ج.م)</label>
                <input
                  type="number"
                  value={settings.deposit_amount || 150}
                  onChange={(e) => setSettings({ ...settings, deposit_amount: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl border border-[#D9CCDF] text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2E1B3A] mb-1">رقم هاتف تحويل InstaPay</label>
                <input
                  type="text"
                  dir="ltr"
                  value={settings.instapay_phone || '01093591193'}
                  onChange={(e) => setSettings({ ...settings, instapay_phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[#D9CCDF] text-xs font-mono text-right"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2E1B3A] mb-1">رقم الهاتف الرسمي للعيادة</label>
                <input
                  type="text"
                  dir="ltr"
                  value={settings.clinic_phone || '01093591193'}
                  onChange={(e) => setSettings({ ...settings, clinic_phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[#D9CCDF] text-xs font-mono text-right"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2E1B3A] mb-1">رابط صفحة Facebook الرسمية</label>
                <input
                  type="url"
                  dir="ltr"
                  value={settings.facebook_url || 'https://www.facebook.com/Dr.SabraElnaggar/'}
                  onChange={(e) => setSettings({ ...settings, facebook_url: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[#D9CCDF] text-xs"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#2E1B3A] mb-1">العنوان الإرشادي المعتمد</label>
                <input
                  type="text"
                  value={settings.address_text || 'الشرقية — ديرب نجم، برج الفلسطينية، أمام الكنيسة، الدور الخامس'}
                  onChange={(e) => setSettings({ ...settings, address_text: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[#D9CCDF] text-xs"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-[#D9CCDF] flex justify-end">
              <button
                type="submit"
                disabled={savingSettings}
                className="cursor-pointer px-6 py-2.5 rounded-xl font-bold text-xs bg-[#4E2E63] text-white hover:bg-[#6F4785] transition-colors"
              >
                {savingSettings ? 'جاري الحفظ...' : 'حفظ التعديلات'}
              </button>
            </div>
          </form>

          {/* Database & Hostinger Deployment Card */}
          <div className="p-6 rounded-2xl bg-white border border-[#D9CCDF] shadow-xs space-y-5 max-w-3xl">
            <div className="flex items-center gap-2.5 pb-3 border-b border-[#D9CCDF]">
              <Database className="w-5 h-5 text-[#4E2E63]" />
              <div>
                <h4 className="font-bold text-base text-[#2E1B3A]">إدارة قاعدة البيانات واستضافة هوستنجر (Hostinger)</h4>
                <p className="text-xs text-[#4B4350]">ملفات قاعدة البيانات الجاهزة للتضمين والتصدير والاستيراد المباشر</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 text-xs text-[#4E2E63] space-y-2">
              <div className="font-bold flex items-center gap-1.5 text-sm">
                <span>💡 إرشاد هام بخصوص تنبيه هوستنجر:</span>
              </div>
              <p className="leading-relaxed">
                رسالة <strong className="font-semibold text-[#2E1B3A]">"لا تنس تضمين ملف قاعدة البيانات"</strong> هي رسالة إشعار تلقائية قياسية يظهرها هوستنجر لجميع المواقع لتذكيرك بعدم نسيان ملف قاعدة البيانات.
              </p>
              <p className="leading-relaxed">
                في هذا النظام، قاعدة البيانات مدمجة وتعتمد على محرك <strong className="font-semibold text-[#2E1B3A]">SQLite</strong> الفائق السرعة داخل الملف <strong className="font-mono text-[#2E1B3A]">data/clinic.db</strong>. عند رفع مجلد <strong className="font-mono text-[#2E1B3A]">data</strong> مع ملفات المشروع، سيعمل الموقع وقاعدة البيانات فوراً دون الحاجة لإنشاء MySQL. وإذا كان هوستنجر يطلب ملف SQL، فقد قمنا بتضمين ملف <strong className="font-mono text-[#2E1B3A]">database.sql</strong> جاهزاً تماماً في ملفات المشروع.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={handleDownloadDb}
                className="cursor-pointer p-4 rounded-xl border border-[#4E2E63]/20 bg-[#FAF7F2] hover:bg-[#F3ECE0] text-right transition-colors space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-[#4E2E63]">ملف SQLite الفعلي</span>
                  <Download className="w-4 h-4 text-[#4E2E63]" />
                </div>
                <div className="font-mono text-[11px] text-[#2E1B3A] font-semibold">clinic.db</div>
                <div className="text-[10px] text-neutral-500">الملف الموجود في مجلد data/ الجاهز للرفع على هوستنجر</div>
              </button>

              <button
                type="button"
                onClick={handleDownloadSql}
                className="cursor-pointer p-4 rounded-xl border border-emerald-300 bg-emerald-50/50 hover:bg-emerald-100/50 text-right transition-colors space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-emerald-800">مخطط وكود SQL</span>
                  <Download className="w-4 h-4 text-emerald-700" />
                </div>
                <div className="font-mono text-[11px] text-emerald-900 font-semibold">database.sql</div>
                <div className="text-[10px] text-neutral-500">جاهز للاستيراد في phpMyAdmin أو أي خادم SQL</div>
              </button>

              <button
                type="button"
                onClick={handleDownloadJsonBackup}
                className="cursor-pointer p-4 rounded-xl border border-blue-300 bg-blue-50/50 hover:bg-blue-100/50 text-right transition-colors space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-blue-800">نسخة JSON احتياطية</span>
                  <Download className="w-4 h-4 text-blue-700" />
                </div>
                <div className="font-mono text-[11px] text-blue-900 font-semibold">Clinic_Backup.json</div>
                <div className="text-[10px] text-neutral-500">تفريغ كامل لكافة الجداول والبيانات والإعدادات</div>
              </button>
            </div>
          </div>
        </div>
        )}
      </main>

      {/* Patient Dossier Modal */}
      {selectedPatientDossier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-2xl bg-white rounded-2xl border border-[#D9CCDF] shadow-2xl p-6 space-y-5 text-right max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#D9CCDF]">
              <div>
                <h3 className="font-bold text-lg text-[#2E1B3A]">{selectedPatientDossier.patient.full_name}</h3>
                <span className="text-xs text-neutral-400 font-mono">
                  معرف: {selectedPatientDossier.patient.id} — هاتف: {selectedPatientDossier.patient.phone}
                </span>
              </div>
              <button
                onClick={() => setSelectedPatientDossier(null)}
                className="cursor-pointer p-1 rounded-lg text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Medical notes */}
            <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-200 text-xs text-purple-950 space-y-1">
              <div className="font-bold">الملاحظات الطبية وسجل العلاج:</div>
              <p>{selectedPatientDossier.patient.medical_notes || 'لا توجد ملاحظات طبية خاصة مسجلة.'}</p>
            </div>

            {/* Visits History */}
            <div className="space-y-2">
              <div className="font-bold text-xs text-[#2E1B3A]">سجل الزيارات والحجوزات:</div>
              <div className="rounded-xl border border-[#D9CCDF] overflow-hidden text-xs">
                {selectedPatientDossier.visits.length === 0 ? (
                  <div className="p-4 text-center text-neutral-400">لا توجد زيارات سابقة.</div>
                ) : (
                  <div className="divide-y divide-[#D9CCDF]/50">
                    {selectedPatientDossier.visits.map((v: any) => (
                      <div key={v.id} className="p-3 flex items-center justify-between">
                        <div>
                          <span className="font-bold text-[#2E1B3A] block">{v.appointment_date} ({v.slot_time})</span>
                          <span className="text-[11px] text-neutral-400 font-mono">حجز: {v.reference_number}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {v.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Invoices History */}
            <div className="space-y-2">
              <div className="font-bold text-xs text-[#2E1B3A]">السجل المالي والفواتير:</div>
              <div className="rounded-xl border border-[#D9CCDF] overflow-hidden text-xs">
                {selectedPatientDossier.invoices.length === 0 ? (
                  <div className="p-4 text-center text-neutral-400">لا توجد فواتير مسجلة.</div>
                ) : (
                  <div className="divide-y divide-[#D9CCDF]/50">
                    {selectedPatientDossier.invoices.map((inv: any) => (
                      <div key={inv.id} className="p-3 flex items-center justify-between">
                        <div>
                          <span className="font-bold text-[#2E1B3A] block font-mono">{inv.invoice_number}</span>
                          <span className="text-[11px] text-neutral-400">{inv.created_at.slice(0, 10)}</span>
                        </div>
                        <div className="text-left font-mono">
                          <span className="font-bold block">{inv.total_amount} ج.م</span>
                          <span className="text-[11px] text-amber-700">متبقي: {inv.remaining_balance} ج.م</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Patient Modal */}
      {showAddPatientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <form onSubmit={handleAddPatientSubmit} className="w-full max-w-md bg-white rounded-2xl border border-[#D9CCDF] shadow-2xl p-6 space-y-4 text-right">
            <div className="flex items-center justify-between pb-3 border-b border-[#D9CCDF]">
              <h3 className="font-bold text-base text-[#2E1B3A]">فتح ملف مريض جديد</h3>
              <button
                type="button"
                onClick={() => setShowAddPatientModal(false)}
                className="cursor-pointer p-1 rounded-lg text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#2E1B3A] mb-1">اسم المريض الثلاثي</label>
              <input
                type="text"
                required
                value={newPatientName}
                onChange={(e) => setNewPatientName(e.target.value)}
                placeholder="أحمد محمد علي"
                className="w-full px-3 py-2 rounded-xl border border-[#D9CCDF] text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#2E1B3A] mb-1">رقم الهاتف (11 رقم)</label>
              <input
                type="tel"
                required
                dir="ltr"
                value={newPatientPhone}
                onChange={(e) => setNewPatientPhone(e.target.value)}
                placeholder="010XXXXXXXX"
                className="w-full px-3 py-2 rounded-xl border border-[#D9CCDF] text-xs text-right"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#2E1B3A] mb-1">ملاحظات طبية أو تاريخ مرضي</label>
              <textarea
                rows={3}
                value={newPatientNotes}
                onChange={(e) => setNewPatientNotes(e.target.value)}
                placeholder="حساسية أدوية، حالة تقويم، تاريخ أسنان سابق..."
                className="w-full p-2.5 rounded-xl border border-[#D9CCDF] text-xs"
              ></textarea>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddPatientModal(false)}
                className="cursor-pointer px-4 py-2 rounded-xl text-xs font-semibold text-[#4B4350] hover:bg-neutral-100"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="cursor-pointer px-5 py-2 rounded-xl text-xs font-bold bg-[#4E2E63] text-white hover:bg-[#6F4785]"
              >
                حفظ الملف
              </button>
            </div>
          </form>
        </div>
      )}

      {/* New Invoice Modal */}
      {showNewInvoiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <form onSubmit={handleCreateInvoiceSubmit} className="w-full max-w-2xl bg-white rounded-2xl border border-[#D9CCDF] shadow-2xl p-6 space-y-4 text-right max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#D9CCDF]">
              <h3 className="font-bold text-base text-[#2E1B3A]">إصدار فاتورة علاج جديدة</h3>
              <button
                type="button"
                onClick={() => setShowNewInvoiceModal(false)}
                className="cursor-pointer p-1 rounded-lg text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#2E1B3A] mb-1">المريض</label>
              <select
                value={invoicePatientId}
                onChange={(e) => setInvoicePatientId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#D9CCDF] text-xs bg-white"
              >
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name} ({p.phone})
                  </option>
                ))}
              </select>
            </div>

            {/* Line items */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#2E1B3A]">الخدمات العلاجية المشمولة:</span>
                <button
                  type="button"
                  onClick={addInvoiceItem}
                  className="cursor-pointer text-xs font-bold text-[#6F4785] hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة بند خدمة</span>
                </button>
              </div>

              {invoiceItems.map((item, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-[#FAF7F2] border border-[#D9CCDF] grid grid-cols-12 gap-2 items-center text-xs">
                  <div className="col-span-5">
                    <input
                      type="text"
                      placeholder="اسم الخدمة..."
                      value={item.service_name}
                      onChange={(e) => {
                        const updated = [...invoiceItems];
                        updated[idx].service_name = e.target.value;
                        setInvoiceItems(updated);
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-[#D9CCDF] bg-white text-xs"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      min={1}
                      placeholder="العدد"
                      value={item.quantity}
                      onChange={(e) => {
                        const updated = [...invoiceItems];
                        updated[idx].quantity = parseInt(e.target.value, 10) || 1;
                        setInvoiceItems(updated);
                      }}
                      className="w-full px-2 py-1.5 rounded-lg border border-[#D9CCDF] bg-white text-xs font-mono"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      min={0}
                      placeholder="السعر"
                      value={item.unit_price}
                      onChange={(e) => {
                        const updated = [...invoiceItems];
                        updated[idx].unit_price = parseFloat(e.target.value) || 0;
                        setInvoiceItems(updated);
                      }}
                      className="w-full px-2 py-1.5 rounded-lg border border-[#D9CCDF] bg-white text-xs font-mono"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      min={0}
                      placeholder="الخصم"
                      value={item.discount}
                      onChange={(e) => {
                        const updated = [...invoiceItems];
                        updated[idx].discount = parseFloat(e.target.value) || 0;
                        setInvoiceItems(updated);
                      }}
                      className="w-full px-2 py-1.5 rounded-lg border border-[#D9CCDF] bg-white text-xs font-mono"
                    />
                  </div>
                  <div className="col-span-1 text-center">
                    <button
                      type="button"
                      onClick={() => removeInvoiceItem(idx)}
                      className="cursor-pointer text-rose-500 hover:text-rose-700"
                    >
                      <Trash2 className="w-4 h-4 mx-auto" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Calculations Summary */}
            <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-200 text-xs space-y-1">
              <div className="flex justify-between">
                <span>المجموع الفرعي:</span>
                <strong className="font-mono">{invoiceSubtotal.toLocaleString()} ج.م</strong>
              </div>
              <div className="flex justify-between text-rose-700">
                <span>إجمالي الخصومات:</span>
                <strong className="font-mono">{invoiceDiscount.toLocaleString()} ج.م</strong>
              </div>
              <div className="flex justify-between text-[#4E2E63] text-sm font-bold pt-1 border-t border-purple-200">
                <span>المستحق النهائي:</span>
                <span className="font-mono">{invoiceTotal.toLocaleString()} ج.م</span>
              </div>
            </div>

            {/* Initial Payment */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#2E1B3A] mb-1">الدفعة المسددة الآن (ج.م)</label>
                <input
                  type="number"
                  min={0}
                  max={invoiceTotal}
                  value={initialPayment}
                  onChange={(e) => setInitialPayment(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl border border-[#D9CCDF] text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2E1B3A] mb-1">طريقة سداد الدفعة</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-[#D9CCDF] text-xs bg-white"
                >
                  <option value="cash">نقدي (كاش)</option>
                  <option value="instapay">InstaPay</option>
                  <option value="bank_transfer">تحويل بنكي</option>
                </select>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowNewInvoiceModal(false)}
                className="cursor-pointer px-4 py-2 rounded-xl text-xs font-semibold text-[#4B4350] hover:bg-neutral-100"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="cursor-pointer px-6 py-2 rounded-xl text-xs font-bold bg-[#4E2E63] text-white hover:bg-[#6F4785]"
              >
                حفظ وإصدار الفاتورة
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Record Payment Modal */}
      {showPayModal && targetInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <form onSubmit={handleRecordPaymentSubmit} className="w-full max-w-md bg-white rounded-2xl border border-[#D9CCDF] shadow-2xl p-6 space-y-4 text-right">
            <div className="flex items-center justify-between pb-3 border-b border-[#D9CCDF]">
              <h3 className="font-bold text-base text-[#2E1B3A]">تسجيل دفعة نقدية / تحويل</h3>
              <button
                type="button"
                onClick={() => setShowPayModal(false)}
                className="cursor-pointer p-1 rounded-lg text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-[#FAF7F2] text-xs space-y-1">
              <div>المريض: <strong>{targetInvoice.patient_name}</strong></div>
              <div>الفاتورة: <strong className="font-mono">{targetInvoice.invoice_number}</strong></div>
              <div>المتبقي المطلوب: <strong className="font-mono text-amber-800">{targetInvoice.remaining_balance} ج.م</strong></div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#2E1B3A] mb-1">المبلغ المحصل (ج.م)</label>
              <input
                type="number"
                required
                min={1}
                max={targetInvoice.remaining_balance}
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl border border-[#D9CCDF] text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#2E1B3A] mb-1">وسيلة السداد</label>
              <select
                value={recordPayMethod}
                onChange={(e) => setRecordPayMethod(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-[#D9CCDF] text-xs bg-white"
              >
                <option value="cash">نقدي (كاش في العيادة)</option>
                <option value="instapay">InstaPay</option>
                <option value="bank_transfer">تحويل بنكي</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#2E1B3A] mb-1">ملاحظة أو رقم مرجعي (اختياري)</label>
              <input
                type="text"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder="رقم مرجع التحويل..."
                className="w-full px-3 py-2 rounded-xl border border-[#D9CCDF] text-xs"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowPayModal(false)}
                className="cursor-pointer px-4 py-2 rounded-xl text-xs font-semibold text-[#4B4350] hover:bg-neutral-100"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="cursor-pointer px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                تأكيد وتسجيل الدفعة
              </button>
            </div>
          </form>
        </div>
      )}

      {/* New Re-visit Code Modal */}
      {showNewCodeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <form onSubmit={handleGenerateCodeSubmit} className="w-full max-w-md bg-white rounded-2xl border border-[#D9CCDF] shadow-2xl p-6 space-y-4 text-right">
            <div className="flex items-center justify-between pb-3 border-b border-[#D9CCDF]">
              <h3 className="font-bold text-base text-[#2E1B3A]">توليد كود إعادة زيارة جديد</h3>
              <button
                type="button"
                onClick={() => setShowNewCodeModal(false)}
                className="cursor-pointer p-1 rounded-lg text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#2E1B3A] mb-1">المريض المستفيد</label>
              <select
                value={codePatientId}
                onChange={(e) => setCodePatientId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#D9CCDF] text-xs bg-white"
              >
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name} ({p.phone})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#2E1B3A] mb-1">نوع الكود والإعفاء</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCodeDiscountType('full_exemption')}
                  className={`cursor-pointer p-2 rounded-xl border text-xs font-bold transition-all ${
                    codeDiscountType === 'full_exemption'
                      ? 'bg-[#4E2E63] text-white border-[#4E2E63]'
                      : 'bg-white border-[#D9CCDF] text-[#4B4350]'
                  }`}
                >
                  إعفاء كامل (عربون 0 ج.م)
                </button>
                <button
                  type="button"
                  onClick={() => setCodeDiscountType('fixed_fee')}
                  className={`cursor-pointer p-2 rounded-xl border text-xs font-bold transition-all ${
                    codeDiscountType === 'fixed_fee'
                      ? 'bg-[#4E2E63] text-white border-[#4E2E63]'
                      : 'bg-white border-[#D9CCDF] text-[#4B4350]'
                  }`}
                >
                  رسوم محددة مخفضة
                </button>
              </div>
            </div>

            {codeDiscountType === 'fixed_fee' && (
              <div>
                <label className="block text-xs font-bold text-[#2E1B3A] mb-1">قيمة الرسوم المطلوبة (ج.م)</label>
                <input
                  type="number"
                  min={0}
                  value={codeFeeAmount}
                  onChange={(e) => setCodeFeeAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl border border-[#D9CCDF] text-xs font-mono"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-[#2E1B3A] mb-1">صلاحية الكود (أيام)</label>
              <input
                type="number"
                min={1}
                max={365}
                value={codeExpiryDays}
                onChange={(e) => setCodeExpiryDays(parseInt(e.target.value, 10) || 30)}
                className="w-full px-3 py-2 rounded-xl border border-[#D9CCDF] text-xs font-mono"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowNewCodeModal(false)}
                className="cursor-pointer px-4 py-2 rounded-xl text-xs font-semibold text-[#4B4350] hover:bg-neutral-100"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="cursor-pointer px-5 py-2 rounded-xl text-xs font-bold bg-[#4E2E63] text-white hover:bg-[#6F4785]"
              >
                توليد الكود الآمن
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Luxury Printable Invoice Modal */}
      {printableInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6 text-right print:shadow-none print:border-none print:p-0">
            <div className="flex items-center justify-between pb-4 border-b border-[#D9CCDF] no-print">
              <span className="text-xs font-bold text-[#4E2E63]">معاينة الفاتورة للطباعة</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="cursor-pointer px-3 py-1.5 rounded-lg text-xs font-bold bg-[#4E2E63] text-white flex items-center gap-1"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>طباعة الآن</span>
                </button>
                <button
                  onClick={() => setPrintableInvoice(null)}
                  className="cursor-pointer p-1 rounded-lg text-neutral-400 hover:text-neutral-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Official Invoice Voucher */}
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-4 border-b-2 border-[#4E2E63]">
                <ClinicLogo size="sm" variant="full" inverted={false} />
                <div className="text-left font-mono">
                  <div className="font-bold text-sm text-[#4E2E63]">{printableInvoice.invoice_number}</div>
                  <div className="text-[11px] text-neutral-500">{printableInvoice.created_at.slice(0, 10)}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs bg-[#FAF7F2] p-3 rounded-xl border border-[#D9CCDF]">
                <div>المريض: <strong className="text-[#2E1B3A]">{printableInvoice.patient_name}</strong></div>
                <div>الهاتف: <strong className="text-[#2E1B3A]" dir="ltr">{printableInvoice.patient_phone}</strong></div>
                <div>العيادة: <strong>ديرب نجم، برج الفلسطينية، د5</strong></div>
                <div>الطبيب: <strong>د. محمد صبرة النجار</strong></div>
              </div>

              {/* Items summary */}
              <div className="py-2 border-y border-[#D9CCDF] space-y-2 text-xs">
                <div className="flex justify-between font-bold text-[#4E2E63]">
                  <span>الخدمة العلاجية المقدمة</span>
                  <span>المبلغ</span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>خدمات رعاية وتقويم وجراحة الأسنان</span>
                  <span className="font-mono">{printableInvoice.total_amount} ج.م</span>
                </div>
              </div>

              <div className="space-y-1 text-xs pt-1">
                <div className="flex justify-between">
                  <span>المسدد فعليًا:</span>
                  <strong className="font-mono text-emerald-700">{printableInvoice.paid_amount} ج.م</strong>
                </div>
                <div className="flex justify-between text-base font-bold text-[#4E2E63] pt-2 border-t border-[#D9CCDF]">
                  <span>الرصيد المتبقي:</span>
                  <span className="font-mono text-amber-800">{printableInvoice.remaining_balance} ج.م</span>
                </div>
              </div>

              <div className="text-[10px] text-center text-neutral-400 pt-4 border-t border-[#D9CCDF]">
                شكرًا لثقتكم بعيادة د. محمد صبرة النجار — هاتف الاستعلامات: 01093591193
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
