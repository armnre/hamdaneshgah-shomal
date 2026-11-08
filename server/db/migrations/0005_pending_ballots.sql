-- 0005 ballot secrecy against system columns (Phase 1).
--
-- Problem: participation + ballot were inserted in ONE transaction, so both rows carried the same
-- Postgres xmin (and adjacent ctid). Anyone with SQL access could join p.xmin = b.xmin and read
-- each person's vote.
--
-- Fix:
--  * The ballot gets a NEW random receipt when it is moved, so a Pending row (or a copy of it in a
--    backup) cannot be matched to its final Ballot by receipt.
--  * During voting the ballot goes to "PendingBallots" (no voter link, no time column).
--  * "close_election"(id) — ONE transaction — closes the election, ends sessions, copies every
--    pending ballot of that election into "Ballots" in ORDER BY random(), deletes the pending rows
--    and re-writes the election's participation rows. Afterwards every live ballot AND every live
--    participation row of that election carries the SAME xmin (the closing transaction), and the
--    physical order of ballots is random. Counting reads "Ballots" only.
--  * Direct INSERT into "Ballots" is refused unless it comes from close_election (session flag),
--    so no API can add a ballot directly. Pending rows can only be deleted by close_election.
--  * Residual: while voting is open, a Pending row still shares xmin with its participation row;
--    dead tuple versions stay on disk until VACUUM. See docs/security.md and
--    docs/backup-and-recovery.md (VACUUM FULL after close).

CREATE TABLE IF NOT EXISTS "PendingBallots" (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "receipt" text NOT NULL UNIQUE CHECK ("receipt" ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'),
  "election" jsonb NOT NULL DEFAULT '[]',
  "electionId" text GENERATED ALWAYS AS ("election"->>0) STORED NOT NULL REFERENCES "Elections"(id),
  "candidateIds" text NOT NULL CHECK (length("candidateIds") > 0)
  -- intentionally: no voter column, no created_at / updated_at
);

CREATE OR REPLACE VIEW "ElectionsPendingBallots" AS SELECT id AS "pendingBallotsId", "electionId" AS "electionsId" FROM "PendingBallots";

-- PendingBallots: never updated; deleted only by close_election
CREATE OR REPLACE FUNCTION "PendingBallots_guard"() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' AND current_setting('hamdaneshgah.sealing', true) = 'on' THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'pending ballots are append-only';
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "PendingBallots_guard_trg" ON "PendingBallots";

CREATE TRIGGER "PendingBallots_guard_trg" BEFORE UPDATE OR DELETE ON "PendingBallots"
  FOR EACH ROW EXECUTE FUNCTION "PendingBallots_guard"();

-- Ballots: rows only arrive through close_election
CREATE OR REPLACE FUNCTION "Ballots_insert_guard"() RETURNS trigger AS $$
BEGIN
  IF current_setting('hamdaneshgah.sealing', true) IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION 'ballots can only be added by close_election';
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "Ballots_insert_guard_trg" ON "Ballots";

CREATE TRIGGER "Ballots_insert_guard_trg" BEFORE INSERT ON "Ballots"
  FOR EACH ROW EXECUTE FUNCTION "Ballots_insert_guard"();

-- Close + seal in one transaction. Returns the number of ballots moved.
CREATE OR REPLACE FUNCTION close_election(eid text) RETURNS integer AS $$
DECLARE moved integer;
BEGIN
  UPDATE "Elections"
     SET "status" = 'Closed',
         "votingEnd" = LEAST(coalesce("votingEnd", now()), now()),
         updated_at = now()
   WHERE id = eid AND "status" = 'Voting Open';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'election is not open for voting';
  END IF;
  DELETE FROM "VoterSessions" WHERE "electionId" = eid;
  PERFORM set_config('hamdaneshgah.sealing', 'on', true);
  INSERT INTO "Ballots" ("receipt", "election", "candidateIds")
    SELECT gen_random_uuid()::text, "election", "candidateIds" FROM "PendingBallots"
     WHERE "electionId" = eid ORDER BY random();
  GET DIAGNOSTICS moved = ROW_COUNT;
  DELETE FROM "PendingBallots" WHERE "electionId" = eid;
  -- re-write participation so its xmin is the closing transaction too (no per-voter xmin survives)
  UPDATE "VoterParticipation" SET "votedOn" = "votedOn" WHERE "electionId" = eid;
  PERFORM set_config('hamdaneshgah.sealing', 'off', true);
  RETURN moved;
END $$ LANGUAGE plpgsql
