# دليل رفع الموقع على هوستنجر (Node.js Web App)

## 1) الرفع
hPanel ← Websites ← Add Website ← **Node.js Apps** ← **Upload your website files** ← ارفع ملف الـ ZIP.

## 2) إعدادات الـ Build (تظهر بعد الرفع)
| الإعداد | القيمة |
|---|---|
| Node.js version | **22.x** (لازم 22.13 أو أحدث - الموقع بيستخدم SQLite المدمج في Node) |
| Build command | `npm run build` |
| Start command | `npm start` |
| Entry file | `app.js` (أو `server.js`) |
| Output directory | `dist` |

## 3) Environment Variables (ضروري)
- `NODE_ENV` = `production`
- `JWT_SECRET` = نص عشوائي طويل
- `DATA_DIR` = `/home/USERNAME/clinic-data` (يفضل - يحفظ الداتابيز بعيد عن ملفات الموقع)
- متغيرات Google Sheets لو عايز المزامنة (اختياري)

## 4) بعد التشغيل
- افتح `https://دومينك/healthz` لازم يرجع `{"ok":true}`
- لوحة الدكتور: `/doctor` ← `doctor` / `doctor@123`
- لوحة السكرتارية: `/secretary` ← `secretary` / `secretary@123`
- **غيّر كلمات المرور الافتراضية فورًا بعد أول دخول.**

## 5) ملاحظات مهمة
- أول تشغيل بينشئ قاعدة البيانات `clinic.db` تلقائيًا ومعاها البيانات الأولية.
- ظهور تحذير `ExperimentalWarning: SQLite` في اللوجز طبيعي ومش مشكلة.
- لو عملت رفع جديد للموقع: خد نسخة احتياطية من لوحة الدكتور (`/api/doctor/download-db`) لو مش مستخدم `DATA_DIR`.
- لو الموقع ظهر "Application not found/502": راجع إن النسخة 22+ وإن `npm run build` خلص بنجاح من الـ Build logs.
