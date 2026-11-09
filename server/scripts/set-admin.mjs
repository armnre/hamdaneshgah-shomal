// Creates/updates an admin login with a password and makes it Super Admin.
// Usage (in server/):  npm run set-admin -- admin@example.com 'StrongPassword'
import 'dotenv/config';
import pg from 'pg';
import { pbkdf2Sync, randomBytes } from 'node:crypto';

const [email0, password] = process.argv.slice(2);
const email = String(email0 ?? '').trim().toLowerCase();
if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || !password || password.length < 8) {
  console.error("Usage: npm run set-admin -- email@domain 'password (8+ chars)'");
  process.exit(1);
}
const ITER = 210000;
const salt = randomBytes(16);
const hash = pbkdf2Sync(password, salt, ITER, 32, 'sha256');
const stored = `pbkdf2$${ITER}$${salt.toString('base64')}$${hash.toString('base64')}`;

const c = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined });
await c.connect();
await c.query(`ALTER TABLE "ziteUsers" ADD COLUMN IF NOT EXISTS "passwordHash" text`);
const u = await c.query(
  `INSERT INTO "ziteUsers" ("email", "name", "passwordHash") VALUES ($1, split_part($1, '@', 1), $2)
   ON CONFLICT ("email") DO UPDATE SET "passwordHash" = EXCLUDED."passwordHash", updated_at = now() RETURNING id`,
  [email, stored],
);
const id = u.rows[0].id;
await c.query(
  `INSERT INTO "AdminMembers" ("label", "member", "role", "association", "active") VALUES ($1, $2::jsonb, 'Super Admin', '[]', true)
   ON CONFLICT ("member") DO UPDATE SET "role" = 'Super Admin', "active" = true, updated_at = now()`,
  [email, JSON.stringify([id])],
);
await c.end();
console.log(`✓ ${email} is Super Admin and can log in with the password.`);
