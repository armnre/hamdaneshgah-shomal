import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { requireAccess, first } from '../lib/server';

const ENTITY = z.enum(['associations', 'faculties', 'majors', 'news', 'events', 'categories', 'media', 'members', 'settings', 'messages', 'audit', 'years', 'associationYears', 'associationMajors', 'positions', 'terms', 'elections', 'candidates', 'voters']);

const tableOf = (e: z.infer<typeof ENTITY>) => ({
  elections: zite.elections, candidates: zite.candidates, voters: zite.eligibleVoters,
  associations: zite.associations, faculties: zite.faculties, majors: zite.majors, news: zite.news,
  events: zite.events, categories: zite.categories, media: zite.mediaAssets, members: zite.adminMembers,
  settings: zite.siteSettings, messages: zite.contactMessages, audit: zite.auditLogs,
  years: zite.academicYears, associationYears: zite.associationYears, associationMajors: zite.associationMajors, positions: zite.positions, terms: zite.leadershipTerms,
}[e]);

export default createEndpoint({
  description: 'Lists records of one admin section, scoped to the caller\'s role',
  authenticated: true,
  inputSchema: z.object({ entity: ENTITY }),
  outputSchema: z.any(),
  execute: async ({ input, context }) => {
    const access = await requireAccess(context.user, input.entity);
    const table = tableOf(input.entity) as unknown as { findAll: (p: object) => Promise<{ records: Record<string, unknown>[] }> };
    const { records } = await table.findAll({ limit: 2000 });
    let rows = records.map((r) => {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(r)) out[k] = Array.isArray(v) && ['faculty', 'major', 'category', 'association', 'member', 'actor', 'academicYear', 'associationYear', 'position', 'election'].includes(k) ? first(v as string[]) : v;
      delete out.nationalIdHash;
      return out;
    });
    if (access.role === 'Association Manager') {
      rows = input.entity === 'associations'
        ? rows.filter((r) => r.id === access.associationId)
        : ['news', 'events'].includes(input.entity) ? rows.filter((r) => r.association === access.associationId) : rows;
    }
    if (input.entity === 'members') {
      const ids = rows.map((r) => r.member).filter(Boolean) as string[];
      if (ids.length) {
        const users = await zite.sql({ query: `SELECT "id", "email", "name" FROM "ziteUsers" WHERE "id" = ANY($1)`, params: [ids] });
        rows = rows.map((r) => ({ ...r, email: users.rows.find((u) => u.id === r.member)?.email ?? '', userName: users.rows.find((u) => u.id === r.member)?.name ?? '' }));
      }
    }
    if (input.entity === 'audit') rows.sort((a, b) => String(b.loggedAt).localeCompare(String(a.loggedAt)));
    if (input.entity === 'messages') rows.sort((a, b) => String(b.receivedAt).localeCompare(String(a.receivedAt)));
    return { rows };
  },
});
