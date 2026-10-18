// Real-concurrency test for the Neon vote path. Needs a DISPOSABLE, already-migrated Postgres
// (e.g. a throwaway Neon branch): TEST_DATABASE_URL=postgres://... node db/test-concurrency.mjs
// Fires 20 simultaneous castVote transactions for ONE voter on 20 separate pooled connections,
// using the exact SQL from server/voteSql.mjs. Pass = exactly 1 participation + 1 ballot.
// Ballots / PendingBallots are append-only, so fixtures are left behind — never point this at production.
import { Pool } from '@neondatabase/serverless';
import { randomUUID, randomBytes } from 'crypto';
import { castVoteStatements } from '../server/voteSql.mjs';

const url = process.env.TEST_DATABASE_URL;
if (!url) { console.error('TEST_DATABASE_URL is not set — test NOT run'); process.exit(2); }
const N = 20;
const pool = new Pool({ connectionString: url, max: N });
const r = randomBytes(4).toString('hex');
const id = (p) => `${p}_${r}`;
const H = () => randomBytes(32).toString('hex');
const yr = 1500 + Math.floor(Math.random() * 400);

const setup = await pool.connect();
try {
  await setup.query('BEGIN');
  await setup.query(`INSERT INTO "Associations"(id,name) VALUES($1,'TEST conc')`, [id('a')]);
  await setup.query(`INSERT INTO "AcademicYears"(id,title,status) VALUES($1,$2,'Archived')`, [id('y'), `${yr}-${yr + 1}`]);
  await setup.query(`INSERT INTO "AssociationYears"(id,association,"academicYear") VALUES($1,jsonb_build_array($2::text),jsonb_build_array($3::text))`, [id('ay'), id('a'), id('y')]);
  await setup.query(`INSERT INTO "Elections"(id,title,"associationYear",status,"votingStart","votingEnd",seats,"maxChoicesPerVoter")
    VALUES($1,'TEST conc election',jsonb_build_array($2::text),'Voting Open',now()-interval '1 hour',now()+interval '1 hour',1,1)`, [id('e'), id('ay')]);
  await setup.query(`INSERT INTO "EligibleVoters"(id,"studentNumber",election,"nationalIdHash") VALUES($1,$2,jsonb_build_array($3::text),$4)`, [id('v'), `9${String(yr)}${r.slice(0, 3)}`.replace(/\D/g, '1'), id('e'), H()]);
  await setup.query('COMMIT');
} finally { setup.release(); }

const sessionHash = H();
await pool.query(`INSERT INTO "VoterSessions"("tokenHash",election,voter,"expiresAt") VALUES($1,jsonb_build_array($2::text),jsonb_build_array($3::text),now()+interval '19 minutes')`, [sessionHash, id('e'), id('v')]);

const castOnce = async (i) => {
  const c = await pool.connect();
  const p = { sessionHash, electionId: id('e'), code: `T${r}-${String(i).padStart(4, '0')}`.toUpperCase(), ballotUuid: randomUUID(), candidateIds: 'none', votedOn: new Date().toISOString().slice(0, 10) };
  try {
    await c.query('BEGIN');
    let last;
    for (const [text, params] of castVoteStatements(p)) last = await c.query(text, params);
    await c.query('COMMIT');
    return last.rows[0].ok ? 'ok' : 'invalid_session';
  } catch (e) {
    await c.query('ROLLBACK').catch(() => {});
    if (e.code === '23505') return 'already_voted';
    if (e.code === '40001' || e.code === '40P01') return 'serialization';
    throw e;
  } finally { c.release(); }
};

const results = await Promise.all(Array.from({ length: N }, (_, i) => castOnce(i)));
const tally = results.reduce((m, x) => ({ ...m, [x]: (m[x] ?? 0) + 1 }), {});
const one = async (sql) => Number((await pool.query(sql, [id('e')])).rows[0].n);
const parts = await one(`SELECT COUNT(*) n FROM "VoterParticipation" WHERE "electionId" = $1`);
const ballots = await one(`SELECT COUNT(*) n FROM "PendingBallots" WHERE election ? $1`);
const sessions = await one(`SELECT COUNT(*) n FROM "VoterSessions" WHERE "electionId" = $1`);
console.log({ requests: N, outcomes: tally, participation: parts, ballots, openSessions: sessions });

// 0006: 10 simultaneous close_election calls on separate connections → exactly one seals.
const M = 10;
const closes = await Promise.all(Array.from({ length: M }, async () => {
  const c = await pool.connect();
  try { return Number((await c.query(`SELECT close_election($1) AS moved`, [id('e')])).rows[0].moved); }
  catch (e) { return `error:${e.code ?? e.message}`; }
  finally { c.release(); }
}));
const movedSum = closes.filter((x) => typeof x === 'number').reduce((a, b) => a + b, 0);
const sealed = await one(`SELECT COUNT(*) n FROM "Ballots" WHERE "electionId" = $1`);
const pendingLeft = await one(`SELECT COUNT(*) n FROM "PendingBallots" WHERE "electionId" = $1`);
const status = (await pool.query(`SELECT status FROM "Elections" WHERE id = $1`, [id('e')])).rows[0].status;
console.log({ closeCalls: M, closes, movedSum, sealed, pendingLeft, status });
await pool.end();
const closeOk = movedSum === 1 && sealed === 1 && pendingLeft === 0 && status === 'Closed' && closes.every((x) => typeof x === 'number');
if (parts === 1 && ballots === 1 && sessions === 0 && tally.ok === 1 && closeOk) console.log('CONCURRENCY TEST PASSED');
else { console.error('CONCURRENCY TEST FAILED'); process.exit(1); }
