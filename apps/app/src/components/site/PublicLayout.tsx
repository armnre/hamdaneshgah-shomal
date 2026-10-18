import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Menu, X, ExternalLink, Mail } from 'lucide-react';
import { SITE_NAME, IMG } from '../../lib/brand';
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
  return (
    <Link to="/" className="flex items-center gap-3" aria-label={`${SITE_NAME} — صفحه نخست`}>
      <span className={cn('flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-white p-1 shadow-sm', light ? 'ring-1 ring-white/30' : 'ring-1 ring-border')}>
        <img src={IMG.emblem} alt="نشان دانشگاه شمال" className="h-full w-full object-contain" />
      </span>
      <span className="leading-tight">
        <span className="block text-lg font-black">{SITE_NAME}</span>
        <span className={cn('block text-[11px] font-medium', light ? 'text-sidebar-foreground/70' : 'text-muted-foreground')}>شبکه دانشجویی دانشگاه شمال</span>
      </span>
    </Link>
  );
}

function TopBar() {
  const { data } = useSettings();
  const st = data?.settings ?? {};
  return (
    <div className="hidden bg-primary text-primary-foreground/85 md:block">
      <div className="container-page flex h-9 items-center justify-between text-xs">
        <span>دانشگاه غیردولتی ـ غیرانتفاعی شمال · آمل</span>
        <span className="flex items-center gap-5">
          {st.contactEmail && <a href={`mailto:${st.contactEmail}`} className="flex items-center gap-1.5 hover:text-accent" dir="ltr"><Mail className="h-3.5 w-3.5" />{st.contactEmail}</a>}
          <a href={st.universityUrl || 'https://shomal.ac.ir'} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:text-accent"><ExternalLink className="h-3.5 w-3.5" />وب‌سایت رسمی دانشگاه</a>
        </span>
      </div>
    </div>
  );
}

function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur-md">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:right-2 focus:top-2 focus:rounded focus:bg-card focus:p-2">پرش به محتوا</a>
      <div className="container-page flex h-[72px] items-center justify-between gap-4">
        <Brand />
        <nav aria-label="ناوبری اصلی" className="hidden items-center gap-1 lg:flex">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} className={({ isActive }) => cn('rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground', isActive && 'bg-secondary text-primary')}>{n.label}</NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="outline" className="hidden sm:inline-flex"><Link to="/contact">تماس با ما</Link></Button>
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
      <TopBar />
      <Header />
      <main id="main" className="flex-1"><Outlet /></main>
      <Footer />
    </div>
  );
}
