/**
 * Database module for Dental Clinic & PMS Platform
 * Powered by Node.js native SQLite (node:sqlite)
 */
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

// Ensure data directory exists
// App root: folder that contains server.js (works under Passenger/Hostinger where cwd may differ)
const here = path.dirname(fileURLToPath(import.meta.url));
export const APP_ROOT = process.env.APP_ROOT
  ? path.resolve(process.env.APP_ROOT)
  : /[\\/]src[\\/]server$/.test(here) ? path.resolve(here, '..', '..') : here;
// Set DATA_DIR (e.g. /home/USER/clinic-data) to keep the database OUTSIDE the app folder so redeploys never wipe it
export const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(APP_ROOT, 'data');
const dbDir = DATA_DIR;
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'clinic.db');
export const db = new DatabaseSync(dbPath);

// Enable WAL mode & foreign keys
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

export function initDatabase() {
  db.exec(`
    -- Branches table (Multi-Branch support)
    CREATE TABLE IF NOT EXISTS branches (
      id TEXT PRIMARY KEY,
      name_ar TEXT NOT NULL,
      name_en TEXT NOT NULL,
      city TEXT NOT NULL DEFAULT 'الشرقية',
      address_ar TEXT NOT NULL,
      phone TEXT NOT NULL,
      maps_url TEXT NOT NULL,
      plus_code TEXT NOT NULL,
      deposit_amount REAL NOT NULL DEFAULT 150,
      instapay_phone TEXT NOT NULL DEFAULT '01093591193',
      daily_open_time TEXT NOT NULL DEFAULT '14:00',
      daily_close_time TEXT NOT NULL DEFAULT '21:00',
      slot_duration_minutes INTEGER NOT NULL DEFAULT 30,
      slot_capacity INTEGER NOT NULL DEFAULT 1,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- Users & Staff table
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('doctor', 'secretary', 'admin')),
      phone TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- Patients table
    CREATE TABLE IF NOT EXISTS patients (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      age INTEGER,
      gender TEXT,
      medical_notes TEXT,
      chronic_diseases TEXT,
      allergies TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- Patient Dental Odontogram (32 Teeth Chart)
    CREATE TABLE IF NOT EXISTS patient_odontogram (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      tooth_number INTEGER NOT NULL CHECK(tooth_number BETWEEN 1 AND 32),
      condition TEXT NOT NULL DEFAULT 'healthy' CHECK(condition IN ('healthy', 'caries', 'filling', 'rct', 'extracted', 'crown', 'implant')),
      notes TEXT,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(patient_id, tooth_number)
    );

    -- Services catalog
    CREATE TABLE IF NOT EXISTS services (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name_ar TEXT NOT NULL,
      name_en TEXT NOT NULL,
      category TEXT NOT NULL,
      base_price REAL NOT NULL,
      description_ar TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- Appointment Slots management
    CREATE TABLE IF NOT EXISTS appointment_slots (
      id TEXT PRIMARY KEY,
      branch_id TEXT NOT NULL REFERENCES branches(id),
      slot_date TEXT NOT NULL, -- YYYY-MM-DD
      start_time TEXT NOT NULL, -- HH:MM
      end_time TEXT NOT NULL, -- HH:MM
      capacity INTEGER NOT NULL DEFAULT 1,
      booked_count INTEGER NOT NULL DEFAULT 0,
      is_closed INTEGER NOT NULL DEFAULT 0,
      closed_reason TEXT,
      created_by_role TEXT NOT NULL DEFAULT 'system',
      created_by_user_id TEXT REFERENCES users(id),
      admin_notes TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- Appointment Exceptions (e.g. Day closures, special holidays)
    CREATE TABLE IF NOT EXISTS appointment_exceptions (
      id TEXT PRIMARY KEY,
      branch_id TEXT NOT NULL REFERENCES branches(id),
      exception_date TEXT NOT NULL,
      exception_type TEXT NOT NULL,
      reason TEXT,
      created_by_user_id TEXT REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- Appointments table
    CREATE TABLE IF NOT EXISTS appointments (
      id TEXT PRIMARY KEY,
      reference_number TEXT UNIQUE NOT NULL,
      branch_id TEXT NOT NULL REFERENCES branches(id),
      patient_id TEXT REFERENCES patients(id),
      patient_name TEXT NOT NULL,
      patient_phone TEXT NOT NULL,
      appointment_date TEXT NOT NULL,
      slot_time TEXT NOT NULL,
      slot_id TEXT REFERENCES appointment_slots(id),
      service_id TEXT REFERENCES services(id),
      service_name TEXT,
      instapay_phone TEXT,
      receipt_url TEXT,
      deposit_amount REAL NOT NULL DEFAULT 150,
      deposit_status TEXT NOT NULL DEFAULT 'unpaid' CHECK(deposit_status IN ('unpaid', 'pending_verification', 'verified', 'rejected', 'exempted')),
      status TEXT NOT NULL DEFAULT 'pending_review' CHECK(status IN ('pending_review', 'pending_payment', 'confirmed', 'rejected', 'cancelled', 'completed', 'no_show')),
      revisit_code TEXT,
      rejection_reason TEXT,
      notes TEXT,
      is_walkin INTEGER NOT NULL DEFAULT 0,
      payment_method TEXT,
      rescheduled_from TEXT,
      rescheduled_at TEXT,
      check_in_at TEXT,
      completed_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- Payment review audits by Secretary/Doctor
    CREATE TABLE IF NOT EXISTS booking_payment_reviews (
      id TEXT PRIMARY KEY,
      appointment_id TEXT NOT NULL REFERENCES appointments(id),
      reviewer_id TEXT NOT NULL REFERENCES users(id),
      reviewer_name TEXT NOT NULL,
      reviewer_role TEXT NOT NULL,
      decision TEXT NOT NULL CHECK(decision IN ('verified', 'rejected', 'reverted')),
      reason TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- Re-visit Codes (Specific patient or General codes)
    CREATE TABLE IF NOT EXISTS revisit_codes (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      patient_id TEXT REFERENCES patients(id),
      discount_type TEXT NOT NULL CHECK(discount_type IN ('full_exemption', 'fixed_fee')),
      fee_amount REAL NOT NULL DEFAULT 0,
      payment_channel TEXT NOT NULL DEFAULT 'cash_on_arrival' CHECK(payment_channel IN ('cash_on_arrival', 'instapay')),
      max_uses INTEGER NOT NULL DEFAULT 1,
      used_count INTEGER NOT NULL DEFAULT 0,
      is_used INTEGER NOT NULL DEFAULT 0,
      used_at TEXT,
      used_by_appointment_id TEXT REFERENCES appointments(id),
      expires_at TEXT,
      created_by_id TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- Invoices & Clinical Billing
    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      invoice_number TEXT UNIQUE NOT NULL,
      patient_id TEXT NOT NULL REFERENCES patients(id),
      appointment_id TEXT REFERENCES appointments(id),
      branch_id TEXT REFERENCES branches(id),
      subtotal REAL NOT NULL DEFAULT 0,
      total_discount REAL NOT NULL DEFAULT 0,
      deposit_deducted REAL NOT NULL DEFAULT 0,
      total_amount REAL NOT NULL DEFAULT 0,
      paid_amount REAL NOT NULL DEFAULT 0,
      remaining_balance REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'unpaid' CHECK(status IN ('unpaid', 'partial', 'paid')),
      notes TEXT,
      created_by_id TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- Invoice line items
    CREATE TABLE IF NOT EXISTS invoice_items (
      id TEXT PRIMARY KEY,
      invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
      service_id TEXT REFERENCES services(id),
      service_name TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      unit_price REAL NOT NULL DEFAULT 0,
      discount REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- Financial Payments ledger
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      invoice_id TEXT NOT NULL REFERENCES invoices(id),
      patient_id TEXT NOT NULL REFERENCES patients(id),
      amount REAL NOT NULL,
      payment_method TEXT NOT NULL CHECK(payment_method IN ('cash', 'instapay', 'bank_transfer', 'visa')),
      transaction_ref TEXT,
      notes TEXT,
      recorded_by_id TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- Outbox for Transactional Google Sheets Synchronization
    CREATE TABLE IF NOT EXISTS sync_outbox (
      id TEXT PRIMARY KEY,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      target_sheet TEXT NOT NULL CHECK(target_sheet IN ('secretary', 'doctor', 'appointments', 'invoices', 'patients')),
      payload_json TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'synced', 'failed')),
      attempts INTEGER NOT NULL DEFAULT 0,
      error_message TEXT,
      last_attempt_at TEXT,
      synced_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- Audit logs for all operations (Immutable Audit Trail)
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      user_role TEXT,
      user_name TEXT,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      details_json TEXT,
      ip_address TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- System settings
    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value_json TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Run dynamic schema migrations for existing database files
  runMigrations();

  // Seed default data if not already present
  seedDefaultData();
}

function runMigrations() {
  const migrations = [
    `ALTER TABLE branches ADD COLUMN city TEXT NOT NULL DEFAULT 'الشرقية'`,
    `ALTER TABLE branches ADD COLUMN deposit_amount REAL NOT NULL DEFAULT 150`,
    `ALTER TABLE branches ADD COLUMN instapay_phone TEXT NOT NULL DEFAULT '01093591193'`,
    `ALTER TABLE patients ADD COLUMN age INTEGER`,
    `ALTER TABLE patients ADD COLUMN gender TEXT`,
    `ALTER TABLE patients ADD COLUMN chronic_diseases TEXT`,
    `ALTER TABLE patients ADD COLUMN allergies TEXT`,
    `ALTER TABLE appointments ADD COLUMN service_id TEXT`,
    `ALTER TABLE appointments ADD COLUMN service_name TEXT`,
    `ALTER TABLE appointments ADD COLUMN receipt_url TEXT`,
    `ALTER TABLE appointments ADD COLUMN is_walkin INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE appointments ADD COLUMN payment_method TEXT`,
    `ALTER TABLE appointments ADD COLUMN rescheduled_from TEXT`,
    `ALTER TABLE appointments ADD COLUMN rescheduled_at TEXT`,
    `ALTER TABLE appointments ADD COLUMN check_in_at TEXT`,
    `ALTER TABLE appointments ADD COLUMN completed_at TEXT`,
    `ALTER TABLE invoices ADD COLUMN branch_id TEXT`,
    `ALTER TABLE invoices ADD COLUMN deposit_deducted REAL NOT NULL DEFAULT 0`,
    `ALTER TABLE revisit_codes ADD COLUMN max_uses INTEGER NOT NULL DEFAULT 1`,
    `ALTER TABLE revisit_codes ADD COLUMN used_count INTEGER NOT NULL DEFAULT 0`,
  ];

  for (const m of migrations) {
    try {
      db.exec(m);
    } catch {
      // Column already exists, safe to ignore
    }
  }
}

// Simple salt + hash helper using native node:crypto
export function hashPassword(password: string): string {
  const salt = 'drsabra_secure_salt_2026';
  return crypto.createHmac('sha256', salt).update(password).digest('hex');
}

function seedDefaultData() {
  // Check if branches exist
  const branchCount = (db.prepare('SELECT COUNT(*) as count FROM branches').get() as { count: number }).count;
  if (branchCount === 0 || branchCount === 1) {
    // Ensure Branch 1: Sharqia Main
    db.prepare(`
      INSERT OR REPLACE INTO branches (
        id, name_ar, name_en, city, address_ar, phone, maps_url, plus_code,
        deposit_amount, instapay_phone, daily_open_time, daily_close_time, slot_duration_minutes, slot_capacity, is_active
      ) VALUES (
        'branch_dairab_negm',
        'عيادة د. محمد صبرة النجار — ديرب نجم',
        'Dr. Mohamed Sabra Elnaggar Dental Clinic',
        'ديرب نجم، محافظة الشرقية',
        'الشرقية - ديرب نجم - برج الفلسطيني - أمام الكنيسة - الدور الخامس.',
        '01093591193',
        'https://maps.google.com/?q=PFX6%2BHRH%2C+Dairab+Negm%2C+Diyarb+Negm%2C+Al-Sharqia+Governorate+7206330',
        'PFX6+HRH, Dairab Negm, Diyarb Negm, Al-Sharqia Governorate 7206330',
        150,
        '01093591193',
        '14:00',
        '21:00',
        30,
        1,
        1
      )
    `).run();

    // Ensure any extra branch is deactivated
    db.prepare(`UPDATE branches SET is_active = 0 WHERE id != 'branch_dairab_negm'`).run();
    db.prepare(`
      UPDATE branches 
      SET name_ar = 'عيادة د. محمد صبرة النجار — ديرب نجم',
          address_ar = 'الشرقية - ديرب نجم - برج الفلسطيني - أمام الكنيسة - الدور الخامس.',
          city = 'ديرب نجم، محافظة الشرقية',
          is_active = 1
      WHERE id = 'branch_dairab_negm'
    `).run();
  }


  // Check if users exist
  const userCheck = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (userCheck.count === 0) {
    const doctorPass = hashPassword('doctor@123');
    const secretaryPass = hashPassword('secretary@123');

    db.prepare(`
      INSERT INTO users (id, username, password_hash, full_name, role, phone)
      VALUES 
      ('user_doctor_1', 'doctor', ?, 'د. محمد صبرة النجار (المشرف العام)', 'doctor', '01093591193'),
      ('user_secretary_1', 'secretary', ?, 'طاقم السكرتارية والاستقبال', 'secretary', '01093591193')
    `).run(doctorPass, secretaryPass);
  }

  // Check if services exist
  const serviceCheck = db.prepare('SELECT COUNT(*) as count FROM services').get() as { count: number };
  if (serviceCheck.count === 0) {
    const services = [
      { id: 'srv_ortho', code: 'ORTHO', name_ar: 'تقويم الأسنان المتقدم (ثابت وشفاف)', name_en: 'Advanced Orthodontics', category: 'orthodontics', price: 2500, desc: 'علاج تشوهات وإطباق الأسنان ورصف الفكين بأحدث التقنيات' },
      { id: 'srv_implant', code: 'IMPLANT', name_ar: 'زراعة الأسنان الفورية وتطعيم العظم', name_en: 'Dental Implants', category: 'surgery', price: 7000, desc: 'غرسات تيتانيوم وزركونيا معتمدة دولياً بنسب نجاح فائقة' },
      { id: 'srv_cosmetic', code: 'COSMETIC', name_ar: 'تجميل الابتسامة وعدسات الفينير', name_en: 'Cosmetic Veneers', category: 'cosmetics', price: 1500, desc: 'فينير وإيماكس وتبييض متطور بأحدث التقنيات الضوئية' },
      { id: 'srv_fillings', code: 'FILLING', name_ar: 'حشوات الكومبوزيت الليزرية التجميلية', name_en: 'Composite Laser Fillings', category: 'restorative', price: 600, desc: 'ترميم وتجميل الأسنان بحشوات نانو كومبوزيت مطابقة للون الطبيعي' },
      { id: 'srv_root_canal', code: 'ENDO', name_ar: 'علاج جذور وأعصاب الأسنان بالروتاري', name_en: 'Rotary Endodontics', category: 'endodontics', price: 1200, desc: 'تنظيف وتطهير القنوات العصبية بجهاز الروتاري بدون ألم' },
      { id: 'srv_cleaning', code: 'PROPHY', name_ar: 'تنظيف الأسنان وإزالة الجير وتلميع اللثة', name_en: 'Scaling & Polishing', category: 'preventive', price: 450, desc: 'إزالة التكلسات بالألتراسونيك وصقل الأسنان لوقاية اللثة' },
      { id: 'srv_crowns', code: 'CROWN', name_ar: 'تيجان وجسور الزيركون والإيماكس', name_en: 'Zirconia & E-max Crowns', category: 'prosthodontics', price: 1800, desc: 'تركيبات ثابتة فائقة الصلابة والجمال مطابقة للسن الطبيعي' },
      { id: 'srv_surgery', code: 'SURGERY', name_ar: 'جراحة الفم وخلع ضرس العقل المدفون', name_en: 'Oral Surgery & Wisdom Teeth', category: 'surgery', price: 1100, desc: 'خلع جراحي دقيق ومريح بأحدث وسائل التخدير الموضعي' },
      { id: 'srv_consult', code: 'CONSULT', name_ar: 'الكشف والاستشارة الشاملة مع خطة علاج', name_en: 'Comprehensive Consultation', category: 'diagnostic', price: 200, desc: 'فحص إكلينيكي وتشخيص بالرسم الرقمي وخطة علاجية تفصيلية' }
    ];

    const insertService = db.prepare(`
      INSERT INTO services (id, code, name_ar, name_en, category, base_price, description_ar)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const s of services) {
      insertService.run(s.id, s.code, s.name_ar, s.name_en, s.category, s.price, s.desc);
    }
  }

  // Check if system settings exist
  const settingsCheck = db.prepare('SELECT COUNT(*) as count FROM system_settings').get() as { count: number };
  if (settingsCheck.count === 0) {
    const defaultSettings = [
      { key: 'deposit_amount_dairab', value: JSON.stringify(150) },
      { key: 'deposit_amount_cairo', value: JSON.stringify(250) },
      { key: 'instapay_phone', value: JSON.stringify('01093591193') },
      { key: 'deposit_instructions', value: JSON.stringify('يرجى تحويل مبلغ العربون المقرر للفرع عبر تطبيق InstaPay إلى رقم 01093591193، وسيتم خصم كامل العربون تلقائياً من فاتورة علاجك عند الزيارة.') },
      { key: 'google_sheets_config', value: JSON.stringify({
        spreadsheet_url: '',
        spreadsheet_id: '',
        secretary_sheet_id: '',
        doctor_sheet_id: '',
        service_account_email: 'clinic-sync@drsabra-dental.iam.gserviceaccount.com',
        auto_sync_enabled: true,
        last_sync: null
      })},
      { key: 'clinic_phone', value: JSON.stringify('01093591193') },
      { key: 'facebook_url', value: JSON.stringify('https://www.facebook.com/Dr.SabraElnaggar/') }
    ];

    const insertSetting = db.prepare(`INSERT INTO system_settings (key, value_json) VALUES (?, ?)`);
    for (const item of defaultSettings) {
      insertSetting.run(item.key, item.value);
    }
  }

  // Seed sample patients with initial odontogram data
  const patientCheck = db.prepare('SELECT COUNT(*) as count FROM patients').get() as { count: number };
  if (patientCheck.count === 0) {
    db.prepare(`
      INSERT INTO patients (id, full_name, phone, age, gender, medical_notes, chronic_diseases, allergies)
      VALUES 
      ('PT-1001', 'أحمد محمود العوضي', '01012345678', 29, 'ذكر', 'متابع لحالات تقويم الأسنان الثابت للفكين', 'لا يوجد', 'لا توجد حساسية'),
      ('PT-1002', 'مريم إبراهيم الدسوقي', '01098765432', 34, 'أنثى', 'تحتاج زراعة ضرس سفلي وتركيب تاج زيركون', 'ضغط دم منضبط', 'حساسية من البنسلين'),
      ('PT-1003', 'ياسر محمد السيد', '01122334455', 42, 'ذكر', 'علاج جذور متقدم للضرس العلوي وجلسات تبييض', 'سكر نوع ثاني', 'لا يوجد')
    `).run();

    // Seed odontogram for PT-1001: tooth 3 has filling, tooth 14 has crown, tooth 19 has caries
    const odontogramInsert = db.prepare(`
      INSERT INTO patient_odontogram (id, patient_id, tooth_number, condition, notes)
      VALUES (?, ?, ?, ?, ?)
    `);
    odontogramInsert.run('od_1', 'PT-1001', 3, 'filling', 'حشو كومبوزيت تجميلي سطحي');
    odontogramInsert.run('od_2', 'PT-1001', 14, 'crown', 'تاج زيركونيا عالي الجودة');
    odontogramInsert.run('od_3', 'PT-1001', 19, 'caries', 'تسوس أولي بحاجة لحشو وقائي');
    odontogramInsert.run('od_4', 'PT-1001', 30, 'implant', 'زرعة تيتانيوم ممتازة');

    // Create a sample reusable code
    db.prepare(`
      INSERT INTO revisit_codes (
        id, code, patient_id, discount_type, fee_amount, payment_channel, max_uses, used_count, is_used, expires_at, created_by_id
      ) VALUES (
        'rev_demo_01', 'FREE-SABRA', NULL, 'full_exemption', 0, 'cash_on_arrival', 50, 0, 0, '2027-01-01', 'user_doctor_1'
      )
    `).run();
  }
}

// Log audit helper
export function logAudit(params: {
  userId?: string;
  userRole?: string;
  userName?: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: any;
  ipAddress?: string;
}) {
  try {
    db.prepare(`
      INSERT INTO audit_logs (id, user_id, user_role, user_name, action, entity_type, entity_id, details_json, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'aud_' + crypto.randomUUID(),
      params.userId || null,
      params.userRole || null,
      params.userName || null,
      params.action,
      params.entityType,
      params.entityId || null,
      params.details ? JSON.stringify(params.details) : null,
      params.ipAddress || null
    );
  } catch (err) {
    console.error('Audit logging error:', err);
  }
}
