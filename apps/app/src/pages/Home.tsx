import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Users, Building2, Newspaper, CalendarDays, Vote, BookOpen, Megaphone } from 'lucide-react';
import HomeHero from '../components/site/HomeHero';
import { getPublicHome } from 'zitejs/api';
import { Button } from '@project/components/ui/button';
import { Skeleton } from '@project/components/ui/skeleton';
import { AssociationCard, EventCard, NewsCard } from '../components/site/cards';
import { EmptyState, ErrorState, SectionHeading } from '../components/site/ui';
import { faNum } from '../lib/format';
import { useTitle } from '../lib/useTitle';
import { IMG } from '../lib/brand';

type Row = Record<string, unknown>;

const QUICK = [
  { to: '/associations', label: 'انجمن‌های علمی', icon: Users },
  { to: '/news', label: 'اخبار و اطلاعیه‌ها', icon: Newspaper },
  { to: '/events', label: 'رویدادها و همایش‌ها', icon: CalendarDays },
  { to: '/courses', label: 'دوره‌های آموزشی', icon: BookOpen },
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
        <div className="grid grid-cols-2 gap-3 rounded-2xl border bg-card p-3 shadow-[var(--shadow-md)] md:grid-cols-4">
          {QUICK.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} className="flex items-center gap-3 rounded-xl p-3 transition hover:bg-secondary">
              <span className="rounded-lg bg-secondary p-2 text-primary"><Icon className="h-5 w-5" /></span>
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
        <SectionHeading eyebrow="تازه‌ها" title="اخبار و اطلاعیه‌ها" action={<Button asChild variant="ghost"><Link to="/news">همه اخبار<ArrowLeft className="mr-1 h-4 w-4" /></Link></Button>} />
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
          <SectionHeading eyebrow="انجمن‌های علمی" title="جامعه‌های دانشجویی فعال" action={<Button asChild variant="ghost"><Link to="/associations">همه انجمن‌ها<ArrowLeft className="mr-1 h-4 w-4" /></Link></Button>} />
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
          <SectionHeading eyebrow="پیش رو" title="رویدادها و دوره‌ها" action={<Button asChild variant="ghost"><Link to="/events">تقویم کامل<ArrowLeft className="mr-1 h-4 w-4" /></Link></Button>} />
          {loading ? <div className="grid gap-3">{sk(3, 'h-24 rounded-2xl')}</div> : events.length === 0 ? (
            <EmptyState title="رویداد پیش رویی ثبت نشده" />
          ) : <div className="grid gap-3">{events.slice(0, 4).map((e) => <EventCard key={String(e.id)} e={e} />)}</div>}
        </div>
      </section>

      <section className="container-page mt-20">
        <SectionHeading eyebrow="زندگی دانشجویی" title="در پردیس دانشگاه شمال" />
        <div className="grid gap-4 md:grid-cols-4 md:grid-rows-2">
          <figure className="relative overflow-hidden rounded-3xl md:col-span-2 md:row-span-2">
            <img src={IMG.campus} alt="پردیس دانشگاه شمال" loading="lazy" className="h-full min-h-64 w-full object-cover" />
            <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-5 text-sm font-semibold text-white">پردیس دانشگاه شمال، آمل</figcaption>
          </figure>
          {IMG.life.map((src, i) => (
            <img key={src} src={src} alt="فعالیت‌های دانشجویی دانشگاه شمال" loading="lazy" className={`h-full min-h-44 w-full rounded-3xl object-cover ${i === 2 ? 'md:col-span-2' : ''}`} />
          ))}
        </div>
      </section>

      <section className="container-page mt-20 grid gap-6 md:grid-cols-2">
        <div className="rounded-3xl border bg-card p-8">
          <Vote className="h-8 w-8 text-accent" />
          <h2 className="mt-4 text-xl font-extrabold">انتخابات انجمن‌های علمی</h2>
          <p className="mt-3 leading-8 text-muted-foreground">{st.electionNote}</p>
          <span className="mt-5 inline-flex rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
            {st.electionStatus === 'none' || !st.electionStatus ? 'در دست توسعه — فاز دوم' : st.electionStatus}
          </span>
        </div>
        <div className="rounded-3xl bg-primary p-8 text-primary-foreground">
          <Megaphone className="h-8 w-8 text-accent" />
          <h2 className="mt-4 text-xl font-extrabold">مأموریت ما</h2>
          <p className="mt-3 leading-8 text-primary-foreground/80">{st.mission}</p>
          <Button asChild variant="outline" className="mt-5 border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"><Link to="/associations">مشاهده انجمن‌ها</Link></Button>
        </div>
      </section>
    </>
  );
}
