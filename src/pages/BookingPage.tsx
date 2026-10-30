/**
 * Smart Multi-Branch Patient Booking Wizard
 * Multi-Branch Dental Clinic & PMS Platform
 */
import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, Clock, User, Phone, CheckCircle2, 
  AlertCircle, Loader2, ArrowRight, ArrowLeft, ShieldCheck, Printer, 
  MapPin, Copy, Check, MessageSquare, Building2, UploadCloud, FileText
} from 'lucide-react';
import { ClinicLogo } from '../components/ClinicLogo.tsx';
import { QRCodeSvg } from '../components/QRCodeSvg.tsx';
import type { SlotItem, Branch } from '../types/index.ts';

interface BookingPageProps {
  onNavigate: (path: string) => void;
}

export const BookingPage: React.FC<BookingPageProps> = ({ onNavigate }) => {
  const [step, setStep] = useState<number>(1);

  // Clinic metadata & branches
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [allowedDates, setAllowedDates] = useState<{ dateStr: string; dayNameAr: string; isAllowed: boolean }[]>([]);

  // Form selections
  const [selectedBranchId, setSelectedBranchId] = useState<string>('branch_dairab_negm');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedSlotTime, setSelectedSlotTime] = useState<string>('');
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slots, setSlots] = useState<SlotItem[]>([]);
  const [isDayClosed, setIsDayClosed] = useState(false);
  const [dayClosedReason, setDayClosedReason] = useState('');

  // Patient inputs
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [notes, setNotes] = useState('');

  // Deposit & Revisit Code
  const [instapaySenderPhone, setInstapaySenderPhone] = useState('');
  const [receiptSimulatedName, setReceiptSimulatedName] = useState<string>('');
  const [revisitCode, setRevisitCode] = useState('');
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [verifiedRevisit, setVerifiedRevisit] = useState<any>(null);
  const [codeError, setCodeError] = useState<string | null>(null);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [bookingResult, setBookingResult] = useState<any>(null);
  const [copiedRef, setCopiedRef] = useState(false);

  // Load initial clinic info & branches
  useEffect(() => {
    async function loadInit() {
      try {
        setLoadingInitial(true);
        const [infoRes, slotsRes] = await Promise.all([
          fetch('/api/clinic-info'),
          fetch('/api/available-slots')
        ]);

        const infoData = await infoRes.json();
        const slotsData = await slotsRes.json();

        if (infoData.branches && infoData.branches.length > 0) {
          setBranches(infoData.branches);
          // Check URL query param for branchId
          const params = new URLSearchParams(window.location.search);
          const bParam = params.get('branchId');
          if (bParam && infoData.branches.some((b: any) => b.id === bParam)) {
            setSelectedBranchId(bParam);
          } else {
            setSelectedBranchId(infoData.branches[0].id);
          }
        }

        if (slotsData.allowedDates && slotsData.allowedDates.length > 0) {
          setAllowedDates(slotsData.allowedDates);
          setSelectedDate(slotsData.allowedDates[0].dateStr);
        }
      } catch (err) {
        console.error('Failed to load clinic initial info:', err);
      } finally {
        setLoadingInitial(false);
      }
    }
    loadInit();
  }, []);

  const selectedBranch = branches.find((b) => b.id === selectedBranchId) || branches[0];

  // Fetch slots whenever selectedDate or branch changes
  useEffect(() => {
    if (!selectedDate || !selectedBranchId) return;

    async function fetchSlots() {
      try {
        setSlotsLoading(true);
        setSelectedSlotTime('');
        const res = await fetch(`/api/available-slots?branchId=${selectedBranchId}&date=${selectedDate}`);
        const data = await res.json();

        if (data.is_closed) {
          setIsDayClosed(true);
          setDayClosedReason(data.closed_reason || 'اليوم مغلق');
          setSlots([]);
        } else {
          setIsDayClosed(false);
          setDayClosedReason('');
          setSlots(data.slots || []);
        }
      } catch (err) {
        console.error('Failed to fetch slots:', err);
      } finally {
        setSlotsLoading(false);
      }
    }

    fetchSlots();
  }, [selectedDate, selectedBranchId]);

  // Handle verify revisit code
  const handleVerifyCode = async () => {
    if (!revisitCode.trim()) return;
    setVerifyingCode(true);
    setCodeError(null);
    setVerifiedRevisit(null);

    try {
      const res = await fetch('/api/revisit-codes/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: revisitCode.trim(), phone: patientPhone.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'كود غير صالح');
      }
      setVerifiedRevisit(data);
    } catch (err: any) {
      setCodeError(err.message || 'حدث خطأ أثناء فحص الكود');
    } finally {
      setVerifyingCode(false);
    }
  };

  // Submit booking
  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitting(true);

    try {
      const isExempted = verifiedRevisit?.discount_type === 'full_exemption';

      const payload = {
        branch_id: selectedBranchId,
        patient_name: patientName.trim(),
        patient_phone: patientPhone.trim(),
        appointment_date: selectedDate,
        slot_time: selectedSlotTime,
        service_name: 'كشف واستشارة طبية شاملة',
        instapay_phone: isExempted ? null : instapaySenderPhone.trim(),
        receipt_url: receiptSimulatedName ? `receipt_${Date.now()}.png` : null,
        revisit_code: verifiedRevisit ? revisitCode.trim() : null,
        notes: notes.trim() || undefined,
      };

      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'فشل إتمام طلب الحجز');
      }

      setBookingResult(data);
      setStep(5);
    } catch (err: any) {
      setSubmitError(err.message || 'حدث خطأ أثناء إرسال الحجز');
    } finally {
      setSubmitting(false);
    }
  };

  const copyBookingRef = () => {
    if (bookingResult?.reference_number) {
      navigator.clipboard.writeText(bookingResult.reference_number);
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 2000);
    }
  };

  if (loadingInitial) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3 text-slate-800">
          <Loader2 className="w-8 h-8 animate-spin text-slate-900" />
          <p className="text-sm font-semibold">جاري تحضير معالج الحجز الذكي...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Top Header Card */}
        <div className="text-center mb-8 space-y-2">
          <div className="inline-flex justify-center mb-2">
            <ClinicLogo size="md" inverted={false} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
            حجز موعد في عيادة د. محمد صبرة النجار
          </h1>
          <p className="text-xs sm:text-sm text-slate-600">
            الشرقية - ديرب نجم - برج الفلسطيني - أمام الكنيسة - الدور الخامس.
          </p>
        </div>

        {/* Wizard Step Indicator */}
        <div className="mb-8 p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between text-xs font-semibold">
          {[
            { num: 1, label: 'الفرع' },
            { num: 2, label: 'البيانات' },
            { num: 3, label: 'الموعد' },
            { num: 4, label: 'العربون' },
          ].map((item, idx) => (
            <React.Fragment key={item.num}>
              <div className={`flex items-center gap-2 ${step >= item.num ? 'text-slate-900' : 'text-slate-400'}`}>
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold ${
                    step >= item.num ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {item.num}
                </span>
                <span className="hidden sm:inline">{item.label}</span>
              </div>
              {idx < 3 && <div className="flex-1 h-0.5 bg-slate-200 mx-2"></div>}
            </React.Fragment>
          ))}
        </div>

        {/* STEP 1: Branch Selection */}
        {step === 1 && (
          <div className="rounded-2xl bg-white border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-slate-900">1. اختيار الفرع والمركز الطبي</h2>
              <p className="text-xs text-slate-500">حدد العيادة التي ترغب في زيارتها:</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {branches.map((b) => {
                const isSelected = selectedBranchId === b.id;
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setSelectedBranchId(b.id)}
                    className={`cursor-pointer p-5 rounded-2xl border-2 text-right transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'border-slate-900 bg-slate-50/80 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                          {b.city}
                        </span>
                        {isSelected && <CheckCircle2 className="w-5 h-5 text-slate-900" />}
                      </div>

                      <h3 className="font-bold text-sm text-slate-900">{b.name_ar}</h3>
                      <p className="text-xs text-slate-500 leading-relaxed">{b.address_ar}</p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-200/80 flex items-center justify-between text-xs">
                      <span className="text-slate-400">عربون الحجز:</span>
                      <strong className="text-slate-900 font-mono text-sm">{b.deposit_amount} ج.م</strong>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Deposit Deduction Banner */}
            <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <span>ضمان الخصم التلقائي للعربون:</span>
              </div>
              <p className="leading-relaxed">
                مبلغ العربون التأكيدي للفرع يُخصم بالكامل وبشكل تلقائي من فاتورة علاجك أو كشفك الإجمالي عند الزيارة بالعيادة.
              </p>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="cursor-pointer px-6 py-3 rounded-xl font-bold text-xs bg-slate-900 hover:bg-slate-800 text-white transition-colors flex items-center gap-2"
              >
                <span>متابعة إدخال بيانات المريض</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Patient Information */}
        {step === 2 && (
          <div className="rounded-2xl bg-white border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-slate-900">2. بيانات المريض للتواصل</h2>
              <p className="text-xs text-slate-500">أدخل اسمك ورقم هاتفك لربطهما بسجلك الطبي داخل العيادة</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  الاسم الثلاثي بالكامل <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    placeholder="مثال: أحمد محمود علي"
                    className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-slate-900 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  رقم الهاتف المحمول (11 رقماً) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    required
                    dir="ltr"
                    maxLength={11}
                    value={patientPhone}
                    onChange={(e) => setPatientPhone(e.target.value)}
                    placeholder="010XXXXXXXX"
                    className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-slate-300 text-sm font-mono text-right focus:outline-none focus:border-slate-900 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  ملاحظات أو سبب الزيارة (اختياري)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="مثال: فحص تقويم لأول مرة، حشو ضرس، زراعة أسنان..."
                  className="w-full p-3 rounded-xl border border-slate-300 text-xs focus:outline-none focus:border-slate-900 transition-colors"
                ></textarea>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="cursor-pointer px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors flex items-center gap-1.5"
              >
                <ArrowRight className="w-4 h-4" />
                <span>الرجوع للفرع</span>
              </button>

              <button
                type="button"
                disabled={!patientName.trim() || patientPhone.trim().length !== 11}
                onClick={() => setStep(3)}
                className="cursor-pointer px-6 py-3 rounded-xl font-bold text-xs bg-slate-900 hover:bg-slate-800 text-white transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <span>اختيار الموعد المتاح</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Date & Slots Selection */}
        {step === 3 && (
          <div className="rounded-2xl bg-white border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-slate-900">3. اختيار تاريخ وتوقيت الموعد</h2>
              <p className="text-xs text-slate-500">
                نافذة الحجز نشطة للأيام الـ 4 القادمة لضمان الانضباط وتفادي الحجوزات المتضاربة.
              </p>
            </div>

            {/* Allowed Date Tabs */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-2">
                اختر اليوم المطلوب:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {allowedDates.map((item) => (
                  <button
                    key={item.dateStr}
                    type="button"
                    onClick={() => setSelectedDate(item.dateStr)}
                    className={`cursor-pointer p-3 rounded-xl border text-center transition-all ${
                      selectedDate === item.dateStr
                        ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-400'
                    }`}
                  >
                    <div className="font-bold text-sm">{item.dayNameAr}</div>
                    <div className="text-xs mt-0.5 opacity-80 font-mono">{item.dateStr}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Slots Grid */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800">
                  الفترات المتاحة ليوم ({selectedDate}):
                </label>
                {slotsLoading && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>تحديث التوافر...</span>
                  </div>
                )}
              </div>

              {isDayClosed ? (
                <div className="p-6 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-center space-y-2">
                  <AlertCircle className="w-8 h-8 text-amber-600 mx-auto" />
                  <div className="font-bold text-sm">هذا اليوم مغلق بالفرع</div>
                  <p className="text-xs">{dayClosedReason || 'بقرار إداري، يرجى اختيار تاريخ آخر.'}</p>
                </div>
              ) : slots.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  لا توجد فترات عمل متاحة لهذا اليوم في هذا الفرع.
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
                  {slots.map((slot) => {
                    const isSelected = selectedSlotTime === slot.time;
                    const isAvailable = slot.is_available;

                    return (
                      <button
                        key={slot.time}
                        type="button"
                        disabled={!isAvailable}
                        onClick={() => setSelectedSlotTime(slot.time)}
                        className={`cursor-pointer p-2.5 rounded-xl border text-center transition-all ${
                          isSelected
                            ? 'bg-slate-900 border-slate-900 text-white font-bold shadow-xs'
                            : isAvailable
                            ? 'bg-slate-50 border-slate-200 text-slate-800 hover:border-slate-400'
                            : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-50'
                        }`}
                      >
                        <div className="text-sm font-mono" dir="ltr">{slot.time}</div>
                        <div className="text-[10px] mt-1">
                          {slot.is_closed ? (
                            <span className="text-rose-500">مغلق</span>
                          ) : slot.remaining_capacity <= 0 ? (
                            <span className="text-amber-600">محجوز</span>
                          ) : (
                            <span className="text-emerald-700 font-semibold">متاح</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="cursor-pointer px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors flex items-center gap-1.5"
              >
                <ArrowRight className="w-4 h-4" />
                <span>الرجوع</span>
              </button>

              <button
                type="button"
                disabled={!selectedSlotTime || isDayClosed}
                onClick={() => setStep(4)}
                className="cursor-pointer px-6 py-3 rounded-xl font-bold text-xs bg-slate-900 hover:bg-slate-800 text-white transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <span>متابعة لتأكيد العربون</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Deposit or Revisit Code */}
        {step === 4 && (
          <form onSubmit={handleSubmitBooking} className="rounded-2xl bg-white border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-slate-900">4. تأكيد الحجز وسداد العربون</h2>
              <p className="text-xs text-slate-500">
                اختر وسيلة التأكيد: إما كود كشف مجاني/إعادة، أو تحويل العربون المقرر للفرع
              </p>
            </div>

            {/* Booking Summary Box */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
              <div className="font-bold text-slate-900 mb-1">ملخص الموعد:</div>
              <div className="grid grid-cols-2 gap-2 text-slate-600">
                <div>الفرع: <strong className="text-slate-900">{selectedBranch.name_ar}</strong></div>
                <div>المريض: <strong className="text-slate-900">{patientName}</strong></div>
                <div>التاريخ: <strong className="text-slate-900 font-mono">{selectedDate}</strong></div>
                <div>الوقت: <strong className="text-slate-900 font-mono">{selectedSlotTime}</strong></div>
              </div>
            </div>

            {/* Revisit Code Option */}
            <div className="p-4 rounded-xl bg-slate-100/70 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">هل تملك كود كشف مجاني أو كود إعادة؟</span>
                <span className="text-[10px] text-slate-500">إعفاء فوري من العربون</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={revisitCode}
                  onChange={(e) => setRevisitCode(e.target.value)}
                  placeholder="مثال: FREE-SABRA"
                  className="flex-1 px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs uppercase font-mono tracking-wider focus:outline-none focus:border-slate-900"
                />
                <button
                  type="button"
                  disabled={!revisitCode.trim() || verifyingCode}
                  onClick={handleVerifyCode}
                  className="cursor-pointer px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
                >
                  {verifyingCode ? 'فحص...' : 'فحص الكود'}
                </button>
              </div>

              {verifiedRevisit && (
                <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{verifiedRevisit.message}</span>
                </div>
              )}

              {codeError && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{codeError}</span>
                </div>
              )}
            </div>

            {/* InstaPay Section (if not full exemption) */}
            {verifiedRevisit?.discount_type === 'full_exemption' ? (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  <span>تم إعفاؤك من تحويل العربون بالكامل</span>
                </div>
                <p>يمكنك الآن إرسال الطلب لتأكيد الموعد مباشرة بدون أي مدفوعات.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-900 text-white space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-300">عربون الحجز التأكيدي للفرع:</span>
                    <span className="text-lg font-bold text-emerald-400 font-mono">
                      {selectedBranch.deposit_amount} ج.م
                    </span>
                  </div>
                  <div className="text-xs text-slate-300 leading-relaxed pt-2 border-t border-slate-800 space-y-2">
                    <p>قم بالتحويل عبر تطبيق <strong>InstaPay</strong> إلى هاتف العيادة المعتمد للفرع:</p>
                    <div className="p-2.5 rounded-lg bg-slate-800 flex items-center justify-between font-mono text-sm font-bold text-white">
                      <span dir="ltr">{selectedBranch.instapay_phone}</span>
                      <span className="text-xs text-emerald-400 font-sans font-normal">{selectedBranch.name_ar}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    رقم الهاتف المحول منه أو كود المعاملة <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    dir="ltr"
                    value={instapaySenderPhone}
                    onChange={(e) => setInstapaySenderPhone(e.target.value)}
                    placeholder="010XXXXXXXX أو كود التحويل"
                    className="w-full pl-3 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm font-mono text-right focus:outline-none focus:border-slate-900"
                  />
                </div>

                {/* Optional Simulated File Upload for Receipt */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    إشعار أو لقطة شاشة التحويل (اختياري)
                  </label>
                  <div className="p-3 rounded-xl border border-dashed border-slate-300 text-center hover:bg-slate-50 transition-colors cursor-pointer relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setReceiptSimulatedName(e.target.files[0].name);
                        }
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <div className="flex items-center justify-center gap-2 text-xs text-slate-600">
                      <UploadCloud className="w-4 h-4 text-slate-400" />
                      <span>
                        {receiptSimulatedName ? `تم اختيار: ${receiptSimulatedName}` : 'اضغط لاختيار صورة إيصال التحويل'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {submitError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{submitError}</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="cursor-pointer px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors flex items-center gap-1.5"
              >
                <ArrowRight className="w-4 h-4" />
                <span>تعديل الموعد</span>
              </button>

              <button
                type="submit"
                disabled={submitting || (verifiedRevisit?.discount_type !== 'full_exemption' && !instapaySenderPhone.trim())}
                className="cursor-pointer px-8 py-3.5 rounded-xl font-bold text-xs bg-slate-900 hover:bg-slate-800 text-white shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري إرسال الحجز وحفظ الفترة...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>تأكيد وإصدار رقم الحجز</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* STEP 5: Confirmation Voucher */}
        {step === 5 && bookingResult && (
          <div className="rounded-2xl bg-white border border-slate-200 p-6 sm:p-8 shadow-lg space-y-6">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-black text-slate-900">
                {bookingResult.is_exempted ? 'تم تأكيد موعدك بنجاح!' : 'تم استلام طلب الحجز بنجاح!'}
              </h2>
              <p className="text-xs text-slate-600 max-w-md mx-auto">
                {bookingResult.is_exempted
                  ? 'تم تأكيد الموعد مباشرة بموجب كود الإعفاء المعتمد.'
                  : 'طلبك قيد المراجعة والاعتماد الفوري من طاقم السكرتارية لمطابقة تحويل InstaPay.'}
              </p>
            </div>

            {/* Official Confirmation Card */}
            <div className="p-5 sm:p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b border-slate-200">
                <div className="space-y-1 text-center sm:text-right">
                  <span className="text-[11px] text-slate-400 block font-medium">الرقم المرجعي للحجز:</span>
                  <div className="flex items-center gap-2 justify-center sm:justify-start">
                    <span className="font-mono text-lg font-black text-purple-950 tracking-wide">
                      {bookingResult.reference_number}
                    </span>
                    <button
                      type="button"
                      onClick={copyBookingRef}
                      className="cursor-pointer px-2.5 py-1 rounded-lg text-xs bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 flex items-center gap-1 transition-colors"
                    >
                      {copiedRef ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedRef ? 'تم النسخ' : 'نسخ'}</span>
                    </button>
                  </div>
                </div>

                <div className="text-center shrink-0">
                  <QRCodeSvg
                    value={`DRSABRA|${bookingResult.reference_number}|${patientName}|${bookingResult.appointment_date}|${bookingResult.slot_time}`}
                    size={100}
                    className="mx-auto"
                  />
                  <span className="text-[10px] text-slate-400 font-mono mt-1 block">امسح للتحقق</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block">الفرع:</span>
                  <span className="font-bold text-slate-900">{bookingResult.branch_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">اسم المريض:</span>
                  <span className="font-bold text-slate-900">{bookingResult.patient_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">تاريخ الزيارة:</span>
                  <span className="font-bold text-slate-900 font-mono">{bookingResult.appointment_date}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">وقت الموعد:</span>
                  <span className="font-bold text-slate-900 font-mono">{bookingResult.slot_time}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">حالة الحجز:</span>
                  <span className="font-bold text-amber-700">
                    {bookingResult.status === 'confirmed' ? 'مؤكد ومعتمد' : 'قيد المراجعة الفورية'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">العربون:</span>
                  <span className="font-bold text-slate-900">
                    {bookingResult.deposit_amount} ج.م ({bookingResult.deposit_status === 'exempted' ? 'معفى' : 'قيد التدقيق'})
                  </span>
                </div>
              </div>

              {/* Crucial Note: Deposit deduction */}
              <div className="pt-3 border-t border-slate-200 text-xs text-emerald-800 font-semibold bg-emerald-50/50 p-2.5 rounded-lg">
                ملاحظة هامة: سيتم خصم كامل مبلغ العربون ({bookingResult.deposit_amount} ج.م) تلقائياً من إجمالي فاتورة علاجك عند الزيارة.
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="cursor-pointer px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 hover:bg-slate-50 flex items-center gap-1.5 transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة إيصال الموعد</span>
              </button>

              <a
                href={`https://wa.me/201093591193?text=${encodeURIComponent(
                  `مرحبًا عيادة د. محمد صبرة، أود الاستفسار عن حجز الموعد رقم: ${bookingResult.reference_number}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
                <span>متابعة مع السكرتارية عبر واتساب</span>
              </a>

              <button
                type="button"
                onClick={() => onNavigate('/')}
                className="cursor-pointer px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
              >
                العودة للرئيسية
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
