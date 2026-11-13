import { z } from 'zod';
import { createEndpoint, ZiteError } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { requireAccess, audit } from '../lib/server';
import { normalizeNationalId, normalizeStudentNumber } from '../lib/policy';
import { hashNationalId, requirePepper } from '../lib/voterHash';
import { placeVoter, normalizeMajor, choiceGroupKey } from '../lib/majorMap';

const Row = z.object({ studentNumber: z.string().max(40), nationalId: z.string().max(40), fullName: z.string().max(200).optional(), majorName: z.string().max(200).optional(), facultyName: z.string().max(200).optional() });
const EDITABLE = ['Draft', 'Candidacy Open', 'Candidate Review', 'Final List'];

// کل فهرست دانشگاه یک‌جا: هر دانشجو با majorMap به انتخابات انجمن رشته‌اش می‌رود.
// دانشجویانی که از قبل هستند دوباره ساخته نمی‌شوند. گزارش هیچ شماره دانشجویی یا کد ملی ندارد.
export default createEndpoint({
  description: 'Imports the whole university student list into every association election of an academic year',
  authenticated: true,
  inputSchema: z.object({ academicYear: z.string().min(1).max(20), rows: z.array(Row).max(8000), dryRun: z.boolean() }),
  outputSchema: z.object({
    total: z.number(), ready: z.number(), imported: z.number(), alreadyPresent: z.number(),
    invalidStudentNumber: z.number(), invalidNationalId: z.number(), duplicateInFile: z.number(),
    perAssociation: z.array(z.object({ association: z.string(), status: z.string(), inFile: z.number(), alreadyPresent: z.number(), toAdd: z.number(), locked: z.boolean() })),
    noAssociation: z.array(z.object({ majorName: z.string(), count: z.number() })),
    missingElection: z.array(z.object({ association: z.string(), count: z.number() })),
    /** رشته‌های بدون انجمن که در «یکی از» انجمن‌های دانشکده‌شان رأی می‌دهند */
    facultyPools: z.array(z.object({ faculty: z.string(), associations: z.number(), students: z.number(), toAdd: z.number(), majors: z.array(z.object({ majorName: z.string(), count: z.number() })) })),
  }),
  execute: async ({ input, context }) => {
    await requireAccess(context.user, 'voters');
    requirePepper();
    const els = await zite.sql({
      query: `SELECT e.id, e.status, a.slug, a.name FROM "Elections" e
        JOIN "AssociationYearsElections" l ON l."electionsId" = e.id
        JOIN "AssociationYearsAssociations" la ON la."associationYearsId" = l."associationYearsId"
        JOIN "Associations" a ON a.id = la."associationsId"
        JOIN "AcademicYearsAssociationYears" ly ON ly."associationYearsId" = l."associationYearsId"
        JOIN "AcademicYears" y ON y.id = ly."academicYearsId"
        WHERE y.title = $1 AND e.status <> 'Cancelled'`,
      params: [input.academicYear],
    });
    if (!els.rows.length) throw new ZiteError({ code: 'NOT_FOUND', message: 'year', userFacingMessage: 'برای این سال تحصیلی انتخاباتی ثبت نشده است.' });
    const bySlug = new Map(els.rows.map((r) => [String(r.slug), r]));
    const majors = new Map((await zite.sql({ query: `SELECT id, name FROM "Majors"` })).rows.map((r) => [normalizeMajor(r.name), String(r.id)]));
    const existing = await zite.sql({ query: `SELECT "electionId" AS eid, "studentNumber" AS sn FROM "EligibleVoters" WHERE "electionId" = ANY($1)`, params: [els.rows.map((r) => r.id)] });
    const present = new Set(existing.rows.map((r) => `${r.eid}:${r.sn}`));

    const per = new Map<string, { association: string; status: string; inFile: number; alreadyPresent: number; toAdd: number; locked: boolean }>();
    const noAssoc = new Map<string, number>(); const missing = new Map<string, number>();
    const pools = new Map<string, { faculty: string; associations: number; students: number; toAdd: number; majors: Map<string, number> }>();
    const seen = new Set<string>(); const records: Record<string, unknown>[] = [];
    let badSn = 0, badNid = 0, dup = 0, already = 0;
    for (const r of input.rows) {
      const sn = normalizeStudentNumber(r.studentNumber); const nid = normalizeNationalId(r.nationalId);
      if (!sn) { badSn++; continue; }
      if (!nid) { badNid++; continue; }
      if (seen.has(sn)) { dup++; continue; }
      seen.add(sn);
      const place = placeVoter(r.majorName, r.facultyName);
      const majorName = normalizeMajor(r.majorName) || '(رشته خالی)';
      if (!place) { noAssoc.set(majorName, (noAssoc.get(majorName) ?? 0) + 1); continue; }
      if (place.kind === 'faculty') {
        // یک ردیف در هر انجمن دانشکده، همه با یک choiceGroup؛ دانشجو فقط در یکی رأی می‌دهد
        const group = choiceGroupKey(place.faculty, input.academicYear);
        const fp = pools.get(place.faculty) ?? { faculty: place.facultyName, associations: 0, students: 0, toAdd: 0, majors: new Map<string, number>() };
        pools.set(place.faculty, fp); fp.students++; fp.majors.set(majorName, (fp.majors.get(majorName) ?? 0) + 1);
        const targets = place.associations.map((a) => bySlug.get(a.slug)).filter((e): e is NonNullable<typeof e> => !!e);
        fp.associations = Math.max(fp.associations, targets.length);
        if (!targets.length) { missing.set(place.facultyName, (missing.get(place.facultyName) ?? 0) + 1); continue; }
        const majorId = majors.get(normalizeMajor(place.major));
        let anyPresent = false;
        for (const e of targets) {
          if (present.has(`${e.id}:${sn}`)) { anyPresent = true; continue; }
          if (!EDITABLE.includes(String(e.status))) continue;
          fp.toAdd++;
          records.push({
            studentNumber: sn, election: [String(e.id)], major: majorId ? [majorId] : [], fullName: r.fullName?.trim().slice(0, 150) || null,
            majorName: majorName.slice(0, 150), nationalIdHash: await hashNationalId(String(e.id), nid), nationalIdLast4: nid.slice(-4), choiceGroup: group,
          });
        }
        if (anyPresent) already++;
        continue;
      }
      const rule = place.rule;
      const e = bySlug.get(rule.slug); const majorId = majors.get(normalizeMajor(rule.major));
      if (!e || !majorId) { missing.set(rule.association, (missing.get(rule.association) ?? 0) + 1); continue; }
      const p = per.get(rule.slug) ?? { association: String(e.name), status: String(e.status), inFile: 0, alreadyPresent: 0, toAdd: 0, locked: !EDITABLE.includes(String(e.status)) };
      per.set(rule.slug, p); p.inFile++;
      if (present.has(`${e.id}:${sn}`)) { p.alreadyPresent++; already++; continue; }
      if (p.locked) continue;
      p.toAdd++;
      records.push({
        studentNumber: sn, election: [String(e.id)], major: [majorId], fullName: r.fullName?.trim().slice(0, 150) || null,
        majorName: majorName.slice(0, 150), nationalIdHash: await hashNationalId(String(e.id), nid), nationalIdLast4: nid.slice(-4),
      });
    }
    if (!input.dryRun) {
      for (let i = 0; i < records.length; i += 100) await zite.eligibleVoters.bulkCreate({ records: records.slice(i, i + 100) as never });
      await audit(context.user, 'create', 'voters', `all-${input.academicYear}`, `auto-import: ${records.length} new, ${already} present, ${[...noAssoc.values()].reduce((a, b) => a + b, 0)} without association`);
    }
    return {
      total: input.rows.length, ready: records.length, imported: input.dryRun ? 0 : records.length, alreadyPresent: already,
      invalidStudentNumber: badSn, invalidNationalId: badNid, duplicateInFile: dup,
      perAssociation: [...per.values()].sort((a, b) => b.inFile - a.inFile),
      noAssociation: [...noAssoc].map(([majorName, count]) => ({ majorName, count })).sort((a, b) => b.count - a.count),
      missingElection: [...missing].map(([association, count]) => ({ association, count })),
      facultyPools: [...pools.values()].map((p) => ({ ...p, majors: [...p.majors].map(([majorName, count]) => ({ majorName, count })) })),
    };
  },
});
