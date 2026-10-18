import { createContext, useContext, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LayoutDashboard, Users, Building2, BookOpen, Newspaper, CalendarDays, Tags, Image, ShieldCheck, ScrollText, Settings, Inbox, Menu, LogOut, ExternalLink, Loader2, Lock } from 'lucide-react';
import { useAuth, loginWithRedirect, logout } from 'zitejs/auth';
import { getMyAccess, claimSuperAdmin, adminOptions, GetMyAccessOutputType } from 'zitejs/api';
import { Button } from '@project/components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@project/components/ui/sheet';
import { cn } from '@project/components/lib/utils';
import { toast } from 'sonner';
import { errMsg, ROLE_LABEL } from '../lib/format';
import { useTitle } from '../lib/useTitle';

type Access = GetMyAccessOutputType;
const Ctx = createContext<Access | null>(null);
export const useAccess = () => useContext(Ctx)!;

export function useOptions() {
  return useQuery({ queryKey: ['adminOptions'], queryFn: () => adminOptions({}), staleTime: 60_000 });
}

const NAV = [
  { to: '/admin', label: 'داشبورد', icon: LayoutDashboard, entity: null },
  { to: '/admin/news', label: 'اخبار', icon: Newspaper, entity: 'news' },
  { to: '/admin/events', label: 'رویدادها و دوره‌ها', icon: CalendarDays, entity: 'events' },
  { to: '/admin/associations', label: 'انجمن‌ها', icon: Users, entity: 'associations' },
  { to: '/admin/faculties', label: 'دانشکده‌ها', icon: Building2, entity: 'faculties' },
  { to: '/admin/majors', label: 'رشته‌ها', icon: BookOpen, entity: 'majors' },
  { to: '/admin/categories', label: 'دسته‌بندی‌ها', icon: Tags, entity: 'categories' },
  { to: '/admin/media', label: 'رسانه‌ها', icon: Image, entity: 'media' },
  { to: '/admin/messages', label: 'پیام‌ها', icon: Inbox, entity: 'messages' },
  { to: '/admin/members', label: 'کاربران و نقش‌ها', icon: ShieldCheck, entity: 'members' },
  { to: '/admin/audit', label: 'گزارش رخدادها', icon: ScrollText, entity: 'audit' },
  { to: '/admin/settings', label: 'تنظیمات', icon: Settings, entity: 'settings' },
];

function Center({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen items-center justify-center bg-muted/40 p-6">{children}</div>;
}

export default function AdminApp() {
  useTitle('پنل مدیریت', undefined, true);
  const { user, isLoading } = useAuth();
  useEffect(() => { if (!isLoading && !user) loginWithRedirect(); }, [isLoading, user]);
  const q = useQuery({ queryKey: ['myAccess'], queryFn: () => getMyAccess({}), enabled: !!user });
  const qc = useQueryClient();
  const claim = useMutation({ mutationFn: () => claimSuperAdmin({}), onSuccess: () => { toast.success('شما مدیر کل سامانه شدید.'); qc.invalidateQueries(); }, onError: (e) => toast.error(errMsg(e)) });

  if (isLoading || !user || q.isLoading) return <Center><Loader2 className="h-6 w-6 animate-spin text-primary" /></Center>;
  if (q.isError) return <Center><p>{errMsg(q.error)}</p></Center>;
  const access = q.data!;
  if (!access.role) {
    return (
      <Center>
        <div className="w-full max-w-md rounded-3xl border bg-card p-8 text-center shadow-[var(--shadow-md)]">
          <Lock className="mx-auto h-8 w-8 text-primary" />
          <h1 className="mt-4 text-xl font-extrabold">{access.canBootstrap ? 'راه‌اندازی اولیه سامانه' : 'دسترسی مدیریتی ندارید'}</h1>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            {access.canBootstrap ? 'هنوز هیچ مدیری تعریف نشده است. با تأیید، حساب شما به‌عنوان «مدیر کل» ثبت می‌شود و این گزینه برای همیشه بسته خواهد شد.' : `حساب ${user.email} نقشی در پنل مدیریت ندارد. برای دریافت دسترسی با مدیر کل تماس بگیرید.`}
          </p>
          <div className="mt-6 flex justify-center gap-2">
            {access.canBootstrap && <Button onClick={() => claim.mutate()} disabled={claim.isPending}>{claim.isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}ثبت من به‌عنوان مدیر کل</Button>}
            <Button variant="outline" asChild><Link to="/">بازگشت به سایت</Link></Button>
          </div>
        </div>
      </Center>
    );
  }
  return <Ctx.Provider value={access}><Shell email={user.email} /></Ctx.Provider>;
}

function SideNav({ onNavigate }: { onNavigate?: () => void }) {
  const access = useAccess();
  return (
    <nav className="grid gap-1 p-3" aria-label="منوی مدیریت">
      {NAV.filter((n) => !n.entity || access.entities.includes(n.entity)).map(({ to, label, icon: Icon }) => (
        <NavLink key={to} to={to} end={to === '/admin'} onClick={onNavigate}
          className={({ isActive }) => cn('flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground', isActive && 'bg-sidebar-accent font-semibold text-sidebar-primary')}>
          <Icon className="h-4 w-4" />{label}
        </NavLink>
      ))}
    </nav>
  );
}

function Shell({ email }: { email: string }) {
  const access = useAccess();
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  const current = NAV.find((n) => n.to === loc.pathname) ?? NAV.find((n) => n.to !== '/admin' && loc.pathname.startsWith(n.to));
  const brand = <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-5 font-black text-sidebar-accent-foreground"><img src="/shomal/emblem.webp" alt="" className="h-8 w-8 rounded-lg bg-white p-0.5" />پردیس شمال<span className="text-sidebar-primary text-sm">· پنل مدیریت</span></div>;
  return (
    <div className="min-h-screen bg-muted/40 lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="sticky top-0 hidden h-screen overflow-y-auto bg-sidebar text-sidebar-foreground lg:block">{brand}<SideNav /></aside>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-72 border-0 bg-sidebar p-0 text-sidebar-foreground"><SheetTitle className="sr-only">منو</SheetTitle>{brand}<SideNav onNavigate={() => setOpen(false)} /></SheetContent>
      </Sheet>
      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/90 px-4 backdrop-blur sm:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)} aria-label="منو"><Menu /></Button>
          <nav aria-label="مسیر" className="text-sm text-muted-foreground"><Link to="/admin">پنل</Link>{current && current.to !== '/admin' && <> / <span className="text-foreground">{current.label}</span></>}</nav>
          <div className="mr-auto flex items-center gap-2">
            <div className="hidden text-left text-xs sm:block"><p dir="ltr">{email}</p><p className="text-muted-foreground">{ROLE_LABEL[access.role ?? '']}</p></div>
            <Button variant="ghost" size="icon" asChild aria-label="مشاهده سایت"><Link to="/" target="_blank"><ExternalLink className="h-4 w-4" /></Link></Button>
            <Button variant="ghost" size="icon" onClick={() => logout()} aria-label="خروج"><LogOut className="h-4 w-4" /></Button>
          </div>
        </header>
        <main className="p-4 sm:p-6 lg:p-8"><Outlet /></main>
      </div>
    </div>
  );
}
