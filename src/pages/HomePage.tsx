/**
 * Landing Page
 * Dr. Mohamed Sabra Elnaggar Dental Clinic
 */
import React, { useState } from 'react';
import { 
  Calendar, Phone, MapPin, ExternalLink, ChevronLeft, ShieldCheck, 
  Clock, Award, MessageCircle, Navigation, ArrowLeft, ArrowUpLeft
} from 'lucide-react';
import { BookingModal } from '../components/BookingModal.tsx';

interface HomePageProps {
  onNavigate: (path: string) => void;
  onOpenBooking?: (service?: { code: string; name: string } | null) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate, onOpenBooking }) => {
  const [internalModalOpen, setInternalModalOpen] = useState(false);
  const [internalSelectedService, setInternalSelectedService] = useState<{ code: string; name: string } | null>(null);

  const handleBookingClick = (srv?: { code: string; name: string } | null) => {
    if (onOpenBooking) {
      onOpenBooking(srv || null);
    } else {
      setInternalSelectedService(srv || null);
      setInternalModalOpen(true);
    }
  };

  const services = [
    {
      code: 'ORTHO',
      category: 'تقويم الأسنان',
      name: 'تقويم الأسنان المتقدم (ثابت وشفاف)',
      desc: 'علاج تشوهات الفكين ورصف وتنسيق الأسنان بأحدث التقنيات السلكية والشفافة بمتابعة دورية دقيقة.',
      image: '/src/assets/images/orthodontics_teeth_1793130364989.jpg',
    },
    {
      code: 'IMPLANT',
      category: 'زراعة الأسنان',
      name: 'زراعة الأسنان الفورية وتطعيم العظم',
      desc: 'تعويض الأسنان المفقودة بأفضل الغرسات الطبية المعتمدة دولياً لاستعادة كامل وظيفة المضغ والمظهر الطبيعي.',
      image: '/src/assets/images/dental_implant_model_1793130365362.jpg',
    },
    {
      code: 'COSMETIC',
      category: 'تجميل الأسنان',
      name: 'تجميل الابتسامة وعدسات الفينير والإيماكس',
      desc: 'جلسات تبييض ضوئية متقدمة وتصميم الابتسامة التجميلية مع الحفاظ على سلامة مينا الأسنان واللثة.',
      image: '/src/assets/images/aesthetic_smile_whitening_1793130365779.jpg',
    },
    {
      code: 'FILLING',
      category: 'الحشوات والترميمات',
      name: 'حشوات الكومبوزيت الليزرية التجميلية',
      desc: 'إزالة التسوس وترميم الأسنان بحشوات نانو-كومبوزيت مطابقة للون الأسنان الطبيعي بقوة ومتانة فائقة.',
      image: '/src/assets/images/healthy_smile_consultation_1793043073970.jpg',
    },
    {
      code: 'ENDO',
      category: 'علاج الجذور',
      name: 'علاج جذور وأعصاب الأسنان بالروتاري',
      desc: 'تنظيف وحشو القنوات العصبية بدقة ميكانيكية متطورة بدون ألم وفي جلسات قياسية للحفاظ على السن الطبيعي.',
      image: '/src/assets/images/dental_instruments_luxury_1793043072498.jpg',
    },
    {
      code: 'CROWN',
      category: 'التركيبات السنية',
      name: 'التركيبات الثابتة والتيجان والجسور (Zirconia / Emax)',
      desc: 'حماية الأسنان المعالجة واستعادة الوظيفة والمظهر الطبيعي بتيجان الزركونيا والـ E-max فائقة الصلابة والجمال.',
      image: '/src/assets/images/dental_implant_model_1793130365362.jpg',
    },
    {
      code: 'PROPHY',
      category: 'الوقاية واللثة',
      name: 'تنظيف الأسنان وإزالة الجير وتلميعها',
      desc: 'إزالة الرواسب الجيرية بالموجات فوق الصوتية وتلميع الأسنان وعلاج التهابات اللثة واستعادة النضارة.',
      image: '/src/assets/images/aesthetic_smile_whitening_1793130365779.jpg',
    },
    {
      code: 'SURGERY',
      category: 'جراحة الوجه والفكين',
      name: 'خلع ضرس العقل وجراحة الفم الصغرى',
      desc: 'خلع جراحي دقيق ومريح لأضراس العقل المدفونة تحت أحدث بروتوكولات التخدير الموضعي المريح.',
      image: '/src/assets/images/dental_instruments_luxury_1793043072498.jpg',
    },
  ];

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#4B4350]">
      {/* 1. HERO SECTION */}
      <section className="relative min-h-[580px] flex items-center justify-center text-white py-20 lg:py-28 overflow-hidden border-b border-slate-800">
        {/* Background Image with Dark Contrast Overlay */}
        <div className="absolute inset-0 z-0">
          <img
            src="/assets/aistudio/374917296_976419427053706_5286893722185683800_n_e903d224.jpg"
            alt="عيادة د. محمد صبرة النجار"
            className="w-full h-full object-cover object-center filter brightness-[0.75]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#2E1B3A]/90 via-[#1A0E24]/85 to-[#2E1B3A]/95 backdrop-blur-[1px]"></div>
        </div>

        {/* Hero Content */}
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-[1.3] tracking-tight">
            عيادة د. محمد صبرة النجار
            <span className="block text-[#E8D7A1] font-semibold text-2xl sm:text-3xl mt-3">
              لطب وجراحة الفم والأسنان وتقويم الأسنان
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-200 leading-relaxed max-w-2xl mx-auto font-normal">
            رعاية طبية تخصصية متكاملة لجميع أفراد الأسرة، بأحدث التقنيات وأعلى معايير التعقيم الطبي والراحة، بإشراف أخصائي طب وجراحة وتقويم الأسنان.
          </p>

          {/* Primary CTAs */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => handleBookingClick()}
              className="cursor-pointer px-8 py-4 rounded-xl font-bold text-base text-[#2E1B3A] bg-gradient-to-r from-[#E8D7A1] to-[#FAF7F2] hover:brightness-105 shadow-lg transition-all flex items-center gap-2"
            >
              <Calendar className="w-5 h-5 text-[#2E1B3A]" />
              <span>طلب كشف واستشارة</span>
              <ChevronLeft className="w-4 h-4" />
            </button>

            <a
              href="#branch-section"
              className="cursor-pointer px-6 py-4 rounded-xl font-semibold text-sm text-white bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-sm transition-colors flex items-center gap-2"
            >
              <MapPin className="w-4 h-4 text-[#E8D7A1]" />
              <span>بيانات الفرع والزيارة</span>
            </a>
          </div>

          {/* Trust markers */}
          <div className="pt-8 border-t border-white/10 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-[#E8D7A1] shrink-0" />
              <span>أخصائي طب وجراحة الفم وتقويم الأسنان</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#E8D7A1] shrink-0" />
              <span>أحدث أجهزة التعقيم الطبي المعتمد</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#E8D7A1] shrink-0" />
              <span>مواعيد منظمة لحفظ وقت المريض</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. SERVICES SECTION */}
      <section id="services" className="py-20 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">
              تخصصات طب الأسنان المتقدمة
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              منظومة علاجية متكاملة تشمل أدق تخصصات الفم والأسنان بأحدث التقنيات الطبية ومعايير الدقة والراحة.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map((srv) => (
              <div
                key={srv.code}
                onClick={() => handleBookingClick()}
                className="group relative rounded-2xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-300 transform hover:scale-105 active:scale-102 cursor-pointer h-88 flex flex-col justify-end p-6 text-right border border-slate-200"
              >
                {/* Background Image with Dark Contrast Overlay */}
                <div className="absolute inset-0 z-0 overflow-hidden">
                  <img
                    src={srv.image}
                    alt={srv.name}
                    className="w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-slate-900/40"></div>
                </div>

                {/* Structured Service Content without small category card */}
                <div className="relative z-10 space-y-3 text-white">
                  {/* Main Service Title */}
                  <h3 className="font-bold text-lg leading-snug text-white group-hover:text-[#E8D7A1] transition-colors">
                    {srv.name}
                  </h3>

                  {/* Description */}
                  <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">
                    {srv.desc}
                  </p>

                  {/* Action Text at Bottom Left (أسفل يسار) - No card button */}
                  <div className="pt-3 flex items-center justify-start border-t border-white/15" dir="ltr">
                    <span className="text-xs font-bold text-[#E8D7A1] group-hover:text-white transition-colors flex items-center gap-1.5">
                      <span className="text-sm">←</span>
                      <span>احجز الآن</span>
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. BRANCH SECTION - Clean & Integrated (NOT inside a card) */}
      <section id="branch-section" className="py-20 bg-[#FAF7F2] border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          {/* Header */}
          <div className="space-y-2 text-right">
            <span className="text-xs font-mono font-bold tracking-wider text-purple-800 uppercase">
              Deirb Negm Branch - Sharkia
            </span>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">
              فرع لخدمتكم بأعلى التجهيزات الطبية
            </h2>
            <p className="text-sm text-slate-600">
              إمكانية الحجز المسبق والتواصل المباشر مع طاقم الاستقبال.
            </p>
          </div>

          {/* Integrated Details Grid - No Card Wrapper */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
            {/* Col 1: Location & Hours */}
            <div className="space-y-6 text-right">
              <div>
                <span className="text-xs font-bold text-slate-500 block mb-1">الاسم التجاري:</span>
                <h3 className="text-xl font-bold text-slate-900">عيادة د. محمد صبرة النجار</h3>
                <span className="text-xs text-purple-800 font-medium">أخصائي طب وجراحة الفم والأسنان وتقويم الأسنان</span>
              </div>

              <div>
                <span className="text-xs font-bold text-slate-500 block mb-1">العنوان التفصيلي:</span>
                <p className="text-base text-slate-800 font-medium leading-relaxed">
                  الشرقية - ديرب نجم - برج الفلسطيني - أمام الكنيسة - الدور الخامس.
                </p>
              </div>

              <div>
                <span className="text-xs font-bold text-slate-500 block mb-1">الموقع الإرشادي:</span>
                <p className="text-sm text-slate-700">
                  ديرب نجم، محافظة الشرقية (رمز الخريطة Plus Code: <span className="font-mono text-purple-900 font-bold" dir="ltr">PFX6+HRH, Dairab Negm</span>)
                </p>
              </div>
            </div>

            {/* Col 2: Hours, Contact & Deposit Notice */}
            <div className="space-y-6 text-right">
              <div>
                <span className="text-xs font-bold text-slate-500 block mb-1">مواعيد العمل:</span>
                <p className="text-sm text-slate-800 font-medium">
                  يومياً من الساعة <span className="font-mono font-bold text-purple-900">2:00</span> ظهراً حتى <span className="font-mono font-bold text-purple-900">9:00</span> مساءً
                </p>
              </div>

              <div>
                <span className="text-xs font-bold text-slate-500 block mb-1">هاتف التواصل والحجز:</span>
                <a href="tel:01093591193" className="font-mono text-xl font-bold text-slate-900 hover:text-purple-800" dir="ltr">
                  01093591193
                </a>
              </div>

              <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200/80 text-xs space-y-1.5 text-slate-800">
                <div className="flex items-center justify-between font-bold text-purple-950">
                  <span>عربون الحجز التأكيدي:</span>
                  <span className="font-mono text-sm text-emerald-800">150 ج.م</span>
                </div>
                <p className="text-purple-900 leading-relaxed">
                  (يُخصم بالكامل من الكشف أو العلاج عند الزيارة).
                </p>
                <p className="text-[11px] text-slate-600 pt-1 border-t border-purple-200/60 font-mono">
                  التحويل متاح عبر InstaPay على رقم الفرع المعتمد: 01093591193
                </p>
              </div>
            </div>
          </div>

          {/* 4 Required Action Buttons under the branch */}
          <div className="pt-6 border-t border-slate-200/80 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* 1. Phone Call */}
            <a
              href="tel:01093591193"
              className="py-3.5 px-4 rounded-xl font-bold text-xs bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 transition-colors flex items-center justify-center gap-2 text-center shadow-xs"
            >
              <Phone className="w-4 h-4 text-purple-700" />
              <span>اتصال</span>
            </a>

            {/* 2. WhatsApp */}
            <a
              href="https://wa.me/201093591193"
              target="_blank"
              rel="noopener noreferrer"
              className="py-3.5 px-4 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center justify-center gap-2 text-center shadow-xs"
            >
              <MessageCircle className="w-4 h-4 text-white" />
              <span>واتساب</span>
            </a>

            {/* 3. Maps */}
            <a
              href="https://www.google.com/maps/search/?api=1&query=PFX6%2BHRH%2C+Dairab+Negm%2C+Diyarb+Negm%2C+Al-Sharqia+Governorate+7206330"
              target="_blank"
              rel="noopener noreferrer"
              className="py-3.5 px-4 rounded-xl font-bold text-xs bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 transition-colors flex items-center justify-center gap-2 text-center shadow-xs"
            >
              <Navigation className="w-4 h-4 text-purple-700" />
              <span>الخريطة</span>
            </a>

            {/* 4. Book Now */}
            <button
              onClick={() => handleBookingClick()}
              className="cursor-pointer py-3.5 px-4 rounded-xl font-bold text-xs bg-[#2E1B3A] hover:bg-[#4E2E63] text-white transition-colors flex items-center justify-center gap-2 text-center shadow-md"
            >
              <Calendar className="w-4 h-4 text-[#E8D7A1]" />
              <span>احجز الآن</span>
            </button>
          </div>
        </div>
      </section>

      {/* 4. BOOKING STEPS SECTION */}
      <section id="booking-steps" className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">
              خطوات حجز موعدك الطبي
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              خمس خطوات واضحة تضمن لك حجزاً مؤكداً وموعداً دقيقاً دون فترات انتظار طويلة
            </p>
          </div>

          {/* Sequential 5 Steps Flow */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {[
              {
                step: '01',
                title: 'تأكيد الفرع وموقع العيادة',
                desc: 'فرع ديرب نجم (برج الفلسطيني، أمام الكنيسة، الدور الخامس).',
              },
              {
                step: '02',
                title: 'إدخال البيانات الأساسية',
                desc: 'اكتب اسمك الثلاثي ورقم هاتفك المحمول لربطه بملفك الطبي ورقم الحجز المرجعي.',
              },
              {
                step: '03',
                title: 'تحديد اليوم والموعد المناسب',
                desc: 'المواعيد متاحة للأيام الأربعة القادمة لضمان الانضباط التام وتفادي التكدس داخل العيادة.',
              },
              {
                step: '04',
                title: 'تحويل العربون أو كود الإعادة',
                desc: 'قم بتحويل عربون الحجز التأكيدي عبر InstaPay أو أدخل كود الإعادة إن كنت مريضاً متابعاً.',
              },
              {
                step: '05',
                title: 'المراجعة والاعتماد الفوري',
                desc: 'تراجع السكرتارية إشعار التحويل وتعتمد الحجز فوراً مع مزامنة السجل وحفظ حقك في الموعد.',
              },
            ].map((item, idx) => (
              <div key={idx} className="space-y-3 text-right">
                <span className="text-4xl font-black text-purple-900/30 font-mono block">
                  {item.step}
                </span>
                <h3 className="font-bold text-sm text-slate-900 leading-snug">
                  {item.title}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>

          <div className="text-center pt-4">
            <button
              onClick={() => handleBookingClick()}
              className="cursor-pointer px-8 py-4 rounded-xl font-bold text-sm text-white bg-[#2E1B3A] hover:bg-[#4E2E63] shadow-md transition-all inline-flex items-center gap-2"
            >
              <Calendar className="w-4 h-4 text-[#E8D7A1]" />
              <span>ابدأ خطوات حجز موعدك الآن</span>
            </button>
          </div>
        </div>
      </section>

      {/* Interactive Booking Modal Popup */}
      <BookingModal
        isOpen={internalModalOpen}
        onClose={() => setInternalModalOpen(false)}
        initialService={internalSelectedService}
      />
    </div>
  );
};
