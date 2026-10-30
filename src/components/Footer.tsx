/**
 * Footer Component - Deep Night Purple with Location, Actions & Portals at Bottom
 * Dr. Mohamed Sabra Elnaggar Dental Clinic
 */
import React from 'react';
import { ClinicLogo } from './ClinicLogo.tsx';
import { Phone, MapPin, ExternalLink, ShieldCheck, Lock, MessageCircle, Calendar } from 'lucide-react';

interface FooterProps {
  onNavigate?: (path: string) => void;
  onOpenLogin?: () => void;
  onOpenBooking?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate, onOpenLogin, onOpenBooking }) => {
  return (
    <footer className="bg-[#2E1B3A] text-white border-t border-[#5A4268] pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 pb-12 border-b border-[#5A4268]/50">
          {/* Col 1: Brand & Identity */}
          <div className="space-y-4">
            <ClinicLogo size="lg" inverted={true} />
            <p className="text-sm text-[#D8CDE0] leading-relaxed pt-2">
              عيادة متخصصة في طب وجراحة الفم والأسنان وتقويم وتجميل الأسنان، مدعومة بأحدث المعايير الطبية وأقصى درجات التعقيم لضمان ابتسامة طبيعية متناسقة.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <a
                href="https://www.facebook.com/Dr.SabraElnaggar/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs bg-[#4E2E63] text-white hover:bg-[#6F4785] transition-colors"
              >
                <span>صفحة الفيسبوك الرسمية</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Col 2: Quick Links */}
          <div className="space-y-4">
            <h4 className="text-base font-bold text-white tracking-wide">روابط سريعة</h4>
            <ul className="space-y-2.5 text-sm text-[#D8CDE0]">
              <li>
                <button
                  onClick={() => {
                    if (onOpenBooking) {
                      onOpenBooking();
                    } else if (onNavigate) {
                      onNavigate('/booking');
                    }
                  }}
                  className="cursor-pointer hover:text-[#E8D7A1] transition-colors flex items-center gap-1.5"
                >
                  <Calendar className="w-3.5 h-3.5 text-[#E8D7A1]" />
                  <span>حجز موعد إلكتروني</span>
                </button>
              </li>
              <li>
                <a href="#services" className="hover:text-[#E8D7A1] transition-colors">
                  الخدمات العلاجية والتجميلية
                </a>
              </li>
              <li>
                <a href="#location" className="hover:text-[#E8D7A1] transition-colors">
                  موقع العيادة والاتجاهات
                </a>
              </li>
              <li>
                <a href="#booking-steps" className="hover:text-[#E8D7A1] transition-colors">
                  خطوات الحجز
                </a>
              </li>
            </ul>
          </div>

          {/* Col 3: Location & Contact */}
          <div className="space-y-4">
            <h4 className="text-base font-bold text-white tracking-wide">بيانات التواصل والموقع</h4>
            <div className="space-y-3 text-sm text-[#D8CDE0]">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-[#E8D7A1] shrink-0 mt-1" />
                <span className="leading-relaxed">
                  الشرقية - ديرب نجم - برج الفلسطيني - أمام الكنيسة - الدور الخامس.
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-[#E8D7A1] shrink-0" />
                <a href="tel:01093591193" className="hover:text-white font-medium" dir="ltr">
                  01093591193
                </a>
              </div>
              <div className="flex items-center gap-2.5">
                <MessageCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <a 
                  href="https://wa.me/201093591193" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="hover:text-emerald-300 font-medium"
                >
                  تواصل عبر واتساب
                </a>
              </div>
              <div className="pt-2">
                <a
                  href="https://www.google.com/maps/search/?api=1&query=PFX6%2BHRH%2C+Dairab+Negm%2C+Diyarb+Negm%2C+Al-Sharqia+Governorate+7206330"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-[#E8D7A1] hover:underline"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>فتح الموقع على Google Maps</span>
                </a>
              </div>
            </div>
          </div>

          {/* Col 4: Portals - لوحة الدكتور والسكرتارية في أسفل الموقع */}
          <div className="space-y-4">
            <h4 className="text-base font-bold text-white tracking-wide">بوابات الإدارة والتشغيل</h4>
            <p className="text-xs text-[#D8CDE0] leading-relaxed">
              الدخول المخصص للطاقم الطبي وإدارة المواعيد والسجلات.
            </p>
            <div className="space-y-2.5 pt-1">
              <button
                onClick={() => onNavigate && onNavigate('/doctor')}
                className="cursor-pointer w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-[#4E2E63] hover:bg-[#6F4785] border border-[#5A4268] text-white transition-colors shadow-xs"
              >
                <div className="flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-[#E8D7A1]" />
                  <span>لوحة تحكم الدكتور</span>
                </div>
                <span className="text-[10px] text-[#E8D7A1]">دخول الطبيب</span>
              </button>

              <button
                onClick={() => onNavigate && onNavigate('/secretary')}
                className="cursor-pointer w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-[#4E2E63]/80 hover:bg-[#4E2E63] border border-[#5A4268] text-white transition-colors shadow-xs"
              >
                <div className="flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>لوحة تحكم السكرتارية</span>
                </div>
                <span className="text-[10px] text-emerald-300">الاستقبال</span>
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#D8CDE0]/80">
          <p>© {new Date().getFullYear()} عيادة د. محمد صبرة النجار لطب وجراحة الفم والأسنان وتقويم الأسنان. جميع الحقوق محفوظة.</p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#E8D7A1]" />
              <span>نظام حجز مشفر ومحمي</span>
            </span>
            <span>·</span>
            <span>الشرقية - ديرب نجم</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
