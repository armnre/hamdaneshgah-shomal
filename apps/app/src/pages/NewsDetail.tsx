import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Calendar } from 'lucide-react';
import { getNews } from 'zitejs/api';
import { Skeleton } from '@project/components/ui/skeleton';
import { Badge } from '@project/components/ui/badge';
import { Crumbs, ErrorState, Md } from '../components/site/ui';
import { errMsg, faDate } from '../lib/format';
import { useTitle } from '../lib/useTitle';

type Row = Record<string, unknown>;

export default function NewsDetail() {
  const { slug = '' } = useParams();
  const q = useQuery({ queryKey: ['newsItem', slug], queryFn: () => getNews({ slug }), retry: false });
  const n = q.data?.news as Row | undefined;
  useTitle(n ? String(n.title) : 'خبر', n?.excerpt ? String(n.excerpt) : undefined);

  if (q.isLoading) return <div className="container-page max-w-3xl py-10"><Skeleton className="h-10 w-3/4" /><Skeleton className="mt-6 h-80 rounded-2xl" /></div>;
  if (q.isError || !n) return <div className="container-page py-16"><ErrorState text={errMsg(q.error)} /></div>;
  const related = (q.data?.related as Row[]) ?? [];

  return (
    <div className="container-page grid gap-12 py-8 lg:grid-cols-[1fr_300px]">
      <article className="min-w-0">
        <Crumbs items={[{ to: '/', label: 'خانه' }, { to: '/news', label: 'اخبار' }, { label: String(n.title) }]} />
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          {Boolean(n.isAnnouncement) && <Badge className="bg-accent text-accent-foreground hover:bg-accent">اطلاعیه</Badge>}
          {Boolean(n.categoryName) && <Badge variant="secondary">{String(n.categoryName)}</Badge>}
          <span className="flex items-center gap-1"><Calendar className="h-4 w-4" />{faDate(n.publishAt, true)}</span>
        </div>
        <h1 className="mt-4 text-2xl font-black leading-[1.6] sm:text-4xl sm:leading-[1.5]">{String(n.title)}</h1>
        {Boolean(n.excerpt) && <p className="mt-4 text-lg leading-9 text-muted-foreground">{String(n.excerpt)}</p>}
        {Boolean(n.coverUrl) && <img src={String(n.coverUrl)} alt={String(n.title)} className="mt-8 w-full rounded-2xl object-cover" />}
        <div className="mt-8"><Md>{n.body}</Md></div>
        {Boolean(n.associationSlug) && <p className="mt-10 rounded-xl bg-secondary p-4 text-sm">منتشرشده توسط <Link to={`/associations/${n.associationSlug}`} className="font-bold text-primary">{String(n.associationName)}</Link></p>}
      </article>
      <aside className="lg:pt-12">
        <h2 className="mb-4 font-extrabold">آخرین اخبار</h2>
        <div className="grid gap-3">{related.map((r) => (
          <Link key={String(r.slug)} to={`/news/${r.slug}`} className="rounded-xl border bg-card p-4 transition hover:border-primary/40">
            <p className="font-semibold leading-7">{String(r.title)}</p><p className="mt-1 text-xs text-muted-foreground">{faDate(r.publishAt)}</p>
          </Link>
        ))}</div>
      </aside>
    </div>
  );
}
