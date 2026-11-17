-- 0019: انتخابات انجمن علمی مهندسی کامپیوتر (و هر انتخابات ۱۴۰۵ دیگری که پیش از موعد به مرحله‌ی پس از رأی‌گیری رفته)
-- از اول: «فهرست نهایی»، رأی‌گیری یکشنبه ۱ آذر ۱۴۰۵ ساعت ۸ تا ۲۲ تهران. فقط اگر هیچ برگه/مشارکتی ندارد. Idempotent.
DO $$
DECLARE n integer;
BEGIN
  SELECT (SELECT count(*) FROM "Ballots" b JOIN "Elections" e ON e.id = b."electionId" WHERE e."title" LIKE 'انتخابات انجمن علمی % — ۱۴۰۵-۱۴۰۶' AND e."status" NOT IN ('Final List', 'Draft', 'Candidacy Open', 'Candidate Review'))
       + (SELECT count(*) FROM "PendingBallots" b JOIN "Elections" e ON e.id = b."electionId" WHERE e."title" LIKE 'انتخابات انجمن علمی % — ۱۴۰۵-۱۴۰۶' AND e."status" NOT IN ('Final List', 'Draft', 'Candidacy Open', 'Candidate Review'))
       + (SELECT count(*) FROM "VoterParticipation" p JOIN "Elections" e ON e.id = p."electionId" WHERE e."title" LIKE 'انتخابات انجمن علمی % — ۱۴۰۵-۱۴۰۶' AND e."status" NOT IN ('Final List', 'Draft', 'Candidacy Open', 'Candidate Review'))
    INTO n;
  IF n > 0 THEN RAISE EXCEPTION '0019: % رأی/مشارکت ثبت شده؛ بازگشت انتخابات به فهرست نهایی انجام نمی‌شود', n; END IF;
END $$;

UPDATE "Elections" SET "status" = 'Final List', "votingStart" = '2026-11-22T08:00:00+03:30', "votingEnd" = '2026-11-22T22:00:00+03:30', updated_at = now()
WHERE "title" LIKE 'انتخابات انجمن علمی % — ۱۴۰۵-۱۴۰۶' AND "isDemo" = false
  AND "status" IN ('Voting Open', 'Closed', 'Counting', 'Results Confirmed', 'Results Published', 'Archived');

INSERT INTO "AuditLogs" ("action", "entity", "entityId", "details", "actorEmail")
SELECT 'update', 'elections', e.id, 'migration 0019: بازگشت به فهرست نهایی برای رأی‌گیری ۱ آذر ۱۴۰۵', 'migration'
FROM "Elections" e WHERE e."title" = 'انتخابات انجمن علمی مهندسی کامپیوتر — ۱۴۰۵-۱۴۰۶'
  AND NOT EXISTS (SELECT 1 FROM "AuditLogs" a WHERE a."entityId" = e.id AND a."details" LIKE 'migration 0019%');
