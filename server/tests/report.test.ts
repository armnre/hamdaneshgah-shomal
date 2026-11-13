// گزارش رسمی نتایج: رتبه‌بندی، منتخب/علی‌البدل، تساوی مرزی، رأی سفید، کنترل‌های صحت، اثر انگشت.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildElectionReport, ALTERNATES, type ReportInput } from '../src/lib/electionReport.ts';

const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8');
const C = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `c${i + 1}`, fullName: `نامزد ${i + 1}` }));
const base = (over: Partial<ReportInput> = {}): ReportInput => ({
  election: { id: 'e1', title: 'انتخابات انجمن علمی حقوق', association: 'انجمن علمی حقوق', academicYear: '1405-1406', status: 'Counting', seats: 5, maxChoicesPerVoter: 5, votingStart: null, votingEnd: null },
  candidates: C(9), ballots: [], eligible: 100, turnout: 0, generatedAt: '2026-11-13T10:00:00.000Z', ...over,
});
// برگه‌ها با آرای داده‌شده: votes[i] = تعداد رأی نامزد i+1
// برگه‌های تک‌انتخابی که دقیقاً همین آرا را می‌سازند
const ballotsFor = (votes: number[]) => votes.flatMap((v, i) => Array.from({ length: v }, () => [`c${i + 1}`]));

test('شمارش، رتبه، منتخبان (۵ کرسی) و ۲ علی‌البدل', async () => {
  const b = ballotsFor([9, 8, 7, 6, 5, 4, 3, 2, 1]);
  const r = await buildElectionReport(base({ ballots: b, turnout: b.length }));
  assert.deepEqual(r.rows.map((x) => x.votes), [9, 8, 7, 6, 5, 4, 3, 2, 1]);
  assert.deepEqual(r.rows.map((x) => x.rank), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.deepEqual(r.elected, ['نامزد 1', 'نامزد 2', 'نامزد 3', 'نامزد 4', 'نامزد 5']);
  assert.equal(ALTERNATES, 2);
  assert.deepEqual(r.alternates, ['نامزد 6', 'نامزد 7']);
  assert.equal(r.rows.filter((x) => x.outcome === 'not-elected').length, 2);
  assert.equal(r.stats.totalVotes, 45);
  assert.equal(r.stats.ballots, 45); assert.equal(r.stats.turnoutPercent, 45);
  assert.equal(r.rows[0].percentOfBallots, 20);
  assert.ok(r.integrity.ok); assert.deepEqual(r.warnings, []);
});

test('رأی سفید شمرده می‌شود ولی رأی هیچ نامزدی نیست', async () => {
  const b = [['c1'], [], [], ['c1', 'c2']];
  const r = await buildElectionReport(base({ ballots: b, turnout: 4 }));
  assert.equal(r.stats.blank, 2); assert.equal(r.stats.validBallots, 2); assert.equal(r.stats.ballots, 4);
  assert.equal(r.rows[0].votes, 2); assert.equal(r.stats.averageChoices, 1.5);
});

test('نامزد بدون رأی منتخب نمی‌شود و کرسی خالی هشدار می‌دهد', async () => {
  const r = await buildElectionReport(base({ ballots: [['c1'], ['c2']], turnout: 2 }));
  assert.equal(r.elected.length, 2); assert.equal(r.alternates.length, 0);
  assert.ok(r.warnings.some((w) => w.includes('کرسی خالی')));
});

test('تساوی روی مرز منتخب/علی‌البدل علامت می‌خورد و هشدار قرعه می‌دهد', async () => {
  const b = ballotsFor([9, 8, 7, 6, 5, 5, 3]);
  const r = await buildElectionReport(base({ candidates: C(7), ballots: b, turnout: b.length }));
  assert.deepEqual(r.rows.filter((x) => x.tie).map((x) => x.votes), [5, 5]);
  assert.equal(r.rows[4].rank, 5); assert.equal(r.rows[5].rank, 5);
  assert.ok(r.warnings.some((w) => w.includes('قرعه')));
});

test('تساوی دور از مرز هشدار نمی‌دهد', async () => {
  const b = ballotsFor([9, 9, 7, 6, 5, 4, 3, 1]);
  const r = await buildElectionReport(base({ candidates: C(8), ballots: b, turnout: b.length }));
  assert.equal(r.rows.filter((x) => x.tie).length, 0); assert.deepEqual(r.warnings, []);
  assert.equal(r.rows[1].rank, 1);
});

test('کنترل‌های صحت: ناهمخوانی مشارکت، نامزد ناشناس، بیش از سقف، نام تکراری', async () => {
  const r = await buildElectionReport(base({ election: { ...base().election, maxChoicesPerVoter: 2 }, ballots: [['c1', 'x9'], ['c1', 'c2', 'c3'], ['c2', 'c2']], turnout: 5, eligible: 4 }));
  const bad = Object.fromEntries(r.integrity.checks.map((c) => [c.key, c.ok]));
  assert.deepEqual(bad, { turnout: false, eligible: false, unknown: false, limit: false, dup: false });
  assert.equal(r.integrity.ok, false);
  assert.equal(r.rows.find((x) => x.id === 'c2')!.votes, 2, 'نام تکراری در یک برگه فقط یک رأی است');
  assert.equal(r.warnings.filter((w) => w.startsWith('کنترل صحت')).length, 5);
});

test('اثر انگشت: برای نتیجه‌ی یکسان ثابت، با تغییر یک رأی متفاوت', async () => {
  const b = ballotsFor([3, 2, 1]);
  const a1 = await buildElectionReport(base({ candidates: C(3), ballots: b, turnout: 3 }));
  const a2 = await buildElectionReport(base({ candidates: C(3), ballots: [...b].reverse(), turnout: 3, generatedAt: '2027-01-01T00:00:00Z' }));
  const a3 = await buildElectionReport(base({ candidates: C(3), ballots: [...b, ['c3']], turnout: 4 }));
  assert.match(a1.fingerprint, /^[0-9a-f]{64}$/);
  assert.equal(a1.fingerprint, a2.fingerprint); assert.notEqual(a1.fingerprint, a3.fingerprint);
});

test('بدون برگه: گزارش خالی ولی معتبر', async () => {
  const r = await buildElectionReport(base({ eligible: 0 }));
  assert.equal(r.stats.turnoutPercent, 0); assert.equal(r.elected.length, 0); assert.ok(r.integrity.ok);
});

test('دسترسی: گزارش ادمین فقط برای مدیر و پس از پایان رأی‌گیری؛ گزارش عمومی فقط پس از اعلام نتایج', () => {
  const admin = read('../src/api/adminElectionReports.ts'), pub = read('../src/api/getElectionReports.ts'), data = read('../src/lib/reportData.ts');
  assert.match(admin, /authenticated: true/); assert.match(admin, /requireAccess\(context\.user, 'elections'\)/);
  assert.doesNotMatch(admin, /'Voting Open'/);
  assert.match(pub, /RESULT_STAGES/); assert.doesNotMatch(pub, /Counting|Closed/);
  assert.match(data, /"isDemo" = false/);
  assert.doesNotMatch(data, /studentNumber|nationalId/, 'گزارش هیچ داده‌ی هویتی رأی‌دهنده نمی‌خواند');
});
