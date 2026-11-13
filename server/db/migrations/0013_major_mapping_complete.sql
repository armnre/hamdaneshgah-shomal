-- 0013: نگاشت کامل رشته ← انجمن برای ۱۴۰۵-۱۴۰۶ (هم‌خوان با server/src/lib/majorMap.ts) + ایندکس جست‌وجوی رأی‌دهنده.
-- Idempotent.

-- هر رشته‌ی سیستمی باید در فهرست رشته‌های انجمن خودش باشد
UPDATE "Associations" a
SET "major" = (SELECT jsonb_agg(DISTINCT x) FROM (
                 SELECT jsonb_array_elements_text(a."major") AS x
                 UNION SELECT m.id FROM "Majors" m WHERE m."name" = v.major) s)
FROM (VALUES
  ('electrical-engineering', 'مهندسی برق'), ('electrical-engineering', 'مهندسی پزشکی'),
  ('computer-engineering', 'مهندسی کامپیوتر'), ('architecture', 'مهندسی معماری'),
  ('civil-engineering', 'مهندسی عمران'), ('industrial-engineering', 'مهندسی صنایع'),
  ('chemical-engineering', 'مهندسی شیمی'), ('mechanical-engineering', 'مهندسی مکانیک'),
  ('law', 'حقوق'), ('accounting', 'حسابداری'), ('sport-sciences', 'علوم ورزشی'),
  ('management', 'مدیریت'), ('psychology', 'روان‌شناسی'), ('educational-sciences', 'علوم تربیتی')
) AS v(slug, major)
WHERE a."slug" = v.slug AND EXISTS (SELECT 1 FROM "Majors" m WHERE m."name" = v.major);

INSERT INTO "AssociationMajors" ("label", "associationYear", "major", "needsUniversityApproval")
SELECT a."name" || ' ← ' || m."name", jsonb_build_array(ay.id), jsonb_build_array(m.id), false
FROM "Associations" a
JOIN "AssociationYears" ay ON ay."associationId" = a.id
JOIN "AcademicYears" y ON y.id = ay."academicYearId" AND y."title" = '1405-1406'
JOIN LATERAL jsonb_array_elements_text(a."major") mj(id) ON true
JOIN "Majors" m ON m.id = mj.id
-- تریگر «یک رشته، یک انجمن در هر سال» پیش از ON CONFLICT اجرا می‌شود؛ پس فقط نگاشت‌های نبوده اضافه شوند
WHERE NOT EXISTS (
  SELECT 1 FROM "AssociationMajors" am2 JOIN "AssociationYears" ay2 ON ay2.id = am2."associationYearId"
  WHERE am2."majorId" = m.id AND ay2."academicYearId" = ay."academicYearId")
ON CONFLICT ("associationYearId", "majorId") DO NOTHING;

-- پیدا کردن انتخابات رأی‌دهنده با شماره دانشجویی
CREATE INDEX IF NOT EXISTS "EligibleVoters_studentNumber" ON "EligibleVoters" ("studentNumber");
