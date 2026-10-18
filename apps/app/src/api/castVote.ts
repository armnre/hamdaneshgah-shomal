import { z } from 'zod';
import { createEndpoint, ZiteError } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { normalizeNationalId, normalizeStudentNumber } from '../lib/policy';
import { hashNationalId } from '../lib/voterHash';

const fail = (m: string, code: 'BAD_REQUEST' | 'FORBIDDEN' = 'BAD_REQUEST') => { throw new ZiteError({ code, message: m, userFacingMessage: m }); };

export default createEndpoint({
  description: 'Verifies a voter by student number + national ID and records an anonymous ballot',
  inputSchema: z.object({ electionId: z.string().min(1), studentNumber: z.string().max(40), nationalId: z.string().max(40), candidateIds: z.array(z.string()).max(50) }),
  outputSchema: z.object({ receipt: z.string() }),
  execute: async ({ input }) => {
    const e = await zite.elections.findOne({ id: input.electionId });
    const now = new Date().toISOString();
    if (!e || e.status !== 'Voting Open' || !e.votingStart || !e.votingEnd || String(e.votingStart) > now || now > String(e.votingEnd)) fail('رأی‌گیری این انتخابات اکنون باز نیست.');

    const sn = normalizeStudentNumber(input.studentNumber);
    const nid = normalizeNationalId(input.nationalId);
    const generic = 'شماره دانشجویی یا کد ملی در فهرست واجدین این انتخابات نیست.';
    if (!sn || !nid) fail(generic, 'FORBIDDEN');
    const hash = await hashNationalId(input.electionId, nid!);
    const v = await zite.sql({ query: `SELECT v.id FROM "EligibleVoters" v JOIN "ElectionsEligibleVoters" l ON l."eligibleVotersId" = v.id WHERE l."electionsId" = $1 AND v."studentNumber" = $2 AND v."nationalIdHash" = $3 LIMIT 1`, params: [input.electionId, sn, hash] });
    const voterId = v.rows[0]?.id as string | undefined;
    if (!voterId) fail(generic, 'FORBIDDEN');

    const choices = [...new Set(input.candidateIds)];
    if (!choices.length) fail('حداقل یک نامزد را انتخاب کنید.');
    if (choices.length > Number(e!.maxChoicesPerVoter ?? 1)) fail(`حداکثر ${e!.maxChoicesPerVoter} نامزد می‌توانید انتخاب کنید.`);
    const ok = await zite.sql({ query: `SELECT COUNT(*)::int AS n FROM "Candidates" c JOIN "CandidatesElections" l ON l."candidatesId" = c.id WHERE l."electionsId" = $1 AND c.status = 'Approved' AND c.id = ANY($2)`, params: [input.electionId, choices] });
    if (Number(ok.rows[0]?.n) !== choices.length) fail('انتخاب نامزد نامعتبر است.');

    // Claim participation first; if two requests race, only the earliest claim keeps its ballot.
    const claim = await zite.voterParticipation.create({ record: { label: `${sn}`, election: [input.electionId], voter: [voterId!], votedAt: now } as never });
    const claims = await zite.sql({ query: `SELECT p.id FROM "VoterParticipation" p JOIN "EligibleVotersVoterParticipation" l ON l."voterParticipationId" = p.id WHERE l."eligibleVotersId" = $1 ORDER BY p."votedAt", p.id`, params: [voterId] });
    if (claims.rows[0]?.id !== claim.id) {
      await zite.voterParticipation.delete({ id: claim.id });
      fail('با این مشخصات قبلاً رأی داده شده است.');
    }
    const receipt = crypto.randomUUID().slice(0, 8).toUpperCase();
    await zite.ballots.create({ record: { receipt, election: [input.electionId], candidateIds: choices.sort().join(',') } as never });
    return { receipt };
  },
});
