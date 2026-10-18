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

export async function isLocked(buckets: Bucket[]) {
  const ws = attemptWindowStart(new Date()).toISOString();
  for (const b of buckets) {
    const r = await zite.sql({ query: `SELECT COALESCE(SUM("failures"), 0)::int AS n FROM "VoterAttempts" WHERE "bucket" = $1 AND "windowStart" >= $2`, params: [b.key, ws] });
    if (Number(r.rows[0]?.n ?? 0) >= b.max) return true;
  }
  return false;
}

export async function recordFailure(buckets: Bucket[]) {
  const windowStart = attemptWindowStart(new Date()).toISOString();
  for (const b of buckets) {
    const ex = await zite.sql({ query: `SELECT id, "failures" FROM "VoterAttempts" WHERE "bucket" = $1 AND "windowStart" = $2 LIMIT 1`, params: [b.key, windowStart] });
    const row = ex.rows[0];
    if (row) await zite.voterAttempts.update({ id: String(row.id), record: { failures: Number(row.failures ?? 0) + 1 } });
    else await zite.voterAttempts.create({ record: { bucket: b.key, windowStart, failures: 1 } });
  }
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
