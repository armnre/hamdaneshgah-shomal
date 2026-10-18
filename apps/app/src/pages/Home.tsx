import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Users, Building2, Newspaper, CalendarDays, Vote, BookOpen } from 'lucide-react';
import HomeHero from '../components/site/HomeHero';
import { getPublicHome, listPublicElections } from 'zitejs/api';
import { HomeElections } from '../components/site/HomeElections';
import { Button } from '@project/components/ui/button';
import { Skeleton } from '@project/components/ui/skeleton';
import { AssociationCard, EventCard, NewsCard } from '../components/site/cards';
import { EmptyState, ErrorState, SectionHeading } from '../components/site/ui';
import { faNum } from '../lib/format';
import { useTitle } from '../lib/useTitle';


type Row = Record<string, unknown>;

const QUICK = [
  { to: '/associations', label: 'انجمن‌های علمی', icon: Users },
  { to: '/news', label: 'اخبار و اطلاعیه‌ها', icon: Newspaper },
  { to: '/events', label: 'رویدادها و همایش‌ها', icon: CalendarDays },
  { to: '/events', label: 'دوره‌های آموزشی', icon: BookOpen },
];

export default function Home() {
  useTitle('');
  const q = useQuery({ queryKey: ['home'], queryFn: () => getPublicHome({}) });
  const d = q.data;
  const st: Record<string, string> = d?.settings ?? {};

  return (
    <>
      <HomeHero title={st.heroTitle} subtitle={st.heroSubtitle} stats={d?.stats as Row | undefined} loading={q.isLoading} />

      <section className="container-page -mt-8 relative z-10">
        <div className="frame-double grid grid-cols-2 gap-3 rounded-lg border bg-card p-3 shadow-[var(--shadow-md)] md:grid-cols-4">
          {QUICK.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} className="flex items-center gap-3 rounded-xl p-3 transition hover:bg-secondary">
              <span className="rounded-md bg-primary p-2 text-accent"><Icon className="h-5 w-5" /></span>
              <span className="text-sm font-semibold">{label}</span>
            </Link>
          ))}
        </div>
      </section>

      {q.isError ? <div className="container-page mt-16"><ErrorState onRetry={() => q.refetch()} /></div> : (
        <HomeSections d={d} loading={q.isLoading} st={st} />
      )}
    </>
  );
}

function HomeSections({ d, loading, st }: { d?: Row; loading: boolean; st: Record<string, string> }) {
  const news = (d?.news as Row[]) ?? [];
  const events = (d?.events as Row[]) ?? [];
  const assoc = (d?.associations as Row[]) ?? [];
  const faculties = (d?.faculties as Row[]) ?? [];
  const sk = (n: number, c: string) => Array.from({ length: n }).map((_, i) => <Skeleton key={i} className={c} />);

  return (
    <>
      <section className="container-page mt-20">
        <SectionHeading eyebrow="تازه‌ها" title="اخبار و اطلاعیه‌ها" action={<Button asChild variant="ghost"><Link to="/news">همه اخبار<ArrowLeft className="me-1 h-4 w-4" /></Link></Button>} />
        {loading ? <div className="grid gap-6 md:grid-cols-3">{sk(3, 'h-72 rounded-2xl')}</div> : news.length === 0 ? (
          <EmptyState title="هنوز خبری منتشر نشده است" text="اخبار و اطلاعیه‌ها پس از انتشار توسط مدیران در اینجا نمایش داده می‌شوند." />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <NewsCard n={news[0]} large />
            <div className="grid gap-4">{news.slice(1, 4).map((n) => (
              <Link key={String(n.id)} to={`/news/${n.slug}`} className="rounded-2xl border bg-card p-5 transition hover:border-primary/40">
                <p className="text-xs text-muted-foreground">{String(n.categoryName ?? 'خبر')}</p>
                <p className="mt-1 font-bold leading-7">{String(n.title)}</p>
              </Link>
            ))}</div>
          </div>
        )}
      </section>

      <section className="mt-20 bg-secondary/60 py-16">
        <div className="container-page">
          <SectionHeading eyebrow="انجمن‌های علمی" title="جامعه‌های دانشجویی فعال" action={<Button asChild variant="ghost"><Link to="/associations">همه انجمن‌ها<ArrowLeft className="me-1 h-4 w-4" /></Link></Button>} />
          {loading ? <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{sk(3, 'h-72 rounded-2xl')}</div> : assoc.length === 0 ? (
            <EmptyState title="انجمنی ثبت نشده است" text="پس از ثبت انجمن‌های علمی توسط مدیر سامانه، فهرست آن‌ها اینجا قرار می‌گیرد." />
          ) : <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{assoc.map((a) => <AssociationCard key={String(a.id)} a={a} />)}</div>}
        </div>
      </section>

      <section className="container-page mt-20 grid gap-10 lg:grid-cols-[1fr_1.2fr]">
        <div>
          <SectionHeading eyebrow="ساختار آموزشی" title="دانشکده‌ها" />
          <div className="grid gap-3">
            {loading ? sk(3, 'h-20 rounded-2xl') : faculties.map((f) => (
              <Link key={String(f.id)} to={`/faculties#${f.slug}`} className="flex items-center justify-between rounded-2xl border bg-card p-5 transition hover:border-primary/40">
                <span className="flex items-center gap-3"><Building2 className="h-5 w-5 text-primary" /><span className="font-bold">{String(f.name)}</span></span>
                <span className="text-xs text-muted-foreground">{faNum(f.majorCount)} رشته · {faNum(f.associationCount)} انجمن</span>
              </Link>
            ))}
          </div>
        </div>
        <div>
          <SectionHeading eyebrow="پیش رو" title="رویدادها و دوره‌ها" action={<Button asChild variant="ghost"><Link to="/events">تقویم کامل<ArrowLeft className="me-1 h-4 w-4" /></Link></Button>} />
          {loading ? <div className="grid gap-3">{sk(3, 'h-24 rounded-2xl')}</div> : events.length === 0 ? (
            <EmptyState title="رویداد پیش رویی ثبت نشده" />
          ) : <div className="grid gap-3">{events.slice(0, 4).map((e) => <EventCard key={String(e.id)} e={e} />)}</div>}
        </div>
      </section>


      <ElectionsBlock />
    </>
  );
}

function ElectionsBlock() {
  const q = useQuery({ queryKey: ['publicElections'], queryFn: () => listPublicElections({}) });
  const list = q.data?.elections ?? [];
  return (
    <section className="container-page mt-20" aria-labelledby="home-elections">
      {q.isLoading ? <Skeleton className="h-[28rem] rounded-[2rem]" /> : list.length === 0 ? (
        <EmptyState title="هنوز انتخاباتی اعلام نشده است" text="زمان‌بندی ثبت‌نام نامزدها و رأی‌گیری پس از تصویب در اینجا منتشر می‌شود." />
      ) : <HomeElections list={list} />}
    </section>
  );
}
