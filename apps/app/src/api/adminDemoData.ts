import { z } from 'zod';
import { createEndpoint, ZiteError } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { getAccess, audit } from '../lib/server';

// Demo data lives only in the Zite preview database (seeded by a one-off script, never in the repo).
// Order matters: children before parents. Real records (isDemo = false) are never touched.
const TABLES = [
  'candidates', 'elections', 'leadershipTerms', 'positions', 'news', 'events',
  'associationMajors', 'associationYears', 'academicYears', 'associations', 'majors', 'faculties',
] as const;
const SQL_NAME: Record<(typeof TABLES)[number], string> = {
  candidates: 'Candidates', elections: 'Elections', leadershipTerms: 'LeadershipTerms', positions: 'Positions',
  news: 'News', events: 'Events', associationMajors: 'AssociationMajors', associationYears: 'AssociationYears',
  academicYears: 'AcademicYears', associations: 'Associations', majors: 'Majors', faculties: 'Faculties',
};

type Tbl = { delete: (p: { id: string }) => Promise<unknown> };

export default createEndpoint({
  description: 'Counts or removes all demo (isDemo) records — Super Admin only',
  authenticated: true,
  inputSchema: z.object({ action: z.enum(['count', 'remove']), confirm: z.string().optional() }),
  outputSchema: z.object({ total: z.number(), removed: z.number() }),
  execute: async ({ input, context }) => {
    const access = await getAccess(context.user.id);
    if (access?.role !== 'Super Admin') throw new ZiteError({ code: 'FORBIDDEN', message: 'demo', userFacingMessage: 'فقط مدیر کل می‌تواند داده‌ی نمایشی را مدیریت کند.' });
    const ids: Record<string, string[]> = {};
    let total = 0;
    for (const t of TABLES) {
      const r = await zite.sql({ query: `SELECT id FROM "${SQL_NAME[t]}" WHERE "isDemo" = true` });
      ids[t] = r.rows.map((x) => String(x.id));
      total += ids[t].length;
    }
    if (input.action === 'count') return { total, removed: 0 };
    if (input.confirm !== 'حذف داده نمایشی') throw new ZiteError({ code: 'BAD_REQUEST', message: 'confirm', userFacingMessage: 'عبارت تأیید درست وارد نشده است.' });
    let removed = 0;
    for (const t of TABLES) {
      const table = zite[t] as unknown as Tbl;
      for (const id of ids[t]) { await table.delete({ id }); removed++; }
    }
    await audit(context.user, 'demo_remove', 'demo', '-', `${removed} demo records removed`);
    return { total, removed };
  },
});
