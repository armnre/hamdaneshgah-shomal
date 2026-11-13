// 0014: دانشجوی رشته‌ی بدون انجمن در همه‌ی انجمن‌های دانشکده واجد است ولی فقط یک رأی دارد. داده‌ها ساختگی.
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import fs from 'fs';
const dir = new URL('./migrations/', import.meta.url);
const db = new PGlite({ extensions: { pgcrypto } });
const { splitSql } = await import(new URL('./splitSql.mjs', import.meta.url));
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.sql')).sort()) {
  const stmts = splitSql(fs.readFileSync(new URL(f, dir), 'utf8'));
  await db.transaction(async (tx) => { for (const st of stmts) await tx.exec(st); });
}
let failed = false;
const ok = (c, m) => { console.log(c ? 'pass:' : 'FAIL:', m); if (!c) failed = true; };
const env = (await db.query(`SELECT id FROM "Majors" WHERE name = 'علوم و مهندسی محیط زیست'`)).rows[0];
ok(!!env, 'رشته‌ی محیط زیست در Majors ساخته شد');
const els = (await db.query(`SELECT id FROM "Elections" ORDER BY id LIMIT 3`)).rows.map((r) => r.id);
ok(els.length >= 3, 'دست‌کم سه انتخابات در داده‌ی ۱۴۰۵');
const H = 'a'.repeat(64), G = 'faculty:engineering:1405-1406';
const ids = [];
for (const e of els) ids.push((await db.query(`INSERT INTO "EligibleVoters"("studentNumber",election,major,"nationalIdHash","choiceGroup") VALUES('99990001',$1,$2,$3,$4) RETURNING id`, [JSON.stringify([e]), JSON.stringify([env.id]), H, G])).rows[0].id);
// رأی‌دهنده‌ی عادی در همان انتخابات‌ها برای اطمینان از این‌که تریگر روی او اثری ندارد
const plain = (await db.query(`INSERT INTO "EligibleVoters"("studentNumber",election,"nationalIdHash") VALUES('99990002',$1,$2) RETURNING id`, [JSON.stringify([els[0]]), H])).rows[0].id;
const vote = (e, v, code) => db.query(`INSERT INTO "VoterParticipation"(label,election,voter,"votedOn") VALUES($1,$2,$3,'2026-11-14')`, [code, JSON.stringify([e]), JSON.stringify([v])]);
await vote(els[1], ids[1], 'AAAAA-00001'); ok(true, 'رأی اول در یکی از انجمن‌های دانشکده پذیرفته شد');
for (const i of [0, 2]) {
  try { await vote(els[i], ids[i], 'AAAAA-0000' + (i + 2)); ok(false, `رأی دوم در انجمن ${i} پذیرفته شد!`); }
  catch (e) { ok(e.code === '23505', `رأی دوم در انجمن دیگر دانشکده رد شد (${e.code})`); }
}
await vote(els[0], plain, 'BBBBB-00001'); ok(true, 'رأی‌دهنده‌ی عادی تحت تأثیر نیست');
try { await db.exec(`INSERT INTO "EligibleVoters"("studentNumber",election,"nationalIdHash","choiceGroup") VALUES('99990003','["${els[0]}"]','${H}','bad group')`); ok(false, 'choiceGroup نامعتبر پذیرفته شد'); }
catch { ok(true, 'choiceGroup با قالب نامعتبر رد شد'); }
const c = (await db.query(`SELECT COUNT(*)::int n FROM "VoterParticipation" p JOIN "EligibleVoters" v ON v.id = p."voterId" WHERE v."studentNumber"='99990001'`)).rows[0].n;
ok(c === 1, `در کل فقط ${c} مشارکت برای دانشجوی گروه دانشکده`);
if (failed) process.exit(1);
