/**
 * Interactive Dental Odontogram (32 Adult Teeth Chart)
 * Universal Numbering System 1-32
 * Multi-Branch Dental Clinic & PMS Platform
 */
import React, { useState } from 'react';
import { ToothRecord } from '../types/index.ts';
import { Check, X, Edit3, AlertCircle } from 'lucide-react';

interface DentalOdontogramProps {
  patientId: string;
  records: ToothRecord[];
  onUpdateTooth: (toothNumber: number, condition: ToothRecord['condition'], notes: string) => Promise<void>;
  readOnly?: boolean;
}

const CONDITIONS_CONFIG: Record<
  ToothRecord['condition'],
  { label: string; bg: string; border: string; text: string; badge: string }
> = {
  healthy: { label: 'سليم', bg: 'bg-white', border: 'border-slate-300', text: 'text-slate-800', badge: 'bg-slate-100 text-slate-700' },
  caries: { label: 'تسوس', bg: 'bg-amber-100', border: 'border-amber-400', text: 'text-amber-900', badge: 'bg-amber-200 text-amber-900' },
  filling: { label: 'حشو تجميلي', bg: 'bg-blue-100', border: 'border-blue-400', text: 'text-blue-900', badge: 'bg-blue-200 text-blue-900' },
  rct: { label: 'علاج عصب (جذور)', bg: 'bg-purple-100', border: 'border-purple-400', text: 'text-purple-900', badge: 'bg-purple-200 text-purple-900' },
  extracted: { label: 'مفقود / مخلوع', bg: 'bg-neutral-200', border: 'border-neutral-400', text: 'text-neutral-500', badge: 'bg-neutral-300 text-neutral-800' },
  crown: { label: 'طربوش / تاج', bg: 'bg-amber-200', border: 'border-amber-500', text: 'text-amber-950', badge: 'bg-amber-300 text-amber-950' },
  implant: { label: 'زراعة سن', bg: 'bg-emerald-100', border: 'border-emerald-400', text: 'text-emerald-900', badge: 'bg-emerald-200 text-emerald-900' },
};

export const DentalOdontogram: React.FC<DentalOdontogramProps> = ({
  patientId,
  records,
  onUpdateTooth,
  readOnly = false,
}) => {
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [selectedCondition, setSelectedCondition] = useState<ToothRecord['condition']>('healthy');
  const [toothNotes, setToothNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Map tooth records
  const recordsMap = new Map<number, ToothRecord>(records.map((r) => [r.tooth_number, r]));

  // Adult teeth groups:
  // Upper Maxillary: 1-16
  const upperTeeth = Array.from({ length: 16 }, (_, i) => i + 1);
  // Lower Mandibular: 32 down to 17 (standard dental display)
  const lowerTeeth = Array.from({ length: 16 }, (_, i) => 32 - i);

  const handleOpenToothModal = (toothNum: number) => {
    if (readOnly) return;
    const existing = recordsMap.get(toothNum);
    setSelectedTooth(toothNum);
    setSelectedCondition(existing?.condition || 'healthy');
    setToothNotes(existing?.notes || '');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTooth === null) return;
    try {
      setSaving(true);
      await onUpdateTooth(selectedTooth, selectedCondition, toothNotes);
      setSelectedTooth(null);
    } catch (err) {
      console.error('Failed to update tooth record:', err);
    } finally {
      setSaving(false);
    }
  };

  const renderTooth = (num: number) => {
    const record = recordsMap.get(num);
    const condition = record?.condition || 'healthy';
    const config = CONDITIONS_CONFIG[condition];

    return (
      <button
        key={num}
        type="button"
        onClick={() => handleOpenToothModal(num)}
        title={`سن رقم ${num}: ${config.label} ${record?.notes ? `(${record.notes})` : ''}`}
        className={`group relative flex flex-col items-center justify-between p-2 rounded-xl border-2 transition-all ${
          config.bg
        } ${config.border} ${config.text} ${
          readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-105 hover:shadow-md'
        } w-13 h-18 sm:w-16 sm:h-22`}
      >
        <span className="text-[11px] font-mono font-bold">{num}</span>

        {/* Anatomical stylized tooth icon */}
        <div className="my-auto">
          {condition === 'extracted' ? (
            <div className="text-xl font-bold text-neutral-400">✕</div>
          ) : condition === 'implant' ? (
            <svg className="w-5 h-7 text-emerald-700" viewBox="0 0 24 32" fill="currentColor">
              <rect x="7" y="2" width="10" height="12" rx="2" />
              <polygon points="12,30 8,14 16,14" />
            </svg>
          ) : (
            <svg
              className={`w-5 h-6 ${
                condition === 'crown' ? 'text-amber-600' : condition === 'rct' ? 'text-purple-600' : 'text-slate-400'
              }`}
              viewBox="0 0 24 28"
              fill="currentColor"
            >
              <path d="M 6 2 C 2 2, 2 12, 6 18 C 8 21, 8 26, 10 26 C 11 26, 11 20, 12 20 C 13 20, 13 26, 14 26 C 16 26, 16 21, 18 18 C 22 12, 22 2, 18 2 C 14 2, 13 6, 12 6 C 11 6, 10 2, 6 2 Z" />
            </svg>
          )}
        </div>

        <span className={`text-[9px] font-bold px-1 rounded truncate max-w-full ${config.badge}`}>
          {config.label}
        </span>
      </button>
    );
  };

  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <h3 className="font-bold text-base text-slate-900">مخطط رسم الأسنان التفاعلي (Odontogram)</h3>
          <p className="text-xs text-slate-500">
            الترقيم الطبي العالمي الموحد (1-32). اضغط على أي سن لتعديل حالته وإضافة الملاحظات السريرية.
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {Object.entries(CONDITIONS_CONFIG).map(([condKey, conf]) => (
            <span
              key={condKey}
              className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${conf.bg} ${conf.border} ${conf.text}`}
            >
              {conf.label}
            </span>
          ))}
        </div>
      </div>

      {/* Chart Layout */}
      <div className="space-y-6 overflow-x-auto pb-2">
        {/* Upper Arch (Maxilla) 1-16 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 px-2">
            <span>الفك العلوي — يمين المريض (1-8)</span>
            <span>المنتصف</span>
            <span>الفك العلوي — يسار المريض (9-16)</span>
          </div>
          <div className="flex items-center justify-center gap-1.5 sm:gap-2 min-w-max p-2 rounded-xl bg-slate-50/70 border border-slate-200">
            {upperTeeth.map((num) => renderTooth(num))}
          </div>
        </div>

        {/* Center Divider line */}
        <div className="relative flex items-center justify-center">
          <div className="w-full border-t border-dashed border-slate-300"></div>
          <span className="absolute px-3 bg-white text-[10px] font-mono font-bold text-slate-400">
            خط إطباق الفكين (Occlusal Plane)
          </span>
        </div>

        {/* Lower Arch (Mandible) 32-17 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 px-2">
            <span>الفك السفلي — يمين المريض (32-25)</span>
            <span>المنتصف</span>
            <span>الفك السفلي — يسار المريض (24-17)</span>
          </div>
          <div className="flex items-center justify-center gap-1.5 sm:gap-2 min-w-max p-2 rounded-xl bg-slate-50/70 border border-slate-200">
            {lowerTeeth.map((num) => renderTooth(num))}
          </div>
        </div>
      </div>

      {/* Tooth Edit Dialog Modal */}
      {selectedTooth !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <form
            onSubmit={handleSave}
            className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 space-y-4 text-right"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h4 className="font-bold text-base text-slate-900">تعديل بيانات السن رقم ({selectedTooth})</h4>
                <span className="text-xs text-slate-500">
                  {selectedTooth <= 16 ? 'الفك العلوي' : 'الفك السفلي'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTooth(null)}
                className="cursor-pointer p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-2">الحالة السريرية للسن:</label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(CONDITIONS_CONFIG) as ToothRecord['condition'][]).map((condKey) => {
                  const conf = CONDITIONS_CONFIG[condKey];
                  const isSelected = selectedCondition === condKey;
                  return (
                    <button
                      key={condKey}
                      type="button"
                      onClick={() => setSelectedCondition(condKey)}
                      className={`cursor-pointer p-2.5 rounded-xl border text-xs font-bold text-right flex items-center justify-between transition-all ${
                        isSelected
                          ? `${conf.bg} border-slate-900 text-slate-900 shadow-xs ring-1 ring-slate-900`
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400'
                      }`}
                    >
                      <span>{conf.label}</span>
                      {isSelected && <Check className="w-4 h-4 text-slate-900" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                ملاحظات الطبيب وخطة العلاج لهذا السن:
              </label>
              <textarea
                rows={3}
                value={toothNotes}
                onChange={(e) => setToothNotes(e.target.value)}
                placeholder="مثال: حشو ليزر سطحي، تسوس من الدرجة الثانية، يحتاج جلسة إندودونتيكس ثانية..."
                className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:border-slate-800"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedTooth(null)}
                className="cursor-pointer px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={saving}
                className="cursor-pointer px-5 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition-colors"
              >
                {saving ? 'جاري الحفظ...' : 'حفظ حالة السن'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
