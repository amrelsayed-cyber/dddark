/**
 * Staff Login Modal / Dialog
 * Dr. Mohamed Sabra Elnaggar Dental Clinic
 */
import React, { useState } from 'react';
import { ClinicLogo } from './ClinicLogo.tsx';
import { Lock, User, KeyRound, AlertCircle, Loader2, X, CheckCircle2 } from 'lucide-react';
import type { AuthUser } from '../types/index.ts';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: AuthUser, token: string) => void;
  defaultRole?: 'doctor' | 'secretary';
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  defaultRole = 'doctor',
}) => {
  const [username, setUsername] = useState(defaultRole === 'doctor' ? 'doctor' : 'secretary');
  const [password, setPassword] = useState(defaultRole === 'doctor' ? 'doctor@123' : 'secretary@123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'فشل تسجيل الدخول');
      }

      // Save token in localStorage
      localStorage.setItem('drsabra_token', data.token);
      localStorage.setItem('drsabra_user', JSON.stringify(data.user));

      onLoginSuccess(data.user, data.token);
      onClose();
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  };

  const setTestRole = (role: 'doctor' | 'secretary') => {
    if (role === 'doctor') {
      setUsername('doctor');
      setPassword('doctor@123');
    } else {
      setUsername('secretary');
      setPassword('secretary@123');
    }
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#2E1B3A] text-white rounded-2xl border border-[#5A4268] shadow-2xl p-6 sm:p-8">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="cursor-pointer absolute top-4 left-4 p-2 rounded-xl text-[#D8CDE0] hover:text-white hover:bg-white/10 transition-colors"
          aria-label="إغلاق"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand Lockup */}
        <div className="flex flex-col items-center text-center space-y-3 mb-6">
          <ClinicLogo size="lg" inverted={true} />
          <div>
            <h3 className="text-xl font-bold text-white">تسجيل دخول الطاقم الطبي</h3>
            <p className="text-xs text-[#D8CDE0] mt-1">الوصول المحمي إلى لوحة الدكتور أو السكرتارية</p>
          </div>
        </div>

        {/* Quick Credentials Helper */}
        <div className="mb-6 p-3 rounded-xl bg-[#4E2E63]/50 border border-[#5A4268] text-xs">
          <div className="text-[#E8D7A1] font-semibold mb-2">اختر حسابًا للاختبار السريع:</div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setTestRole('doctor')}
              className={`cursor-pointer px-3 py-2 rounded-lg text-right border transition-all ${
                username === 'doctor'
                  ? 'bg-[#6F4785] border-[#E8D7A1] text-white'
                  : 'bg-[#2E1B3A]/60 border-transparent text-[#D8CDE0] hover:text-white'
              }`}
            >
              <div className="font-bold flex items-center justify-between">
                <span>لوحة الدكتور</span>
                {username === 'doctor' && <CheckCircle2 className="w-3.5 h-3.5 text-[#E8D7A1]" />}
              </div>
              <div className="text-[10px] opacity-75 font-mono">doctor / doctor@123</div>
            </button>

            <button
              type="button"
              onClick={() => setTestRole('secretary')}
              className={`cursor-pointer px-3 py-2 rounded-lg text-right border transition-all ${
                username === 'secretary'
                  ? 'bg-[#6F4785] border-[#E8D7A1] text-white'
                  : 'bg-[#2E1B3A]/60 border-transparent text-[#D8CDE0] hover:text-white'
              }`}
            >
              <div className="font-bold flex items-center justify-between">
                <span>السكرتارية</span>
                {username === 'secretary' && <CheckCircle2 className="w-3.5 h-3.5 text-[#E8D7A1]" />}
              </div>
              <div className="text-[10px] opacity-75 font-mono">secretary / secretary@123</div>
            </button>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#D8CDE0] mb-1.5">اسم المستخدم</label>
            <div className="relative">
              <User className="w-4 h-4 text-[#A985BA] absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="doctor أو secretary"
                className="w-full pl-3 pr-10 py-2.5 rounded-xl bg-[#1F1227] border border-[#5A4268] text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#A985BA] transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#D8CDE0] mb-1.5">كلمة المرور</label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-[#A985BA] absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-3 pr-10 py-2.5 rounded-xl bg-[#1F1227] border border-[#5A4268] text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#A985BA] transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="cursor-pointer w-full mt-2 py-3 px-4 rounded-xl font-bold text-sm text-[#2E1B3A] bg-gradient-to-r from-[#E8D7A1] to-[#FAF7F2] hover:brightness-105 shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>جاري التحقق...</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>تسجيل الدخول</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
