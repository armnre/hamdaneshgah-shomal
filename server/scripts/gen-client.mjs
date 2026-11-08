// Regenerates the endpoint list at the bottom of the frontend client (apps/*/src/lib/api.ts)
// from server/src/api. Run after adding/removing an endpoint.
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repo = resolve(root, '..');
const app = readdirSync(resolve(repo, 'apps')).map((d) => resolve(repo, 'apps', d, 'src/lib/api.ts')).find(existsSync);
if (!app) throw new Error('apps/*/src/lib/api.ts not found');
const names = readdirSync(resolve(root, 'src/api')).filter((f) => f.endsWith('.ts')).map((f) => f.slice(0, -3)).sort();
const head = readFileSync(app, 'utf8').split('\nexport const apiUrl')[0];
const cap = (n) => n[0].toUpperCase() + n.slice(1);
writeFileSync(app, `${head}\nexport const apiUrl = (path: string) => \`\${API_BASE}\${path}\`;\n\n` +
  names.map((n) => `export const ${n} = (input?: any): Promise<any> => call('${n}', input);\nexport type ${cap(n)}InputType = any;\nexport type ${cap(n)}OutputType = any;`).join('\n') + '\n');
console.log(`wrote ${names.length} endpoints to ${app}`);
