import { MajorChip } from '../lib/majorIcon';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Building2, BookOpen, Users } from 'lucide-react';
import { listFaculties } from 'zitejs/api';
import { Skeleton } from '@project/components/ui/skeleton';
import { Badge } from '@project/components/ui/badge';
import { EmptyState, ErrorState, PageHero } from '../components/site/ui';
import { useTitle } from '../lib/useTitle';
import { facultyImage } from '../lib/brand';

type Row = Record<string, unknown>;

export default function Faculties() {
  useTitle('دانشکده‌ها و رشته‌ها', 'دانشکده‌ها و رشته‌های تحصیلی دانشگاه شمال آمل');
  const q = useQuery({ queryKey: ['faculties'], queryFn: () => listFaculties({}) });
  const rows = (q.data?.faculties as Row[]) ?? [];
  return (
    <>
      <PageHero title="دانشکده‌ها و رشته‌ها" subtitle="ساختار آموزشی و انجمن‌های علمی وابسته به هر دانشکده." />
      <div className="container-page grid gap-6 py-10">
        {q.isError ? <ErrorState onRetry={() => q.refetch()} /> : q.isLoading ? [1, 2, 3].map((i) => <Skeleton key={i} className="h-56 rounded-3xl" />) :
          rows.length === 0 ? <EmptyState title="دانشکده‌ای ثبت نشده است" /> : rows.map((f) => (
            <section key={String(f.id)} id={String(f.slug)} className="scroll-mt-24 grid overflow-hidden rounded-3xl border bg-card shadow-[var(--shadow-sm)] md:grid-cols-[280px_1fr]">
              <FacultyVisual name={String(f.name)} />
              <div className="p-6 sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h2 className="flex items-center gap-3 text-xl font-extrabold"><span className="rounded-xl bg-secondary p-2.5 text-primary"><Building2 className="h-5 w-5" /></span>{String(f.name)}</h2>
                {!f.verified && <Badge variant="outline" className="text-xs text-muted-foreground">در انتظار تطبیق با اطلاعات رسمی</Badge>}
              </div>
              {Boolean(f.description) && <p className="mt-4 leading-8 text-muted-foreground">{String(f.description)}</p>}
              <div className="mt-6 grid gap-6 md:grid-cols-2">
                <div>
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-muted-foreground"><BookOpen className="h-4 w-4" />رشته‌ها</h3>
                  <div className="flex flex-wrap gap-2">{(f.majors as Row[]).length ? (f.majors as Row[]).map((m) => <MajorChip key={String(m.id)} name={String(m.name)} />) : <span className="text-sm text-muted-foreground">—</span>}</div>
                </div>
                <div>
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-muted-foreground"><Users className="h-4 w-4" />انجمن‌های علمی</h3>
                  <div className="flex flex-wrap gap-2">{(f.associations as Row[]).length ? (f.associations as Row[]).map((a) => <Link key={String(a.slug)} to={`/associations/${a.slug}`} className="rounded-lg border px-3 py-1.5 text-sm hover:border-primary hover:text-primary">{String(a.name)}</Link>) : <span className="text-sm text-muted-foreground">هنوز انجمنی ثبت نشده</span>}</div>
                </div>
              </div>
              </div>
            </section>
          ))}
      </div>
    </>
  );
}

function FacultyVisual({ name }: { name: string }) {
  const img = facultyImage(name);
  return (
    <div className="relative flex min-h-48 items-center justify-center bg-secondary/60 p-6">
      {img ? <img src={img} alt={name} loading="lazy" className="max-h-48 w-full object-contain mix-blend-multiply" />
        : <Building2 className="h-16 w-16 text-primary/40" />}
    </div>
  );
}
