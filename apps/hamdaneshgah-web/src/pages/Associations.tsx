import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDebounce } from 'use-debounce';
import { Search, X } from 'lucide-react';
import { listAssociations } from '../lib/api';
import { Input } from '@project/components/ui/input';
import { Button } from '@project/components/ui/button';
import { Skeleton } from '@project/components/ui/skeleton';
import { cn } from '@project/components/lib/utils';
import { AssociationCard } from '../components/site/cards';
import { EmptyState, ErrorState, PageHero } from '../components/site/ui';
import { useTitle } from '../lib/useTitle';
import { faNum } from '../lib/format';

type Row = Record<string, unknown>;

export default function Associations() {
  useTitle('انجمن‌های علمی', 'فهرست انجمن‌های علمی دانشجویی دانشگاه شمال آمل');
  const [q, setQ] = useState('');
  const [fid, setFid] = useState('');
  const [dq] = useDebounce(q, 300);
  const query = useQuery({ queryKey: ['assoc', dq, fid], queryFn: () => listAssociations({ q: dq || undefined, facultyId: fid || undefined }), placeholderData: (p) => p });
  const rows = (query.data?.associations as Row[]) ?? [];
  const faculties = (query.data?.faculties as Row[]) ?? [];
  const reset = () => { setQ(''); setFid(''); };
  return (
    <>
      <PageHero image="/shomal/campus-aerial-4.jpg" title="انجمن‌های علمی" subtitle="انجمن رشته‌ات را پیدا کن، با فعالیت‌هایش آشنا شو و در رویدادهایش شرکت کن." />
      <div className="border-b bg-background">
        <div className="container-page flex flex-col gap-3 py-3 md:flex-row md:items-center">
          <div className="relative md:w-80">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="جست‌وجوی انجمن یا رشته…" aria-label="جست‌وجو" className="h-11 rounded-full bg-card pe-9 ps-9" />
            {q && <button aria-label="پاک کردن" onClick={() => setQ('')} className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>}
          </div>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none] md:mx-0 md:px-0" role="tablist" aria-label="فیلتر دانشکده">
            {[{ id: '', name: 'همه' }, ...faculties].map((f) => (
              <button key={String(f.id)} role="tab" aria-selected={fid === f.id} onClick={() => setFid(String(f.id))}
                className={cn('h-9 shrink-0 rounded-full border px-4 text-sm transition', fid === f.id ? 'border-primary bg-primary text-primary-foreground' : 'bg-card hover:border-primary/40')}>{String(f.name)}</button>
            ))}
          </div>
        </div>
      </div>
      <div className="container-page py-8 sm:py-10">
        {query.isError ? <ErrorState onRetry={() => query.refetch()} /> : query.isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}</div>
        ) : rows.length === 0 ? (
          <EmptyState title="انجمنی یافت نشد" text={q || fid ? 'عبارت یا فیلتر را تغییر دهید.' : 'هنوز انجمنی ثبت نشده است.'} action={q || fid ? <Button variant="outline" onClick={reset}>حذف فیلترها</Button> : undefined} />
        ) : (
          <>
            <p className="mb-4 text-sm text-muted-foreground">{faNum(rows.length)} انجمن</p>
            <div className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-3', query.isFetching && 'opacity-60 transition-opacity')}>{rows.map((a) => <AssociationCard key={String(a.id)} a={a} />)}</div>
          </>
        )}
      </div>
    </>
  );
}
