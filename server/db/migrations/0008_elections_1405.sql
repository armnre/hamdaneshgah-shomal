-- 0008: انتخابات انجمن‌های علمی سال تحصیلی ۱۴۰۵-۱۴۰۶ (نامه‌ی ۳/۱۴۰۵/۳۷/۳۱۸۵ مورخ ۱۴۰۵/۰۸/۱۶)

-- رأی‌گیری: ۲۳ آبان ۱۴۰۵، ساعت ۰۸:۰۰ تا ۲۲:۰۰ به وقت تهران. نامزدها از فایل اکسل پیوست نامه.

-- Idempotent: every insert is guarded, so rerunning on a partly-filled database is safe.

-- Reference data this migration depends on (same rows/ids as db/seed.json), so it also works on a fresh database.

INSERT INTO "Faculties" (id, "name", "slug", "sortOrder", "active", "verified", "description")
SELECT '33e27e53-e842-4b22-9490-b2fedc67e3ef', 'دانشکده فنی و مهندسی', 'engineering', 1, true, false, ''
WHERE NOT EXISTS (SELECT 1 FROM "Faculties" WHERE "slug" = 'engineering');

INSERT INTO "Faculties" (id, "name", "slug", "sortOrder", "active", "verified", "description")
SELECT 'd51471a8-b6b1-4db7-9a57-1ef6a8e6e364', 'دانشکده علوم انسانی', 'humanities', 2, true, false, ''
WHERE NOT EXISTS (SELECT 1 FROM "Faculties" WHERE "slug" = 'humanities');

INSERT INTO "Faculties" (id, "name", "slug", "sortOrder", "active", "verified", "description")
SELECT 'e6a9058a-e141-4dd2-9249-46abe9478fe1', 'دانشکده علوم ورزشی', 'sport-sciences', 3, true, false, ''
WHERE NOT EXISTS (SELECT 1 FROM "Faculties" WHERE "slug" = 'sport-sciences');

INSERT INTO "Majors" (id, "name", "faculty", "active", "verified", "description")
SELECT '13d52f23-6dfb-4d4a-8e7f-d5a8e1954bc0', 'مهندسی کامپیوتر', jsonb_build_array((SELECT id FROM "Faculties" WHERE id = '33e27e53-e842-4b22-9490-b2fedc67e3ef' UNION ALL SELECT NULL LIMIT 1)), true, false, ''
WHERE NOT EXISTS (SELECT 1 FROM "Majors" WHERE "name" = 'مهندسی کامپیوتر');

INSERT INTO "Majors" (id, "name", "faculty", "active", "verified", "description")
SELECT 'd7b7e810-248c-46fa-845a-8a55393534c9', 'مهندسی شیمی', jsonb_build_array((SELECT id FROM "Faculties" WHERE id = '33e27e53-e842-4b22-9490-b2fedc67e3ef' UNION ALL SELECT NULL LIMIT 1)), true, false, ''
WHERE NOT EXISTS (SELECT 1 FROM "Majors" WHERE "name" = 'مهندسی شیمی');

INSERT INTO "Majors" (id, "name", "faculty", "active", "verified", "description")
SELECT 'a66c8f5f-5a7b-4457-872d-f02320a992e3', 'مهندسی عمران', jsonb_build_array((SELECT id FROM "Faculties" WHERE id = '33e27e53-e842-4b22-9490-b2fedc67e3ef' UNION ALL SELECT NULL LIMIT 1)), true, false, ''
WHERE NOT EXISTS (SELECT 1 FROM "Majors" WHERE "name" = 'مهندسی عمران');

INSERT INTO "Majors" (id, "name", "faculty", "active", "verified", "description")
SELECT '670472ae-1211-47db-9864-7a058ce34a48', 'مهندسی برق', jsonb_build_array((SELECT id FROM "Faculties" WHERE id = '33e27e53-e842-4b22-9490-b2fedc67e3ef' UNION ALL SELECT NULL LIMIT 1)), true, false, ''
WHERE NOT EXISTS (SELECT 1 FROM "Majors" WHERE "name" = 'مهندسی برق');

INSERT INTO "Majors" (id, "name", "faculty", "active", "verified", "description")
SELECT 'deb32a91-043c-4b75-8532-04a664345d08', 'مهندسی پزشکی', jsonb_build_array((SELECT id FROM "Faculties" WHERE id = '33e27e53-e842-4b22-9490-b2fedc67e3ef' UNION ALL SELECT NULL LIMIT 1)), true, false, ''
WHERE NOT EXISTS (SELECT 1 FROM "Majors" WHERE "name" = 'مهندسی پزشکی');

INSERT INTO "Majors" (id, "name", "faculty", "active", "verified", "description")
SELECT '539e5f7a-e495-4ae5-b209-8885d68eacf3', 'مهندسی صنایع', jsonb_build_array((SELECT id FROM "Faculties" WHERE id = '33e27e53-e842-4b22-9490-b2fedc67e3ef' UNION ALL SELECT NULL LIMIT 1)), true, false, ''
WHERE NOT EXISTS (SELECT 1 FROM "Majors" WHERE "name" = 'مهندسی صنایع');

INSERT INTO "Majors" (id, "name", "faculty", "active", "verified", "description")
SELECT '361ce873-5cbb-495b-9f4f-b544cb2b7f40', 'مهندسی معماری', jsonb_build_array((SELECT id FROM "Faculties" WHERE id = '33e27e53-e842-4b22-9490-b2fedc67e3ef' UNION ALL SELECT NULL LIMIT 1)), true, false, ''
WHERE NOT EXISTS (SELECT 1 FROM "Majors" WHERE "name" = 'مهندسی معماری');

INSERT INTO "Majors" (id, "name", "faculty", "active", "verified", "description")
SELECT '45516e99-e8fa-451a-8554-ee2b7a5ab3a3', 'مهندسی مکانیک', jsonb_build_array((SELECT id FROM "Faculties" WHERE id = '33e27e53-e842-4b22-9490-b2fedc67e3ef' UNION ALL SELECT NULL LIMIT 1)), true, false, ''
WHERE NOT EXISTS (SELECT 1 FROM "Majors" WHERE "name" = 'مهندسی مکانیک');

INSERT INTO "Majors" (id, "name", "faculty", "active", "verified", "description")
SELECT 'c69bbbe4-dec5-4807-b33f-607ec4d2a718', 'حقوق', jsonb_build_array((SELECT id FROM "Faculties" WHERE id = 'd51471a8-b6b1-4db7-9a57-1ef6a8e6e364' UNION ALL SELECT NULL LIMIT 1)), true, false, ''
WHERE NOT EXISTS (SELECT 1 FROM "Majors" WHERE "name" = 'حقوق');

INSERT INTO "Majors" (id, "name", "faculty", "active", "verified", "description")
SELECT 'b3d1f1ca-1633-4c4a-ac21-64b7f8871fb0', 'مدیریت', jsonb_build_array((SELECT id FROM "Faculties" WHERE id = 'd51471a8-b6b1-4db7-9a57-1ef6a8e6e364' UNION ALL SELECT NULL LIMIT 1)), true, false, ''
WHERE NOT EXISTS (SELECT 1 FROM "Majors" WHERE "name" = 'مدیریت');

INSERT INTO "Majors" (id, "name", "faculty", "active", "verified", "description")
SELECT '0e540295-8338-4eea-9056-a8c1722e067a', 'حسابداری', jsonb_build_array((SELECT id FROM "Faculties" WHERE id = 'd51471a8-b6b1-4db7-9a57-1ef6a8e6e364' UNION ALL SELECT NULL LIMIT 1)), true, false, ''
WHERE NOT EXISTS (SELECT 1 FROM "Majors" WHERE "name" = 'حسابداری');

INSERT INTO "Majors" (id, "name", "faculty", "active", "verified", "description")
SELECT 'aeb19849-73fe-4f26-a3f7-2d785aa0c0a1', 'روان‌شناسی', jsonb_build_array((SELECT id FROM "Faculties" WHERE id = 'd51471a8-b6b1-4db7-9a57-1ef6a8e6e364' UNION ALL SELECT NULL LIMIT 1)), true, false, ''
WHERE NOT EXISTS (SELECT 1 FROM "Majors" WHERE "name" = 'روان‌شناسی');

INSERT INTO "Majors" (id, "name", "faculty", "active", "verified", "description")
SELECT '56839074-bc66-4118-942c-6cc44f39bc8d', 'علوم ورزشی', jsonb_build_array((SELECT id FROM "Faculties" WHERE id = 'e6a9058a-e141-4dd2-9249-46abe9478fe1' UNION ALL SELECT NULL LIMIT 1)), true, false, ''
WHERE NOT EXISTS (SELECT 1 FROM "Majors" WHERE "name" = 'علوم ورزشی');


INSERT INTO "Majors" ("name", "faculty", "active", "verified", "description")
SELECT 'علوم تربیتی', jsonb_build_array(f.id), true, false, ''
FROM "Faculties" f WHERE f."slug" = 'humanities'
  AND NOT EXISTS (SELECT 1 FROM "Majors" WHERE "name" = 'علوم تربیتی');

INSERT INTO "AcademicYears" ("title", "status", "startDate", "endDate", "sortOrder")
VALUES ('1405-1406', CASE WHEN EXISTS (SELECT 1 FROM "AcademicYears" WHERE "status" = 'Current') THEN 'Upcoming' ELSE 'Current' END,
        '2026-09-23T00:00:00+03:30', '2027-09-22T23:59:59+03:30', 1405)
ON CONFLICT ("title") DO NOTHING;

-- ── مهندسی برق: 11 نامزد ──
INSERT INTO "Associations" ("name", "slug", "shortDescription", "about", "faculty", "major", "active", "featured")
SELECT 'انجمن علمی مهندسی برق', 'electrical-engineering', 'انجمن علمی دانشجویی رشته‌ی مهندسی برق دانشگاه شمال', '', m."faculty", jsonb_build_array(m.id), true, false
FROM "Majors" m WHERE m."name" = 'مهندسی برق'
  AND NOT EXISTS (SELECT 1 FROM "Associations" WHERE "slug" = 'electrical-engineering')
LIMIT 1;

INSERT INTO "AssociationYears" ("title", "association", "academicYear", "active", "needsUniversityApproval")
SELECT 'انجمن علمی مهندسی برق — ۱۴۰۵-۱۴۰۶', jsonb_build_array((SELECT id FROM "Associations" WHERE "slug" = 'electrical-engineering')), jsonb_build_array(y.id), true, false
FROM "AcademicYears" y WHERE y."title" = '1405-1406'
ON CONFLICT ("associationId", "academicYearId") DO NOTHING;

INSERT INTO "Elections" ("title", "associationYear", "status", "votingStart", "votingEnd", "seats", "maxChoicesPerVoter", "description")
SELECT 'انتخابات انجمن علمی مهندسی برق — ۱۴۰۵-۱۴۰۶', jsonb_build_array((SELECT ay.id FROM "AssociationYears" ay JOIN "AcademicYears" y ON y.id = ay."academicYearId" WHERE ay."associationId" = (SELECT id FROM "Associations" WHERE "slug" = 'electrical-engineering') AND y."title" = '1405-1406')), 'Final List', '2026-11-14T08:00:00+03:30', '2026-11-14T22:00:00+03:30', 5, 5,
       'رأی‌گیری الکترونیکی انجمن علمی مهندسی برق، ۲۳ آبان ۱۴۰۵ از ساعت ۸ تا ۲۲. فقط دانشجویان فعال همین رشته پس از احراز هویت با شماره دانشجویی و فقط یک‌بار می‌توانند رأی دهند.'
WHERE NOT EXISTS (SELECT 1 FROM "Elections" WHERE "title" = 'انتخابات انجمن علمی مهندسی برق — ۱۴۰۵-۱۴۰۶');

INSERT INTO "Candidates" ("fullName", "studentNumber", "election", "status", "reviewNote")
SELECT v.n, v.s, jsonb_build_array(e.id), 'Approved', 'تأییدشده طبق نامه‌ی ۳/۱۴۰۵/۳۷/۳۱۸۵'
FROM (VALUES
  ('سامی فلاح', '4021159021'),
  ('سید رسول مجیدی', '4021159025'),
  ('پرستو بابایی', '4021150017'),
  ('مهتاب عبدی', '4021150092'),
  ('امین محمودزاده', '4011150100'),
  ('محسن رضایی', '4021150061'),
  ('مهدیه فرجامی', '4021150101'),
  ('دنیا دلیری‌پور', '4012150005'),
  ('سیده رقیه جلالی', '4021150036'),
  ('حسام آقایی مقدم', '4031159002'),
  ('امیرعلی پور اسحاق', '4021159006')
) AS v(n, s)
CROSS JOIN (SELECT id FROM "Elections" WHERE "title" = 'انتخابات انجمن علمی مهندسی برق — ۱۴۰۵-۱۴۰۶') e
ON CONFLICT ("electionId", "studentNumber") DO NOTHING;

-- ── حقوق: 8 نامزد ──
INSERT INTO "Associations" ("name", "slug", "shortDescription", "about", "faculty", "major", "active", "featured")
SELECT 'انجمن علمی حقوق', 'law', 'انجمن علمی دانشجویی رشته‌ی حقوق دانشگاه شمال', '', m."faculty", jsonb_build_array(m.id), true, false
FROM "Majors" m WHERE m."name" = 'حقوق'
  AND NOT EXISTS (SELECT 1 FROM "Associations" WHERE "slug" = 'law')
LIMIT 1;

INSERT INTO "AssociationYears" ("title", "association", "academicYear", "active", "needsUniversityApproval")
SELECT 'انجمن علمی حقوق — ۱۴۰۵-۱۴۰۶', jsonb_build_array((SELECT id FROM "Associations" WHERE "slug" = 'law')), jsonb_build_array(y.id), true, false
FROM "AcademicYears" y WHERE y."title" = '1405-1406'
ON CONFLICT ("associationId", "academicYearId") DO NOTHING;

INSERT INTO "Elections" ("title", "associationYear", "status", "votingStart", "votingEnd", "seats", "maxChoicesPerVoter", "description")
SELECT 'انتخابات انجمن علمی حقوق — ۱۴۰۵-۱۴۰۶', jsonb_build_array((SELECT ay.id FROM "AssociationYears" ay JOIN "AcademicYears" y ON y.id = ay."academicYearId" WHERE ay."associationId" = (SELECT id FROM "Associations" WHERE "slug" = 'law') AND y."title" = '1405-1406')), 'Final List', '2026-11-14T08:00:00+03:30', '2026-11-14T22:00:00+03:30', 5, 5,
       'رأی‌گیری الکترونیکی انجمن علمی حقوق، ۲۳ آبان ۱۴۰۵ از ساعت ۸ تا ۲۲. فقط دانشجویان فعال همین رشته پس از احراز هویت با شماره دانشجویی و فقط یک‌بار می‌توانند رأی دهند.'
WHERE NOT EXISTS (SELECT 1 FROM "Elections" WHERE "title" = 'انتخابات انجمن علمی حقوق — ۱۴۰۵-۱۴۰۶');

INSERT INTO "Candidates" ("fullName", "studentNumber", "election", "status", "reviewNote")
SELECT v.n, v.s, jsonb_build_array(e.id), 'Approved', 'تأییدشده طبق نامه‌ی ۳/۱۴۰۵/۳۷/۳۱۸۵'
FROM (VALUES
  ('حسین اسدالهی', '4031232007'),
  ('ابوالفضل قلی‌نژاد عمران', '4031232122'),
  ('رضا توسلی', '4031232028'),
  ('ستایش وحیدی', '4021232153'),
  ('مهنا زمینی', '4031232088'),
  ('سپهر جعفری', '4031232032'),
  ('علی‌اکبر فرج‌پور', '4041231023'),
  ('ساغر احمدی', '4031232003')
) AS v(n, s)
CROSS JOIN (SELECT id FROM "Elections" WHERE "title" = 'انتخابات انجمن علمی حقوق — ۱۴۰۵-۱۴۰۶') e
ON CONFLICT ("electionId", "studentNumber") DO NOTHING;

-- ── مهندسی عمران: 8 نامزد ──
INSERT INTO "Associations" ("name", "slug", "shortDescription", "about", "faculty", "major", "active", "featured")
SELECT 'انجمن علمی مهندسی عمران', 'civil-engineering', 'انجمن علمی دانشجویی رشته‌ی مهندسی عمران دانشگاه شمال', '', m."faculty", jsonb_build_array(m.id), true, false
FROM "Majors" m WHERE m."name" = 'مهندسی عمران'
  AND NOT EXISTS (SELECT 1 FROM "Associations" WHERE "slug" = 'civil-engineering')
LIMIT 1;

INSERT INTO "AssociationYears" ("title", "association", "academicYear", "active", "needsUniversityApproval")
SELECT 'انجمن علمی مهندسی عمران — ۱۴۰۵-۱۴۰۶', jsonb_build_array((SELECT id FROM "Associations" WHERE "slug" = 'civil-engineering')), jsonb_build_array(y.id), true, false
FROM "AcademicYears" y WHERE y."title" = '1405-1406'
ON CONFLICT ("associationId", "academicYearId") DO NOTHING;

INSERT INTO "Elections" ("title", "associationYear", "status", "votingStart", "votingEnd", "seats", "maxChoicesPerVoter", "description")
SELECT 'انتخابات انجمن علمی مهندسی عمران — ۱۴۰۵-۱۴۰۶', jsonb_build_array((SELECT ay.id FROM "AssociationYears" ay JOIN "AcademicYears" y ON y.id = ay."academicYearId" WHERE ay."associationId" = (SELECT id FROM "Associations" WHERE "slug" = 'civil-engineering') AND y."title" = '1405-1406')), 'Final List', '2026-11-14T08:00:00+03:30', '2026-11-14T22:00:00+03:30', 5, 5,
       'رأی‌گیری الکترونیکی انجمن علمی مهندسی عمران، ۲۳ آبان ۱۴۰۵ از ساعت ۸ تا ۲۲. فقط دانشجویان فعال همین رشته پس از احراز هویت با شماره دانشجویی و فقط یک‌بار می‌توانند رأی دهند.'
WHERE NOT EXISTS (SELECT 1 FROM "Elections" WHERE "title" = 'انتخابات انجمن علمی مهندسی عمران — ۱۴۰۵-۱۴۰۶');

INSERT INTO "Candidates" ("fullName", "studentNumber", "election", "status", "reviewNote")
SELECT v.n, v.s, jsonb_build_array(e.id), 'Approved', 'تأییدشده طبق نامه‌ی ۳/۱۴۰۵/۳۷/۳۱۸۵'
FROM (VALUES
  ('هدیه شکیبایی‌مرام', '4022166006'),
  ('فریبرز علایی', '4011166051'),
  ('مه‌سیما قربانی‌مقدم', '4021166068'),
  ('پارسا صداقت پور', '4021166053'),
  ('ارشیا خضراعی', '4011166087'),
  ('بهنام اصغری', '4031166013'),
  ('مبینا یعقوبی الموتی', '4031166105'),
  ('محمدمهدی تقی پور', '4031166021')
) AS v(n, s)
CROSS JOIN (SELECT id FROM "Elections" WHERE "title" = 'انتخابات انجمن علمی مهندسی عمران — ۱۴۰۵-۱۴۰۶') e
ON CONFLICT ("electionId", "studentNumber") DO NOTHING;

-- ── مهندسی کامپیوتر: 6 نامزد ──
INSERT INTO "Associations" ("name", "slug", "shortDescription", "about", "faculty", "major", "active", "featured")
SELECT 'انجمن علمی مهندسی کامپیوتر', 'computer-engineering', 'انجمن علمی دانشجویی رشته‌ی مهندسی کامپیوتر دانشگاه شمال', '', m."faculty", jsonb_build_array(m.id), true, false
FROM "Majors" m WHERE m."name" = 'مهندسی کامپیوتر'
  AND NOT EXISTS (SELECT 1 FROM "Associations" WHERE "slug" = 'computer-engineering')
LIMIT 1;

INSERT INTO "AssociationYears" ("title", "association", "academicYear", "active", "needsUniversityApproval")
SELECT 'انجمن علمی مهندسی کامپیوتر — ۱۴۰۵-۱۴۰۶', jsonb_build_array((SELECT id FROM "Associations" WHERE "slug" = 'computer-engineering')), jsonb_build_array(y.id), true, false
FROM "AcademicYears" y WHERE y."title" = '1405-1406'
ON CONFLICT ("associationId", "academicYearId") DO NOTHING;

INSERT INTO "Elections" ("title", "associationYear", "status", "votingStart", "votingEnd", "seats", "maxChoicesPerVoter", "description")
SELECT 'انتخابات انجمن علمی مهندسی کامپیوتر — ۱۴۰۵-۱۴۰۶', jsonb_build_array((SELECT ay.id FROM "AssociationYears" ay JOIN "AcademicYears" y ON y.id = ay."academicYearId" WHERE ay."associationId" = (SELECT id FROM "Associations" WHERE "slug" = 'computer-engineering') AND y."title" = '1405-1406')), 'Final List', '2026-11-14T08:00:00+03:30', '2026-11-14T22:00:00+03:30', 5, 5,
       'رأی‌گیری الکترونیکی انجمن علمی مهندسی کامپیوتر، ۲۳ آبان ۱۴۰۵ از ساعت ۸ تا ۲۲. فقط دانشجویان فعال همین رشته پس از احراز هویت با شماره دانشجویی و فقط یک‌بار می‌توانند رأی دهند.'
WHERE NOT EXISTS (SELECT 1 FROM "Elections" WHERE "title" = 'انتخابات انجمن علمی مهندسی کامپیوتر — ۱۴۰۵-۱۴۰۶');

INSERT INTO "Candidates" ("fullName", "studentNumber", "election", "status", "reviewNote")
SELECT v.n, v.s, jsonb_build_array(e.id), 'Approved', 'تأییدشده طبق نامه‌ی ۳/۱۴۰۵/۳۷/۳۱۸۵'
FROM (VALUES
  ('حسن رحیمی‌کیا', '4011113129'),
  ('امیررضا بناگر', '4001113014'),
  ('شروین شایقی', '4021113067'),
  ('احمدرضا روشن', '4021113062'),
  ('امیررضا ایرائی‌پور', '4021114013'),
  ('امیرحسین حسین پور', '4021113036')
) AS v(n, s)
CROSS JOIN (SELECT id FROM "Elections" WHERE "title" = 'انتخابات انجمن علمی مهندسی کامپیوتر — ۱۴۰۵-۱۴۰۶') e
ON CONFLICT ("electionId", "studentNumber") DO NOTHING;

-- ── علوم ورزشی: 6 نامزد ──
INSERT INTO "Associations" ("name", "slug", "shortDescription", "about", "faculty", "major", "active", "featured")
SELECT 'انجمن علمی علوم ورزشی', 'sport-sciences', 'انجمن علمی دانشجویی رشته‌ی علوم ورزشی دانشگاه شمال', '', m."faculty", jsonb_build_array(m.id), true, false
FROM "Majors" m WHERE m."name" = 'علوم ورزشی'
  AND NOT EXISTS (SELECT 1 FROM "Associations" WHERE "slug" = 'sport-sciences')
LIMIT 1;

INSERT INTO "AssociationYears" ("title", "association", "academicYear", "active", "needsUniversityApproval")
SELECT 'انجمن علمی علوم ورزشی — ۱۴۰۵-۱۴۰۶', jsonb_build_array((SELECT id FROM "Associations" WHERE "slug" = 'sport-sciences')), jsonb_build_array(y.id), true, false
FROM "AcademicYears" y WHERE y."title" = '1405-1406'
ON CONFLICT ("associationId", "academicYearId") DO NOTHING;

INSERT INTO "Elections" ("title", "associationYear", "status", "votingStart", "votingEnd", "seats", "maxChoicesPerVoter", "description")
SELECT 'انتخابات انجمن علمی علوم ورزشی — ۱۴۰۵-۱۴۰۶', jsonb_build_array((SELECT ay.id FROM "AssociationYears" ay JOIN "AcademicYears" y ON y.id = ay."academicYearId" WHERE ay."associationId" = (SELECT id FROM "Associations" WHERE "slug" = 'sport-sciences') AND y."title" = '1405-1406')), 'Final List', '2026-11-14T08:00:00+03:30', '2026-11-14T22:00:00+03:30', 5, 5,
       'رأی‌گیری الکترونیکی انجمن علمی علوم ورزشی، ۲۳ آبان ۱۴۰۵ از ساعت ۸ تا ۲۲. فقط دانشجویان فعال همین رشته پس از احراز هویت با شماره دانشجویی و فقط یک‌بار می‌توانند رأی دهند.'
WHERE NOT EXISTS (SELECT 1 FROM "Elections" WHERE "title" = 'انتخابات انجمن علمی علوم ورزشی — ۱۴۰۵-۱۴۰۶');

INSERT INTO "Candidates" ("fullName", "studentNumber", "election", "status", "reviewNote")
SELECT v.n, v.s, jsonb_build_array(e.id), 'Approved', 'تأییدشده طبق نامه‌ی ۳/۱۴۰۵/۳۷/۳۱۸۵'
FROM (VALUES
  ('ماهان تقی‌پور', '4041224032'),
  ('ابوالفضل شیخی آهی', '4011224141'),
  ('روژان داوری', '4041224062'),
  ('بهار مسلمی', '4021218075'),
  ('کوثر غلامی', '4031224111'),
  ('عرشیا عباسی', '4041224102')
) AS v(n, s)
CROSS JOIN (SELECT id FROM "Elections" WHERE "title" = 'انتخابات انجمن علمی علوم ورزشی — ۱۴۰۵-۱۴۰۶') e
ON CONFLICT ("electionId", "studentNumber") DO NOTHING;

-- ── مهندسی معماری: 7 نامزد ──
INSERT INTO "Associations" ("name", "slug", "shortDescription", "about", "faculty", "major", "active", "featured")
SELECT 'انجمن علمی مهندسی معماری', 'architecture', 'انجمن علمی دانشجویی رشته‌ی مهندسی معماری دانشگاه شمال', '', m."faculty", jsonb_build_array(m.id), true, false
FROM "Majors" m WHERE m."name" = 'مهندسی معماری'
  AND NOT EXISTS (SELECT 1 FROM "Associations" WHERE "slug" = 'architecture')
LIMIT 1;

INSERT INTO "AssociationYears" ("title", "association", "academicYear", "active", "needsUniversityApproval")
SELECT 'انجمن علمی مهندسی معماری — ۱۴۰۵-۱۴۰۶', jsonb_build_array((SELECT id FROM "Associations" WHERE "slug" = 'architecture')), jsonb_build_array(y.id), true, false
FROM "AcademicYears" y WHERE y."title" = '1405-1406'
ON CONFLICT ("associationId", "academicYearId") DO NOTHING;

INSERT INTO "Elections" ("title", "associationYear", "status", "votingStart", "votingEnd", "seats", "maxChoicesPerVoter", "description")
SELECT 'انتخابات انجمن علمی مهندسی معماری — ۱۴۰۵-۱۴۰۶', jsonb_build_array((SELECT ay.id FROM "AssociationYears" ay JOIN "AcademicYears" y ON y.id = ay."academicYearId" WHERE ay."associationId" = (SELECT id FROM "Associations" WHERE "slug" = 'architecture') AND y."title" = '1405-1406')), 'Final List', '2026-11-14T08:00:00+03:30', '2026-11-14T22:00:00+03:30', 5, 5,
       'رأی‌گیری الکترونیکی انجمن علمی مهندسی معماری، ۲۳ آبان ۱۴۰۵ از ساعت ۸ تا ۲۲. فقط دانشجویان فعال همین رشته پس از احراز هویت با شماره دانشجویی و فقط یک‌بار می‌توانند رأی دهند.'
WHERE NOT EXISTS (SELECT 1 FROM "Elections" WHERE "title" = 'انتخابات انجمن علمی مهندسی معماری — ۱۴۰۵-۱۴۰۶');

INSERT INTO "Candidates" ("fullName", "studentNumber", "election", "status", "reviewNote")
SELECT v.n, v.s, jsonb_build_array(e.id), 'Approved', 'تأییدشده طبق نامه‌ی ۳/۱۴۰۵/۳۷/۳۱۸۵'
FROM (VALUES
  ('پرستو ولی', '4021196096'),
  ('معصومه معینی‌کناری', '4021196083'),
  ('پرنیان پورابراهیمی', '4011196018'),
  ('رقیه قلی‌پور', '4021193108'),
  ('آرزو رسولی', '4021193063'),
  ('نادیا شرامه', '4021193078'),
  ('یلدار زندی زیارانی', '4021193072')
) AS v(n, s)
CROSS JOIN (SELECT id FROM "Elections" WHERE "title" = 'انتخابات انجمن علمی مهندسی معماری — ۱۴۰۵-۱۴۰۶') e
ON CONFLICT ("electionId", "studentNumber") DO NOTHING;

-- ── مهندسی شیمی: 9 نامزد ──
INSERT INTO "Associations" ("name", "slug", "shortDescription", "about", "faculty", "major", "active", "featured")
SELECT 'انجمن علمی مهندسی شیمی', 'chemical-engineering', 'انجمن علمی دانشجویی رشته‌ی مهندسی شیمی دانشگاه شمال', '', m."faculty", jsonb_build_array(m.id), true, false
FROM "Majors" m WHERE m."name" = 'مهندسی شیمی'
  AND NOT EXISTS (SELECT 1 FROM "Associations" WHERE "slug" = 'chemical-engineering')
LIMIT 1;

INSERT INTO "AssociationYears" ("title", "association", "academicYear", "active", "needsUniversityApproval")
SELECT 'انجمن علمی مهندسی شیمی — ۱۴۰۵-۱۴۰۶', jsonb_build_array((SELECT id FROM "Associations" WHERE "slug" = 'chemical-engineering')), jsonb_build_array(y.id), true, false
FROM "AcademicYears" y WHERE y."title" = '1405-1406'
ON CONFLICT ("associationId", "academicYearId") DO NOTHING;

INSERT INTO "Elections" ("title", "associationYear", "status", "votingStart", "votingEnd", "seats", "maxChoicesPerVoter", "description")
SELECT 'انتخابات انجمن علمی مهندسی شیمی — ۱۴۰۵-۱۴۰۶', jsonb_build_array((SELECT ay.id FROM "AssociationYears" ay JOIN "AcademicYears" y ON y.id = ay."academicYearId" WHERE ay."associationId" = (SELECT id FROM "Associations" WHERE "slug" = 'chemical-engineering') AND y."title" = '1405-1406')), 'Final List', '2026-11-14T08:00:00+03:30', '2026-11-14T22:00:00+03:30', 5, 5,
       'رأی‌گیری الکترونیکی انجمن علمی مهندسی شیمی، ۲۳ آبان ۱۴۰۵ از ساعت ۸ تا ۲۲. فقط دانشجویان فعال همین رشته پس از احراز هویت با شماره دانشجویی و فقط یک‌بار می‌توانند رأی دهند.'
WHERE NOT EXISTS (SELECT 1 FROM "Elections" WHERE "title" = 'انتخابات انجمن علمی مهندسی شیمی — ۱۴۰۵-۱۴۰۶');

INSERT INTO "Candidates" ("fullName", "studentNumber", "election", "status", "reviewNote")
SELECT v.n, v.s, jsonb_build_array(e.id), 'Approved', 'تأییدشده طبق نامه‌ی ۳/۱۴۰۵/۳۷/۳۱۸۵'
FROM (VALUES
  ('سیدامیرمحمد یزدان‌پناه', '4021103043'),
  ('فاطمه نعیمی', '4021103038'),
  ('پارمیدا حبیبی', '4021103013'),
  ('ماهک عنایتی', '4021103024'),
  ('مهتاب کریمی‌فر', '4041103032'),
  ('فاطمه شباطی طالمی', '4041103021'),
  ('شقایق صادقی', '4031103045'),
  ('مهدی علی‌زاده', '4031103054'),
  ('عرشیا وحیدی', '4031103086')
) AS v(n, s)
CROSS JOIN (SELECT id FROM "Elections" WHERE "title" = 'انتخابات انجمن علمی مهندسی شیمی — ۱۴۰۵-۱۴۰۶') e
ON CONFLICT ("electionId", "studentNumber") DO NOTHING;

-- ── مهندسی مکانیک: 6 نامزد ──
INSERT INTO "Associations" ("name", "slug", "shortDescription", "about", "faculty", "major", "active", "featured")
SELECT 'انجمن علمی مهندسی مکانیک', 'mechanical-engineering', 'انجمن علمی دانشجویی رشته‌ی مهندسی مکانیک دانشگاه شمال', '', m."faculty", jsonb_build_array(m.id), true, false
FROM "Majors" m WHERE m."name" = 'مهندسی مکانیک'
  AND NOT EXISTS (SELECT 1 FROM "Associations" WHERE "slug" = 'mechanical-engineering')
LIMIT 1;

INSERT INTO "AssociationYears" ("title", "association", "academicYear", "active", "needsUniversityApproval")
SELECT 'انجمن علمی مهندسی مکانیک — ۱۴۰۵-۱۴۰۶', jsonb_build_array((SELECT id FROM "Associations" WHERE "slug" = 'mechanical-engineering')), jsonb_build_array(y.id), true, false
FROM "AcademicYears" y WHERE y."title" = '1405-1406'
ON CONFLICT ("associationId", "academicYearId") DO NOTHING;

INSERT INTO "Elections" ("title", "associationYear", "status", "votingStart", "votingEnd", "seats", "maxChoicesPerVoter", "description")
SELECT 'انتخابات انجمن علمی مهندسی مکانیک — ۱۴۰۵-۱۴۰۶', jsonb_build_array((SELECT ay.id FROM "AssociationYears" ay JOIN "AcademicYears" y ON y.id = ay."academicYearId" WHERE ay."associationId" = (SELECT id FROM "Associations" WHERE "slug" = 'mechanical-engineering') AND y."title" = '1405-1406')), 'Final List', '2026-11-14T08:00:00+03:30', '2026-11-14T22:00:00+03:30', 5, 5,
       'رأی‌گیری الکترونیکی انجمن علمی مهندسی مکانیک، ۲۳ آبان ۱۴۰۵ از ساعت ۸ تا ۲۲. فقط دانشجویان فعال همین رشته پس از احراز هویت با شماره دانشجویی و فقط یک‌بار می‌توانند رأی دهند.'
WHERE NOT EXISTS (SELECT 1 FROM "Elections" WHERE "title" = 'انتخابات انجمن علمی مهندسی مکانیک — ۱۴۰۵-۱۴۰۶');

INSERT INTO "Candidates" ("fullName", "studentNumber", "election", "status", "reviewNote")
SELECT v.n, v.s, jsonb_build_array(e.id), 'Approved', 'تأییدشده طبق نامه‌ی ۳/۱۴۰۵/۳۷/۳۱۸۵'
FROM (VALUES
  ('میثم ابراهیم ملک‌ثابت', '4021183001'),
  ('محمد رنجبر', '4031183012'),
  ('سید ابوالفضل محمودی', '4031183025'),
  ('علی‌اصغر علیزاده', '4022183005'),
  ('مهران برزگران', '4031183006'),
  ('امیرحسین سپهریان', '4032183002')
) AS v(n, s)
CROSS JOIN (SELECT id FROM "Elections" WHERE "title" = 'انتخابات انجمن علمی مهندسی مکانیک — ۱۴۰۵-۱۴۰۶') e
ON CONFLICT ("electionId", "studentNumber") DO NOTHING;

-- ── مدیریت: 15 نامزد ──
INSERT INTO "Associations" ("name", "slug", "shortDescription", "about", "faculty", "major", "active", "featured")
SELECT 'انجمن علمی مدیریت', 'management', 'انجمن علمی دانشجویی رشته‌ی مدیریت دانشگاه شمال', '', m."faculty", jsonb_build_array(m.id), true, false
FROM "Majors" m WHERE m."name" = 'مدیریت'
  AND NOT EXISTS (SELECT 1 FROM "Associations" WHERE "slug" = 'management')
LIMIT 1;

INSERT INTO "AssociationYears" ("title", "association", "academicYear", "active", "needsUniversityApproval")
SELECT 'انجمن علمی مدیریت — ۱۴۰۵-۱۴۰۶', jsonb_build_array((SELECT id FROM "Associations" WHERE "slug" = 'management')), jsonb_build_array(y.id), true, false
FROM "AcademicYears" y WHERE y."title" = '1405-1406'
ON CONFLICT ("associationId", "academicYearId") DO NOTHING;

INSERT INTO "Elections" ("title", "associationYear", "status", "votingStart", "votingEnd", "seats", "maxChoicesPerVoter", "description")
SELECT 'انتخابات انجمن علمی مدیریت — ۱۴۰۵-۱۴۰۶', jsonb_build_array((SELECT ay.id FROM "AssociationYears" ay JOIN "AcademicYears" y ON y.id = ay."academicYearId" WHERE ay."associationId" = (SELECT id FROM "Associations" WHERE "slug" = 'management') AND y."title" = '1405-1406')), 'Final List', '2026-11-14T08:00:00+03:30', '2026-11-14T22:00:00+03:30', 5, 5,
       'رأی‌گیری الکترونیکی انجمن علمی مدیریت، ۲۳ آبان ۱۴۰۵ از ساعت ۸ تا ۲۲. فقط دانشجویان فعال همین رشته پس از احراز هویت با شماره دانشجویی و فقط یک‌بار می‌توانند رأی دهند.'
WHERE NOT EXISTS (SELECT 1 FROM "Elections" WHERE "title" = 'انتخابات انجمن علمی مدیریت — ۱۴۰۵-۱۴۰۶');

INSERT INTO "Candidates" ("fullName", "studentNumber", "election", "status", "reviewNote")
SELECT v.n, v.s, jsonb_build_array(e.id), 'Approved', 'تأییدشده طبق نامه‌ی ۳/۱۴۰۵/۳۷/۳۱۸۵'
FROM (VALUES
  ('امیرعلی ذبیح‌نیا', '4041248018'),
  ('محمدامین خلیل‌ارجمندی', '4041248016'),
  ('عسل عسکری', '4041272046'),
  ('فاطمه یوسفی', '4041247095'),
  ('پارسا مرادی', '4041248055'),
  ('امیررضا زارع', '4031249006'),
  ('هلیا محمدی', '4041248053'),
  ('صبا عزیزپور', '4041248042'),
  ('حنانه نصیری', '4031248062'),
  ('نگین رزی', '4021272040'),
  ('ثنا رادمهر', '4041272032'),
  ('یلدا چلابی', '4041272021'),
  ('سیده ماهان طباطبایی', '4032272006'),
  ('ابوالفضل عابدی', '4031272058'),
  ('امیررضا شیخی', '4041272041')
) AS v(n, s)
CROSS JOIN (SELECT id FROM "Elections" WHERE "title" = 'انتخابات انجمن علمی مدیریت — ۱۴۰۵-۱۴۰۶') e
ON CONFLICT ("electionId", "studentNumber") DO NOTHING;

-- ── روان‌شناسی: 13 نامزد ──
INSERT INTO "Associations" ("name", "slug", "shortDescription", "about", "faculty", "major", "active", "featured")
SELECT 'انجمن علمی روان‌شناسی', 'psychology', 'انجمن علمی دانشجویی رشته‌ی روان‌شناسی دانشگاه شمال', '', m."faculty", jsonb_build_array(m.id), true, false
FROM "Majors" m WHERE m."name" = 'روان‌شناسی'
  AND NOT EXISTS (SELECT 1 FROM "Associations" WHERE "slug" = 'psychology')
LIMIT 1;

INSERT INTO "AssociationYears" ("title", "association", "academicYear", "active", "needsUniversityApproval")
SELECT 'انجمن علمی روان‌شناسی — ۱۴۰۵-۱۴۰۶', jsonb_build_array((SELECT id FROM "Associations" WHERE "slug" = 'psychology')), jsonb_build_array(y.id), true, false
FROM "AcademicYears" y WHERE y."title" = '1405-1406'
ON CONFLICT ("associationId", "academicYearId") DO NOTHING;

INSERT INTO "Elections" ("title", "associationYear", "status", "votingStart", "votingEnd", "seats", "maxChoicesPerVoter", "description")
SELECT 'انتخابات انجمن علمی روان‌شناسی — ۱۴۰۵-۱۴۰۶', jsonb_build_array((SELECT ay.id FROM "AssociationYears" ay JOIN "AcademicYears" y ON y.id = ay."academicYearId" WHERE ay."associationId" = (SELECT id FROM "Associations" WHERE "slug" = 'psychology') AND y."title" = '1405-1406')), 'Final List', '2026-11-14T08:00:00+03:30', '2026-11-14T22:00:00+03:30', 5, 5,
       'رأی‌گیری الکترونیکی انجمن علمی روان‌شناسی، ۲۳ آبان ۱۴۰۵ از ساعت ۸ تا ۲۲. فقط دانشجویان فعال همین رشته پس از احراز هویت با شماره دانشجویی و فقط یک‌بار می‌توانند رأی دهند.'
WHERE NOT EXISTS (SELECT 1 FROM "Elections" WHERE "title" = 'انتخابات انجمن علمی روان‌شناسی — ۱۴۰۵-۱۴۰۶');

INSERT INTO "Candidates" ("fullName", "studentNumber", "election", "status", "reviewNote")
SELECT v.n, v.s, jsonb_build_array(e.id), 'Approved', 'تأییدشده طبق نامه‌ی ۳/۱۴۰۵/۳۷/۳۱۸۵'
FROM (VALUES
  ('عارف اسفندیاری مقدم', '4031281161'),
  ('سیده فاطمه حسینی', '4031281034'),
  ('صبا طبری', '4031281081'),
  ('هانیه شریفی', '4041281081'),
  ('معین خوش‌فطرت', '4041281054'),
  ('فاطمه آزادی', '4041281008'),
  ('زهرا رحمتی', '4031281050'),
  ('حسنا ذبیحی', '4041281062'),
  ('سیده ستایش رستگار نیاکی', '4041281065'),
  ('فاطمه بازدار', '4041281017'),
  ('ساجده عباسی', '4031281086'),
  ('مهدیس رضوی', '4031281159'),
  ('محمدسجاد سالاری', '4022281025')
) AS v(n, s)
CROSS JOIN (SELECT id FROM "Elections" WHERE "title" = 'انتخابات انجمن علمی روان‌شناسی — ۱۴۰۵-۱۴۰۶') e
ON CONFLICT ("electionId", "studentNumber") DO NOTHING;

-- ── مهندسی صنایع: 8 نامزد ──
INSERT INTO "Associations" ("name", "slug", "shortDescription", "about", "faculty", "major", "active", "featured")
SELECT 'انجمن علمی مهندسی صنایع', 'industrial-engineering', 'انجمن علمی دانشجویی رشته‌ی مهندسی صنایع دانشگاه شمال', '', m."faculty", jsonb_build_array(m.id), true, false
FROM "Majors" m WHERE m."name" = 'مهندسی صنایع'
  AND NOT EXISTS (SELECT 1 FROM "Associations" WHERE "slug" = 'industrial-engineering')
LIMIT 1;

INSERT INTO "AssociationYears" ("title", "association", "academicYear", "active", "needsUniversityApproval")
SELECT 'انجمن علمی مهندسی صنایع — ۱۴۰۵-۱۴۰۶', jsonb_build_array((SELECT id FROM "Associations" WHERE "slug" = 'industrial-engineering')), jsonb_build_array(y.id), true, false
FROM "AcademicYears" y WHERE y."title" = '1405-1406'
ON CONFLICT ("associationId", "academicYearId") DO NOTHING;

INSERT INTO "Elections" ("title", "associationYear", "status", "votingStart", "votingEnd", "seats", "maxChoicesPerVoter", "description")
SELECT 'انتخابات انجمن علمی مهندسی صنایع — ۱۴۰۵-۱۴۰۶', jsonb_build_array((SELECT ay.id FROM "AssociationYears" ay JOIN "AcademicYears" y ON y.id = ay."academicYearId" WHERE ay."associationId" = (SELECT id FROM "Associations" WHERE "slug" = 'industrial-engineering') AND y."title" = '1405-1406')), 'Final List', '2026-11-14T08:00:00+03:30', '2026-11-14T22:00:00+03:30', 5, 5,
       'رأی‌گیری الکترونیکی انجمن علمی مهندسی صنایع، ۲۳ آبان ۱۴۰۵ از ساعت ۸ تا ۲۲. فقط دانشجویان فعال همین رشته پس از احراز هویت با شماره دانشجویی و فقط یک‌بار می‌توانند رأی دهند.'
WHERE NOT EXISTS (SELECT 1 FROM "Elections" WHERE "title" = 'انتخابات انجمن علمی مهندسی صنایع — ۱۴۰۵-۱۴۰۶');

INSERT INTO "Candidates" ("fullName", "studentNumber", "election", "status", "reviewNote")
SELECT v.n, v.s, jsonb_build_array(e.id), 'Approved', 'تأییدشده طبق نامه‌ی ۳/۱۴۰۵/۳۷/۳۱۸۵'
FROM (VALUES
  ('امیرمحمد مختاری‌فرد', '4032136004'),
  ('مهدی حیدری', '4031136043'),
  ('مهدیس اله قلی', '4032136006'),
  ('آرش نورمحمدی', '4041136039'),
  ('سید ابراهیم کاووسی داودی', '4031136030'),
  ('ساجده علیزاده', '4031136024'),
  ('مهلا قربان‌علی‌نیا عمران', '4031136026'),
  ('محمد حیدری', '4031136014')
) AS v(n, s)
CROSS JOIN (SELECT id FROM "Elections" WHERE "title" = 'انتخابات انجمن علمی مهندسی صنایع — ۱۴۰۵-۱۴۰۶') e
ON CONFLICT ("electionId", "studentNumber") DO NOTHING;

-- ── علوم تربیتی: 5 نامزد ──
INSERT INTO "Associations" ("name", "slug", "shortDescription", "about", "faculty", "major", "active", "featured")
SELECT 'انجمن علمی علوم تربیتی', 'educational-sciences', 'انجمن علمی دانشجویی رشته‌ی علوم تربیتی دانشگاه شمال', '', m."faculty", jsonb_build_array(m.id), true, false
FROM "Majors" m WHERE m."name" = 'علوم تربیتی'
  AND NOT EXISTS (SELECT 1 FROM "Associations" WHERE "slug" = 'educational-sciences')
LIMIT 1;

INSERT INTO "AssociationYears" ("title", "association", "academicYear", "active", "needsUniversityApproval")
SELECT 'انجمن علمی علوم تربیتی — ۱۴۰۵-۱۴۰۶', jsonb_build_array((SELECT id FROM "Associations" WHERE "slug" = 'educational-sciences')), jsonb_build_array(y.id), true, false
FROM "AcademicYears" y WHERE y."title" = '1405-1406'
ON CONFLICT ("associationId", "academicYearId") DO NOTHING;

INSERT INTO "Elections" ("title", "associationYear", "status", "votingStart", "votingEnd", "seats", "maxChoicesPerVoter", "description")
SELECT 'انتخابات انجمن علمی علوم تربیتی — ۱۴۰۵-۱۴۰۶', jsonb_build_array((SELECT ay.id FROM "AssociationYears" ay JOIN "AcademicYears" y ON y.id = ay."academicYearId" WHERE ay."associationId" = (SELECT id FROM "Associations" WHERE "slug" = 'educational-sciences') AND y."title" = '1405-1406')), 'Final List', '2026-11-14T08:00:00+03:30', '2026-11-14T22:00:00+03:30', 5, 5,
       'رأی‌گیری الکترونیکی انجمن علمی علوم تربیتی، ۲۳ آبان ۱۴۰۵ از ساعت ۸ تا ۲۲. فقط دانشجویان فعال همین رشته پس از احراز هویت با شماره دانشجویی و فقط یک‌بار می‌توانند رأی دهند.'
WHERE NOT EXISTS (SELECT 1 FROM "Elections" WHERE "title" = 'انتخابات انجمن علمی علوم تربیتی — ۱۴۰۵-۱۴۰۶');

INSERT INTO "Candidates" ("fullName", "studentNumber", "election", "status", "reviewNote")
SELECT v.n, v.s, jsonb_build_array(e.id), 'Approved', 'تأییدشده طبق نامه‌ی ۳/۱۴۰۵/۳۷/۳۱۸۵'
FROM (VALUES
  ('مهرسا شکری', '4031283050'),
  ('فاطمه کرد', '4042283002'),
  ('مهنا کرمی', '4031283077'),
  ('زهرا حسینی', '4031283102'),
  ('زهرا مهدوی‌مقدم', '4031283092')
) AS v(n, s)
CROSS JOIN (SELECT id FROM "Elections" WHERE "title" = 'انتخابات انجمن علمی علوم تربیتی — ۱۴۰۵-۱۴۰۶') e
ON CONFLICT ("electionId", "studentNumber") DO NOTHING;

-- ── حسابداری: 8 نامزد ──
INSERT INTO "Associations" ("name", "slug", "shortDescription", "about", "faculty", "major", "active", "featured")
SELECT 'انجمن علمی حسابداری', 'accounting', 'انجمن علمی دانشجویی رشته‌ی حسابداری دانشگاه شمال', '', m."faculty", jsonb_build_array(m.id), true, false
FROM "Majors" m WHERE m."name" = 'حسابداری'
  AND NOT EXISTS (SELECT 1 FROM "Associations" WHERE "slug" = 'accounting')
LIMIT 1;

INSERT INTO "AssociationYears" ("title", "association", "academicYear", "active", "needsUniversityApproval")
SELECT 'انجمن علمی حسابداری — ۱۴۰۵-۱۴۰۶', jsonb_build_array((SELECT id FROM "Associations" WHERE "slug" = 'accounting')), jsonb_build_array(y.id), true, false
FROM "AcademicYears" y WHERE y."title" = '1405-1406'
ON CONFLICT ("associationId", "academicYearId") DO NOTHING;

INSERT INTO "Elections" ("title", "associationYear", "status", "votingStart", "votingEnd", "seats", "maxChoicesPerVoter", "description")
SELECT 'انتخابات انجمن علمی حسابداری — ۱۴۰۵-۱۴۰۶', jsonb_build_array((SELECT ay.id FROM "AssociationYears" ay JOIN "AcademicYears" y ON y.id = ay."academicYearId" WHERE ay."associationId" = (SELECT id FROM "Associations" WHERE "slug" = 'accounting') AND y."title" = '1405-1406')), 'Final List', '2026-11-14T08:00:00+03:30', '2026-11-14T22:00:00+03:30', 5, 5,
       'رأی‌گیری الکترونیکی انجمن علمی حسابداری، ۲۳ آبان ۱۴۰۵ از ساعت ۸ تا ۲۲. فقط دانشجویان فعال همین رشته پس از احراز هویت با شماره دانشجویی و فقط یک‌بار می‌توانند رأی دهند.'
WHERE NOT EXISTS (SELECT 1 FROM "Elections" WHERE "title" = 'انتخابات انجمن علمی حسابداری — ۱۴۰۵-۱۴۰۶');

INSERT INTO "Candidates" ("fullName", "studentNumber", "election", "status", "reviewNote")
SELECT v.n, v.s, jsonb_build_array(e.id), 'Approved', 'تأییدشده طبق نامه‌ی ۳/۱۴۰۵/۳۷/۳۱۸۵'
FROM (VALUES
  ('مهدیه مؤمنی‌پور', '4031212141'),
  ('سوسن فاضل‌تبار', '4031212098'),
  ('مهدی حسینی ایمنی', '4021212045'),
  ('محمدحسین مختاری', '4032212057'),
  ('زهرا فرجی', '4032212049'),
  ('هلیا حیدرپور', '4032212022'),
  ('پونه همدانی', '4032212061'),
  ('فاطمه قاسمی', '4031212104')
) AS v(n, s)
CROSS JOIN (SELECT id FROM "Elections" WHERE "title" = 'انتخابات انجمن علمی حسابداری — ۱۴۰۵-۱۴۰۶') e
ON CONFLICT ("electionId", "studentNumber") DO NOTHING;
