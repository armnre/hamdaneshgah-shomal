-- 0011: پاک‌سازی انتخابات ۱۴۰۵-۱۴۰۶ پس از تطبیق فایل نامزدها با فهرست دانشجویان
-- 1) انجمن مهندسی برق و مهندسی پزشکی یک انجمن است.
-- 2) نگاشت رشته ← انجمن (AssociationMajors) برای هر ۱۳ انجمن؛ بدون آن هیچ رأی‌دهنده‌ای احراز نمی‌شود.
-- 3) نامزدهای با شماره‌ی دانشجویی نامعتبر: شماره خالی + «نیاز به بررسی». Idempotent.

UPDATE "Associations" a
SET "name" = 'انجمن علمی مهندسی برق و مهندسی پزشکی',
    "shortDescription" = 'انجمن علمی دانشجویی رشته‌های مهندسی برق و مهندسی پزشکی دانشگاه شمال',
    "major" = (SELECT jsonb_agg(DISTINCT x) FROM (
                 SELECT jsonb_array_elements_text(a."major") AS x
                 UNION SELECT id FROM "Majors" WHERE "name" = 'مهندسی پزشکی') s)
WHERE a."slug" = 'electrical-engineering';

UPDATE "AssociationYears" SET "title" = 'انجمن علمی مهندسی برق و مهندسی پزشکی — ۱۴۰۵-۱۴۰۶'
WHERE "associationId" = (SELECT id FROM "Associations" WHERE "slug" = 'electrical-engineering')
  AND "academicYearId" = (SELECT id FROM "AcademicYears" WHERE "title" = '1405-1406');

UPDATE "Elections" SET "title" = 'انتخابات انجمن علمی مهندسی برق و مهندسی پزشکی — ۱۴۰۵-۱۴۰۶',
  "description" = replace("description", 'انجمن علمی مهندسی برق،', 'انجمن علمی مهندسی برق و مهندسی پزشکی،')
WHERE "title" = 'انتخابات انجمن علمی مهندسی برق — ۱۴۰۵-۱۴۰۶';

INSERT INTO "AssociationMajors" ("label", "associationYear", "major", "needsUniversityApproval")
SELECT a."name" || ' ← ' || m."name", jsonb_build_array(ay.id), jsonb_build_array(m.id), false
FROM "Associations" a
JOIN "AssociationYears" ay ON ay."associationId" = a.id
JOIN "AcademicYears" y ON y.id = ay."academicYearId" AND y."title" = '1405-1406'
JOIN LATERAL jsonb_array_elements_text(a."major") mj(id) ON true
JOIN "Majors" m ON m.id = mj.id
ON CONFLICT ("associationYearId", "majorId") DO NOTHING;

UPDATE "Candidates" c SET "studentNumber" = NULL,
  "reviewNote" = 'نیاز به بررسی: شماره‌ی دانشجویی ' || v.s || ' در فهرست دانشجویان به نام «' || v.owner || '» است.'
FROM (VALUES
  ('حسین اسدالهی', '4031232007', 'ابوالفضل اسفندیار'),
  ('رقیه قلی‌پور', '4021193108', 'ترگل مقیمی نیاکی'),
  ('صبا عزیزپور', '4041248042', 'دینا قاسمی همدانی'),
  ('مهدی حسینی ایمنی', '4021212045', 'علی خاکپور')
) AS v(n, s, owner)
WHERE c."fullName" = v.n AND c."studentNumber" = v.s;

UPDATE "Candidates" c SET "studentNumber" = NULL,
  "reviewNote" = 'نیاز به بررسی: شماره‌ی دانشجویی ' || v.s || ' در فهرست دانشجویان وجود ندارد.'
FROM (VALUES
  ('سامی فلاح', '4021159021'), ('سید رسول مجیدی', '4021159025'), ('ستایش وحیدی', '4021232153'),
  ('فریبرز علایی', '4011166051'), ('امیررضا ایرائی‌پور', '4021114013'), ('بهار مسلمی', '4021218075'),
  ('امیررضا زارع', '4031249006')
) AS v(n, s)
WHERE c."fullName" = v.n AND c."studentNumber" = v.s;

UPDATE "Candidates" SET "fullName" = 'نگین درزی'
WHERE "fullName" = 'نگین رزی' AND "studentNumber" = '4021272040';

DELETE FROM "Candidates" WHERE "fullName" = 'فاطمه کرد' AND "studentNumber" = '4042283002';
UPDATE "Candidates" SET "reviewNote" = 'نیاز به بررسی: در فایل نامزدها با شماره‌ی 4042283002 آمده که در فهرست دانشجویان به نام «فاطمه کرد» است.'
WHERE "fullName" = 'ملینا نجاریان';

UPDATE "Candidates" SET "reviewNote" = 'نیاز به بررسی: در فایل نامزدها شماره‌ی دانشجویی ندارد.'
WHERE "fullName" = 'جواد محمدپور' AND "studentNumber" IS NULL;
UPDATE "Candidates" SET "reviewNote" = 'نیاز به بررسی: بدون شماره‌ی دانشجویی؛ احتمالاً همان «سیده ماهان طباطبایی» (4032272006) است.'
WHERE "fullName" = 'ماهان طباطبایی' AND "studentNumber" IS NULL;
