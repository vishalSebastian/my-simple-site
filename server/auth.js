import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { one } from './db.js';

const TOKEN_TTL_SECONDS = 60 * 60; // 1 hour

function secret() {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not set');
  return process.env.JWT_SECRET;
}

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const hashPassword = (password) => bcrypt.hash(password, 10);
export const checkPassword = (password, hash) => bcrypt.compare(password, hash);

export const publicUser = (u) => ({ id: u.id, email: u.email, full_name: u.full_name, role: u.role, created_at: u.created_at });

// Creates the JWT returned by /api/auth/login
export function createSession(user) {
  const access_token = jwt.sign(
    { sub: user.id, email: user.email, name: user.full_name, role: user.role },
    secret(),
    { algorithm: 'HS256', expiresIn: TOKEN_TTL_SECONDS },
  );
  const { exp } = jwt.decode(access_token);
  return { access_token, token_type: 'bearer', expires_in: TOKEN_TTL_SECONDS, expires_at: exp, user: publicUser(user) };
}

// Middleware: needs "Authorization: Bearer <token>". Sets req.user.
export async function requireAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new HttpError(401, 'Not authenticated');

  let payload;
  try {
    payload = jwt.verify(token, secret(), { algorithms: ['HS256'] });
  } catch (e) {
    throw new HttpError(401, e.name === 'TokenExpiredError' ? 'JWT expired' : 'Invalid token');
  }

  const user = await one('select * from app.users where id = $1', [payload.sub]);
  if (!user) throw new HttpError(401, 'Not authenticated');
  req.user = user;
  next();
}

export function requireHr(req, _res, next) {
  if (req.user?.role !== 'hr') throw new HttpError(403, 'Permission denied');
  next();
}

// Own data, or HR
export function canAccess(me, userId) {
  if (me.id !== userId && me.role !== 'hr') throw new HttpError(403, 'Permission denied');
}
