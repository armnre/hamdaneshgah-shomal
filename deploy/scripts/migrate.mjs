// Applies db/schema.sql (idempotent) and seeds reference data into empty tables.
// Runs automatically during the Netlify build when DATABASE_URL is set.
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { neon } from '@neondatabase/serverless';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
if (!process.env.DATABASE_URL) {
  console.warn('DATABASE_URL not set — skipping migrations');
  process.exit(0);
}
const sql = neon(process.env.DATABASE_URL);

const statements = readFileSync(resolve(root, 'db/schema.sql'), 'utf8')
  .split('\n').filter((l) => !l.trim().startsWith('--')).join('\n')
  .split(/;\s*\n/).map((s) => s.trim()).filter(Boolean);
for (const s of statements) await sql.query(s);
console.log(`schema: ${statements.length} statements applied`);

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
