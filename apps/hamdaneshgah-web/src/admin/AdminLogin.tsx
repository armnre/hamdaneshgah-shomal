import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Loader2, ArrowRight, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { apiUrl } from '../lib/api';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { Label } from '@project/components/ui/label';
import { LogoMark } from '../components/site/Logo';

const params = new URLSearchParams(window.location.search);
const rawNext = params.get('next') ?? '/admin';
const NEXT = rawNext.startsWith('/') && !rawNext.startsWith('//') && !rawNext.startsWith('/admin/login') ? rawNext : '/admin';

export default function AdminLogin() {
  const { user, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim()) && password.length > 0;

  if (!isLoading && user) return <Navigate to={NEXT} replace />;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setBusy(true); setError('');
    try {
      const res = await fetch(apiUrl('/api/auth/password'), { method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: email.trim(), password }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error?.userFacingMessage ?? 'ورود ممکن نشد.');
      window.location.href = NEXT;
    } catch (err) {
      setError((err as Error).message); setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-primary lg:block">
        <img src="/shomal/ai-group.webp" alt="" className="absolute inset-0 h-full w-full object-cover opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/70 to-primary/20" />
        <div className="relative flex h-full flex-col justify-end p-12 text-primary-foreground">
          <LogoMark className="mb-6 h-16 w-16" />
          <h2 className="text-3xl font-black">سامانه مدیریت انجمن‌های علمی</h2>
          <p className="mt-3 max-w-md leading-8 text-primary-foreground/80">مدیریت انجمن‌ها، انتخابات، نامزدها، اخبار و رویدادهای دانشجویی دانشگاه شمال.</p>
        </div>
      </div>
      <div className="flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-sm">
          <Link to="/" className="mb-10 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowRight className="h-4 w-4" />بازگشت به سایت</Link>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-primary"><ShieldCheck className="h-3.5 w-3.5" />ورود مدیران سامانه</div>
          <h1 className="text-2xl font-black">ورود به پنل مدیریت</h1>
          <form onSubmit={submit} className="mt-6 grid gap-4" noValidate>
            <div className="grid gap-2">
              <Label htmlFor="email">ایمیل</Label>
              <Input id="email" type="email" dir="ltr" autoFocus autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@example.com" className="h-11 text-left" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">رمز عبور</Label>
              <div className="relative">
                <Input id="password" type={show ? 'text' : 'password'} dir="ltr" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 pe-10 text-left" />
                <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'پنهان کردن رمز' : 'نمایش رمز'} className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {error && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
            <Button type="submit" className="h-11" disabled={!valid || busy}>
              {busy && <Loader2 className="me-2 h-4 w-4 animate-spin" />}ورود
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
