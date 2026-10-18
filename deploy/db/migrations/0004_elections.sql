-- 0004 elections (Phases 2–3): elections, candidates, eligible voters, participation, ballots,
-- voter sessions and failed-attempt counters. Same convention as 0003: links are jsonb arrays
-- (so app endpoints run unchanged) + STORED generated columns with REAL foreign keys,
-- UNIQUE and CHECK constraints, + link views named like the Zite join tables.
--
-- Privacy rules enforced here:
--  * "VoterParticipation" stores NO raw student number and NO exact time (date only, no created_at).
--  * "Ballots" has NO reference to a voter and NO timestamp column at all; id is a random UUID.
--  * Ballots are append-only (UPDATE/DELETE rejected by trigger). Official voiding (Phase 6) will be
--    a separate, logged table — never an edit of the ballot row.

CREATE TABLE IF NOT EXISTS "Elections" (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "title" text NOT NULL CHECK (length(btrim("title")) BETWEEN 3 AND 200),
  "associationYear" jsonb NOT NULL DEFAULT '[]',
  "associationYearId" text GENERATED ALWAYS AS ("associationYear"->>0) STORED NOT NULL REFERENCES "AssociationYears"(id),
  "status" text NOT NULL DEFAULT 'Draft' CHECK ("status" IN (
    'Draft', 'Candidacy Open', 'Candidate Review', 'Final List', 'Voting Open', 'Closed',
    'Counting', 'Results Confirmed', 'Results Published', 'Archived', 'Cancelled')),
  "candidacyStart" timestamptz, "candidacyEnd" timestamptz,
  "votingStart" timestamptz, "votingEnd" timestamptz,
  "seats" integer NOT NULL DEFAULT 1 CHECK ("seats" BETWEEN 1 AND 50),
  "maxChoicesPerVoter" integer NOT NULL DEFAULT 1 CHECK ("maxChoicesPerVoter" BETWEEN 1 AND 50),
  "description" text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ("maxChoicesPerVoter" <= "seats"),
  CHECK ("candidacyEnd" IS NULL OR "candidacyStart" IS NULL OR "candidacyEnd" > "candidacyStart"),
  CHECK ("votingEnd" IS NULL OR "votingStart" IS NULL OR "votingEnd" > "votingStart"),
  CHECK ("votingStart" IS NULL OR "candidacyEnd" IS NULL OR "votingStart" >= "candidacyEnd"),
  CHECK ("status" IN ('Draft', 'Candidacy Open', 'Candidate Review', 'Final List', 'Cancelled')
         OR ("votingStart" IS NOT NULL AND "votingEnd" IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS "Candidates" (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "fullName" text NOT NULL CHECK (length(btrim("fullName")) BETWEEN 3 AND 150),
  "election" jsonb NOT NULL DEFAULT '[]',
  "electionId" text GENERATED ALWAYS AS ("election"->>0) STORED NOT NULL REFERENCES "Elections"(id),
  "studentNumber" text NOT NULL CHECK ("studentNumber" ~ '^[0-9]{5,16}$'),
  "status" text NOT NULL DEFAULT 'Pending' CHECK ("status" IN ('Pending', 'Approved', 'Rejected', 'Withdrawn')),
  "statement" text, "photoUrl" text, "reviewNote" text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("electionId", "studentNumber")
);

CREATE TABLE IF NOT EXISTS "EligibleVoters" (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "studentNumber" text NOT NULL CHECK ("studentNumber" ~ '^[0-9]{5,16}$'),
  "election" jsonb NOT NULL DEFAULT '[]',
  "electionId" text GENERATED ALWAYS AS ("election"->>0) STORED NOT NULL REFERENCES "Elections"(id),
  "major" jsonb NOT NULL DEFAULT '[]',
  "majorId" text GENERATED ALWAYS AS ("major"->>0) STORED REFERENCES "Majors"(id),
  "fullName" text, "majorName" text,
  -- HMAC-SHA256 hex (64 chars). The raw national ID is never stored.
  "nationalIdHash" text NOT NULL CHECK ("nationalIdHash" ~ '^[0-9a-f]{64}$'),
  "nationalIdLast4" text CHECK ("nationalIdLast4" IS NULL OR "nationalIdLast4" ~ '^[0-9]{4}$'),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("electionId", "studentNumber")
);

CREATE TABLE IF NOT EXISTS "VoterParticipation" (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  -- "label" = participation confirmation code (random; says nothing about the ballot content)
  "label" text NOT NULL UNIQUE CHECK ("label" ~ '^[0-9A-Z]{5}-[0-9A-Z]{5}$'),
  "election" jsonb NOT NULL DEFAULT '[]', "voter" jsonb NOT NULL DEFAULT '[]',
  "electionId" text GENERATED ALWAYS AS ("election"->>0) STORED NOT NULL REFERENCES "Elections"(id),
  "voterId" text GENERATED ALWAYS AS ("voter"->>0) STORED NOT NULL REFERENCES "EligibleVoters"(id),
  "votedOn" date NOT NULL,
  -- One vote per voter per election, enforced by the database
  UNIQUE ("electionId", "voterId")
);
-- The voter must belong to the same election
CREATE OR REPLACE FUNCTION "VoterParticipation_same_election"() RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "EligibleVoters" v WHERE v.id = NEW."voter"->>0 AND v."electionId" = NEW."election"->>0) THEN
    RAISE EXCEPTION 'voter does not belong to this election';
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS "VoterParticipation_same_election_trg" ON "VoterParticipation";
CREATE TRIGGER "VoterParticipation_same_election_trg" BEFORE INSERT OR UPDATE ON "VoterParticipation"
  FOR EACH ROW EXECUTE FUNCTION "VoterParticipation_same_election"();

CREATE TABLE IF NOT EXISTS "Ballots" (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  -- "receipt" = random ballot UUID (not shown to the voter)
  "receipt" text NOT NULL UNIQUE CHECK ("receipt" ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'),
  "election" jsonb NOT NULL DEFAULT '[]',
  "electionId" text GENERATED ALWAYS AS ("election"->>0) STORED NOT NULL REFERENCES "Elections"(id),
  "candidateIds" text NOT NULL CHECK (length("candidateIds") > 0)
  -- intentionally: no voter column, no created_at / updated_at
);
CREATE OR REPLACE FUNCTION "Ballots_append_only"() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'ballots are append-only';
END $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS "Ballots_append_only_trg" ON "Ballots";
CREATE TRIGGER "Ballots_append_only_trg" BEFORE UPDATE OR DELETE ON "Ballots"
  FOR EACH ROW EXECUTE FUNCTION "Ballots_append_only"();

CREATE TABLE IF NOT EXISTS "VoterSessions" (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tokenHash" text NOT NULL UNIQUE CHECK ("tokenHash" ~ '^[0-9a-f]{64}$'),
  "election" jsonb NOT NULL DEFAULT '[]', "voter" jsonb NOT NULL DEFAULT '[]',
  "electionId" text GENERATED ALWAYS AS ("election"->>0) STORED NOT NULL REFERENCES "Elections"(id) ON DELETE CASCADE,
  "voterId" text GENERATED ALWAYS AS ("voter"->>0) STORED NOT NULL REFERENCES "EligibleVoters"(id) ON DELETE CASCADE,
  "expiresAt" timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  -- sessions last at most 20 minutes
  CHECK ("expiresAt" <= created_at + interval '20 minutes')
);

CREATE TABLE IF NOT EXISTS "VoterAttempts" (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "bucket" text NOT NULL CHECK ("bucket" ~ '^(sn|ip):[0-9a-f]{40}$'),
  "windowStart" timestamptz NOT NULL,
  "failures" integer NOT NULL DEFAULT 0 CHECK ("failures" >= 0),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("bucket", "windowStart")
);

-- Link views (Zite join-table names)
CREATE OR REPLACE VIEW "AssociationYearsElections" AS SELECT id AS "electionsId", "associationYearId" AS "associationYearsId" FROM "Elections";
CREATE OR REPLACE VIEW "CandidatesElections" AS SELECT id AS "candidatesId", "electionId" AS "electionsId" FROM "Candidates";
CREATE OR REPLACE VIEW "ElectionsEligibleVoters" AS SELECT id AS "eligibleVotersId", "electionId" AS "electionsId" FROM "EligibleVoters";
CREATE OR REPLACE VIEW "EligibleVotersMajors" AS SELECT id AS "eligibleVotersId", "majorId" AS "majorsId" FROM "EligibleVoters" WHERE "majorId" IS NOT NULL;
CREATE OR REPLACE VIEW "ElectionsVoterParticipation" AS SELECT id AS "voterParticipationId", "electionId" AS "electionsId" FROM "VoterParticipation";
CREATE OR REPLACE VIEW "EligibleVotersVoterParticipation" AS SELECT id AS "voterParticipationId", "voterId" AS "eligibleVotersId" FROM "VoterParticipation";
CREATE OR REPLACE VIEW "BallotsElections" AS SELECT id AS "ballotsId", "electionId" AS "electionsId" FROM "Ballots";
CREATE OR REPLACE VIEW "ElectionsVoterSessions" AS SELECT id AS "voterSessionsId", "electionId" AS "electionsId" FROM "VoterSessions";
CREATE OR REPLACE VIEW "EligibleVotersVoterSessions" AS SELECT id AS "voterSessionsId", "voterId" AS "eligibleVotersId" FROM "VoterSessions";
