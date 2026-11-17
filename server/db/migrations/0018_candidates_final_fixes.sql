-- 0018: اصلاحات نهایی نامزدها طبق تأیید دانشگاه (Idempotent)
-- 1) مدیریت: نام درست «سیده ماهان طباطبایی» (4032272006) است؛ ردیف بدون شماره‌ی «ماهان طباطبایی» کنار می‌رود.
UPDATE "Candidates" SET "status" = 'Approved', "reviewNote" = 'تأییدشده طبق فهرست نهایی نامزدها (۱۴۰۵/۰۸)'
WHERE "fullName" = 'سیده ماهان طباطبایی'
  AND "electionId" = (SELECT id FROM "Elections" WHERE "title" = 'انتخابات انجمن علمی مدیریت — ۱۴۰۵-۱۴۰۶');
-- اگر ردیف «سیده...» وجود ندارد، همان ردیف قبلی تغییر نام می‌دهد
UPDATE "Candidates" c SET "fullName" = 'سیده ماهان طباطبایی'
WHERE c."fullName" = 'ماهان طباطبایی'
  AND c."electionId" = (SELECT id FROM "Elections" WHERE "title" = 'انتخابات انجمن علمی مدیریت — ۱۴۰۵-۱۴۰۶')
  AND NOT EXISTS (SELECT 1 FROM "Candidates" s WHERE s."electionId" = c."electionId" AND s."fullName" = 'سیده ماهان طباطبایی');
UPDATE "Candidates" SET "status" = 'Withdrawn', "reviewNote" = 'تکراری: همان «سیده ماهان طباطبایی» است.'
WHERE "fullName" = 'ماهان طباطبایی'
  AND "electionId" = (SELECT id FROM "Elections" WHERE "title" = 'انتخابات انجمن علمی مدیریت — ۱۴۰۵-۱۴۰۶');

-- 2) علوم تربیتی: «فاطمه کرد» و «ملینا نجاریان» هر دو نامزد تأییدشده‌اند (یکی بدون شماره، چون شماره‌ی فایل یکی است).
UPDATE "Candidates" SET "status" = 'Approved', "reviewNote" = 'تأییدشده طبق فهرست نهایی نامزدها (۱۴۰۵/۰۸)'
WHERE "fullName" IN ('فاطمه کرد', 'ملینا نجاریان')
  AND "electionId" = (SELECT id FROM "Elections" WHERE "title" = 'انتخابات انجمن علمی علوم تربیتی — ۱۴۰۵-۱۴۰۶');
