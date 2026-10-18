import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { clockTarget, candidateApprovable } from '../src/lib/policy.ts';

const s = '2026-11-01T08:00:00Z', e = '2026-11-01T16:00:00Z';

test('clock opens Final List inside the window only', () => {
  assert.equal(clockTarget('Final List', s, e, new Date('2026-11-01T07:59:59Z')), null);
  assert.equal(clockTarget('Final List', s, e, new Date('2026-11-01T08:00:00Z')), 'Voting Open');
  assert.equal(clockTarget('Final List', s, e, new Date('2026-11-01T17:00:00Z')), null); // missed window never opens
  assert.equal(clockTarget('Candidate Review', s, e, new Date('2026-11-01T09:00:00Z')), null);
});

test('clock closes Voting Open after the end only', () => {
  assert.equal(clockTarget('Voting Open', s, e, new Date('2026-11-01T16:00:00Z')), null);
  assert.equal(clockTarget('Voting Open', s, e, new Date('2026-11-01T16:00:01Z')), 'Closed');
  assert.equal(clockTarget('Closed', s, e, new Date('2026-11-02T00:00:00Z')), null);
  assert.equal(clockTarget('Voting Open', null, e, new Date('2026-11-02T00:00:00Z')), null);
});

test('candidate rule: must be listed, and the list must exist', () => {
  assert.equal(candidateApprovable(0, false), false);
  assert.equal(candidateApprovable(10, false), false);
  assert.equal(candidateApprovable(10, true), true);
});

test('attempt lock is reserve-then-count, never read-modify-write', () => {
  const src = readFileSync(new URL('../src/lib/voterHash.ts', import.meta.url), 'utf8');
  assert.match(src, /reserveAttempt/);
  assert.doesNotMatch(src, /voterAttempts\.update/);
  const v = readFileSync(new URL('../src/api/verifyVoter.ts', import.meta.url), 'utf8');
  assert.ok(v.indexOf('reserveAttempt(') < v.indexOf('hashNationalId('), 'reservation happens before identity check');
});
