/**
 * Deposit Policy Modal («تعديل سعر الحجز»)
 * Dr. Mohamed Sabra Elnaggar Dental Clinic & PMS Platform
 */
import React, { useState, useEffect } from 'react';
import { X, DollarSign, Check, AlertCircle, Phone, MapPin } from 'lucide-react';
import { Branch } from '../types/index.ts';

interface DepositPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  branches: Branch[];
  onSuccess: () => void;
}

export const DepositPolicyModal: React.FC<DepositPolicyModalProps> = ({
  isOpen,
  onClose,
  branches,
  onSuccess,
}) => {
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [depositAmount, setDepositAmount] = useState<number>(150);
  const [instapayPhone, setInstapayPhone] = useState<string>('01093591193');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (branches && branches.length > 0) {
      const b = branches.find((item) => item.id === selectedBranchId) || branches[0];
      setSelectedBranchId(b.id);
      setDepositAmount(b.deposit_amount);
      setInstapayPhone(b.instapay_phone || '01093591193');
    }
  }, [branches, selectedBranchId, isOpen]);

  if (!isOpen) return null;

  const handleBranchChange = (branchId: string) => {
    setSelectedBranchId(branchId);
    const b = branches.find((item) => item.id === branchId);
    if (b) {
      setDepositAmount(b.deposit_amount);
      setInstapayPhone(b.instapay_phone || '01093591193');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const token = localStorage.getItem('drsabra_token') || '';
      const res = await fetch(`/api/doctor/branches/${selectedBranchId}/deposit-policy`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          deposit_amount: depositAmount,
          instapay_phone: instapayPhone,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'فشل تحديث سياسة العربون');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء حفظ الإعدادات');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 sm:p-8 space-y-5 text-right">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2 text-slate-900">
            <DollarSign className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-lg">تعديل سياسة وسعر عربون الحجز</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer p-1 rounded-lg text-slate-400 hover:text-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          يمكنك تعديل قيمة العربون التأكيدي ورقم تحويل InstaPay المخصص لكل فرع على حدة، ويتم تطبيق التعديل فورياً على معالج الحجز العام.
        </p>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">اختر الفرع المطلوب:</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {branches.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => handleBranchChange(b.id)}
                  className={`cursor-pointer p-3 rounded-xl border text-right transition-all flex flex-col justify-between ${
                    selectedBranchId === b.id
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-400'
                  }`}
                >
                  <div className="font-bold text-xs">{b.name_ar}</div>
                  <div className="text-[11px] mt-1 opacity-80 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    <span>{b.city}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              قيمة العربون التأكيدي للفرع (ج.م) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                min={0}
                required
                value={depositAmount}
                onChange={(e) => setDepositAmount(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-slate-900"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">جنيه مصري</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              يُخصم كامل هذا المبلغ تلقائياً من فاتورة كشف أو علاج المريض عند الزيارة.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              رقم هاتف تحويل InstaPay للفرع <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                dir="ltr"
                required
                value={instapayPhone}
                onChange={(e) => setInstapayPhone(e.target.value)}
                placeholder="010XXXXXXXX"
                className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-slate-300 text-sm font-mono text-right focus:outline-none focus:border-slate-900"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={saving}
              className="cursor-pointer px-6 py-2.5 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{saving ? 'جاري الحفظ...' : 'حفظ وتطبيق فورياً'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
