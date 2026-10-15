import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { NextFunction, Request, Response } from 'express';
import { JWT_SECRET } from './config.js';
import { one } from './db.js';

export type AuthUser = { id: string; email: string; name: string; role: 'user' | 'admin' };
export type Req = Request & { user?: AuthUser };

export function hashPassword(pw: string) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(pw, salt, 32).toString('hex')}`;
}
export function verifyPassword(pw: string, stored: string) {
  const [salt, hash] = stored.split(':');
  const a = Buffer.from(hash, 'hex');
  const b = scryptSync(pw, salt, 32);
  return a.length === b.length && timingSafeEqual(a, b);
}
export const signToken = (u: AuthUser) => jwt.sign({ sub: u.id }, JWT_SECRET, { expiresIn: '30d' });

/** Attaches req.user when a valid token is present; never rejects (guests browse freely). */
export function optionalAuth(req: Req, _res: Response, next: NextFunction) {
  const h = req.headers.authorization;
  if (h?.startsWith('Bearer ')) {
    try {
      const { sub } = jwt.verify(h.slice(7), JWT_SECRET) as { sub: string };
      const u = one<AuthUser>('SELECT id,email,name,role FROM users WHERE id=?', sub);
      if (u) req.user = u;
    } catch { /* invalid token => treated as guest */ }
  }
  next();
}

export function requireAuth(req: Req, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: 'Sign in required' });
  next();
}
export function requireAdmin(req: Req, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: 'Sign in required' });
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Reviewer access only' });
  next();
}
