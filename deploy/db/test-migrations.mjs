import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import fs from 'fs';
// Runs all migrations on in-process Postgres (PGlite) and checks Phase B constraints. Data is fictional.
const dir = new URL('./migrations/', import.meta.url);
const db = new PGlite({ extensions: { pgcrypto } });
const { splitSql } = await import(new URL('./splitSql.mjs', import.meta.url));
// Same split as scripts/migrate.mjs: each statement on its own, inside one transaction per file
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.sql')).sort()) {
  const stmts = splitSql(fs.readFileSync(new URL(f, dir), 'utf8'));
  await db.transaction(async (tx) => { for (const st of stmts) await tx.exec(st); });
  console.log('ok', f, stmts.length, 'statements');
}
const q=(s)=>db.query(s);
const expectFail=async(n,s)=>{try{await db.exec(s);console.log('FAIL (accepted):',n);process.exitCode=1}catch(e){console.log('pass (rejected):',n)}};
await db.exec(`INSERT INTO "Faculties"(id,name) VALUES('f1','F'); INSERT INTO "Majors"(id,name) VALUES('m1','PE'),('m2','SS');
INSERT INTO "Associations"(id,name) VALUES('a1','Sport'),('a2','Other');
INSERT INTO "AcademicYears"(id,title,status) VALUES('y1','1404-1405','Archived'),('y2','۱۴۰۵-۱۴۰۶','Current');
INSERT INTO "AssociationYears"(id,association,"academicYear") VALUES('ay1','["a1"]','["y2"]'),('ay2','["a2"]','["y2"]'),('ay3','["a1"]','["y1"]');`);
await db.exec(`INSERT INTO "AssociationMajors"("associationYear",major) VALUES('["ay1"]','["m1"]'),('["ay1"]','["m2"]'),('["ay3"]','["m1"]');`);
console.log('pass: two majors (PE + sport sciences) map to one association; same major ok in another year');
await expectFail('second current year',`INSERT INTO "AcademicYears"(title,status) VALUES('1406-1407','Current')`);
await expectFail('bad year format',`INSERT INTO "AcademicYears"(title) VALUES('abc')`);
await expectFail('duplicate association per year',`INSERT INTO "AssociationYears"(association,"academicYear") VALUES('["a1"]','["y2"]')`);
await expectFail('FK unknown association',`INSERT INTO "AssociationYears"(association,"academicYear") VALUES('["zz"]','["y2"]')`);
await expectFail('major mapped to 2 associations same year',`INSERT INTO "AssociationMajors"("associationYear",major) VALUES('["ay2"]','["m1"]')`);
await db.exec(`INSERT INTO "Positions"(id,name) VALUES('p1','Secretary'); INSERT INTO "LeadershipTerms"(id,"academicYear","associationYear",position,status,"personName") VALUES('t1','["y1"]','["ay3"]','["p1"]','Ended','Fictional Test Person')`);
await expectFail('active term without name',`INSERT INTO "LeadershipTerms"("academicYear",position,status) VALUES('["y2"]','["p1"]','Active')`);
await expectFail('edit closed term',`UPDATE "LeadershipTerms" SET "personName"='x' WHERE id='t1'`);
await expectFail('delete closed term',`DELETE FROM "LeadershipTerms" WHERE id='t1'`);
const r=await q(`SELECT m."majorsId" FROM "AssociationMajorsMajors" m JOIN "AssociationMajorsAssociationYears" l USING ("associationMajorsId") WHERE l."associationYearsId"='ay1' ORDER BY 1`);
console.log('link view rows for sport association:', r.rows.map(x=>x.majorsId).join(','));

// ───────── 0004 elections: constraints + atomic vote (all data fictional) ─────────
const { castVoteStatements } = await import(new URL('../server/voteSql.mjs', import.meta.url));
const H = (c) => c.repeat(64); // fake 64-hex hashes
const castTx = async (p) => {
  try {
    return await db.transaction(async (tx) => {
      let last;
      for (const [text, params] of castVoteStatements(p)) last = await tx.query(text, params);
      return last.rows[0].ok ? 'ok' : 'invalid_session';
    });
  } catch (e) { if (e.code === '23505') return 'already_voted'; throw e; }
};
const count = async (sql) => Number((await q(sql)).rows[0].n);
await db.exec(`INSERT INTO "Elections"(id,title,"associationYear",status,"votingStart","votingEnd",seats,"maxChoicesPerVoter") VALUES
  ('e1','TEST election A','["ay1"]','Voting Open', now() - interval '1 hour', now() + interval '1 hour', 2, 1),
  ('e2','TEST election B','["ay2"]','Voting Open', now() - interval '1 hour', now() + interval '1 hour', 1, 1),
  ('e3','TEST election closed','["ay1"]','Closed', now() - interval '3 hour', now() - interval '1 hour', 1, 1);
INSERT INTO "EligibleVoters"(id,"studentNumber",election,major,"nationalIdHash") VALUES
  ('v1','10000001','["e1"]','["m1"]','${H('a')}'),('v2','10000002','["e1"]','["m2"]','${H('b')}'),
  ('v3','10000003','["e2"]','["m1"]','${H('c')}'),('v4','10000004','["e3"]','["m1"]','${H('d')}');
INSERT INTO "Candidates"(id,"fullName",election,"studentNumber",status) VALUES ('c1','TEST candidate','["e1"]','10000001','Approved');`);
console.log('pass: elections, voters, candidates inserted');
await expectFail('election bad status',`INSERT INTO "Elections"(title,"associationYear",status) VALUES('TEST x','["ay1"]','Whatever')`);
await expectFail('election max choices > seats',`INSERT INTO "Elections"(title,"associationYear",seats,"maxChoicesPerVoter") VALUES('TEST x','["ay1"]',1,2)`);
await expectFail('election voting status without times',`INSERT INTO "Elections"(title,"associationYear",status) VALUES('TEST x','["ay1"]','Voting Open')`);
await expectFail('election FK unknown association year',`INSERT INTO "Elections"(title,"associationYear") VALUES('TEST x','["nope"]')`);
await expectFail('duplicate voter student number in election',`INSERT INTO "EligibleVoters"("studentNumber",election,"nationalIdHash") VALUES('10000001','["e1"]','${H('e')}')`);
await expectFail('voter hash not 64-hex',`INSERT INTO "EligibleVoters"("studentNumber",election,"nationalIdHash") VALUES('10000009','["e1"]','plain-national-id')`);
await expectFail('voter FK unknown major',`INSERT INTO "EligibleVoters"("studentNumber",election,major,"nationalIdHash") VALUES('10000010','["e1"]','["zz"]','${H('f')}')`);
await expectFail('duplicate candidate in election',`INSERT INTO "Candidates"("fullName",election,"studentNumber") VALUES('TEST dup','["e1"]','10000001')`);
await expectFail('candidate bad status',`INSERT INTO "Candidates"("fullName",election,"studentNumber",status) VALUES('TEST bad','["e1"]','10000005','Maybe')`);
await db.exec(`INSERT INTO "VoterParticipation"(label,election,voter,"votedOn") VALUES('AAAAA-11111','["e1"]','["v1"]',current_date)`);
await expectFail('second participation same voter+election (UNIQUE)',`INSERT INTO "VoterParticipation"(label,election,voter,"votedOn") VALUES('AAAAA-22222','["e1"]','["v1"]',current_date)`);
await expectFail('participation voter from another election',`INSERT INTO "VoterParticipation"(label,election,voter,"votedOn") VALUES('AAAAA-33333','["e1"]','["v3"]',current_date)`);
await expectFail('participation without date',`INSERT INTO "VoterParticipation"(label,election,voter) VALUES('AAAAA-44444','["e2"]','["v3"]')`);
await expectFail('direct INSERT into Ballots (only close_election may add ballots)',`INSERT INTO "Ballots"(receipt,election,"candidateIds") VALUES('00000000-0000-4000-8000-000000000001','["e1"]','c1')`);
await db.exec(`INSERT INTO "PendingBallots"(receipt,election,"candidateIds") VALUES('00000000-0000-4000-8000-000000000001','["e1"]','c1')`);
await expectFail('pending ballot UPDATE',`UPDATE "PendingBallots" SET "candidateIds"='x'`);
await expectFail('pending ballot DELETE outside close_election',`DELETE FROM "PendingBallots"`);
await expectFail('pending ballot non-UUID id',`INSERT INTO "PendingBallots"(receipt,election,"candidateIds") VALUES('ABC123','["e1"]','c1')`);
await expectFail('session longer than 20 minutes',`INSERT INTO "VoterSessions"("tokenHash",election,voter,"expiresAt") VALUES('${H('1')}','["e1"]','["v2"]', now() + interval '25 minutes')`);
const cols = (t) => q(`SELECT column_name FROM information_schema.columns WHERE table_name='${t}'`).then((r) => r.rows.map((x) => x.column_name));
const bc = (await cols('Ballots')).concat(await cols('PendingBallots')), pc = await cols('VoterParticipation');
const leak = bc.filter((c) => /voter|student|created|updated|time|at$/i.test(c)).concat(pc.filter((c) => /student|national|created|updated|time/i.test(c)));
if (leak.length) { console.log('FAIL: identifying/time columns present:', leak); process.exitCode = 1; } else console.log('pass: Ballots has no voter/time column; VoterParticipation has no student number/exact time');
// atomic vote
const today = new Date().toISOString().slice(0, 10);
await db.exec(`INSERT INTO "VoterSessions"("tokenHash",election,voter,"expiresAt") VALUES('${H('2')}','["e1"]','["v2"]', now() + interval '19 minutes')`);
const r1 = await castTx({ sessionHash: H('2'), electionId: 'e1', code: 'BBBBB-11111', ballotUuid: '00000000-0000-4000-8000-000000000002', candidateIds: 'c1', votedOn: today });
const b1 = await count(`SELECT COUNT(*) n FROM "PendingBallots"`);
console.log(r1 === 'ok' && b1 === 2 && (await count(`SELECT COUNT(*) n FROM "VoterSessions" WHERE "tokenHash"='${H('2')}'`)) === 0 ? 'pass: atomic vote ok, session closed' : (process.exitCode = 1, `FAIL: atomic vote ${r1} ballots=${b1}`));
// repeated attempts by the same voter (5 sessions; PGlite is single-connection, so these run sequentially)
const outs = [];
for (let i = 3; i < 8; i++) {
  await db.exec(`INSERT INTO "VoterSessions"("tokenHash",election,voter,"expiresAt") VALUES('${H(String(i))}','["e1"]','["v2"]', now() + interval '19 minutes')`);
  outs.push(await castTx({ sessionHash: H(String(i)), electionId: 'e1', code: `CCCCC-1111${i}`, ballotUuid: `00000000-0000-4000-8000-00000000001${i}`, candidateIds: 'c1', votedOn: today }));
}
const b2 = await count(`SELECT COUNT(*) n FROM "PendingBallots"`);
console.log(outs.every((o) => o === 'already_voted') && b2 === 2 ? 'pass: 5 further attempts by same voter rejected, no extra ballot (rollback)' : (process.exitCode = 1, `FAIL: repeat ${outs} ballots=${b2}`));
// closed election
await db.exec(`INSERT INTO "VoterSessions"("tokenHash",election,voter,"expiresAt") VALUES('${H('8')}','["e3"]','["v4"]', now() + interval '19 minutes')`);
const r3 = await castTx({ sessionHash: H('8'), electionId: 'e3', code: 'DDDDD-11111', ballotUuid: '00000000-0000-4000-8000-000000000020', candidateIds: 'c1', votedOn: today });
console.log(r3 === 'invalid_session' && (await count(`SELECT COUNT(*) n FROM "PendingBallots"`)) === 2 ? 'pass: vote after close rejected, no ballot' : (process.exitCode = 1, `FAIL: closed ${r3}`));
// session of election A used for election B
await db.exec(`INSERT INTO "VoterSessions"("tokenHash",election,voter,"expiresAt") VALUES('${H('9')}','["e2"]','["v3"]', now() + interval '19 minutes')`);
const r4 = await castTx({ sessionHash: H('9'), electionId: 'e1', code: 'EEEEE-11111', ballotUuid: '00000000-0000-4000-8000-000000000021', candidateIds: 'c1', votedOn: today });
console.log(r4 === 'invalid_session' ? 'pass: session cannot vote in another election' : (process.exitCode = 1, `FAIL: cross-election ${r4}`));
// expired session
await db.exec(`INSERT INTO "VoterSessions"("tokenHash",election,voter,"expiresAt",created_at) VALUES('${H('f')}','["e2"]','["v3"]', now() - interval '1 minute', now() - interval '10 minutes')`);
const r5 = await castTx({ sessionHash: H('f'), electionId: 'e2', code: 'FFFFF-11111', ballotUuid: '00000000-0000-4000-8000-000000000022', candidateIds: 'c1', votedOn: today });
console.log(r5 === 'invalid_session' ? 'pass: expired session rejected' : (process.exitCode = 1, `FAIL: expired ${r5}`));

// ───────── 0005 secrecy: xmin / ctid cannot link a ballot to a voter after close ─────────
// Election e4: N fictional voters, voter i votes for candidate i (worst case for an attacker:
// every ballot is distinguishable). Each vote is its own transaction (own xmin).
const N = 24;
await db.exec(`INSERT INTO "Elections"(id,title,"associationYear",status,"votingStart","votingEnd",seats,"maxChoicesPerVoter") VALUES
  ('e4','TEST secrecy','["ay1"]','Voting Open', now() - interval '1 hour', now() + interval '1 hour', 1, 1)`);
for (let i = 0; i < N; i++) {
  const sn = String(20000000 + i), hx = (i + 16).toString(16).padStart(2, '0');
  await db.exec(`INSERT INTO "EligibleVoters"(id,"studentNumber",election,"nationalIdHash") VALUES('w${i}','${sn}','["e4"]','${hx.repeat(32)}');
    INSERT INTO "Candidates"(id,"fullName",election,"studentNumber",status) VALUES('k${i}','TEST cand ${i}','["e4"]','${sn}','Approved');
    INSERT INTO "VoterSessions"("tokenHash",election,voter,"expiresAt") VALUES('${('9' + hx).padEnd(64, '0')}','["e4"]','["w${i}"]', now() + interval '19 minutes')`);
  const r = await castTx({ sessionHash: ('9' + hx).padEnd(64, '0'), electionId: 'e4', code: `XXXXX-${String(10000 + i)}`, ballotUuid: `00000000-0000-4000-8000-${String(100000000000 + i)}`, candidateIds: `k${i}`, votedOn: today });
  if (r !== 'ok') { console.log('FAIL: secrecy setup vote', i, r); process.exitCode = 1; }
}
// BEFORE close (documented residual risk): the pending row shares xmin with its participation row
const before = await count(`SELECT COUNT(*) n FROM "VoterParticipation" p JOIN "PendingBallots" b ON p.xmin = b.xmin WHERE p."electionId"='e4' AND b."electionId"='e4'`);
console.log(before === N ? `info: before close xmin links ${before}/${N} pending ballots (residual risk while voting is open — documented)` : `info: before close xmin links ${before}`);
{ const m3 = Number((await q(`SELECT close_election('e3') AS moved`)).rows[0].moved);
  console.log(m3 === 0 ? 'pass: close_election on an already-closed election is a no-op' : (process.exitCode = 1, `FAIL: e3 moved ${m3}`)); }
await db.exec(`INSERT INTO "Elections"(id,title,"associationYear",status,seats,"maxChoicesPerVoter") VALUES('e9','TEST draft','["ay1"]','Draft',1,1)`);
await expectFail('close_election on a Draft election', `SELECT close_election('e9')`);
{ const o = (await q(`SELECT open_election('e9') AS o`)).rows[0].o;
  console.log(o === false ? 'pass: open_election refuses a non-Final-List election' : (process.exitCode = 1, 'FAIL: draft opened')); }
const moved = Number((await q(`SELECT close_election('e4') AS moved`)).rows[0].moved);
const pend = await count(`SELECT COUNT(*) n FROM "PendingBallots" WHERE "electionId"='e4'`);
const st = (await q(`SELECT status FROM "Elections" WHERE id='e4'`)).rows[0].status;
console.log(moved === N && pend === 0 && st === 'Closed' ? `pass: close_election moved ${N} ballots, pending empty, status Closed` : (process.exitCode = 1, `FAIL: close moved=${moved} pending=${pend} status=${st}`));
// xmin: every ballot and every participation row of e4 now carries ONE identical xmin, so a join
// on xmin is a full cross product (N×N) — it pairs each voter with every ballot equally.
const bx = await count(`SELECT COUNT(DISTINCT xmin::text) n FROM "Ballots" WHERE "electionId"='e4'`);
const px = await count(`SELECT COUNT(DISTINCT xmin::text) n FROM "VoterParticipation" WHERE "electionId"='e4'`);
const cross = await count(`SELECT COUNT(*) n FROM "VoterParticipation" p JOIN "Ballots" b ON p.xmin = b.xmin WHERE p."electionId"='e4' AND b."electionId"='e4'`);
console.log(bx === 1 && px === 1 && cross === N * N ? `pass: xmin join gives ${cross} = ${N}×${N} pairs (no information)` : (process.exitCode = 1, `FAIL: xmin distinct ballots=${bx} participation=${px} join=${cross}`));
// ctid: rank of a ballot in physical order vs rank of its voter's participation row.
// Random order ⇒ on average 1 positional match; voter-order preservation would give N.
const rank = async (sql) => (await q(sql)).rows.map((r) => r.x);
const ballotOrder = await rank(`SELECT "candidateIds" x FROM "Ballots" WHERE "electionId"='e4' ORDER BY ctid`);
const voterOrder = await rank(`SELECT 'k' || substr("voterId", 2) x FROM "VoterParticipation" WHERE "electionId"='e4' ORDER BY ctid`);
const hits = ballotOrder.filter((x, i) => x === voterOrder[i]).length;
console.log(hits < N / 2 ? `pass: ctid order matches voter order at ${hits}/${N} positions (random; P(≥${N / 2}) is negligible)` : (process.exitCode = 1, `FAIL: ctid order matches ${hits}/${N}`));
// receipts were replaced: no Ballots receipt equals a cast-time receipt
const sameReceipt = await count(`SELECT COUNT(*) n FROM "Ballots" WHERE receipt LIKE '00000000-0000-4000-8000-1%'`);
console.log(sameReceipt === 0 ? 'pass: ballots got new receipts on close' : (process.exitCode = 1, 'FAIL: cast-time receipt survived'));
// tally from Ballots: each candidate exactly one vote
const tl = await count(`SELECT COUNT(*) n FROM (SELECT "candidateIds" FROM "Ballots" WHERE "electionId"='e4' GROUP BY 1 HAVING COUNT(*) = 1) t`);
console.log(tl === N ? 'pass: tally from Ballots is complete after seal' : (process.exitCode = 1, `FAIL: tally ${tl}`));
await expectFail('ballot UPDATE (append-only)', `UPDATE "Ballots" SET "candidateIds"='x' WHERE "electionId"='e4'`);
await expectFail('ballot DELETE (append-only)', `DELETE FROM "Ballots" WHERE "electionId"='e4'`);
// 0006: close is idempotent — a second call moves nothing and creates no duplicate ballot
const before2 = await count(`SELECT COUNT(*) n FROM "Ballots" WHERE "electionId"='e4'`);
const again = Number((await q(`SELECT close_election('e4') AS moved`)).rows[0].moved);
const after2 = await count(`SELECT COUNT(*) n FROM "Ballots" WHERE "electionId"='e4'`);
console.log(again === 0 && after2 === before2 ? 'pass: second close_election is a no-op (idempotent, no duplicate ballots)' : (process.exitCode = 1, `FAIL: second close moved=${again} ballots ${before2}->${after2}`));
const st2 = (await q(`UPDATE "Elections" SET status='Counting' WHERE id='e4' RETURNING status`)).rows[0]?.status;
const again3 = Number((await q(`SELECT close_election('e4') AS moved`)).rows[0].moved);
const st3 = (await q(`SELECT status FROM "Elections" WHERE id='e4'`)).rows[0].status;
console.log(st2 === 'Counting' && again3 === 0 && st3 === 'Counting' ? 'pass: close after Counting does not rewind status' : (process.exitCode = 1, `FAIL: status ${st3}`));
const src6 = (await import('fs')).readFileSync(new URL('./migrations/0006_clock_idempotent.sql', import.meta.url), 'utf8');
console.log(/pg_advisory_xact_lock/.test(src6) ? 'pass: close/open serialized with pg_advisory_xact_lock' : (process.exitCode = 1, 'FAIL: no advisory lock'));
await expectFail('close_election of unknown election', `SELECT close_election('nope')`);
// vote after close is refused (session was deleted by close; a fresh one cannot vote either)
await db.exec(`INSERT INTO "EligibleVoters"(id,"studentNumber",election,"nationalIdHash") VALUES('wz','29999999','["e4"]','${'ab'.repeat(32)}');
  INSERT INTO "VoterSessions"("tokenHash",election,voter,"expiresAt") VALUES('${'6c'.repeat(32)}','["e4"]','["wz"]', now() + interval '19 minutes')`);
const late = await castTx({ sessionHash: '6c'.repeat(32), electionId: 'e4', code: 'ZZZZZ-11111', ballotUuid: '00000000-0000-4000-8000-000000000099', candidateIds: 'k0', votedOn: today });
console.log(late === 'invalid_session' ? 'pass: vote after close_election rejected' : (process.exitCode = 1, `FAIL: late vote ${late}`));
console.log(process.exitCode ? 'MIGRATION TESTS FAILED' : 'ALL MIGRATION TESTS PASSED');
try { await db.exec(`UPDATE "Elections" SET "isDemo" = true WHERE id = 'e4'`); console.log('FAIL: demo row accepted on Neon'); process.exitCode = 1; } catch { console.log('pass (rejected): demo data on Neon (0007)'); }
