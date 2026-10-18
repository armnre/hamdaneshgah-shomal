import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDebounce } from 'use-debounce';
import { Search } from 'lucide-react';
import { listAssociations } from 'zitejs/api';
import { Input } from '@project/components/ui/input';
import { Skeleton } from '@project/components/ui/skeleton';
import { cn } from '@project/components/lib/utils';
import { AssociationCard } from '../components/site/cards';
import { EmptyState, ErrorState, PageHero } from '../components/site/ui';
import { useTitle } from '../lib/useTitle';

type Row = Record<string, unknown>;

export default function Associations() {
  useTitle('انجمن‌های علمی', 'فهرست انجمن‌های علمی دانشجویی دانشگاه شمال آمل');
  const [q, setQ] = useState('');
  const [fid, setFid] = useState<string>('');
  const [dq] = useDebounce(q, 350);
  const query = useQuery({ queryKey: ['assoc', dq, fid], queryFn: () => listAssociations({ q: dq || undefined, facultyId: fid || undefined }) });
  const rows = (query.data?.associations as Row[]) ?? [];
  const faculties = (query.data?.faculties as Row[]) ?? [];

  return (
    <>
      <PageHero title="انجمن‌های علمی" subtitle="با انجمن‌های علمی دانشجویی آشنا شوید، فعالیت‌هایشان را دنبال کنید و در رویدادها مشارکت داشته باشید.">
        <div className="relative mt-8 max-w-lg">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="جست‌وجوی نام انجمن…" aria-label="جست‌وجو" className="h-12 bg-card pr-10 text-foreground" />
        </div>
      </PageHero>
      <div className="container-page py-10">
        <div className="mb-8 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="فیلتر دانشکده">
          {[{ id: '', name: 'همه دانشکده‌ها' }, ...faculties].map((f) => (
            <button key={String(f.id)} role="tab" aria-selected={fid === f.id} onClick={() => setFid(String(f.id))}
              className={cn('shrink-0 rounded-full border px-4 py-2 text-sm transition', fid === f.id ? 'border-primary bg-primary text-primary-foreground' : 'bg-card hover:border-primary/40')}>{String(f.name)}</button>
          ))}
        </div>
        {query.isError ? <ErrorState onRetry={() => query.refetch()} /> : query.isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-72 rounded-2xl" />)}</div>
        ) : rows.length === 0 ? (
          <EmptyState title="انجمنی یافت نشد" text={q || fid ? 'فیلترها یا عبارت جست‌وجو را تغییر دهید.' : 'هنوز انجمنی در سامانه ثبت نشده است.'} />
        ) : <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{rows.map((a) => <AssociationCard key={String(a.id)} a={a} />)}</div>}
      </div>
    </>
  );
}
