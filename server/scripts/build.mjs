// Bundles the server into dist/server.mjs. Imports of the Zite SDK (`zitejs/db`, `zitejs/backend`)
// in endpoint code resolve to the local PostgreSQL-backed implementations.
import { build } from 'esbuild';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
await build({
  entryPoints: [resolve(root, 'src/index.ts')],
  outfile: resolve(root, 'dist/server.mjs'),
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  packages: 'external',
  alias: {
    'zitejs/db': resolve(root, 'src/platform/db.ts'),
    'zitejs/backend': resolve(root, 'src/platform/backend.ts'),
  },
  logLevel: 'info',
});
