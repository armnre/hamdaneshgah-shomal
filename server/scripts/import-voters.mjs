// Imports the university student list (Excel .xlsx or CSV) as eligible voters of the 1405-1406
// association elections. Each student is placed in the election of their major's association.
// National IDs are never stored: only the per-election HMAC (same as the admin import / verifyVoter).
//
// Usage (in server/):
//   npm run import-voters -- /root/students.xlsx            # dry run: counts + problems only
//   npm run import-voters -- /root/students.xlsx --commit   # write
// Expected columns: شماره دانشجو, نام خانوادگی, نام, شماره ملی, نام رشته تحصیلی (مقطع optional).
// Prints no student numbers or national IDs. Safe to re-run (existing voters are skipped).
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';
import { createHmac } from 'node:crypto';
import pg from 'pg';

const file = process.argv[2];
const commit = process.argv.includes('--commit');
if (!file) { console.error('Usage: npm run import-voters -- <file.xlsx|file.csv> [--commit]'); process.exit(1); }
const pepper = process.env.ZITE_VOTER_PEPPER ?? process.env.VOTER_PEPPER;
if (!pepper || pepper.length < 32) { console.error('ZITE_VOTER_PEPPER is missing or too short in server/.env'); process.exit(1); }

// ── reading ──────────────────────────────────────────────────────────────
function unzip(buf) {
  let eocd = buf.length - 22;
  while (eocd >= 0 && buf.readUInt32LE(eocd) !== 0x06054b50) eocd--;
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const files = {};
  for (let i = 0; i < count; i++) {
    const method = buf.readUInt16LE(p + 10), size = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28), extraLen = buf.readUInt16LE(p + 30), commentLen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen);
    const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const data = buf.subarray(start, start + size);
    files[name] = () => (method === 8 ? inflateRawSync(data) : data).toString('utf8');
    p += 46 + nameLen + extraLen + commentLen;
  }
  return files;
}
const xmlText = (s) => s.replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
const colIndex = (ref) => [...ref.replace(/\d+/g, '')].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;

function readXlsx(path) {
  const z = unzip(readFileSync(path));
  const shared = z['xl/sharedStrings.xml'] ? [...z['xl/sharedStrings.xml']().matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => xmlText(m[1])) : [];
  const sheetName = Object.keys(z).filter((n) => /^xl\/worksheets\/sheet\d+\.xml$/.test(n)).sort()[0];
  const rows = [];
  for (const r of z[sheetName]().matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
    const row = [];
    for (const c of r[1].matchAll(/<c ([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const ref = /r="([A-Z]+\d+)"/.exec(c[1])?.[1]; const t = /t="(\w+)"/.exec(c[1])?.[1];
      const body = c[2] ?? '';
      const v = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1];
      row[ref ? colIndex(ref) : row.length] = t === 's' ? shared[Number(v)] : t === 'inlineStr' ? xmlText(body) : v != null ? xmlText(v) : '';
    }
    rows.push(row.map((x) => x ?? ''));
  }
  return rows;
}
function readCsv(path) {
  return readFileSync(path, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean).map((l) => l.split(/,|\t|;/).map((x) => x.replace(/^"|"$/g, '')));
}

// ── normalizing ──────────────────────────────────────────────────────────
const norm = (s) => String(s ?? '').replace(/[يى]/g, 'ی').replace(/ك/g, 'ک').replace(/[\u064B-\u065F\u0670]/g, '').replace(/[\u200c\u200f\u200e]/g, ' ').replace(/\s+/g, ' ').trim();
const digits = (s) => String(s ?? '').replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/\.0+$/, '').replace(/\D/g, '');
function nationalId(raw) {
  let c = digits(raw);
  if (c.length >= 8 && c.length < 10) c = c.padStart(10, '0');
  if (!/^\d{10}$/.test(c) || /^(\d)\1{9}$/.test(c)) return null;
  const sum = [...c.slice(0, 9)].reduce((s, d, i) => s + Number(d) * (10 - i), 0) % 11;
  return (sum < 2 ? Number(c[9]) === sum : Number(c[9]) === 11 - sum) ? c : null;
}

// University major name → [association slug, system major name]. Order matters.
function associationFor(major) {
  const m = norm(major).replace(/ /g, '');
  const has = (...w) => w.some((x) => m.includes(x.replace(/ /g, '')));
  if (has('مهندسی پزشکی')) return ['electrical-engineering', 'مهندسی پزشکی'];
  if (has('برق', 'الکترونیک')) return ['electrical-engineering', 'مهندسی برق'];
  if (has('کامپیوتر')) return ['computer-engineering', 'مهندسی کامپیوتر'];
  if (has('معماری')) return ['architecture', 'مهندسی معماری'];
  if (has('عمران', 'نقشه برداری', 'شهرسازی')) return ['civil-engineering', 'مهندسی عمران'];
  if (has('صنایع')) return ['industrial-engineering', 'مهندسی صنایع'];
  if (has('شیمی')) return ['chemical-engineering', 'مهندسی شیمی'];
  if (has('مکانیک', 'مکاترونیک')) return ['mechanical-engineering', 'مهندسی مکانیک'];
  if (has('حقوق', 'علوم قضایی')) return ['law', 'حقوق'];
  if (has('حسابداری', 'حسابرسی')) return ['accounting', 'حسابداری'];
  if (has('ورزش', 'تربیت بدنی')) return ['sport-sciences', 'علوم ورزشی'];
  if (has('مدیریت')) return ['management', 'مدیریت'];
  if (has('روانشناسی')) return ['psychology', 'روان‌شناسی'];
  if (has('علوم تربیتی')) return ['educational-sciences', 'علوم تربیتی'];
  return null;
}

// ── main ─────────────────────────────────────────────────────────────────
const table = /\.csv$|\.txt$/i.test(file) ? readCsv(file) : readXlsx(file);
const header = table[0].map(norm);
const col = (...names) => header.findIndex((h) => names.some((n) => h.replace(/ /g, '') === norm(n).replace(/ /g, '')));
const C = { sn: col('شماره دانشجو', 'شماره دانشجویی'), last: col('نام خانوادگی'), first: col('نام'), nid: col('شماره ملی', 'کد ملی'), major: col('نام رشته تحصیلی', 'رشته') };
for (const [k, v] of Object.entries(C)) if (v < 0) { console.error(`Column not found: ${k}. Header: ${header.join(' | ')}`); process.exit(1); }

const db = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined });
await db.connect();
const el = await db.query(`SELECT a."slug", e.id, e.status, e."title" FROM "Elections" e
  JOIN "AssociationYears" ay ON ay.id = e."associationYearId" JOIN "Associations" a ON a.id = ay."associationId"
  JOIN "AcademicYears" y ON y.id = ay."academicYearId" WHERE y."title" = '1405-1406'`);
const elections = Object.fromEntries(el.rows.map((r) => [r.slug, r]));
const majors = Object.fromEntries((await db.query(`SELECT id, "name" FROM "Majors"`)).rows.map((r) => [norm(r.name), r.id]));
const OPEN = ['Draft', 'Candidacy Open', 'Candidate Review', 'Final List'];

const problems = {}; const unmapped = {}; const out = []; const seen = new Set();
const bump = (o, k) => (o[k] = (o[k] ?? 0) + 1);
for (const r of table.slice(1)) {
  if (!r.some((x) => String(x).trim())) continue;
  const sn = digits(r[C.sn]); const nid = nationalId(r[C.nid]); const majorName = norm(r[C.major]);
  if (!/^\d{5,16}$/.test(sn)) { bump(problems, 'شماره دانشجویی نامعتبر'); continue; }
  if (!nid) { bump(problems, 'کد ملی نامعتبر'); continue; }
  if (seen.has(sn)) { bump(problems, 'شماره دانشجویی تکراری در فایل'); continue; }
  seen.add(sn);
  const a = associationFor(majorName);
  if (!a) { bump(unmapped, majorName || '(خالی)'); continue; }
  const e = elections[a[0]]; const majorId = majors[norm(a[1])];
  if (!e || !majorId) { bump(problems, `انتخابات/رشته‌ی ${a[0]} در دیتابیس نیست (npm run migrate اجرا شده؟)`); continue; }
  if (!OPEN.includes(e.status)) { bump(problems, `«${e.title}» در وضعیت ${e.status} است و قفل است`); continue; }
  out.push({ e, sn, majorId, fullName: norm(`${r[C.first]} ${r[C.last]}`).slice(0, 150), majorName: majorName.slice(0, 150),
    hash: createHmac('sha256', pepper).update(`nid:v2:${e.id}:${nid}`).digest('hex'), last4: nid.slice(-4) });
}

const per = {};
for (const v of out) bump(per, v.e.title);
console.log(`\nردیف‌های معتبر: ${out.length} از ${table.length - 1}`);
console.table(Object.entries(per).map(([t, n]) => ({ انتخابات: t, رأی‌دهنده: n })));
if (Object.keys(problems).length) { console.log('ردشده‌ها:'); console.table(problems); }
if (Object.keys(unmapped).length) { console.log('رشته‌های بدون انجمن (وارد نشدند):'); console.table(unmapped); }

if (!commit) { console.log('\nاجرای آزمایشی بود. برای ثبت، همین دستور را با --commit اجرا کنید.'); await db.end(); process.exit(0); }
let inserted = 0;
await db.query('BEGIN');
try {
  for (const v of out) {
    const r = await db.query(`INSERT INTO "EligibleVoters" ("studentNumber", "election", "major", "fullName", "majorName", "nationalIdHash", "nationalIdLast4")
      VALUES ($1, jsonb_build_array($2::text), jsonb_build_array($3::text), $4, $5, $6, $7) ON CONFLICT ("electionId", "studentNumber") DO NOTHING`,
      [v.sn, v.e.id, v.majorId, v.fullName, v.majorName, v.hash, v.last4]);
    inserted += r.rowCount;
  }
  await db.query(`INSERT INTO "AuditLogs" ("action", "entity", "entityId", "details", "actorEmail") VALUES ('create', 'voters', 'all-1405', $1, 'script:import-voters')`,
    [`imported ${inserted} voters (${out.length - inserted} already present)`]);
  await db.query('COMMIT');
} catch (e) { await db.query('ROLLBACK'); throw e; }
console.log(`\n✓ ثبت شد: ${inserted} رأی‌دهنده‌ی جدید (${out.length - inserted} از قبل بودند).`);
await db.end();
