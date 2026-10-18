import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Menu, X, LogIn, LayoutDashboard } from 'lucide-react';
import { useAuth, loginWithRedirect } from 'zitejs/auth';
import { getSiteSettings } from 'zitejs/api';
import { Button } from '@project/components/ui/button';
import { cn } from '@project/components/lib/utils';
import Footer from './Footer';

export const NAV = [
  { to: '/associations', label: 'انجمن‌های علمی' },
  { to: '/faculties', label: 'دانشکده‌ها' },
  { to: '/news', label: 'اخبار و اطلاعیه‌ها' },
  { to: '/events', label: 'رویدادها' },
  { to: '/courses', label: 'دوره‌ها' },
  { to: '/about', label: 'درباره' },
];

export function useSettings() {
  return useQuery({ queryKey: ['settings'], queryFn: () => getSiteSettings({}), staleTime: 300_000 });
}

export function Brand({ light }: { light?: boolean }) {
  const { data } = useSettings();
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <span className={cn('flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-white p-0.5', light ? 'ring-1 ring-white/30' : 'ring-1 ring-border')}>
        <img src="/shomal/emblem.webp" alt="نشان دانشگاه شمال" className="h-full w-full object-contain" />
      </span>
      <span className="font-black leading-tight">{data?.settings.productName ?? 'هم‌دانشگاه شمال'}</span>
    </Link>
  );
}

function Header() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:right-2 focus:top-2 focus:rounded focus:bg-card focus:p-2">پرش به محتوا</a>
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Brand />
        <nav aria-label="ناوبری اصلی" className="hidden items-center gap-1 lg:flex">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} className={({ isActive }) => cn('rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground', isActive && 'bg-secondary text-primary')}>{n.label}</NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <Button asChild size="sm"><Link to="/admin"><LayoutDashboard className="ml-1.5 h-4 w-4" />پنل</Link></Button>
          ) : (
            <Button size="sm" variant="outline" onClick={() => loginWithRedirect({ redirectUrl: '/admin' })}><LogIn className="ml-1.5 h-4 w-4" />ورود</Button>
          )}
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(!open)} aria-label="منو" aria-expanded={open}>{open ? <X /> : <Menu />}</Button>
        </div>
      </div>
      {open && (
        <nav className="border-t bg-background lg:hidden" aria-label="ناوبری موبایل">
          <div className="container-page grid gap-1 py-3">
            <NavLink to="/" end onClick={() => setOpen(false)} className="rounded-lg px-3 py-3 font-medium hover:bg-muted">خانه</NavLink>
            {NAV.map((n) => <NavLink key={n.to} to={n.to} onClick={() => setOpen(false)} className={({ isActive }) => cn('rounded-lg px-3 py-3 font-medium hover:bg-muted', isActive && 'bg-secondary text-primary')}>{n.label}</NavLink>)}
            <NavLink to="/contact" onClick={() => setOpen(false)} className="rounded-lg px-3 py-3 font-medium hover:bg-muted">تماس با ما</NavLink>
          </div>
        </nav>
      )}
    </header>
  );
}

export default function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main id="main" className="flex-1"><Outlet /></main>
      <Footer />
    </div>
  );
}
