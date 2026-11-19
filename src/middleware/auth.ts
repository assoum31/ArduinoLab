import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { DecodedIdToken } from 'firebase-admin/auth';
import { adminAuth } from '../lib/firebase-admin.ts';
import { isProfileAdminByUid } from '../db/repository.ts';

export interface AuthRequest extends Request {
  user?: DecodedIdToken;
  adminEmail?: string;
}

const ADMIN_TOKEN_SECRET =
  process.env.ADMIN_SESSION_SECRET ||
  process.env.DATABASE_URL ||
  'ardunolab-hmac-session-key-v1';

export function signAdminToken(email: string): string {
  const payload = Buffer.from(
    JSON.stringify({
      email,
      role: 'admin',
      exp: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 days
    }),
  ).toString('base64url');
  const sig = crypto
    .createHmac('sha256', ADMIN_TOKEN_SECRET)
    .update(payload)
    .digest('base64url');
  return `adm.${payload}.${sig}`;
}

export function verifyAdminToken(token: string): { email: string } | null {
  if (!token.startsWith('adm.')) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [, payload, sig] = parts;
  const expected = crypto
    .createHmac('sha256', ADMIN_TOKEN_SECRET)
    .update(payload)
    .digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      email: string;
      role: string;
      exp: number;
    };
    if (parsed.role !== 'admin' || Date.now() > parsed.exp) return null;
    return { email: parsed.email };
  } catch {
    return null;
  }
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Error verifying Firebase ID token:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

export const requireAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  // 1) Check dedicated signed Admin session token header
  const adminTokenHeader = req.headers['x-admin-token'];
  if (typeof adminTokenHeader === 'string' && adminTokenHeader) {
    const verified = verifyAdminToken(adminTokenHeader);
    if (verified) {
      req.adminEmail = verified.email;
      return next();
    }
  }

  // 2) Fallback: check Firebase Bearer token + database admin role
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split('Bearer ')[1];
    // Also allow admin token passed via Bearer
    const directAdmin = verifyAdminToken(token);
    if (directAdmin) {
      req.adminEmail = directAdmin.email;
      return next();
    }
    try {
      const decodedToken = await adminAuth.verifyIdToken(token);
      req.user = decodedToken;
      const isAdmin = await isProfileAdminByUid(
        decodedToken.uid,
        decodedToken.email,
      );
      if (isAdmin) {
        req.adminEmail = decodedToken.email || decodedToken.uid;
        return next();
      }
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    } catch {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
  }

  return res.status(401).json({ error: 'Unauthorized: Admin authentication required' });
};
