// Pure authorization/validation rules — no platform imports, so they are unit-testable.
export type Role = 'Super Admin' | 'Content Editor' | 'Association Manager';

export const ROLE_ENTITIES: Record<Role, string[]> = {
  'Super Admin': ['associations', 'faculties', 'majors', 'news', 'events', 'categories', 'media', 'members', 'settings', 'messages', 'audit'],
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
