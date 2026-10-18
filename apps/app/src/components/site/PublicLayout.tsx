import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Menu, X, FlaskConical } from 'lucide-react';
import { SITE_NAME } from '../../lib/brand';
import { LogoWordmark } from './Logo';
import { getSiteSettings } from 'zitejs/api';
import { Button } from '@project/components/ui/button';
import { cn } from '@project/components/lib/utils';
import Footer from './Footer';

export const NAV = [
  { to: '/associations', label: 'انجمن‌های علمی' },
  { to: '/faculties', label: 'دانشکده‌ها' },
  { to: '/structure', label: 'ساختار انجمن‌ها' },
  { to: '/elections', label: 'انتخابات' },
  { to: '/news', label: 'اخبار و اطلاعیه‌ها' },
  { to: '/events', label: 'رویدادها' },
];

export function useSettings() {
  return useQuery({ queryKey: ['settings'], queryFn: () => getSiteSettings({}), staleTime: 300_000 });
}

export function Brand({ light }: { light?: boolean }) {
  return (
    <Link to="/" aria-label={`${SITE_NAME} — صفحه نخست`}>
      <LogoWordmark light={light} />
    </Link>
  );
}

function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-t-[3px] border-t-accent bg-background/80 backdrop-blur-xl">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:end-2 focus:top-2 focus:rounded focus:bg-card focus:p-2">پرش به محتوا</a>
      <div className="container-page flex h-[72px] items-center justify-between gap-4">
        <Brand />
        <nav aria-label="ناوبری اصلی" className="hidden items-center gap-1 lg:flex">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} className={({ isActive }) => cn('relative rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground', isActive && 'bg-secondary text-secondary-foreground font-bold')}>{n.label}</NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Button asChild size="sm" className="hidden rounded-full px-5 sm:inline-flex"><Link to="/contact">تماس با ما</Link></Button>
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

function DemoBanner() {
  const { data } = useSettings();
  if (!data?.hasDemo) return null;
  return (
    <div role="note" className="border-b border-accent/40 bg-accent/15 text-sm">
      <div className="container-page flex items-center gap-2 py-2 font-medium">
        <FlaskConical className="h-4 w-4 shrink-0 text-accent-foreground" aria-hidden />
        <span><strong>داده‌ی نمایشی:</strong> بخشی از محتوای این پیش‌نمایش ساختگی است و با برچسب «نمایشی» مشخص شده؛ هیچ نتیجه‌ی نمایشی رسمی نیست.</span>
      </div>
    </div>
  );
}

export default function PublicLayout() {
  // Academic theme applies to the public site only (on <html> so dialogs/popovers inherit it)
  useEffect(() => {
    document.documentElement.classList.add('theme-academic');
    return () => document.documentElement.classList.remove('theme-academic');
  }, []);
  return (
    <div className="flex min-h-screen flex-col">
      <DemoBanner />
      <Header />
      <main id="main" className="flex-1"><Outlet /></main>
      <Footer />
    </div>
  );
}
