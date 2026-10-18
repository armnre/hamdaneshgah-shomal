import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Mail, Send, Building2 } from 'lucide-react';
import { getAssociation } from 'zitejs/api';
import { Skeleton } from '@project/components/ui/skeleton';
import { Button } from '@project/components/ui/button';
import { Cover, Crumbs, EmptyState, ErrorState, Md } from '../components/site/ui';
import { EventCard, NewsCard } from '../components/site/cards';
import { errMsg } from '../lib/format';
import { useTitle } from '../lib/useTitle';

type Row = Record<string, unknown>;

export default function AssociationDetail() {
  const { slug = '' } = useParams();
  const q = useQuery({ queryKey: ['association', slug], queryFn: () => getAssociation({ slug }), retry: false });
  const a = q.data?.association as Record<string, string> | undefined;
  useTitle(a?.name ?? 'انجمن', a?.shortDescription);

  if (q.isLoading) return <div className="container-page py-10"><Skeleton className="h-64 rounded-3xl" /><Skeleton className="mt-6 h-40 rounded-2xl" /></div>;
  if (q.isError || !a) return <div className="container-page py-16"><ErrorState text={errMsg(q.error)} /><div className="mt-4 text-center"><Button asChild variant="ghost"><Link to="/associations">بازگشت به فهرست</Link></Button></div></div>;
  const news = (q.data?.news as Row[]) ?? [];
  const events = (q.data?.events as Row[]) ?? [];

  return (
    <div className="container-page py-8">
      <Crumbs items={[{ to: '/', label: 'خانه' }, { to: '/associations', label: 'انجمن‌ها' }, { label: a.name }]} />
      <div className="overflow-hidden rounded-3xl border bg-card">
        <div className="aspect-[16/6] sm:aspect-[16/4]"><Cover src={a.coverUrl} alt={a.name} label="انجمن" /></div>
        <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-end sm:p-8">
          <div className="-mt-16 h-24 w-24 shrink-0 overflow-hidden rounded-2xl border-4 border-card bg-card sm:-mt-20"><Cover src={a.logoUrl} alt={`لوگوی ${a.name}`} label={a.name.replace('انجمن علمی', '')} /></div>
          <div className="flex-1">
            <h1 className="text-2xl font-black sm:text-3xl">{a.name}</h1>
            {a.facultyName && <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground"><Building2 className="h-4 w-4" />{a.facultyName}{a.majorName && ` · ${a.majorName}`}</p>}
          </div>
          <div className="flex gap-2">
            {a.contactEmail && <Button asChild variant="outline" size="sm"><a href={`mailto:${a.contactEmail}`}><Mail className="ml-1.5 h-4 w-4" />ایمیل</a></Button>}
            {a.telegramUrl && <Button asChild size="sm"><a href={a.telegramUrl} target="_blank" rel="noreferrer"><Send className="ml-1.5 h-4 w-4" />تلگرام</a></Button>}
          </div>
        </div>
      </div>
      <div className="mt-10 grid gap-10 lg:grid-cols-[1.5fr_1fr]">
        <section>
          <h2 className="mb-4 text-xl font-extrabold">درباره انجمن</h2>
          {a.about ? <Md>{a.about}</Md> : <p className="text-muted-foreground">{a.shortDescription || 'معرفی این انجمن هنوز ثبت نشده است.'}</p>}
          <h2 className="mb-4 mt-12 text-xl font-extrabold">اخبار انجمن</h2>
          {news.length === 0 ? <EmptyState title="خبری از این انجمن منتشر نشده" /> : <div className="grid gap-6 sm:grid-cols-2">{news.map((n) => <NewsCard key={String(n.id)} n={n} />)}</div>}
        </section>
        <aside>
          <h2 className="mb-4 text-xl font-extrabold">رویدادها</h2>
          {events.length === 0 ? <EmptyState title="رویدادی ثبت نشده" /> : <div className="grid gap-3">{events.map((e) => <EventCard key={String(e.id)} e={e} />)}</div>}
        </aside>
      </div>
    </div>
  );
}
