import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Users, Newspaper, FileEdit, CalendarDays, Inbox, BookOpen } from 'lucide-react';
import { adminDashboard } from 'zitejs/api';
import { Skeleton } from '@project/components/ui/skeleton';
import { useAccess } from './AdminApp';
import DemoDataCard from './DemoDataCard';
import { ErrorState } from '../components/site/ui';
import { errMsg, faDate, faNum, ROLE_LABEL } from '../lib/format';

type Row = Record<string, unknown>;

export default function Dashboard() {
  const access = useAccess();
  const q = useQuery({ queryKey: ['admin', 'dashboard'], queryFn: () => adminDashboard({}) });
  if (q.isError) return <ErrorState text={errMsg(q.error)} onRetry={() => q.refetch()} />;
  const c = (q.data?.counts ?? {}) as Row;
  const cards = [
    { l: 'انجمن فعال', v: c.associations, i: Users, to: '/admin/associations' },
    { l: 'خبر منتشرشده', v: c.newsPublished, i: Newspaper, to: '/admin/news' },
    { l: 'پیش‌نویس', v: c.newsDraft, i: FileEdit, to: '/admin/news' },
    { l: 'رویداد پیش رو', v: c.eventsUpcoming, i: CalendarDays, to: '/admin/events' },
    { l: 'رشته', v: c.majors, i: BookOpen, to: '/admin/majors' },
    { l: 'پیام جدید', v: c.messagesNew, i: Inbox, to: '/admin/messages' },
  ];
  const monthly = ((q.data?.monthly as Row[]) ?? []).map((m) => ({ month: faDate(`${m.month}-15`).split(' ').slice(1).join(' '), count: Number(m.count) }));
  return (
    <div>
      <h1 className="text-2xl font-extrabold">داشبورد</h1>
      <p className="mt-1 text-sm text-muted-foreground">نقش شما: {ROLE_LABEL[access.role ?? '']}</p>
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {cards.map(({ l, v, i: Icon, to }) => (
          <Link key={l} to={to} className="rounded-2xl border bg-card p-4 transition hover:border-primary/40">
            <Icon className="h-5 w-5 text-primary" />
            {q.isLoading ? <Skeleton className="mt-3 h-8 w-12" /> : <p className="mt-3 text-2xl font-black">{faNum(v)}</p>}
            <p className="text-xs text-muted-foreground">{l}</p>
          </Link>
        ))}
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <section className="rounded-2xl border bg-card p-5">
          <h2 className="font-bold">انتشار اخبار در ۶ ماه اخیر</h2>
          <div className="mt-4 h-64">
            {q.isLoading ? <Skeleton className="h-full" /> : monthly.length === 0 ? <p className="flex h-full items-center justify-center text-sm text-muted-foreground">هنوز خبری منتشر نشده است.</p> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthly}><CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border" /><XAxis dataKey="month" tick={{ fontSize: 12 }} reversed /><YAxis allowDecimals={false} orientation="right" tick={{ fontSize: 12 }} width={30} /><Tooltip formatter={(v) => [faNum(v), 'خبر']} /><Bar dataKey="count" fill="hsl(var(--chart-1))" radius={[6, 6, 0, 0]} /></BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>
        <section className="grid gap-6">
          {access.role === 'Super Admin' && <DemoDataCard />}
          {access.role !== 'Association Manager' && (
            <div className="rounded-2xl border bg-card p-5">
              <h2 className="font-bold">پیام‌های جدید</h2>
              <ul className="mt-3 grid gap-2 text-sm">{((q.data?.messages as Row[]) ?? []).length === 0 ? <li className="text-muted-foreground">پیام جدیدی نیست.</li> : (q.data!.messages as Row[]).map((m) => <li key={String(m.id)} className="flex justify-between gap-2"><span className="truncate">{String(m.subject)}</span><span className="shrink-0 text-xs text-muted-foreground">{faDate(m.receivedAt)}</span></li>)}</ul>
            </div>
          )}
          {access.role === 'Super Admin' && (
            <div className="rounded-2xl border bg-card p-5">
              <h2 className="font-bold">آخرین رخدادها</h2>
              <ul className="mt-3 grid gap-2 text-sm">{((q.data?.recent as Row[]) ?? []).map((r) => <li key={String(r.id)} className="flex justify-between gap-2"><span>{String(r.action)} · {String(r.entity)}</span><span dir="ltr" className="truncate text-xs text-muted-foreground">{String(r.actorEmail ?? '')}</span></li>)}</ul>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
