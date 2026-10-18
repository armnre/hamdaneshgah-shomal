// Pure authorization/validation rules — no platform imports, so they are unit-testable.
export type Role = 'Super Admin' | 'Content Editor' | 'Association Manager';

export const ROLE_ENTITIES: Record<Role, string[]> = {
  'Super Admin': ['associations', 'faculties', 'majors', 'news', 'events', 'categories', 'media', 'members', 'settings', 'messages', 'audit', 'years', 'associationYears', 'associationMajors', 'positions', 'terms', 'elections', 'candidates', 'voters'],
  'Content Editor': ['news', 'events', 'categories', 'media', 'messages'],
  'Association Manager': ['associations', 'news', 'events', 'media'],
};

export const canAccess = (role: Role | null | undefined, entity: string) =>
  !!role && (ROLE_ENTITIES[role] ?? []).includes(entity);

/** Bootstrap is allowed only when no admin exists AND the email is on the configured allowlist. */
export function canBootstrap(email: string, allowlist: string | undefined, existingAdmins: number) {
  if (existingAdmins > 0) return { ok: false, reason: 'closed' as const };
  const allowed = (allowlist ?? '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (!allowed.length) return { ok: false, reason: 'not_configured' as const };
  if (!allowed.includes(email.trim().toLowerCase())) return { ok: false, reason: 'not_allowed' as const };
  return { ok: true, reason: 'ok' as const };
}

/** Association managers have no per-record ownership on media, so they may only add new media. */
export const managerMayMutateMedia = (role: Role, isUpdateOrDelete: boolean) =>
  !(role === 'Association Manager' && isUpdateOrDelete);

export function slugify(s: string) {
  return (
    s.trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '').slice(0, 80) ||
    Math.random().toString(36).slice(2, 8)
  );
}

/** Only absolute http(s) URLs (blocks javascript:, data:, etc.). Uploaded files may also be same-origin /api/file/ paths. */
export function isSafeUrl(value: string, allowUploadPath = false) {
  const v = value.trim();
  if (allowUploadPath && /^\/api\/file\/(?!.*\.\.)[A-Za-z0-9/_.-]+$/.test(v)) return true;
  try {
    const u = new URL(v);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Converts Persian/Arabic digits to ASCII and strips everything else. */
export const toAsciiDigits = (s: string) =>
  s.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/\D/g, '');

/** Iranian national code (کد ملی) checksum. Returns the normalized 10-digit code or null. */
export function normalizeNationalId(raw: string): string | null {
  let c = toAsciiDigits(raw);
  if (c.length >= 8 && c.length < 10) c = c.padStart(10, '0');
  if (!/^\d{10}$/.test(c) || /^(\d)\1{9}$/.test(c)) return null;
  const sum = [...c.slice(0, 9)].reduce((s, d, i) => s + Number(d) * (10 - i), 0) % 11;
  const check = Number(c[9]);
  return (sum < 2 ? check === sum : check === 11 - sum) ? c : null;
}

/** Student numbers: digits only, 5–16 long. */
export function normalizeStudentNumber(raw: string): string | null {
  const c = toAsciiDigits(raw);
  return /^\d{5,16}$/.test(c) ? c : null;
}

/** Race-safe bootstrap: when concurrent claims each inserted a Super Admin row, only the earliest-created one survives. */
export function bootstrapWinner(rows: { id: string; createdAt?: string }[]) {
  return [...rows].sort((a, b) => String(a.createdAt ?? '').localeCompare(String(b.createdAt ?? '')) || a.id.localeCompare(b.id))[0]?.id ?? null;
}

// ───────── Voting security (pure, unit-testable) ─────────

/** Minimum pepper length (characters). Shorter or missing → voting and import are refused (fail closed). */
export const MIN_PEPPER_LENGTH = 32;
/** Voter session lifetime: at most 20 minutes, closed immediately after the ballot is cast. */
export const VOTER_SESSION_MINUTES = 20;
/** Temporary lock: failures per 15-minute window before the bucket is locked. */
export const ATTEMPT_WINDOW_MINUTES = 15;
export const MAX_FAILURES_PER_STUDENT = 5;
export const MAX_FAILURES_PER_IP = 20;

/** Reads the pepper. The same value is accepted under both names (Zite secret / Netlify env). */
export function readPepper(env: Record<string, string | undefined>): string | null {
  const p = env.ZITE_VOTER_PEPPER ?? env.VOTER_PEPPER;
  return p && p.length >= MIN_PEPPER_LENGTH ? p : null;
}

const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

/** HMAC-SHA256 → lowercase hex. */
export async function hmacHex(key: string, message: string) {
  const enc = new TextEncoder();
  const k = await crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', k, enc.encode(message)));
}

/** Per-election keyed hash of a (normalized) national ID. The raw ID is never stored. */
export const nationalIdHmac = (pepper: string, electionId: string, nationalId: string) =>
  hmacHex(pepper, `nid:v2:${electionId}:${nationalId}`);

/** Constant-time string comparison (length is not secret: all hashes are 64 hex chars). */
export function timingSafeEqual(a: string, b: string) {
  let diff = a.length ^ b.length;
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

/** Masked student number for audit logs: keeps first 2 and last 2 digits. */
export function maskStudentNumber(sn: string) {
  return sn.length <= 4 ? '****' : `${sn.slice(0, 2)}${'*'.repeat(sn.length - 4)}${sn.slice(-2)}`;
}

/** Random URL-safe token (default 32 bytes). */
export function randomToken(bytes = 32) {
  return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(bytes)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Short human-readable participation confirmation code (no relation to ballot content). */
export function participationCode() {
  const alphabet = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  const r = crypto.getRandomValues(new Uint8Array(10));
  const s = [...r].map((b) => alphabet[b % alphabet.length]).join('');
  return `${s.slice(0, 5)}-${s.slice(5)}`;
}

/** Normalizes a Persian major name for matching (Arabic ي/ك, ZWNJ, spaces, diacritics). */
export function normalizeMajorName(s: string) {
  return s.replace(/[يى]/g, 'ی').replace(/ك/g, 'ک').replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[\u200c\u200f\u200e]/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Known synonyms → canonical major name in the system. Physical education and sport sciences are one association. */
export const MAJOR_ALIASES: Record<string, string> = {
  'تربیت بدنی': 'علوم ورزشی',
  'تربیت بدنی و علوم ورزشی': 'علوم ورزشی',
  'علوم ورزشی و تربیت بدنی': 'علوم ورزشی',
};

/** Resolves a raw major name to a mapped major id, or null (→ rejected / manual review). */
export function resolveMajor(raw: string | undefined | null, mapped: { id: string; name: string }[]) {
  if (!raw) return null;
  const n = normalizeMajorName(raw);
  const canonical = MAJOR_ALIASES[n] ?? n;
  return mapped.find((m) => normalizeMajorName(m.name) === canonical)?.id ?? null;
}

/** Start of the fixed attempt window containing `now`. */
export function attemptWindowStart(now: Date) {
  const w = ATTEMPT_WINDOW_MINUTES * 60_000;
  return new Date(Math.floor(now.getTime() / w) * w);
}

/** Calendar date in Asia/Tehran (YYYY-MM-DD) — participation keeps only the date, never the exact time. */
export function tehranDate(now: Date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tehran', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

// ───────── Election lifecycle ─────────
export const ELECTION_FLOW = ['Draft', 'Candidacy Open', 'Candidate Review', 'Final List', 'Voting Open', 'Closed', 'Counting', 'Results Confirmed', 'Results Published', 'Archived'] as const;
export type ElectionStatus = (typeof ELECTION_FLOW)[number] | 'Cancelled';

/** Allowed moves: one step forward; Cancelled from any stage before counting. No way back once voting has opened. */
export function canTransition(from: string, to: string) {
  if (from === to) return true;
  if (to === 'Cancelled') return ELECTION_FLOW.indexOf(from as never) >= 0 && ELECTION_FLOW.indexOf(from as never) <= ELECTION_FLOW.indexOf('Closed');
  const i = ELECTION_FLOW.indexOf(from as never), j = ELECTION_FLOW.indexOf(to as never);
  if (i < 0 || j < 0) return false;
  if (j === i + 1) return true;
  // before voting, an admin may step back one stage to fix the candidate list
  return j === i - 1 && j >= 0 && i <= ELECTION_FLOW.indexOf('Final List');
}

/** Results (even counts) are visible to admins only after voting has closed — never live during voting. */
export const tallyAllowed = (status: string) => ['Closed', 'Counting', 'Results Confirmed', 'Results Published', 'Archived'].includes(status);
/** Voter list and candidate list are frozen from the final list onwards. */
export const listsLocked = (status: string) => !['Draft', 'Candidacy Open', 'Candidate Review'].includes(status);
