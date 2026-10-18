// Splits a migration file into statements on top-level semicolons, keeping $$ … $$ bodies,
// quoted strings and comments intact. Used by scripts/migrate.mjs (Neon, one statement per
// query inside a transaction) and by db/test-migrations.mjs, so the test runs the exact split.
export function splitSql(text) {
  const out = [];
  let cur = '';
  let i = 0;
  let dollar = null; // active $tag$
  let quote = null; // ' or "
  while (i < text.length) {
    const c = text[i];
    if (dollar) {
      if (text.startsWith(dollar, i)) { cur += dollar; i += dollar.length; dollar = null; continue; }
      cur += c; i++; continue;
    }
    if (quote) {
      cur += c; i++;
      if (c === quote) { if (text[i] === quote) { cur += text[i]; i++; } else quote = null; }
      continue;
    }
    if (c === '-' && text[i + 1] === '-') { const nl = text.indexOf('\n', i); i = nl === -1 ? text.length : nl; continue; }
    if (c === "'" || c === '"') { quote = c; cur += c; i++; continue; }
    if (c === '$') {
      const m = /^\$[A-Za-z_]*\$/.exec(text.slice(i));
      if (m) { dollar = m[0]; cur += dollar; i += dollar.length; continue; }
    }
    if (c === ';') { if (cur.trim()) out.push(cur.trim()); cur = ''; i++; continue; }
    cur += c; i++;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}
