// Fastify (Node 22) entry: serves /api/* through the web-standard router, the built React
// frontend (WEB_DIST) with SPA fallback, and runs the election clock every minute.
import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { handleApi } from './platform/http';
import { closeDb, query } from './platform/db';
import { syncAllDue } from './lib/electionClock';

const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? '0.0.0.0';
const WEB_DIST = resolve(process.env.WEB_DIST ?? '../web/dist');

const SECURITY_HEADERS: Record<string, string> = {
  'x-frame-options': 'DENY',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'permissions-policy': 'camera=(), microphone=(), geolocation=()',
  'cross-origin-opener-policy': 'same-origin',
  'content-security-policy':
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net; font-src 'self' data: https://fonts.gstatic.com https://cdn.jsdelivr.net; img-src 'self' data: blob: https:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'",
};

const app = Fastify({
  logger: { level: process.env.LOG_LEVEL ?? 'info' },
  trustProxy: true, // behind Plesk's nginx/Apache
  bodyLimit: (Number(process.env.MAX_UPLOAD_MB ?? 10) + 1) * 1024 * 1024,
});

// Keep raw bodies: the web-standard router parses JSON / multipart / form itself.
app.removeAllContentTypeParsers();
app.addContentTypeParser('*', { parseAs: 'buffer' }, (_req, body, done) => done(null, body));

app.addHook('onSend', async (req, reply) => {
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) if (!reply.hasHeader(k)) reply.header(k, v);
  if (req.protocol === 'https') reply.header('strict-transport-security', 'max-age=31536000; includeSubDomains');
});

app.get('/healthz', async () => {
  await query('SELECT 1');
  return { ok: true };
});

app.all('/api/*', async (req, reply) => {
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    if (v === undefined) continue;
    headers.set(k, Array.isArray(v) ? v.join(', ') : String(v));
  }
  headers.set('x-client-ip', req.ip);
  const url = `${req.protocol}://${req.host}${req.url}`;
  const hasBody = req.method !== 'GET' && req.method !== 'HEAD' && Buffer.isBuffer(req.body);
  const res = await handleApi(new Request(url, { method: req.method, headers, body: hasBody ? (req.body as Buffer) : undefined }));
  reply.code(res.status);
  res.headers.forEach((v, k) => reply.header(k, v));
  return reply.send(Buffer.from(await res.arrayBuffer()));
});

if (existsSync(WEB_DIST)) {
  await app.register(fastifyStatic, {
    root: WEB_DIST,
    wildcard: false,
    setHeaders: (res, path) => {
      if (path.includes('/assets/')) res.setHeader('cache-control', 'public, max-age=31536000, immutable');
      else if (path.includes('/shomal/')) res.setHeader('cache-control', 'public, max-age=604800');
    },
  });
  app.setNotFoundHandler((req, reply) => {
    if (req.method !== 'GET' || req.url.startsWith('/api/')) return reply.code(404).send({ error: { code: 'NOT_FOUND' } });
    return reply.header('cache-control', 'no-cache').sendFile('index.html');
  });
} else {
  app.log.warn(`WEB_DIST ${WEB_DIST} not found — serving API only`);
}

// Election clock: opens/closes elections on schedule (SQL is locked + idempotent, migration 0006).
const clock = setInterval(async () => {
  try {
    const acted = await syncAllDue();
    if (acted) app.log.info(`[clock] ${acted} election(s) moved`);
  } catch (e) {
    app.log.error(`[clock] ${e instanceof Error ? e.message : 'failed'}`);
  }
}, 60_000);

for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, async () => {
    clearInterval(clock);
    await app.close();
    await closeDb();
    process.exit(0);
  });
}

await app.listen({ port: PORT, host: HOST });
