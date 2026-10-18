import { useState } from 'react';
import { Loader2, Mail, ArrowRight, ShieldCheck } from 'lucide-react';

const params = new URLSearchParams(window.location.search);
const redirect = params.get('redirect') || '/admin';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState(params.get('error') === 'expired' ? 'پیوند ورود منقضی یا قبلاً استفاده شده است. دوباره درخواست دهید.' : '');
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setState('sending'); setError('');
    try {
      const res = await fetch('/api/auth/request', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, redirect }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error?.userFacingMessage ?? 'ارسال پیوند ممکن نشد.');
      setState('sent');
    } catch (err) {
      setError((err as Error).message); setState('idle');
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2" dir="rtl">
      <div className="relative hidden overflow-hidden bg-primary lg:block">
        <img src="/shomal/banner-1.webp" alt="پردیس دانشگاه شمال" className="absolute inset-0 h-full w-full object-cover opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/70 to-primary/30" />
        <div className="relative flex h-full flex-col justify-end p-12 text-primary-foreground">
          <img src="/shomal/emblem.webp" alt="" className="mb-6 h-16 w-16 rounded-2xl bg-white p-1.5" />
          <h2 className="text-3xl font-black">پردیس شمال</h2>
          <p className="mt-3 max-w-md leading-8 text-primary-foreground/80">پنل مدیریت محتوای انجمن‌ها، اخبار و رویدادهای دانشجویی دانشگاه شمال.</p>
        </div>
      </div>
      <div className="flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-sm">
          <a href="/" className="mb-10 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowRight className="h-4 w-4" />بازگشت به سایت</a>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-primary"><ShieldCheck className="h-3.5 w-3.5" />ورود مدیران</div>
          <h1 className="text-2xl font-black">ورود به پنل مدیریت</h1>
          {state === 'sent' ? (
            <div className="mt-6 rounded-2xl border bg-card p-6 text-center">
              <Mail className="mx-auto h-8 w-8 text-primary" />
              <p className="mt-3 font-bold">ایمیل خود را بررسی کنید</p>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">پیوند ورود به <span dir="ltr" className="font-medium text-foreground">{email}</span> ارسال شد و تا ۱۵ دقیقه معتبر است.</p>
              <button className="mt-4 text-sm text-primary underline" onClick={() => setState('idle')}>تغییر ایمیل</button>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-6 grid gap-4" noValidate>
              <p className="text-sm leading-7 text-muted-foreground">ایمیل خود را وارد کنید تا پیوند ورود یک‌بارمصرف برایتان ارسال شود.</p>
              <label className="grid gap-2 text-sm font-medium">ایمیل
                <input type="email" dir="ltr" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com"
                  className="h-11 rounded-lg border border-input bg-background px-3 text-left outline-none focus:ring-2 focus:ring-ring" aria-invalid={!!email && !valid} />
              </label>
              {email && !valid && <p className="text-xs text-destructive">قالب ایمیل درست نیست.</p>}
              {error && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
              <button type="submit" disabled={!valid || state === 'sending'}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50">
                {state === 'sending' && <Loader2 className="h-4 w-4 animate-spin" />}ارسال پیوند ورود
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
