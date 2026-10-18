// Applies numbered migrations from db/migrations (0001_*.sql, 0002_*.sql, ...) exactly once each,
// recording them in "schemaMigrations". Each migration runs in its own transaction; a failure stops the build.
// Then seeds reference data into empty tables. Runs during the Netlify build when DATABASE_URL is set.
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { neon } from '@neondatabase/serverless';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
if (!process.env.DATABASE_URL) {
  console.warn('DATABASE_URL not set — skipping migrations');
  process.exit(0);
}
const sql = neon(process.env.DATABASE_URL);

await sql.query(`CREATE TABLE IF NOT EXISTS "schemaMigrations" (version text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())`);
const applied = new Map((await sql.query(`SELECT version, checksum FROM "schemaMigrations"`)).map((r) => [r.version, r.checksum]));

const dir = resolve(root, 'db/migrations');
const files = readdirSync(dir).filter((f) => /^\d{4}_.+\.sql$/.test(f)).sort();
for (const file of files) {
  const version = file.slice(0, 4);
  const text = readFileSync(resolve(dir, file), 'utf8');
  const checksum = createHash('sha256').update(text).digest('hex');
  if (applied.has(version)) {
    if (applied.get(version) !== checksum) throw new Error(`Migration ${file} was edited after being applied; add a new migration instead.`);
    continue;
  }
  const statements = text.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n')
    .split(/;\s*\n/).map((s) => s.trim()).filter(Boolean);
  await sql.transaction([
    ...statements.map((s) => sql.query(s)),
    sql.query(`INSERT INTO "schemaMigrations" (version, checksum) VALUES ($1, $2)`, [version, checksum]),
  ]);
  console.log(`migration ${file}: ${statements.length} statements applied`);
}

const seed = JSON.parse(readFileSync(resolve(root, 'db/seed.json'), 'utf8'));
for (const [table, rows] of Object.entries(seed)) {
  const [{ c }] = await sql.query(`SELECT COUNT(*)::int AS c FROM "${table}"`);
  if (c > 0) continue;
  for (const row of rows) {
    const cols = Object.keys(row);
    const vals = cols.map((k) => (Array.isArray(row[k]) ? JSON.stringify(row[k]) : row[k]));
    await sql.query(`INSERT INTO "${table}" (${cols.map((k) => `"${k}"`).join(', ')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')})`, vals);
  }
  console.log(`seeded ${table}: ${rows.length}`);
}
