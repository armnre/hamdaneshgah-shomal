import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';

const str = (v: unknown) => (v == null ? null : v instanceof Date ? v.toISOString() : String(v));
const Cand = z.object({ id: z.string(), fullName: z.string(), statement: z.string().nullable(), photoUrl: z.string().nullable(), votes: z.number().nullable() });

export default createEndpoint({
  description: 'Lists announced elections with approved candidates; vote counts only after results are published',
  inputSchema: z.object({}),
  outputSchema: z.object({
    elections: z.array(z.object({
      id: z.string(), title: z.string(), association: z.string().nullable(), status: z.string(),
      candidacyStart: z.string().nullable(), candidacyEnd: z.string().nullable(), votingStart: z.string().nullable(), votingEnd: z.string().nullable(),
      seats: z.number(), maxChoicesPerVoter: z.number(), description: z.string().nullable(), votingOpenNow: z.boolean(),
      turnout: z.number().nullable(), eligible: z.number().nullable(), candidates: z.array(Cand),
    })),
  }),
  execute: async () => {
    const els = await zite.sql({ query: `
      SELECT e.id, e.title, e.status, e."candidacyStart", e."candidacyEnd", e."votingStart", e."votingEnd", e.seats, e."maxChoicesPerVoter", e.description, ay.title AS association
      FROM "Elections" e
      LEFT JOIN "AssociationYearsElections" l ON l."electionsId" = e.id
      LEFT JOIN "AssociationYears" ay ON ay.id = l."associationYearsId"
      WHERE e.status <> 'Draft' ORDER BY e."votingStart" DESC NULLS LAST` });
    const ids = els.rows.map((r) => r.id);
    if (!ids.length) return { elections: [] };
    const [cands, counts] = await Promise.all([
      zite.sql({ query: `SELECT c.id, c."fullName", c.statement, c."photoUrl", l."electionsId" AS eid FROM "Candidates" c JOIN "CandidatesElections" l ON l."candidatesId" = c.id WHERE c.status = 'Approved' AND l."electionsId" = ANY($1) ORDER BY c."fullName"`, params: [ids] }),
      zite.sql({ query: `SELECT l."electionsId" AS eid, b."candidateIds" AS ids FROM "Ballots" b JOIN "BallotsElections" l ON l."ballotsId" = b.id JOIN "Elections" e ON e.id = l."electionsId" WHERE e.status = 'Results Published'` }),
    ]);
    const stats = await zite.sql({ query: `SELECT e.id, (SELECT COUNT(*) FROM "ElectionsVoterParticipation" p WHERE p."electionsId" = e.id)::int AS turnout, (SELECT COUNT(*) FROM "ElectionsEligibleVoters" v WHERE v."electionsId" = e.id)::int AS eligible FROM "Elections" e WHERE e.status = 'Results Published'` });
    const tally = new Map<string, number>();
    for (const b of counts.rows) for (const cid of String(b.ids ?? '').split(',').filter(Boolean)) tally.set(cid, (tally.get(cid) ?? 0) + 1);
    const now = new Date().toISOString();
    return {
      elections: els.rows.map((e) => {
        const published = e.status === 'Results Published';
        const st = stats.rows.find((s) => s.id === e.id);
        const list = cands.rows.filter((c) => c.eid === e.id).map((c) => ({ id: String(c.id), fullName: String(c.fullName), statement: str(c.statement), photoUrl: str(c.photoUrl), votes: published ? tally.get(String(c.id)) ?? 0 : null }));
        if (published) list.sort((a, b) => (b.votes ?? 0) - (a.votes ?? 0));
        return {
          id: String(e.id), title: String(e.title ?? ''), association: str(e.association), status: String(e.status),
          candidacyStart: str(e.candidacyStart), candidacyEnd: str(e.candidacyEnd), votingStart: str(e.votingStart), votingEnd: str(e.votingEnd),
          seats: Number(e.seats ?? 0), maxChoicesPerVoter: Number(e.maxChoicesPerVoter ?? 1), description: str(e.description),
          votingOpenNow: e.status === 'Voting Open' && !!e.votingStart && !!e.votingEnd && str(e.votingStart)! <= now && now <= str(e.votingEnd)!,
          turnout: published ? st?.turnout ?? 0 : null, eligible: published ? st?.eligible ?? 0 : null, candidates: list,
        };
      }),
    };
  },
});
