// Passwordless (magic-link) auth: signed session cookie + one-time email tokens in Postgres.
import { query } from './db';
import type { SessionUser } from './backend';

const COOKIE = 'pardis_session';
const SESSION_DAYS = 30;
const TOKEN_MINUTES = 15;
const enc = new TextEncoder();

const b64url = (buf: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function hmac(data: string) {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error('SESSION_SECRET must be set (32+ chars)');
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64url(await crypto.subtle.sign('HMAC', key, enc.encode(data)));
}

export async function sha256(s: string) {
  return b64url(await crypto.subtle.digest('SHA-256', enc.encode(s)));
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export async function sessionCookie(userId: string) {
  const payload = b64url(enc.encode(JSON.stringify({ uid: userId, exp: Date.now() + SESSION_DAYS * 864e5 })));
  const value = `${payload}.${await hmac(payload)}`;
  return `${COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}`;
}

export const clearCookie = `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;

export async function getSessionUser(req: Request): Promise<SessionUser | null> {
  const raw = (req.headers.get('cookie') ?? '').split(/;\s*/).find((c) => c.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
  if (!raw) return null;
  const [payload, sig] = raw.split('.');
  if (!payload || !sig || !safeEqual(sig, await hmac(payload))) return null;
  try {
    const { uid, exp } = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    if (typeof uid !== 'string' || Date.now() > exp) return null;
    const rows = await query(`SELECT id, "email", "firstName", "lastName", "name" FROM "ziteUsers" WHERE id = $1`, [uid]);
    if (!rows[0]) return null;
    const u = rows[0];
    return { id: String(u.id), email: String(u.email), firstName: (u.firstName as string) ?? undefined, lastName: (u.lastName as string) ?? undefined };
  } catch {
    return null;
  }
}

export function safeRedirect(r: string | null) {
  return r && r.startsWith('/') && !r.startsWith('//') && !r.startsWith('/\\') ? r : '/admin';
}

export async function requestMagicLink(emailRaw: string, redirect: string, origin: string) {
  const email = emailRaw.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 200) return { ok: false, status: 400, message: 'ایمیل معتبر نیست.' };
  const recent = await query(`SELECT COUNT(*)::int AS c FROM "authTokens" WHERE "email" = $1 AND created_at > now() - interval '1 hour'`, [email]);
  if (Number(recent[0]?.c ?? 0) >= 5) return { ok: false, status: 429, message: 'تعداد درخواست‌ها زیاد است؛ یک ساعت دیگر تلاش کنید.' };

  const token = b64url(crypto.getRandomValues(new Uint8Array(32)));
  await query(`INSERT INTO "authTokens" ("tokenHash", "email", "expiresAt") VALUES ($1, $2, now() + interval '${TOKEN_MINUTES} minutes')`, [await sha256(token), email]);
  await query(`DELETE FROM "authTokens" WHERE "expiresAt" < now() - interval '1 day'`);

  const link = `${origin}/api/auth/verify?token=${token}&redirect=${encodeURIComponent(safeRedirect(redirect))}`;
  await sendEmail(email, link);
  return { ok: true, status: 200, message: '' };
}

async function sendEmail(to: string, link: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY is not set');
  const html = `<div dir="rtl" style="font-family:Tahoma,sans-serif;max-width:480px;margin:auto;padding:24px;color:#14271f">
    <h2 style="color:#1a4d3e">ورود به پنل مدیریت هم‌دانشگاهی</h2>
    <p>برای ورود روی دکمه زیر بزنید. این پیوند تا ${TOKEN_MINUTES} دقیقه و فقط یک بار معتبر است.</p>
    <p style="margin:28px 0"><a href="${link}" style="background:#1a4d3e;color:#fff;padding:12px 22px;border-radius:10px;text-decoration:none">ورود به پنل</a></p>
    <p style="font-size:12px;color:#667">اگر این درخواست را شما نداده‌اید، این ایمیل را نادیده بگیرید.</p></div>`;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: process.env.MAIL_FROM ?? 'هم‌دانشگاهی <onboarding@resend.dev>', to, subject: 'پیوند ورود به هم‌دانشگاهی', html, text: `پیوند ورود: ${link}` }),
  });
  if (!res.ok) throw new Error(`Resend failed: ${res.status} ${await res.text()}`);
}

export async function verifyMagicLink(token: string) {
  const rows = await query(
    `UPDATE "authTokens" SET "usedAt" = now() WHERE "tokenHash" = $1 AND "usedAt" IS NULL AND "expiresAt" > now() RETURNING "email"`,
    [await sha256(token)],
  );
  const email = rows[0]?.email as string | undefined;
  if (!email) return null;
  const users = await query(
    `INSERT INTO "ziteUsers" ("email", "name") VALUES ($1, split_part($1, '@', 1))
     ON CONFLICT ("email") DO UPDATE SET updated_at = now() RETURNING id`,
    [email],
  );
  return String(users[0].id);
}
