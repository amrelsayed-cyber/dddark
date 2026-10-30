/**
 * Authentication and RBAC Middleware for Dr. Mohamed Sabra Elnaggar Dental Clinic
 */
import type { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import { db, logAudit } from './db.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'drsabra_clinic_auth_secret_key_2026';

export interface AuthUser {
  id: string;
  username: string;
  full_name: string;
  role: 'doctor' | 'secretary' | 'admin';
  phone?: string;
}

// Extend express Request
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

// Generate signed token
export function createToken(user: AuthUser): string {
  const payload = {
    sub: user.id,
    username: user.username,
    role: user.role,
    full_name: user.full_name,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
  };
  const payloadStr = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(payloadStr).digest('base64url');
  return `${payloadStr}.${signature}`;
}

// Verify signed token
export function verifyToken(token: string): AuthUser | null {
  try {
    const [payloadStr, signature] = token.split('.');
    if (!payloadStr || !signature) return null;

    const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(payloadStr).digest('base64url');
    if (signature !== expectedSig) return null;

    const payload = JSON.parse(Buffer.from(payloadStr, 'base64url').toString('utf8'));
    if (payload.exp && Date.now() > payload.exp) return null;

    // Fetch user from DB to confirm status
    const user = db.prepare('SELECT id, username, full_name, role, phone, is_active FROM users WHERE id = ?').get(payload.sub) as (AuthUser & { is_active: number }) | undefined;
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

// Middleware to extract auth token
export function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const user = verifyToken(token);
    if (user) {
      req.user = user;
    }
  }
  next();
}

// Require any authenticated user
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    res.status(401).json({ error: 'غير مصرح: يجب تسجيل الدخول للوصول إلى هذه الصفحة' });
    return;
  }
  next();
}

// Require Doctor role strictly
export function requireDoctor(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    res.status(401).json({ error: 'غير مصرح: يرجى تسجيل الدخول' });
    return;
  }

  if (req.user.role !== 'doctor' && req.user.role !== 'admin') {
    // Log unauthorized access attempt
    logAudit({
      userId: req.user.id,
      userRole: req.user.role,
      userName: req.user.full_name,
      action: 'UNAUTHORIZED_DOCTOR_ACCESS_ATTEMPT',
      entityType: 'financial_records',
      details: { url: req.originalUrl, ip: req.ip }
    });
    res.status(403).json({ error: 'صلاحية مرفوضة: هذه البيانات والسجلات المالية متاحة للدكتور فقط' });
    return;
  }
  next();
}

// Require Secretary or Doctor role (Operational access)
export function requireSecretary(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    res.status(401).json({ error: 'غير مصرح: يرجى تسجيل الدخول' });
    return;
  }

  if (req.user.role !== 'secretary' && req.user.role !== 'doctor' && req.user.role !== 'admin') {
    res.status(403).json({ error: 'صلاحية مرفوضة: يجب أن تكون سكرتارية أو إدارة للوصول' });
    return;
  }
  next();
}
