-- Neon / Postgres schema for the Netlify deployment of «پردیس شمال».
-- Table and column names mirror the Zite SDK names so the shared endpoint SQL runs unchanged.
-- Linked-record fields are JSONB arrays of ids on the owning table; the link "tables" the
-- SQL joins through are views that unnest them. Idempotent: safe to run on every deploy.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS "ziteUsers" (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "email" text NOT NULL UNIQUE,
  "name" text NOT NULL DEFAULT '',
  "firstName" text,
  "lastName" text,
  "image" text,
  "emailVerified" boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "authTokens" (
  "tokenHash" text PRIMARY KEY,
  "email" text NOT NULL,
  "expiresAt" timestamptz NOT NULL,
  "usedAt" timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "authTokens_email_idx" ON "authTokens" ("email", created_at);

CREATE TABLE IF NOT EXISTS "Faculties" (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "name" text, "slug" text, "description" text, "imageUrl" text,
  "sortOrder" double precision, "active" boolean DEFAULT true, "verified" boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "Majors" (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "name" text, "faculty" jsonb NOT NULL DEFAULT '[]', "description" text,
  "active" boolean DEFAULT true, "verified" boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "Associations" (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "name" text, "slug" text, "shortDescription" text, "about" text, "logoUrl" text, "coverUrl" text,
  "faculty" jsonb NOT NULL DEFAULT '[]', "major" jsonb NOT NULL DEFAULT '[]',
  "contactEmail" text, "telegramUrl" text, "active" boolean DEFAULT true, "featured" boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "Categories" (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "name" text, "slug" text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "News" (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "title" text, "slug" text, "excerpt" text, "body" text, "coverUrl" text,
  "category" jsonb NOT NULL DEFAULT '[]', "association" jsonb NOT NULL DEFAULT '[]',
  "status" text DEFAULT 'Draft', "publishAt" timestamptz, "featured" boolean DEFAULT false, "isAnnouncement" boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "Events" (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "title" text, "slug" text, "summary" text, "body" text, "coverUrl" text, "kind" text DEFAULT 'Event',
  "startAt" timestamptz, "endAt" timestamptz, "location" text, "registrationUrl" text,
  "association" jsonb NOT NULL DEFAULT '[]', "status" text DEFAULT 'Draft', "featured" boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "MediaAssets" (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "title" text, "fileUrl" text, "altText" text, "source" text, "license" text,
  "uploadedAt" timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "AdminMembers" (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "label" text, "member" jsonb NOT NULL DEFAULT '[]', "role" text,
  "association" jsonb NOT NULL DEFAULT '[]', "active" boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
-- One membership row per user (makes the bootstrap upsert race-safe)
CREATE UNIQUE INDEX IF NOT EXISTS "AdminMembers_member_uq" ON "AdminMembers" ("member");

CREATE TABLE IF NOT EXISTS "AuditLogs" (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "action" text, "entity" text, "entityId" text, "details" text,
  "actor" jsonb NOT NULL DEFAULT '[]', "actorEmail" text,
  "loggedAt" timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "SiteSettings" (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "key" text UNIQUE, "value" text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "ContactMessages" (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "subject" text, "senderName" text, "senderEmail" text, "message" text, "status" text DEFAULT 'New',
  "receivedAt" timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

-- Link views (alphabetical PascalCase names, camelCase "<table>Id" columns — Zite convention)
CREATE OR REPLACE VIEW "FacultiesMajors" AS
  SELECT m.id AS "majorsId", f.value AS "facultiesId" FROM "Majors" m, jsonb_array_elements_text(m."faculty") f;
CREATE OR REPLACE VIEW "AssociationsFaculties" AS
  SELECT a.id AS "associationsId", f.value AS "facultiesId" FROM "Associations" a, jsonb_array_elements_text(a."faculty") f;
CREATE OR REPLACE VIEW "AssociationsMajors" AS
  SELECT a.id AS "associationsId", m.value AS "majorsId" FROM "Associations" a, jsonb_array_elements_text(a."major") m;
CREATE OR REPLACE VIEW "CategoriesNews" AS
  SELECT n.id AS "newsId", c.value AS "categoriesId" FROM "News" n, jsonb_array_elements_text(n."category") c;
CREATE OR REPLACE VIEW "AssociationsNews" AS
  SELECT n.id AS "newsId", a.value AS "associationsId" FROM "News" n, jsonb_array_elements_text(n."association") a;
CREATE OR REPLACE VIEW "AssociationsEvents" AS
  SELECT e.id AS "eventsId", a.value AS "associationsId" FROM "Events" e, jsonb_array_elements_text(e."association") a;
CREATE OR REPLACE VIEW "AdminMembersAssociations" AS
  SELECT m.id AS "adminMembersId", a.value AS "associationsId" FROM "AdminMembers" m, jsonb_array_elements_text(m."association") a;
