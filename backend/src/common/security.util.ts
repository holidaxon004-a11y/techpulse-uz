import * as crypto from 'crypto';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'techpulse_uz_super_secret_access_key_2026_uzb';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'techpulse_uz_super_secret_refresh_key_2026_uzb';

/**
 * Xavfsiz parol xeshlash (scrypt + tasodifiy salt)
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

/**
 * Parolni timing-safe tekshirish
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, key] = storedHash.split(':');
    if (!salt || !key) return false;
    const derived = crypto.scryptSync(password, salt, 64);
    const keyBuf = Buffer.from(key, 'hex');
    if (derived.length !== keyBuf.length) return false;
    return crypto.timingSafeEqual(derived, keyBuf);
  } catch {
    return false;
  }
}

export interface JwtPayload {
  sub: string;
  role: string;
  accountType: 'USER' | 'ADMIN';
  name: string;
  phone?: string;
  email?: string;
  permissions?: string[];
  iat?: number;
  exp?: number;
}

function base64UrlEncode(input: string | Buffer): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(input: string): string {
  const pad = 4 - (input.length % 4);
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/') + (pad < 4 ? '='.repeat(pad) : '');
  return Buffer.from(normalized, 'base64').toString('utf8');
}

export function signJwt(payload: JwtPayload, type: 'access' | 'refresh' = 'access'): string {
  const secret = type === 'access' ? ACCESS_SECRET : REFRESH_SECRET;
  const ttlSeconds = type === 'access' ? 2 * 3600 : 7 * 24 * 3600;
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'HS256', typ: 'JWT' };
  const body: JwtPayload = {
    ...payload,
    iat: now,
    exp: now + ttlSeconds,
  };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedBody = base64UrlEncode(JSON.stringify(body));
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedBody}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return `${encodedHeader}.${encodedBody}.${signature}`;
}

export function verifyJwt(token: string, type: 'access' | 'refresh' = 'access'): JwtPayload | null {
  try {
    const secret = type === 'access' ? ACCESS_SECRET : REFRESH_SECRET;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [encodedHeader, encodedBody, signature] = parts;
    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(`${encodedHeader}.${encodedBody}`)
      .digest('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }
    const payload = JSON.parse(base64UrlDecode(encodedBody)) as JwtPayload;
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

/**
 * XSS himoyasi uchun matnni tozalash
 */
export function sanitizeText(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
}

/**
 * To'lov provayderlari (Click / Payme / Uzum) uchun server-side imzo yaratish va tekshirish
 */
export function generatePaymentSignature(provider: string, orderId: string, amountUzs: number): string {
  const secretMap: Record<string, string> = {
    CLICK: process.env.CLICK_SECRET_KEY || 'click_secret_verify_key_2026',
    PAYME: process.env.PAYME_SECRET_KEY || 'payme_secret_verify_key_2026',
    UZUM: process.env.UZUM_SECRET_KEY || 'uzum_secret_verify_key_2026',
  };
  const secret = secretMap[provider.toUpperCase()] || 'default_payment_secret_2026';
  return crypto
    .createHmac('sha256', secret)
    .update(`${provider.toUpperCase()}:${orderId}:${amountUzs}`)
    .digest('hex');
}

export function verifyPaymentSignature(
  provider: string,
  orderId: string,
  amountUzs: number,
  signature: string,
): boolean {
  try {
    const expected = generatePaymentSignature(provider, orderId, amountUzs);
    const a = Buffer.from(expected);
    const b = Buffer.from(signature || '');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

