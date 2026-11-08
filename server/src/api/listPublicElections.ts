import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { syncAllDue } from '../lib/electionClock';
import { RESULT_STAGES } from '../lib/policy';

const str = (v: unknown) => (v == null ? null : v instanceof Date ? v.toISOString() : String(v));
const Cand = z.object({ id: z.string(), fullName: z.string(), statement: z.string().nullable(), photoUrl: z.string().nullable(), votes: z.number().nullable() });
type DemoResults = { eligible: number; turnout: number; blank?: number; votes: Record<string, number> };

export default createEndpoint({
  description: 'Lists announced elections with approved candidates; vote counts only after results are published',
  inputSchema: z.object({}),
  outputSchema: z.object({
    hasDemo: z.boolean(),
    elections: z.array(z.object({
      id: z.string(), title: z.string(), association: z.string().nullable(), associationId: z.string().nullable(), associationSlug: z.string().nullable(),
      academicYear: z.string().nullable(), status: z.string(), isDemo: z.boolean(),
      candidacyStart: z.string().nullable(), candidacyEnd: z.string().nullable(), votingStart: z.string().nullable(), votingEnd: z.string().nullable(),
      seats: z.number(), maxChoicesPerVoter: z.number(), description: z.string().nullable(), votingOpenNow: z.boolean(),
      resultsVisible: z.boolean(), turnout: z.number().nullable(), eligible: z.number().nullable(), blank: z.number().nullable(), candidates: z.array(Cand),
    })),
  }),
  execute: async () => {
    await syncAllDue();
    const els = await zite.sql({ query: `
      SELECT e.id, e.title, e.status, e."candidacyStart", e."candidacyEnd", e."votingStart", e."votingEnd", e.seats, e."maxChoicesPerVoter", e.description,
             e."isDemo", e."demoResults", a.id AS aid, a.name AS association, a.slug AS aslug, y.title AS year
      FROM "Elections" e
      LEFT JOIN "AssociationYearsElections" l ON l."electionsId" = e.id
      LEFT JOIN "AssociationYearsAssociations" la ON la."associationYearsId" = l."associationYearsId"
      LEFT JOIN "Associations" a ON a.id = la."associationsId"
      LEFT JOIN "AcademicYearsAssociationYears" ly ON ly."associationYearsId" = l."associationYearsId"
      LEFT JOIN "AcademicYears" y ON y.id = ly."academicYearsId"
      WHERE e.status NOT IN ('Draft', 'Cancelled') ORDER BY e."votingStart" DESC NULLS LAST` });
    const ids = els.rows.map((r) => r.id);
    if (!ids.length) return { hasDemo: false, elections: [] };
    const stages: string[] = [...RESULT_STAGES];
    const [cands, counts, stats] = await Promise.all([
      zite.sql({ query: `SELECT c.id, c."fullName", c.statement, c."photoUrl", l."electionsId" AS eid FROM "Candidates" c JOIN "CandidatesElections" l ON l."candidatesId" = c.id WHERE c.status = 'Approved' AND l."electionsId" = ANY($1) ORDER BY c."fullName"`, params: [ids] }),
      // Ballots are read only for elections whose results are public — never before
      zite.sql({ query: `SELECT l."electionsId" AS eid, b."candidateIds" AS ids FROM "Ballots" b JOIN "BallotsElections" l ON l."ballotsId" = b.id JOIN "Elections" e ON e.id = l."electionsId" WHERE e.status = ANY($1)`, params: [stages] }),
      zite.sql({ query: `SELECT e.id, (SELECT COUNT(*) FROM "ElectionsVoterParticipation" p WHERE p."electionsId" = e.id)::int AS turnout, (SELECT COUNT(*) FROM "ElectionsEligibleVoters" v WHERE v."electionsId" = e.id)::int AS eligible FROM "Elections" e WHERE e.status = ANY($1)`, params: [stages] }),
    ]);
    const tally = new Map<string, number>();
    const blankByElection = new Map<string, number>();
    for (const b of counts.rows) {
      const list = String(b.ids ?? '').split(',').filter(Boolean);
      if (!list.length) blankByElection.set(String(b.eid), (blankByElection.get(String(b.eid)) ?? 0) + 1);
      for (const cid of list) tally.set(cid, (tally.get(cid) ?? 0) + 1);
    }
    const now = new Date().toISOString();
    let hasDemo = false;
    const elections = els.rows.map((e) => {
      const isDemo = e.isDemo === true;
      hasDemo ||= isDemo;
      const visible = stages.includes(String(e.status));
      const demo: DemoResults | null = isDemo && visible && e.demoResults ? JSON.parse(String(e.demoResults)) : null;
      const st = stats.rows.find((s) => s.id === e.id);
      const list = cands.rows.filter((c) => c.eid === e.id).map((c) => ({
        id: String(c.id), fullName: String(c.fullName), statement: str(c.statement), photoUrl: str(c.photoUrl),
        votes: !visible ? null : demo ? demo.votes[String(c.id)] ?? 0 : tally.get(String(c.id)) ?? 0,
      }));
      if (visible) list.sort((a, b) => (b.votes ?? 0) - (a.votes ?? 0));
      const open = e.status === 'Voting Open' && !!e.votingStart && !!e.votingEnd && str(e.votingStart)! <= now && now <= str(e.votingEnd)!;
      return {
        id: String(e.id), title: String(e.title ?? ''), association: str(e.association), associationId: str(e.aid), associationSlug: str(e.aslug),
        academicYear: str(e.year), status: String(e.status), isDemo,
        candidacyStart: str(e.candidacyStart), candidacyEnd: str(e.candidacyEnd), votingStart: str(e.votingStart), votingEnd: str(e.votingEnd),
        seats: Number(e.seats ?? 0), maxChoicesPerVoter: Number(e.maxChoicesPerVoter ?? 1), description: str(e.description),
        votingOpenNow: open && !isDemo, // demo elections never accept votes
        resultsVisible: visible,
        turnout: !visible ? null : demo ? demo.turnout : Number(st?.turnout ?? 0),
        eligible: !visible ? null : demo ? demo.eligible : Number(st?.eligible ?? 0),
        blank: !visible ? null : demo ? demo.blank ?? 0 : blankByElection.get(String(e.id)) ?? 0,
        candidates: list,
      };
    });
    return { hasDemo, elections };
  },
});
