-- 0015: همه‌ی رشته‌های رسمی دانشگاه (چارت + فهرست آموزش) در Majors، با دانشکده و نگاشت به انجمن برای ۱۴۰۵-۱۴۰۶.
-- از MAJOR_CATALOG در server/src/lib/majorMap.ts ساخته شده (تست هم‌خوانی دارد). رشته‌ی بدون انجمن (NULL) فقط دانشکده می‌گیرد.
-- Idempotent: رشته‌ی هم‌نام (با نادیده گرفتن فاصله/نیم‌فاصله) دوباره ساخته نمی‌شود و نگاشت موجود دست نمی‌خورد.
CREATE TEMP TABLE _catalog(name text, faculty text, slug text) ON COMMIT DROP;
INSERT INTO _catalog VALUES
  ('مهندسی عمران', 'engineering', 'civil-engineering'),
  ('مهندسی عمران (حمل‌ونقل)', 'engineering', 'civil-engineering'),
  ('مهندسی معماری', 'engineering', 'architecture'),
  ('مهندسی و علم کامپیوتر', 'engineering', 'computer-engineering'),
  ('مهندسی کامپیوتر', 'engineering', 'computer-engineering'),
  ('مهندسی برق', 'engineering', 'electrical-engineering'),
  ('مهندسی پزشکی', 'engineering', 'electrical-engineering'),
  ('مهندسی مکاترونیک', 'engineering', 'mechanical-engineering'),
  ('مهندسی مکانیک', 'engineering', 'mechanical-engineering'),
  ('مهندسی شیمی', 'engineering', 'chemical-engineering'),
  ('مهندسی صنایع', 'engineering', 'industrial-engineering'),
  ('مهندسی صنایع و سیستم‌ها', 'engineering', 'industrial-engineering'),
  ('معماری داخلی', 'engineering', 'architecture'),
  ('مهندسی شهرسازی', 'engineering', 'civil-engineering'),
  ('مهندسی نقشه‌برداری', 'engineering', 'civil-engineering'),
  ('علوم و مهندسی محیط زیست', 'engineering', NULL),
  ('مهندسی اجرایی عمران', 'engineering', 'civil-engineering'),
  ('مهندسی حرفه‌ای عمران', 'engineering', 'civil-engineering'),
  ('مهندسی حرفه‌ای معماری', 'engineering', 'architecture'),
  ('مهندسی حرفه‌ای الکترونیک کاربردی', 'engineering', 'electrical-engineering'),
  ('مهندسی حرفه‌ای برق قدرت', 'engineering', 'electrical-engineering'),
  ('مهندسی حرفه‌ای کامپیوتر نرم‌افزار', 'engineering', 'computer-engineering'),
  ('حسابداری', 'humanities', 'accounting'),
  ('حسابرسی', 'humanities', 'accounting'),
  ('حسابداری قضایی', 'humanities', 'accounting'),
  ('حقوق', 'humanities', 'law'),
  ('حقوق خصوصی', 'humanities', 'law'),
  ('حقوق عمومی', 'humanities', 'law'),
  ('حقوق بین‌الملل', 'humanities', 'law'),
  ('حقوق کیفری و جرم‌شناسی', 'humanities', 'law'),
  ('حقوق جزا و جرم‌شناسی', 'humanities', 'law'),
  ('علوم قضایی', 'humanities', 'law'),
  ('مدیریت دولتی', 'humanities', 'management'),
  ('مدیریت صنعتی', 'humanities', 'management'),
  ('مدیریت کسب‌وکار', 'humanities', 'management'),
  ('مدیریت بازرگانی', 'humanities', 'management'),
  ('مدیریت مالی', 'humanities', 'management'),
  ('مدیریت امور بانکی', 'humanities', 'management'),
  ('روان‌شناسی', 'humanities', 'psychology'),
  ('علوم تربیتی', 'humanities', 'educational-sciences'),
  ('علوم ورزشی', 'sport-sciences', 'sport-sciences'),
  ('تربیت بدنی', 'sport-sciences', 'sport-sciences'),
  ('مدیریت ورزشی', 'sport-sciences', 'sport-sciences'),
  ('آسیب‌شناسی ورزشی و تمرینات اصلاحی', 'sport-sciences', 'sport-sciences'),
  ('فیزیولوژی ورزشی', 'sport-sciences', 'sport-sciences');

INSERT INTO "Majors" ("name", "faculty", "active", "verified")
SELECT c.name, COALESCE((SELECT jsonb_build_array(f.id) FROM "Faculties" f WHERE f."slug" = c.faculty), '[]'::jsonb), true, true
FROM _catalog c
WHERE NOT EXISTS (SELECT 1 FROM "Majors" m WHERE regexp_replace(m."name", '[\s\u200c]', '', 'g') = regexp_replace(c.name, '[\s\u200c]', '', 'g'));

UPDATE "Majors" m SET "faculty" = jsonb_build_array(f.id), "active" = true
FROM _catalog c JOIN "Faculties" f ON f."slug" = c.faculty
WHERE regexp_replace(m."name", '[\s\u200c]', '', 'g') = regexp_replace(c.name, '[\s\u200c]', '', 'g') AND m."faculty" = '[]'::jsonb;

UPDATE "Associations" a
SET "major" = (SELECT jsonb_agg(DISTINCT x) FROM (
                 SELECT jsonb_array_elements_text(a."major") AS x
                 UNION SELECT m.id FROM "Majors" m JOIN _catalog c ON regexp_replace(m."name", '[\s\u200c]', '', 'g') = regexp_replace(c.name, '[\s\u200c]', '', 'g')
                 WHERE c.slug = a."slug") s)
WHERE a."slug" IN (SELECT slug FROM _catalog WHERE slug IS NOT NULL);

INSERT INTO "AssociationMajors" ("label", "associationYear", "major", "needsUniversityApproval")
SELECT a."name" || ' ← ' || m."name", jsonb_build_array(ay.id), jsonb_build_array(m.id), false
FROM _catalog c
JOIN "Majors" m ON regexp_replace(m."name", '[\s\u200c]', '', 'g') = regexp_replace(c.name, '[\s\u200c]', '', 'g')
JOIN "Associations" a ON a."slug" = c.slug
JOIN "AssociationYears" ay ON ay."associationId" = a.id
JOIN "AcademicYears" y ON y.id = ay."academicYearId" AND y."title" = '1405-1406'
WHERE NOT EXISTS (
  SELECT 1 FROM "AssociationMajors" am2 JOIN "AssociationYears" ay2 ON ay2.id = am2."associationYearId"
  WHERE am2."majorId" = m.id AND ay2."academicYearId" = ay."academicYearId")
ON CONFLICT ("associationYearId", "majorId") DO NOTHING;
