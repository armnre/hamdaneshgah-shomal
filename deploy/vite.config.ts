import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const r = (p: string) => path.resolve(path.dirname(fileURLToPath(import.meta.url)), p);

export default defineConfig({
  plugins: [react()],
  publicDir: r('.build/public'),
  build: { outDir: 'dist', target: 'es2020', sourcemap: false },
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: [
      { find: 'zitejs/api', replacement: r('.build/api.ts') },
      { find: 'zitejs/auth', replacement: r('src/shims/auth.ts') },
      { find: 'zitejs/upload', replacement: r('src/shims/upload.ts') },
      { find: /^@project\/components\/(.*)$/, replacement: r('.build/components/$1') },
      { find: /^@\/(.*)$/, replacement: r('.build/app/src/$1') },
    ],
  },
  server: { port: 5173 },
});
