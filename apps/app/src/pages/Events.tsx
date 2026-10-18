import { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { listEvents } from 'zitejs/api';
import { Skeleton } from '@project/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@project/components/ui/tabs';
import { EventCard } from '../components/site/cards';
import { EmptyState, ErrorState, PageHero, Pagination } from '../components/site/ui';
import { useTitle } from '../lib/useTitle';

type Row = Record<string, unknown>;
type Kind = 'Event' | 'Conference' | 'Course' | 'Call';

export default function Events({ courses }: { courses?: boolean }) {
  const title = courses ? 'دوره‌های آموزشی' : 'رویدادها، همایش‌ها و فراخوان‌ها';
  useTitle(title, courses ? 'دوره‌ها و کارگاه‌های آموزشی دانشجویی' : 'رویدادها و همایش‌های دانشجویی دانشگاه شمال');
  const [when, setWhen] = useState<'upcoming' | 'past'>('upcoming');
  const [page, setPage] = useState(1);
  const kinds: Kind[] = courses ? ['Course'] : ['Event', 'Conference', 'Call'];
  const q = useQuery({ queryKey: ['events', courses, when, page], queryFn: () => listEvents({ page, kinds, when }), placeholderData: keepPreviousData });
  const rows = (q.data?.events as Row[]) ?? [];

  return (
    <>
      <PageHero image={courses ? "/shomal/ai-library.webp" : "/shomal/ai-lab.webp"} title={title} subtitle={courses ? 'کارگاه‌ها و دوره‌هایی که انجمن‌ها و واحدهای دانشگاه برگزار می‌کنند.' : 'برنامه رویدادهای علمی، فرهنگی و فراخوان‌های دانشجویی.'} />
      <div className="container-page py-10">
        <Tabs value={when} onValueChange={(v) => { setWhen(v as 'upcoming' | 'past'); setPage(1); }} className="mb-8">
          <TabsList><TabsTrigger value="upcoming">پیش رو</TabsTrigger><TabsTrigger value="past">برگزارشده</TabsTrigger></TabsList>
        </Tabs>
        {q.isError ? <ErrorState onRetry={() => q.refetch()} /> : q.isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>
        ) : rows.length === 0 ? <EmptyState title={when === 'upcoming' ? 'برنامه‌ای در پیش نیست' : 'موردی یافت نشد'} text="به‌محض انتشار، اینجا نمایش داده می‌شود." /> : (
          <div className="grid gap-4 md:grid-cols-2">{rows.map((e) => <EventCard key={String(e.id)} e={e} />)}</div>
        )}
        <Pagination page={page} pages={Number(q.data?.pages ?? 1)} onChange={setPage} />
      </div>
    </>
  );
}
