// خروجی‌های گزارش: xlsx معتبر (zip + CRC32)، CSV با BOM و escape درست، نام برگه‌ها یکتا و مجاز، JSON نسخه‌دار.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildElectionReport } from '../src/lib/electionReport.ts';
import { crc32, zipStore, toXlsx, reportSheets, toCsv, toJson } from '../../apps/hamdaneshgah-web/src/lib/reportExport.ts';

const mk = (id: string, assoc: string, votes: number[]) => buildElectionReport({
  election: { id, title: 't', association: assoc, academicYear: '1405-1406', status: 'Results Published', seats: 5, maxChoicesPerVoter: 5, votingStart: null, votingEnd: null },
  candidates: votes.map((_, i) => ({ id: `${id}c${i}`, fullName: `نامزد "${i + 1}", <ب>` })),
  ballots: votes.flatMap((v, i) => Array.from({ length: v }, () => [`${id}c${i}`])), eligible: 500, turnout: votes.reduce((a, b) => a + b, 0), generatedAt: '2026-11-13T10:00:00Z' });

test('CRC32 استاندارد', () => assert.equal(crc32(new TextEncoder().encode('123456789')), 0xcbf43926));

test('zip: امضاها، تعداد فایل‌ها و CRC هر فایل درست است', () => {
  const files = [{ name: 'a.txt', data: new TextEncoder().encode('سلام') }, { name: 'b/c.xml', data: new TextEncoder().encode('<x/>') }];
  const z = zipStore(files), v = new DataView(z.buffer);
  assert.equal(v.getUint32(0, true), 0x04034b50);
  const eocd = z.length - 22;
  assert.equal(v.getUint32(eocd, true), 0x06054b50); assert.equal(v.getUint16(eocd + 10, true), 2);
  let p = v.getUint32(eocd + 16, true);
  for (const f of files) { assert.equal(v.getUint32(p, true), 0x02014b50); assert.equal(v.getUint32(p + 16, true), crc32(f.data)); p += 46 + v.getUint16(p + 28, true); }
});

test('xlsx: برگه‌ی خلاصه + یک برگه برای هر انجمن، راست‌به‌چپ، اعداد عددی، متن escape شده', async () => {
  const reps = [await mk('e1', 'انجمن علمی حقوق', [9, 8, 7]), await mk('e2', 'انجمن علمی حقوق', [3, 2]), await mk('e3', 'انجمن علمی مهندسی برق و مهندسی پزشکی', [5])];
  const sheets = reportSheets(reps);
  assert.deepEqual(sheets.map((s) => s.name), ['خلاصه', 'حقوق', 'حقوق 2', 'مهندسی برق و مهندسی پزشکی']);
  assert.ok(sheets.every((s) => s.name.length <= 31 && !/[\\/?*[\]:]/.test(s.name)));
  const text = new TextDecoder().decode(toXlsx(sheets));
  assert.match(text, /\[Content_Types\]\.xml/); assert.match(text, /rightToLeft="1"/);
  assert.match(text, /<c r="C8"><v>9<\/v><\/c>/);
  assert.match(text, /&lt;ب&gt;/); assert.doesNotMatch(text, /<ب>/);
});

test('CSV: BOM برای اکسل، هر نامزد یک ردیف، escape نقل‌قول و ویرگول', async () => {
  const csv = toCsv([await mk('e1', 'انجمن علمی حقوق', [9, 8])]);
  assert.ok(csv.startsWith('\uFEFF'));
  const lines = csv.trim().split('\r\n');
  assert.equal(lines.length, 3);
  assert.match(lines[1], /"نامزد ""1"", <ب>"/);
  assert.match(lines[1], /,منتخب,/);
});

test('JSON: قالب نسخه‌دار و کامل', async () => {
  const j = JSON.parse(toJson([await mk('e1', 'انجمن علمی حقوق', [1])]));
  assert.equal(j.format, 'hamdaneshgah.election-report/v1');
  assert.equal(j.reports[0].rows[0].votes, 1);
  assert.match(j.reports[0].fingerprint, /^[0-9a-f]{64}$/);
});
