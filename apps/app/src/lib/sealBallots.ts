import { zite } from 'zitejs/db';
import { secureShuffle } from './policy';

type AtomicClose = (electionId: string) => Promise<number>;

/**
 * Closes voting and moves the election's PendingBallots into Ballots in random order.
 * Netlify/Neon: one SQL transaction (close_election, migration 0005) — all ballots and
 * participation rows end up with the same xmin.
 * Zite: no transactions; best effort (sessions ended → status Closed → shuffled copy in batches
 * of 100 → pending rows deleted). See docs/security.md for what this does and does not guarantee.
 */
export async function closeAndSeal(e: { id: string; votingEnd?: unknown }): Promise<number> {
  const atomic = (zite as unknown as { closeElectionAtomic?: AtomicClose }).closeElectionAtomic;
  if (atomic) return atomic(e.id);

  const now = new Date().toISOString();
  await zite.elections.update({ id: e.id, record: { status: 'Closed', votingEnd: e.votingEnd && String(e.votingEnd) < now ? String(e.votingEnd) : now } });
  const s = await zite.sql({ query: `SELECT "voterSessionsId" AS id FROM "ElectionsVoterSessions" WHERE "electionsId" = $1`, params: [e.id] });
  for (const r of s.rows) await zite.voterSessions.delete({ id: String(r.id) });

  const pending = await zite.sql({
    query: `SELECT p.id, p."candidateIds" FROM "PendingBallots" p JOIN "ElectionsPendingBallots" l ON l."pendingBallotsId" = p.id WHERE l."electionsId" = $1`,
    params: [e.id],
  });
  const rows = secureShuffle(pending.rows);
  // New receipt per moved ballot; each batch's pending rows are removed right after it is copied,
  // so a retry after a failure never copies a ballot twice.
  for (let i = 0; i < rows.length; i += 100) {
    const batch = rows.slice(i, i + 100);
    await zite.ballots.bulkCreate({ records: batch.map((r) => ({ receipt: crypto.randomUUID(), election: [e.id], candidateIds: String(r.candidateIds) })) });
    for (const r of batch) await zite.pendingBallots.delete({ id: String(r.id) });
  }
  return rows.length;
}
