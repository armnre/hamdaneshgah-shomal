// Atomic vote statements, shared by the Netlify server (server/db.ts) and the PGlite test
// (db/test-migrations.mjs) so the tested SQL is the deployed SQL.
// Run ALL of them inside ONE transaction. A second vote by the same voter violates
// UNIQUE(electionId, voterId) and rolls the whole transaction back, so no orphan ballot can exist.
// p = { sessionHash, electionId, code, ballotUuid, candidateIds, votedOn }
export function castVoteStatements(p) {
  return [
    // 1) participation — only from a live session of this election while voting is open
    [`INSERT INTO "VoterParticipation" ("label", "election", "voter", "votedOn")
      SELECT $3, s."election", s."voter", $4::date
      FROM "VoterSessions" s JOIN "Elections" e ON e.id = s."electionId"
      WHERE s."tokenHash" = $1 AND s."electionId" = $2 AND s."expiresAt" > now()
        AND e."status" = 'Voting Open' AND now() BETWEEN e."votingStart" AND e."votingEnd"`,
      [p.sessionHash, p.electionId, p.code, p.votedOn]],
    // 2) ballot — only if step 1 inserted the participation row in this same transaction
    [`INSERT INTO "Ballots" ("receipt", "election", "candidateIds")
      SELECT $1, jsonb_build_array($2::text), $3
      WHERE EXISTS (SELECT 1 FROM "VoterParticipation" WHERE "label" = $4)`,
      [p.ballotUuid, p.electionId, p.candidateIds, p.code]],
    // 3) close the session immediately
    [`DELETE FROM "VoterSessions" WHERE "tokenHash" = $1`, [p.sessionHash]],
    // 4) outcome
    [`SELECT EXISTS (SELECT 1 FROM "VoterParticipation" WHERE "label" = $1) AS ok`, [p.code]],
  ];
}
