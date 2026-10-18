// Copies the shared app source (apps/hamdaneshgah-shomal + packages/components) into .build/ and generates
// the `zitejs/api` frontend shim and the server endpoint registry from apps/hamdaneshgah-shomal/src/api/*.ts.
import { cpSync, rmSync, mkdirSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repo = resolve(root, '..');
const build = resolve(root, '.build');

rmSync(build, { recursive: true, force: true });
mkdirSync(build, { recursive: true });
// GitHub repo keeps the app at apps/app; the Zite workspace at apps/hamdaneshgah-shomal.
const APP = ['apps/app', 'apps/hamdaneshgah-shomal'].map((d) => resolve(repo, d)).find((d) => existsSync(resolve(d, 'src/App.tsx')));
if (!APP) throw new Error('app source not found');
cpSync(resolve(APP, 'src'), resolve(build, 'app/src'), { recursive: true });
cpSync(resolve(APP, 'public'), resolve(build, 'public'), { recursive: true });
cpSync(resolve(repo, 'packages/components'), resolve(build, 'components'), { recursive: true });

const names = readdirSync(resolve(build, 'app/src/api'))
  .filter((f) => f.endsWith('.ts') && !f.endsWith('.d.ts'))
  .map((f) => f.slice(0, -3))
  .sort();

writeFileSync(
  resolve(build, 'api.ts'),
  `// generated — do not edit\nimport { call } from '../src/shims/rpc';\n` +
    names.map((n) => `export const ${n} = (input?: unknown): Promise<any> => call('${n}', input);`).join('\n') + '\n',
);

const gen = resolve(root, 'server/.generated');
mkdirSync(gen, { recursive: true });
writeFileSync(
  resolve(gen, 'endpoints.ts'),
  `// generated — do not edit\n` +
    names.map((n, i) => `import e${i} from '../../.build/app/src/api/${n}';`).join('\n') +
    `\nexport default {\n${names.map((n, i) => `  ${n}: e${i},`).join('\n')}\n};\n`,
);

if (!existsSync(resolve(build, 'public/shomal/emblem.webp'))) throw new Error('university assets missing');
console.log(`prepared ${names.length} endpoints`);
