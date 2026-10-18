import { z } from 'zod';
import { createEndpoint, ZiteError } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { requireAccess, audit, first } from '../lib/server';

const ENTITY = z.enum(['associations', 'faculties', 'majors', 'news', 'events', 'categories', 'media', 'members', 'messages', 'years', 'associationYears', 'associationMajors', 'positions', 'terms', 'elections', 'candidates', 'voters']);
const TABLES = {
  elections: zite.elections, candidates: zite.candidates, voters: zite.eligibleVoters,
  associations: zite.associations, faculties: zite.faculties, majors: zite.majors, news: zite.news, events: zite.events,
  categories: zite.categories, media: zite.mediaAssets, members: zite.adminMembers, messages: zite.contactMessages,
  years: zite.academicYears, associationYears: zite.associationYears, associationMajors: zite.associationMajors, positions: zite.positions, terms: zite.leadershipTerms,
};

async function activeSuperAdminCount(): Promise<number> {
  const r = await zite.sql({ query: `SELECT COUNT(*)::int AS n FROM "AdminMembers" WHERE "role" = 'Super Admin' AND "active" = true` });
  return Number(r.rows[0]?.n ?? 0);
}

export default createEndpoint({
  description: 'Deletes a record from an admin section (role-checked, audited)',
  authenticated: true,
  inputSchema: z.object({ entity: ENTITY, id: z.string().min(1) }),
  outputSchema: z.object({ ok: z.boolean() }),
  execute: async ({ input, context }) => {
    const access = await requireAccess(context.user, input.entity);
    const table = TABLES[input.entity] as unknown as {
      findOne: (p: object) => Promise<Record<string, unknown> | undefined>;
      delete: (p: object) => Promise<unknown>;
    };
    const existing = await table.findOne({ id: input.id });
    if (!existing) throw new ZiteError({ code: 'NOT_FOUND', message: 'missing', userFacingMessage: 'مورد یافت نشد.' });
    if (access.role === 'Association Manager') {
      if (input.entity === 'media') throw new ZiteError({ code: 'FORBIDDEN', message: 'scope', userFacingMessage: 'حذف رسانه‌های مشترک فقط توسط ویراستار یا مدیر کل ممکن است.' });
      if (input.entity === 'associations') throw new ZiteError({ code: 'FORBIDDEN', message: 'scope', userFacingMessage: 'حذف انجمن فقط توسط مدیر کل ممکن است.' });
      if (['news', 'events'].includes(input.entity) && first(existing.association as string[]) !== access.associationId) {
        throw new ZiteError({ code: 'FORBIDDEN', message: 'scope', userFacingMessage: 'دسترسی به این مورد ندارید.' });
      }
    }
    if (input.entity === 'members' && first(existing.member as string[]) === context.user.id) {
      throw new ZiteError({ code: 'BAD_REQUEST', message: 'self', userFacingMessage: 'نمی‌توانید نقش خودتان را حذف کنید.' });
    }
    // Leadership history is never erased: ended/resigned terms are kept as records.
    if (input.entity === 'terms' && ['Ended', 'Resigned'].includes(String(existing.status))) {
      throw new ZiteError({ code: 'BAD_REQUEST', message: 'history', userFacingMessage: 'سوابق دوره‌های پایان‌یافته قابل حذف نیست.' });
    }
    if (input.entity === 'years') {
      const deps = await zite.associationYears.findAll({ filters: { academicYear: input.id }, limit: 1 });
      if (deps.records.length) throw new ZiteError({ code: 'BAD_REQUEST', message: 'deps', userFacingMessage: 'این سال انجمن ثبت‌شده دارد و قابل حذف نیست.' });
    }
    if (input.entity === 'faculties') {
      const deps = await zite.majors.findAll({ filters: { faculty: input.id }, limit: 1 });
      if (deps.records.length) throw new ZiteError({ code: 'BAD_REQUEST', message: 'deps', userFacingMessage: 'ابتدا رشته‌های این دانشکده را حذف یا منتقل کنید.' });
    }
    if (input.entity === 'members' && existing.role === 'Super Admin' && existing.active && (await activeSuperAdminCount()) <= 1) {
      throw new ZiteError({ code: 'BAD_REQUEST', message: 'last super admin', userFacingMessage: 'آخرین مدیر کل فعال را نمی‌توان حذف کرد.' });
    }
    if (input.entity === 'elections') {
      if (String(existing.status) !== 'Draft') throw new ZiteError({ code: 'BAD_REQUEST', message: 'state', userFacingMessage: 'فقط انتخابات «پیش‌نویس» قابل حذف است.' });
      const deps = await zite.sql({ query: `SELECT (SELECT COUNT(*) FROM "CandidatesElections" WHERE "electionsId" = $1) + (SELECT COUNT(*) FROM "ElectionsEligibleVoters" WHERE "electionsId" = $1) AS n`, params: [input.id] });
      if (Number(deps.rows[0]?.n) > 0) throw new ZiteError({ code: 'BAD_REQUEST', message: 'deps', userFacingMessage: 'ابتدا نامزدها و فهرست واجدین این انتخابات را حذف کنید.' });
    }
    if (input.entity === 'voters' || input.entity === 'candidates') {
      const el = await zite.elections.findOne({ id: first(existing.election as string[]) ?? '' });
      if (['Voting Open', 'Closed', 'Results Published'].includes(String(el?.status))) throw new ZiteError({ code: 'BAD_REQUEST', message: 'locked', userFacingMessage: 'پس از شروع رأی‌گیری قابل حذف نیست.' });
    }
    await table.delete({ id: input.id });
    await audit(context.user, 'delete', input.entity, input.id, String(existing.title ?? existing.name ?? existing.fullName ?? existing.studentNumber ?? existing.label ?? ''));
    return { ok: true };
  },
});
