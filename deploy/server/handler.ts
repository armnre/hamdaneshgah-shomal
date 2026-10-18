// Netlify Function (v2) entry: routes /api/* to the app's endpoints, auth, and uploads.
import { getStore } from '@netlify/blobs';
import endpoints from './.generated/endpoints';
import { ZiteError, type EndpointConfig } from './backend';
import { getSessionUser, requestMagicLink, verifyMagicLink, sessionCookie, clearCookie, safeRedirect } from './auth';
import { getAccess } from '../.build/app/src/lib/server';

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers } });

const STATUS: Record<string, number> = { BAD_REQUEST: 400, UNAUTHORIZED: 401, FORBIDDEN: 403, NOT_FOUND: 404 };
const fail = (code: string, message: string) => json({ error: { code, userFacingMessage: message } }, STATUS[code] ?? 500);

function originOf(req: Request) {
  return (process.env.SITE_URL || process.env.URL || new URL(req.url).origin).replace(/\/$/, '');
}

// Reject cross-site state-changing requests (cookies are SameSite=Lax; this is defence in depth)
function sameOrigin(req: Request) {
  const o = req.headers.get('origin');
  return !o || o === new URL(req.url).origin || o === originOf(req);
}

async function runEndpoint(req: Request, name: string) {
  const ep = (endpoints as Record<string, EndpointConfig>)[name];
  if (!ep) return fail('NOT_FOUND', 'سرویس یافت نشد.');
  if (!sameOrigin(req) || !(req.headers.get('content-type') ?? '').includes('application/json')) return fail('FORBIDDEN', 'درخواست نامعتبر است.');
  const user = await getSessionUser(req);
  if (ep.authenticated && !user) return fail('UNAUTHORIZED', 'ابتدا وارد شوید.');
  const body = await req.json().catch(() => ({}));
  const raw = body?.input ?? {};
  const parsed = ep.inputSchema?.safeParse(raw);
  try {
    const data = await ep.execute({ input: parsed?.success ? parsed.data : raw, context: { user: user ?? undefined } });
    return json({ data: data ?? null });
  } catch (e) {
    if (e instanceof ZiteError) {
      if (!e.userFacingMessage) console.error(`[${name}]`, e);
      return fail(e.code, e.userFacingMessage ?? 'خطایی رخ داد.');
    }
    console.error(`[${name}]`, e);
    return fail('INTERNAL', 'خطای داخلی سرور. لطفاً دوباره تلاش کنید.');
  }
}

const MAX_UPLOAD = 10 * 1024 * 1024;
const ALLOWED = /^(image\/(png|jpe?g|webp|gif|svg\+xml|avif)|application\/pdf)$/;

async function upload(req: Request) {
  if (!sameOrigin(req)) return fail('FORBIDDEN', 'درخواست نامعتبر است.');
  const user = await getSessionUser(req);
  if (!user) return fail('UNAUTHORIZED', 'ابتدا وارد شوید.');
  if (!(await getAccess(user.id))) return fail('FORBIDDEN', 'شما دسترسی بارگذاری ندارید.');
  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) return fail('BAD_REQUEST', 'فایلی ارسال نشد.');
  if (file.size > MAX_UPLOAD) return fail('BAD_REQUEST', 'حجم فایل بیش از ۱۰ مگابایت است.');
  if (!ALLOWED.test(file.type)) return fail('BAD_REQUEST', 'نوع فایل مجاز نیست.');
  const ext = (file.name.split('.').pop() ?? 'bin').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5);
  const key = `${crypto.randomUUID()}.${ext}`;
  await getStore('uploads').set(key, await file.arrayBuffer(), { metadata: { type: file.type, name: file.name, by: user.id } });
  return json({ url: `/api/file/${key}` });
}

async function serveFile(key: string) {
  if (!/^[a-f0-9-]{36}\.[a-z0-9]{1,5}$/.test(key)) return new Response('Not found', { status: 404 });
  const res = await getStore('uploads').getWithMetadata(key, { type: 'arrayBuffer' });
  if (!res) return new Response('Not found', { status: 404 });
  const type = String(res.metadata?.type ?? 'application/octet-stream');
  return new Response(res.data, {
    headers: {
      'content-type': type,
      'cache-control': 'public, max-age=31536000, immutable',
      'x-content-type-options': 'nosniff',
      ...(type.includes('svg') ? { 'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'" } : {}),
    },
  });
}

export default async (req: Request) => {
  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/api\/?/, '');
  try {
    if (req.method === 'POST' && path.startsWith('rpc/')) return await runEndpoint(req, path.slice(4));
    if (req.method === 'GET' && path === 'auth/me') {
      const user = await getSessionUser(req);
      return json({ user });
    }
    if (req.method === 'POST' && path === 'auth/request') {
      if (!sameOrigin(req)) return fail('FORBIDDEN', 'درخواست نامعتبر است.');
      const { email, redirect } = await req.json().catch(() => ({}));
      const r = await requestMagicLink(String(email ?? ''), String(redirect ?? '/admin'), originOf(req));
      return r.ok ? json({ ok: true }) : json({ error: { userFacingMessage: r.message } }, r.status);
    }
    if (req.method === 'GET' && path === 'auth/verify') {
      const uid = await verifyMagicLink(url.searchParams.get('token') ?? '');
      if (!uid) return Response.redirect(`${originOf(req)}/login?error=expired`, 302);
      return new Response(null, { status: 302, headers: { location: safeRedirect(url.searchParams.get('redirect')), 'set-cookie': await sessionCookie(uid) } });
    }
    if (req.method === 'POST' && path === 'auth/logout') return json({ ok: true }, 200, { 'set-cookie': clearCookie });
    if (req.method === 'POST' && path === 'upload') return await upload(req);
    if (req.method === 'GET' && path.startsWith('file/')) return await serveFile(path.slice(5));
    return fail('NOT_FOUND', 'یافت نشد.');
  } catch (e) {
    console.error('[api]', e);
    return fail('INTERNAL', 'خطای داخلی سرور.');
  }
};

export const config = { path: '/api/*' };
