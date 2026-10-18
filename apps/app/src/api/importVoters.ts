import { z } from 'zod';
import { createEndpoint, ZiteError } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { requireAccess, audit } from '../lib/server';
import { normalizeNationalId, normalizeStudentNumber, resolveMajor } from '../lib/policy';
import { hashNationalId, requirePepper, mappedMajors } from '../lib/voterHash';

const Row = z.object({ studentNumber: z.string(), nationalId: z.string(), fullName: z.string().optional(), majorName: z.string().optional() });

// Error messages carry only the row number — never a student number or national ID.
export default createEndpoint({
  description: 'Validates and imports an eligible-voter list into an election (dry run supported)',
  authenticated: true,
  inputSchema: z.object({ electionId: z.string().min(1), rows: z.array(Row).max(5000), dryRun: z.boolean() }),
  outputSchema: z.object({
    valid: z.number(), imported: z.number(), needsReview: z.number(),
    errors: z.array(z.object({ row: z.number(), message: z.string() })),
  }),
  execute: async ({ input, context }) => {
    await requireAccess(context.user, 'voters');
    requirePepper(); // fail closed before touching any row
    const election = await zite.elections.findOne({ id: input.electionId });
    if (!election) throw new ZiteError({ code: 'NOT_FOUND', message: 'election', userFacingMessage: 'انتخابات یافت نشد.' });
    if (!['Draft', 'Candidacy Open', 'Candidate Review'].includes(String(election.status))) {
      throw new ZiteError({ code: 'BAD_REQUEST', message: 'locked', userFacingMessage: 'پس از شروع رأی‌گیری، فهرست واجدین قابل تغییر نیست.' });
    }
    const majors = await mappedMajors(input.electionId);
    if (!majors.length) throw new ZiteError({ code: 'BAD_REQUEST', message: 'no mapping', userFacingMessage: 'هیچ رشته‌ای به انجمن این انتخابات (در سال تحصیلی آن) نگاشت نشده است. ابتدا نگاشت رشته به انجمن را تکمیل کنید.' });

    const existing = await zite.sql({
      query: `SELECT v."studentNumber" FROM "EligibleVoters" v JOIN "ElectionsEligibleVoters" l ON l."eligibleVotersId" = v.id WHERE l."electionsId" = $1`,
      params: [input.electionId],
    });
    const seen = new Set(existing.rows.map((r) => String(r.studentNumber)));
    const errors: { row: number; message: string }[] = [];
    const records: Record<string, unknown>[] = [];
    let needsReview = 0;
    for (const [i, r] of input.rows.entries()) {
      const row = i + 1;
      const sn = normalizeStudentNumber(r.studentNumber);
      const nid = normalizeNationalId(r.nationalId);
      if (!sn) { errors.push({ row, message: 'شماره دانشجویی نامعتبر است' }); continue; }
      if (!nid) { errors.push({ row, message: 'کد ملی نامعتبر است' }); continue; }
      const majorId = resolveMajor(r.majorName, majors);
      if (!majorId) {
        needsReview++;
        errors.push({ row, message: r.majorName?.trim() ? 'رشته به انجمن این انتخابات نگاشت نشده است — نیازمند بررسی دستی' : 'رشته خالی است — نیازمند بررسی دستی' });
        continue;
      }
      if (seen.has(sn)) { errors.push({ row, message: 'شماره دانشجویی تکراری است' }); continue; }
      seen.add(sn);
      records.push({
        studentNumber: sn, election: [input.electionId], major: [majorId], fullName: r.fullName?.trim().slice(0, 150) || null,
        majorName: r.majorName?.trim().slice(0, 150) || null, nationalIdHash: await hashNationalId(input.electionId, nid), nationalIdLast4: nid.slice(-4),
      });
    }
    if (input.dryRun) return { valid: records.length, imported: 0, needsReview, errors };
    for (let i = 0; i < records.length; i += 100) await zite.eligibleVoters.bulkCreate({ records: records.slice(i, i + 100) as never });
    await audit(context.user, 'create', 'voters', input.electionId, `imported ${records.length} voters, ${errors.length} rejected (${needsReview} need manual review)`);
    return { valid: records.length, imported: records.length, needsReview, errors };
  },
});
