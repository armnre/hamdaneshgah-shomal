import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Users, Newspaper, CalendarDays, Vote, Building2, ChevronLeft } from 'lucide-react';
import HomeHero from '../components/site/HomeHero';
import { getPublicHome } from '../lib/api';
import { ElectionBanner } from '../components/site/ElectionBanner';
import { Button } from '@project/components/ui/button';
import { Skeleton } from '@project/components/ui/skeleton';
import { AssociationCard, EventCard, NewsCard } from '../components/site/cards';
import { EmptyState, ErrorState, SectionHeading } from '../components/site/ui';
import { faNum } from '../lib/format';
import { useTitle } from '../lib/useTitle';

type Row = Record<string, unknown>;

const QUICK = [
  { to: '/elections', label: 'انتخابات', icon: Vote },
  { to: '/associations', label: 'انجمن‌ها', icon: Users },
  { to: '/news', label: 'اخبار', icon: Newspaper },
  { to: '/events', label: 'رویدادها', icon: CalendarDays },
];

export default function Home() {
  useTitle('');
  const q = useQuery({ queryKey: ['home'], queryFn: () => getPublicHome({}) });
  const d = q.data;
  const st: Record<string, string> = d?.settings ?? {};
  return (
    <>
      <HomeHero title={st.heroTitle} subtitle={st.heroSubtitle} stats={d?.stats as Row | undefined} loading={q.isLoading} />
      <section className="container-page relative z-10 -mt-8">
        <nav aria-label="دسترسی سریع" className="grid grid-cols-4 gap-1 rounded-2xl border bg-card p-1.5 shadow-[var(--shadow-md)] sm:gap-2 sm:p-2">
          {QUICK.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} className="flex flex-col items-center gap-1.5 rounded-xl px-1 py-3 text-center transition hover:bg-secondary sm:flex-row sm:justify-center sm:gap-3 sm:py-4">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary"><Icon className="h-5 w-5" aria-hidden /></span>
              <span className="text-xs font-semibold sm:text-sm">{label}</span>
            </Link>
          ))}
        </nav>
      </section>
      <ElectionBanner />
      {q.isError ? <div className="container-page mt-16"><ErrorState onRetry={() => q.refetch()} /></div> : <HomeSections d={d} loading={q.isLoading} />}
    </>
  );
}

const More = ({ to, label }: { to: string; label: string }) => (
  <Button asChild variant="ghost" size="sm"><Link to={to}>{label}<ArrowLeft className="me-1 h-4 w-4" /></Link></Button>
);

function HomeSections({ d, loading }: { d?: Row; loading: boolean }) {
  const news = (d?.news as Row[]) ?? [];
  const events = (d?.events as Row[]) ?? [];
  const assoc = (d?.associations as Row[]) ?? [];
  const faculties = (d?.faculties as Row[]) ?? [];
  const sk = (n: number, c: string) => Array.from({ length: n }).map((_, i) => <Skeleton key={i} className={c} />);
  return (
    <>
      <section className="container-page mt-14 sm:mt-20">
        <SectionHeading eyebrow="تازه‌ها" title="اخبار و اطلاعیه‌ها" action={<More to="/news" label="همه" />} />
        {loading ? <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">{sk(2, 'h-64 rounded-2xl')}</div> : news.length === 0 ? (
          <EmptyState title="هنوز خبری منتشر نشده است" text="اخبار و اطلاعیه‌ها پس از انتشار در اینجا نمایش داده می‌شوند." />
        ) : (
          <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <NewsCard n={news[0]} large />
            <div className="divide-y rounded-2xl border bg-card">{news.slice(1, 5).map((n) => (
              <Link key={String(n.id)} to={`/news/${n.slug}`} className="flex items-center gap-3 p-4 transition hover:bg-secondary/60">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">{String(n.categoryName ?? 'خبر')}</p>
                  <p className="mt-0.5 line-clamp-2 font-bold leading-7">{String(n.title)}</p>
                </div>
                <ChevronLeft className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              </Link>
            ))}</div>
          </div>
        )}
      </section>

      <section className="mt-14 bg-secondary/60 py-12 sm:mt-20 sm:py-16">
        <div className="container-page">
          <SectionHeading eyebrow="انجمن‌های علمی" title="جامعه‌های دانشجویی فعال" action={<More to="/associations" label="همه" />} />
          {loading ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{sk(3, 'h-64 rounded-2xl')}</div> : assoc.length === 0 ? (
            <EmptyState title="انجمنی ثبت نشده است" />
          ) : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{assoc.slice(0, 6).map((a) => <AssociationCard key={String(a.id)} a={a} />)}</div>}
        </div>
      </section>

      <section className="container-page mb-16 mt-14 grid gap-12 sm:mt-20 lg:grid-cols-[1fr_1.2fr] lg:gap-10">
        <div>
          <SectionHeading eyebrow="ساختار آموزشی" title="دانشکده‌ها" action={<More to="/faculties" label="همه" />} />
          <div className="divide-y rounded-2xl border bg-card">
            {loading ? <div className="space-y-2 p-3">{sk(3, 'h-14 rounded-xl')}</div> : faculties.map((f) => (
              <Link key={String(f.id)} to={`/faculties#${f.slug}`} className="flex items-center gap-3 p-4 transition hover:bg-secondary/60">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><Building2 className="h-5 w-5" aria-hidden /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold">{String(f.name)}</span>
                  <span className="text-xs text-muted-foreground">{faNum(f.majorCount)} رشته · {faNum(f.associationCount)} انجمن</span>
                </span>
                <ChevronLeft className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              </Link>
            ))}
          </div>
        </div>
        <div>
          <SectionHeading eyebrow="پیش رو" title="رویدادها و دوره‌ها" action={<More to="/events" label="تقویم" />} />
          {loading ? <div className="grid gap-3">{sk(3, 'h-24 rounded-2xl')}</div> : events.length === 0 ? (
            <EmptyState title="رویداد پیش رویی ثبت نشده" />
          ) : <div className="grid gap-3">{events.slice(0, 4).map((e) => <EventCard key={String(e.id)} e={e} />)}</div>}
        </div>
      </section>
    </>
  );
}
