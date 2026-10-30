/**
 * Unified Patient Booking Modal (Popup Window)
 * Dr. Mohamed Sabra Elnaggar Dental Clinic
 * 
 * - Fixed booking fee (no service selection)
 * - Single-unit smooth scrolling
 * - Reliable confirmation transitioning to full Invoice & QR Code
 */
import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Calendar as CalendarIcon, Clock, User, Phone, CheckCircle2, 
  AlertCircle, Loader2, Copy, Check, MessageSquare, ShieldCheck, 
  MapPin, ChevronLeft, ArrowRight, Printer, Receipt, FileText
} from 'lucide-react';
import { QRCodeSvg } from './QRCodeSvg.tsx';
import type { SlotItem, Branch } from '../types/index.ts';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialService?: { code: string; name: string } | null;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  isOpen,
  onClose,
}) => {
  // Step: 1 = Date & Time, 2 = Patient Details & Deposit, 3 = Confirmation Invoice
  const [step, setStep] = useState<number>(1);

  // Scroll references to control viewport position & hide scrollbars
  const modalOuterRef = useRef<HTMLDivElement>(null);
  const modalContentRef = useRef<HTMLDivElement>(null);

  // Scroll modal back to the top when navigating between steps
  const scrollToTop = () => {
    if (modalContentRef.current) {
      modalContentRef.current.scrollTop = 0;
    }
    if (modalOuterRef.current) {
      modalOuterRef.current.scrollTop = 0;
    }
  };

  const handleGoToStep = (targetStep: number) => {
    setStep(targetStep);
    scrollToTop();
    setTimeout(scrollToTop, 20);
    setTimeout(scrollToTop, 80);
  };

  // Reset scroll to top automatically on any step change
  useEffect(() => {
    scrollToTop();
    const timer1 = setTimeout(scrollToTop, 20);
    const timer2 = setTimeout(scrollToTop, 80);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [step]);

  // Clinic metadata & branch
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [branch, setBranch] = useState<Branch | null>(null);
  const [allowedDates, setAllowedDates] = useState<{ dateStr: string; dayNameAr: string; isAllowed: boolean }[]>([]);

  // Selection states (No service selection, fixed consultation booking)
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

  // Payment & Revisit code
  const [paymentType, setPaymentType] = useState<'instapay' | 'revisit_code'>('instapay');
  const [instapayPhone, setInstapayPhone] = useState('');
  const [revisitCode, setRevisitCode] = useState('');
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [verifiedRevisit, setVerifiedRevisit] = useState<any>(null);
  const [codeError, setCodeError] = useState<string | null>(null);

  // Submit states
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [bookingResult, setBookingResult] = useState<any>(null);
  const [copiedRef, setCopiedRef] = useState(false);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent body scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Fetch initial clinic info and allowed dates
  useEffect(() => {
    if (!isOpen) return;

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
          setBranch(infoData.branches[0]);
        }

        if (slotsData.allowedDates && slotsData.allowedDates.length > 0) {
          setAllowedDates(slotsData.allowedDates);
          setSelectedDate(slotsData.allowedDates[0].dateStr);
        }
      } catch (err) {
        console.error('Failed to load clinic modal info:', err);
      } finally {
        setLoadingInitial(false);
      }
    }

    loadInit();
  }, [isOpen]);

  // Fetch slots whenever selectedDate changes
  useEffect(() => {
    if (!isOpen || !selectedDate) return;

    async function fetchSlots() {
      try {
        setSlotsLoading(true);
        const branchId = branch?.id || 'branch_dairab_negm';
        const res = await fetch(`/api/available-slots?date=${selectedDate}&branchId=${branchId}`);
        const data = await res.json();

        if (data.is_closed) {
          setIsDayClosed(true);
          setDayClosedReason(data.closed_reason || 'العيادة مغلقة في هذا التاريخ');
          setSlots([]);
          setSelectedSlotTime('');
        } else {
          setIsDayClosed(false);
          setDayClosedReason('');
          const availableSlots: SlotItem[] = data.slots || [];
          setSlots(availableSlots);
          // Auto-select first available slot
          const firstAvailable = availableSlots.find((s) => s.is_available);
          if (firstAvailable) {
            setSelectedSlotTime(firstAvailable.time);
          } else {
            setSelectedSlotTime('');
          }
        }
      } catch (err) {
        console.error('Failed to load slots:', err);
      } finally {
        setSlotsLoading(false);
      }
    }

    fetchSlots();
  }, [selectedDate, branch, isOpen]);

  // Reset modal state on close
  const handleResetAndClose = () => {
    setStep(1);
    setBookingResult(null);
    setSubmitError(null);
    setPatientName('');
    setPatientPhone('');
    setNotes('');
    setInstapayPhone('');
    setRevisitCode('');
    setVerifiedRevisit(null);
    setCodeError(null);
    onClose();
  };

  // Verify Revisit Code
  const handleVerifyCode = async () => {
    if (!revisitCode.trim()) {
      setCodeError('يرجى إدخال كود الإعادة أو الكشف');
      return;
    }
    setVerifyingCode(true);
    setCodeError(null);
    try {
      const res = await fetch('/api/revisit-codes/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: revisitCode.trim(), phone: patientPhone.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCodeError(data.error || 'كود غير صالح');
        setVerifiedRevisit(null);
      } else {
        setVerifiedRevisit(data);
        setCodeError(null);
      }
    } catch (err) {
      setCodeError('تعذر التحقق من الكود حاليًا');
    } finally {
      setVerifyingCode(false);
    }
  };

  // Submit Booking
  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!selectedSlotTime) {
      setSubmitError('يرجى اختيار توقيت متاح للكشف أولاً');
      handleGoToStep(1);
      return;
    }

    if (!patientName.trim() || patientName.trim().length < 3) {
      setSubmitError('يرجى إدخال اسم المريض الثلاثي بالكامل');
      return;
    }

    const cleanPhone = patientPhone.trim().replace(/\D/g, '');
    if (!/^(010|011|012|015)\d{8}$/.test(cleanPhone)) {
      setSubmitError('يرجى إدخال رقم هاتف مصري صحيح مكون من 11 رقماً (مثل: 01093591193)');
      return;
    }

    if (paymentType === 'instapay' && !instapayPhone.trim()) {
      setSubmitError('يرجى كتابة رقم الهاتف الذي قمت بالتحويل منه عبر إنستاباي');
      return;
    }

    if (paymentType === 'revisit_code' && !verifiedRevisit) {
      setSubmitError('يرجى الضغط على زر التحقق من الكود أولاً للتأكد من صلاحيته');
      return;
    }

    setSubmitting(true);
    try {
      // Clean payload: No service picking, fixed booking fee
      const payload = {
        branch_id: branch?.id || 'branch_dairab_negm',
        patient_name: patientName.trim(),
        patient_phone: cleanPhone,
        appointment_date: selectedDate,
        slot_time: selectedSlotTime,
        service_id: null,
        service_name: 'كشف واستشارة طبية متخصصة',
        instapay_phone: paymentType === 'instapay' ? instapayPhone.trim() : '',
        revisit_code: paymentType === 'revisit_code' ? revisitCode.trim().toUpperCase() : '',
        notes: notes.trim(),
      };

      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error || 'حدث خطأ أثناء حفظ وتأكيد الحجز');
      } else {
        // Save full booking object and advance to Invoice ticket
        const resultObject = data.appointment || {
          reference_number: data.reference_number || 'APT-CONFIRMED',
          appointment_date: selectedDate,
          slot_time: selectedSlotTime,
          patient_name: patientName.trim(),
          patient_phone: cleanPhone,
          service_name: 'كشف واستشارة طبية متخصصة',
          branch_name: branch?.name_ar || 'عيادة ديرب نجم - الشرقية',
          branch_address: 'الشرقية - ديرب نجم - برج الفلسطيني - أمام الكنيسة - الدور الخامس',
          deposit_amount: paymentType === 'revisit_code' ? (verifiedRevisit?.fee_amount || 0) : 150,
          payment_type: paymentType,
          instapay_phone: instapayPhone.trim(),
          revisit_code: revisitCode.trim().toUpperCase(),
          notes: notes.trim(),
        };

        setBookingResult(resultObject);
        handleGoToStep(3); // Step 3: Full Invoice & QR Code
      }
    } catch (err: any) {
      setSubmitError('تعذر الاتصال بالخادم، يرجى المحاولة مرة أخرى');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const selectedDateObj = allowedDates.find(d => d.dateStr === selectedDate);
  const dayNameDisplay = selectedDateObj ? selectedDateObj.dayNameAr : '';

  if (!isOpen) return null;

  return (
    <div 
      ref={modalOuterRef}
      className="fixed inset-0 z-50 overflow-y-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
    >
      {/* Dark Blur Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs transition-opacity"
        onClick={handleResetAndClose}
      />

      <div className="min-h-full flex items-center justify-center p-2 sm:p-4 md:p-6 text-right">
        {/* Modal Dialog Card - Unified Single Scroll Unit with hidden scrollbars */}
        <div 
          ref={modalContentRef}
          className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden transform transition-all my-6 z-10 max-h-[92vh] overflow-y-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          dir="rtl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="bg-[#2E1B3A] text-white p-5 sm:p-6 relative">
            <button
              type="button"
              onClick={handleResetAndClose}
              className="cursor-pointer absolute left-4 sm:left-5 top-5 p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="إغلاق النافذة"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1.5 pl-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold text-[#E8D7A1] border border-white/10">
                <span>عيادة د. محمد صبرة النجار — ديرب نجم</span>
              </div>
              <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight">
                {step === 3 ? 'فاتورة وتذكرة حجز الموعد الطبي' : 'طلب حجز موعد كشف واستشارة'}
              </h2>
              {step !== 3 && (
                <p className="text-xs text-[#D8CDE0]">
                  رسم حجز الكشف ثابت (150 ج.م) ويُخصم بالكامل من أي علاج لاحق عند الزيارة.
                </p>
              )}
            </div>

            {/* Stepper Progress Bar (only on steps 1 and 2) */}
            {step < 3 && (
              <div className="grid grid-cols-2 gap-2 mt-5 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => handleGoToStep(1)}
                  className={`cursor-pointer flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                    step === 1 
                      ? 'bg-[#E8D7A1] text-[#2E1B3A]' 
                      : 'bg-white/10 text-white/80 hover:bg-white/20'
                  }`}
                >
                  <CalendarIcon className="w-3.5 h-3.5" />
                  <span>1. اليوم والموعد</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (selectedSlotTime) handleGoToStep(2);
                  }}
                  disabled={!selectedSlotTime}
                  className={`cursor-pointer flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                    step === 2 
                      ? 'bg-[#E8D7A1] text-[#2E1B3A]' 
                      : selectedSlotTime 
                        ? 'bg-white/10 text-white/80 hover:bg-white/20' 
                        : 'bg-white/5 text-white/30 cursor-not-allowed'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>2. بيانات المريض والعربون</span>
                </button>
              </div>
            )}
          </div>

          {/* Modal Body - Flows naturally in the single unified scroll container */}
          <div className="p-5 sm:p-7">
            {loadingInitial ? (
              <div className="py-16 text-center space-y-3">
                <Loader2 className="w-8 h-8 text-[#4E2E63] animate-spin mx-auto" />
                <p className="text-sm text-slate-500 font-medium">جاري تجهيز جدول مواعيد العيادة...</p>
              </div>
            ) : step === 1 ? (
              /* ================= STEP 1: DATE & SLOT ================= */
              <div className="space-y-6">
                {/* Branch Info Strip */}
                <div className="p-3.5 rounded-2xl bg-[#FAF7F2] border border-purple-100 flex items-start gap-3 text-xs">
                  <MapPin className="w-4 h-4 text-[#4E2E63] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-[#2E1B3A] block">مقر العيادة:</span>
                    <span className="text-slate-600">
                      الشرقية - ديرب نجم - برج الفلسطيني - أمام الكنيسة - الدور الخامس.
                    </span>
                  </div>
                </div>

                {/* 1. Pick Date */}
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-slate-800 flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-[#4E2E63]" />
                    <span>اختر يوم الكشف المناسب:</span>
                  </label>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {allowedDates.map((d) => (
                      <button
                        key={d.dateStr}
                        type="button"
                        onClick={() => setSelectedDate(d.dateStr)}
                        className={`cursor-pointer p-3 rounded-xl border text-right transition-all flex flex-col justify-between ${
                          selectedDate === d.dateStr
                            ? 'bg-[#2E1B3A] text-white border-[#2E1B3A] shadow-md ring-2 ring-[#E8D7A1]'
                            : 'bg-white hover:bg-purple-50/50 border-slate-200 text-slate-700'
                        }`}
                      >
                        <span className={`text-xs font-semibold ${selectedDate === d.dateStr ? 'text-[#E8D7A1]' : 'text-slate-500'}`}>
                          {d.dayNameAr}
                        </span>
                        <span className="font-mono font-bold text-sm mt-1">
                          {d.dateStr}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Pick Time Slot */}
                <div className="space-y-3 pt-2">
                  <label className="block text-xs font-bold text-slate-800 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#4E2E63]" />
                      <span>المواعيد الشاغرة ليوم {selectedDate} ({dayNameDisplay}):</span>
                    </span>
                    {slotsLoading && (
                      <span className="text-[11px] text-slate-400 flex items-center gap-1 font-normal">
                        <Loader2 className="w-3 h-3 animate-spin" /> جاري التحديث...
                      </span>
                    )}
                  </label>

                  {isDayClosed ? (
                    <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2.5">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>{dayClosedReason}</span>
                    </div>
                  ) : slotsLoading ? (
                    <div className="py-10 text-center text-xs text-slate-400">
                      جاري فحص المواعيد المتاحة...
                    </div>
                  ) : slots.length === 0 ? (
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-xs text-center">
                      لا توجد فترات حجز متاحة في هذا اليوم، يرجى اختيار تاريخ آخر.
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {slots.map((slot) => {
                        const isSelected = selectedSlotTime === slot.time;
                        return (
                          <button
                            key={slot.time}
                            type="button"
                            disabled={!slot.is_available}
                            onClick={() => setSelectedSlotTime(slot.time)}
                            className={`cursor-pointer py-2.5 px-2 rounded-xl text-center text-xs font-mono font-bold transition-all border ${
                              !slot.is_available
                                ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed line-through'
                                : isSelected
                                  ? 'bg-[#4E2E63] text-white border-[#4E2E63] shadow-md ring-2 ring-[#E8D7A1]'
                                  : 'bg-white hover:bg-purple-50 text-slate-700 border-slate-200 hover:border-purple-300'
                            }`}
                          >
                            <span>{slot.time}</span>
                            <span className="block text-[10px] font-sans font-normal opacity-70">
                              {slot.is_available ? 'متاح' : 'محجوز'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Fixed Fee Notice */}
                <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 text-xs text-[#2E1B3A] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#4E2E63]" />
                    <span>رسم حجز الكشف الثابت:</span>
                  </div>
                  <span className="font-mono font-bold text-sm text-[#4E2E63]">150 ج.م</span>
                </div>

                {/* Next Step Button */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div className="text-xs text-slate-500">
                    {selectedSlotTime ? (
                      <span className="text-emerald-700 font-semibold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> تم اختيار {selectedDate} الساعة {selectedSlotTime}
                      </span>
                    ) : (
                      <span>اختر موعداً مناسباً للمتابعة</span>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={!selectedSlotTime || isDayClosed}
                    onClick={() => handleGoToStep(2)}
                    className="cursor-pointer px-6 py-3 rounded-xl font-bold text-xs text-[#2E1B3A] bg-gradient-to-r from-[#E8D7A1] to-[#FAF7F2] hover:brightness-105 shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <span>التالي: إدخال البيانات</span>
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : step === 2 ? (
              /* ================= STEP 2: PATIENT INFO & PAYMENT ================= */
              <form onSubmit={handleSubmitBooking} className="space-y-5">
                {submitError && (
                  <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>{submitError}</span>
                  </div>
                )}

                {/* Summary bar of chosen slot */}
                <div className="p-3 rounded-xl bg-purple-50/80 border border-purple-200/60 flex items-center justify-between text-xs text-[#2E1B3A]">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-[#4E2E63]" />
                    <span className="font-bold">{selectedDate} ({dayNameDisplay})</span>
                    <span className="text-slate-400">|</span>
                    <Clock className="w-4 h-4 text-[#4E2E63]" />
                    <span className="font-bold">{selectedSlotTime}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleGoToStep(1)}
                    className="cursor-pointer text-[#4E2E63] hover:underline font-semibold text-[11px]"
                  >
                    تغيير الموعد
                  </button>
                </div>

                {/* Patient Name */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-800">
                    اسم المريض الثلاثي بالكامل <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
                    <input
                      type="text"
                      required
                      placeholder="مثال: أحمد محمد عبد الرحمن"
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      className="w-full pr-10 pl-3 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-[#4E2E63] focus:border-transparent outline-none"
                    />
                  </div>
                </div>

                {/* Patient Phone */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-800">
                    رقم الهاتف / الواتساب للتأكيد <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
                    <input
                      type="tel"
                      required
                      dir="ltr"
                      placeholder="01093591193"
                      value={patientPhone}
                      onChange={(e) => setPatientPhone(e.target.value)}
                      className="w-full pr-10 pl-3 py-2.5 rounded-xl border border-slate-300 text-xs font-mono text-right focus:ring-2 focus:ring-[#4E2E63] focus:border-transparent outline-none"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400">
                    سيرسل النظام تفاصيل الفاتورة والحجز إلى هذا الرقم.
                  </span>
                </div>

                {/* Notes or Complaints */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-800">
                    شكوى المريض أو سبب الزيارة (اختياري)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="مثال: استشارة تقويم أسنان، ألم في الضرس، علاج جذور، تنظيف..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-[#4E2E63] focus:border-transparent outline-none resize-none"
                  />
                </div>

                {/* Payment & Deposit Options */}
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <label className="block text-xs font-bold text-slate-800">
                    طريقة تأكيد الحجز (عربون إنستاباي أو كود إعفاء مجاني):
                  </label>

                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setPaymentType('instapay')}
                      className={`cursor-pointer p-3 rounded-xl border text-right transition-all ${
                        paymentType === 'instapay'
                          ? 'bg-purple-50/80 border-[#4E2E63] ring-1 ring-[#4E2E63]'
                          : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <span className="font-bold text-xs text-[#2E1B3A] block">
                        عربون إنستاباي (150 ج.م)
                      </span>
                      <span className="text-[10px] text-slate-500">
                        تحويل رقمي لرقم العيادة المعتمد
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentType('revisit_code')}
                      className={`cursor-pointer p-3 rounded-xl border text-right transition-all ${
                        paymentType === 'revisit_code'
                          ? 'bg-purple-50/80 border-[#4E2E63] ring-1 ring-[#4E2E63]'
                          : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <span className="font-bold text-xs text-[#2E1B3A] block">
                        كود إعادة / كشف مجاني
                      </span>
                      <span className="text-[10px] text-slate-500">
                        كود معتمد من الدكتور للزيارات المتكررة
                      </span>
                    </button>
                  </div>

                  {paymentType === 'instapay' ? (
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
                      <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-slate-200">
                        <div>
                          <span className="text-[11px] text-slate-500 block">رقم إنستاباي العيادة المعتمد:</span>
                          <span className="font-mono font-bold text-sm text-[#2E1B3A]">01093591193</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyCode('01093591193')}
                          className="cursor-pointer px-2.5 py-1 rounded-md text-[11px] font-semibold bg-purple-50 text-[#4E2E63] hover:bg-purple-100 flex items-center gap-1"
                        >
                          {copiedRef ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedRef ? 'تم النسخ' : 'نسخ الرقم'}</span>
                        </button>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[11px] font-semibold text-slate-700">
                          رقم الهاتف الذي حولت منه عبر إنستاباي <span className="text-red-500">*</span>:
                        </label>
                        <input
                          type="tel"
                          required={paymentType === 'instapay'}
                          dir="ltr"
                          placeholder="010XXXXXXXX"
                          value={instapayPhone}
                          onChange={(e) => setInstapayPhone(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono text-right focus:ring-2 focus:ring-[#4E2E63] outline-none"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
                      <div className="space-y-1">
                        <label className="block text-[11px] font-semibold text-slate-700">
                          أدخل رمز كود الإعادة:
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="مثال: REV-XXXX"
                            value={revisitCode}
                            onChange={(e) => setRevisitCode(e.target.value.toUpperCase())}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono uppercase focus:ring-2 focus:ring-[#4E2E63] outline-none"
                          />
                          <button
                            type="button"
                            onClick={handleVerifyCode}
                            disabled={verifyingCode}
                            className="cursor-pointer px-4 py-2 rounded-lg bg-[#4E2E63] text-white font-bold text-xs hover:bg-[#2E1B3A] shrink-0 disabled:opacity-50"
                          >
                            {verifyingCode ? 'فحص...' : 'تحقق'}
                          </button>
                        </div>
                      </div>

                      {codeError && (
                        <p className="text-[11px] text-red-600 font-medium">{codeError}</p>
                      )}

                      {verifiedRevisit && (
                        <div className="p-2 rounded bg-emerald-50 text-emerald-800 text-[11px] font-semibold flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>{verifiedRevisit.message}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Form Buttons */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => handleGoToStep(1)}
                    className="cursor-pointer px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors flex items-center gap-1"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                    <span>السابق</span>
                  </button>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="cursor-pointer px-7 py-3 rounded-xl font-bold text-xs text-[#2E1B3A] bg-gradient-to-r from-[#E8D7A1] to-[#FAF7F2] hover:brightness-105 shadow-md transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-[#2E1B3A]" />
                        <span>جاري حفظ وتأكيد الحجز...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4 text-[#2E1B3A]" />
                        <span>تأكيد الحجز الآن</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              /* ================= STEP 3: FULL INVOICE & QR CODE TICKET ================= */
              <div className="space-y-6">
                {/* Success Banner */}
                <div className="text-center space-y-2">
                  <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto ring-6 ring-emerald-50">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900">
                    تم تأكيد تسجيل حجز موعدك الطبي بنجاح!
                  </h3>
                  <p className="text-xs text-slate-500">
                    تذكرة الحجز الرسمية معتمدة، ويُرجى إبراز رمز QR عند الحضور بالعيادة.
                  </p>
                </div>

                {/* Printable Invoice Card */}
                <div className="bg-[#FAF7F2] border-2 border-[#2E1B3A]/20 rounded-2xl p-5 sm:p-6 space-y-5 text-right relative overflow-hidden shadow-sm">
                  {/* Watermark / Header */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b border-slate-200">
                    <div className="space-y-1 text-center sm:text-right">
                      <span className="text-[11px] font-mono font-bold text-purple-900 block">
                        OFFICIAL CLINICAL BOOKING INVOICE
                      </span>
                      <h4 className="text-base font-black text-[#2E1B3A]">
                        عيادة د. محمد صبرة النجار
                      </h4>
                      <p className="text-xs text-slate-600">
                        أخصائي طب وجراحة الفم والأسنان وتقويم الأسنان
                      </p>
                    </div>

                    {/* QR Code Container */}
                    <div className="text-center space-y-1 shrink-0">
                      <QRCodeSvg
                        value={`DRSABRA|${bookingResult?.reference_number || 'APT'}|${patientName}|${selectedDate}|${selectedSlotTime}`}
                        size={110}
                        className="mx-auto"
                      />
                      <span className="text-[10px] text-slate-500 font-mono block">
                        امسح للتحقق الفوري
                      </span>
                    </div>
                  </div>

                  {/* Reference Number Box */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-purple-200">
                    <div>
                      <span className="text-[11px] text-slate-500 block">رقم الحجز المرجعي:</span>
                      <span className="font-mono font-black text-base text-[#4E2E63]">
                        {bookingResult?.reference_number || 'APT-CONFIRMED'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyCode(bookingResult?.reference_number || '')}
                      className="cursor-pointer px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-50 hover:bg-purple-100 text-[#4E2E63] flex items-center gap-1 transition-colors"
                    >
                      {copiedRef ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedRef ? 'تم النسخ' : 'نسخ الرقم'}</span>
                    </button>
                  </div>

                  {/* Patient & Appointment Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                      <span className="text-slate-500 text-[11px] block">اسم المريض:</span>
                      <span className="font-bold text-slate-900">{bookingResult?.patient_name || patientName}</span>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                      <span className="text-slate-500 text-[11px] block">رقم الهاتف:</span>
                      <span className="font-mono font-bold text-slate-900">{bookingResult?.patient_phone || patientPhone}</span>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                      <span className="text-slate-500 text-[11px] block">تاريخ الكشف المحدد:</span>
                      <span className="font-bold text-[#4E2E63]">
                        {bookingResult?.appointment_date || selectedDate} ({dayNameDisplay})
                      </span>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                      <span className="text-slate-500 text-[11px] block">وقت الموعد:</span>
                      <span className="font-bold font-mono text-[#4E2E63]">
                        {bookingResult?.slot_time || selectedSlotTime}
                      </span>
                    </div>
                  </div>

                  {/* Financial & Deposit Details */}
                  <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-2 text-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <span className="text-slate-600">نوع الخدمة الطبية:</span>
                      <span className="font-bold text-slate-900">كشف واستشارة طبية متخصصة</span>
                    </div>

                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <span className="text-slate-600">رسم الكشف / العربون المسجل:</span>
                      <span className="font-mono font-black text-sm text-emerald-700">
                        {bookingResult?.deposit_amount !== undefined ? `${bookingResult.deposit_amount} ج.م` : '150 ج.م'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <span className="text-slate-600">طريقة التحويل / الإعفاء:</span>
                      <span className="font-semibold text-slate-800">
                        {paymentType === 'revisit_code' ? `كود إعادة معتمد (${revisitCode})` : `تحويل إنستاباي من (${instapayPhone || patientPhone})`}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">حالة التأكيد:</span>
                      <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>مسجل ومؤكد مبدئياً</span>
                      </span>
                    </div>
                  </div>

                  {/* Clinic Address & Arrival Guidelines */}
                  <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-100 space-y-1 text-xs">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-[#4E2E63] shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-[#2E1B3A] block">عنوان العيادة:</span>
                        <span className="text-slate-700">
                          الشرقية - ديرب نجم - برج الفلسطيني - أمام الكنيسة - الدور الخامس.
                        </span>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-500 pt-1.5 border-t border-purple-100">
                      * يرجى الحضور قبل الموعد بـ 10 دقائق لفتح الملف الطبي، وسيتم خصم كامل العربون تلقائياً من فاتورة العلاج.
                    </p>
                  </div>
                </div>

                {/* Actions & WhatsApp Sharing */}
                <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                  <a
                    href={`https://wa.me/201093591193?text=${encodeURIComponent(
                      `مرحبًا عيادة د. محمد صبرة النجار، قمت بتأكيد حجز موعدي الطبي:\n- رقم الحجز: ${bookingResult?.reference_number || 'APT'}\n- اسم المريض: ${patientName}\n- اليوم: ${dayNameDisplay} (${selectedDate})\n- الوقت: ${selectedSlotTime}\n- طريقة العربون: ${paymentType === 'revisit_code' ? `كود إعادة (${revisitCode})` : `إنستاباي (${instapayPhone})`}`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="cursor-pointer flex-1 py-3 px-4 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center justify-center gap-2 transition-colors"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>مشاركة الفاتورة مع العيادة عبر الواتساب</span>
                  </a>

                  <button
                    type="button"
                    onClick={handlePrint}
                    className="cursor-pointer py-3 px-4 rounded-xl font-bold text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors flex items-center justify-center gap-2"
                  >
                    <Printer className="w-4 h-4" />
                    <span>طباعة / حفظ الفاتورة</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResetAndClose}
                    className="cursor-pointer py-3 px-5 rounded-xl font-bold text-xs bg-[#2E1B3A] hover:bg-[#4E2E63] text-white transition-colors"
                  >
                    إغلاق
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
