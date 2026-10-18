// Server-only helpers shared by endpoints (not an endpoint itself).
import { zite } from 'zitejs/db';
import { ZiteError } from 'zitejs/backend';

import { ROLE_ENTITIES, slugify, type Role } from './policy';
export { ROLE_ENTITIES, slugify };
export type { Role };
export type Access = { memberId: string; role: Role; associationId: string | null };

export const first = (v: string | string[] | undefined | null) =>
  Array.isArray(v) ? v[0] ?? null : v ?? null;
export const many = (v: string | string[] | undefined | null) =>
  Array.isArray(v) ? v : v ? [v] : [];

export async function getAccess(userId: string): Promise<Access | null> {
  const m = await zite.adminMembers.findOne({ filters: { member: userId, active: true } });
  if (!m || !m.role) return null;
  return { memberId: m.id, role: m.role as Role, associationId: first(m.association) };
}

export async function requireAccess(
  user: { id: string } | undefined,
  entity: string,
): Promise<Access> {
  if (!user) throw new ZiteError({ code: 'UNAUTHORIZED', message: 'no session', userFacingMessage: 'ابتدا وارد شوید.' });
  const access = await getAccess(user.id);
  if (!access || !ROLE_ENTITIES[access.role].includes(entity)) {
    throw new ZiteError({ code: 'FORBIDDEN', message: `forbidden: ${entity}`, userFacingMessage: 'شما به این بخش دسترسی ندارید.' });
  }
  return access;
}

export async function audit(
  user: { id: string; email: string },
  action: string,
  entity: string,
  entityId: string,
  details = '',
) {
  await zite.auditLogs.create({
    record: { action, entity, entityId, details: details.slice(0, 2000), actor: user.id || null, actorEmail: user.email || 'voter (anonymous)' },
  });
}


export async function getSettingsMap() {
  const { records } = await zite.siteSettings.findAll({ limit: 200 });
  const map: Record<string, string> = {};
  records.forEach((r) => r.key && (map[r.key] = r.value ?? ''));
  return map;
}

export const nowIso = () => new Date().toISOString();
