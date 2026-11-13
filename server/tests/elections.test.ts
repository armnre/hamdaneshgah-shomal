// تست‌های انتخابات: نگاشت رشته ← انجمن روی همه‌ی رشته‌های فهرست واقعی دانشگاه (فقط نام رشته‌ها، بدون داده‌ی شخصی)،
// هم‌خوانی نسخه‌ی سرور و سایت، پیدا کردن خودکار انتخابات، ورود کل فهرست و قواعد زمان/وضعیت.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { associationForMajor, normalizeMajor, ASSOCIATION_RULES, SYSTEM_MAJORS } from '../src/lib/majorMap.ts';
import { normalizeNationalId, normalizeStudentNumber, canTransition, clockTarget, listsLocked, timingSafeEqual, nationalIdHmac } from '../src/lib/policy.ts';

const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8');

// همه‌ی نام رشته‌های فایل دانشجویان ۱۴۰۵ (با ی/ک عربی و فاصله‌های دوتایی، همان‌طور که در اکسل آمده) → انجمن مورد انتظار
const UNIVERSITY_MAJORS: Record<string, string> = {
  'حسابداري': 'accounting', 'مهندسي معماري': 'architecture', 'حقوق': 'law', 'علوم  ورزشي': 'sport-sciences',
  'مهندسي كامپيوتر': 'computer-engineering', 'روانشناسي': 'psychology', 'مديريت بازرگاني': 'management', 'مديريت مالي': 'management',
  'مهندسي عمران': 'civil-engineering', 'معماري داخلي': 'architecture', 'مهندسي پزشكي': 'electrical-engineering', 'مديريت امور بانكي': 'management',
  'علوم قضايي': 'law', 'آسيب شناسي ورزشي و تمرينات اصلاحي- تمرينات اصلاحي': 'sport-sciences', 'مهندسي شيمي': 'chemical-engineering',
  'حقوق خصوصي': 'law', 'تربيت بدني': 'sport-sciences', 'حقوق كيفري و جرم شناسي': 'law', 'علوم تربيتي': 'educational-sciences',
  'مهندسي صنايع وسيستمها': 'industrial-engineering', 'مهندسي برق': 'electrical-engineering', 'فيزيولوژي ورزشي -  فيزيولوژي ورزشي كاربردي': 'sport-sciences',
  'علوم ورزشي': 'sport-sciences', 'مهندسي نقشه برداري': 'civil-engineering', 'مهندسي مكانيك': 'mechanical-engineering', 'مهندسي صنايع': 'industrial-engineering',
  'مهندسي و علم كامپيوتر - هوش مصنوعي': 'computer-engineering', 'فيزيولوژي ورزشي-فيزيولوژي ورزشي و تندرستي': 'sport-sciences',
  'مديريت دولتي-توسعه منابع انساني': 'management', 'مديريت ورزشي-مديريت سازمان ها و باشگاه هاي ورزشي': 'sport-sciences',
  'مهندسي پزشكي-بيوالكتريك': 'electrical-engineering', 'حسابرسي': 'accounting', 'مهندسي حرفه اي كامپيوتر-نرم افزار': 'computer-engineering',
  'مهندسي عمران-مهندسي و مديريت ساخت': 'civil-engineering', 'مهندسي و علم كامپيوتر - نرم افزار': 'computer-engineering', 'حقوق بين الملل': 'law',
  'حقوق عمومي': 'law', 'مهندسي عمران- حمل و نقل': 'civil-engineering', 'مديريت كسب و كار - بازاريابي': 'management', 'مديريت ورزشي': 'sport-sciences',
  'مديريت صنعتي - توليد و عمليات': 'management', 'مهندسي صنايع گرايش مدل سازي سيستم ها و تحليل داده ها': 'industrial-engineering',
  'مهندسي و علم كامپيوتر - شبكه هاي كامپيوتري': 'computer-engineering', 'مهندسي صنايع - لجستيك و زنجيره تامين': 'industrial-engineering',
  'مهندسي عمران-حمل و نقل': 'civil-engineering', 'مهندسي عمران - راه و ترابري': 'civil-engineering', 'مهندسي برق - سيستم هاي قدرت': 'electrical-engineering',
  'مهندسي عمران - سازه': 'civil-engineering', 'مهندسي برق - سيستمهاي انرژي الكتريكي': 'electrical-engineering', 'مهندسي صنايع - مديريت مهندسي': 'industrial-engineering',
  'مهندسي كامپيوتر-هوش مصنوعي و رباتيك': 'computer-engineering', 'مهندسي حرفه اي معماري': 'architecture', 'حقوق جزا و جرم شناسي': 'law',
  'مهندسي كامپيوتر-نرم افزار': 'computer-engineering', 'مهندسي عمران-ژئوتكنيك': 'civil-engineering', 'حسابداري قضايي': 'accounting',
  'مهندسي كامپيوتر-شبكه هاي كامپيوتري': 'computer-engineering', 'مهندسي حرفه اي الكترونيك كاربردي': 'electrical-engineering', 'مهندسي حرفه اي عمران': 'civil-engineering',
  'مهندسي مكاترونيك': 'mechanical-engineering', 'مهندسي اجرائي عمران': 'civil-engineering', 'مهندسي برق- سيستم هاي الكترونيك ديجيتال': 'electrical-engineering',
  'مهندسي شهرسازي': 'civil-engineering', 'مهندسي شيمي -  صنايع غذايي': 'chemical-engineering', 'مهندسي شيمي - نانوفناوري': 'chemical-engineering',
};

test('همه‌ی رشته‌های فهرست دانشگاه به انجمن درست می‌روند (هیچ دانشجویی جا نمی‌ماند)', () => {
  assert.ok(Object.keys(UNIVERSITY_MAJORS).length >= 65);
  for (const [major, slug] of Object.entries(UNIVERSITY_MAJORS)) assert.equal(associationForMajor(major)?.slug, slug, major);
});

test('ترتیب قواعد: «مهندسی صنایع - مدیریت مهندسی» صنایع است نه مدیریت؛ «مدیریت ورزشی» ورزشی؛ «شیمی - صنایع غذایی» شیمی', () => {
  assert.equal(associationForMajor('مهندسی صنایع - مدیریت مهندسی')?.slug, 'industrial-engineering');
  assert.equal(associationForMajor('مدیریت ورزشی')?.slug, 'sport-sciences');
  assert.equal(associationForMajor('مهندسی پزشکی')?.major, 'مهندسی پزشکی');
});

test('رشته‌ی بدون انجمن یا خالی → null (مسیر «بدون انجمن»)', () => {
  for (const m of ['زبان انگلیسی', 'فیزیک', '', '   ', null, undefined]) assert.equal(associationForMajor(m), null, String(m));
});

test('نرمال‌سازی: ی/ک عربی، نیم‌فاصله و فاصله‌ی تکراری', () => {
  assert.equal(normalizeMajor('روان\u200cشناسي'), 'روان شناسی');
  assert.equal(normalizeMajor('  علوم   ورزشي '), 'علوم ورزشی');
  assert.equal(associationForMajor('روان‌شناسی')?.slug, 'psychology');
});

test('نسخه‌ی سایت majorMap دقیقاً همان قواعد سرور است', () => {
  const strip = (s: string) => s.split('\n').filter((l) => !l.startsWith('//')).join('\n');
  assert.equal(strip(read('../../apps/hamdaneshgah-web/src/lib/majorMap.ts')), strip(read('../src/lib/majorMap.ts')));
});

test('همه‌ی رشته‌های سیستمی و انجمن‌ها در مایگریشن ۰۰۱۳ نگاشت شده‌اند', () => {
  const mig = read('../db/migrations/0013_major_mapping_complete.sql');
  for (const { slug, major } of SYSTEM_MAJORS) assert.ok(mig.includes(`('${slug}', '${major}')`), `${slug} ← ${major}`);
  assert.match(mig, /ON CONFLICT \("associationYearId", "majorId"\) DO NOTHING/);
  assert.equal(new Set(ASSOCIATION_RULES.map((r) => r.slug)).size, 13);
});

test('اسکریپت CLI، ورود دستی و ورود کل فهرست همه از majorMap مشترک استفاده می‌کنند', () => {
  assert.match(read('../scripts/import-voters.mjs'), /from '\.\.\/src\/lib\/majorMap\.ts'/);
  assert.match(read('../src/api/importVoters.ts'), /associationForMajor/);
  assert.match(read('../src/api/importVotersAuto.ts'), /placeVoter/);
});

test('ورود کل فهرست: فقط مدیر، بدون کد ملی خام، دسته‌های ≤۱۰۰، قفل پس از شروع رأی‌گیری', () => {
  const s = read('../src/api/importVotersAuto.ts');
  assert.match(s, /requireAccess\(context\.user, 'voters'\)/);
  assert.match(s, /authenticated: true/);
  assert.doesNotMatch(s, /nationalId: nid\b|nationalId: r\.nationalId/);
  assert.match(s, /nationalIdHash: await hashNationalId/);
  assert.match(s, /i \+= 100/);
  assert.doesNotMatch(s.match(/const EDITABLE = \[[^\]]*\]/)![0], /Voting Open/);
});

test('findMyElection: محدودیت تلاش، مقایسه‌ی زمان-ثابت، پیام کلی، بدون باز کردن نشست', () => {
  const s = read('../src/api/findMyElection.ts');
  assert.match(s, /reserveAttempt/);
  assert.match(s, /releaseAttempt\(ids\)/);
  assert.match(s, /timingSafeEqual/);
  assert.doesNotMatch(s, /voterSessions\.create/);
  assert.doesNotMatch(s, /nationalIdLast4|fullName/); // هیچ داده‌ی شخصی برنمی‌گرداند
  assert.equal((s.match(/userFacingMessage: GENERIC/g) ?? []).length, 1);
});

test('صفحه‌ی رأی: شناسه‌ها پس از باز شدن نشست پاک می‌شوند و هشدار خروج دارد', () => {
  const s = read('../../apps/hamdaneshgah-web/src/pages/Vote.tsx');
  assert.match(s, /setSn\(''\); setNid\(''\)/);
  assert.match(s, /beforeunload/);
  assert.match(s, /findMyElection\(/);
  assert.doesNotMatch(s, /localStorage|sessionStorage/);
});

test('کد ملی: ارقام فارسی، صفرهای جاافتاده، رقم کنترل', () => {
  assert.equal(normalizeNationalId('۰۰۱۲۳۴۵۶۷۸') , normalizeNationalId('0012345678'));
  assert.equal(normalizeNationalId('12345678'), normalizeNationalId('0012345678'));
  assert.equal(normalizeNationalId('1111111111'), null);
  assert.equal(normalizeNationalId('123'), null);
  assert.equal(normalizeStudentNumber('۴۰۱۱۲۳۴۵۶'), '401123456');
  assert.equal(normalizeStudentNumber('12a'), null);
});

test('هش کد ملی برای هر انتخابات جداست و مقایسه زمان-ثابت درست کار می‌کند', async () => {
  const p = 'x'.repeat(40);
  const a = await nationalIdHmac(p, 'e1', '0012345678'), b = await nationalIdHmac(p, 'e2', '0012345678');
  assert.notEqual(a, b);
  assert.equal(timingSafeEqual(a, a), true);
  assert.equal(timingSafeEqual(a, b), false);
});

test('ساعت انتخابات: باز شدن در شروع و بسته شدن در پایان', () => {
  const s = '2026-11-14T08:00:00+03:30', e = '2026-11-14T22:00:00+03:30';
  assert.equal(clockTarget('Final List', s, e, new Date('2026-11-14T07:59:00+03:30')), null);
  assert.equal(clockTarget('Final List', s, e, new Date('2026-11-14T08:00:00+03:30')), 'Voting Open');
  assert.equal(clockTarget('Voting Open', s, e, new Date('2026-11-14T22:00:01+03:30')), 'Closed');
});

test('چرخه‌ی وضعیت: بازگشت پس از شروع رأی‌گیری ممنوع، فهرست‌ها پس از بررسی قفل', () => {
  assert.equal(canTransition('Voting Open', 'Final List'), false);
  assert.equal(canTransition('Final List', 'Voting Open'), true);
  assert.equal(listsLocked('Voting Open'), true);
  assert.equal(listsLocked('Candidacy Open'), false);
});

// ── رشته‌های بدون انجمن → یکی از انجمن‌های دانشکده (۱۴۰۵) ──
import { placeVoter, facultyAssociations, facultyFromName, choiceGroupKey, ASSOCIATION_FACULTY } from '../src/lib/majorMap.ts';

// همه‌ی رشته‌های فهرست رسمی سایت دانشگاه (همه‌ی مقطع‌ها) → انجمن مورد انتظار
const OFFICIAL: Record<string, string> = {
  'مهندسی عمران (حمل‌ونقل)': 'civil-engineering', 'مهندسی و علم کامپیوتر': 'computer-engineering', 'مهندسی مکاترونیک': 'mechanical-engineering',
  'معماری داخلی': 'architecture', 'مهندسی شهرسازی': 'civil-engineering', 'مهندسی صنایع و سیستم‌ها': 'industrial-engineering',
  'مهندسی نقشه‌برداری': 'civil-engineering', 'عمران': 'civil-engineering', 'الکترونیک کاربردی': 'electrical-engineering', 'برق قدرت': 'electrical-engineering',
  'کامپیوتر نرم‌افزار': 'computer-engineering', 'معماری': 'architecture', 'مهندسی پزشکی': 'electrical-engineering', 'مهندسی برق': 'electrical-engineering',
  'حسابرسی': 'accounting', 'حسابداری قضایی': 'accounting', 'حقوق بین‌الملل': 'law', 'حقوق کیفری و جرم‌شناسی': 'law', 'علوم قضایی': 'law',
  'مدیریت دولتی': 'management', 'مدیریت صنعتی': 'management', 'مدیریت کسب‌وکار': 'management', 'مدیریت بازرگانی': 'management', 'مدیریت مالی': 'management',
  'روان‌شناسی': 'psychology', 'علوم تربیتی': 'educational-sciences',
  'مدیریت ورزشی': 'sport-sciences', 'آسیب‌شناسی ورزشی و تمرینات اصلاحی': 'sport-sciences', 'فیزیولوژی ورزشی': 'sport-sciences', 'تربیت بدنی': 'sport-sciences',
};

test('همه‌ی رشته‌های فهرست رسمی دانشگاه، در همه‌ی مقطع‌ها، به انجمن درست می‌روند', () => {
  for (const [m, slug] of Object.entries(OFFICIAL)) {
    const p = placeVoter(m);
    assert.equal(p?.kind, 'association', m);
    assert.equal(p?.kind === 'association' && p.rule.slug, slug, m);
  }
});

test('ارشد/دکتری با گرایش: هوش مصنوعی → کامپیوتر، هر مدیریتی → مدیریت', () => {
  assert.equal(associationForMajor('مهندسی کامپیوتر - هوش مصنوعی')?.slug, 'computer-engineering');
  assert.equal(associationForMajor('مدیریت امور بانکی')?.slug, 'management');
});

test('محیط زیست انجمن ندارد → انتخاب یکی از ۷ انجمن دانشکده فنی', () => {
  const p = placeVoter('علوم و مهندسی محیط زیست');
  assert.equal(p?.kind, 'faculty');
  if (p?.kind !== 'faculty') return;
  assert.equal(p.faculty, 'engineering');
  assert.deepEqual(p.associations.map((a) => a.slug).sort(), ['architecture', 'chemical-engineering', 'civil-engineering', 'computer-engineering', 'electrical-engineering', 'industrial-engineering', 'mechanical-engineering']);
  assert.equal(placeVoter('مهندسي محيط زيست')?.kind, 'faculty');
});

test('رشته‌ی ناشناخته: از ستون دانشکده یا واژه‌ی «مهندسی»، وگرنه null', () => {
  assert.equal(placeVoter('مهندسی هوافضا')?.kind, 'faculty');
  const h = placeVoter('زبان انگلیسی', 'دانشکده علوم انسانی و اجتماعی');
  assert.equal(h?.kind === 'faculty' && h.faculty, 'humanities');
  assert.equal(facultyFromName('دانشکده علوم ورزشی'), 'sport-sciences');
  assert.equal(placeVoter('زبان انگلیسی'), null);
  assert.equal(placeVoter(''), null);
});

test('هر انجمن دانشکده دارد و هر دانشکده دست‌کم یک انجمن', () => {
  for (const r of ASSOCIATION_RULES) assert.ok(ASSOCIATION_FACULTY[r.slug], r.slug);
  for (const f of ['engineering', 'humanities', 'sport-sciences'] as const) assert.ok(facultyAssociations(f).length > 0, f);
  assert.match(choiceGroupKey('engineering', '1405-1406'), /^faculty:[a-z-]+:[0-9-]+$/);
});

test('یک رأی در هر گروه دانشکده: تریگر پایگاه داده + بررسی در verifyVoter و castVote', () => {
  const mig = read('../db/migrations/0014_faculty_choice_pool.sql');
  assert.match(mig, /pg_advisory_xact_lock/);
  assert.match(mig, /ERRCODE = 'unique_violation'/);
  assert.match(mig, /علوم و مهندسی محیط زیست/);
  assert.match(read('../src/api/verifyVoter.ts'), /choiceGroup/);
  assert.match(read('../src/api/castVote.ts'), /choiceGroup/);
  assert.match(read('../src/platform/db.ts'), /choiceGroup: 'text'/);
});

test('فهرست رسمی رشته‌ها: دانشکده‌ی هر رشته با انجمنش یکی است و مایگریشن 0015 هم‌خوان است', async () => {
  const { MAJOR_CATALOG } = await import('../src/lib/majorMap.ts');
  const sql = read('../db/migrations/0015_major_catalog.sql');
  const rows = [...sql.matchAll(/^  \('([^']+)', '([a-z-]+)', (NULL|'([a-z-]+)')\)/gm)].map((m) => [m[1], m[2], m[4] ?? null]);
  assert.equal(rows.length, MAJOR_CATALOG.length);
  MAJOR_CATALOG.forEach((c, i) => {
    const p = placeVoter(c.name);
    assert.ok(p, c.name);
    const slug = p!.kind === 'association' ? p!.rule.slug : null;
    if (p!.kind === 'association') assert.equal(ASSOCIATION_FACULTY[p!.rule.slug], c.faculty, c.name);
    else assert.equal(p!.faculty, c.faculty, c.name);
    assert.deepEqual(rows[i], [c.name, c.faculty, slug], c.name);
  });
  assert.equal(new Set(MAJOR_CATALOG.map((c) => c.name)).size, MAJOR_CATALOG.length);
  assert.equal(MAJOR_CATALOG.filter((c) => placeVoter(c.name)?.kind === 'faculty').map((c) => c.name).join(), 'علوم و مهندسی محیط زیست');
});

test('فهرست ادمین همه‌ی ردیف‌ها را صفحه‌به‌صفحه می‌آورد (نه فقط ۲۰۰۰)', () => {
  assert.match(read('../src/api/adminList.ts'), /offset \+= 2000/);
});
