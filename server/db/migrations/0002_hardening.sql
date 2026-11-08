-- 0002 hardening: rate limits, unique slugs, CHECK constraints on role/status, query indexes.
-- CHECKs are added NOT VALID then validated so a bad legacy row fails loudly here instead of silently.

CREATE TABLE IF NOT EXISTS "rateLimits" (
  "bucket" text NOT NULL,
  "windowStart" timestamptz NOT NULL,
  "count" integer NOT NULL DEFAULT 0,
  PRIMARY KEY ("bucket", "windowStart")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Faculties_slug_uq" ON "Faculties" ("slug") WHERE "slug" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "Associations_slug_uq" ON "Associations" ("slug") WHERE "slug" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "Categories_slug_uq" ON "Categories" ("slug") WHERE "slug" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "News_slug_uq" ON "News" ("slug") WHERE "slug" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "Events_slug_uq" ON "Events" ("slug") WHERE "slug" IS NOT NULL;

ALTER TABLE "AdminMembers" ADD CONSTRAINT "AdminMembers_role_ck" CHECK ("role" IN ('Super Admin', 'Content Editor', 'Association Manager')) NOT VALID;
ALTER TABLE "AdminMembers" VALIDATE CONSTRAINT "AdminMembers_role_ck";
ALTER TABLE "News" ADD CONSTRAINT "News_status_ck" CHECK ("status" IN ('Draft', 'Published', 'Archived')) NOT VALID;
ALTER TABLE "News" VALIDATE CONSTRAINT "News_status_ck";
ALTER TABLE "Events" ADD CONSTRAINT "Events_status_ck" CHECK ("status" IN ('Draft', 'Published', 'Archived')) NOT VALID;
ALTER TABLE "Events" VALIDATE CONSTRAINT "Events_status_ck";
ALTER TABLE "Events" ADD CONSTRAINT "Events_kind_ck" CHECK ("kind" IN ('Event', 'Conference', 'Course', 'Call')) NOT VALID;
ALTER TABLE "Events" VALIDATE CONSTRAINT "Events_kind_ck";
ALTER TABLE "ContactMessages" ADD CONSTRAINT "ContactMessages_status_ck" CHECK ("status" IN ('New', 'Read', 'Closed')) NOT VALID;
ALTER TABLE "ContactMessages" VALIDATE CONSTRAINT "ContactMessages_status_ck";

CREATE INDEX IF NOT EXISTS "News_status_publish_idx" ON "News" ("status", "publishAt" DESC);
CREATE INDEX IF NOT EXISTS "Events_status_start_idx" ON "Events" ("status", "startAt");
CREATE INDEX IF NOT EXISTS "ContactMessages_received_idx" ON "ContactMessages" ("receivedAt");
CREATE INDEX IF NOT EXISTS "ContactMessages_email_idx" ON "ContactMessages" ("senderEmail", "receivedAt");
CREATE INDEX IF NOT EXISTS "AuditLogs_logged_idx" ON "AuditLogs" ("loggedAt" DESC);
CREATE INDEX IF NOT EXISTS "News_association_gin" ON "News" USING gin ("association");
CREATE INDEX IF NOT EXISTS "Events_association_gin" ON "Events" USING gin ("association");
CREATE INDEX IF NOT EXISTS "Majors_faculty_gin" ON "Majors" USING gin ("faculty");
