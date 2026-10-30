/**
 * Main Application Router & Entry Point
 * Dr. Mohamed Sabra Elnaggar Dental Clinic
 */
import React, { useState, useEffect } from 'react';
import { Header } from './components/Header.tsx';
import { Footer } from './components/Footer.tsx';
import { LoginModal } from './components/LoginModal.tsx';
import { BookingModal } from './components/BookingModal.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { BookingPage } from './pages/BookingPage.tsx';
import { SecretaryDashboard } from './pages/SecretaryDashboard.tsx';
import { DoctorDashboard } from './pages/DoctorDashboard.tsx';
import type { AuthUser } from './types/index.ts';

export default function App() {
  const [currentPath, setCurrentPath] = useState<string>(window.location.pathname || '/');
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [loginDefaultRole, setLoginDefaultRole] = useState<'doctor' | 'secretary'>('doctor');
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  // Global booking modal state
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedModalService, setSelectedModalService] = useState<{ code: string; name: string } | null>(null);

  const handleOpenBooking = (service?: { code: string; name: string } | null) => {
    setSelectedModalService(service || null);
    setBookingModalOpen(true);
  };

  // Sync with browser history and path changes
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };
    window.addEventListener('popstate', handlePopState);

    // Check stored user & session
    const storedUser = localStorage.getItem('drsabra_user');
    const storedToken = localStorage.getItem('drsabra_token');
    if (storedUser && storedToken) {
      try {
        setCurrentUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem('drsabra_user');
        localStorage.removeItem('drsabra_token');
      }
    }

    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (path: string) => {
    if (path.startsWith('/#')) {
      // Anchor scroll on home
      if (currentPath !== '/') {
        window.history.pushState({}, '', '/');
        setCurrentPath('/');
        setTimeout(() => {
          const id = path.replace('/#', '');
          const el = document.getElementById(id);
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } else {
        const id = path.replace('/#', '');
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }
      return;
    }

    window.history.pushState({}, '', path);
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLoginSuccess = (user: AuthUser, token: string) => {
    setCurrentUser(user);
    if (user.role === 'doctor') {
      navigateTo('/doctor');
    } else {
      navigateTo('/secretary');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('drsabra_token');
    localStorage.removeItem('drsabra_user');
    setCurrentUser(null);
    navigateTo('/');
  };

  // Guard for protected routes
  const renderContent = () => {
    if (currentPath === '/booking') {
      return <BookingPage onNavigate={navigateTo} />;
    }

    if (currentPath === '/secretary') {
      if (!currentUser) {
        return (
          <div className="min-h-[70vh] flex items-center justify-center p-6 bg-[#FAF7F2]">
            <div className="max-w-md w-full p-8 rounded-2xl bg-white border border-[#D9CCDF] shadow-md text-center space-y-4">
              <h2 className="text-xl font-bold text-[#2E1B3A]">تسجيل دخول السكرتارية مطلوب</h2>
              <p className="text-xs text-[#4B4350]">
                يجب تسجيل الدخول بصلاحيات السكرتارية أو إدارة العيادة للوصول إلى هذه اللوحة.
              </p>
              <button
                onClick={() => {
                  setLoginDefaultRole('secretary');
                  setLoginModalOpen(true);
                }}
                className="cursor-pointer w-full py-3 px-4 rounded-xl text-xs font-bold bg-[#4E2E63] text-white hover:bg-[#6F4785] transition-colors"
              >
                تسجيل الدخول الآن
              </button>
            </div>
          </div>
        );
      }
      return (
        <SecretaryDashboard
          currentUser={currentUser}
          onLogout={handleLogout}
          onNavigate={navigateTo}
        />
      );
    }

    if (currentPath === '/doctor') {
      if (!currentUser || currentUser.role !== 'doctor') {
        return (
          <div className="min-h-[70vh] flex items-center justify-center p-6 bg-[#FAF7F2]">
            <div className="max-w-md w-full p-8 rounded-2xl bg-white border border-[#D9CCDF] shadow-md text-center space-y-4">
              <h2 className="text-xl font-bold text-[#2E1B3A]">صلاحيات الدكتور الإدارية والمالية</h2>
              <p className="text-xs text-[#4B4350]">
                هذه الصفحة مخصصة للدكتور صاحب العيادة لمتابعة السجلات المالية والطبية وشيت الدكتور.
              </p>
              <button
                onClick={() => {
                  setLoginDefaultRole('doctor');
                  setLoginModalOpen(true);
                }}
                className="cursor-pointer w-full py-3 px-4 rounded-xl text-xs font-bold bg-[#4E2E63] text-white hover:bg-[#6F4785] transition-colors"
              >
                تسجيل دخول الدكتور
              </button>
            </div>
          </div>
        );
      }
      return (
        <DoctorDashboard
          currentUser={currentUser}
          onLogout={handleLogout}
          onNavigate={navigateTo}
        />
      );
    }

    // Default to Landing Page
    return <HomePage onNavigate={navigateTo} onOpenBooking={handleOpenBooking} />;
  };

  return (
    <div className="min-h-screen flex flex-col font-sans bg-[#FAF7F2] text-[#4B4350]">
      {/* Top Header */}
      <Header
        currentPath={currentPath}
        onNavigate={navigateTo}
        onOpenLogin={() => {
          setLoginDefaultRole('doctor');
          setLoginModalOpen(true);
        }}
        onOpenBooking={() => handleOpenBooking(null)}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* Main View */}
      <div className="flex-1">{renderContent()}</div>

      {/* Footer */}
      <Footer
        onNavigate={navigateTo}
        onOpenLogin={() => {
          setLoginDefaultRole('doctor');
          setLoginModalOpen(true);
        }}
        onOpenBooking={() => handleOpenBooking(null)}
      />

      {/* Login Dialog */}
      <LoginModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        defaultRole={loginDefaultRole}
      />

      {/* Global Interactive Booking Modal */}
      <BookingModal
        isOpen={bookingModalOpen}
        onClose={() => setBookingModalOpen(false)}
        initialService={selectedModalService}
      />
    </div>
  );
}
