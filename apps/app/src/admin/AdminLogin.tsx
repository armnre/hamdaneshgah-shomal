import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Mail, ArrowRight, ShieldCheck } from 'lucide-react';
import { loginWithRedirect } from 'zitejs/auth';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { Label } from '@project/components/ui/label';
import { LogoMark } from '../components/site/Logo';

// Standalone (Netlify) build sends the magic link itself; on Zite the platform handles it.
const STANDALONE = import.meta.env.VITE_STANDALONE_AUTH === '1';
const expired = new URLSearchParams(window.location.search).get('error') === 'expired';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState(expired ? 'پیوند ورود منقضی یا قبلاً استفاده شده است. دوباره درخواست دهید.' : '');
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    if (!STANDALONE) { loginWithRedirect({ redirectUrl: '/admin' }); return; }
    setState('sending'); setError('');
    try {
      const res = await fetch('/api/auth/request', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: email.trim(), redirect: '/admin' }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error?.userFacingMessage ?? 'ارسال پیوند ممکن نشد.');
      setState('sent');
    } catch (err) {
      setError((err as Error).message); setState('idle');
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-primary lg:block">
        <img src="/shomal/life-3.webp" alt="دانشجویان دانشگاه شمال" className="absolute inset-0 h-full w-full object-cover opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/70 to-primary/20" />
        <div className="relative flex h-full flex-col justify-end p-12 text-primary-foreground">
          <LogoMark className="mb-6 h-16 w-16" />
          <h2 className="text-3xl font-black">سامانه مدیریت هم‌دانشگاهی</h2>
          <p className="mt-3 max-w-md leading-8 text-primary-foreground/80">مدیریت محتوای انجمن‌ها، اخبار، رویدادها و پیام‌های دانشجویی دانشگاه شمال.</p>
        </div>
      </div>
      <div className="flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-sm">
          <Link to="/" className="mb-10 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowRight className="h-4 w-4" />بازگشت به سایت</Link>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-primary"><ShieldCheck className="h-3.5 w-3.5" />ورود مدیران سامانه</div>
          <h1 className="text-2xl font-black">ورود به پنل مدیریت</h1>
          {state === 'sent' ? (
            <div className="mt-6 rounded-2xl border bg-card p-6 text-center">
              <Mail className="mx-auto h-8 w-8 text-primary" />
              <p className="mt-3 font-bold">ایمیل خود را بررسی کنید</p>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">پیوند ورود به <span dir="ltr" className="font-medium text-foreground">{email}</span> ارسال شد و تا ۱۵ دقیقه معتبر است.</p>
              <Button variant="link" onClick={() => setState('idle')}>تغییر ایمیل</Button>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-6 grid gap-4" noValidate>
              <p className="text-sm leading-7 text-muted-foreground">ایمیل سازمانی خود را وارد کنید تا پیوند ورود یک‌بارمصرف برایتان ارسال شود. ورود فقط برای مدیران تعریف‌شده ممکن است.</p>
              <div className="grid gap-2">
                <Label htmlFor="email">ایمیل</Label>
                <Input id="email" type="email" dir="ltr" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" className="h-11 text-left" aria-invalid={!!email && !valid} />
                {email && !valid && <p className="text-xs text-destructive">قالب ایمیل درست نیست.</p>}
              </div>
              {error && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
              <Button type="submit" className="h-11" disabled={!valid || state === 'sending'}>
                {state === 'sending' && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}ارسال پیوند ورود
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
