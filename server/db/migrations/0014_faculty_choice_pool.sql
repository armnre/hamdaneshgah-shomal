-- 0014: رشته‌های بدون انجمن (مثل «علوم و مهندسی محیط زیست») در «یکی» از انجمن‌های دانشکده‌ی خود رأی می‌دهند.
-- چنین دانشجویی در فهرست واجدین همه‌ی انجمن‌های دانشکده‌اش ثبت می‌شود با یک "choiceGroup" مشترک؛
-- پایگاه داده تضمین می‌کند که در هر گروه فقط یک مشارکت (یک رأی) ثبت شود. Idempotent.

ALTER TABLE "EligibleVoters" ADD COLUMN IF NOT EXISTS "choiceGroup" text;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'EligibleVoters_choiceGroup_format') THEN
    ALTER TABLE "EligibleVoters" ADD CONSTRAINT "EligibleVoters_choiceGroup_format"
      CHECK ("choiceGroup" IS NULL OR "choiceGroup" ~ '^faculty:[a-z-]+:[0-9-]+$');
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS "EligibleVoters_choiceGroup" ON "EligibleVoters" ("choiceGroup", "studentNumber") WHERE "choiceGroup" IS NOT NULL;

-- یک رأی در هر گروه: قفل تراکنشی روی (گروه، شماره دانشجویی) تا دو رأی هم‌زمان در دو انجمن ممکن نباشد.
-- خطای unique_violation همان مسیر «قبلاً رأی داده‌اید» را در castBallotAtomic فعال می‌کند.
CREATE OR REPLACE FUNCTION "VoterParticipation_one_per_group"() RETURNS trigger AS $$
DECLARE g text; sn text;
BEGIN
  SELECT v."choiceGroup", v."studentNumber" INTO g, sn FROM "EligibleVoters" v WHERE v.id = NEW."voter"->>0;
  IF g IS NULL THEN RETURN NEW; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(g || ':' || sn, 0));
  IF EXISTS (
    SELECT 1 FROM "VoterParticipation" p JOIN "EligibleVoters" v ON v.id = p."voterId"
    WHERE v."choiceGroup" = g AND v."studentNumber" = sn AND p.id IS DISTINCT FROM NEW.id
  ) THEN
    RAISE EXCEPTION 'voter already participated in this faculty group' USING ERRCODE = 'unique_violation';
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS "VoterParticipation_one_per_group_trg" ON "VoterParticipation";
CREATE TRIGGER "VoterParticipation_one_per_group_trg" BEFORE INSERT OR UPDATE ON "VoterParticipation"
  FOR EACH ROW EXECUTE FUNCTION "VoterParticipation_one_per_group"();

-- رشته‌ی سیستمی محیط زیست در دانشکده فنی و مهندسی
INSERT INTO "Majors" (id, "name", "faculty", "active", "verified", "description")
SELECT gen_random_uuid()::text, 'علوم و مهندسی محیط زیست',
  COALESCE((SELECT jsonb_build_array(id) FROM "Faculties" WHERE "slug" = 'engineering' LIMIT 1), '[]'::jsonb), true, false, ''
WHERE NOT EXISTS (SELECT 1 FROM "Majors" WHERE "name" = 'علوم و مهندسی محیط زیست');
