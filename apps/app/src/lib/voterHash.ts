// Server-side only. Voter identity hashing, attempt limiting and election checks.
// The raw national ID is never stored — only an HMAC-SHA256 keyed with the server pepper.
import { zite } from 'zitejs/db';
import { ZiteError } from 'zitejs/backend';
import {
  readPepper, nationalIdHmac, hmacHex, attemptWindowStart,
  MAX_FAILURES_PER_STUDENT, MAX_FAILURES_PER_IP,
} from './policy';

/** Fails closed: without a configured pepper, import and voting are refused. */
export function requirePepper(): string {
  const p = readPepper(process.env);
  if (!p) {
    console.error('[voting] pepper not configured');
    throw new ZiteError({ code: 'INTERNAL_ERROR', message: 'voter pepper missing', userFacingMessage: 'سامانه رأی‌گیری هنوز پیکربندی امنیتی نشده است. با مدیر سامانه تماس بگیرید.' });
  }
  return p;
}

export async function hashNationalId(electionId: string, nationalId: string) {
  return nationalIdHmac(requirePepper(), electionId, nationalId);
}

type Bucket = { key: string; max: number };

/** Attempt buckets are keyed HMACs, so the attempts table never holds a raw student number or IP. */
export async function attemptBuckets(studentNumber: string | null, ip: string | undefined): Promise<Bucket[]> {
  const p = requirePepper();
  const out: Bucket[] = [];
  if (studentNumber) out.push({ key: `sn:${(await hmacHex(p, `sn:${studentNumber}`)).slice(0, 40)}`, max: MAX_FAILURES_PER_STUDENT });
  if (ip) out.push({ key: `ip:${(await hmacHex(p, `ip:${ip}`)).slice(0, 40)}`, max: MAX_FAILURES_PER_IP });
  return out;
}

const countIn = async (key: string, ws: string) => {
  const r = await zite.sql({ query: `SELECT COALESCE(SUM("failures"), 0)::int AS n FROM "VoterAttempts" WHERE "bucket" = $1 AND "windowStart" >= $2`, params: [key, ws] });
  return Number(r.rows[0]?.n ?? 0);
};

/**
 * Race-safe attempt lock (reserve-then-count). Every attempt first INSERTs its own row
 * (append-only, never read-modify-write), then counts. Because each request's row is
 * committed before it counts, N parallel requests see at least their own reservations,
 * so at most `max` of them can pass in one window — the old check-then-increment let a
 * burst slip through and lost concurrent increments.
 * A successful verification releases its reservation; a failed one keeps it as the failure.
 */
export async function reserveAttempt(buckets: Bucket[]) {
  const windowStart = attemptWindowStart(new Date()).toISOString();
  const created = await zite.voterAttempts.bulkCreate({ records: buckets.map((b) => ({ bucket: b.key, windowStart, failures: 1 })) });
  const ids = created.records.map((r) => r.id);
  let locked = false;
  for (const b of buckets) if ((await countIn(b.key, windowStart)) > b.max) locked = true;
  return { ids, locked };
}

/** Release a reservation (on success, or when the attempt was refused as locked and must not extend the lock). */
export async function releaseAttempt(ids: string[]) {
  for (const id of ids) await zite.voterAttempts.delete({ id });
}

/** Client IP when the runtime provides it (Netlify handler passes context.ip; Zite does not expose one). */
export const contextIp = (context: unknown) => {
  const ip = (context as { ip?: unknown } | null)?.ip;
  return typeof ip === 'string' && ip && ip !== 'unknown' ? ip : undefined;
};

/** True while the election accepts votes (status and time window, checked on the server). */
export function votingOpen(e: { status?: unknown; votingStart?: unknown; votingEnd?: unknown } | undefined, now = new Date()) {
  if (!e || e.status !== 'Voting Open' || !e.votingStart || !e.votingEnd) return false;
  return new Date(String(e.votingStart)) <= now && now <= new Date(String(e.votingEnd));
}

/** Majors mapped to the election's association for the election's academic year (AssociationMajors). */
export async function mappedMajors(electionId: string) {
  const r = await zite.sql({
    query: `SELECT DISTINCT m.id, m."name" FROM "AssociationYearsElections" ae
      JOIN "AssociationMajorsAssociationYears" amy ON amy."associationYearsId" = ae."associationYearsId"
      JOIN "AssociationMajorsMajors" amm ON amm."associationMajorsId" = amy."associationMajorsId"
      JOIN "Majors" m ON m.id = amm."majorsId"
      WHERE ae."electionsId" = $1`,
    params: [electionId],
  });
  return r.rows.map((x) => ({ id: String(x.id), name: String(x.name ?? '') }));
}
