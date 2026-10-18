-- 0003 organisational structure (Phase B): academic years, per-year associations,
-- major→association mapping (decides where each student votes), positions, leadership terms.
-- Links keep the Zite convention (jsonb arrays + link views) so app endpoints run unchanged;
-- stored generated columns carry REAL foreign keys, UNIQUE and CHECK constraints on top.

CREATE TABLE IF NOT EXISTS "AcademicYears" (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "title" text NOT NULL UNIQUE CHECK ("title" ~ '^[۰-۹0-9]{4}-[۰-۹0-9]{4}$'),
  "status" text NOT NULL DEFAULT 'Upcoming' CHECK ("status" IN ('Upcoming', 'Current', 'Archived')),
  "startDate" timestamptz, "endDate" timestamptz, "sortOrder" double precision,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ("endDate" IS NULL OR "startDate" IS NULL OR "endDate" >= "startDate")
);
-- Only one current year at a time
CREATE UNIQUE INDEX IF NOT EXISTS "AcademicYears_one_current" ON "AcademicYears" (("status")) WHERE "status" = 'Current';

CREATE TABLE IF NOT EXISTS "AssociationYears" (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "title" text,
  "association" jsonb NOT NULL DEFAULT '[]', "academicYear" jsonb NOT NULL DEFAULT '[]',
  "associationId" text GENERATED ALWAYS AS ("association"->>0) STORED REFERENCES "Associations"(id),
  "academicYearId" text GENERATED ALWAYS AS ("academicYear"->>0) STORED REFERENCES "AcademicYears"(id),
  "active" boolean DEFAULT true, "needsUniversityApproval" boolean DEFAULT false, "notes" text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("associationId", "academicYearId")
);

CREATE TABLE IF NOT EXISTS "AssociationMajors" (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "label" text,
  "associationYear" jsonb NOT NULL DEFAULT '[]', "major" jsonb NOT NULL DEFAULT '[]',
  "associationYearId" text GENERATED ALWAYS AS ("associationYear"->>0) STORED NOT NULL REFERENCES "AssociationYears"(id),
  "majorId" text GENERATED ALWAYS AS ("major"->>0) STORED NOT NULL REFERENCES "Majors"(id),
  "needsUniversityApproval" boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("associationYearId", "majorId")
);
-- "One major → one association per academic year" spans two tables, so it is enforced by trigger.
CREATE OR REPLACE FUNCTION "AssociationMajors_one_per_year"() RETURNS trigger AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "AssociationMajors" am
    JOIN "AssociationYears" ay ON ay.id = am."associationYearId"
    -- generated columns are not yet computed in BEFORE triggers, so read the raw jsonb
    WHERE am."majorId" = NEW."major"->>0 AND am.id <> NEW.id
      AND ay."academicYearId" = (SELECT "academicYearId" FROM "AssociationYears" WHERE id = NEW."associationYear"->>0)
  ) THEN
    RAISE EXCEPTION 'major already mapped to another association in this academic year';
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS "AssociationMajors_one_per_year_trg" ON "AssociationMajors";
CREATE TRIGGER "AssociationMajors_one_per_year_trg" BEFORE INSERT OR UPDATE ON "AssociationMajors"
  FOR EACH ROW EXECUTE FUNCTION "AssociationMajors_one_per_year"();

CREATE TABLE IF NOT EXISTS "Positions" (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "name" text NOT NULL UNIQUE,
  "scope" text NOT NULL DEFAULT 'Association' CHECK ("scope" IN ('Council', 'Association')),
  "rank" double precision,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "LeadershipTerms" (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "label" text, "personName" text, "personEmail" text,
  "academicYear" jsonb NOT NULL DEFAULT '[]', "associationYear" jsonb NOT NULL DEFAULT '[]', "position" jsonb NOT NULL DEFAULT '[]',
  "academicYearId" text GENERATED ALWAYS AS ("academicYear"->>0) STORED NOT NULL REFERENCES "AcademicYears"(id),
  "associationYearId" text GENERATED ALWAYS AS ("associationYear"->>0) STORED REFERENCES "AssociationYears"(id),
  "positionId" text GENERATED ALWAYS AS ("position"->>0) STORED NOT NULL REFERENCES "Positions"(id),
  "status" text NOT NULL DEFAULT 'Undetermined' CHECK ("status" IN ('Undetermined', 'Active', 'Ended', 'Resigned')),
  "startDate" timestamptz, "endDate" timestamptz, "publishName" boolean DEFAULT false, "notes" text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ("endDate" IS NULL OR "startDate" IS NULL OR "endDate" >= "startDate"),
  CHECK ("status" <> 'Active' OR coalesce("personName", '') <> '')
);
-- History is append-only: ended/resigned terms can be neither edited nor deleted.
CREATE OR REPLACE FUNCTION "LeadershipTerms_protect_history"() RETURNS trigger AS $$
BEGIN
  IF OLD."status" IN ('Ended', 'Resigned') THEN
    RAISE EXCEPTION 'closed leadership terms are immutable';
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS "LeadershipTerms_protect_history_trg" ON "LeadershipTerms";
CREATE TRIGGER "LeadershipTerms_protect_history_trg" BEFORE UPDATE OR DELETE ON "LeadershipTerms"
  FOR EACH ROW EXECUTE FUNCTION "LeadershipTerms_protect_history"();

-- Link views (Zite naming: alphabetical PascalCase, "<table>Id" columns)
CREATE OR REPLACE VIEW "AssociationYearsAssociations" AS
  SELECT id AS "associationYearsId", "associationId" AS "associationsId" FROM "AssociationYears" WHERE "associationId" IS NOT NULL;
CREATE OR REPLACE VIEW "AcademicYearsAssociationYears" AS
  SELECT id AS "associationYearsId", "academicYearId" AS "academicYearsId" FROM "AssociationYears" WHERE "academicYearId" IS NOT NULL;
CREATE OR REPLACE VIEW "AssociationMajorsAssociationYears" AS
  SELECT id AS "associationMajorsId", "associationYearId" AS "associationYearsId" FROM "AssociationMajors";
CREATE OR REPLACE VIEW "AssociationMajorsMajors" AS
  SELECT id AS "associationMajorsId", "majorId" AS "majorsId" FROM "AssociationMajors";
CREATE OR REPLACE VIEW "AcademicYearsLeadershipTerms" AS
  SELECT id AS "leadershipTermsId", "academicYearId" AS "academicYearsId" FROM "LeadershipTerms";
CREATE OR REPLACE VIEW "AssociationYearsLeadershipTerms" AS
  SELECT id AS "leadershipTermsId", "associationYearId" AS "associationYearsId" FROM "LeadershipTerms" WHERE "associationYearId" IS NOT NULL;
CREATE OR REPLACE VIEW "LeadershipTermsPositions" AS
  SELECT id AS "leadershipTermsId", "positionId" AS "positionsId" FROM "LeadershipTerms";
