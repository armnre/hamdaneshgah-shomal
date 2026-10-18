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
