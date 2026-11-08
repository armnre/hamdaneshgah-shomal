// Applies db/migrations/NNNN_*.sql exactly once each (tracked in "schemaMigrations"), one transaction
// per file, then seeds reference data into empty tables. Usage: npm run migrate (reads DATABASE_URL).
import 'dotenv/config';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import pg from 'pg';
import { splitSql } from '../db/splitSql.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
if (!process.env.DATABASE_URL) { console.error('DATABASE_URL is not set'); process.exit(1); }
const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
});
await client.connect();
try {
  await client.query(`CREATE TABLE IF NOT EXISTS "schemaMigrations" (version text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())`);
  const applied = new Map((await client.query(`SELECT version, checksum FROM "schemaMigrations"`)).rows.map((r) => [r.version, r.checksum]));

  const dir = resolve(root, 'db/migrations');
  for (const file of readdirSync(dir).filter((f) => /^\d{4}_.+\.sql$/.test(f)).sort()) {
    const version = file.slice(0, 4);
    const text = readFileSync(resolve(dir, file), 'utf8');
    const checksum = createHash('sha256').update(text).digest('hex');
    if (applied.has(version)) {
      if (applied.get(version) !== checksum) throw new Error(`Migration ${file} was edited after being applied; add a new migration instead.`);
      continue;
    }
    const statements = splitSql(text); // $$-aware: plpgsql bodies stay whole
    await client.query('BEGIN');
    try {
      for (const s of statements) await client.query(s);
      await client.query(`INSERT INTO "schemaMigrations" (version, checksum) VALUES ($1, $2)`, [version, checksum]);
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw new Error(`${file}: ${e.message}`);
    }
    console.log(`migration ${file}: ${statements.length} statements applied`);
  }

  const seed = JSON.parse(readFileSync(resolve(root, 'db/seed.json'), 'utf8'));
  for (const [table, rows] of Object.entries(seed)) {
    const { rows: [{ c }] } = await client.query(`SELECT COUNT(*)::int AS c FROM "${table}"`);
    if (c > 0) continue;
    for (const row of rows) {
      const cols = Object.keys(row);
      const vals = cols.map((k) => (Array.isArray(row[k]) ? JSON.stringify(row[k]) : row[k]));
      await client.query(`INSERT INTO "${table}" (${cols.map((k) => `"${k}"`).join(', ')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')})`, vals);
    }
    console.log(`seeded ${table}: ${rows.length}`);
  }
  console.log('database is up to date');
} finally {
  await client.end();
}
