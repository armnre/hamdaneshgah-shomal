// Netlify Function (v2) entry: routes /api/* to the app's endpoints, auth, and uploads.
import { getStore } from '@netlify/blobs';
import endpoints from './.generated/endpoints';
import { ZiteError, type EndpointConfig } from './backend';
import { getSessionUser, requestMagicLink, verifyMagicLink, sessionCookie, clearCookie, safeRedirect, rateLimit, logLogin } from './auth';
import { getAccess } from '../.build/app/src/lib/server';

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers } });

const STATUS: Record<string, number> = { TOO_MANY: 429, BAD_REQUEST: 400, UNAUTHORIZED: 401, FORBIDDEN: 403, NOT_FOUND: 404 };
const fail = (code: string, message: string) => json({ error: { code, userFacingMessage: message } }, STATUS[code] ?? 500);

const clientIp = (req: Request) => req.headers.get('x-nf-client-connection-ip') ?? req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
// Public (unauthenticated) endpoints that write data get a per-IP limit
const PUBLIC_WRITE: Record<string, number> = { submitContact: 10, verifyVoter: 60, castVote: 60 };

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
function confirmPage(token: string, redirect: string) {
  const html = `<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>تأیید ورود — هم‌دانشگاهی</title>
<style>body{font-family:Vazirmatn,Tahoma,sans-serif;background:#f4f1e8;color:#14271f;display:grid;place-items:center;min-height:100vh;margin:0}main{background:#fff;padding:32px;border-radius:16px;max-width:380px;text-align:center;box-shadow:0 10px 30px #0001}button{background:#1a4d3e;color:#fff;border:0;padding:12px 28px;border-radius:10px;font:inherit;font-size:16px;cursor:pointer}button:focus-visible{outline:3px solid #c9a227;outline-offset:2px}</style></head>
<body><main><h1 style="font-size:20px">ورود به پنل هم‌دانشگاهی</h1><p>برای تکمیل ورود، دکمه زیر را بزنید.</p>
<form method="post" action="/api/auth/verify"><input type="hidden" name="token" value="${esc(token)}"><input type="hidden" name="redirect" value="${esc(redirect)}"><button type="submit">تأیید و ورود</button></form></main></body></html>`;
  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'referrer-policy': 'no-referrer' } });
}

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
  if (PUBLIC_WRITE[name] && !(await rateLimit(`ip:${clientIp(req)}:${name}`, PUBLIC_WRITE[name], 3600))) return fail('TOO_MANY', 'تعداد درخواست‌ها زیاد است؛ کمی بعد تلاش کنید.');
  const body = await req.json().catch(() => ({}));
  const raw = body?.input ?? {};
  const parsed = ep.inputSchema?.safeParse(raw);
  // Never pass unvalidated input to an endpoint
  if (parsed && !parsed.success) return fail('BAD_REQUEST', 'اطلاعات ارسالی معتبر نیست.');
  try {
    const data = await ep.execute({ input: parsed ? parsed.data : raw, context: { user: user ?? undefined, ip: clientIp(req) } });
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

// Netlify synchronous Functions reject request bodies above 6 MB; multipart overhead needs headroom.
const MAX_UPLOAD = 5 * 1024 * 1024;
const ALLOWED = /^(image\/(png|jpe?g|webp|gif|svg\+xml|avif)|application\/pdf)$/;

async function upload(req: Request) {
  if (!sameOrigin(req)) return fail('FORBIDDEN', 'درخواست نامعتبر است.');
  const user = await getSessionUser(req);
  if (!user) return fail('UNAUTHORIZED', 'ابتدا وارد شوید.');
  if (!(await getAccess(user.id))) return fail('FORBIDDEN', 'شما دسترسی بارگذاری ندارید.');
  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) return fail('BAD_REQUEST', 'فایلی ارسال نشد.');
  if (file.size > MAX_UPLOAD) return fail('BAD_REQUEST', 'حجم فایل بیش از ۵ مگابایت است.');
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
  const path = url.pathname.replace(/^\/(?:\.netlify\/functions\/)?api\/?/, '');
  try {
    if (req.method === 'POST' && path.startsWith('rpc/')) return await runEndpoint(req, path.slice(4));
    if (req.method === 'GET' && path === 'auth/me') {
      const user = await getSessionUser(req);
      return json({ user });
    }
    if (req.method === 'POST' && path === 'auth/request') {
      if (!sameOrigin(req)) return fail('FORBIDDEN', 'درخواست نامعتبر است.');
      if (!(await rateLimit(`login-ip:${clientIp(req)}`, 10, 3600))) return fail('TOO_MANY', 'تعداد درخواست‌ها زیاد است؛ یک ساعت دیگر تلاش کنید.');
      const { email, redirect } = await req.json().catch(() => ({}));
      const r = await requestMagicLink(String(email ?? ''), String(redirect ?? '/admin'), originOf(req));
      return r.ok ? json({ ok: true }) : json({ error: { userFacingMessage: r.message } }, r.status);
    }
    // GET only shows a confirmation page, so mail scanners that prefetch links cannot burn the token
    if (req.method === 'GET' && (path === 'auth/confirm' || path === 'auth/verify')) {
      return confirmPage(url.searchParams.get('token') ?? '', safeRedirect(url.searchParams.get('redirect')));
    }
    if (req.method === 'POST' && path === 'auth/verify') {
      if (!sameOrigin(req)) return fail('FORBIDDEN', 'درخواست نامعتبر است.');
      if (!(await rateLimit(`verify-ip:${clientIp(req)}`, 30, 3600))) return fail('TOO_MANY', 'تعداد تلاش‌ها زیاد است.');
      const form = await req.formData().catch(() => null);
      const res = await verifyMagicLink(String(form?.get('token') ?? ''));
      if (!res) {
        await logLogin('login_failed', null, null);
        return Response.redirect(`${originOf(req)}/admin?error=expired`, 303);
      }
      await logLogin('login_success', res.email, res.id);
      return new Response(null, { status: 303, headers: { location: safeRedirect(String(form?.get('redirect') ?? '')), 'set-cookie': await sessionCookie(res.id) } });
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
