// Phase 1: ballots are written to PendingBallots while voting is open and reach Ballots only through
// the close/seal path (shuffled, new receipt). Static + unit checks; the database-level proof
// (xmin / ctid after close_election) is in deploy/db/test-migrations.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { secureShuffle } from '../src/lib/policy.ts';

const read = (u: URL) => readFileSync(u, 'utf8');
const api = readdirSync(new URL('../src/api/', import.meta.url)).filter((f) => f.endsWith('.ts'))
  .map((f) => [f, read(new URL(`../src/api/${f}`, import.meta.url))] as const);
const voteSql = read(new URL('../../../deploy/server/voteSql.mjs', import.meta.url));
const seal = read(new URL('../src/lib/sealBallots.ts', import.meta.url));
const mig = read(new URL('../../../deploy/db/migrations/0005_pending_ballots.sql', import.meta.url));

test('no endpoint writes Ballots directly (only lib/sealBallots on close)', () => {
  for (const [f, s] of api) assert.ok(!/ballots\.(create|bulkCreate)\s*\(/.test(s) && !/INSERT INTO "Ballots"/.test(s), f);
});

test('castVote writes the ballot to PendingBallots', () => {
  const cast = api.find(([f]) => f === 'castVote.ts')![1];
  assert.match(cast, /pendingBallots\.create\(/);
});

test('Neon vote transaction inserts into PendingBallots, never Ballots', () => {
  assert.match(voteSql, /INSERT INTO "PendingBallots"/);
  assert.doesNotMatch(voteSql, /INSERT INTO "Ballots"/);
});

test('seal path shuffles and issues new receipts', () => {
  assert.match(seal, /secureShuffle\(/);
  assert.match(seal, /receipt: crypto\.randomUUID\(\)/);
  assert.match(mig, /ORDER BY random\(\)/);
  assert.match(mig, /gen_random_uuid\(\)::text, "election", "candidateIds" FROM "PendingBallots"/);
});

test('PendingBallots has no voter or time column', () => {
  const body = mig.split('CREATE TABLE IF NOT EXISTS "PendingBallots"')[1].split(');')[0];
  assert.doesNotMatch(body.replace(/--.*$/gm, ''), /voter|student|created_at|updated_at|time/i);
});

test('secureShuffle returns a permutation and actually reorders', () => {
  const xs = Array.from({ length: 50 }, (_, i) => i);
  const ys = secureShuffle(xs);
  assert.deepEqual([...ys].sort((a, b) => a - b), xs);
  assert.notDeepEqual(ys, xs); // P(identity) = 1/50!
});
