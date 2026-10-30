/**
 * Header Top Bar
 * Dr. Mohamed Sabra Elnaggar Dental Clinic
 */
import React, { useState } from 'react';
import { ClinicLogo } from './ClinicLogo.tsx';
import { Calendar, Menu, X } from 'lucide-react';

interface HeaderProps {
  currentPath?: string;
  onNavigate?: (path: string) => void;
  onOpenLogin?: () => void;
  onOpenBooking?: () => void;
  currentUser?: any;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentPath = '/',
  onNavigate,
  onOpenBooking,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (path: string) => {
    setMobileMenuOpen(false);
    if (onNavigate) {
      onNavigate(path);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-[#2E1B3A]/95 backdrop-blur-md border-b border-[#5A4268]/60 text-white w-full">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-18 sm:h-20 flex items-center justify-between gap-2 sm:gap-4 md:gap-8 w-full overflow-hidden">
        {/* Brand Wordmark */}
        <div 
          onClick={() => handleNavClick('/')}
          className="cursor-pointer flex items-center shrink min-w-0 hover:opacity-95 transition-opacity"
        >
          <ClinicLogo size="md" inverted={true} />
        </div>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#D8CDE0]">
          <button
            onClick={() => handleNavClick('/')}
            className={`cursor-pointer whitespace-nowrap transition-colors hover:text-white ${
              currentPath === '/' ? 'text-[#E8D7A1] font-semibold' : ''
            }`}
          >
            الرئيسية
          </button>
          <a
            href="#services"
            onClick={(e) => {
              if (currentPath !== '/') {
                e.preventDefault();
                handleNavClick('/#services');
              }
            }}
            className="cursor-pointer whitespace-nowrap transition-colors hover:text-white"
          >
            الخدمات
          </a>
          <a
            href="#location"
            onClick={(e) => {
              if (currentPath !== '/') {
                e.preventDefault();
                handleNavClick('/#location');
              }
            }}
            className="cursor-pointer whitespace-nowrap transition-colors hover:text-white"
          >
            موقع العيادة
          </a>
          <a
            href="#booking-steps"
            onClick={(e) => {
              if (currentPath !== '/') {
                e.preventDefault();
                handleNavClick('/#booking-steps');
              }
            }}
            className="cursor-pointer whitespace-nowrap transition-colors hover:text-white"
          >
            خطوات الحجز
          </a>
        </nav>

        {/* Primary Action Button (Without phone number and without doctor/logout buttons) */}
        <div className="hidden sm:flex items-center gap-3 shrink-0">
          <button
            onClick={() => {
              if (onOpenBooking) {
                onOpenBooking();
              } else {
                handleNavClick('/booking');
              }
            }}
            className="cursor-pointer flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-[#2E1B3A] bg-gradient-to-r from-[#E8D7A1] to-[#FAF7F2] hover:brightness-105 shadow-sm transition-all whitespace-nowrap"
          >
            <Calendar className="w-4 h-4" />
            <span>احجز موعدك</span>
          </button>
        </div>

        {/* Mobile menu trigger */}
        <div className="flex sm:hidden items-center gap-2">
          <button
            onClick={() => {
              if (onOpenBooking) {
                onOpenBooking();
              } else {
                handleNavClick('/booking');
              }
            }}
            className="cursor-pointer px-3.5 py-1.5 rounded-lg text-xs font-semibold text-[#2E1B3A] bg-[#E8D7A1] whitespace-nowrap"
          >
            احجز الآن
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-white hover:bg-white/10"
            aria-label="القائمة"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileMenuOpen && (
        <div className="sm:hidden bg-[#2E1B3A] border-b border-[#5A4268] px-4 pt-3 pb-6 space-y-3">
          <button
            onClick={() => handleNavClick('/')}
            className="block w-full text-right py-2 text-sm text-[#D8CDE0] hover:text-white"
          >
            الرئيسية
          </button>
          <a
            href="#services"
            onClick={() => setMobileMenuOpen(false)}
            className="block w-full text-right py-2 text-sm text-[#D8CDE0] hover:text-white"
          >
            الخدمات
          </a>
          <a
            href="#location"
            onClick={() => setMobileMenuOpen(false)}
            className="block w-full text-right py-2 text-sm text-[#D8CDE0] hover:text-white"
          >
            موقع العيادة
          </a>
          <a
            href="#booking-steps"
            onClick={() => setMobileMenuOpen(false)}
            className="block w-full text-right py-2 text-sm text-[#D8CDE0] hover:text-white"
          >
            خطوات الحجز
          </a>
          <div className="pt-3 border-t border-[#5A4268]">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                if (onOpenBooking) {
                  onOpenBooking();
                } else {
                  handleNavClick('/booking');
                }
              }}
              className="cursor-pointer w-full py-2.5 rounded-xl text-sm font-semibold text-[#2E1B3A] bg-[#E8D7A1] flex items-center justify-center gap-2"
            >
              <Calendar className="w-4 h-4" />
              <span>احجز موعدك الآن</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
