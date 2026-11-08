// Copies the frontend source from the Zite app (apps/<dir>/src + public) and the shared
// components (packages/components) into .build/, so Vite builds them with web/node_modules.
import { cpSync, rmSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repo = resolve(root, '..');
const build = resolve(root, '.build');

const appDirs = readdirSync(resolve(repo, 'apps')).map((d) => resolve(repo, 'apps', d)).filter((d) => existsSync(resolve(d, 'src/App.tsx')));
const APP = process.env.APP_DIR ? resolve(repo, process.env.APP_DIR) : appDirs[0];
if (!APP) throw new Error('Frontend source not found (apps/*/src/App.tsx)');

rmSync(build, { recursive: true, force: true });
mkdirSync(build, { recursive: true });
cpSync(resolve(APP, 'src'), resolve(build, 'app/src'), { recursive: true, filter: (p) => !p.includes('/src/api') && !p.endsWith('/src/main.tsx') });
cpSync(resolve(APP, 'public'), resolve(build, 'public'), { recursive: true });
cpSync(resolve(repo, 'packages/components'), resolve(build, 'components'), { recursive: true, filter: (p) => !p.includes('node_modules') });
if (!existsSync(resolve(build, 'public/shomal/emblem.webp'))) throw new Error('university assets missing');
console.log(`prepared frontend from ${APP}`);
