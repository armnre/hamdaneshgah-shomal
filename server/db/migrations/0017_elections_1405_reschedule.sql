-- 0017: انتخابات ۱۴۰۵-۱۴۰۶ — تغییر زمان، انجمن نقشه‌برداری، فهرست نهایی نامزدها (۱۴ انجمن، ۱۲۲ نامزد).
-- زمان جدید رأی‌گیری همه‌ی انجمن‌ها: یکشنبه ۱ آذر ۱۴۰۵، ساعت ۰۸:۰۰ تا ۲۲:۰۰ به وقت تهران.
-- Idempotent. هیچ رأی ثبت‌شده‌ای تغییر نمی‌کند: اگر انتخاباتی برگه یا مشارکت داشته باشد، این مایگریشن متوقف می‌شود.

-- 0) ایمنی: پیش از هر تغییر، مطمئن شو هیچ رأیی در انتخابات ۱۴۰۵ ثبت نشده است
DO $$
DECLARE n integer;
BEGIN
  SELECT (SELECT count(*) FROM "Ballots" b JOIN "Elections" e ON e.id = b."electionId" WHERE e."title" LIKE '%۱۴۰۵-۱۴۰۶')
       + (SELECT count(*) FROM "PendingBallots" b JOIN "Elections" e ON e.id = b."electionId" WHERE e."title" LIKE '%۱۴۰۵-۱۴۰۶')
       + (SELECT count(*) FROM "VoterParticipation" p JOIN "Elections" e ON e.id = p."electionId" WHERE e."title" LIKE '%۱۴۰۵-۱۴۰۶')
    INTO n;
  IF n > 0 THEN RAISE EXCEPTION '0017: % رأی/مشارکت در انتخابات ۱۴۰۵ ثبت شده؛ تغییر زمان خودکار انجام نمی‌شود', n; END IF;
END $$;

-- 1) انجمن علمی مهندسی نقشه‌برداری (دانشکده فنی و مهندسی)
INSERT INTO "Associations" ("name", "slug", "shortDescription", "about", "faculty", "major", "active", "featured")
SELECT 'انجمن علمی مهندسی نقشه‌برداری', 'surveying-engineering', 'انجمن علمی دانشجویی رشته‌ی مهندسی نقشه‌برداری دانشگاه شمال', '',
       m."faculty", jsonb_build_array(m.id), true, false
FROM "Majors" m WHERE m."name" = 'مهندسی نقشه‌برداری'
  AND NOT EXISTS (SELECT 1 FROM "Associations" WHERE "slug" = 'surveying-engineering')
LIMIT 1;
UPDATE "Associations" SET "active" = true WHERE "slug" = 'surveying-engineering';
-- نقشه‌برداری دیگر عضو انجمن عمران نیست
UPDATE "Associations" a SET "major" = COALESCE((SELECT jsonb_agg(x) FROM jsonb_array_elements_text(a."major") x
    WHERE x <> (SELECT id FROM "Majors" WHERE "name" = 'مهندسی نقشه‌برداری')), '[]'::jsonb)
WHERE a."slug" = 'civil-engineering';

INSERT INTO "AssociationYears" ("title", "association", "academicYear", "active", "needsUniversityApproval")
SELECT 'انجمن علمی مهندسی نقشه‌برداری — ۱۴۰۵-۱۴۰۶', jsonb_build_array((SELECT id FROM "Associations" WHERE "slug" = 'surveying-engineering')), jsonb_build_array(y.id), true, false
FROM "AcademicYears" y WHERE y."title" = '1405-1406'
ON CONFLICT ("associationId", "academicYearId") DO NOTHING;

-- نگاشت رشته ← انجمن: نقشه‌برداری از عمران به انجمن خودش
DELETE FROM "AssociationMajors" am
USING "AssociationYears" ay, "Associations" a, "AcademicYears" y
WHERE am."associationYearId" = ay.id AND a.id = ay."associationId" AND y.id = ay."academicYearId" AND y."title" = '1405-1406'
  AND a."slug" <> 'surveying-engineering' AND am."majorId" = (SELECT id FROM "Majors" WHERE "name" = 'مهندسی نقشه‌برداری');
INSERT INTO "AssociationMajors" ("label", "associationYear", "major", "needsUniversityApproval")
SELECT 'انجمن علمی مهندسی نقشه‌برداری ← مهندسی نقشه‌برداری', jsonb_build_array(ay.id), jsonb_build_array(m.id), false
FROM "AssociationYears" ay JOIN "Associations" a ON a.id = ay."associationId" AND a."slug" = 'surveying-engineering'
JOIN "AcademicYears" y ON y.id = ay."academicYearId" AND y."title" = '1405-1406'
CROSS JOIN "Majors" m WHERE m."name" = 'مهندسی نقشه‌برداری'
  AND NOT EXISTS (SELECT 1 FROM "AssociationMajors" x WHERE x."associationYearId" = ay.id AND x."majorId" = m.id);

INSERT INTO "Elections" ("title", "associationYear", "status", "votingStart", "votingEnd", "seats", "maxChoicesPerVoter", "description")
SELECT 'انتخابات انجمن علمی مهندسی نقشه‌برداری — ۱۴۰۵-۱۴۰۶', jsonb_build_array(ay.id), 'Final List', '2026-11-22T08:00:00+03:30', '2026-11-22T22:00:00+03:30', 5, 5,
       'رأی‌گیری الکترونیکی انجمن علمی مهندسی نقشه‌برداری، یکشنبه ۱ آذر ۱۴۰۵ از ساعت ۸ تا ۲۲. فقط دانشجویان فعال همین رشته پس از احراز هویت با شماره دانشجویی و فقط یک‌بار می‌توانند رأی دهند.'
FROM "AssociationYears" ay JOIN "Associations" a ON a.id = ay."associationId" AND a."slug" = 'surveying-engineering'
JOIN "AcademicYears" y ON y.id = ay."academicYearId" AND y."title" = '1405-1406'
WHERE NOT EXISTS (SELECT 1 FROM "Elections" WHERE "title" = 'انتخابات انجمن علمی مهندسی نقشه‌برداری — ۱۴۰۵-۱۴۰۶');

-- رأی‌دهندگان نقشه‌برداری که قبلاً در انتخابات عمران ثبت شده بودند حذف می‌شوند؛
-- import-voters (با کلید مخصوص هر انتخابات) آن‌ها را در انتخابات نقشه‌برداری دوباره ثبت می‌کند.
DELETE FROM "EligibleVoters" v
USING "Elections" e
WHERE e.id = v."electionId" AND e."title" = 'انتخابات انجمن علمی مهندسی عمران — ۱۴۰۵-۱۴۰۶'
  AND replace(replace(COALESCE(v."majorName", ''), ' ', ''), chr(8204), '') LIKE '%نقشه%برداری%';

-- 2) زمان جدید برای همه‌ی انتخابات ۱۴۰۵ (و بازگشت به «فهرست نهایی» اگر ساعت قبلی آن را باز/بسته کرده بود)
UPDATE "Elections" SET "votingStart" = '2026-11-22T08:00:00+03:30', "votingEnd" = '2026-11-22T22:00:00+03:30', "status" = 'Final List',
  "description" = replace(replace("description", '۲۳ آبان ۱۴۰۵', 'یکشنبه ۱ آذر ۱۴۰۵'), 'یکشنبه یکشنبه', 'یکشنبه')
WHERE "title" LIKE 'انتخابات انجمن علمی % — ۱۴۰۵-۱۴۰۶' AND "status" IN ('Final List', 'Voting Open', 'Closed') AND "isDemo" = false;

-- 3) فهرست نهایی نامزدها (فایل به‌روز شده‌ی دانشگاه)
CREATE TEMP TABLE "_final" (slug text, "fullName" text, sn text) ON COMMIT DROP;
INSERT INTO "_final" VALUES
  ('electrical-engineering', 'سامی فلاح', '4021159021'),
  ('electrical-engineering', 'سید رسول مجیدی', '4021159025'),
  ('electrical-engineering', 'پرستو بابایی', '4021150017'),
  ('electrical-engineering', 'مهتاب عبدی', '4021150092'),
  ('electrical-engineering', 'امین محمودزاده', '4011150100'),
  ('electrical-engineering', 'محسن رضایی', '4021150061'),
  ('electrical-engineering', 'مهدیه فرجامی', '4021150101'),
  ('electrical-engineering', 'دنیا دلیری‌پور', '4012150005'),
  ('electrical-engineering', 'سیده رقیه جلالی', '4021150036'),
  ('electrical-engineering', 'حسام آقایی مقدم', '4031159002'),
  ('electrical-engineering', 'امیرعلی پور اسحاق', '4021159006'),
  ('law', 'حسین اسدالهی', '4031232007'),
  ('law', 'ابوالفضل قلی‌نژاد عمران', '4031232122'),
  ('law', 'رضا توسلی', '4031232028'),
  ('law', 'ستایش وحیدی', '4021232153'),
  ('law', 'مهنا زمینی', '4031232088'),
  ('law', 'سپهر جعفری', '4031232032'),
  ('law', 'علی‌اکبر فرج‌پور', '4041231023'),
  ('law', 'جواد محمدپور', NULL),
  ('law', 'ساغر احمدی', '4031232003'),
  ('civil-engineering', 'هدیه شکیبایی‌مرام', '4022166006'),
  ('civil-engineering', 'فریبرز علایی', '4011166051'),
  ('civil-engineering', 'مه سیما قربانی‌مقدم', '4021166068'),
  ('civil-engineering', 'پارسا صداقت پور', '4021166053'),
  ('civil-engineering', 'ارشیا خضراعی', '4011166087'),
  ('civil-engineering', 'بهنام اصغری', '4031166013'),
  ('civil-engineering', 'مبینا یعقوبی الموتی', '4031166105'),
  ('civil-engineering', 'محمدمهدی تقی پور', '4031166021'),
  ('computer-engineering', 'حسن رحیمی‌کیا', '4011113129'),
  ('computer-engineering', 'امیررضا بناگر', '4001113014'),
  ('computer-engineering', 'شروین شایقی', '4021113067'),
  ('computer-engineering', 'احمدرضا روشن', '4021113062'),
  ('computer-engineering', 'امیررضا ایرائی‌پور', '4021114013'),
  ('computer-engineering', 'امیرحسین حسین پور', '4021113036'),
  ('sport-sciences', 'ماهان تقی‌پور', '4041224032'),
  ('sport-sciences', 'ابوالفضل شیخی آهی', '4011224141'),
  ('sport-sciences', 'روژان داوری', '4041224062'),
  ('sport-sciences', 'بهار مسلمی', '4021218075'),
  ('sport-sciences', 'کوثر غلامی', '4031224111'),
  ('sport-sciences', 'عرشیا عباسی', '4041224102'),
  ('architecture', 'پرستو ولی', '4021196096'),
  ('architecture', 'معصومه معینی‌کناری', '4021196083'),
  ('architecture', 'پرنیان پورابراهیمی', '4011196018'),
  ('architecture', 'رقیه قلی‌پور', '4021193108'),
  ('architecture', 'زهرا حسینی', '4041193039'),
  ('architecture', 'نیایش بخشی خراسانی', '4041193020'),
  ('architecture', 'آرزو رسولی', '4021193063'),
  ('architecture', 'نادیا شرامه', '4021193078'),
  ('architecture', 'یلدار زندی زیارانی', '4021193072'),
  ('chemical-engineering', 'سیدامیرمحمد یزدان‌پناه', '4021103043'),
  ('chemical-engineering', 'فاطمه نعیمی', '4021103038'),
  ('chemical-engineering', 'پارمیدا حبیبی', '4021103013'),
  ('chemical-engineering', 'ماهک عنایتی', '4021103024'),
  ('chemical-engineering', 'مهتاب کریمی‌فر', '4041103032'),
  ('chemical-engineering', 'فاطمه شباطی طالمی', '4041103021'),
  ('chemical-engineering', 'شقایق صادقی', '4031103045'),
  ('chemical-engineering', 'مهدی علی‌زاده', '4031103054'),
  ('chemical-engineering', 'عرشیا وحیدی', '4031103086'),
  ('mechanical-engineering', 'میثم ابراهیم ملک‌ثابت', '4021183001'),
  ('mechanical-engineering', 'محمد رنجبر', '4031183012'),
  ('mechanical-engineering', 'سید ابوالفضل محمودی', '4031183025'),
  ('mechanical-engineering', 'علی‌اصغر علیزاده', '4022183005'),
  ('mechanical-engineering', 'مهران برزگران', '4031183006'),
  ('mechanical-engineering', 'امیرحسین سپهریان', '4032183002'),
  ('management', 'ماهان طباطبایی', NULL),
  ('management', 'امیرعلی ذبیح‌نیا', '4041248018'),
  ('management', 'محمدامین خلیل‌ارجمندی', '4041248016'),
  ('management', 'عسل عسکری', '4041272046'),
  ('management', 'فاطمه یوسفی', '4041247095'),
  ('management', 'پارسا مرادی', '4041248055'),
  ('management', 'امیررضا زارع', '4031249006'),
  ('management', 'هلیا محمدی', '4041248053'),
  ('management', 'سبا عزیزپور', '4041248042'),
  ('management', 'حنانه نصیری', '4031248062'),
  ('management', 'نگین درزی', '4021272040'),
  ('management', 'ثنا رادمهر', '4041272032'),
  ('management', 'یلدا چلابی', '4041272021'),
  ('management', 'ابوالفضل عابدی', '4031272058'),
  ('management', 'امیررضا شیخی', '4041272041'),
  ('management', 'نازنین نرگس نبی‌زاده', '4041248060'),
  ('management', 'فاطمه زهرا قربانی', '4041248043'),
  ('psychology', 'عارف اسفندیاری مقدم', '4031281161'),
  ('psychology', 'سیده فاطمه حسینی', '4031281034'),
  ('psychology', 'صبا طبری', '4031281081'),
  ('psychology', 'هانیه شریفی', '4041281081'),
  ('psychology', 'معین خوش‌فطرت', '4041281054'),
  ('psychology', 'فاطمه آزادی', '4041281008'),
  ('psychology', 'زهرا رحمتی', '4031281050'),
  ('psychology', 'حسنا ذبیحی', '4041281062'),
  ('psychology', 'سیده ستایش رستگار نیاکی', '4041281065'),
  ('psychology', 'فاطمه بازدار', '4041281017'),
  ('psychology', 'ساجده عباسی', '4031281086'),
  ('psychology', 'مهدیس رضوی', '4031281159'),
  ('psychology', 'محمدسجاد سالاری', '4022281025'),
  ('psychology', 'رومینا سادات حسینی', '4032281021'),
  ('industrial-engineering', 'امیرمحمد مختاری‌فرد', '4032136004'),
  ('industrial-engineering', 'مهدی حیدری', '4031136043'),
  ('industrial-engineering', 'مهدیس اله قلی', '4032136006'),
  ('industrial-engineering', 'آرش نورمحمدی', '4041136039'),
  ('industrial-engineering', 'سید ابراهیم کاووسی داودی', '4031136030'),
  ('industrial-engineering', 'ساجده علیزاده', '4031136024'),
  ('industrial-engineering', 'مهلاقربان علی‌نیا عمران', '4031136026'),
  ('industrial-engineering', 'محمد حیدری', '4031136014'),
  ('educational-sciences', 'مهرسا شکری', '4031283050'),
  ('educational-sciences', 'فاطمه کرد', '4042283002'),
  ('educational-sciences', 'ملینا نجاریان', '4042283002'),
  ('educational-sciences', 'مهنا کرمی', '4031283077'),
  ('educational-sciences', 'زهرا حسینی', '4031283102'),
  ('educational-sciences', 'زهرا مهدوی‌مقدم', '4031283092'),
  ('accounting', 'مهدیه مؤمنی‌پور', '4031212141'),
  ('accounting', 'سوسن فاضل‌تبار', '4031212098'),
  ('accounting', 'مهدی حسینی ایمنی', '4021212045'),
  ('accounting', 'محمدحسین مختاری', '4032212057'),
  ('accounting', 'زهرا فرجی', '4032212049'),
  ('accounting', 'هلیا حیدرپور', '4032212022'),
  ('accounting', 'پونه همدانی', '4032212061'),
  ('accounting', 'فاطمه قاسمی', '4031212104'),
  ('surveying-engineering', 'رایکا کاویانپور', '4031171017'),
  ('surveying-engineering', 'طهورا حجازی', '4031171004'),
  ('surveying-engineering', 'فاطمه ابراهیمی', '4001171023'),
  ('surveying-engineering', 'امیرحسین اسدی', '4021171002'),
  ('surveying-engineering', 'سام محمودی', '4021171020');

-- اصلاح املای نام‌ها
UPDATE "Candidates" SET "fullName" = 'سبا عزیزپور' WHERE "fullName" = 'صبا عزیزپور';
UPDATE "Candidates" SET "fullName" = 'نگین درزی' WHERE "fullName" = 'نگین رزی';
UPDATE "Candidates" SET "fullName" = 'نازنین نرگس نبی‌زاده' WHERE "fullName" = 'نازنین نرگس نبی زاده';

CREATE TEMP VIEW "_final_e" AS
SELECT f.*, e.id AS eid, regexp_replace(translate(f."fullName", 'يك', 'یک'), '[[:space:]' || chr(8204) || ']', '', 'g') AS k
FROM "_final" f
JOIN "Associations" a ON a."slug" = f.slug
JOIN "AssociationYears" ay ON ay."associationId" = a.id
JOIN "AcademicYears" y ON y.id = ay."academicYearId" AND y."title" = '1405-1406'
JOIN "Elections" e ON e."associationYearId" = ay.id AND e."isDemo" = false;

-- نامزدهای جدید (اگر شماره‌ی دانشجویی در همان انتخابات تکراری باشد، بدون شماره و «نیاز به بررسی»)
INSERT INTO "Candidates" ("fullName", "studentNumber", "election", "status", "reviewNote")
SELECT f."fullName",
       CASE WHEN f.sn IS NULL OR EXISTS (SELECT 1 FROM "Candidates" c2 WHERE c2."electionId" = f.eid AND c2."studentNumber" = f.sn) THEN NULL ELSE f.sn END,
       jsonb_build_array(f.eid), 'Approved',
       CASE WHEN f.sn IS NULL THEN 'نیاز به بررسی: در فایل نامزدها شماره‌ی دانشجویی ندارد.'
            WHEN EXISTS (SELECT 1 FROM "Candidates" c2 WHERE c2."electionId" = f.eid AND c2."studentNumber" = f.sn) THEN 'نیاز به بررسی: شماره‌ی دانشجویی ' || f.sn || ' در فایل برای نامزد دیگری هم آمده است.'
            ELSE 'تأییدشده طبق فهرست نهایی نامزدها (۱۴۰۵/۰۸)' END
FROM "_final_e" f
WHERE NOT EXISTS (SELECT 1 FROM "Candidates" c WHERE c."electionId" = f.eid
  AND regexp_replace(translate(c."fullName", 'يك', 'یک'), '[[:space:]' || chr(8204) || ']', '', 'g') = f.k);

-- همه‌ی نامزدهای فهرست نهایی تأییدشده‌اند
UPDATE "Candidates" c SET "status" = 'Approved'
FROM "_final_e" f
WHERE c."electionId" = f.eid AND c."status" <> 'Approved'
  AND regexp_replace(translate(c."fullName", 'يك', 'یک'), '[[:space:]' || chr(8204) || ']', '', 'g') = f.k;

-- هر نامزد تأییدشده‌ای که در فهرست نهایی نیست، کنار گذاشته می‌شود (حذف نمی‌شود)
UPDATE "Candidates" c SET "status" = 'Withdrawn', "reviewNote" = 'در فهرست نهایی نامزدهای ۱۴۰۵/۰۸ نیست.'
FROM "Elections" e
WHERE e.id = c."electionId" AND e."title" LIKE 'انتخابات انجمن علمی % — ۱۴۰۵-۱۴۰۶' AND e."isDemo" = false AND c."status" = 'Approved'
  AND NOT EXISTS (SELECT 1 FROM "_final_e" f WHERE f.eid = c."electionId"
    AND regexp_replace(translate(c."fullName", 'يك', 'یک'), '[[:space:]' || chr(8204) || ']', '', 'g') = f.k);

DROP VIEW "_final_e";
