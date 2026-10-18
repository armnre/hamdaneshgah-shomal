// Static guarantees over every endpoint (src/api) and the Netlify server: no code path links a ballot
// to a voter, edits/deletes a ballot, or returns national-ID data.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';

const dir = new URL('../src/api/', import.meta.url);
const files = readdirSync(dir).filter((f) => f.endsWith('.ts')).map((f) => [f, readFileSync(new URL(f, dir), 'utf8')] as const);
const server = ['db.ts', 'handler.ts'].map((f) => [f, readFileSync(new URL(`../../../deploy/server/${f}`, import.meta.url), 'utf8')] as const);

test('no endpoint updates or deletes ballots', () => {
  for (const [f, s] of [...files, ...server]) assert.ok(!/ballots\.(update|delete)\s*\(/.test(s) && !/(UPDATE|DELETE FROM)\s+"Ballots"/i.test(s), f);
});

test('no SQL joins Ballots with voters, participation or sessions', () => {
  for (const [f, s] of files) {
    for (const stmt of s.split('`').filter((x) => /"Ballots"/.test(x))) {
      assert.ok(!/EligibleVoters|VoterParticipation|VoterSessions|studentNumber/.test(stmt), `${f}: ${stmt.slice(0, 80)}`);
    }
  }
});

test('ballot rows are written without any voter field', () => {
  for (const [f, s] of files) {
    const m = s.match(/ballots\.create\(\{ record: \{([^}]*)\}/);
    if (m) assert.ok(!/voter|student|national/i.test(m[1]), f);
  }
});

test('no endpoint output schema exposes national ID or its hash', () => {
  for (const [f, s] of files) {
    const out = s.split('outputSchema')[1]?.split('execute')[0] ?? '';
    assert.ok(!/nationalId|nationalIdHash/.test(out), f);
  }
});

test('error messages never interpolate a student number or national ID', () => {
  for (const [f, s] of files) assert.ok(!/userFacingMessage[^\n]*\$\{(sn|nid|studentNumber|nationalId)\}/.test(s) && !/message: `[^`]*\$\{(sn|nid)\}/.test(s), f);
});
