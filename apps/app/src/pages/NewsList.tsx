import { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useDebounce } from 'use-debounce';
import { Search } from 'lucide-react';
import { listNews } from 'zitejs/api';
import { Input } from '@project/components/ui/input';
import { Skeleton } from '@project/components/ui/skeleton';
import { cn } from '@project/components/lib/utils';
import { NewsCard } from '../components/site/cards';
import { EmptyState, ErrorState, PageHero, Pagination } from '../components/site/ui';
import { useTitle } from '../lib/useTitle';

type Row = Record<string, unknown>;

export default function NewsList() {
  useTitle('اخبار و اطلاعیه‌ها', 'آخرین اخبار و اطلاعیه‌های فعالیت‌های دانشجویی دانشگاه شمال');
  const [page, setPage] = useState(1);
  const [cat, setCat] = useState('');
  const [q, setQ] = useState('');
  const [dq] = useDebounce(q, 350);
  const query = useQuery({ queryKey: ['news', page, cat, dq], queryFn: () => listNews({ page, categoryId: cat || undefined, q: dq || undefined }), placeholderData: keepPreviousData });
  const rows = (query.data?.news as Row[]) ?? [];
  const cats = (query.data?.categories as Row[]) ?? [];

  return (
    <>
      <PageHero image="/shomal/ai-library.webp" title="اخبار و اطلاعیه‌ها" subtitle="اطلاعیه‌های رسمی، اخبار انجمن‌ها و گزارش فعالیت‌های دانشجویی." />
      <div className="container-page py-10">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {[{ id: '', name: 'همه' }, ...cats].map((c) => (
              <button key={String(c.id)} onClick={() => { setCat(String(c.id)); setPage(1); }} aria-pressed={cat === c.id}
                className={cn('shrink-0 rounded-full border px-4 py-2 text-sm transition', cat === c.id ? 'border-primary bg-primary text-primary-foreground' : 'bg-card hover:border-primary/40')}>{String(c.name)}</button>
            ))}
          </div>
          <div className="relative md:w-72">
            <Search className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="جست‌وجو در اخبار…" aria-label="جست‌وجو" className="pe-10" />
          </div>
        </div>
        {query.isError ? <ErrorState onRetry={() => query.refetch()} /> : query.isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-80 rounded-2xl" />)}</div>
        ) : rows.length === 0 ? <EmptyState title="خبری یافت نشد" text="هنوز خبری با این مشخصات منتشر نشده است." /> : (
          <div className={cn('grid gap-6 sm:grid-cols-2 lg:grid-cols-3', query.isFetching && 'opacity-60')}>{rows.map((n) => <NewsCard key={String(n.id)} n={n} />)}</div>
        )}
        <Pagination page={page} pages={Number(query.data?.pages ?? 1)} onChange={(p) => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
      </div>
    </>
  );
}
