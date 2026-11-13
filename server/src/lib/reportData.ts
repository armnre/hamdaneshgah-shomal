// خواندن داده‌ی گزارش رسمی از پایگاه داده (فقط برای انتخاباتی که شمارش‌شان مجاز است).
import { zite } from 'zitejs/db';
import { buildElectionReport, type ElectionReport } from './electionReport';

const iso = (v: unknown) => (v == null ? null : v instanceof Date ? v.toISOString() : String(v));

/** همه‌ی گزارش‌های انتخابات با وضعیت‌های داده‌شده (یا یک انتخابات). */
export async function loadReports(statuses: readonly string[], electionId?: string): Promise<ElectionReport[]> {
  const params: unknown[] = [[...statuses]];
  if (electionId) params.push(electionId);
  const els = await zite.sql({
    query: `SELECT e.id, e.title, e.status, e.seats, e."maxChoicesPerVoter", e."votingStart", e."votingEnd", a.name AS association, y.title AS year
      FROM "Elections" e
      LEFT JOIN "AssociationYearsElections" l ON l."electionsId" = e.id
      LEFT JOIN "AssociationYearsAssociations" la ON la."associationYearsId" = l."associationYearsId"
      LEFT JOIN "Associations" a ON a.id = la."associationsId"
      LEFT JOIN "AcademicYearsAssociationYears" ly ON ly."associationYearsId" = l."associationYearsId"
      LEFT JOIN "AcademicYears" y ON y.id = ly."academicYearsId"
      WHERE e.status = ANY($1) AND e."isDemo" = false ${electionId ? 'AND e.id = $2' : ''}
      ORDER BY a.name NULLS LAST, e.title`,
    params,
  });
  const ids = els.rows.map((r) => String(r.id));
  if (!ids.length) return [];
  const [cands, ballots, stats] = await Promise.all([
    zite.sql({ query: `SELECT c.id, c."fullName", l."electionsId" AS eid FROM "Candidates" c JOIN "CandidatesElections" l ON l."candidatesId" = c.id WHERE c.status = 'Approved' AND l."electionsId" = ANY($1)`, params: [ids] }),
    zite.sql({ query: `SELECT l."electionsId" AS eid, b."candidateIds" AS ids FROM "Ballots" b JOIN "BallotsElections" l ON l."ballotsId" = b.id WHERE l."electionsId" = ANY($1)`, params: [ids] }),
    zite.sql({ query: `SELECT e.id, (SELECT COUNT(*) FROM "ElectionsVoterParticipation" p WHERE p."electionsId" = e.id)::int AS turnout,
        (SELECT COUNT(*) FROM "EligibleVoters" v WHERE v."electionId" = e.id AND (v."choiceGroup" IS NULL OR EXISTS (SELECT 1 FROM "VoterParticipation" p WHERE p."voterId" = v.id)))::int AS eligible
        FROM "Elections" e WHERE e.id = ANY($1)`, params: [ids] }),
  ]);
  const generatedAt = new Date().toISOString();
  return Promise.all(els.rows.map((e) => {
    const id = String(e.id), st = stats.rows.find((s) => String(s.id) === id);
    return buildElectionReport({
      election: { id, title: String(e.title ?? ''), association: iso(e.association), academicYear: iso(e.year), status: String(e.status), seats: Number(e.seats ?? 1), maxChoicesPerVoter: Number(e.maxChoicesPerVoter ?? 1), votingStart: iso(e.votingStart), votingEnd: iso(e.votingEnd) },
      candidates: cands.rows.filter((c) => String(c.eid) === id).map((c) => ({ id: String(c.id), fullName: String(c.fullName) })),
      ballots: ballots.rows.filter((b) => String(b.eid) === id).map((b) => String(b.ids ?? '').split(',').filter(Boolean)),
      eligible: Number(st?.eligible ?? 0), turnout: Number(st?.turnout ?? 0), generatedAt,
    });
  }));
}
