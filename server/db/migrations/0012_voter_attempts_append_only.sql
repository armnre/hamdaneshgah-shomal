-- The attempt limiter is append-only: every verify attempt inserts its own row and then
-- counts the rows in its window. A UNIQUE (bucket, windowStart) made every second attempt
-- from the same IP / student number in a 15-minute window fail with a server error
-- (shared university Wi-Fi = one IP). Drop it and index the count instead.
ALTER TABLE "VoterAttempts" DROP CONSTRAINT IF EXISTS "VoterAttempts_bucket_windowStart_key";
CREATE INDEX IF NOT EXISTS "VoterAttempts_bucket_window_idx" ON "VoterAttempts" ("bucket", "windowStart");
