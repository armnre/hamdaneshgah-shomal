import { z } from 'zod';
import { createEndpoint, ZiteError } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { first } from '../lib/server';
import { hmacHex, participationCode, tehranDate } from '../lib/policy';
import { requirePepper, votingOpen } from '../lib/voterHash';

const fail = (m: string, code: 'BAD_REQUEST' | 'FORBIDDEN' | 'CONFLICT' = 'BAD_REQUEST') => { throw new ZiteError({ code, message: code, userFacingMessage: m }); };
const EXPIRED = 'نشست رأی‌دهی منقضی شده یا قبلاً استفاده شده است. دوباره احراز هویت کنید.';

type AtomicCast = (p: { sessionHash: string; electionId: string; code: string; ballotUuid: string; candidateIds: string; votedOn: string }) => Promise<'ok' | 'invalid_session' | 'already_voted'>;

// The ballot never carries any voter reference. The participation row holds only the election,
// the voter link, the date (no time) and a random confirmation code that says nothing about the choices.
export default createEndpoint({
  description: 'Casts an anonymous ballot within an open voter session and closes the session',
  inputSchema: z.object({ sessionToken: z.string().min(20).max(100), candidateIds: z.array(z.string().max(64)).max(50) }),
  outputSchema: z.object({ confirmationCode: z.string() }),
  execute: async ({ input }) => {
    const pepper = requirePepper();
    const sessionHash = await hmacHex(pepper, `session:${input.sessionToken}`);
    const s = await zite.voterSessions.findOne({ filters: { tokenHash: sessionHash } });
    if (!s || !s.expiresAt || new Date(String(s.expiresAt)) < new Date()) fail(EXPIRED, 'FORBIDDEN');
    const electionId = String(first(s!.election as string[]) ?? '');
    const voterId = String(first(s!.voter as string[]) ?? '');
    const e = await zite.elections.findOne({ id: electionId });
    if (!votingOpen(e)) fail('رأی‌گیری این انتخابات اکنون باز نیست.');

    const choices = [...new Set(input.candidateIds)].sort();
    if (!choices.length) fail('حداقل یک نامزد را انتخاب کنید.');
    if (choices.length > Number(e!.maxChoicesPerVoter ?? 1)) fail(`حداکثر ${e!.maxChoicesPerVoter} نامزد می‌توانید انتخاب کنید.`);
    const ok = await zite.sql({ query: `SELECT COUNT(*)::int AS n FROM "Candidates" c JOIN "CandidatesElections" l ON l."candidatesId" = c.id WHERE l."electionsId" = $1 AND c.status = 'Approved' AND c.id = ANY($2)`, params: [electionId, choices] });
    if (Number(ok.rows[0]?.n) !== choices.length) fail('انتخاب نامزد نامعتبر است.');

    const code = participationCode();
    const ballotUuid = crypto.randomUUID();
    const votedOn = tehranDate(new Date());

    // Netlify/Neon: participation + ballot + session close in ONE transaction, guarded by UNIQUE(election, voter).
    const atomic = (zite as unknown as { castBallotAtomic?: AtomicCast }).castBallotAtomic;
    if (atomic) {
      const r = await atomic({ sessionHash, electionId, code, ballotUuid, candidateIds: choices.join(','), votedOn });
      if (r === 'already_voted') fail('با این مشخصات قبلاً رأی ثبت شده است.', 'CONFLICT');
      if (r === 'invalid_session') fail(EXPIRED, 'FORBIDDEN');
      return { confirmationCode: code };
    }

    // Zite: no multi-statement transaction or database UNIQUE constraint is available.
    // Best effort: single-use session is closed first, then a duplicate check, then the writes.
    // See docs/security.md — Netlify/Neon is the safe path for a real election.
    await zite.voterSessions.delete({ id: s!.id });
    const voted = await zite.sql({
      query: `SELECT 1 FROM "EligibleVotersVoterParticipation" vp JOIN "ElectionsVoterParticipation" ep ON ep."voterParticipationId" = vp."voterParticipationId" WHERE vp."eligibleVotersId" = $1 AND ep."electionsId" = $2 LIMIT 1`,
      params: [voterId, electionId],
    });
    if (voted.rows.length) fail('با این مشخصات قبلاً رأی ثبت شده است.', 'CONFLICT');
    await zite.voterParticipation.create({ record: { label: code, election: [electionId], voter: [voterId], votedOn } });
    await zite.ballots.create({ record: { receipt: ballotUuid, election: [electionId], candidateIds: choices.join(',') } });
    return { confirmationCode: code };
  },
});
