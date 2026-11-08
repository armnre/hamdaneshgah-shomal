-- Candidates may be listed without a student number; enter the remaining candidates from the letter.
ALTER TABLE "Candidates" ALTER COLUMN "studentNumber" DROP NOT NULL;

INSERT INTO "Candidates" ("fullName", "studentNumber", "election", "status", "reviewNote")
SELECT v.n, NULL, jsonb_build_array(e.id), 'Approved', 'تأییدشده طبق نامه‌ی ۳/۱۴۰۵/۳۷/۳۱۸۵'
FROM (VALUES
  ('جواد محمدپور', 'انتخابات انجمن علمی حقوق — ۱۴۰۵-۱۴۰۶'),
  ('ماهان طباطبایی', 'انتخابات انجمن علمی مدیریت — ۱۴۰۵-۱۴۰۶'),
  ('ملینا نجاریان', 'انتخابات انجمن علمی علوم تربیتی — ۱۴۰۵-۱۴۰۶')
) AS v(n, t)
JOIN "Elections" e ON e."title" = v.t
WHERE NOT EXISTS (SELECT 1 FROM "Candidates" c WHERE c."fullName" = v.n AND c."electionId" = e.id);
