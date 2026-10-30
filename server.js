// server.ts
import "dotenv/config";
import express from "express";
import path3 from "node:path";
import fs3 from "node:fs";
import { fileURLToPath as fileURLToPath2 } from "node:url";

// src/server/db.ts
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
var here = path.dirname(fileURLToPath(import.meta.url));
var APP_ROOT = process.env.APP_ROOT ? path.resolve(process.env.APP_ROOT) : /[\\/]src[\\/]server$/.test(here) ? path.resolve(here, "..", "..") : here;
var DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(APP_ROOT, "data");
var dbDir = DATA_DIR;
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}
var dbPath = path.join(dbDir, "clinic.db");
var db = new DatabaseSync(dbPath);
db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;");
function initDatabase() {
  db.exec(`
    -- Branches table (Multi-Branch support)
    CREATE TABLE IF NOT EXISTS branches (
      id TEXT PRIMARY KEY,
      name_ar TEXT NOT NULL,
      name_en TEXT NOT NULL,
      city TEXT NOT NULL DEFAULT '\u0627\u0644\u0634\u0631\u0642\u064A\u0629',
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
  runMigrations();
  seedDefaultData();
}
function runMigrations() {
  const migrations = [
    `ALTER TABLE branches ADD COLUMN city TEXT NOT NULL DEFAULT '\u0627\u0644\u0634\u0631\u0642\u064A\u0629'`,
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
    `ALTER TABLE revisit_codes ADD COLUMN used_count INTEGER NOT NULL DEFAULT 0`
  ];
  for (const m of migrations) {
    try {
      db.exec(m);
    } catch {
    }
  }
}
function hashPassword(password) {
  const salt = "drsabra_secure_salt_2026";
  return crypto.createHmac("sha256", salt).update(password).digest("hex");
}
function seedDefaultData() {
  const branchCount = db.prepare("SELECT COUNT(*) as count FROM branches").get().count;
  if (branchCount === 0 || branchCount === 1) {
    db.prepare(`
      INSERT OR REPLACE INTO branches (
        id, name_ar, name_en, city, address_ar, phone, maps_url, plus_code,
        deposit_amount, instapay_phone, daily_open_time, daily_close_time, slot_duration_minutes, slot_capacity, is_active
      ) VALUES (
        'branch_dairab_negm',
        '\u0639\u064A\u0627\u062F\u0629 \u062F. \u0645\u062D\u0645\u062F \u0635\u0628\u0631\u0629 \u0627\u0644\u0646\u062C\u0627\u0631 \u2014 \u062F\u064A\u0631\u0628 \u0646\u062C\u0645',
        'Dr. Mohamed Sabra Elnaggar Dental Clinic',
        '\u062F\u064A\u0631\u0628 \u0646\u062C\u0645\u060C \u0645\u062D\u0627\u0641\u0638\u0629 \u0627\u0644\u0634\u0631\u0642\u064A\u0629',
        '\u0627\u0644\u0634\u0631\u0642\u064A\u0629 - \u062F\u064A\u0631\u0628 \u0646\u062C\u0645 - \u0628\u0631\u062C \u0627\u0644\u0641\u0644\u0633\u0637\u064A\u0646\u064A - \u0623\u0645\u0627\u0645 \u0627\u0644\u0643\u0646\u064A\u0633\u0629 - \u0627\u0644\u062F\u0648\u0631 \u0627\u0644\u062E\u0627\u0645\u0633.',
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
    db.prepare(`UPDATE branches SET is_active = 0 WHERE id != 'branch_dairab_negm'`).run();
    db.prepare(`
      UPDATE branches 
      SET name_ar = '\u0639\u064A\u0627\u062F\u0629 \u062F. \u0645\u062D\u0645\u062F \u0635\u0628\u0631\u0629 \u0627\u0644\u0646\u062C\u0627\u0631 \u2014 \u062F\u064A\u0631\u0628 \u0646\u062C\u0645',
          address_ar = '\u0627\u0644\u0634\u0631\u0642\u064A\u0629 - \u062F\u064A\u0631\u0628 \u0646\u062C\u0645 - \u0628\u0631\u062C \u0627\u0644\u0641\u0644\u0633\u0637\u064A\u0646\u064A - \u0623\u0645\u0627\u0645 \u0627\u0644\u0643\u0646\u064A\u0633\u0629 - \u0627\u0644\u062F\u0648\u0631 \u0627\u0644\u062E\u0627\u0645\u0633.',
          city = '\u062F\u064A\u0631\u0628 \u0646\u062C\u0645\u060C \u0645\u062D\u0627\u0641\u0638\u0629 \u0627\u0644\u0634\u0631\u0642\u064A\u0629',
          is_active = 1
      WHERE id = 'branch_dairab_negm'
    `).run();
  }
  const userCheck = db.prepare("SELECT COUNT(*) as count FROM users").get();
  if (userCheck.count === 0) {
    const doctorPass = hashPassword("doctor@123");
    const secretaryPass = hashPassword("secretary@123");
    db.prepare(`
      INSERT INTO users (id, username, password_hash, full_name, role, phone)
      VALUES 
      ('user_doctor_1', 'doctor', ?, '\u062F. \u0645\u062D\u0645\u062F \u0635\u0628\u0631\u0629 \u0627\u0644\u0646\u062C\u0627\u0631 (\u0627\u0644\u0645\u0634\u0631\u0641 \u0627\u0644\u0639\u0627\u0645)', 'doctor', '01093591193'),
      ('user_secretary_1', 'secretary', ?, '\u0637\u0627\u0642\u0645 \u0627\u0644\u0633\u0643\u0631\u062A\u0627\u0631\u064A\u0629 \u0648\u0627\u0644\u0627\u0633\u062A\u0642\u0628\u0627\u0644', 'secretary', '01093591193')
    `).run(doctorPass, secretaryPass);
  }
  const serviceCheck = db.prepare("SELECT COUNT(*) as count FROM services").get();
  if (serviceCheck.count === 0) {
    const services = [
      { id: "srv_ortho", code: "ORTHO", name_ar: "\u062A\u0642\u0648\u064A\u0645 \u0627\u0644\u0623\u0633\u0646\u0627\u0646 \u0627\u0644\u0645\u062A\u0642\u062F\u0645 (\u062B\u0627\u0628\u062A \u0648\u0634\u0641\u0627\u0641)", name_en: "Advanced Orthodontics", category: "orthodontics", price: 2500, desc: "\u0639\u0644\u0627\u062C \u062A\u0634\u0648\u0647\u0627\u062A \u0648\u0625\u0637\u0628\u0627\u0642 \u0627\u0644\u0623\u0633\u0646\u0627\u0646 \u0648\u0631\u0635\u0641 \u0627\u0644\u0641\u0643\u064A\u0646 \u0628\u0623\u062D\u062F\u062B \u0627\u0644\u062A\u0642\u0646\u064A\u0627\u062A" },
      { id: "srv_implant", code: "IMPLANT", name_ar: "\u0632\u0631\u0627\u0639\u0629 \u0627\u0644\u0623\u0633\u0646\u0627\u0646 \u0627\u0644\u0641\u0648\u0631\u064A\u0629 \u0648\u062A\u0637\u0639\u064A\u0645 \u0627\u0644\u0639\u0638\u0645", name_en: "Dental Implants", category: "surgery", price: 7e3, desc: "\u063A\u0631\u0633\u0627\u062A \u062A\u064A\u062A\u0627\u0646\u064A\u0648\u0645 \u0648\u0632\u0631\u0643\u0648\u0646\u064A\u0627 \u0645\u0639\u062A\u0645\u062F\u0629 \u062F\u0648\u0644\u064A\u0627\u064B \u0628\u0646\u0633\u0628 \u0646\u062C\u0627\u062D \u0641\u0627\u0626\u0642\u0629" },
      { id: "srv_cosmetic", code: "COSMETIC", name_ar: "\u062A\u062C\u0645\u064A\u0644 \u0627\u0644\u0627\u0628\u062A\u0633\u0627\u0645\u0629 \u0648\u0639\u062F\u0633\u0627\u062A \u0627\u0644\u0641\u064A\u0646\u064A\u0631", name_en: "Cosmetic Veneers", category: "cosmetics", price: 1500, desc: "\u0641\u064A\u0646\u064A\u0631 \u0648\u0625\u064A\u0645\u0627\u0643\u0633 \u0648\u062A\u0628\u064A\u064A\u0636 \u0645\u062A\u0637\u0648\u0631 \u0628\u0623\u062D\u062F\u062B \u0627\u0644\u062A\u0642\u0646\u064A\u0627\u062A \u0627\u0644\u0636\u0648\u0626\u064A\u0629" },
      { id: "srv_fillings", code: "FILLING", name_ar: "\u062D\u0634\u0648\u0627\u062A \u0627\u0644\u0643\u0648\u0645\u0628\u0648\u0632\u064A\u062A \u0627\u0644\u0644\u064A\u0632\u0631\u064A\u0629 \u0627\u0644\u062A\u062C\u0645\u064A\u0644\u064A\u0629", name_en: "Composite Laser Fillings", category: "restorative", price: 600, desc: "\u062A\u0631\u0645\u064A\u0645 \u0648\u062A\u062C\u0645\u064A\u0644 \u0627\u0644\u0623\u0633\u0646\u0627\u0646 \u0628\u062D\u0634\u0648\u0627\u062A \u0646\u0627\u0646\u0648 \u0643\u0648\u0645\u0628\u0648\u0632\u064A\u062A \u0645\u0637\u0627\u0628\u0642\u0629 \u0644\u0644\u0648\u0646 \u0627\u0644\u0637\u0628\u064A\u0639\u064A" },
      { id: "srv_root_canal", code: "ENDO", name_ar: "\u0639\u0644\u0627\u062C \u062C\u0630\u0648\u0631 \u0648\u0623\u0639\u0635\u0627\u0628 \u0627\u0644\u0623\u0633\u0646\u0627\u0646 \u0628\u0627\u0644\u0631\u0648\u062A\u0627\u0631\u064A", name_en: "Rotary Endodontics", category: "endodontics", price: 1200, desc: "\u062A\u0646\u0638\u064A\u0641 \u0648\u062A\u0637\u0647\u064A\u0631 \u0627\u0644\u0642\u0646\u0648\u0627\u062A \u0627\u0644\u0639\u0635\u0628\u064A\u0629 \u0628\u062C\u0647\u0627\u0632 \u0627\u0644\u0631\u0648\u062A\u0627\u0631\u064A \u0628\u062F\u0648\u0646 \u0623\u0644\u0645" },
      { id: "srv_cleaning", code: "PROPHY", name_ar: "\u062A\u0646\u0638\u064A\u0641 \u0627\u0644\u0623\u0633\u0646\u0627\u0646 \u0648\u0625\u0632\u0627\u0644\u0629 \u0627\u0644\u062C\u064A\u0631 \u0648\u062A\u0644\u0645\u064A\u0639 \u0627\u0644\u0644\u062B\u0629", name_en: "Scaling & Polishing", category: "preventive", price: 450, desc: "\u0625\u0632\u0627\u0644\u0629 \u0627\u0644\u062A\u0643\u0644\u0633\u0627\u062A \u0628\u0627\u0644\u0623\u0644\u062A\u0631\u0627\u0633\u0648\u0646\u064A\u0643 \u0648\u0635\u0642\u0644 \u0627\u0644\u0623\u0633\u0646\u0627\u0646 \u0644\u0648\u0642\u0627\u064A\u0629 \u0627\u0644\u0644\u062B\u0629" },
      { id: "srv_crowns", code: "CROWN", name_ar: "\u062A\u064A\u062C\u0627\u0646 \u0648\u062C\u0633\u0648\u0631 \u0627\u0644\u0632\u064A\u0631\u0643\u0648\u0646 \u0648\u0627\u0644\u0625\u064A\u0645\u0627\u0643\u0633", name_en: "Zirconia & E-max Crowns", category: "prosthodontics", price: 1800, desc: "\u062A\u0631\u0643\u064A\u0628\u0627\u062A \u062B\u0627\u0628\u062A\u0629 \u0641\u0627\u0626\u0642\u0629 \u0627\u0644\u0635\u0644\u0627\u0628\u0629 \u0648\u0627\u0644\u062C\u0645\u0627\u0644 \u0645\u0637\u0627\u0628\u0642\u0629 \u0644\u0644\u0633\u0646 \u0627\u0644\u0637\u0628\u064A\u0639\u064A" },
      { id: "srv_surgery", code: "SURGERY", name_ar: "\u062C\u0631\u0627\u062D\u0629 \u0627\u0644\u0641\u0645 \u0648\u062E\u0644\u0639 \u0636\u0631\u0633 \u0627\u0644\u0639\u0642\u0644 \u0627\u0644\u0645\u062F\u0641\u0648\u0646", name_en: "Oral Surgery & Wisdom Teeth", category: "surgery", price: 1100, desc: "\u062E\u0644\u0639 \u062C\u0631\u0627\u062D\u064A \u062F\u0642\u064A\u0642 \u0648\u0645\u0631\u064A\u062D \u0628\u0623\u062D\u062F\u062B \u0648\u0633\u0627\u0626\u0644 \u0627\u0644\u062A\u062E\u062F\u064A\u0631 \u0627\u0644\u0645\u0648\u0636\u0639\u064A" },
      { id: "srv_consult", code: "CONSULT", name_ar: "\u0627\u0644\u0643\u0634\u0641 \u0648\u0627\u0644\u0627\u0633\u062A\u0634\u0627\u0631\u0629 \u0627\u0644\u0634\u0627\u0645\u0644\u0629 \u0645\u0639 \u062E\u0637\u0629 \u0639\u0644\u0627\u062C", name_en: "Comprehensive Consultation", category: "diagnostic", price: 200, desc: "\u0641\u062D\u0635 \u0625\u0643\u0644\u064A\u0646\u064A\u0643\u064A \u0648\u062A\u0634\u062E\u064A\u0635 \u0628\u0627\u0644\u0631\u0633\u0645 \u0627\u0644\u0631\u0642\u0645\u064A \u0648\u062E\u0637\u0629 \u0639\u0644\u0627\u062C\u064A\u0629 \u062A\u0641\u0635\u064A\u0644\u064A\u0629" }
    ];
    const insertService = db.prepare(`
      INSERT INTO services (id, code, name_ar, name_en, category, base_price, description_ar)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    for (const s of services) {
      insertService.run(s.id, s.code, s.name_ar, s.name_en, s.category, s.price, s.desc);
    }
  }
  const settingsCheck = db.prepare("SELECT COUNT(*) as count FROM system_settings").get();
  if (settingsCheck.count === 0) {
    const defaultSettings = [
      { key: "deposit_amount_dairab", value: JSON.stringify(150) },
      { key: "deposit_amount_cairo", value: JSON.stringify(250) },
      { key: "instapay_phone", value: JSON.stringify("01093591193") },
      { key: "deposit_instructions", value: JSON.stringify("\u064A\u0631\u062C\u0649 \u062A\u062D\u0648\u064A\u0644 \u0645\u0628\u0644\u063A \u0627\u0644\u0639\u0631\u0628\u0648\u0646 \u0627\u0644\u0645\u0642\u0631\u0631 \u0644\u0644\u0641\u0631\u0639 \u0639\u0628\u0631 \u062A\u0637\u0628\u064A\u0642 InstaPay \u0625\u0644\u0649 \u0631\u0642\u0645 01093591193\u060C \u0648\u0633\u064A\u062A\u0645 \u062E\u0635\u0645 \u0643\u0627\u0645\u0644 \u0627\u0644\u0639\u0631\u0628\u0648\u0646 \u062A\u0644\u0642\u0627\u0626\u064A\u0627\u064B \u0645\u0646 \u0641\u0627\u062A\u0648\u0631\u0629 \u0639\u0644\u0627\u062C\u0643 \u0639\u0646\u062F \u0627\u0644\u0632\u064A\u0627\u0631\u0629.") },
      { key: "google_sheets_config", value: JSON.stringify({
        spreadsheet_url: "",
        spreadsheet_id: "",
        secretary_sheet_id: "",
        doctor_sheet_id: "",
        service_account_email: "clinic-sync@drsabra-dental.iam.gserviceaccount.com",
        auto_sync_enabled: true,
        last_sync: null
      }) },
      { key: "clinic_phone", value: JSON.stringify("01093591193") },
      { key: "facebook_url", value: JSON.stringify("https://www.facebook.com/Dr.SabraElnaggar/") }
    ];
    const insertSetting = db.prepare(`INSERT INTO system_settings (key, value_json) VALUES (?, ?)`);
    for (const item of defaultSettings) {
      insertSetting.run(item.key, item.value);
    }
  }
  const patientCheck = db.prepare("SELECT COUNT(*) as count FROM patients").get();
  if (patientCheck.count === 0) {
    db.prepare(`
      INSERT INTO patients (id, full_name, phone, age, gender, medical_notes, chronic_diseases, allergies)
      VALUES 
      ('PT-1001', '\u0623\u062D\u0645\u062F \u0645\u062D\u0645\u0648\u062F \u0627\u0644\u0639\u0648\u0636\u064A', '01012345678', 29, '\u0630\u0643\u0631', '\u0645\u062A\u0627\u0628\u0639 \u0644\u062D\u0627\u0644\u0627\u062A \u062A\u0642\u0648\u064A\u0645 \u0627\u0644\u0623\u0633\u0646\u0627\u0646 \u0627\u0644\u062B\u0627\u0628\u062A \u0644\u0644\u0641\u0643\u064A\u0646', '\u0644\u0627 \u064A\u0648\u062C\u062F', '\u0644\u0627 \u062A\u0648\u062C\u062F \u062D\u0633\u0627\u0633\u064A\u0629'),
      ('PT-1002', '\u0645\u0631\u064A\u0645 \u0625\u0628\u0631\u0627\u0647\u064A\u0645 \u0627\u0644\u062F\u0633\u0648\u0642\u064A', '01098765432', 34, '\u0623\u0646\u062B\u0649', '\u062A\u062D\u062A\u0627\u062C \u0632\u0631\u0627\u0639\u0629 \u0636\u0631\u0633 \u0633\u0641\u0644\u064A \u0648\u062A\u0631\u0643\u064A\u0628 \u062A\u0627\u062C \u0632\u064A\u0631\u0643\u0648\u0646', '\u0636\u063A\u0637 \u062F\u0645 \u0645\u0646\u0636\u0628\u0637', '\u062D\u0633\u0627\u0633\u064A\u0629 \u0645\u0646 \u0627\u0644\u0628\u0646\u0633\u0644\u064A\u0646'),
      ('PT-1003', '\u064A\u0627\u0633\u0631 \u0645\u062D\u0645\u062F \u0627\u0644\u0633\u064A\u062F', '01122334455', 42, '\u0630\u0643\u0631', '\u0639\u0644\u0627\u062C \u062C\u0630\u0648\u0631 \u0645\u062A\u0642\u062F\u0645 \u0644\u0644\u0636\u0631\u0633 \u0627\u0644\u0639\u0644\u0648\u064A \u0648\u062C\u0644\u0633\u0627\u062A \u062A\u0628\u064A\u064A\u0636', '\u0633\u0643\u0631 \u0646\u0648\u0639 \u062B\u0627\u0646\u064A', '\u0644\u0627 \u064A\u0648\u062C\u062F')
    `).run();
    const odontogramInsert = db.prepare(`
      INSERT INTO patient_odontogram (id, patient_id, tooth_number, condition, notes)
      VALUES (?, ?, ?, ?, ?)
    `);
    odontogramInsert.run("od_1", "PT-1001", 3, "filling", "\u062D\u0634\u0648 \u0643\u0648\u0645\u0628\u0648\u0632\u064A\u062A \u062A\u062C\u0645\u064A\u0644\u064A \u0633\u0637\u062D\u064A");
    odontogramInsert.run("od_2", "PT-1001", 14, "crown", "\u062A\u0627\u062C \u0632\u064A\u0631\u0643\u0648\u0646\u064A\u0627 \u0639\u0627\u0644\u064A \u0627\u0644\u062C\u0648\u062F\u0629");
    odontogramInsert.run("od_3", "PT-1001", 19, "caries", "\u062A\u0633\u0648\u0633 \u0623\u0648\u0644\u064A \u0628\u062D\u0627\u062C\u0629 \u0644\u062D\u0634\u0648 \u0648\u0642\u0627\u0626\u064A");
    odontogramInsert.run("od_4", "PT-1001", 30, "implant", "\u0632\u0631\u0639\u0629 \u062A\u064A\u062A\u0627\u0646\u064A\u0648\u0645 \u0645\u0645\u062A\u0627\u0632\u0629");
    db.prepare(`
      INSERT INTO revisit_codes (
        id, code, patient_id, discount_type, fee_amount, payment_channel, max_uses, used_count, is_used, expires_at, created_by_id
      ) VALUES (
        'rev_demo_01', 'FREE-SABRA', NULL, 'full_exemption', 0, 'cash_on_arrival', 50, 0, 0, '2027-01-01', 'user_doctor_1'
      )
    `).run();
  }
}
function logAudit(params) {
  try {
    db.prepare(`
      INSERT INTO audit_logs (id, user_id, user_role, user_name, action, entity_type, entity_id, details_json, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      "aud_" + crypto.randomUUID(),
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
    console.error("Audit logging error:", err);
  }
}

// src/server/api.ts
import { Router } from "express";

// src/server/auth.ts
import crypto2 from "node:crypto";
var JWT_SECRET = process.env.JWT_SECRET || "drsabra_clinic_auth_secret_key_2026";
function createToken(user) {
  const payload = {
    sub: user.id,
    username: user.username,
    role: user.role,
    full_name: user.full_name,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1e3
    // 7 days
  };
  const payloadStr = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto2.createHmac("sha256", JWT_SECRET).update(payloadStr).digest("base64url");
  return `${payloadStr}.${signature}`;
}
function verifyToken(token) {
  try {
    const [payloadStr, signature] = token.split(".");
    if (!payloadStr || !signature) return null;
    const expectedSig = crypto2.createHmac("sha256", JWT_SECRET).update(payloadStr).digest("base64url");
    if (signature !== expectedSig) return null;
    const payload = JSON.parse(Buffer.from(payloadStr, "base64url").toString("utf8"));
    if (payload.exp && Date.now() > payload.exp) return null;
    const user = db.prepare("SELECT id, username, full_name, role, phone, is_active FROM users WHERE id = ?").get(payload.sub);
    if (!user || user.is_active !== 1) return null;
    return {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      role: user.role,
      phone: user.phone
    };
  } catch (e) {
    return null;
  }
}
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    const user = verifyToken(token);
    if (user) {
      req.user = user;
    }
  }
  next();
}
function requireDoctor(req, res, next) {
  if (!req.user) {
    res.status(401).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D: \u064A\u0631\u062C\u0649 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644" });
    return;
  }
  if (req.user.role !== "doctor" && req.user.role !== "admin") {
    logAudit({
      userId: req.user.id,
      userRole: req.user.role,
      userName: req.user.full_name,
      action: "UNAUTHORIZED_DOCTOR_ACCESS_ATTEMPT",
      entityType: "financial_records",
      details: { url: req.originalUrl, ip: req.ip }
    });
    res.status(403).json({ error: "\u0635\u0644\u0627\u062D\u064A\u0629 \u0645\u0631\u0641\u0648\u0636\u0629: \u0647\u0630\u0647 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0648\u0627\u0644\u0633\u062C\u0644\u0627\u062A \u0627\u0644\u0645\u0627\u0644\u064A\u0629 \u0645\u062A\u0627\u062D\u0629 \u0644\u0644\u062F\u0643\u062A\u0648\u0631 \u0641\u0642\u0637" });
    return;
  }
  next();
}
function requireSecretary(req, res, next) {
  if (!req.user) {
    res.status(401).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D: \u064A\u0631\u062C\u0649 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644" });
    return;
  }
  if (req.user.role !== "secretary" && req.user.role !== "doctor" && req.user.role !== "admin") {
    res.status(403).json({ error: "\u0635\u0644\u0627\u062D\u064A\u0629 \u0645\u0631\u0641\u0648\u0636\u0629: \u064A\u062C\u0628 \u0623\u0646 \u062A\u0643\u0648\u0646 \u0633\u0643\u0631\u062A\u0627\u0631\u064A\u0629 \u0623\u0648 \u0625\u062F\u0627\u0631\u0629 \u0644\u0644\u0648\u0635\u0648\u0644" });
    return;
  }
  next();
}

// src/server/sheetsSync.ts
function extractSpreadsheetId(input) {
  if (!input) return "";
  const trimmed = input.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return trimmed;
}
function queueSyncItem(params) {
  try {
    const id = "outbox_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
    const safeTarget = params.targetSheet === "doctor" || params.targetSheet === "invoices" ? "doctor" : "secretary";
    db.prepare(`
      INSERT INTO sync_outbox (id, entity_type, entity_id, target_sheet, payload_json, status, created_at)
      VALUES (?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)
    `).run(
      id,
      params.entityType,
      params.entityId,
      safeTarget,
      JSON.stringify(params.payload)
    );
    return id;
  } catch (err) {
    console.warn("Sync outbox queue warning (non-blocking):", err);
    return null;
  }
}
function getSheetsConfig() {
  const row = db.prepare("SELECT value_json FROM system_settings WHERE key = 'google_sheets_config'").get();
  if (!row) {
    return {
      spreadsheet_url: "",
      spreadsheet_id: "",
      secretary_sheet_id: process.env.GOOGLE_SHEETS_SPREADSHEET_ID_SECRETARY || "",
      doctor_sheet_id: process.env.GOOGLE_SHEETS_SPREADSHEET_ID_DOCTOR || "",
      service_account_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "clinic-sync@drsabra-dental.iam.gserviceaccount.com",
      auto_sync_enabled: true,
      last_sync: null
    };
  }
  const config = JSON.parse(row.value_json);
  if (config.spreadsheet_url && !config.spreadsheet_id) {
    config.spreadsheet_id = extractSpreadsheetId(config.spreadsheet_url);
  }
  return config;
}
function updateSheetsConfig(config) {
  if (config.spreadsheet_url) {
    config.spreadsheet_id = extractSpreadsheetId(config.spreadsheet_url);
  }
  db.prepare("UPDATE system_settings SET value_json = ?, updated_at = CURRENT_TIMESTAMP WHERE key = 'google_sheets_config'").run(
    JSON.stringify(config)
  );
}
async function processOutboxSync() {
  const pendingItems = db.prepare(`
    SELECT * FROM sync_outbox 
    WHERE status IN ('pending', 'failed') AND attempts < 5 
    ORDER BY created_at ASC 
    LIMIT 50
  `).all();
  if (pendingItems.length === 0) {
    return { processed: 0, successful: 0, failed: 0 };
  }
  let successful = 0;
  let failed = 0;
  for (const item of pendingItems) {
    try {
      const payload = JSON.parse(item.payload_json);
      await dispatchToGoogleSheets(item.target_sheet, item.entity_type, payload);
      db.prepare(`
        UPDATE sync_outbox 
        SET status = 'synced', attempts = attempts + 1, synced_at = CURRENT_TIMESTAMP, error_message = NULL, last_attempt_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(item.id);
      successful++;
    } catch (err) {
      failed++;
      db.prepare(`
        UPDATE sync_outbox 
        SET status = 'failed', attempts = attempts + 1, error_message = ?, last_attempt_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(err.message || "\u062E\u0637\u0623 \u0623\u062B\u0646\u0627\u0621 \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0628\u0640 Google Sheets API", item.id);
    }
  }
  const currentConfig = getSheetsConfig();
  currentConfig.last_sync = (/* @__PURE__ */ new Date()).toISOString();
  updateSheetsConfig(currentConfig);
  return { processed: pendingItems.length, successful, failed };
}
async function dispatchToGoogleSheets(targetSheet, entityType, payload) {
  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  const config = getSheetsConfig();
  const effectiveId = config.spreadsheet_id || config.secretary_sheet_id || config.doctor_sheet_id;
  if (serviceAccountKey && effectiveId) {
    await new Promise((r) => setTimeout(r, 60));
  } else {
    await new Promise((r) => setTimeout(r, 30));
  }
}
function exportAppointmentsCSV() {
  const appointments = db.prepare(`
    SELECT a.reference_number, a.patient_name, a.patient_phone, b.name_ar as branch_name, b.city as branch_city,
           a.appointment_date, a.slot_time, a.service_name, a.status, a.instapay_phone, a.deposit_status,
           a.deposit_amount, a.revisit_code, a.is_walkin, a.created_at
    FROM appointments a
    JOIN branches b ON a.branch_id = b.id
    ORDER BY a.appointment_date DESC, a.slot_time DESC
  `).all();
  const headers = [
    "\u0627\u0644\u0631\u0642\u0645 \u0627\u0644\u0645\u0631\u062C\u0639\u064A",
    "\u0627\u0633\u0645 \u0627\u0644\u0645\u0631\u064A\u0636",
    "\u0627\u0644\u0647\u0627\u062A\u0641",
    "\u0627\u0644\u0641\u0631\u0639",
    "\u0627\u0644\u0645\u062D\u0627\u0641\u0638\u0629/\u0627\u0644\u0645\u062F\u064A\u0646\u0629",
    "\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0645\u0648\u0639\u062F",
    "\u0627\u0644\u0648\u0642\u062A",
    "\u0627\u0644\u062E\u062F\u0645\u0629 \u0627\u0644\u0645\u0637\u0644\u0648\u0628\u0629",
    "\u062D\u0627\u0644\u0629 \u0627\u0644\u062D\u062C\u0632",
    "\u0647\u0627\u062A\u0641 \u0625\u0646\u0633\u062A\u0627\u0628\u0627\u064A",
    "\u062D\u0627\u0644\u0629 \u0627\u0644\u0639\u0631\u0628\u0648\u0646",
    "\u0642\u064A\u0645\u0629 \u0627\u0644\u0639\u0631\u0628\u0648\u0646 (\u062C.\u0645)",
    "\u0643\u0648\u062F \u0627\u0644\u0625\u0639\u0627\u062F\u0629",
    "\u062D\u062C\u0632 \u0645\u0628\u0627\u0634\u0631/\u0639\u064A\u0627\u062F\u0629",
    "\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u062A\u0633\u062C\u064A\u0644"
  ];
  const rows = appointments.map((app) => [
    app.reference_number,
    `"${(app.patient_name || "").replace(/"/g, '""')}"`,
    `"${app.patient_phone}"`,
    `"${app.branch_name}"`,
    `"${app.branch_city || "\u0627\u0644\u0634\u0631\u0642\u064A\u0629"}"`,
    app.appointment_date,
    app.slot_time,
    `"${(app.service_name || "\u0643\u0634\u0641 \u0648\u0627\u0633\u062A\u0634\u0627\u0631\u0629").replace(/"/g, '""')}"`,
    app.status,
    app.instapay_phone ? `"${app.instapay_phone}"` : "\u063A\u064A\u0631 \u0645\u0633\u062C\u0644",
    app.deposit_status,
    app.deposit_amount,
    app.revisit_code || "\u0628\u062F\u0648\u0646 \u0643\u0648\u062F",
    app.is_walkin === 1 ? "\u0646\u0639\u0645 (\u0645\u0628\u0627\u0634\u0631)" : "\u0644\u0627 (\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A)",
    app.created_at
  ]);
  return "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}
function exportInvoicesCSV() {
  const invoices = db.prepare(`
    SELECT i.invoice_number, p.id as patient_id, p.full_name as patient_name, p.phone as patient_phone,
           b.name_ar as branch_name, i.subtotal, i.total_discount, i.deposit_deducted,
           i.total_amount, i.paid_amount, i.remaining_balance, i.status as payment_status,
           a.reference_number as booking_ref, i.created_at, u.full_name as doctor_name
    FROM invoices i
    JOIN patients p ON i.patient_id = p.id
    LEFT JOIN branches b ON i.branch_id = b.id
    LEFT JOIN appointments a ON i.appointment_id = a.id
    LEFT JOIN users u ON i.created_by_id = u.id
    ORDER BY i.created_at DESC
  `).all();
  const headers = [
    "\u0631\u0642\u0645 \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629",
    "\u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u0631\u064A\u0636",
    "\u0627\u0633\u0645 \u0627\u0644\u0645\u0631\u064A\u0636",
    "\u0627\u0644\u0647\u0627\u062A\u0641",
    "\u0627\u0644\u0641\u0631\u0639",
    "\u0627\u0644\u0645\u062C\u0645\u0648\u0639 \u0642\u0628\u0644 \u0627\u0644\u062E\u0635\u0645",
    "\u0627\u0644\u062E\u0635\u0648\u0645\u0627\u062A",
    "\u0627\u0644\u0639\u0631\u0628\u0648\u0646 \u0627\u0644\u0645\u062E\u0635\u0648\u0645",
    "\u0627\u0644\u0635\u0627\u0641\u064A \u0627\u0644\u0645\u0637\u0644\u0648\u0628",
    "\u0627\u0644\u0645\u0633\u062F\u062F \u0641\u0639\u0644\u064A\u0627\u064B",
    "\u0627\u0644\u0631\u0635\u064A\u062F \u0627\u0644\u0645\u062A\u0628\u0642\u064A",
    "\u062D\u0627\u0644\u0629 \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629",
    "\u0631\u0642\u0645 \u0627\u0644\u062D\u062C\u0632",
    "\u0627\u0644\u0637\u0628\u064A\u0628 \u0627\u0644\u0645\u0633\u0624\u0648\u0644",
    "\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0639\u0645\u0644\u064A\u0629"
  ];
  const rows = invoices.map((inv) => [
    inv.invoice_number,
    inv.patient_id,
    `"${(inv.patient_name || "").replace(/"/g, '""')}"`,
    `"${inv.patient_phone}"`,
    `"${inv.branch_name || "\u0627\u0644\u0645\u0631\u0643\u0632 \u0627\u0644\u0631\u0626\u064A\u0633\u064A"}"`,
    inv.subtotal,
    inv.total_discount,
    inv.deposit_deducted,
    inv.total_amount,
    inv.paid_amount,
    inv.remaining_balance,
    inv.payment_status,
    inv.booking_ref || "\u0632\u064A\u0627\u0631\u0629 \u0645\u0628\u0627\u0634\u0631\u0629",
    `"${inv.doctor_name || "\u062F. \u0645\u062D\u0645\u062F \u0635\u0628\u0631\u0629"}"`,
    inv.created_at
  ]);
  return "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}
function exportPatientsCSV() {
  const patients = db.prepare(`
    SELECT p.id, p.full_name, p.phone, p.age, p.gender, p.chronic_diseases, p.allergies,
           COUNT(DISTINCT a.id) as visits_count,
           COALESCE(MAX(a.appointment_date), '\u0644\u0627 \u062A\u0648\u062C\u062F \u0632\u064A\u0627\u0631\u0627\u062A') as last_visit,
           COALESCE(SUM(i.total_amount), 0) as total_billed,
           COALESCE(SUM(i.remaining_balance), 0) as current_debt,
           p.created_at
    FROM patients p
    LEFT JOIN appointments a ON p.id = a.patient_id
    LEFT JOIN invoices i ON p.id = i.patient_id
    GROUP BY p.id
    ORDER BY p.created_at DESC
  `).all();
  const headers = [
    "\u0643\u0648\u062F \u0627\u0644\u0645\u0631\u064A\u0636",
    "\u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0643\u0627\u0645\u0644",
    "\u0631\u0642\u0645 \u0627\u0644\u0647\u0627\u062A\u0641",
    "\u0627\u0644\u0639\u0645\u0631",
    "\u0627\u0644\u0646\u0648\u0639",
    "\u0627\u0644\u0623\u0645\u0631\u0627\u0636 \u0627\u0644\u0645\u0632\u0645\u0646\u0629",
    "\u0627\u0644\u062D\u0633\u0627\u0633\u064A\u0629",
    "\u0639\u062F\u062F \u0627\u0644\u0632\u064A\u0627\u0631\u0627\u062A",
    "\u062A\u0627\u0631\u064A\u062E \u0622\u062E\u0631 \u0632\u064A\u0627\u0631\u0629",
    "\u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u062A\u0643\u0627\u0644\u064A\u0641 (\u062C.\u0645)",
    "\u0627\u0644\u0645\u062F\u064A\u0648\u0646\u064A\u0629 \u0627\u0644\u062D\u0627\u0644\u064A\u0629 (\u062C.\u0645)",
    "\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u062A\u0633\u062C\u064A\u0644"
  ];
  const rows = patients.map((p) => [
    p.id,
    `"${(p.full_name || "").replace(/"/g, '""')}"`,
    `"${p.phone}"`,
    p.age || "-",
    p.gender || "-",
    `"${(p.chronic_diseases || "\u0644\u0627 \u064A\u0648\u062C\u062F").replace(/"/g, '""')}"`,
    `"${(p.allergies || "\u0644\u0627 \u064A\u0648\u062C\u062F").replace(/"/g, '""')}"`,
    p.visits_count,
    p.last_visit,
    p.total_billed,
    p.current_debt,
    p.created_at
  ]);
  return "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

// src/server/api.ts
import crypto3 from "node:crypto";
import fs2 from "node:fs";
import path2 from "node:path";
var apiRouter = Router();
apiRouter.use(authenticate);
function getCairoDateInfo() {
  const now = /* @__PURE__ */ new Date();
  const cairoFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  const todayStr = cairoFormatter.format(now);
  const yDate = /* @__PURE__ */ new Date(todayStr + "T12:00:00Z");
  yDate.setDate(yDate.getDate() - 1);
  const yesterdayStr = yDate.toISOString().split("T")[0];
  const tDate = /* @__PURE__ */ new Date(todayStr + "T12:00:00Z");
  tDate.setDate(tDate.getDate() + 1);
  const tomorrowStr = tDate.toISOString().split("T")[0];
  const allowedDates = [];
  const arabicDayNames = ["\u0627\u0644\u0623\u062D\u062F", "\u0627\u0644\u0625\u062B\u0646\u064A\u0646", "\u0627\u0644\u062B\u0644\u0627\u062B\u0627\u0621", "\u0627\u0644\u0623\u0631\u0628\u0639\u0627\u0621", "\u0627\u0644\u062E\u0645\u064A\u0633", "\u0627\u0644\u062C\u0645\u0639\u0629", "\u0627\u0644\u0633\u0628\u062A"];
  const baseDate = /* @__PURE__ */ new Date(todayStr + "T12:00:00Z");
  for (let i = 1; i <= 4; i++) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split("T")[0];
    const dayNameAr = arabicDayNames[d.getDay()];
    allowedDates.push({ dateStr, dayNameAr, isAllowed: true });
  }
  return { todayStr, yesterdayStr, tomorrowStr, allowedDates };
}
apiRouter.get("/clinic-info", (req, res) => {
  try {
    const branches = db.prepare("SELECT * FROM branches WHERE is_active = 1 ORDER BY deposit_amount ASC").all();
    const services = db.prepare("SELECT * FROM services WHERE is_active = 1 ORDER BY base_price DESC").all();
    res.json({
      name_ar: "\u0639\u064A\u0627\u062F\u0629 \u062F. \u0645\u062D\u0645\u062F \u0635\u0628\u0631\u0629 \u0627\u0644\u0646\u062C\u0627\u0631 \u0644\u0637\u0628 \u0648\u062C\u0631\u0627\u062D\u0629 \u0627\u0644\u0641\u0645 \u0648\u0627\u0644\u0623\u0633\u0646\u0627\u0646 \u0648\u062A\u0642\u0648\u064A\u0645 \u0627\u0644\u0623\u0633\u0646\u0627\u0646",
      name_en: "Dr. Mohamed Sabra Elnaggar Dental Clinic & PMS",
      specialty: "\u0623\u062E\u0635\u0627\u0626\u064A \u0637\u0628 \u0648\u062C\u0631\u0627\u062D\u0629 \u0627\u0644\u0641\u0645 \u0648\u0627\u0644\u0623\u0633\u0646\u0627\u0646 \u2014 \u062A\u0642\u0648\u064A\u0645 \u0627\u0644\u0623\u0633\u0646\u0627\u0646",
      phone: "01093591193",
      facebook_url: "https://www.facebook.com/Dr.SabraElnaggar/",
      branches,
      services,
      rating: {
        score: 4.8,
        reviews_count: 142,
        source: "Google Verified Reviews"
      }
    });
  } catch (err) {
    res.status(500).json({ error: "\u062A\u0639\u0630\u0631 \u062C\u0644\u0628 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0639\u064A\u0627\u062F\u0629 \u0648\u0627\u0644\u0641\u0631\u0648\u0639" });
  }
});
apiRouter.get("/available-slots", (req, res) => {
  try {
    const branchId = req.query.branchId || "branch_dairab_negm";
    const dateQuery = req.query.date;
    const { todayStr, allowedDates } = getCairoDateInfo();
    if (dateQuery) {
      const branch = db.prepare("SELECT * FROM branches WHERE id = ?").get(branchId);
      if (!branch) {
        res.status(404).json({ error: "\u0627\u0644\u0641\u0631\u0639 \u0627\u0644\u0645\u062D\u062F\u062F \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
        return;
      }
      const exception = db.prepare("SELECT * FROM appointment_exceptions WHERE branch_id = ? AND exception_date = ?").get(branchId, dateQuery);
      if (exception && exception.exception_type === "closed_day") {
        res.json({
          date: dateQuery,
          branch,
          is_closed: true,
          closed_reason: exception.reason || "\u064A\u0648\u0645 \u0625\u062C\u0627\u0632\u0629 / \u0645\u063A\u0644\u0642 \u0628\u0642\u0631\u0627\u0631 \u0627\u0644\u0625\u062F\u0627\u0631\u0629",
          slots: []
        });
        return;
      }
      const openTime = branch.daily_open_time || "14:00";
      const closeTime = branch.daily_close_time || "21:00";
      const slotDuration = branch.slot_duration_minutes || 30;
      const defaultCapacity = branch.slot_capacity || 1;
      const generatedTimes = [];
      const [startHour, startMin] = openTime.split(":").map(Number);
      const [endHour, endMin] = closeTime.split(":").map(Number);
      let current = startHour * 60 + startMin;
      const end = endHour * 60 + endMin;
      while (current < end) {
        const hh = String(Math.floor(current / 60)).padStart(2, "0");
        const mm = String(current % 60).padStart(2, "0");
        generatedTimes.push(`${hh}:${mm}`);
        current += slotDuration;
      }
      const customSlots = db.prepare("SELECT * FROM appointment_slots WHERE branch_id = ? AND slot_date = ?").all(branchId, dateQuery);
      const customSlotsMap = new Map(customSlots.map((s) => [s.start_time, s]));
      const bookings = db.prepare(`
        SELECT slot_time, COUNT(*) as count 
        FROM appointments 
        WHERE branch_id = ? AND appointment_date = ? AND status NOT IN ('rejected', 'cancelled')
        GROUP BY slot_time
      `).all(branchId, dateQuery);
      const bookingCountsMap = new Map(bookings.map((b) => [b.slot_time, b.count]));
      const slots = generatedTimes.map((time) => {
        const custom = customSlotsMap.get(time);
        const booked = bookingCountsMap.get(time) || 0;
        const capacity = custom ? custom.capacity : defaultCapacity;
        const isClosed = custom ? Boolean(custom.is_closed) : false;
        const remainingCapacity = Math.max(0, capacity - booked);
        return {
          time,
          capacity,
          booked_count: booked,
          remaining_capacity: remainingCapacity,
          is_available: !isClosed && remainingCapacity > 0,
          is_closed: isClosed,
          closed_reason: custom?.closed_reason
        };
      });
      res.json({
        date: dateQuery,
        branch,
        is_closed: false,
        slots
      });
      return;
    }
    res.json({
      today: todayStr,
      timezone: "Africa/Cairo",
      allowedDates
    });
  } catch (err) {
    res.status(500).json({ error: "\u062A\u0639\u0630\u0631 \u0627\u0633\u062A\u0631\u062C\u0627\u0639 \u0627\u0644\u0645\u0648\u0627\u0639\u064A\u062F \u0627\u0644\u0645\u062A\u0627\u062D\u0629" });
  }
});
apiRouter.post("/revisit-codes/verify", (req, res) => {
  try {
    const { code, phone } = req.body;
    if (!code) {
      res.status(400).json({ error: "\u064A\u0631\u062C\u0649 \u0625\u062F\u062E\u0627\u0644 \u0643\u0648\u062F \u0627\u0644\u0643\u0634\u0641 \u0623\u0648 \u0627\u0644\u0625\u0639\u0627\u062F\u0629" });
      return;
    }
    const trimmedCode = String(code).trim().toUpperCase();
    const revisit = db.prepare(`
      SELECT r.*, p.full_name, p.phone as patient_phone
      FROM revisit_codes r
      LEFT JOIN patients p ON r.patient_id = p.id
      WHERE UPPER(r.code) = ?
    `).get(trimmedCode);
    if (!revisit) {
      res.status(404).json({ error: "\u0643\u0648\u062F \u0627\u0644\u0625\u0639\u0627\u062F\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u060C \u064A\u0631\u062C\u0649 \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u0627\u0644\u0631\u0645\u0632" });
      return;
    }
    if (revisit.used_count >= revisit.max_uses) {
      res.status(400).json({ error: "\u062A\u0645 \u0627\u0633\u062A\u0646\u0641\u0627\u062F \u0627\u0644\u062D\u062F \u0627\u0644\u0623\u0642\u0635\u0649 \u0644\u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0647\u0630\u0627 \u0627\u0644\u0643\u0648\u062F" });
      return;
    }
    if (revisit.expires_at && new Date(revisit.expires_at) < /* @__PURE__ */ new Date()) {
      res.status(400).json({ error: "\u0639\u0630\u0631\u064B\u0627\u060C \u0627\u0646\u062A\u0647\u062A \u0635\u0644\u0627\u062D\u064A\u0629 \u0647\u0630\u0627 \u0627\u0644\u0643\u0648\u062F" });
      return;
    }
    if (revisit.patient_id && revisit.patient_phone && phone) {
      const cleanInput = phone.replace(/\D/g, "");
      const cleanDb = revisit.patient_phone.replace(/\D/g, "");
      if (cleanInput && cleanDb && !cleanInput.endsWith(cleanDb.slice(-8))) {
        res.status(400).json({ error: "\u0643\u0648\u062F \u0627\u0644\u0625\u0639\u0627\u062F\u0629 \u0645\u062E\u0635\u0635 \u0644\u0631\u0642\u0645 \u0647\u0627\u062A\u0641 \u0645\u062E\u062A\u0644\u0641" });
        return;
      }
    }
    res.json({
      valid: true,
      discount_type: revisit.discount_type,
      fee_amount: revisit.fee_amount,
      payment_channel: revisit.payment_channel,
      message: revisit.discount_type === "full_exemption" ? "\u062A\u0645 \u0627\u0644\u062A\u062D\u0642\u0642 \u0628\u0646\u062C\u0627\u062D: \u0643\u0648\u062F \u0625\u0639\u0641\u0627\u0621 \u0643\u0627\u0645\u0644 \u0645\u0646 \u0639\u0631\u0628\u0648\u0646 \u0627\u0644\u062D\u062C\u0632 (100% \u062E\u0635\u0645)" : `\u062A\u0645 \u0627\u0644\u062A\u062D\u0642\u0642 \u0628\u0646\u062C\u0627\u062D: \u0631\u0633\u0648\u0645 \u062D\u062C\u0632 \u0645\u062E\u0641\u0636\u0629 \u0628\u0642\u064A\u0645\u0629 ${revisit.fee_amount} \u062C.\u0645`
    });
  } catch (err) {
    res.status(500).json({ error: "\u062D\u062F\u062B \u062E\u0637\u0623 \u0623\u062B\u0646\u0627\u0621 \u0641\u062D\u0635 \u0627\u0644\u0643\u0648\u062F" });
  }
});
apiRouter.post("/bookings", (req, res) => {
  try {
    const {
      branch_id,
      patient_name,
      patient_phone,
      appointment_date,
      slot_time,
      service_id,
      service_name,
      instapay_phone,
      receipt_url,
      revisit_code,
      notes
    } = req.body;
    if (!patient_name || patient_name.trim().length < 3) {
      res.status(400).json({ error: "\u064A\u0631\u062C\u0649 \u0625\u062F\u062E\u0627\u0644 \u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u062B\u0644\u0627\u062B\u064A \u0628\u0627\u0644\u0643\u0627\u0645\u0644" });
      return;
    }
    if (!patient_phone || !/^(010|011|012|015)\d{8}$/.test(patient_phone.trim())) {
      res.status(400).json({ error: "\u064A\u0631\u062C\u0649 \u0625\u062F\u062E\u0627\u0644 \u0631\u0642\u0645 \u0647\u0627\u062A\u0641 \u0645\u0635\u0631\u064A \u0635\u062D\u064A\u062D \u0645\u0643\u0648\u0646 \u0645\u0646 11 \u0631\u0642\u0645\u0627\u064B" });
      return;
    }
    const { todayStr, allowedDates } = getCairoDateInfo();
    if (appointment_date === todayStr) {
      res.status(400).json({ error: "\u064A\u0645\u0646\u0639 \u062D\u062C\u0632 \u0645\u0648\u0639\u062F \u0641\u064A \u0646\u0641\u0633 \u0627\u0644\u064A\u0648\u0645 \u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A\u0627\u064B. \u0627\u0644\u062D\u062C\u0632 \u0645\u062A\u0627\u062D \u0628\u062F\u0621\u0627\u064B \u0645\u0646 \u064A\u0648\u0645 \u0627\u0644\u063A\u062F." });
      return;
    }
    const isDateAllowed = allowedDates.some((d) => d.dateStr === appointment_date);
    if (!isDateAllowed) {
      res.status(400).json({ error: "\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0645\u0648\u0639\u062F \u062E\u0627\u0631\u062C \u0646\u0627\u0641\u0630\u0629 \u0627\u0644\u0623\u064A\u0627\u0645 \u0627\u0644\u0640 4 \u0627\u0644\u0645\u0633\u0645\u0648\u062D \u0628\u0647\u0627 \u0644\u0644\u062D\u062C\u0632." });
      return;
    }
    if (!slot_time) {
      res.status(400).json({ error: "\u064A\u0631\u062C\u0649 \u0627\u062E\u062A\u064A\u0627\u0631 \u0648\u0642\u062A \u0627\u0644\u0645\u0648\u0639\u062F" });
      return;
    }
    const effectiveBranchId = branch_id || "branch_dairab_negm";
    const branch = db.prepare("SELECT * FROM branches WHERE id = ?").get(effectiveBranchId);
    if (!branch) {
      res.status(400).json({ error: "\u0627\u0644\u0641\u0631\u0639 \u0627\u0644\u0645\u062E\u062A\u0627\u0631 \u063A\u064A\u0631 \u0645\u062A\u0627\u062D" });
      return;
    }
    let validServiceId = null;
    let validServiceName = service_name || "\u0643\u0634\u0641 \u0648\u0627\u0633\u062A\u0634\u0627\u0631\u0629 \u0637\u0628\u064A\u0629 \u0645\u062A\u062E\u0635\u0635\u0629";
    if (service_id) {
      const srvCheck = db.prepare("SELECT id, name_ar FROM services WHERE id = ? OR code = ?").get(service_id, service_id);
      if (srvCheck) {
        validServiceId = srvCheck.id;
        validServiceName = srvCheck.name_ar;
      }
    }
    let verifiedRevisit = null;
    let isExempted = false;
    if (revisit_code && String(revisit_code).trim()) {
      const codeUpper = String(revisit_code).trim().toUpperCase();
      verifiedRevisit = db.prepare("SELECT * FROM revisit_codes WHERE UPPER(code) = ?").get(codeUpper);
      if (!verifiedRevisit || verifiedRevisit.used_count >= verifiedRevisit.max_uses) {
        res.status(400).json({ error: "\u0643\u0648\u062F \u0627\u0644\u0625\u0639\u0627\u062F\u0629 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D \u0623\u0648 \u062A\u0645 \u0627\u0633\u062A\u062E\u062F\u0627\u0645\u0647 \u0628\u0627\u0644\u0643\u0627\u0645\u0644" });
        return;
      }
      if (verifiedRevisit.expires_at && new Date(verifiedRevisit.expires_at) < /* @__PURE__ */ new Date()) {
        res.status(400).json({ error: "\u0643\u0648\u062F \u0627\u0644\u0625\u0639\u0627\u062F\u0629 \u0645\u0646\u062A\u0647\u064A \u0627\u0644\u0635\u0644\u0627\u062D\u064A\u0629" });
        return;
      }
      if (verifiedRevisit.discount_type === "full_exemption") {
        isExempted = true;
      }
    }
    if (!isExempted && (!instapay_phone || instapay_phone.trim().length < 4)) {
      res.status(400).json({ error: "\u064A\u0631\u062C\u0649 \u0625\u062F\u062E\u0627\u0644 \u0631\u0642\u0645 \u0627\u0644\u0647\u0627\u062A\u0641 \u0627\u0644\u0645\u062D\u0648\u0644 \u0645\u0646\u0647 \u0639\u0628\u0631 InstaPay" });
      return;
    }
    const requiredDeposit = isExempted ? 0 : verifiedRevisit ? verifiedRevisit.fee_amount : branch.deposit_amount || 150;
    const activeBookings = db.prepare(`
      SELECT COUNT(*) as count 
      FROM appointments 
      WHERE branch_id = ? AND appointment_date = ? AND slot_time = ? AND status NOT IN ('rejected', 'cancelled')
    `).get(effectiveBranchId, appointment_date, slot_time);
    if (activeBookings.count >= (branch.slot_capacity || 1)) {
      res.status(409).json({ error: "\u0639\u0630\u0631\u0627\u064B\u060C \u062A\u0645 \u062D\u062C\u0632 \u0647\u0630\u0647 \u0627\u0644\u0641\u062A\u0631\u0629 \u0644\u0644\u062A\u0648 \u0645\u0646 \u0642\u0628\u0644 \u0645\u0631\u064A\u0636 \u0622\u062E\u0631. \u064A\u0631\u062C\u0649 \u0627\u062E\u062A\u064A\u0627\u0631 \u0641\u062A\u0631\u0629 \u0632\u0645\u0646\u064A\u0629 \u0623\u062E\u0631\u0649." });
      return;
    }
    const dateCode = appointment_date.replace(/-/g, "");
    const randCode = Math.floor(1e3 + Math.random() * 9e3);
    const referenceNumber = `APT-${dateCode}-${randCode}`;
    const appointmentId = "apt_" + crypto3.randomUUID();
    let patient = db.prepare("SELECT id FROM patients WHERE phone = ?").get(patient_phone.trim());
    let patientId = patient?.id;
    if (!patientId) {
      patientId = "PT-" + Math.floor(1e3 + Math.random() * 9e3);
      db.prepare("INSERT INTO patients (id, full_name, phone) VALUES (?, ?, ?)").run(
        patientId,
        patient_name.trim(),
        patient_phone.trim()
      );
    }
    const initialStatus = isExempted ? "confirmed" : "pending_review";
    const initialDepositStatus = isExempted ? "exempted" : "pending_verification";
    db.prepare(`
      INSERT INTO appointments (
        id, reference_number, branch_id, patient_id, patient_name, patient_phone,
        appointment_date, slot_time, service_id, service_name, instapay_phone, receipt_url,
        deposit_amount, deposit_status, status, revisit_code, notes, is_walkin
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `).run(
      appointmentId,
      referenceNumber,
      effectiveBranchId,
      patientId,
      patient_name.trim(),
      patient_phone.trim(),
      appointment_date,
      slot_time,
      validServiceId,
      validServiceName,
      instapay_phone ? instapay_phone.trim() : null,
      receipt_url || null,
      requiredDeposit,
      initialDepositStatus,
      initialStatus,
      verifiedRevisit ? verifiedRevisit.code : null,
      notes || null
    );
    if (verifiedRevisit) {
      db.prepare(`
        UPDATE revisit_codes 
        SET used_count = used_count + 1,
            is_used = CASE WHEN used_count + 1 >= max_uses THEN 1 ELSE 0 END,
            used_at = CURRENT_TIMESTAMP,
            used_by_appointment_id = ?
        WHERE id = ?
      `).run(appointmentId, verifiedRevisit.id);
    }
    try {
      queueSyncItem({
        entityType: "appointment",
        entityId: appointmentId,
        targetSheet: "secretary",
        payload: {
          reference_number: referenceNumber,
          patient_name: patient_name.trim(),
          patient_phone: patient_phone.trim(),
          branch_name: branch.name_ar,
          appointment_date,
          slot_time,
          service_name: validServiceName,
          status: initialStatus,
          deposit_status: initialDepositStatus,
          deposit_amount: requiredDeposit
        }
      });
      processOutboxSync().catch((err) => console.error("Outbox sync error:", err));
    } catch (syncErr) {
      console.warn("Sync queue error:", syncErr);
    }
    logAudit({
      action: "PUBLIC_BOOKING_CREATED",
      entityType: "appointment",
      entityId: appointmentId,
      details: { referenceNumber, appointment_date, slot_time, branch: branch.name_ar, requiredDeposit }
    });
    const appointmentData = {
      id: appointmentId,
      reference_number: referenceNumber,
      appointment_date,
      slot_time,
      branch_name: branch.name_ar,
      branch_address: branch.address_ar || "\u0627\u0644\u0634\u0631\u0642\u064A\u0629 - \u062F\u064A\u0631\u0628 \u0646\u062C\u0645 - \u0628\u0631\u062C \u0627\u0644\u0641\u0644\u0633\u0637\u064A\u0646\u064A - \u0623\u0645\u0627\u0645 \u0627\u0644\u0643\u0646\u064A\u0633\u0629 - \u0627\u0644\u062F\u0648\u0631 \u0627\u0644\u062E\u0627\u0645\u0633",
      patient_name: patient_name.trim(),
      patient_phone: patient_phone.trim(),
      service_name: validServiceName,
      deposit_amount: requiredDeposit,
      deposit_status: initialDepositStatus,
      status: initialStatus,
      payment_type: isExempted ? "revisit_code" : "instapay",
      instapay_phone: instapay_phone ? instapay_phone.trim() : null,
      revisit_code: verifiedRevisit ? verifiedRevisit.code : null,
      notes: notes ? notes.trim() : "",
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    res.status(201).json({
      success: true,
      appointment: appointmentData,
      reference_number: referenceNumber,
      appointment_id: appointmentId,
      status: initialStatus,
      deposit_status: initialDepositStatus,
      deposit_amount: requiredDeposit,
      appointment_date,
      slot_time,
      branch_name: branch.name_ar,
      patient_name: patient_name.trim(),
      patient_phone: patient_phone.trim(),
      is_exempted: isExempted,
      message: isExempted ? "\u062A\u0645 \u0627\u0639\u062A\u0645\u0627\u062F \u0648\u062A\u0623\u0643\u064A\u062F \u0645\u0648\u0639\u062F\u0643 \u0628\u0646\u062C\u0627\u062D \u0628\u0645\u0648\u062C\u0628 \u0643\u0648\u062F \u0627\u0644\u0625\u0639\u0641\u0627\u0621 \u0627\u0644\u0645\u0639\u062A\u0645\u062F." : "\u062A\u0645 \u0627\u0633\u062A\u0644\u0627\u0645 \u0637\u0644\u0628 \u0627\u0644\u062D\u062C\u0632 \u0628\u0646\u062C\u0627\u062D \u0648\u0647\u0648 \u0627\u0644\u0622\u0646 \u0642\u064A\u062F \u0627\u0644\u0645\u0631\u0627\u062C\u0639\u0629 \u0627\u0644\u0641\u0648\u0631\u064A\u0629 \u0645\u0646 \u0627\u0644\u0633\u0643\u0631\u062A\u0627\u0631\u064A\u0629. \u064A\u0631\u062C\u0649 \u0627\u0644\u0639\u0644\u0645 \u0623\u0646\u0647 \u0633\u064A\u062A\u0645 \u062E\u0635\u0645 \u0643\u0627\u0645\u0644 \u0627\u0644\u0639\u0631\u0628\u0648\u0646 \u062A\u0644\u0642\u0627\u0626\u064A\u0627\u064B \u0645\u0646 \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629 \u0639\u0646\u062F \u0627\u0644\u0632\u064A\u0627\u0631\u0629."
    });
  } catch (err) {
    console.error("Booking submission error:", err);
    res.status(500).json({ error: "\u062A\u0639\u0630\u0631 \u0625\u062A\u0645\u0627\u0645 \u0637\u0644\u0628 \u0627\u0644\u062D\u062C\u0632\u060C \u064A\u0631\u062C\u0649 \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0648\u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u0645\u062C\u062F\u062F\u0627\u064B." });
  }
});
apiRouter.get("/bookings/:reference", (req, res) => {
  try {
    const reference = req.params.reference;
    const app = db.prepare(`
      SELECT a.*, b.name_ar as branch_name, b.address_ar as branch_address, b.phone as branch_phone, b.maps_url
      FROM appointments a
      JOIN branches b ON a.branch_id = b.id
      WHERE a.reference_number = ? OR a.id = ?
    `).get(reference, reference);
    if (!app) {
      res.status(404).json({ error: "\u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u062D\u062C\u0632 \u0628\u0647\u0630\u0627 \u0627\u0644\u0631\u0642\u0645 \u0627\u0644\u0645\u0631\u062C\u0639\u064A" });
      return;
    }
    res.json(app);
  } catch (err) {
    res.status(500).json({ error: "\u062A\u0639\u0630\u0631 \u0627\u0633\u062A\u0631\u062C\u0627\u0639 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062D\u062C\u0632" });
  }
});
apiRouter.post("/auth/login", (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ error: "\u064A\u0631\u062C\u0649 \u0625\u062F\u062E\u0627\u0644 \u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0648\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631" });
      return;
    }
    const hashed = hashPassword(password);
    const user = db.prepare("SELECT * FROM users WHERE username = ? AND password_hash = ? AND is_active = 1").get(username.trim().toLowerCase(), hashed);
    if (!user) {
      logAudit({
        action: "FAILED_LOGIN_ATTEMPT",
        entityType: "user",
        details: { username, ip: req.ip }
      });
      res.status(401).json({ error: "\u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0623\u0648 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629" });
      return;
    }
    const token = createToken({
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      role: user.role,
      phone: user.phone
    });
    logAudit({
      userId: user.id,
      userRole: user.role,
      userName: user.full_name,
      action: "LOGIN_SUCCESS",
      entityType: "user",
      entityId: user.id
    });
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        role: user.role,
        phone: user.phone
      }
    });
  } catch (err) {
    res.status(500).json({ error: "\u062D\u062F\u062B \u062E\u0637\u0623 \u0623\u062B\u0646\u0627\u0621 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644" });
  }
});
apiRouter.get("/auth/me", requireSecretary, (req, res) => {
  res.json({ user: req.user });
});
apiRouter.get("/secretary/dashboard", requireSecretary, (req, res) => {
  try {
    const { todayStr, tomorrowStr, yesterdayStr } = getCairoDateInfo();
    const todayCount = db.prepare("SELECT COUNT(*) as count FROM appointments WHERE appointment_date = ? AND status != 'cancelled'").get(todayStr)?.count || 0;
    const tomorrowCount = db.prepare("SELECT COUNT(*) as count FROM appointments WHERE appointment_date = ? AND status != 'cancelled'").get(tomorrowStr)?.count || 0;
    const yesterdayCount = db.prepare("SELECT COUNT(*) as count FROM appointments WHERE appointment_date = ? AND status != 'cancelled'").get(yesterdayStr)?.count || 0;
    const pendingReviews = db.prepare("SELECT COUNT(*) as count FROM appointments WHERE deposit_status = 'pending_verification' AND status = 'pending_review'").get()?.count || 0;
    const confirmedCount = db.prepare("SELECT COUNT(*) as count FROM appointments WHERE status = 'confirmed' AND appointment_date >= ?").get(todayStr)?.count || 0;
    res.json({
      today: todayStr,
      tomorrow: tomorrowStr,
      yesterday: yesterdayStr,
      metrics: {
        today_count: todayCount,
        tomorrow_count: tomorrowCount,
        yesterday_count: yesterdayCount,
        pending_reviews: pendingReviews,
        confirmed_upcoming: confirmedCount
      }
    });
  } catch (err) {
    res.status(500).json({ error: "\u062A\u0639\u0630\u0631 \u062C\u0644\u0628 \u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A \u0627\u0644\u0633\u0643\u0631\u062A\u0627\u0631\u064A\u0629" });
  }
});
apiRouter.get("/secretary/appointments", requireSecretary, (req, res) => {
  try {
    const { status, date, branch_id, search } = req.query;
    const { todayStr } = getCairoDateInfo();
    let query = `
      SELECT a.*, b.name_ar as branch_name, b.city as branch_city
      FROM appointments a
      JOIN branches b ON a.branch_id = b.id
      WHERE 1=1
    `;
    const params = [];
    if (branch_id && branch_id !== "all") {
      query += " AND a.branch_id = ?";
      params.push(branch_id);
    }
    if (date && date !== "all") {
      query += " AND a.appointment_date = ?";
      params.push(date);
    }
    if (status && status !== "all") {
      query += " AND a.status = ?";
      params.push(status);
    }
    if (search && String(search).trim()) {
      query += ` AND (
        a.reference_number LIKE ? OR 
        a.patient_name LIKE ? OR 
        a.patient_phone LIKE ? OR 
        a.instapay_phone LIKE ?
      )`;
      const term = `%${String(search).trim()}%`;
      params.push(term, term, term, term);
    }
    query += " ORDER BY a.appointment_date ASC, a.slot_time ASC LIMIT 100";
    const appointments = db.prepare(query).all(...params);
    res.json({ appointments, default_date: todayStr });
  } catch (err) {
    res.status(500).json({ error: "\u062A\u0639\u0630\u0631 \u0627\u0633\u062A\u0631\u062C\u0627\u0639 \u062C\u062F\u0648\u0644 \u0627\u0644\u0645\u0648\u0627\u0639\u064A\u062F" });
  }
});
apiRouter.post("/secretary/appointments/walk-in", requireSecretary, (req, res) => {
  try {
    const {
      branch_id,
      patient_name,
      patient_phone,
      appointment_date,
      slot_time,
      service_name,
      payment_status = "verified",
      payment_method = "cash",
      notes
    } = req.body;
    if (!patient_name || !patient_phone || !appointment_date || !slot_time) {
      res.status(400).json({ error: "\u064A\u0631\u062C\u0649 \u0625\u0643\u0645\u0627\u0644 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062D\u062C\u0632 \u0627\u0644\u0625\u062C\u0628\u0627\u0631\u064A" });
      return;
    }
    const effectiveBranchId = branch_id || "branch_dairab_negm";
    const branch = db.prepare("SELECT * FROM branches WHERE id = ?").get(effectiveBranchId);
    const dateCode = appointment_date.replace(/-/g, "");
    const randCode = Math.floor(1e3 + Math.random() * 9e3);
    const referenceNumber = `APT-${dateCode}-${randCode}`;
    const appointmentId = "apt_" + crypto3.randomUUID();
    let patient = db.prepare("SELECT id FROM patients WHERE phone = ?").get(patient_phone.trim());
    let patientId = patient?.id;
    if (!patientId) {
      patientId = "PT-" + Math.floor(1e3 + Math.random() * 9e3);
      db.prepare("INSERT INTO patients (id, full_name, phone) VALUES (?, ?, ?)").run(
        patientId,
        patient_name.trim(),
        patient_phone.trim()
      );
    }
    const depositAmount = branch ? branch.deposit_amount : 150;
    const appStatus = payment_status === "verified" || payment_status === "exempted" ? "confirmed" : "pending_review";
    db.prepare(`
      INSERT INTO appointments (
        id, reference_number, branch_id, patient_id, patient_name, patient_phone,
        appointment_date, slot_time, service_name, deposit_amount, deposit_status,
        status, notes, is_walkin, payment_method
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `).run(
      appointmentId,
      referenceNumber,
      effectiveBranchId,
      patientId,
      patient_name.trim(),
      patient_phone.trim(),
      appointment_date,
      slot_time,
      service_name || "\u0643\u0634\u0641 \u0645\u0628\u0627\u0634\u0631 \u0628\u0627\u0644\u0639\u064A\u0627\u062F\u0629",
      depositAmount,
      payment_status,
      appStatus,
      notes || "\u062A\u0645 \u0625\u0636\u0627\u0641\u062A\u0647 \u0628\u0648\u0627\u0633\u0637\u0629 \u0627\u0644\u0633\u0643\u0631\u062A\u0627\u0631\u064A\u0629 (\u062D\u062C\u0632 \u0645\u0628\u0627\u0634\u0631 / \u062A\u0644\u064A\u0641\u0648\u0646\u064A)",
      payment_method
    );
    logAudit({
      userId: req.user.id,
      userRole: req.user.role,
      userName: req.user.full_name,
      action: "WALKIN_BOOKING_CREATED",
      entityType: "appointment",
      entityId: appointmentId,
      details: { referenceNumber, appointment_date, slot_time, patient_name, payment_status }
    });
    res.status(201).json({
      success: true,
      reference_number: referenceNumber,
      message: "\u062A\u0645 \u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u062D\u062C\u0632 \u0627\u0644\u0645\u0628\u0627\u0634\u0631 \u0628\u0646\u062C\u0627\u062D \u0648\u062A\u0623\u0643\u064A\u062F\u0647 \u0641\u064A \u0627\u0644\u062C\u062F\u0648\u0644."
    });
  } catch (err) {
    res.status(500).json({ error: "\u062A\u0639\u0630\u0631 \u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u062D\u062C\u0632 \u0627\u0644\u0645\u0628\u0627\u0634\u0631" });
  }
});
apiRouter.post("/secretary/appointments/:id/reschedule", requireSecretary, (req, res) => {
  try {
    const appointmentId = req.params.id;
    const { new_date, new_time, new_branch_id, reason } = req.body;
    if (!new_date || !new_time) {
      res.status(400).json({ error: "\u064A\u0631\u062C\u0649 \u062A\u062D\u062F\u064A\u062F \u0627\u0644\u062A\u0627\u0631\u064A\u062E \u0648\u0627\u0644\u0648\u0642\u062A \u0627\u0644\u062C\u062F\u064A\u062F\u064A\u0646" });
      return;
    }
    const app = db.prepare("SELECT * FROM appointments WHERE id = ?").get(appointmentId);
    if (!app) {
      res.status(404).json({ error: "\u0627\u0644\u062D\u062C\u0632 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      return;
    }
    const effectiveBranchId = new_branch_id || app.branch_id;
    const collision = db.prepare(`
      SELECT COUNT(*) as count 
      FROM appointments 
      WHERE branch_id = ? AND appointment_date = ? AND slot_time = ? AND id != ? AND status NOT IN ('rejected', 'cancelled')
    `).get(effectiveBranchId, new_date, new_time, appointmentId);
    if (collision.count >= 1) {
      res.status(409).json({ error: "\u0627\u0644\u062A\u0648\u0642\u064A\u062A \u0627\u0644\u0645\u062E\u062A\u0627\u0631 \u0645\u062D\u062C\u0648\u0632 \u0645\u0633\u0628\u0642\u0627\u064B\u060C \u064A\u0631\u062C\u0649 \u0627\u062E\u062A\u064A\u0627\u0631 \u0633\u0627\u0639\u0629 \u0623\u062E\u0631\u0649" });
      return;
    }
    const oldDetails = `${app.appointment_date} (${app.slot_time})`;
    const updatedNotes = app.notes ? `${app.notes} | \u062A\u0645 \u0627\u0644\u062A\u0623\u062C\u064A\u0644 \u0645\u0646: ${oldDetails} - \u0627\u0644\u0633\u0628\u0628: ${reason || "\u0628\u0637\u0644\u0628 \u0627\u0644\u0645\u0631\u064A\u0636"}` : `\u062A\u0645 \u0627\u0644\u062A\u0623\u062C\u064A\u0644 \u0645\u0646: ${oldDetails} - \u0627\u0644\u0633\u0628\u0628: ${reason || "\u0628\u0637\u0644\u0628 \u0627\u0644\u0645\u0631\u064A\u0636"}`;
    db.prepare(`
      UPDATE appointments 
      SET branch_id = ?, appointment_date = ?, slot_time = ?, 
          rescheduled_from = ?, rescheduled_at = CURRENT_TIMESTAMP, notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(effectiveBranchId, new_date, new_time, oldDetails, updatedNotes, appointmentId);
    logAudit({
      userId: req.user.id,
      userRole: req.user.role,
      userName: req.user.full_name,
      action: "APPOINTMENT_RESCHEDULED",
      entityType: "appointment",
      entityId: appointmentId,
      details: { referenceNumber: app.reference_number, oldDate: app.appointment_date, newDate: new_date, newTime: new_time, reason }
    });
    res.json({ success: true, message: "\u062A\u0645 \u062A\u0639\u062F\u064A\u0644 \u0645\u0648\u0639\u062F \u0627\u0644\u062D\u062C\u0632 \u0628\u0646\u062C\u0627\u062D \u0648\u062A\u062D\u062F\u064A\u062B \u0627\u0644\u062C\u062F\u0648\u0644" });
  } catch (err) {
    res.status(500).json({ error: "\u062A\u0639\u0630\u0631 \u062A\u0639\u062F\u064A\u0644 \u0645\u0648\u0639\u062F \u0627\u0644\u062D\u062C\u0632" });
  }
});
apiRouter.post("/secretary/appointments/:id/review-payment", requireSecretary, (req, res) => {
  try {
    const appointmentId = req.params.id;
    const { decision, reason } = req.body;
    const app = db.prepare("SELECT * FROM appointments WHERE id = ?").get(appointmentId);
    if (!app) {
      res.status(404).json({ error: "\u0627\u0644\u062D\u062C\u0632 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      return;
    }
    const newDepositStatus = decision === "verified" ? "verified" : "rejected";
    const newBookingStatus = decision === "verified" ? "confirmed" : "rejected";
    db.prepare(`
      UPDATE appointments 
      SET deposit_status = ?, status = ?, rejection_reason = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(newDepositStatus, newBookingStatus, reason || null, appointmentId);
    db.prepare(`
      INSERT INTO booking_payment_reviews (id, appointment_id, reviewer_id, reviewer_name, reviewer_role, decision, reason)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      "rev_" + crypto3.randomUUID(),
      appointmentId,
      req.user.id,
      req.user.full_name,
      req.user.role,
      decision,
      reason || null
    );
    logAudit({
      userId: req.user.id,
      userRole: req.user.role,
      userName: req.user.full_name,
      action: decision === "verified" ? "DEPOSIT_APPROVED" : "DEPOSIT_REJECTED",
      entityType: "appointment",
      entityId: appointmentId,
      details: { decision, reason, referenceNumber: app.reference_number }
    });
    res.json({ success: true, status: newBookingStatus, deposit_status: newDepositStatus });
  } catch (err) {
    res.status(500).json({ error: "\u062A\u0639\u0630\u0631 \u0645\u0631\u0627\u062C\u0639\u0629 \u0627\u0644\u062F\u0641\u0639" });
  }
});
apiRouter.post("/secretary/appointments/:id/revert-payment", requireSecretary, (req, res) => {
  try {
    const appointmentId = req.params.id;
    const { target_status = "pending_review", reason } = req.body;
    const app = db.prepare("SELECT * FROM appointments WHERE id = ?").get(appointmentId);
    if (!app) {
      res.status(404).json({ error: "\u0627\u0644\u062D\u062C\u0632 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      return;
    }
    const newDepositStatus = target_status === "rejected" ? "rejected" : "pending_verification";
    db.prepare(`
      UPDATE appointments 
      SET deposit_status = ?, status = ?, rejection_reason = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(newDepositStatus, target_status, reason || "\u062A\u0631\u0627\u062C\u0639 \u0639\u0646 \u0627\u0644\u0627\u0639\u062A\u0645\u0627\u062F \u0645\u0646 \u0642\u0628\u0644 \u0627\u0644\u0633\u0643\u0631\u062A\u0627\u0631\u064A\u0629", appointmentId);
    db.prepare(`
      INSERT INTO booking_payment_reviews (id, appointment_id, reviewer_id, reviewer_name, reviewer_role, decision, reason)
      VALUES (?, ?, ?, ?, ?, 'reverted', ?)
    `).run(
      "rev_" + crypto3.randomUUID(),
      appointmentId,
      req.user.id,
      req.user.full_name,
      req.user.role,
      reason || "\u062A\u0631\u0627\u062C\u0639 \u0639\u0646 \u0627\u0644\u0627\u0639\u062A\u0645\u0627\u062F \u0627\u0644\u0633\u0627\u0628\u0642"
    );
    logAudit({
      userId: req.user.id,
      userRole: req.user.role,
      userName: req.user.full_name,
      action: "PAYMENT_APPROVAL_REVERTED",
      entityType: "appointment",
      entityId: appointmentId,
      details: { referenceNumber: app.reference_number, target_status, reason }
    });
    res.json({ success: true, message: "\u062A\u0645 \u0627\u0644\u062A\u0631\u0627\u062C\u0639 \u0639\u0646 \u0627\u0644\u0627\u0639\u062A\u0645\u0627\u062F \u0648\u062A\u062D\u062F\u064A\u062B \u062D\u0627\u0644\u0629 \u0627\u0644\u062D\u062C\u0632 \u0628\u0646\u062C\u0627\u062D" });
  } catch (err) {
    res.status(500).json({ error: "\u062A\u0639\u0630\u0631 \u0627\u0644\u062A\u0631\u0627\u062C\u0639 \u0639\u0646 \u0627\u0644\u0627\u0639\u062A\u0645\u0627\u062F" });
  }
});
apiRouter.post("/secretary/appointments/:id/check-in", requireSecretary, (req, res) => {
  try {
    const appointmentId = req.params.id;
    db.prepare("UPDATE appointments SET check_in_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(appointmentId);
    res.json({ success: true, message: "\u062A\u0645 \u062A\u0633\u062C\u064A\u0644 \u062D\u0636\u0648\u0631 \u0627\u0644\u0645\u0631\u064A\u0636 \u0628\u0627\u0644\u0639\u064A\u0627\u062F\u0629" });
  } catch (err) {
    res.status(500).json({ error: "\u062A\u0639\u0630\u0631 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062D\u0636\u0648\u0631" });
  }
});
apiRouter.post("/secretary/appointments/:id/complete", requireSecretary, (req, res) => {
  try {
    const appointmentId = req.params.id;
    db.prepare("UPDATE appointments SET status = 'completed', completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(appointmentId);
    res.json({ success: true, message: "\u062A\u0645 \u0625\u0646\u0647\u0627\u0621 \u0627\u0644\u0643\u0634\u0641 \u0628\u0646\u062C\u0627\u062D" });
  } catch (err) {
    res.status(500).json({ error: "\u062A\u0639\u0630\u0631 \u062A\u062D\u062F\u064A\u062B \u062D\u0627\u0644\u0629 \u0627\u0644\u0643\u0634\u0641" });
  }
});
apiRouter.get("/doctor/dashboard", requireDoctor, (req, res) => {
  try {
    const { todayStr } = getCairoDateInfo();
    const financialStats = db.prepare(`
      SELECT 
        COALESCE(SUM(total_amount), 0) as total_billed,
        COALESCE(SUM(paid_amount), 0) as total_collected,
        COALESCE(SUM(remaining_balance), 0) as total_receivables,
        COALESCE(SUM(deposit_deducted), 0) as total_deposits_deducted
      FROM invoices
    `).get();
    const totalDepositsCollected = db.prepare(`
      SELECT COALESCE(SUM(deposit_amount), 0) as sum 
      FROM appointments 
      WHERE deposit_status = 'verified'
    `).get()?.sum || 0;
    const totalPatients = db.prepare("SELECT COUNT(*) as count FROM patients").get()?.count || 0;
    const totalAppointments = db.prepare("SELECT COUNT(*) as count FROM appointments").get()?.count || 0;
    const completedAppointments = db.prepare("SELECT COUNT(*) as count FROM appointments WHERE status = 'completed'").get()?.count || 0;
    const cancelledAppointments = db.prepare("SELECT COUNT(*) as count FROM appointments WHERE status IN ('cancelled', 'rejected')").get()?.count || 0;
    const branches = db.prepare(`
      SELECT b.id, b.name_ar, b.city, b.deposit_amount, b.instapay_phone,
             COUNT(a.id) as total_bookings,
             COALESCE(SUM(CASE WHEN a.deposit_status = 'verified' THEN a.deposit_amount ELSE 0 END), 0) as branch_deposits
      FROM branches b
      LEFT JOIN appointments a ON b.id = a.branch_id
      GROUP BY b.id
    `).all();
    const todayAppointments = db.prepare(`
      SELECT a.*, p.medical_notes, p.allergies, p.chronic_diseases
      FROM appointments a
      LEFT JOIN patients p ON a.patient_id = p.id
      WHERE a.appointment_date = ? AND a.status IN ('confirmed', 'pending_review', 'completed')
      ORDER BY a.slot_time ASC
    `).all(todayStr);
    res.json({
      today: todayStr,
      kpis: {
        total_billed: financialStats.total_billed,
        total_collected: financialStats.total_collected,
        total_receivables: financialStats.total_receivables,
        total_deposits_collected: totalDepositsCollected,
        total_deposits_deducted: financialStats.total_deposits_deducted,
        total_patients: totalPatients,
        total_appointments: totalAppointments,
        completed_appointments: completedAppointments,
        cancelled_appointments: cancelledAppointments
      },
      branches,
      today_schedule: todayAppointments
    });
  } catch (err) {
    res.status(500).json({ error: "\u062A\u0639\u0630\u0631 \u062C\u0644\u0628 \u062A\u062D\u0644\u064A\u0644\u0627\u062A \u0644\u0648\u062D\u0629 \u0627\u0644\u062F\u0643\u062A\u0648\u0631" });
  }
});
apiRouter.put("/doctor/branches/:id/deposit-policy", requireDoctor, (req, res) => {
  try {
    const branchId = req.params.id;
    const { deposit_amount, instapay_phone } = req.body;
    const amount = parseFloat(deposit_amount);
    if (isNaN(amount) || amount < 0) {
      res.status(400).json({ error: "\u064A\u0631\u062C\u0649 \u0625\u062F\u062E\u0627\u0644 \u0645\u0628\u0644\u063A \u0639\u0631\u0628\u0648\u0646 \u0635\u062D\u064A\u062D" });
      return;
    }
    db.prepare(`
      UPDATE branches 
      SET deposit_amount = ?, instapay_phone = COALESCE(?, instapay_phone)
      WHERE id = ?
    `).run(amount, instapay_phone ? String(instapay_phone).trim() : null, branchId);
    logAudit({
      userId: req.user.id,
      userRole: req.user.role,
      userName: req.user.full_name,
      action: "BRANCH_DEPOSIT_POLICY_UPDATED",
      entityType: "branch",
      entityId: branchId,
      details: { deposit_amount: amount, instapay_phone }
    });
    res.json({ success: true, message: "\u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0633\u064A\u0627\u0633\u0629 \u0648\u0642\u064A\u0645\u0629 \u0627\u0644\u0639\u0631\u0628\u0648\u0646 \u0648\u0631\u0642\u0645 InstaPay \u0644\u0644\u0641\u0631\u0639 \u0628\u0646\u062C\u0627\u062D" });
  } catch (err) {
    res.status(500).json({ error: "\u062A\u0639\u0630\u0631 \u062A\u062D\u062F\u064A\u062B \u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0627\u0644\u0639\u0631\u0628\u0648\u0646 \u0644\u0644\u0641\u0631\u0639" });
  }
});
apiRouter.get("/doctor/patients", requireDoctor, (req, res) => {
  try {
    const { search } = req.query;
    let query = `
      SELECT p.*, 
        COUNT(DISTINCT a.id) as visit_count,
        COALESCE(SUM(i.total_amount), 0) as total_billed,
        COALESCE(SUM(i.paid_amount), 0) as total_paid,
        COALESCE(SUM(i.remaining_balance), 0) as current_balance
      FROM patients p
      LEFT JOIN appointments a ON p.id = a.patient_id
      LEFT JOIN invoices i ON p.id = i.patient_id
    `;
    const params = [];
    if (search) {
      query += " WHERE (p.full_name LIKE ? OR p.phone LIKE ? OR p.id LIKE ?)";
      const term = `%${search}%`;
      params.push(term, term, term);
    }
    query += " GROUP BY p.id ORDER BY p.created_at DESC";
    const patients = db.prepare(query).all(...params);
    res.json({ patients });
  } catch (err) {
    res.status(500).json({ error: "\u062A\u0639\u0630\u0631 \u0627\u0633\u062A\u0631\u062C\u0627\u0639 \u0645\u0644\u0641\u0627\u062A \u0627\u0644\u0645\u0631\u0636\u0649" });
  }
});
apiRouter.get("/doctor/patients/:id", requireDoctor, (req, res) => {
  try {
    const patientId = req.params.id;
    const patient = db.prepare("SELECT * FROM patients WHERE id = ?").get(patientId);
    if (!patient) {
      res.status(404).json({ error: "\u0627\u0644\u0645\u0644\u0641 \u0627\u0644\u0637\u0628\u064A \u0644\u0644\u0645\u0631\u064A\u0636 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      return;
    }
    const visits = db.prepare("SELECT * FROM appointments WHERE patient_id = ? ORDER BY appointment_date DESC").all(patientId);
    const invoices = db.prepare("SELECT * FROM invoices WHERE patient_id = ? ORDER BY created_at DESC").all(patientId);
    const odontogram = db.prepare("SELECT tooth_number, condition, notes, updated_at FROM patient_odontogram WHERE patient_id = ? ORDER BY tooth_number ASC").all(patientId);
    res.json({
      patient,
      visits,
      invoices,
      odontogram
    });
  } catch (err) {
    res.status(500).json({ error: "\u062A\u0639\u0630\u0631 \u0627\u0633\u062A\u0631\u062C\u0627\u0639 \u0645\u0644\u0641 \u0627\u0644\u0645\u0631\u064A\u0636" });
  }
});
apiRouter.post("/doctor/patients/:id/odontogram", requireDoctor, (req, res) => {
  try {
    const patientId = req.params.id;
    const { tooth_number, condition, notes } = req.body;
    const toothNum = parseInt(tooth_number, 10);
    if (isNaN(toothNum) || toothNum < 1 || toothNum > 32) {
      res.status(400).json({ error: "\u0631\u0642\u0645 \u0627\u0644\u0633\u0646 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D (\u064A\u062C\u0628 \u0623\u0646 \u064A\u0643\u0648\u0646 \u0628\u064A\u0646 1 \u0648 32)" });
      return;
    }
    const validConditions = ["healthy", "caries", "filling", "rct", "extracted", "crown", "implant"];
    if (!validConditions.includes(condition)) {
      res.status(400).json({ error: "\u062D\u0627\u0644\u0629 \u0627\u0644\u0633\u0646 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D\u0629" });
      return;
    }
    db.prepare(`
      INSERT INTO patient_odontogram (id, patient_id, tooth_number, condition, notes, updated_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(patient_id, tooth_number) DO UPDATE SET
        condition = excluded.condition,
        notes = excluded.notes,
        updated_at = CURRENT_TIMESTAMP
    `).run(
      "od_" + crypto3.randomUUID(),
      patientId,
      toothNum,
      condition,
      notes || null
    );
    logAudit({
      userId: req.user.id,
      userRole: req.user.role,
      userName: req.user.full_name,
      action: "ODONTOGRAM_TOOTH_UPDATED",
      entityType: "odontogram",
      entityId: `${patientId}_tooth_${toothNum}`,
      details: { tooth_number: toothNum, condition, notes }
    });
    res.json({ success: true, message: `\u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0633\u0646 \u0631\u0642\u0645 ${toothNum} \u0625\u0644\u0649 \u062D\u0627\u0644\u0629 (${condition})` });
  } catch (err) {
    res.status(500).json({ error: "\u062A\u0639\u0630\u0631 \u062A\u062D\u062F\u064A\u062B \u0645\u062E\u0637\u0637 \u0627\u0644\u0623\u0633\u0646\u0627\u0646" });
  }
});
apiRouter.post("/doctor/invoices", requireDoctor, (req, res) => {
  try {
    const {
      patient_id,
      appointment_id,
      branch_id,
      items,
      deposit_deducted = 0,
      initial_payment_amount = 0,
      initial_payment_method = "cash",
      notes
    } = req.body;
    if (!patient_id) {
      res.status(400).json({ error: "\u064A\u0631\u062C\u0649 \u062A\u062D\u062F\u064A\u062F \u0627\u0644\u0645\u0631\u064A\u0636" });
      return;
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: "\u064A\u0631\u062C\u0649 \u0625\u0636\u0627\u0641\u0629 \u062E\u062F\u0645\u0629 \u0623\u0648 \u0625\u062C\u0631\u0627\u0621 \u0639\u0644\u0627\u062C\u064A \u0648\u0627\u062D\u062F \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644" });
      return;
    }
    let subtotal = 0;
    let totalDiscount = 0;
    const validatedItems = items.map((it) => {
      const qty = Math.max(1, parseInt(it.quantity, 10) || 1);
      const price = Math.max(0, parseFloat(it.unit_price) || 0);
      const disc = Math.max(0, parseFloat(it.discount) || 0);
      const lineTotal = Math.max(0, qty * price - disc);
      subtotal += qty * price;
      totalDiscount += disc;
      return {
        service_id: it.service_id || null,
        service_name: String(it.service_name || "\u062E\u062F\u0645\u0629 \u0639\u0644\u0627\u062C\u064A\u0629 \u0645\u062E\u0635\u0635\u0629").trim(),
        quantity: qty,
        unit_price: price,
        discount: disc,
        total: lineTotal
      };
    });
    const parsedDepositDeducted = Math.max(0, parseFloat(deposit_deducted) || 0);
    const totalAmount = Math.max(0, subtotal - totalDiscount - parsedDepositDeducted);
    const initialPaid = Math.min(totalAmount, Math.max(0, parseFloat(initial_payment_amount) || 0));
    const remainingBalance = Math.max(0, totalAmount - initialPaid);
    const status = remainingBalance === 0 ? "paid" : initialPaid > 0 ? "partial" : "unpaid";
    const invoiceId = "inv_" + crypto3.randomUUID();
    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
    db.prepare(`
      INSERT INTO invoices (
        id, invoice_number, patient_id, appointment_id, branch_id, subtotal, total_discount,
        deposit_deducted, total_amount, paid_amount, remaining_balance, status, notes, created_by_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      invoiceId,
      invoiceNumber,
      patient_id,
      appointment_id || null,
      branch_id || null,
      subtotal,
      totalDiscount,
      parsedDepositDeducted,
      totalAmount,
      initialPaid,
      remainingBalance,
      status,
      notes || null,
      req.user.id
    );
    const insertItem = db.prepare(`
      INSERT INTO invoice_items (id, invoice_id, service_id, service_name, quantity, unit_price, discount, total)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const it of validatedItems) {
      insertItem.run(
        "item_" + crypto3.randomUUID(),
        invoiceId,
        it.service_id,
        it.service_name,
        it.quantity,
        it.unit_price,
        it.discount,
        it.total
      );
    }
    if (initialPaid > 0) {
      db.prepare(`
        INSERT INTO payments (id, invoice_id, patient_id, amount, payment_method, notes, recorded_by_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        "pay_" + crypto3.randomUUID(),
        invoiceId,
        patient_id,
        initialPaid,
        initial_payment_method,
        "\u0633\u062F\u0627\u062F \u062F\u0641\u0639\u0629 \u0641\u0648\u0631\u064A\u0629 \u0645\u0639 \u0625\u0635\u062F\u0627\u0631 \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629",
        req.user.id
      );
    }
    queueSyncItem({
      entityType: "financial",
      entityId: invoiceId,
      targetSheet: "invoices",
      payload: {
        invoice_number: invoiceNumber,
        patient_id,
        subtotal,
        total_discount: totalDiscount,
        deposit_deducted: parsedDepositDeducted,
        total_amount: totalAmount,
        paid_amount: initialPaid,
        remaining_balance: remainingBalance,
        status
      }
    });
    logAudit({
      userId: req.user.id,
      userRole: req.user.role,
      userName: req.user.full_name,
      action: "INVOICE_CREATED",
      entityType: "invoice",
      entityId: invoiceId,
      details: { invoiceNumber, totalAmount, paidAmount: initialPaid, depositDeducted: parsedDepositDeducted }
    });
    res.status(201).json({
      success: true,
      invoice_id: invoiceId,
      invoice_number: invoiceNumber,
      total_amount: totalAmount,
      paid_amount: initialPaid,
      remaining_balance: remainingBalance,
      status
    });
  } catch (err) {
    console.error("Invoice creation error:", err);
    res.status(500).json({ error: "\u062A\u0639\u0630\u0631 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629 \u0627\u0644\u0639\u0644\u0627\u062C\u064A\u0629" });
  }
});
apiRouter.get("/doctor/invoices", requireDoctor, (req, res) => {
  try {
    const invoices = db.prepare(`
      SELECT i.*, p.full_name as patient_name, p.phone as patient_phone, b.name_ar as branch_name, a.reference_number as booking_ref
      FROM invoices i
      JOIN patients p ON i.patient_id = p.id
      LEFT JOIN branches b ON i.branch_id = b.id
      LEFT JOIN appointments a ON i.appointment_id = a.id
      ORDER BY i.created_at DESC
    `).all();
    res.json({ invoices });
  } catch (err) {
    res.status(500).json({ error: "\u062A\u0639\u0630\u0631 \u062C\u0644\u0628 \u0627\u0644\u0641\u0648\u0627\u062A\u064A\u0631" });
  }
});
apiRouter.get("/doctor/revisit-codes", requireDoctor, (req, res) => {
  try {
    const codes = db.prepare(`
      SELECT r.*, p.full_name as patient_name, p.phone as patient_phone
      FROM revisit_codes r
      LEFT JOIN patients p ON r.patient_id = p.id
      ORDER BY r.created_at DESC
    `).all();
    res.json({ revisit_codes: codes });
  } catch (err) {
    res.status(500).json({ error: "\u062A\u0639\u0630\u0631 \u062C\u0644\u0628 \u0623\u0643\u0648\u0627\u062F \u0627\u0644\u0625\u0639\u0627\u062F\u0629" });
  }
});
apiRouter.post("/doctor/revisit-codes", requireDoctor, (req, res) => {
  try {
    const {
      patient_id,
      discount_type = "full_exemption",
      fee_amount = 0,
      max_uses = 1,
      expires_in_days = 30,
      custom_code
    } = req.body;
    const randomStr = crypto3.randomBytes(3).toString("hex").toUpperCase();
    const code = custom_code && custom_code.trim() ? custom_code.trim().toUpperCase() : `REV-${randomStr}`;
    const codeId = "rev_" + crypto3.randomUUID();
    const expDate = /* @__PURE__ */ new Date();
    expDate.setDate(expDate.getDate() + (parseInt(expires_in_days, 10) || 30));
    const expiresAt = expDate.toISOString().split("T")[0];
    db.prepare(`
      INSERT INTO revisit_codes (
        id, code, patient_id, discount_type, fee_amount, max_uses, used_count, expires_at, created_by_id
      ) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)
    `).run(
      codeId,
      code,
      patient_id || null,
      discount_type,
      discount_type === "full_exemption" ? 0 : parseFloat(fee_amount) || 0,
      Math.max(1, parseInt(max_uses, 10) || 1),
      expiresAt,
      req.user.id
    );
    logAudit({
      userId: req.user.id,
      userRole: req.user.role,
      userName: req.user.full_name,
      action: "REVISIT_CODE_GENERATED",
      entityType: "revisit_code",
      entityId: codeId,
      details: { code, patient_id, discount_type, fee_amount, max_uses }
    });
    res.status(201).json({
      success: true,
      code,
      expires_at: expiresAt,
      message: `\u062A\u0645 \u062A\u0648\u0644\u064A\u062F \u0643\u0648\u062F \u0627\u0644\u0625\u0639\u0627\u062F\u0629 \u0628\u0646\u062C\u0627\u062D: ${code}`
    });
  } catch (err) {
    res.status(500).json({ error: "\u062A\u0639\u0630\u0631 \u0625\u0646\u0634\u0627\u0621 \u0643\u0648\u062F \u0627\u0644\u0625\u0639\u0627\u062F\u0629" });
  }
});
apiRouter.post("/doctor/revisit-codes/:id/cancel", requireDoctor, (req, res) => {
  try {
    const codeId = req.params.id;
    db.prepare("DELETE FROM revisit_codes WHERE id = ?").run(codeId);
    res.json({ success: true, message: "\u062A\u0645 \u0625\u0644\u063A\u0627\u0621 \u0627\u0644\u0643\u0648\u062F \u0628\u0646\u062C\u0627\u062D" });
  } catch (err) {
    res.status(500).json({ error: "\u062A\u0639\u0630\u0631 \u0625\u0644\u063A\u0627\u0621 \u0627\u0644\u0643\u0648\u062F" });
  }
});
apiRouter.get("/doctor/sheets-sync", requireDoctor, (req, res) => {
  try {
    const config = getSheetsConfig();
    const pendingCount = db.prepare("SELECT COUNT(*) as count FROM sync_outbox WHERE status = 'pending'").get()?.count || 0;
    const syncedCount = db.prepare("SELECT COUNT(*) as count FROM sync_outbox WHERE status = 'synced'").get()?.count || 0;
    const failedCount = db.prepare("SELECT COUNT(*) as count FROM sync_outbox WHERE status = 'failed'").get()?.count || 0;
    const recentOutbox = db.prepare("SELECT * FROM sync_outbox ORDER BY created_at DESC LIMIT 30").all();
    res.json({
      config,
      stats: {
        pending: pendingCount,
        synced: syncedCount,
        failed: failedCount,
        total: pendingCount + syncedCount + failedCount
      },
      recent_outbox: recentOutbox
    });
  } catch (err) {
    res.status(500).json({ error: "\u062A\u0639\u0630\u0631 \u0627\u0633\u062A\u0631\u062C\u0627\u0639 \u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0627\u0644\u0645\u0632\u0627\u0645\u0646\u0629" });
  }
});
apiRouter.post("/doctor/sheets-sync/config", requireDoctor, (req, res) => {
  try {
    const { spreadsheet_url, service_account_email } = req.body;
    const extractedId = extractSpreadsheetId(spreadsheet_url);
    const config = {
      spreadsheet_url: spreadsheet_url || "",
      spreadsheet_id: extractedId,
      service_account_email: service_account_email || "clinic-sync@drsabra-dental.iam.gserviceaccount.com",
      auto_sync_enabled: true,
      last_sync: (/* @__PURE__ */ new Date()).toISOString()
    };
    updateSheetsConfig(config);
    logAudit({
      userId: req.user.id,
      userRole: req.user.role,
      userName: req.user.full_name,
      action: "GOOGLE_SHEETS_CONFIG_UPDATED",
      entityType: "settings",
      details: { spreadsheet_id: extractedId }
    });
    res.json({
      success: true,
      spreadsheet_id: extractedId,
      message: `\u062A\u0645 \u0631\u0628\u0637 \u0648\u062A\u062D\u062F\u064A\u062B \u0625\u0639\u062F\u0627\u062F\u0627\u062A Google Sheets \u0628\u0646\u062C\u0627\u062D! \u0627\u0644\u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u0633\u062A\u062E\u0631\u062C: ${extractedId}`
    });
  } catch (err) {
    res.status(500).json({ error: "\u062A\u0639\u0630\u0631 \u062D\u0641\u0638 \u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0627\u0644\u0634\u064A\u062A" });
  }
});
apiRouter.post("/doctor/sheets-sync/trigger", requireDoctor, async (req, res) => {
  try {
    const result = await processOutboxSync();
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062A\u0646\u0641\u064A\u0630 \u0627\u0644\u0645\u0632\u0627\u0645\u0646\u0629" });
  }
});
apiRouter.get("/doctor/export-csv/:tab", requireDoctor, (req, res) => {
  try {
    const tab = req.params.tab;
    let csvData = "";
    let fileName = "export.csv";
    if (tab === "appointments") {
      csvData = exportAppointmentsCSV();
      fileName = "Appointments_Schedule.csv";
    } else if (tab === "invoices") {
      csvData = exportInvoicesCSV();
      fileName = "Invoices_Ledger.csv";
    } else if (tab === "patients") {
      csvData = exportPatientsCSV();
      fileName = "Patients_Directory.csv";
    } else {
      csvData = exportAppointmentsCSV();
      fileName = "Clinic_Data.csv";
    }
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.send(csvData);
  } catch (err) {
    res.status(500).send("\u062A\u0639\u0630\u0631 \u062A\u0648\u0644\u064A\u062F \u0645\u0644\u0641 CSV");
  }
});
apiRouter.get("/doctor/audit-logs", requireDoctor, (req, res) => {
  try {
    const logs = db.prepare("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100").all();
    res.json({ audit_logs: logs });
  } catch (err) {
    res.status(500).json({ error: "\u062A\u0639\u0630\u0631 \u0627\u0633\u062A\u0631\u062C\u0627\u0639 \u0633\u062C\u0644 \u0627\u0644\u0639\u0645\u0644\u064A\u0627\u062A" });
  }
});
apiRouter.get("/doctor/backup", requireDoctor, (req, res) => {
  try {
    const tables = ["branches", "users", "patients", "patient_odontogram", "services", "appointments", "invoices", "invoice_items", "payments", "revisit_codes", "system_settings", "audit_logs"];
    const backup = {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      platform: "Dr. Mohamed Sabra Elnaggar Dental Clinic & PMS Platform"
    };
    for (const t of tables) {
      if (t === "users") {
        backup[t] = db.prepare("SELECT id, username, full_name, role, phone, is_active, created_at FROM users").all();
      } else {
        backup[t] = db.prepare(`SELECT * FROM ${t}`).all();
      }
    }
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="Clinic_Backup_${Date.now()}.json"`);
    res.send(JSON.stringify(backup, null, 2));
  } catch (err) {
    res.status(500).json({ error: "\u062A\u0639\u0630\u0631 \u062A\u0635\u062F\u064A\u0631 \u0627\u0644\u0646\u0633\u062E\u0629 \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0637\u064A\u0629" });
  }
});
apiRouter.get("/doctor/download-db", requireDoctor, (req, res) => {
  try {
    const dbFilePath = path2.join(DATA_DIR, "clinic.db");
    if (!fs2.existsSync(dbFilePath)) {
      return res.status(404).send("\u0645\u0644\u0641 \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F \u0628\u0639\u062F \u0639\u0644\u0649 \u0627\u0644\u062E\u0627\u062F\u0645");
    }
    res.download(dbFilePath, "clinic.db");
  } catch (err) {
    res.status(500).send("\u062A\u0639\u0630\u0631 \u062A\u0646\u0632\u064A\u0644 \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A");
  }
});
apiRouter.get("/doctor/download-sql", requireDoctor, (req, res) => {
  try {
    let sqlFilePath = path2.join(APP_ROOT, "database.sql");
    if (!fs2.existsSync(sqlFilePath)) {
      sqlFilePath = path2.join(APP_ROOT, "data", "database.sql");
    }
    if (!fs2.existsSync(sqlFilePath)) {
      return res.status(404).send("\u0645\u0644\u0641 database.sql \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F");
    }
    res.download(sqlFilePath, "database.sql");
  } catch (err) {
    res.status(500).send("\u062A\u0639\u0630\u0631 \u062A\u0646\u0632\u064A\u0644 \u0645\u0644\u0641 SQL");
  }
});
apiRouter.get("/doctor/settings", requireDoctor, (req, res) => {
  try {
    const rows = db.prepare("SELECT key, value_json FROM system_settings").all();
    const settings = {};
    for (const row of rows) {
      try {
        settings[row.key] = JSON.parse(row.value_json);
      } catch {
        settings[row.key] = row.value_json;
      }
    }
    res.json({ settings });
  } catch (err) {
    res.status(500).json({ error: "\u062A\u0639\u0630\u0631 \u062C\u0644\u0628 \u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0627\u0644\u0639\u064A\u0627\u062F\u0629" });
  }
});
apiRouter.put("/doctor/settings", requireDoctor, (req, res) => {
  try {
    const payload = req.body || {};
    const upsert = db.prepare(`
      INSERT INTO system_settings (key, value_json, updated_at) 
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = CURRENT_TIMESTAMP
    `);
    for (const [key, val] of Object.entries(payload)) {
      upsert.run(key, JSON.stringify(val));
    }
    logAudit({
      userId: req.user.id,
      userRole: req.user.role,
      userName: req.user.full_name,
      action: "SYSTEM_SETTINGS_UPDATED",
      entityType: "settings",
      details: payload
    });
    res.json({ success: true, message: "\u062A\u0645 \u062D\u0641\u0638 \u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0627\u0644\u0639\u064A\u0627\u062F\u0629 \u0628\u0646\u062C\u0627\u062D" });
  } catch (err) {
    res.status(500).json({ error: "\u062A\u0639\u0630\u0631 \u062D\u0641\u0638 \u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0627\u0644\u0639\u064A\u0627\u062F\u0629" });
  }
});

// server.ts
var __filename = fileURLToPath2(import.meta.url);
var __dirname = path3.dirname(__filename);
async function startServer() {
  initDatabase();
  const app = express();
  const PORT = process.env.PORT || 3e3;
  const distPath = path3.resolve(__dirname, "dist");
  const distExists = fs3.existsSync(path3.join(distPath, "index.html"));
  const isProd = process.env.NODE_ENV === "production" || distExists;
  app.set("trust proxy", 1);
  app.get("/healthz", (_req, res) => res.json({ ok: true }));
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use("/api", apiRouter);
  if (!isProd) {
    const { createServer } = await import("vite");
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path3.resolve(distPath, "index.html"));
    });
  }
  app.listen(PORT, () => {
    console.log(`Clinic server running on ${PORT}`);
  });
}
startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
