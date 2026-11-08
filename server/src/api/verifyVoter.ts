import { z } from 'zod';
import { createEndpoint, ZiteError } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { audit } from '../lib/server';
import { normalizeNationalId, normalizeStudentNumber, maskStudentNumber, timingSafeEqual, randomToken, hmacHex, VOTER_SESSION_MINUTES } from '../lib/policy';
import { requirePepper, hashNationalId, attemptBuckets, reserveAttempt, releaseAttempt, contextIp, votingOpen, mappedMajors } from '../lib/voterHash';
import { syncElectionClock } from '../lib/electionClock';

// One generic message for every identity failure, so a caller cannot tell which identifier was wrong.
const GENERIC = 'اطلاعات واردشده با فهرست واجدین این انتخابات مطابقت ندارد.';
const LOCKED = 'به دلیل تلاش‌های ناموفق متعدد، ورود موقتاً قفل شده است. حدود ۱۵ دقیقه دیگر دوباره تلاش کنید.';
const fail = (m: string, code: 'BAD_REQUEST' | 'FORBIDDEN' | 'RATE_LIMITED' | 'CONFLICT' = 'FORBIDDEN') => { throw new ZiteError({ code, message: code, userFacingMessage: m }); };
const anon = { id: '', email: '' };

export default createEndpoint({
  description: 'Verifies a voter by student number and national ID and opens a 20-minute voting session',
  inputSchema: z.object({ electionId: z.string().min(1).max(64), studentNumber: z.string().max(40), nationalId: z.string().max(40) }),
  outputSchema: z.object({ sessionToken: z.string(), expiresAt: z.string() }),
  execute: async ({ input, context }) => {
    const pepper = requirePepper();
    let e = await zite.elections.findOne({ id: input.electionId });
    const st = await syncElectionClock(e);
    if (e && st && st !== e.status) e = await zite.elections.findOne({ id: input.electionId });
    if (!votingOpen(e)) fail('رأی‌گیری این انتخابات اکنون باز نیست.', 'BAD_REQUEST');

    const sn = normalizeStudentNumber(input.studentNumber);
    const nid = normalizeNationalId(input.nationalId);
    const buckets = await attemptBuckets(sn, contextIp(context));
    const masked = sn ? maskStudentNumber(sn) : 'invalid';
    const { ids: reservation, locked } = await reserveAttempt(buckets);
    if (locked) {
      await releaseAttempt(reservation);
      await audit(anon, 'vote_verify_locked', 'elections', input.electionId, `sn=${masked}`);
      fail(LOCKED, 'RATE_LIMITED');
    }
    const reject = async (reason: string): Promise<never> => {
      // the reservation row stays as this attempt's recorded failure
      await audit(anon, 'vote_verify_failed', 'elections', input.electionId, `sn=${masked} reason=${reason}`);
      return fail(GENERIC) as never;
    };
    if (!sn || !nid) return reject('format');

    const v = await zite.sql({
      query: `SELECT v.id, v."nationalIdHash" AS h, mm."majorsId" AS major FROM "EligibleVoters" v
        JOIN "ElectionsEligibleVoters" l ON l."eligibleVotersId" = v.id
        LEFT JOIN "EligibleVotersMajors" mm ON mm."eligibleVotersId" = v.id
        WHERE l."electionsId" = $1 AND v."studentNumber" = $2 LIMIT 1`,
      params: [input.electionId, sn],
    });
    const row = v.rows[0];
    // Always compute the hash so timing does not reveal whether the student number exists
    const hash = await hashNationalId(input.electionId, nid!);
    if (!row || !timingSafeEqual(String(row.h ?? ''), hash)) return reject('identity');

    // Major → association rule (AssociationMajors of the election's academic year), enforced on the server
    const majors = await mappedMajors(input.electionId);
    if (!row.major || !majors.some((m) => m.id === String(row.major))) return reject('major_not_mapped');

    const voted = await zite.sql({
      query: `SELECT 1 FROM "EligibleVotersVoterParticipation" vp JOIN "ElectionsVoterParticipation" ep ON ep."voterParticipationId" = vp."voterParticipationId" WHERE vp."eligibleVotersId" = $1 AND ep."electionsId" = $2 LIMIT 1`,
      params: [row.id, input.electionId],
    });
    // Identity proven — this attempt is not a failure
    await releaseAttempt(reservation);
    if (voted.rows.length) {
      await audit(anon, 'vote_verify_already_voted', 'elections', input.electionId, `sn=${masked}`);
      fail('با این مشخصات قبلاً رأی ثبت شده است.', 'CONFLICT');
    }

    // Replace any earlier open session of this voter
    const old = await zite.sql({ query: `SELECT "voterSessionsId" AS id FROM "EligibleVotersVoterSessions" WHERE "eligibleVotersId" = $1`, params: [row.id] });
    for (const o of old.rows) await zite.voterSessions.delete({ id: String(o.id) });

    const token = randomToken();
    const end = new Date(String(e!.votingEnd));
    const expires = new Date(Math.min(Date.now() + VOTER_SESSION_MINUTES * 60_000, end.getTime()));
    await zite.voterSessions.create({ record: { tokenHash: await hmacHex(pepper, `session:${token}`), election: [input.electionId], voter: [String(row.id)], expiresAt: expires.toISOString() } });
    await audit(anon, 'vote_verify_success', 'elections', input.electionId, `sn=${masked}`);
    return { sessionToken: token, expiresAt: expires.toISOString() };
  },
});
