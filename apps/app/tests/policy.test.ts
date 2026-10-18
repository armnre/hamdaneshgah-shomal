import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canAccess, canBootstrap, managerMayMutateMedia, slugify, isSafeUrl, bootstrapWinner } from '../src/lib/policy.ts';

test('role matrix', () => {
  assert.equal(canAccess('Super Admin', 'members'), true);
  assert.equal(canAccess('Content Editor', 'members'), false);
  assert.equal(canAccess('Content Editor', 'settings'), false);
  assert.equal(canAccess('Association Manager', 'messages'), false);
  assert.equal(canAccess('Association Manager', 'audit'), false);
  assert.equal(canAccess(null, 'news'), false);
});

test('bootstrap is closed once any admin exists', () => {
  assert.equal(canBootstrap('a@x.ir', 'a@x.ir', 1).ok, false);
});
test('bootstrap refuses when allowlist secret missing', () => {
  assert.deepEqual(canBootstrap('a@x.ir', undefined, 0), { ok: false, reason: 'not_configured' });
  assert.equal(canBootstrap('a@x.ir', ' , ', 0).reason, 'not_configured');
});
test('bootstrap refuses non-allowlisted email', () => {
  assert.equal(canBootstrap('evil@x.ir', 'a@x.ir', 0).reason, 'not_allowed');
});
test('bootstrap accepts allowlisted email case-insensitively', () => {
  assert.equal(canBootstrap(' A@X.ir ', 'b@y.ir, a@x.ir', 0).ok, true);
});

test('association manager cannot edit/delete shared media', () => {
  assert.equal(managerMayMutateMedia('Association Manager', true), false);
  assert.equal(managerMayMutateMedia('Association Manager', false), true);
  assert.equal(managerMayMutateMedia('Content Editor', true), true);
});

test('slugify keeps Persian letters', () => {
  assert.equal(slugify('  انجمن علمی کامپیوتر! '), 'انجمن-علمی-کامپیوتر');
  assert.match(slugify('!!!'), /^[a-z0-9]{1,6}$/);
});

test('URL fields accept only http/https', () => {
  assert.equal(isSafeUrl('https://shomal.ac.ir/x'), true);
  assert.equal(isSafeUrl('http://example.com'), true);
  assert.equal(isSafeUrl('javascript:alert(1)'), false);
  assert.equal(isSafeUrl('data:text/html,hi'), false);
  assert.equal(isSafeUrl('ftp://x.ir/a'), false);
  assert.equal(isSafeUrl('/api/file/abc.png'), false);
  assert.equal(isSafeUrl('/api/file/abc.png', true), true);
  assert.equal(isSafeUrl('/api/file/../x', true), false);
});

test('concurrent bootstrap claims agree on a single winner', () => {
  const rows = [{ id: 'b' }, { id: 'a' }, { id: 'c' }];
  assert.equal(bootstrapWinner(rows), 'a');
  assert.equal(bootstrapWinner([...rows].reverse()), 'a');
  assert.equal(bootstrapWinner([]), null);
});

import { normalizeNationalId, normalizeStudentNumber } from '../src/lib/policy.ts';
test('national id checksum + persian digits', () => {
  assert.equal(normalizeNationalId('۰۰۱۲۳۴۵۶۷۸'), null);
  assert.equal(normalizeNationalId('0499370899'), '0499370899');
  assert.equal(normalizeNationalId('1111111111'), null);
  assert.equal(normalizeStudentNumber('۴۰۱۱۲۳۴۵'), '40112345');
});

// ───────── Phase 3: voting security ─────────
import { readPepper, nationalIdHmac, timingSafeEqual, maskStudentNumber, resolveMajor, normalizeMajorName, participationCode, tehranDate, attemptWindowStart } from '../src/lib/policy.ts';

const PEPPER = 'test-only-pepper-0123456789abcdef-NOT-REAL';

test('pepper: missing or short → null (fail closed); both names accepted', () => {
  assert.equal(readPepper({}), null);
  assert.equal(readPepper({ ZITE_VOTER_PEPPER: 'short' }), null);
  assert.equal(readPepper({ ZITE_VOTER_PEPPER: PEPPER }), PEPPER);
  assert.equal(readPepper({ VOTER_PEPPER: PEPPER }), PEPPER);
});

test('national ID HMAC: keyed, per-election, 64 hex, raw ID not contained', async () => {
  const a = await nationalIdHmac(PEPPER, 'e1', '0013542419');
  assert.match(a, /^[0-9a-f]{64}$/);
  assert.ok(!a.includes('0013542419'));
  assert.notEqual(a, await nationalIdHmac(PEPPER, 'e2', '0013542419'));
  assert.notEqual(a, await nationalIdHmac(PEPPER + 'x', 'e1', '0013542419'));
  assert.equal(a, await nationalIdHmac(PEPPER, 'e1', '0013542419'));
});

test('timingSafeEqual', () => {
  assert.ok(timingSafeEqual('abc', 'abc'));
  assert.ok(!timingSafeEqual('abc', 'abd'));
  assert.ok(!timingSafeEqual('abc', 'abcd'));
});

test('student number masking keeps only 2+2 digits', () => {
  assert.equal(maskStudentNumber('40012345'), '40****45');
  assert.equal(maskStudentNumber('123'), '****');
});

test('major → association: physical education and sport sciences both resolve to the sport-sciences major', () => {
  const mapped = [{ id: 'sport', name: 'علوم ورزشی' }];
  assert.equal(resolveMajor('علوم ورزشی', mapped), 'sport');
  assert.equal(resolveMajor('تربیت بدنی', mapped), 'sport');
  assert.equal(resolveMajor('تربيت  بدني', mapped), 'sport'); // Arabic ye + double space
  assert.equal(resolveMajor('مهندسی کامپیوتر', mapped), null); // not mapped to this association → rejected
  assert.equal(resolveMajor('', mapped), null);
  assert.equal(normalizeMajorName('روان\u200cشناسی'), 'روان شناسی');
});

test('participation code format and randomness', () => {
  const a = participationCode(), b = participationCode();
  assert.match(a, /^[0-9A-Z]{5}-[0-9A-Z]{5}$/);
  assert.notEqual(a, b);
});

test('Tehran date (no time) and attempt window', () => {
  assert.equal(tehranDate(new Date('2026-10-17T21:00:00Z')), '2026-10-18'); // 00:30 Tehran
  assert.equal(attemptWindowStart(new Date('2026-10-18T10:07:00Z')).toISOString(), '2026-10-18T10:00:00.000Z');
});
