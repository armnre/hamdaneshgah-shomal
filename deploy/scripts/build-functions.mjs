// Bundles the API into a single Netlify Function, mapping the Zite SDK imports to the Neon-backed shims.
import { build } from 'esbuild';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

await build({
  entryPoints: [resolve(root, 'server/handler.ts')],
  outfile: resolve(root, 'netlify/functions/api.mjs'),
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  alias: {
    'zitejs/db': resolve(root, 'server/db.ts'),
    'zitejs/backend': resolve(root, 'server/backend.ts'),
  },
  banner: { js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);" },
  logLevel: 'info',
});
