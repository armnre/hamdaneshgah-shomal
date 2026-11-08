// Server-side only. Request-driven election clock: whenever an election is read by a
// voting/listing endpoint, it is moved to the stage its schedule says it should be in.
// Final List → Voting Open at votingStart; Voting Open → Closed (+ seal) after votingEnd.
// Votes are already refused outside the window by votingOpen(), so the clock only has to
// make the stored status catch up — it never widens what a voter may do.
import { zite } from 'zitejs/db';
import { audit } from './server';
import { closeAndSeal } from './sealBallots';
import { clockTarget } from './policy';

const system = { id: '', email: 'system:clock' };

type E = { id: string; status?: unknown; votingStart?: unknown; votingEnd?: unknown };

export async function syncElectionClock(e: E | undefined | null, now = new Date()): Promise<string | undefined> {
  if (!e) return undefined;
  const target = clockTarget(String(e.status), e.votingStart, e.votingEnd, now);
  if (!target) return String(e.status);
  // Re-read so two concurrent requests do not both act on a stale status
  const fresh = await zite.elections.findOne({ id: e.id });
  if (!fresh || String(fresh.status) !== String(e.status)) return fresh ? String(fresh.status) : undefined;

  if (target === 'Voting Open') {
    // Netlify/Neon: one locked, conditional UPDATE — exactly one caller gets `true`
    const atomicOpen = (zite as unknown as { openElectionAtomic?: (id: string) => Promise<boolean> }).openElectionAtomic;
    if (atomicOpen) {
      const opened = await atomicOpen(e.id);
      await audit(system, opened ? 'auto_open' : 'auto_open_blocked', 'elections', e.id, opened ? 'Final List → Voting Open' : 'not opened (already opened, or no approved candidates / empty voter list)');
      return opened ? 'Voting Open' : String(e.status);
    }
    const c = await zite.sql({ query: `SELECT (SELECT COUNT(*) FROM "Candidates" c JOIN "CandidatesElections" l ON l."candidatesId" = c.id WHERE l."electionsId" = $1 AND c.status = 'Approved')::int AS cands, (SELECT COUNT(*) FROM "ElectionsEligibleVoters" WHERE "electionsId" = $1)::int AS voters`, params: [e.id] });
    if (!Number(c.rows[0]?.cands) || !Number(c.rows[0]?.voters)) {
      await audit(system, 'auto_open_blocked', 'elections', e.id, 'no approved candidates or empty voter list');
      return String(e.status);
    }
    await zite.elections.update({ id: e.id, record: { status: 'Voting Open' } });
    await audit(system, 'auto_open', 'elections', e.id, 'Final List → Voting Open');
    return 'Voting Open';
  }
  const moved = await closeAndSeal(fresh);
  if (moved < 0) return 'Closed'; // another caller sealed it first
  await audit(system, 'auto_close', 'elections', e.id, `Voting Open → Closed, ${moved} ballots sealed`);
  return 'Closed';
}

/** Runs the clock over every election that may be due (used by listing endpoints). */
export async function syncAllDue(now = new Date()) {
  let acted = 0;
  const r = await zite.sql({ query: `SELECT id, status, "votingStart", "votingEnd" FROM "Elections" WHERE status IN ('Final List', 'Voting Open')` });
  for (const row of r.rows) {
    const e = { id: String(row.id), status: row.status, votingStart: row.votingStart, votingEnd: row.votingEnd };
    if (clockTarget(String(e.status), e.votingStart, e.votingEnd, now)) { await syncElectionClock(e, now); acted++; }
  }
  return acted;
}
