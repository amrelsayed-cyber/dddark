/**
 * Secretary Operational Dashboard (/secretary)
 * Dr. Mohamed Sabra Elnaggar Dental Clinic
 */
import React, { useState, useEffect } from 'react';
import { 
  Calendar, Clock, CheckCircle2, XCircle, AlertCircle, Search, 
  Filter, Plus, RefreshCw, Download, User, Phone, Check, X, Shield, 
  ChevronDown, FileSpreadsheet, AlertTriangle, Eye
} from 'lucide-react';
import { ClinicLogo } from '../components/ClinicLogo.tsx';
import type { Appointment, AuthUser } from '../types/index.ts';

interface SecretaryDashboardProps {
  currentUser: AuthUser;
  onLogout: () => void;
  onNavigate: (path: string) => void;
}

export const SecretaryDashboard: React.FC<SecretaryDashboardProps> = ({
  currentUser,
  onLogout,
  onNavigate,
}) => {
  // Tabs: 'appointments' | 'slots' | 'sheets'
  const [activeTab, setActiveTab] = useState<'appointments' | 'slots' | 'sheets'>('appointments');

  // Operational metrics
  const [metrics, setMetrics] = useState({
    today_appointments: 0,
    pending_payment_reviews: 0,
    confirmed_upcoming: 0,
    total_new_requests: 0,
  });
  const [todayStr, setTodayStr] = useState('');

  // Appointments state
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // InstaPay Review Modal
  const [selectedAppForReview, setSelectedAppForReview] = useState<Appointment | null>(null);
  const [reviewDecision, setReviewDecision] = useState<'verified' | 'rejected'>('verified');
  const [reviewReason, setReviewReason] = useState('');
  const [reviewing, setReviewing] = useState(false);

  // Slots management
  const [slotsDate, setSlotsDate] = useState('');
  const [slotsList, setSlotsList] = useState<any[]>([]);
  const [exceptionsList, setExceptionsList] = useState<any[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [newSlotTime, setNewSlotTime] = useState('16:00');
  const [newSlotNotes, setNewSlotNotes] = useState('تم إضافته بواسطة السكرتارية');
  const [closeDayReason, setCloseDayReason] = useState('');

  // Sheets Sync state
  const [syncLogs, setSyncLogs] = useState<any[]>([]);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  // Auth token
  const token = localStorage.getItem('drsabra_token') || '';

  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  // Fetch Dashboard Metrics
  const fetchDashboard = async () => {
    try {
      const res = await fetch('/api/secretary/dashboard', { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        setMetrics(data.metrics || {
          today_appointments: data.metrics?.today_count || 0,
          pending_payment_reviews: data.metrics?.pending_reviews || 0,
          confirmed_upcoming: data.metrics?.confirmed_upcoming || 0,
          total_new_requests: data.metrics?.today_count || 0,
        });
        setTodayStr(data.today);
        if (!slotsDate) setSlotsDate(data.today);
      }
    } catch (err) {
      console.error('Failed to fetch secretary dashboard:', err);
    }
  };

  // Fetch Appointments
  const fetchAppointments = async () => {
    try {
      setLoadingApps(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (dateFilter) params.append('date', dateFilter);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      const res = await fetch(`/api/secretary/appointments?${params.toString()}`, { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        setAppointments(data.appointments || []);
      }
    } catch (err) {
      console.error('Failed to fetch appointments:', err);
    } finally {
      setLoadingApps(false);
    }
  };

  // Fetch Slots
  const fetchSlots = async () => {
    if (!slotsDate) return;
    try {
      setSlotsLoading(true);
      const res = await fetch(`/api/secretary/slots?date=${slotsDate}`, { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        setSlotsList(data.slots || []);
        setExceptionsList(data.exceptions || []);
      }
    } catch (err) {
      console.error('Failed to fetch slots:', err);
    } finally {
      setSlotsLoading(false);
    }
  };

  // Fetch Sheets Sync status
  const fetchSheetsStatus = async () => {
    try {
      const res = await fetch('/api/secretary/sheets-sync-status', { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        setSyncLogs(data.recent_outbox || []);
        setLastSyncTime(data.last_sync);
      }
    } catch (err) {
      console.error('Failed to fetch sheets sync status:', err);
    }
  };

  useEffect(() => {
    fetchDashboard();
    fetchAppointments();
  }, [statusFilter, dateFilter]);

  useEffect(() => {
    if (activeTab === 'slots') fetchSlots();
    if (activeTab === 'sheets') fetchSheetsStatus();
  }, [activeTab, slotsDate]);

  // Handle Review Submit
  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppForReview) return;
    setReviewing(true);

    try {
      const res = await fetch(`/api/secretary/appointments/${selectedAppForReview.id}/review-payment`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          decision: reviewDecision,
          reason: reviewReason || undefined,
        }),
      });

      if (res.ok) {
        setSelectedAppForReview(null);
        setReviewReason('');
        fetchDashboard();
        fetchAppointments();
      }
    } catch (err) {
      console.error('Failed to review payment:', err);
    } finally {
      setReviewing(false);
    }
  };

  // Handle Quick Status Change
  const handleStatusChange = async (appId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/secretary/appointments/${appId}/status`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchAppointments();
        fetchDashboard();
      }
    } catch (err) {
      console.error('Failed to change appointment status:', err);
    }
  };

  // Add Emergency Slot
  const handleAddSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/secretary/slots', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          slot_date: slotsDate,
          start_time: newSlotTime,
          admin_notes: newSlotNotes,
        }),
      });
      if (res.ok) {
        fetchSlots();
      }
    } catch (err) {
      console.error('Failed to add slot:', err);
    }
  };

  // Close Day
  const handleCloseDay = async () => {
    if (!slotsDate) return;
    if (!confirm(`هل أنت متأكد من إغلاق يوم ${slotsDate} بالكامل؟`)) return;

    try {
      const res = await fetch('/api/secretary/slots/close-day', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          exception_date: slotsDate,
          reason: closeDayReason || 'إغلاق من السكرتارية',
        }),
      });
      if (res.ok) {
        setCloseDayReason('');
        fetchSlots();
      }
    } catch (err) {
      console.error('Failed to close day:', err);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    window.location.href = '/api/secretary/export-csv';
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#4B4350]">
      {/* Top Secretary Navigation Bar */}
      <header className="bg-[#4E2E63] text-white border-b border-[#5A4268] sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ClinicLogo size="sm" variant="badge" inverted={true} />
            <div>
              <span className="text-sm font-bold text-white block">بوابة السكرتارية — الإدارة التشغيلية</span>
              <span className="text-[11px] text-[#D8CDE0]">المستخدم: {currentUser.full_name}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
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

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white border border-[#D9CCDF] shadow-xs">
            <div className="text-xs text-neutral-400 font-medium">حجوزات اليوم</div>
            <div className="text-2xl font-bold text-[#2E1B3A] mt-1 font-mono tabular-nums">
              {metrics.today_appointments}
            </div>
            <div className="text-[10px] text-emerald-600 mt-1">تاريخ: {todayStr}</div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-[#D9CCDF] shadow-xs">
            <div className="text-xs text-neutral-400 font-medium">تحويلات تنتظر المراجعة</div>
            <div className="text-2xl font-bold text-amber-600 mt-1 font-mono tabular-nums">
              {metrics.pending_payment_reviews}
            </div>
            <div className="text-[10px] text-amber-700 mt-1">عربون InstaPay</div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-[#D9CCDF] shadow-xs">
            <div className="text-xs text-neutral-400 font-medium">حجوزات مؤكدة قادمة</div>
            <div className="text-2xl font-bold text-[#4E2E63] mt-1 font-mono tabular-nums">
              {metrics.confirmed_upcoming}
            </div>
            <div className="text-[10px] text-[#6F4785] mt-1">جاهزة للكشف</div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-[#D9CCDF] shadow-xs">
            <div className="text-xs text-neutral-400 font-medium">إجمالي الطلبات الجديدة</div>
            <div className="text-2xl font-bold text-[#2E1B3A] mt-1 font-mono tabular-nums">
              {metrics.total_new_requests}
            </div>
            <div className="text-[10px] text-neutral-400 mt-1">قيد المتابعة</div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 border-b border-[#D9CCDF] pb-2">
          <button
            onClick={() => setActiveTab('appointments')}
            className={`cursor-pointer px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
              activeTab === 'appointments'
                ? 'bg-[#4E2E63] text-white shadow-xs'
                : 'text-[#4B4350] hover:bg-neutral-100'
            }`}
          >
            سجل الحجوزات والمراجعات
          </button>
          <button
            onClick={() => setActiveTab('slots')}
            className={`cursor-pointer px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
              activeTab === 'slots'
                ? 'bg-[#4E2E63] text-white shadow-xs'
                : 'text-[#4B4350] hover:bg-neutral-100'
            }`}
          >
            إدارة المواعيد والاستثناءات
          </button>
          <button
            onClick={() => setActiveTab('sheets')}
            className={`cursor-pointer px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
              activeTab === 'sheets'
                ? 'bg-[#4E2E63] text-white shadow-xs'
                : 'text-[#4B4350] hover:bg-neutral-100'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>مزامنة Google Sheets (السكرتارية)</span>
          </button>
        </div>

        {/* TAB 1: APPOINTMENTS TABLE */}
        {activeTab === 'appointments' && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="p-4 rounded-2xl bg-white border border-[#D9CCDF] shadow-xs flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                {/* Search */}
                <div className="relative">
                  <Search className="w-4 h-4 text-neutral-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && fetchAppointments()}
                    placeholder="بحث بالاسم، الهاتف، كود الحجز..."
                    className="pl-3 pr-9 py-1.5 rounded-xl border border-[#D9CCDF] text-xs w-60 focus:outline-none focus:border-[#6F4785]"
                  />
                </div>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-[#D9CCDF] text-xs bg-white text-[#4B4350] focus:outline-none focus:border-[#6F4785]"
                >
                  <option value="all">كل الحالات</option>
                  <option value="pending_review">في انتظار المراجعة</option>
                  <option value="confirmed">مؤكد</option>
                  <option value="completed">تمت الزيارة</option>
                  <option value="rejected">مرفوض</option>
                  <option value="no_show">لم يحضر</option>
                  <option value="cancelled">ملغي</option>
                </select>

                {/* Date Filter */}
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-[#D9CCDF] text-xs bg-white text-[#4B4350] focus:outline-none focus:border-[#6F4785]"
                />

                {(statusFilter !== 'all' || dateFilter || searchQuery) && (
                  <button
                    onClick={() => {
                      setStatusFilter('all');
                      setDateFilter('');
                      setSearchQuery('');
                    }}
                    className="cursor-pointer text-xs text-rose-600 hover:underline"
                  >
                    إعادة ضبط
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={fetchAppointments}
                  className="cursor-pointer p-2 rounded-xl border border-[#D9CCDF] hover:bg-neutral-50 text-[#4E2E63] transition-colors"
                  title="تحديث الجدول"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button
                  onClick={handleExportCSV}
                  className="cursor-pointer flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[#4E2E63] text-white hover:bg-[#6F4785] transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>تصدير CSV</span>
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="rounded-2xl bg-white border border-[#D9CCDF] shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#FAF7F2] border-b border-[#D9CCDF] text-[#4E2E63] font-bold">
                    <tr>
                      <th className="py-3 px-4">رقم الحجز</th>
                      <th className="py-3 px-4">اسم المريض</th>
                      <th className="py-3 px-4">رقم الهاتف</th>
                      <th className="py-3 px-4">تاريخ الموعد</th>
                      <th className="py-3 px-4">الوقت</th>
                      <th className="py-3 px-4">العربون / InstaPay</th>
                      <th className="py-3 px-4">حالة الحجز</th>
                      <th className="py-3 px-4 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D9CCDF]/60">
                    {loadingApps ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-neutral-400">
                          جاري تحميل الحجوزات...
                        </td>
                      </tr>
                    ) : appointments.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-neutral-400">
                          لا توجد حجوزات مطابقة للبحث أو الفلتر المحدد.
                        </td>
                      </tr>
                    ) : (
                      appointments.map((app) => (
                        <tr key={app.id} className="hover:bg-neutral-50/70 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-[#4E2E63]">
                            {app.reference_number}
                            {app.revisit_code && (
                              <span className="block text-[10px] text-purple-700 font-normal">
                                كود: {app.revisit_code}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-semibold text-[#2E1B3A]">
                            {app.patient_name}
                          </td>
                          <td className="py-3 px-4 font-mono text-neutral-500" dir="ltr">
                            {app.patient_phone}
                          </td>
                          <td className="py-3 px-4 font-medium">{app.appointment_date}</td>
                          <td className="py-3 px-4 font-mono font-semibold text-[#4E2E63]">{app.slot_time}</td>
                          <td className="py-3 px-4">
                            {app.deposit_status === 'exempted' ? (
                              <span className="px-2 py-0.5 rounded text-[11px] bg-purple-100 text-purple-800 font-medium">
                                معفى (كود إعادة)
                              </span>
                            ) : app.deposit_status === 'verified' ? (
                              <span className="px-2 py-0.5 rounded text-[11px] bg-emerald-100 text-emerald-800 font-medium">
                                تم تأكيد {app.deposit_amount} ج.م
                              </span>
                            ) : app.deposit_status === 'rejected' ? (
                              <span className="px-2 py-0.5 rounded text-[11px] bg-rose-100 text-rose-800 font-medium">
                                مرفوض الدفع
                              </span>
                            ) : (
                              <div className="space-y-0.5">
                                <span className="px-2 py-0.5 rounded text-[11px] bg-amber-100 text-amber-800 font-medium block w-fit">
                                  في الانتظار ({app.deposit_amount} ج.م)
                                </span>
                                {app.instapay_phone && (
                                  <span className="text-[10px] text-neutral-400 block font-mono" dir="ltr">
                                    من: {app.instapay_phone}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                app.status === 'confirmed'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : app.status === 'completed'
                                  ? 'bg-blue-100 text-blue-800'
                                  : app.status === 'rejected'
                                  ? 'bg-rose-100 text-rose-800'
                                  : app.status === 'no_show'
                                  ? 'bg-neutral-200 text-neutral-700'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {app.status === 'confirmed'
                                ? 'مؤكد'
                                : app.status === 'completed'
                                ? 'تمت الزيارة'
                                : app.status === 'rejected'
                                ? 'مرفوض'
                                : app.status === 'no_show'
                                ? 'لم يحضر'
                                : 'قيد المراجعة'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {app.deposit_status === 'pending_verification' && (
                                <button
                                  onClick={() => {
                                    setSelectedAppForReview(app);
                                    setReviewDecision('verified');
                                  }}
                                  className="cursor-pointer px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#6F4785] text-white hover:bg-[#4E2E63] transition-colors"
                                >
                                  مراجعة التحويل
                                </button>
                              )}

                              {/* Status changer dropdown */}
                              <select
                                value={app.status}
                                onChange={(e) => handleStatusChange(app.id, e.target.value)}
                                className="px-2 py-1 rounded-lg border border-[#D9CCDF] text-[11px] bg-white text-[#4B4350]"
                              >
                                <option value="pending_review">قيد المراجعة</option>
                                <option value="confirmed">مؤكد</option>
                                <option value="completed">تمت الزيارة</option>
                                <option value="no_show">لم يحضر</option>
                                <option value="cancelled">إلغاء</option>
                              </select>
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

        {/* TAB 2: SLOTS & EXCEPTIONS MANAGEMENT */}
        {activeTab === 'slots' && (
          <div className="space-y-6">
            <div className="p-4 rounded-2xl bg-white border border-[#D9CCDF] shadow-xs flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <label className="text-xs font-bold text-[#2E1B3A]">عرض مواعيد يوم:</label>
                <input
                  type="date"
                  value={slotsDate}
                  onChange={(e) => setSlotsDate(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-[#D9CCDF] text-xs bg-white text-[#4B4350]"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="سبب إغلاق اليوم..."
                  value={closeDayReason}
                  onChange={(e) => setCloseDayReason(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-[#D9CCDF] text-xs w-48"
                />
                <button
                  type="button"
                  onClick={handleCloseDay}
                  className="cursor-pointer px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition-colors"
                >
                  إغلاق هذا اليوم بالكامل
                </button>
              </div>
            </div>

            {/* Exceptions notice */}
            {exceptionsList.length > 0 && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-700" />
                  <span>تنبيه استثناءات اليوم:</span>
                </div>
                {exceptionsList.map((exc) => (
                  <p key={exc.id}>• {exc.reason || 'يوم مغلق بقرار إداري'}</p>
                ))}
              </div>
            )}

            {/* Add Custom / Emergency Slot Form */}
            <form onSubmit={handleAddSlot} className="p-5 rounded-2xl bg-white border border-[#D9CCDF] shadow-xs space-y-4">
              <div className="font-bold text-sm text-[#2E1B3A]">إضافة موعد استثنائي أو طارئ لهذا اليوم:</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#4B4350] mb-1">وقت الموعد (HH:MM)</label>
                  <input
                    type="time"
                    required
                    value={newSlotTime}
                    onChange={(e) => setNewSlotTime(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-[#D9CCDF] text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#4B4350] mb-1">ملاحظة إدارية للموعد</label>
                  <input
                    type="text"
                    value={newSlotNotes}
                    onChange={(e) => setNewSlotNotes(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-[#D9CCDF] text-xs"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    className="cursor-pointer w-full py-2 px-4 rounded-xl font-bold text-xs bg-[#4E2E63] text-white hover:bg-[#6F4785] transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>إضافة الموعد (بصمة السكرتارية)</span>
                  </button>
                </div>
              </div>
            </form>

            {/* Slots List */}
            <div className="p-5 rounded-2xl bg-white border border-[#D9CCDF] shadow-xs space-y-3">
              <div className="font-bold text-sm text-[#2E1B3A]">المواعيد المخصصة المسجلة ليوم {slotsDate}:</div>
              {slotsLoading ? (
                <div className="text-center py-6 text-xs text-neutral-400">جاري تحميل المواعيد...</div>
              ) : slotsList.length === 0 ? (
                <div className="text-center py-6 text-xs text-neutral-400">
                  لا توجد فترات استثنائية مسجلة لهذا اليوم. العيادة تعتمد الفترات الافتراضية (من 2:00 م حتى 9:00 م).
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {slotsList.map((slot) => (
                    <div
                      key={slot.id}
                      className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                        slot.is_closed ? 'bg-rose-50 border-rose-200' : 'bg-neutral-50 border-[#D9CCDF]'
                      }`}
                    >
                      <div className="flex items-center justify-between font-mono font-bold text-sm text-[#4E2E63]">
                        <span>{slot.start_time}</span>
                        <span className={`text-[10px] font-sans px-1.5 py-0.5 rounded ${slot.is_closed ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>
                          {slot.is_closed ? 'مغلق' : 'مفتوح'}
                        </span>
                      </div>
                      <div className="text-[11px] text-neutral-500">
                        {slot.admin_notes || 'موعد سكرتارية'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: SHEETS SYNC MONITOR */}
        {activeTab === 'sheets' && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-white border border-[#D9CCDF] shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base text-[#2E1B3A]">حالة مزامنة شيت السكرتارية (Google Sheets)</h3>
                  <p className="text-xs text-[#4B4350] mt-0.5">
                    يحتوي هذا الملف على البيانات التشغيلية فقط (أرقام الحجز، هواتف المرضى، مواعيدهم، وحالة إيداع العربون).
                  </p>
                </div>
                <button
                  onClick={handleExportCSV}
                  className="cursor-pointer px-4 py-2 rounded-xl text-xs font-bold bg-[#4E2E63] text-white hover:bg-[#6F4785] transition-colors flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>تحميل نسخة CSV فورية</span>
                </button>
              </div>

              <div className="p-3 rounded-xl bg-purple-50/70 border border-[#A985BA]/30 text-xs text-[#4E2E63] flex items-center justify-between">
                <span>آخر مزامنة مسجلة: <strong>{lastSyncTime ? new Date(lastSyncTime).toLocaleString('ar-EG') : 'جاري المزامنة التلقائية'}</strong></span>
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold text-[11px]">
                  متصل ونشط
                </span>
              </div>

              {/* Sync outbox table */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-[#2E1B3A]">سجل المعاملات المرسلة مؤخرًا إلى الشيت:</div>
                <div className="rounded-xl border border-[#D9CCDF] overflow-hidden">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-[#FAF7F2] text-[#4E2E63] font-bold">
                      <tr>
                        <th className="p-2.5">المعرف</th>
                        <th className="p-2.5">نوع الكيان</th>
                        <th className="p-2.5">الحالة</th>
                        <th className="p-2.5">المحاولات</th>
                        <th className="p-2.5">الوقت</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#D9CCDF]/50">
                      {syncLogs.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-4 text-center text-neutral-400">
                            لا توجد عمليات مزامنة مسجلة حتى الآن.
                          </td>
                        </tr>
                      ) : (
                        syncLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-neutral-50/50">
                            <td className="p-2.5 font-mono text-[11px]">{log.id.slice(0, 14)}...</td>
                            <td className="p-2.5 font-semibold">{log.entity_type}</td>
                            <td className="p-2.5">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${log.status === 'synced' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                                {log.status === 'synced' ? 'تمت المزامنة' : 'قيد الإرسال'}
                              </span>
                            </td>
                            <td className="p-2.5 font-mono">{log.attempts}</td>
                            <td className="p-2.5 text-neutral-400 text-[11px]">{log.created_at}</td>
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
      </main>

      {/* InstaPay Review Modal */}
      {selectedAppForReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl border border-[#D9CCDF] shadow-2xl p-6 space-y-5 text-right">
            <div className="flex items-center justify-between pb-3 border-b border-[#D9CCDF]">
              <h3 className="font-bold text-base text-[#2E1B3A]">مراجعة تحويل عربون InstaPay</h3>
              <button
                onClick={() => setSelectedAppForReview(null)}
                className="cursor-pointer p-1 rounded-lg text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-[#FAF7F2] border border-[#D9CCDF] text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-neutral-400">رقم الحجز:</span>
                <strong className="font-mono text-[#4E2E63]">{selectedAppForReview.reference_number}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">اسم المريض:</span>
                <strong>{selectedAppForReview.patient_name}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">هاتف المريض:</span>
                <strong dir="ltr">{selectedAppForReview.patient_phone}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">الهاتف المحول منه (InstaPay):</span>
                <strong className="text-emerald-700 font-mono text-sm" dir="ltr">
                  {selectedAppForReview.instapay_phone || 'غير مسجل'}
                </strong>
              </div>
              <div className="flex justify-between pt-1 border-t border-[#D9CCDF]">
                <span className="text-neutral-400">قيمة العربون المتوقعة:</span>
                <strong className="text-[#2E1B3A]">{selectedAppForReview.deposit_amount} ج.م</strong>
              </div>
            </div>

            <form onSubmit={handleReviewSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#2E1B3A] mb-2">قرار الاعتماد:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setReviewDecision('verified')}
                    className={`cursor-pointer p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      reviewDecision === 'verified'
                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                        : 'bg-white border-[#D9CCDF] text-[#4B4350]'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>تأكيد استلام العربون</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setReviewDecision('rejected')}
                    className={`cursor-pointer p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      reviewDecision === 'rejected'
                        ? 'bg-rose-600 border-rose-600 text-white shadow-xs'
                        : 'bg-white border-[#D9CCDF] text-[#4B4350]'
                    }`}
                  >
                    <XCircle className="w-4 h-4" />
                    <span>رفض التحويل</span>
                  </button>
                </div>
              </div>

              {reviewDecision === 'rejected' && (
                <div>
                  <label className="block text-xs font-bold text-[#2E1B3A] mb-1">سبب الرفض:</label>
                  <input
                    type="text"
                    required
                    value={reviewReason}
                    onChange={(e) => setReviewReason(e.target.value)}
                    placeholder="مثال: لم يصل التحويل، المبلغ غير مطابق..."
                    className="w-full px-3 py-2 rounded-xl border border-[#D9CCDF] text-xs focus:outline-none focus:border-[#6F4785]"
                  />
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedAppForReview(null)}
                  className="cursor-pointer px-4 py-2 rounded-xl text-xs font-semibold text-[#4B4350] hover:bg-neutral-100"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={reviewing}
                  className="cursor-pointer px-5 py-2 rounded-xl text-xs font-bold bg-[#4E2E63] text-white hover:bg-[#6F4785] transition-colors"
                >
                  {reviewing ? 'جاري الحفظ...' : 'حفظ القرار واعتماد الحجز'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
