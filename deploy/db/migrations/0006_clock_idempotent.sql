-- 0006: election clock hardening.
--  * close_election(eid) is serialized per election with pg_advisory_xact_lock and is idempotent:
--    a second (or concurrent) call after the election left 'Voting Open' returns 0 and moves nothing.
--  * open_election(eid) opens a 'Final List' election only inside its voting window and only when it
--    has approved candidates and voters; returns true for exactly one caller.

CREATE OR REPLACE FUNCTION close_election(eid text) RETURNS integer AS $$
DECLARE moved integer; st text;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('hamdaneshgah:election:' || eid));
  SELECT "status" INTO st FROM "Elections" WHERE id = eid FOR UPDATE;
  IF st IS NULL THEN
    RAISE EXCEPTION 'election not found';
  END IF;
  IF st IN ('Closed', 'Counting', 'Results Confirmed', 'Results Published', 'Archived') THEN
    RETURN 0; -- already sealed: idempotent no-op
  END IF;
  IF st <> 'Voting Open' THEN
    RAISE EXCEPTION 'election is not open for voting';
  END IF;
  UPDATE "Elections"
     SET "status" = 'Closed',
         "votingEnd" = LEAST(coalesce("votingEnd", now()), now()),
         updated_at = now()
   WHERE id = eid;
  DELETE FROM "VoterSessions" WHERE "electionId" = eid;
  PERFORM set_config('hamdaneshgah.sealing', 'on', true);
  INSERT INTO "Ballots" ("receipt", "election", "candidateIds")
    SELECT gen_random_uuid()::text, "election", "candidateIds" FROM "PendingBallots"
     WHERE "electionId" = eid ORDER BY random();
  GET DIAGNOSTICS moved = ROW_COUNT;
  DELETE FROM "PendingBallots" WHERE "electionId" = eid;
  UPDATE "VoterParticipation" SET "votedOn" = "votedOn" WHERE "electionId" = eid;
  PERFORM set_config('hamdaneshgah.sealing', 'off', true);
  RETURN moved;
END $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION open_election(eid text) RETURNS boolean AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('hamdaneshgah:election:' || eid));
  UPDATE "Elections" e SET "status" = 'Voting Open', updated_at = now()
   WHERE e.id = eid AND e."status" = 'Final List'
     AND e."votingStart" <= now() AND now() < e."votingEnd"
     AND EXISTS (SELECT 1 FROM "Candidates" c JOIN "CandidatesElections" l ON l."candidatesId" = c.id WHERE l."electionsId" = eid AND c."status" = 'Approved')
     AND EXISTS (SELECT 1 FROM "ElectionsEligibleVoters" v WHERE v."electionsId" = eid);
  RETURN FOUND;
END $$ LANGUAGE plpgsql;
