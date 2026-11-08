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
      { find: /^@project\/components\/(.*)$/, replacement: r('.build/components/$1') },
      { find: /^@\/(.*)$/, replacement: r('.build/app/src/$1') },
    ],
  },
  // `npm run dev`: proxy the API to the Fastify server (cd ../server && npm run dev)
  server: { port: 5173, proxy: { '/api': 'http://localhost:3000' } },
});
