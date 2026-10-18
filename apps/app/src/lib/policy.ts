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
