-- ==============================================================================
-- Dr. Mohamed Sabra Elnaggar Dental Clinic & PMS Platform
-- Database Schema & Initial Seed Dump
-- Target: SQLite & MySQL / MariaDB compatible standard SQL
-- ==============================================================================

-- 1. Branches Table
CREATE TABLE IF NOT EXISTS branches (
  id VARCHAR(64) PRIMARY KEY,
  name_ar VARCHAR(255) NOT NULL,
  name_en VARCHAR(255) NOT NULL,
  city VARCHAR(100) NOT NULL DEFAULT 'الشرقية',
  address_ar TEXT NOT NULL,
  phone VARCHAR(50) NOT NULL,
  maps_url TEXT NOT NULL,
  plus_code VARCHAR(100) NOT NULL,
  deposit_amount DECIMAL(10,2) NOT NULL DEFAULT 150.00,
  instapay_phone VARCHAR(50) NOT NULL DEFAULT '01093591193',
  daily_open_time VARCHAR(10) NOT NULL DEFAULT '14:00',
  daily_close_time VARCHAR(10) NOT NULL DEFAULT '21:00',
  slot_duration_minutes INT NOT NULL DEFAULT 30,
  slot_capacity INT NOT NULL DEFAULT 1,
  is_active INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Users & Staff Table
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  phone VARCHAR(50),
  is_active INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Patients Table
CREATE TABLE IF NOT EXISTS patients (
  id VARCHAR(64) PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  email VARCHAR(255),
  age INT,
  gender VARCHAR(20),
  medical_notes TEXT,
  chronic_diseases TEXT,
  allergies TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. Patient Dental Odontogram (32 Teeth Chart)
CREATE TABLE IF NOT EXISTS patient_odontogram (
  id VARCHAR(64) PRIMARY KEY,
  patient_id VARCHAR(64) NOT NULL,
  tooth_number INT NOT NULL,
  condition VARCHAR(50) NOT NULL DEFAULT 'healthy',
  notes TEXT,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(patient_id, tooth_number)
);

-- 5. Services Catalog
CREATE TABLE IF NOT EXISTS services (
  id VARCHAR(64) PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name_ar VARCHAR(255) NOT NULL,
  name_en VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  base_price DECIMAL(10,2) NOT NULL,
  description_ar TEXT,
  is_active INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 6. Appointment Slots Management
CREATE TABLE IF NOT EXISTS appointment_slots (
  id VARCHAR(64) PRIMARY KEY,
  branch_id VARCHAR(64) NOT NULL,
  slot_date VARCHAR(20) NOT NULL,
  start_time VARCHAR(10) NOT NULL,
  end_time VARCHAR(10) NOT NULL,
  capacity INT NOT NULL DEFAULT 1,
  booked_count INT NOT NULL DEFAULT 0,
  is_closed INT NOT NULL DEFAULT 0,
  closed_reason TEXT,
  created_by_role VARCHAR(50) NOT NULL DEFAULT 'system',
  created_by_user_id VARCHAR(64),
  admin_notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 7. Appointments Table
CREATE TABLE IF NOT EXISTS appointments (
  id VARCHAR(64) PRIMARY KEY,
  reference_number VARCHAR(50) UNIQUE NOT NULL,
  branch_id VARCHAR(64) NOT NULL,
  patient_id VARCHAR(64),
  patient_name VARCHAR(255) NOT NULL,
  patient_phone VARCHAR(50) NOT NULL,
  appointment_date VARCHAR(20) NOT NULL,
  slot_time VARCHAR(10) NOT NULL,
  slot_id VARCHAR(64),
  service_id VARCHAR(64),
  service_name VARCHAR(255),
  instapay_phone VARCHAR(50),
  receipt_url TEXT,
  deposit_amount DECIMAL(10,2) NOT NULL DEFAULT 150.00,
  deposit_status VARCHAR(50) NOT NULL DEFAULT 'unpaid',
  status VARCHAR(50) NOT NULL DEFAULT 'pending_review',
  revisit_code VARCHAR(50),
  rejection_reason TEXT,
  notes TEXT,
  is_walkin INT NOT NULL DEFAULT 0,
  payment_method VARCHAR(50),
  rescheduled_from VARCHAR(64),
  rescheduled_at VARCHAR(30),
  check_in_at VARCHAR(30),
  completed_at VARCHAR(30),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 8. Payment Reviews Table
CREATE TABLE IF NOT EXISTS booking_payment_reviews (
  id VARCHAR(64) PRIMARY KEY,
  appointment_id VARCHAR(64) NOT NULL,
  reviewer_id VARCHAR(64) NOT NULL,
  reviewer_name VARCHAR(255) NOT NULL,
  reviewer_role VARCHAR(50) NOT NULL,
  decision VARCHAR(50) NOT NULL,
  reason TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 9. Revisit Codes Table
CREATE TABLE IF NOT EXISTS revisit_codes (
  id VARCHAR(64) PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  patient_id VARCHAR(64),
  discount_type VARCHAR(50) NOT NULL,
  fee_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  payment_channel VARCHAR(50) NOT NULL DEFAULT 'cash_on_arrival',
  max_uses INT NOT NULL DEFAULT 1,
  used_count INT NOT NULL DEFAULT 0,
  is_used INT NOT NULL DEFAULT 0,
  used_at TIMESTAMP,
  used_by_appointment_id VARCHAR(64),
  expires_at TIMESTAMP,
  created_by_id VARCHAR(64) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 10. Invoices Table
CREATE TABLE IF NOT EXISTS invoices (
  id VARCHAR(64) PRIMARY KEY,
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  patient_id VARCHAR(64) NOT NULL,
  appointment_id VARCHAR(64),
  branch_id VARCHAR(64),
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  total_discount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  deposit_deducted DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  paid_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  remaining_balance DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  status VARCHAR(50) NOT NULL DEFAULT 'unpaid',
  notes TEXT,
  created_by_id VARCHAR(64) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 11. Invoice Items Table
CREATE TABLE IF NOT EXISTS invoice_items (
  id VARCHAR(64) PRIMARY KEY,
  invoice_id VARCHAR(64) NOT NULL,
  service_id VARCHAR(64),
  service_name VARCHAR(255) NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  discount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 12. Financial Payments Ledger Table
CREATE TABLE IF NOT EXISTS payments (
  id VARCHAR(64) PRIMARY KEY,
  invoice_id VARCHAR(64) NOT NULL,
  patient_id VARCHAR(64) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  transaction_ref VARCHAR(100),
  notes TEXT,
  recorded_by_id VARCHAR(64) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 13. Google Sheets Outbox Sync Table
CREATE TABLE IF NOT EXISTS sync_outbox (
  id VARCHAR(64) PRIMARY KEY,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(64) NOT NULL,
  target_sheet VARCHAR(50) NOT NULL,
  payload_json TEXT NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  attempts INT NOT NULL DEFAULT 0,
  error_message TEXT,
  last_attempt_at TIMESTAMP,
  synced_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 14. Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64),
  user_role VARCHAR(50),
  user_name VARCHAR(255),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id VARCHAR(64),
  details_json TEXT,
  ip_address VARCHAR(50),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 15. System Settings Table
CREATE TABLE IF NOT EXISTS system_settings (
  key VARCHAR(100) PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- INITIAL DATA SEEDING
-- ==============================================================================

-- Seed Branch: Dairab Negm Main Clinic
INSERT INTO branches (
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
  150.00,
  '01093591193',
  '14:00',
  '21:00',
  30,
  1,
  1
);

-- Seed System Users (Doctor & Secretary)
-- Passwords:
-- doctor: doctor@123 (HMAC SHA-256 with salt 'drsabra_secure_salt_2026') -> a8a80373feae8e97f25979bb3d39580b06b23d9b0caecfc82a466ec711a43a05
-- secretary: secretary@123 -> bb804d9e03f0217ec82fa08fa3d9da8211fc59be43fe42398547b74ba7ce19b4
INSERT INTO users (id, username, password_hash, full_name, role, phone) VALUES 
('user_doctor_1', 'doctor', 'a8a80373feae8e97f25979bb3d39580b06b23d9b0caecfc82a466ec711a43a05', 'د. محمد صبرة النجار (المشرف العام)', 'doctor', '01093591193'),
('user_secretary_1', 'secretary', 'bb804d9e03f0217ec82fa08fa3d9da8211fc59be43fe42398547b74ba7ce19b4', 'طاقم السكرتارية والاستقبال', 'secretary', '01093591193');

-- Seed Services Catalog
INSERT INTO services (id, code, name_ar, name_en, category, base_price, description_ar) VALUES
('srv_ortho', 'ORTHO', 'تقويم الأسنان المتقدم (ثابت وشفاف)', 'Advanced Orthodontics', 'orthodontics', 2500.00, 'علاج تشوهات وإطباق الأسنان ورصف الفكين بأحدث التقنيات'),
('srv_implant', 'IMPLANT', 'زراعة الأسنان الفورية وتطعيم العظم', 'Dental Implants', 'surgery', 7000.00, 'غرسات تيتانيوم وزركونيا معتمدة دولياً بنسب نجاح فائقة'),
('srv_cosmetic', 'COSMETIC', 'تجميل الابتسامة وعدسات الفينير', 'Cosmetic Veneers', 'cosmetics', 1500.00, 'فينير وإيماكس وتبييض متطور بأحدث التقنيات الضوئية'),
('srv_fillings', 'FILLING', 'حشوات الكومبوزيت الليزرية التجميلية', 'Composite Laser Fillings', 'restorative', 600.00, 'ترميم وتجميل الأسنان بحشوات نانو كومبوزيت مطابقة للون الطبيعي'),
('srv_root_canal', 'ENDO', 'علاج جذور وأعصاب الأسنان بالروتاري', 'Rotary Endodontics', 'endodontics', 1200.00, 'تنظيف وتطهير القنوات العصبية بجهاز الروتاري بدون ألم'),
('srv_cleaning', 'PROPHY', 'تنظيف الأسنان وإزالة الجير وتلميع اللثة', 'Scaling & Polishing', 'preventive', 450.00, 'إزالة التكلسات بالألتراسونيك وصقل الأسنان لوقاية اللثة'),
('srv_crowns', 'CROWN', 'تيجان وجسور الزيركون والإيماكس', 'Zirconia & E-max Crowns', 'prosthodontics', 1800.00, 'تركيبات ثابتة فائقة الصلابة والجمال مطابقة للسن الطبيعي'),
('srv_surgery', 'SURGERY', 'جراحة الفم وخلع ضرس العقل المدفون', 'Oral Surgery & Wisdom Teeth', 'surgery', 1100.00, 'خلع جراحي دقيق ومريح بأحدث وسائل التخدير الموضعي'),
('srv_consult', 'CONSULT', 'الكشف والاستشارة الشاملة مع خطة علاج', 'Comprehensive Consultation', 'diagnostic', 200.00, 'فحص إكلينيكي وتشخيص بالرسم الرقمي وخطة علاجية تفصيلية');

-- Seed System Settings
INSERT INTO system_settings (key, value_json) VALUES 
('deposit_amount_dairab', '150'),
('instapay_phone', '"01093591193"'),
('deposit_instructions', '"يرجى تحويل مبلغ العربون المقرر للفرع عبر تطبيق InstaPay إلى رقم 01093591193، وسيتم خصم كامل العربون تلقائياً من فاتورة علاجك عند الزيارة."'),
('clinic_phone', '"01093591193"'),
('facebook_url', '"https://www.facebook.com/Dr.SabraElnaggar/"');

-- Seed Revisit / Exemption Promo Code
INSERT INTO revisit_codes (
  id, code, patient_id, discount_type, fee_amount, payment_channel, max_uses, used_count, is_used, expires_at, created_by_id
) VALUES (
  'rev_demo_01', 'FREE-SABRA', NULL, 'full_exemption', 0.00, 'cash_on_arrival', 100, 0, 0, '2028-12-31 23:59:59', 'user_doctor_1'
);

-- Seed Initial Patients & Odontogram
INSERT INTO patients (id, full_name, phone, age, gender, medical_notes, chronic_diseases, allergies) VALUES 
('PT-1001', 'أحمد محمود العوضي', '01012345678', 29, 'ذكر', 'متابع لحالات تقويم الأسنان الثابت للفكين', 'لا يوجد', 'لا توجد حساسية'),
('PT-1002', 'مريم إبراهيم الدسوقي', '01098765432', 34, 'أنثى', 'تحتاج زراعة ضرس سفلي وتركيب تاج زيركون', 'ضغط دم منضبط', 'حساسية من البنسلين');

INSERT INTO patient_odontogram (id, patient_id, tooth_number, condition, notes) VALUES 
('od_1', 'PT-1001', 3, 'filling', 'حشو كومبوزيت تجميلي سطحي'),
('od_2', 'PT-1001', 14, 'crown', 'تاج زيركونيا عالي الجودة'),
('od_3', 'PT-1001', 19, 'caries', 'تسوس أولي بحاجة لحشو وقائي'),
('od_4', 'PT-1001', 30, 'implant', 'زرعة تيتانيوم ممتازة');
