import { MajorChip } from '../lib/majorIcon';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getStructure, GetStructureOutputType } from 'zitejs/api';
import { Skeleton } from '@project/components/ui/skeleton';
import { Badge } from '@project/components/ui/badge';
import { UserRound, AlertTriangle } from 'lucide-react';
import { cn } from '@project/components/lib/utils';
import { EmptyState, ErrorState, PageHero } from '../components/site/ui';
import { useTitle } from '../lib/useTitle';

type Year = GetStructureOutputType['years'][0];
type Leader = Year['associations'][0]['leaders'][0];

const STATUS: Record<string, string> = { Undetermined: 'تعیین‌نشده', Active: 'فعال', Ended: 'پایان‌یافته', Resigned: 'مستعفی' };

function Holder({ l }: { l: Leader }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <UserRound className="h-4 w-4 shrink-0 text-primary" aria-hidden />
      <span className="text-muted-foreground">دبیر انجمن:</span>
      <span className="font-medium">{l.holder ?? STATUS[l.status] ?? 'تعیین‌نشده'}</span>
    </div>
  );
}

function YearChart({ year }: { year: Year }) {
  const byFaculty = new Map<string, Year['associations']>();
  for (const a of year.associations) {
    const k = a.faculty ?? 'سایر';
    byFaculty.set(k, [...(byFaculty.get(k) ?? []), a]);
  }
  return (
    <div className="space-y-10">
      {[...byFaculty.entries()].map(([faculty, list]) => (
        <section key={faculty} aria-labelledby={`f-${faculty}`}>
          <h3 id={`f-${faculty}`} className="mb-4 border-s-4 border-primary ps-3 text-lg font-bold">{faculty}</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((a) => (
              <article key={a.id} className="flex flex-col gap-3 rounded-2xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
                <div className="flex items-start justify-between gap-2">
                  {a.slug ? <Link to={`/associations/${a.slug}`} className="font-bold hover:text-primary">{a.name}</Link> : <span className="font-bold">{a.name}</span>}
                  {a.needsApproval && (
                    <Badge variant="outline" className="shrink-0 gap-1 border-accent text-[11px]"><AlertTriangle className="h-3 w-3" aria-hidden />نیازمند تأیید دانشگاه</Badge>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {a.majors.map((m) => <MajorChip key={m} name={m} className="text-xs" />)}
                </div>
                <div className="mt-auto space-y-1 border-t pt-3">
                  {a.leaders[0] ? <Holder l={a.leaders[0]} /> : <span className="text-sm text-muted-foreground">دبیر انجمن: تعیین‌نشده</span>}
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export default function Structure() {
  useTitle('ساختار انجمن‌ها', 'نمودار سازمانی سال‌به‌سال انجمن‌های علمی دانشجویی دانشگاه شمال');
  const q = useQuery({ queryKey: ['structure'], queryFn: () => getStructure({}) });
  const years = q.data?.years ?? [];
  const [sel, setSel] = useState<string>();
  useEffect(() => {
    if (!sel && years.length) setSel((years.find((y) => y.status === 'Current') ?? years[0]).id);
  }, [years, sel]);
  const year = years.find((y) => y.id === sel);
  return (
    <>
      <PageHero title="ساختار انجمن‌ها" subtitle="دبیر هر انجمن علمی در هر سال تحصیلی؛ هر رشته در انتخابات انجمن مربوط به خود رأی می‌دهد." />
      <div className="container mx-auto px-4 py-10">
        {q.isError ? <ErrorState onRetry={() => q.refetch()} /> : q.isLoading ? <Skeleton className="h-96 rounded-3xl" /> : !years.length ? <EmptyState title="ساختاری ثبت نشده است" /> : (
          <>
            <div role="tablist" aria-label="سال تحصیلی" className="mb-8 flex flex-wrap gap-2">
              {years.map((y) => (
                <button key={y.id} role="tab" aria-selected={y.id === sel} onClick={() => setSel(y.id)}
                  className={cn('rounded-full border px-4 py-2 text-sm font-medium transition-colors', y.id === sel ? 'border-primary bg-primary text-primary-foreground' : 'bg-card hover:bg-muted')}>
                  {y.title}{y.status === 'Current' ? ' (جاری)' : y.status === 'Archived' ? ' (بایگانی)' : ''}
                </button>
              ))}
            </div>
            {year && <YearChart year={year} />}
            <p className="mt-10 text-xs text-muted-foreground">نام افراد فقط پس از رضایت و فعال‌شدن انتشار توسط مدیر نمایش داده می‌شود.</p>
          </>
        )}
      </div>
    </>
  );
}
