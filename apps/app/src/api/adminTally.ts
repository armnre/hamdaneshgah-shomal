import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { requireAccess, audit } from '../lib/server';

export default createEndpoint({
  description: 'Counts ballots of one election for the admin panel',
  authenticated: true,
  inputSchema: z.object({ electionId: z.string().min(1) }),
  outputSchema: z.object({
    eligible: z.number(), turnout: z.number(), ballots: z.number(), status: z.string(),
    results: z.array(z.object({ id: z.string(), fullName: z.string(), votes: z.number() })),
  }),
  execute: async ({ input, context }) => {
    await requireAccess(context.user, 'elections');
    const e = await zite.elections.findOne({ id: input.electionId });
    const [cands, ballots, stats] = await Promise.all([
      zite.sql({ query: `SELECT c.id, c."fullName" FROM "Candidates" c JOIN "CandidatesElections" l ON l."candidatesId" = c.id WHERE l."electionsId" = $1 AND c.status = 'Approved'`, params: [input.electionId] }),
      zite.sql({ query: `SELECT b."candidateIds" AS ids FROM "Ballots" b JOIN "BallotsElections" l ON l."ballotsId" = b.id WHERE l."electionsId" = $1`, params: [input.electionId] }),
      zite.sql({ query: `SELECT (SELECT COUNT(*) FROM "ElectionsEligibleVoters" WHERE "electionsId" = $1)::int AS eligible, (SELECT COUNT(*) FROM "ElectionsVoterParticipation" WHERE "electionsId" = $1)::int AS turnout`, params: [input.electionId] }),
    ]);
    const tally = new Map<string, number>();
    for (const b of ballots.rows) for (const id of String(b.ids ?? '').split(',').filter(Boolean)) tally.set(id, (tally.get(id) ?? 0) + 1);
    await audit(context.user, 'tally', 'elections', input.electionId, `${ballots.rows.length} ballots`);
    return {
      status: String(e?.status ?? ''), eligible: Number(stats.rows[0]?.eligible ?? 0), turnout: Number(stats.rows[0]?.turnout ?? 0), ballots: ballots.rows.length,
      results: cands.rows.map((c) => ({ id: String(c.id), fullName: String(c.fullName), votes: tally.get(String(c.id)) ?? 0 })).sort((a, b) => b.votes - a.votes),
    };
  },
});
