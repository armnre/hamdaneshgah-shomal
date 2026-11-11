// Decrypts server/data/students.xlsx.enc (AES-256-GCM, PBKDF2-SHA256 100k) with STUDENTS_KEY.
// Usage: STUDENTS_KEY=... node scripts/decrypt-students.mjs data/students.xlsx.enc /tmp/students.xlsx
import { readFileSync, writeFileSync } from 'node:fs';
import { pbkdf2Sync, createDecipheriv } from 'node:crypto';
const [src, dst] = process.argv.slice(2);
const key = process.env.STUDENTS_KEY;
if (!key) { console.error('STUDENTS_KEY is not set'); process.exit(1); }
const b = readFileSync(src);
const d = createDecipheriv('aes-256-gcm', pbkdf2Sync(key, b.subarray(0, 16), 100000, 32, 'sha256'), b.subarray(16, 28));
d.setAuthTag(b.subarray(b.length - 16));
writeFileSync(dst, Buffer.concat([d.update(b.subarray(28, b.length - 16)), d.final()]), { mode: 0o600 });
console.log('decrypted');
