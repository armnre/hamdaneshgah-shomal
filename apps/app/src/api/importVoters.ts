import { z } from 'zod';
import { createEndpoint, ZiteError } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { requireAccess, audit } from '../lib/server';
import { normalizeNationalId, normalizeStudentNumber } from '../lib/policy';
import { hashNationalId } from '../lib/voterHash';

const Row = z.object({ studentNumber: z.string(), nationalId: z.string(), fullName: z.string().optional(), majorName: z.string().optional() });

export default createEndpoint({
  description: 'Validates and imports an eligible-voter list into an election (dry run supported)',
  authenticated: true,
  inputSchema: z.object({ electionId: z.string().min(1), rows: z.array(Row).max(5000), dryRun: z.boolean() }),
  outputSchema: z.object({
    valid: z.number(), imported: z.number(),
    errors: z.array(z.object({ row: z.number(), message: z.string() })),
  }),
  execute: async ({ input, context }) => {
    await requireAccess(context.user, 'voters');
    const election = await zite.elections.findOne({ id: input.electionId });
    if (!election) throw new ZiteError({ code: 'NOT_FOUND', message: 'election', userFacingMessage: 'انتخابات یافت نشد.' });
    if (['Voting Open', 'Closed', 'Results Published'].includes(String(election.status))) {
      throw new ZiteError({ code: 'BAD_REQUEST', message: 'locked', userFacingMessage: 'پس از شروع رأی‌گیری، فهرست واجدین قابل تغییر نیست.' });
    }
    const existing = await zite.sql({
      query: `SELECT v."studentNumber" FROM "EligibleVoters" v JOIN "ElectionsEligibleVoters" l ON l."eligibleVotersId" = v.id WHERE l."electionsId" = $1`,
      params: [input.electionId],
    });
    const seen = new Set(existing.rows.map((r) => String(r.studentNumber)));
    const errors: { row: number; message: string }[] = [];
    const records: Record<string, unknown>[] = [];
    for (const [i, r] of input.rows.entries()) {
      const row = i + 1;
      const sn = normalizeStudentNumber(r.studentNumber);
      const nid = normalizeNationalId(r.nationalId);
      if (!sn) { errors.push({ row, message: 'شماره دانشجویی نامعتبر است' }); continue; }
      if (!nid) { errors.push({ row, message: 'کد ملی نامعتبر است' }); continue; }
      if (seen.has(sn)) { errors.push({ row, message: `شماره دانشجویی ${sn} تکراری است` }); continue; }
      seen.add(sn);
      records.push({
        studentNumber: sn, election: [input.electionId], fullName: r.fullName?.trim().slice(0, 150) || null,
        majorName: r.majorName?.trim().slice(0, 150) || null, nationalIdHash: await hashNationalId(input.electionId, nid), nationalIdLast4: nid.slice(-4),
      });
    }
    if (input.dryRun) return { valid: records.length, imported: 0, errors };
    for (let i = 0; i < records.length; i += 100) await zite.eligibleVoters.bulkCreate({ records: records.slice(i, i + 100) as never });
    await audit(context.user, 'create', 'voters', input.electionId, `imported ${records.length} voters, ${errors.length} rejected`);
    return { valid: records.length, imported: records.length, errors };
  },
});
