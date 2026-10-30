/**
 * REST API Routes for Dental Clinic & PMS Platform
 */
import { Router } from 'express';
import type { Request, Response } from 'express';
import { db, hashPassword, logAudit, APP_ROOT, DATA_DIR } from './db.ts';
import { authenticate, requireDoctor, requireSecretary, createToken } from './auth.ts';
import { 
  queueSyncItem, 
  processOutboxSync, 
  getSheetsConfig, 
  updateSheetsConfig,
  extractSpreadsheetId,
  exportAppointmentsCSV, 
  exportInvoicesCSV,
  exportPatientsCSV
} from './sheetsSync.ts';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const apiRouter = Router();

// Apply auth middleware to all API requests
apiRouter.use(authenticate);

// Helper to get Cairo date details
export function getCairoDateInfo() {
  const now = new Date();
  const cairoFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Cairo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const todayStr = cairoFormatter.format(now); // "YYYY-MM-DD"

  // Yesterday
  const yDate = new Date(todayStr + 'T12:00:00Z');
  yDate.setDate(yDate.getDate() - 1);
  const yesterdayStr = yDate.toISOString().split('T')[0];

  // Tomorrow
  const tDate = new Date(todayStr + 'T12:00:00Z');
  tDate.setDate(tDate.getDate() + 1);
  const tomorrowStr = tDate.toISOString().split('T')[0];
  
  // Compute allowed window for public booking: strictly next 4 calendar days (Day +1 to Day +4)
  const allowedDates: { dateStr: string; dayNameAr: string; isAllowed: boolean }[] = [];
  const arabicDayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

  const baseDate = new Date(todayStr + 'T12:00:00Z');
  for (let i = 1; i <= 4; i++) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const dayNameAr = arabicDayNames[d.getDay()];
    allowedDates.push({ dateStr, dayNameAr, isAllowed: true });
  }

  return { todayStr, yesterdayStr, tomorrowStr, allowedDates };
}

// ----------------------------------------------------
// PUBLIC ENDPOINTS
// ----------------------------------------------------

// 1. Clinic & Multi-Branch Info
apiRouter.get('/clinic-info', (req: Request, res: Response) => {
  try {
    const branches = db.prepare('SELECT * FROM branches WHERE is_active = 1 ORDER BY deposit_amount ASC').all() as any[];
    const services = db.prepare('SELECT * FROM services WHERE is_active = 1 ORDER BY base_price DESC').all() as any[];

    res.json({
      name_ar: 'عيادة د. محمد صبرة النجار لطب وجراحة الفم والأسنان وتقويم الأسنان',
      name_en: 'Dr. Mohamed Sabra Elnaggar Dental Clinic & PMS',
      specialty: 'أخصائي طب وجراحة الفم والأسنان — تقويم الأسنان',
      phone: '01093591193',
      facebook_url: 'https://www.facebook.com/Dr.SabraElnaggar/',
      branches,
      services,
      rating: {
        score: 4.8,
        reviews_count: 142,
        source: 'Google Verified Reviews'
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: 'تعذر جلب بيانات العيادة والفروع' });
  }
});

// 2. Available Slots Query
apiRouter.get('/available-slots', (req: Request, res: Response) => {
  try {
    const branchId = (req.query.branchId as string) || 'branch_dairab_negm';
    const dateQuery = req.query.date as string;

    const { todayStr, allowedDates } = getCairoDateInfo();

    if (dateQuery) {
      // Check branch
      const branch = db.prepare('SELECT * FROM branches WHERE id = ?').get(branchId) as any;
      if (!branch) {
        res.status(404).json({ error: 'الفرع المحدد غير موجود' });
        return;
      }

      // Check exceptions
      const exception = db.prepare('SELECT * FROM appointment_exceptions WHERE branch_id = ? AND exception_date = ?').get(branchId, dateQuery) as any;
      if (exception && exception.exception_type === 'closed_day') {
        res.json({
          date: dateQuery,
          branch,
          is_closed: true,
          closed_reason: exception.reason || 'يوم إجازة / مغلق بقرار الإدارة',
          slots: []
        });
        return;
      }

      const openTime = branch.daily_open_time || '14:00';
      const closeTime = branch.daily_close_time || '21:00';
      const slotDuration = branch.slot_duration_minutes || 30;
      const defaultCapacity = branch.slot_capacity || 1;

      // Generate time intervals
      const generatedTimes: string[] = [];
      const [startHour, startMin] = openTime.split(':').map(Number);
      const [endHour, endMin] = closeTime.split(':').map(Number);

      let current = startHour * 60 + startMin;
      const end = endHour * 60 + endMin;

      while (current < end) {
        const hh = String(Math.floor(current / 60)).padStart(2, '0');
        const mm = String(current % 60).padStart(2, '0');
        generatedTimes.push(`${hh}:${mm}`);
        current += slotDuration;
      }

      // Fetch custom slots & active bookings
      const customSlots = db.prepare('SELECT * FROM appointment_slots WHERE branch_id = ? AND slot_date = ?').all(branchId, dateQuery) as any[];
      const customSlotsMap = new Map(customSlots.map(s => [s.start_time, s]));

      const bookings = db.prepare(`
        SELECT slot_time, COUNT(*) as count 
        FROM appointments 
        WHERE branch_id = ? AND appointment_date = ? AND status NOT IN ('rejected', 'cancelled')
        GROUP BY slot_time
      `).all(branchId, dateQuery) as { slot_time: string; count: number }[];
      const bookingCountsMap = new Map(bookings.map(b => [b.slot_time, b.count]));

      const slots = generatedTimes.map(time => {
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
      timezone: 'Africa/Cairo',
      allowedDates
    });
  } catch (err: any) {
    res.status(500).json({ error: 'تعذر استرجاع المواعيد المتاحة' });
  }
});

// 3. Verify Revisit Code (Public & Atomic Check)
apiRouter.post('/revisit-codes/verify', (req: Request, res: Response) => {
  try {
    const { code, phone } = req.body;
    if (!code) {
      res.status(400).json({ error: 'يرجى إدخال كود الكشف أو الإعادة' });
      return;
    }

    const trimmedCode = String(code).trim().toUpperCase();
    const revisit = db.prepare(`
      SELECT r.*, p.full_name, p.phone as patient_phone
      FROM revisit_codes r
      LEFT JOIN patients p ON r.patient_id = p.id
      WHERE UPPER(r.code) = ?
    `).get(trimmedCode) as any;

    if (!revisit) {
      res.status(404).json({ error: 'كود الإعادة غير موجود، يرجى التحقق من الرمز' });
      return;
    }

    if (revisit.used_count >= revisit.max_uses) {
      res.status(400).json({ error: 'تم استنفاد الحد الأقصى لاستخدام هذا الكود' });
      return;
    }

    if (revisit.expires_at && new Date(revisit.expires_at) < new Date()) {
      res.status(400).json({ error: 'عذرًا، انتهت صلاحية هذا الكود' });
      return;
    }

    // If assigned to a specific patient with phone, verify match
    if (revisit.patient_id && revisit.patient_phone && phone) {
      const cleanInput = phone.replace(/\D/g, '');
      const cleanDb = revisit.patient_phone.replace(/\D/g, '');
      if (cleanInput && cleanDb && !cleanInput.endsWith(cleanDb.slice(-8))) {
        res.status(400).json({ error: 'كود الإعادة مخصص لرقم هاتف مختلف' });
        return;
      }
    }

    res.json({
      valid: true,
      discount_type: revisit.discount_type,
      fee_amount: revisit.fee_amount,
      payment_channel: revisit.payment_channel,
      message: revisit.discount_type === 'full_exemption' 
        ? 'تم التحقق بنجاح: كود إعفاء كامل من عربون الحجز (100% خصم)'
        : `تم التحقق بنجاح: رسوم حجز مخفضة بقيمة ${revisit.fee_amount} ج.م`
    });
  } catch (err: any) {
    res.status(500).json({ error: 'حدث خطأ أثناء فحص الكود' });
  }
});

// 4. Submit New Public Booking (Atomic Booking Wizard)
apiRouter.post('/bookings', (req: Request, res: Response) => {
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
      res.status(400).json({ error: 'يرجى إدخال الاسم الثلاثي بالكامل' });
      return;
    }

    if (!patient_phone || !/^(010|011|012|015)\d{8}$/.test(patient_phone.trim())) {
      res.status(400).json({ error: 'يرجى إدخال رقم هاتف مصري صحيح مكون من 11 رقماً' });
      return;
    }

    const { todayStr, allowedDates } = getCairoDateInfo();

    if (appointment_date === todayStr) {
      res.status(400).json({ error: 'يمنع حجز موعد في نفس اليوم إلكترونياً. الحجز متاح بدءاً من يوم الغد.' });
      return;
    }

    const isDateAllowed = allowedDates.some(d => d.dateStr === appointment_date);
    if (!isDateAllowed) {
      res.status(400).json({ error: 'تاريخ الموعد خارج نافذة الأيام الـ 4 المسموح بها للحجز.' });
      return;
    }

    if (!slot_time) {
      res.status(400).json({ error: 'يرجى اختيار وقت الموعد' });
      return;
    }

    const effectiveBranchId = branch_id || 'branch_dairab_negm';
    const branch = db.prepare('SELECT * FROM branches WHERE id = ?').get(effectiveBranchId) as any;
    if (!branch) {
      res.status(400).json({ error: 'الفرع المختار غير متاح' });
      return;
    }

    // Verify service_id if provided, else null to satisfy foreign key
    let validServiceId: string | null = null;
    let validServiceName = service_name || 'كشف واستشارة طبية متخصصة';
    if (service_id) {
      const srvCheck = db.prepare('SELECT id, name_ar FROM services WHERE id = ? OR code = ?').get(service_id, service_id) as any;
      if (srvCheck) {
        validServiceId = srvCheck.id;
        validServiceName = srvCheck.name_ar;
      }
    }

    // Check Revisit Code
    let verifiedRevisit: any = null;
    let isExempted = false;

    if (revisit_code && String(revisit_code).trim()) {
      const codeUpper = String(revisit_code).trim().toUpperCase();
      verifiedRevisit = db.prepare('SELECT * FROM revisit_codes WHERE UPPER(code) = ?').get(codeUpper) as any;

      if (!verifiedRevisit || verifiedRevisit.used_count >= verifiedRevisit.max_uses) {
        res.status(400).json({ error: 'كود الإعادة غير صالح أو تم استخدامه بالكامل' });
        return;
      }

      if (verifiedRevisit.expires_at && new Date(verifiedRevisit.expires_at) < new Date()) {
        res.status(400).json({ error: 'كود الإعادة منتهي الصلاحية' });
        return;
      }

      if (verifiedRevisit.discount_type === 'full_exemption') {
        isExempted = true;
      }
    }

    // If not exempted, require InstaPay info
    if (!isExempted && (!instapay_phone || instapay_phone.trim().length < 4)) {
      res.status(400).json({ error: 'يرجى إدخال رقم الهاتف المحول منه عبر InstaPay' });
      return;
    }

    const requiredDeposit = isExempted ? 0 : (verifiedRevisit ? verifiedRevisit.fee_amount : (branch.deposit_amount || 150));

    // Collision check
    const activeBookings = db.prepare(`
      SELECT COUNT(*) as count 
      FROM appointments 
      WHERE branch_id = ? AND appointment_date = ? AND slot_time = ? AND status NOT IN ('rejected', 'cancelled')
    `).get(effectiveBranchId, appointment_date, slot_time) as { count: number };

    if (activeBookings.count >= (branch.slot_capacity || 1)) {
      res.status(409).json({ error: 'عذراً، تم حجز هذه الفترة للتو من قبل مريض آخر. يرجى اختيار فترة زمنية أخرى.' });
      return;
    }

    // Generate unique reference (e.g. APT-20261028-4829)
    const dateCode = appointment_date.replace(/-/g, '');
    const randCode = Math.floor(1000 + Math.random() * 9000);
    const referenceNumber = `APT-${dateCode}-${randCode}`;
    const appointmentId = 'apt_' + crypto.randomUUID();

    // Patient lookup or create
    let patient = db.prepare('SELECT id FROM patients WHERE phone = ?').get(patient_phone.trim()) as { id: string } | undefined;
    let patientId = patient?.id;
    if (!patientId) {
      patientId = 'PT-' + Math.floor(1000 + Math.random() * 9000);
      db.prepare('INSERT INTO patients (id, full_name, phone) VALUES (?, ?, ?)').run(
        patientId,
        patient_name.trim(),
        patient_phone.trim()
      );
    }

    const initialStatus = isExempted ? 'confirmed' : 'pending_review';
    const initialDepositStatus = isExempted ? 'exempted' : 'pending_verification';

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

    // Increment used count on revisit code
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

    // Queue synchronization to Outbox (non-blocking)
    try {
      queueSyncItem({
        entityType: 'appointment',
        entityId: appointmentId,
        targetSheet: 'secretary',
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

      processOutboxSync().catch(err => console.error('Outbox sync error:', err));
    } catch (syncErr) {
      console.warn('Sync queue error:', syncErr);
    }

    logAudit({
      action: 'PUBLIC_BOOKING_CREATED',
      entityType: 'appointment',
      entityId: appointmentId,
      details: { referenceNumber, appointment_date, slot_time, branch: branch.name_ar, requiredDeposit }
    });

    const appointmentData = {
      id: appointmentId,
      reference_number: referenceNumber,
      appointment_date,
      slot_time,
      branch_name: branch.name_ar,
      branch_address: branch.address_ar || 'الشرقية - ديرب نجم - برج الفلسطيني - أمام الكنيسة - الدور الخامس',
      patient_name: patient_name.trim(),
      patient_phone: patient_phone.trim(),
      service_name: validServiceName,
      deposit_amount: requiredDeposit,
      deposit_status: initialDepositStatus,
      status: initialStatus,
      payment_type: isExempted ? 'revisit_code' : 'instapay',
      instapay_phone: instapay_phone ? instapay_phone.trim() : null,
      revisit_code: verifiedRevisit ? verifiedRevisit.code : null,
      notes: notes ? notes.trim() : '',
      created_at: new Date().toISOString()
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
      message: isExempted 
        ? 'تم اعتماد وتأكيد موعدك بنجاح بموجب كود الإعفاء المعتمد.'
        : 'تم استلام طلب الحجز بنجاح وهو الآن قيد المراجعة الفورية من السكرتارية. يرجى العلم أنه سيتم خصم كامل العربون تلقائياً من الفاتورة عند الزيارة.'
    });
  } catch (err: any) {
    console.error('Booking submission error:', err);
    res.status(500).json({ error: 'تعذر إتمام طلب الحجز، يرجى التحقق من البيانات والمحاولة مجدداً.' });
  }
});

// 5. Public Booking Lookup
apiRouter.get('/bookings/:reference', (req: Request, res: Response) => {
  try {
    const reference = req.params.reference;
    const app = db.prepare(`
      SELECT a.*, b.name_ar as branch_name, b.address_ar as branch_address, b.phone as branch_phone, b.maps_url
      FROM appointments a
      JOIN branches b ON a.branch_id = b.id
      WHERE a.reference_number = ? OR a.id = ?
    `).get(reference, reference) as any;

    if (!app) {
      res.status(404).json({ error: 'لم يتم العثور على حجز بهذا الرقم المرجعي' });
      return;
    }

    res.json(app);
  } catch (err: any) {
    res.status(500).json({ error: 'تعذر استرجاع بيانات الحجز' });
  }
});

// ----------------------------------------------------
// AUTHENTICATION
// ----------------------------------------------------

apiRouter.post('/auth/login', (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ error: 'يرجى إدخال اسم المستخدم وكلمة المرور' });
      return;
    }

    const hashed = hashPassword(password);
    const user = db.prepare('SELECT * FROM users WHERE username = ? AND password_hash = ? AND is_active = 1').get(username.trim().toLowerCase(), hashed) as any;

    if (!user) {
      logAudit({
        action: 'FAILED_LOGIN_ATTEMPT',
        entityType: 'user',
        details: { username, ip: req.ip }
      });
      res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
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
      action: 'LOGIN_SUCCESS',
      entityType: 'user',
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
  } catch (err: any) {
    res.status(500).json({ error: 'حدث خطأ أثناء تسجيل الدخول' });
  }
});

apiRouter.get('/auth/me', requireSecretary, (req: Request, res: Response) => {
  res.json({ user: req.user });
});

// ----------------------------------------------------
// SECRETARY PORTAL ENDPOINTS
// ----------------------------------------------------

// 1. Operational Dashboard with Quick Date Counts
apiRouter.get('/secretary/dashboard', requireSecretary, (req: Request, res: Response) => {
  try {
    const { todayStr, tomorrowStr, yesterdayStr } = getCairoDateInfo();

    const todayCount = (db.prepare("SELECT COUNT(*) as count FROM appointments WHERE appointment_date = ? AND status != 'cancelled'").get(todayStr) as any)?.count || 0;
    const tomorrowCount = (db.prepare("SELECT COUNT(*) as count FROM appointments WHERE appointment_date = ? AND status != 'cancelled'").get(tomorrowStr) as any)?.count || 0;
    const yesterdayCount = (db.prepare("SELECT COUNT(*) as count FROM appointments WHERE appointment_date = ? AND status != 'cancelled'").get(yesterdayStr) as any)?.count || 0;
    
    const pendingReviews = (db.prepare("SELECT COUNT(*) as count FROM appointments WHERE deposit_status = 'pending_verification' AND status = 'pending_review'").get() as any)?.count || 0;
    const confirmedCount = (db.prepare("SELECT COUNT(*) as count FROM appointments WHERE status = 'confirmed' AND appointment_date >= ?").get(todayStr) as any)?.count || 0;

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
  } catch (err: any) {
    res.status(500).json({ error: 'تعذر جلب إحصائيات السكرتارية' });
  }
});

// 2. Appointments List with Chronological Order and Date Filter
apiRouter.get('/secretary/appointments', requireSecretary, (req: Request, res: Response) => {
  try {
    const { status, date, branch_id, search } = req.query;
    const { todayStr } = getCairoDateInfo();

    let query = `
      SELECT a.*, b.name_ar as branch_name, b.city as branch_city
      FROM appointments a
      JOIN branches b ON a.branch_id = b.id
      WHERE 1=1
    `;
    const params: any[] = [];

    // Filter by branch
    if (branch_id && branch_id !== 'all') {
      query += ' AND a.branch_id = ?';
      params.push(branch_id);
    }

    // Filter by date
    if (date && date !== 'all') {
      query += ' AND a.appointment_date = ?';
      params.push(date);
    }

    // Filter by status
    if (status && status !== 'all') {
      query += ' AND a.status = ?';
      params.push(status);
    }

    // Filter by search
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

    // Chronological ordering: Nearest slot first
    query += ' ORDER BY a.appointment_date ASC, a.slot_time ASC LIMIT 100';

    const appointments = db.prepare(query).all(...params);
    res.json({ appointments, default_date: todayStr });
  } catch (err: any) {
    res.status(500).json({ error: 'تعذر استرجاع جدول المواعيد' });
  }
});

// 3. Add Walk-in / Direct Phone Booking (Any Date Allowed)
apiRouter.post('/secretary/appointments/walk-in', requireSecretary, (req: Request, res: Response) => {
  try {
    const { 
      branch_id, 
      patient_name, 
      patient_phone, 
      appointment_date, 
      slot_time, 
      service_name, 
      payment_status = 'verified', 
      payment_method = 'cash', 
      notes 
    } = req.body;

    if (!patient_name || !patient_phone || !appointment_date || !slot_time) {
      res.status(400).json({ error: 'يرجى إكمال بيانات الحجز الإجباري' });
      return;
    }

    const effectiveBranchId = branch_id || 'branch_dairab_negm';
    const branch = db.prepare('SELECT * FROM branches WHERE id = ?').get(effectiveBranchId) as any;

    const dateCode = appointment_date.replace(/-/g, '');
    const randCode = Math.floor(1000 + Math.random() * 9000);
    const referenceNumber = `APT-${dateCode}-${randCode}`;
    const appointmentId = 'apt_' + crypto.randomUUID();

    // Patient record
    let patient = db.prepare('SELECT id FROM patients WHERE phone = ?').get(patient_phone.trim()) as { id: string } | undefined;
    let patientId = patient?.id;
    if (!patientId) {
      patientId = 'PT-' + Math.floor(1000 + Math.random() * 9000);
      db.prepare('INSERT INTO patients (id, full_name, phone) VALUES (?, ?, ?)').run(
        patientId,
        patient_name.trim(),
        patient_phone.trim()
      );
    }

    const depositAmount = branch ? branch.deposit_amount : 150;
    const appStatus = payment_status === 'verified' || payment_status === 'exempted' ? 'confirmed' : 'pending_review';

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
      service_name || 'كشف مباشر بالعيادة',
      depositAmount,
      payment_status,
      appStatus,
      notes || 'تم إضافته بواسطة السكرتارية (حجز مباشر / تليفوني)',
      payment_method
    );

    logAudit({
      userId: req.user!.id,
      userRole: req.user!.role,
      userName: req.user!.full_name,
      action: 'WALKIN_BOOKING_CREATED',
      entityType: 'appointment',
      entityId: appointmentId,
      details: { referenceNumber, appointment_date, slot_time, patient_name, payment_status }
    });

    res.status(201).json({
      success: true,
      reference_number: referenceNumber,
      message: 'تم إضافة الحجز المباشر بنجاح وتأكيده في الجدول.'
    });
  } catch (err: any) {
    res.status(500).json({ error: 'تعذر إضافة الحجز المباشر' });
  }
});

// 4. Reschedule Appointment (Change Date / Time / Branch)
apiRouter.post('/secretary/appointments/:id/reschedule', requireSecretary, (req: Request, res: Response) => {
  try {
    const appointmentId = req.params.id;
    const { new_date, new_time, new_branch_id, reason } = req.body;

    if (!new_date || !new_time) {
      res.status(400).json({ error: 'يرجى تحديد التاريخ والوقت الجديدين' });
      return;
    }

    const app = db.prepare('SELECT * FROM appointments WHERE id = ?').get(appointmentId) as any;
    if (!app) {
      res.status(404).json({ error: 'الحجز غير موجود' });
      return;
    }

    const effectiveBranchId = new_branch_id || app.branch_id;

    // Check collision on new slot
    const collision = db.prepare(`
      SELECT COUNT(*) as count 
      FROM appointments 
      WHERE branch_id = ? AND appointment_date = ? AND slot_time = ? AND id != ? AND status NOT IN ('rejected', 'cancelled')
    `).get(effectiveBranchId, new_date, new_time, appointmentId) as { count: number };

    if (collision.count >= 1) {
      res.status(409).json({ error: 'التوقيت المختار محجوز مسبقاً، يرجى اختيار ساعة أخرى' });
      return;
    }

    const oldDetails = `${app.appointment_date} (${app.slot_time})`;
    const updatedNotes = app.notes 
      ? `${app.notes} | تم التأجيل من: ${oldDetails} - السبب: ${reason || 'بطلب المريض'}`
      : `تم التأجيل من: ${oldDetails} - السبب: ${reason || 'بطلب المريض'}`;

    db.prepare(`
      UPDATE appointments 
      SET branch_id = ?, appointment_date = ?, slot_time = ?, 
          rescheduled_from = ?, rescheduled_at = CURRENT_TIMESTAMP, notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(effectiveBranchId, new_date, new_time, oldDetails, updatedNotes, appointmentId);

    logAudit({
      userId: req.user!.id,
      userRole: req.user!.role,
      userName: req.user!.full_name,
      action: 'APPOINTMENT_RESCHEDULED',
      entityType: 'appointment',
      entityId: appointmentId,
      details: { referenceNumber: app.reference_number, oldDate: app.appointment_date, newDate: new_date, newTime: new_time, reason }
    });

    res.json({ success: true, message: 'تم تعديل موعد الحجز بنجاح وتحديث الجدول' });
  } catch (err: any) {
    res.status(500).json({ error: 'تعذر تعديل موعد الحجز' });
  }
});

// 5. Review InstaPay Payment (Confirm Deposit)
apiRouter.post('/secretary/appointments/:id/review-payment', requireSecretary, (req: Request, res: Response) => {
  try {
    const appointmentId = req.params.id;
    const { decision, reason } = req.body; // 'verified' | 'rejected'

    const app = db.prepare('SELECT * FROM appointments WHERE id = ?').get(appointmentId) as any;
    if (!app) {
      res.status(404).json({ error: 'الحجز غير موجود' });
      return;
    }

    const newDepositStatus = decision === 'verified' ? 'verified' : 'rejected';
    const newBookingStatus = decision === 'verified' ? 'confirmed' : 'rejected';

    db.prepare(`
      UPDATE appointments 
      SET deposit_status = ?, status = ?, rejection_reason = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(newDepositStatus, newBookingStatus, reason || null, appointmentId);

    // Record review audit
    db.prepare(`
      INSERT INTO booking_payment_reviews (id, appointment_id, reviewer_id, reviewer_name, reviewer_role, decision, reason)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      'rev_' + crypto.randomUUID(),
      appointmentId,
      req.user!.id,
      req.user!.full_name,
      req.user!.role,
      decision,
      reason || null
    );

    logAudit({
      userId: req.user!.id,
      userRole: req.user!.role,
      userName: req.user!.full_name,
      action: decision === 'verified' ? 'DEPOSIT_APPROVED' : 'DEPOSIT_REJECTED',
      entityType: 'appointment',
      entityId: appointmentId,
      details: { decision, reason, referenceNumber: app.reference_number }
    });

    res.json({ success: true, status: newBookingStatus, deposit_status: newDepositStatus });
  } catch (err: any) {
    res.status(500).json({ error: 'تعذر مراجعة الدفع' });
  }
});

// 6. Undo / Revert Payment Approval Flow
apiRouter.post('/secretary/appointments/:id/revert-payment', requireSecretary, (req: Request, res: Response) => {
  try {
    const appointmentId = req.params.id;
    const { target_status = 'pending_review', reason } = req.body;

    const app = db.prepare('SELECT * FROM appointments WHERE id = ?').get(appointmentId) as any;
    if (!app) {
      res.status(404).json({ error: 'الحجز غير موجود' });
      return;
    }

    const newDepositStatus = target_status === 'rejected' ? 'rejected' : 'pending_verification';

    db.prepare(`
      UPDATE appointments 
      SET deposit_status = ?, status = ?, rejection_reason = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(newDepositStatus, target_status, reason || 'تراجع عن الاعتماد من قبل السكرتارية', appointmentId);

    // Record revert in review audits
    db.prepare(`
      INSERT INTO booking_payment_reviews (id, appointment_id, reviewer_id, reviewer_name, reviewer_role, decision, reason)
      VALUES (?, ?, ?, ?, ?, 'reverted', ?)
    `).run(
      'rev_' + crypto.randomUUID(),
      appointmentId,
      req.user!.id,
      req.user!.full_name,
      req.user!.role,
      reason || 'تراجع عن الاعتماد السابق'
    );

    logAudit({
      userId: req.user!.id,
      userRole: req.user!.role,
      userName: req.user!.full_name,
      action: 'PAYMENT_APPROVAL_REVERTED',
      entityType: 'appointment',
      entityId: appointmentId,
      details: { referenceNumber: app.reference_number, target_status, reason }
    });

    res.json({ success: true, message: 'تم التراجع عن الاعتماد وتحديث حالة الحجز بنجاح' });
  } catch (err: any) {
    res.status(500).json({ error: 'تعذر التراجع عن الاعتماد' });
  }
});

// 7. Check-in & Complete Status
apiRouter.post('/secretary/appointments/:id/check-in', requireSecretary, (req: Request, res: Response) => {
  try {
    const appointmentId = req.params.id;
    db.prepare("UPDATE appointments SET check_in_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(appointmentId);
    res.json({ success: true, message: 'تم تسجيل حضور المريض بالعيادة' });
  } catch (err: any) {
    res.status(500).json({ error: 'تعذر تسجيل الحضور' });
  }
});

apiRouter.post('/secretary/appointments/:id/complete', requireSecretary, (req: Request, res: Response) => {
  try {
    const appointmentId = req.params.id;
    db.prepare("UPDATE appointments SET status = 'completed', completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(appointmentId);
    res.json({ success: true, message: 'تم إنهاء الكشف بنجاح' });
  } catch (err: any) {
    res.status(500).json({ error: 'تعذر تحديث حالة الكشف' });
  }
});

// ----------------------------------------------------
// DOCTOR CLINICAL, FINANCIAL & SUPER ADMIN ENDPOINTS
// ----------------------------------------------------

// 1. Executive Analytics & Branch Distribution
apiRouter.get('/doctor/dashboard', requireDoctor, (req: Request, res: Response) => {
  try {
    const { todayStr } = getCairoDateInfo();

    // Financial KPIs
    const financialStats = db.prepare(`
      SELECT 
        COALESCE(SUM(total_amount), 0) as total_billed,
        COALESCE(SUM(paid_amount), 0) as total_collected,
        COALESCE(SUM(remaining_balance), 0) as total_receivables,
        COALESCE(SUM(deposit_deducted), 0) as total_deposits_deducted
      FROM invoices
    `).get() as any;

    const totalDepositsCollected = (db.prepare(`
      SELECT COALESCE(SUM(deposit_amount), 0) as sum 
      FROM appointments 
      WHERE deposit_status = 'verified'
    `).get() as any)?.sum || 0;

    const totalPatients = (db.prepare('SELECT COUNT(*) as count FROM patients').get() as any)?.count || 0;
    const totalAppointments = (db.prepare('SELECT COUNT(*) as count FROM appointments').get() as any)?.count || 0;
    const completedAppointments = (db.prepare("SELECT COUNT(*) as count FROM appointments WHERE status = 'completed'").get() as any)?.count || 0;
    const cancelledAppointments = (db.prepare("SELECT COUNT(*) as count FROM appointments WHERE status IN ('cancelled', 'rejected')").get() as any)?.count || 0;

    // Multi-branch summary
    const branches = db.prepare(`
      SELECT b.id, b.name_ar, b.city, b.deposit_amount, b.instapay_phone,
             COUNT(a.id) as total_bookings,
             COALESCE(SUM(CASE WHEN a.deposit_status = 'verified' THEN a.deposit_amount ELSE 0 END), 0) as branch_deposits
      FROM branches b
      LEFT JOIN appointments a ON b.id = a.branch_id
      GROUP BY b.id
    `).all();

    // Today's Clinical Schedule
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
  } catch (err: any) {
    res.status(500).json({ error: 'تعذر جلب تحليلات لوحة الدكتور' });
  }
});

// 2. Instant Deposit Policy Modal Update («تعديل سعر الحجز»)
apiRouter.put('/doctor/branches/:id/deposit-policy', requireDoctor, (req: Request, res: Response) => {
  try {
    const branchId = req.params.id;
    const { deposit_amount, instapay_phone } = req.body;

    const amount = parseFloat(deposit_amount);
    if (isNaN(amount) || amount < 0) {
      res.status(400).json({ error: 'يرجى إدخال مبلغ عربون صحيح' });
      return;
    }

    db.prepare(`
      UPDATE branches 
      SET deposit_amount = ?, instapay_phone = COALESCE(?, instapay_phone)
      WHERE id = ?
    `).run(amount, instapay_phone ? String(instapay_phone).trim() : null, branchId);

    logAudit({
      userId: req.user!.id,
      userRole: req.user!.role,
      userName: req.user!.full_name,
      action: 'BRANCH_DEPOSIT_POLICY_UPDATED',
      entityType: 'branch',
      entityId: branchId,
      details: { deposit_amount: amount, instapay_phone }
    });

    res.json({ success: true, message: 'تم تحديث سياسة وقيمة العربون ورقم InstaPay للفرع بنجاح' });
  } catch (err: any) {
    res.status(500).json({ error: 'تعذر تحديث إعدادات العربون للفرع' });
  }
});

// 3. Patients & Interactive Odontogram
apiRouter.get('/doctor/patients', requireDoctor, (req: Request, res: Response) => {
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
    const params: any[] = [];

    if (search) {
      query += ' WHERE (p.full_name LIKE ? OR p.phone LIKE ? OR p.id LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    query += ' GROUP BY p.id ORDER BY p.created_at DESC';
    const patients = db.prepare(query).all(...params);
    res.json({ patients });
  } catch (err: any) {
    res.status(500).json({ error: 'تعذر استرجاع ملفات المرضى' });
  }
});

apiRouter.get('/doctor/patients/:id', requireDoctor, (req: Request, res: Response) => {
  try {
    const patientId = req.params.id;
    const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(patientId) as any;
    if (!patient) {
      res.status(404).json({ error: 'الملف الطبي للمريض غير موجود' });
      return;
    }

    const visits = db.prepare('SELECT * FROM appointments WHERE patient_id = ? ORDER BY appointment_date DESC').all(patientId);
    const invoices = db.prepare('SELECT * FROM invoices WHERE patient_id = ? ORDER BY created_at DESC').all(patientId);
    const odontogram = db.prepare('SELECT tooth_number, condition, notes, updated_at FROM patient_odontogram WHERE patient_id = ? ORDER BY tooth_number ASC').all(patientId);

    res.json({
      patient,
      visits,
      invoices,
      odontogram
    });
  } catch (err: any) {
    res.status(500).json({ error: 'تعذر استرجاع ملف المريض' });
  }
});

// Update Tooth Condition in Odontogram
apiRouter.post('/doctor/patients/:id/odontogram', requireDoctor, (req: Request, res: Response) => {
  try {
    const patientId = req.params.id;
    const { tooth_number, condition, notes } = req.body;

    const toothNum = parseInt(tooth_number, 10);
    if (isNaN(toothNum) || toothNum < 1 || toothNum > 32) {
      res.status(400).json({ error: 'رقم السن غير صالح (يجب أن يكون بين 1 و 32)' });
      return;
    }

    const validConditions = ['healthy', 'caries', 'filling', 'rct', 'extracted', 'crown', 'implant'];
    if (!validConditions.includes(condition)) {
      res.status(400).json({ error: 'حالة السن غير صالحة' });
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
      'od_' + crypto.randomUUID(),
      patientId,
      toothNum,
      condition,
      notes || null
    );

    logAudit({
      userId: req.user!.id,
      userRole: req.user!.role,
      userName: req.user!.full_name,
      action: 'ODONTOGRAM_TOOTH_UPDATED',
      entityType: 'odontogram',
      entityId: `${patientId}_tooth_${toothNum}`,
      details: { tooth_number: toothNum, condition, notes }
    });

    res.json({ success: true, message: `تم تحديث السن رقم ${toothNum} إلى حالة (${condition})` });
  } catch (err: any) {
    res.status(500).json({ error: 'تعذر تحديث مخطط الأسنان' });
  }
});

// 4. Smart Clinical Invoicing with Auto-Deposit Deduction & Custom Free Services
apiRouter.post('/doctor/invoices', requireDoctor, (req: Request, res: Response) => {
  try {
    const { 
      patient_id, 
      appointment_id, 
      branch_id,
      items, 
      deposit_deducted = 0,
      initial_payment_amount = 0, 
      initial_payment_method = 'cash', 
      notes 
    } = req.body;

    if (!patient_id) {
      res.status(400).json({ error: 'يرجى تحديد المريض' });
      return;
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'يرجى إضافة خدمة أو إجراء علاجي واحد على الأقل' });
      return;
    }

    let subtotal = 0;
    let totalDiscount = 0;

    const validatedItems = items.map((it: any) => {
      const qty = Math.max(1, parseInt(it.quantity, 10) || 1);
      const price = Math.max(0, parseFloat(it.unit_price) || 0);
      const disc = Math.max(0, parseFloat(it.discount) || 0);
      const lineTotal = Math.max(0, (qty * price) - disc);

      subtotal += (qty * price);
      totalDiscount += disc;

      return {
        service_id: it.service_id || null,
        service_name: String(it.service_name || 'خدمة علاجية مخصصة').trim(),
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

    const status = remainingBalance === 0 ? 'paid' : (initialPaid > 0 ? 'partial' : 'unpaid');
    const invoiceId = 'inv_' + crypto.randomUUID();
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
      req.user!.id
    );

    // Insert items
    const insertItem = db.prepare(`
      INSERT INTO invoice_items (id, invoice_id, service_id, service_name, quantity, unit_price, discount, total)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const it of validatedItems) {
      insertItem.run(
        'item_' + crypto.randomUUID(),
        invoiceId,
        it.service_id,
        it.service_name,
        it.quantity,
        it.unit_price,
        it.discount,
        it.total
      );
    }

    // Payment if recorded
    if (initialPaid > 0) {
      db.prepare(`
        INSERT INTO payments (id, invoice_id, patient_id, amount, payment_method, notes, recorded_by_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        'pay_' + crypto.randomUUID(),
        invoiceId,
        patient_id,
        initialPaid,
        initial_payment_method,
        'سداد دفعة فورية مع إصدار الفاتورة',
        req.user!.id
      );
    }

    // Outbox item for Google Sheets
    queueSyncItem({
      entityType: 'financial',
      entityId: invoiceId,
      targetSheet: 'invoices',
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
      userId: req.user!.id,
      userRole: req.user!.role,
      userName: req.user!.full_name,
      action: 'INVOICE_CREATED',
      entityType: 'invoice',
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
  } catch (err: any) {
    console.error('Invoice creation error:', err);
    res.status(500).json({ error: 'تعذر إنشاء الفاتورة العلاجية' });
  }
});

// 5. Invoices List
apiRouter.get('/doctor/invoices', requireDoctor, (req: Request, res: Response) => {
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
  } catch (err: any) {
    res.status(500).json({ error: 'تعذر جلب الفواتير' });
  }
});

// 6. Revisit Codes Management (Specific Patient or General Reusable Code)
apiRouter.get('/doctor/revisit-codes', requireDoctor, (req: Request, res: Response) => {
  try {
    const codes = db.prepare(`
      SELECT r.*, p.full_name as patient_name, p.phone as patient_phone
      FROM revisit_codes r
      LEFT JOIN patients p ON r.patient_id = p.id
      ORDER BY r.created_at DESC
    `).all();

    res.json({ revisit_codes: codes });
  } catch (err: any) {
    res.status(500).json({ error: 'تعذر جلب أكواد الإعادة' });
  }
});

apiRouter.post('/doctor/revisit-codes', requireDoctor, (req: Request, res: Response) => {
  try {
    const { 
      patient_id, 
      discount_type = 'full_exemption', 
      fee_amount = 0, 
      max_uses = 1, 
      expires_in_days = 30,
      custom_code
    } = req.body;

    const randomStr = crypto.randomBytes(3).toString('hex').toUpperCase();
    const code = custom_code && custom_code.trim() ? custom_code.trim().toUpperCase() : `REV-${randomStr}`;
    const codeId = 'rev_' + crypto.randomUUID();

    const expDate = new Date();
    expDate.setDate(expDate.getDate() + (parseInt(expires_in_days, 10) || 30));
    const expiresAt = expDate.toISOString().split('T')[0];

    db.prepare(`
      INSERT INTO revisit_codes (
        id, code, patient_id, discount_type, fee_amount, max_uses, used_count, expires_at, created_by_id
      ) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)
    `).run(
      codeId,
      code,
      patient_id || null,
      discount_type,
      discount_type === 'full_exemption' ? 0 : parseFloat(fee_amount) || 0,
      Math.max(1, parseInt(max_uses, 10) || 1),
      expiresAt,
      req.user!.id
    );

    logAudit({
      userId: req.user!.id,
      userRole: req.user!.role,
      userName: req.user!.full_name,
      action: 'REVISIT_CODE_GENERATED',
      entityType: 'revisit_code',
      entityId: codeId,
      details: { code, patient_id, discount_type, fee_amount, max_uses }
    });

    res.status(201).json({
      success: true,
      code,
      expires_at: expiresAt,
      message: `تم توليد كود الإعادة بنجاح: ${code}`
    });
  } catch (err: any) {
    res.status(500).json({ error: 'تعذر إنشاء كود الإعادة' });
  }
});

apiRouter.post('/doctor/revisit-codes/:id/cancel', requireDoctor, (req: Request, res: Response) => {
  try {
    const codeId = req.params.id;
    db.prepare('DELETE FROM revisit_codes WHERE id = ?').run(codeId);
    res.json({ success: true, message: 'تم إلغاء الكود بنجاح' });
  } catch (err: any) {
    res.status(500).json({ error: 'تعذر إلغاء الكود' });
  }
});

// 7. Google Sheets Config & Manual Outbox Trigger
apiRouter.get('/doctor/sheets-sync', requireDoctor, (req: Request, res: Response) => {
  try {
    const config = getSheetsConfig();
    const pendingCount = (db.prepare("SELECT COUNT(*) as count FROM sync_outbox WHERE status = 'pending'").get() as any)?.count || 0;
    const syncedCount = (db.prepare("SELECT COUNT(*) as count FROM sync_outbox WHERE status = 'synced'").get() as any)?.count || 0;
    const failedCount = (db.prepare("SELECT COUNT(*) as count FROM sync_outbox WHERE status = 'failed'").get() as any)?.count || 0;

    const recentOutbox = db.prepare('SELECT * FROM sync_outbox ORDER BY created_at DESC LIMIT 30').all();

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
  } catch (err: any) {
    res.status(500).json({ error: 'تعذر استرجاع إعدادات المزامنة' });
  }
});

apiRouter.post('/doctor/sheets-sync/config', requireDoctor, (req: Request, res: Response) => {
  try {
    const { spreadsheet_url, service_account_email } = req.body;
    const extractedId = extractSpreadsheetId(spreadsheet_url);

    const config = {
      spreadsheet_url: spreadsheet_url || '',
      spreadsheet_id: extractedId,
      service_account_email: service_account_email || 'clinic-sync@drsabra-dental.iam.gserviceaccount.com',
      auto_sync_enabled: true,
      last_sync: new Date().toISOString()
    };

    updateSheetsConfig(config);

    logAudit({
      userId: req.user!.id,
      userRole: req.user!.role,
      userName: req.user!.full_name,
      action: 'GOOGLE_SHEETS_CONFIG_UPDATED',
      entityType: 'settings',
      details: { spreadsheet_id: extractedId }
    });

    res.json({
      success: true,
      spreadsheet_id: extractedId,
      message: `تم ربط وتحديث إعدادات Google Sheets بنجاح! المعرف المستخرج: ${extractedId}`
    });
  } catch (err: any) {
    res.status(500).json({ error: 'تعذر حفظ إعدادات الشيت' });
  }
});

apiRouter.post('/doctor/sheets-sync/trigger', requireDoctor, async (req: Request, res: Response) => {
  try {
    const result = await processOutboxSync();
    res.json({ success: true, result });
  } catch (err: any) {
    res.status(500).json({ error: 'فشل تنفيذ المزامنة' });
  }
});

// CSV Exports
apiRouter.get('/doctor/export-csv/:tab', requireDoctor, (req: Request, res: Response) => {
  try {
    const tab = req.params.tab;
    let csvData = '';
    let fileName = 'export.csv';

    if (tab === 'appointments') {
      csvData = exportAppointmentsCSV();
      fileName = 'Appointments_Schedule.csv';
    } else if (tab === 'invoices') {
      csvData = exportInvoicesCSV();
      fileName = 'Invoices_Ledger.csv';
    } else if (tab === 'patients') {
      csvData = exportPatientsCSV();
      fileName = 'Patients_Directory.csv';
    } else {
      csvData = exportAppointmentsCSV();
      fileName = 'Clinic_Data.csv';
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(csvData);
  } catch (err: any) {
    res.status(500).send('تعذر توليد ملف CSV');
  }
});

// 8. Immutable Security Audit Logs
apiRouter.get('/doctor/audit-logs', requireDoctor, (req: Request, res: Response) => {
  try {
    const logs = db.prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100').all();
    res.json({ audit_logs: logs });
  } catch (err: any) {
    res.status(500).json({ error: 'تعذر استرجاع سجل العمليات' });
  }
});

// 9. Full JSON Backup
apiRouter.get('/doctor/backup', requireDoctor, (req: Request, res: Response) => {
  try {
    const tables = ['branches', 'users', 'patients', 'patient_odontogram', 'services', 'appointments', 'invoices', 'invoice_items', 'payments', 'revisit_codes', 'system_settings', 'audit_logs'];
    const backup: Record<string, any> = {
      timestamp: new Date().toISOString(),
      platform: 'Dr. Mohamed Sabra Elnaggar Dental Clinic & PMS Platform'
    };

    for (const t of tables) {
      if (t === 'users') {
        backup[t] = db.prepare('SELECT id, username, full_name, role, phone, is_active, created_at FROM users').all();
      } else {
        backup[t] = db.prepare(`SELECT * FROM ${t}`).all();
      }
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="Clinic_Backup_${Date.now()}.json"`);
    res.send(JSON.stringify(backup, null, 2));
  } catch (err: any) {
    res.status(500).json({ error: 'تعذر تصدير النسخة الاحتياطية' });
  }
});

// Download raw clinic.db file
apiRouter.get('/doctor/download-db', requireDoctor, (req: Request, res: Response) => {
  try {
    const dbFilePath = path.join(DATA_DIR, 'clinic.db');
    if (!fs.existsSync(dbFilePath)) {
      return res.status(404).send('ملف قاعدة البيانات غير موجود بعد على الخادم');
    }
    res.download(dbFilePath, 'clinic.db');
  } catch (err: any) {
    res.status(500).send('تعذر تنزيل قاعدة البيانات');
  }
});

// Download database.sql schema & dump
apiRouter.get('/doctor/download-sql', requireDoctor, (req: Request, res: Response) => {
  try {
    let sqlFilePath = path.join(APP_ROOT, 'database.sql');
    if (!fs.existsSync(sqlFilePath)) {
      sqlFilePath = path.join(APP_ROOT, 'data', 'database.sql');
    }
    if (!fs.existsSync(sqlFilePath)) {
      return res.status(404).send('ملف database.sql غير موجود');
    }
    res.download(sqlFilePath, 'database.sql');
  } catch (err: any) {
    res.status(500).send('تعذر تنزيل ملف SQL');
  }
});

// 10. Clinic Settings (GET and PUT)
apiRouter.get('/doctor/settings', requireDoctor, (req: Request, res: Response) => {
  try {
    const rows = db.prepare('SELECT key, value_json FROM system_settings').all() as { key: string; value_json: string }[];
    const settings: Record<string, any> = {};
    for (const row of rows) {
      try {
        settings[row.key] = JSON.parse(row.value_json);
      } catch {
        settings[row.key] = row.value_json;
      }
    }
    res.json({ settings });
  } catch (err: any) {
    res.status(500).json({ error: 'تعذر جلب إعدادات العيادة' });
  }
});

apiRouter.put('/doctor/settings', requireDoctor, (req: Request, res: Response) => {
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
      userId: req.user!.id,
      userRole: req.user!.role,
      userName: req.user!.full_name,
      action: 'SYSTEM_SETTINGS_UPDATED',
      entityType: 'settings',
      details: payload
    });

    res.json({ success: true, message: 'تم حفظ إعدادات العيادة بنجاح' });
  } catch (err: any) {
    res.status(500).json({ error: 'تعذر حفظ إعدادات العيادة' });
  }
});

