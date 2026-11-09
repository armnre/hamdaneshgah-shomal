-- Email + password login for admins (PBKDF2-SHA256 hash; set with `npm run set-admin`).
ALTER TABLE "ziteUsers" ADD COLUMN IF NOT EXISTS "passwordHash" text;
