import { Link } from 'react-router-dom';
import { Calendar, MapPin, ArrowLeft } from 'lucide-react';
import { Badge } from '@project/components/ui/badge';
import { Cover } from './ui';
import { faDate, faDayMonth, KIND_LABEL } from '../../lib/format';

type Row = Record<string, unknown>;
const s = (v: unknown) => (v == null ? '' : String(v));

export function NewsCard({ n, large }: { n: Row; large?: boolean }) {
  return (
    <Link to={`/news/${s(n.slug)}`} className="group flex flex-col overflow-hidden rounded-2xl border bg-card shadow-[var(--shadow-sm)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]">
      <div className={large ? 'aspect-[16/9]' : 'aspect-[16/10]'}><Cover src={n.coverUrl} alt={s(n.title)} /></div>
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {Boolean(n.isAnnouncement) && <Badge className="bg-accent text-accent-foreground hover:bg-accent">اطلاعیه</Badge>}
          {Boolean(n.categoryName) && <Badge variant="secondary">{s(n.categoryName)}</Badge>}
          <span>{faDate(n.publishAt)}</span>
        </div>
        <h3 className={`font-bold leading-8 group-hover:text-primary ${large ? 'text-xl' : ''}`}>{s(n.title)}</h3>
        {Boolean(n.excerpt) && <p className="mt-2 line-clamp-2 text-sm leading-7 text-muted-foreground">{s(n.excerpt)}</p>}
      </div>
    </Link>
  );
}

export function EventCard({ e }: { e: Row }) {
  const { day, month } = faDayMonth(e.startAt);
  return (
    <Link to={`/events/${s(e.slug)}`} className="group flex gap-4 rounded-2xl border bg-card p-4 transition hover:border-primary/40 hover:shadow-[var(--shadow-md)]">
      <div className="flex w-16 shrink-0 flex-col items-center justify-center girih-gold rounded-md bg-primary py-3 text-primary-foreground ring-1 ring-accent/50 ring-offset-2 ring-offset-card">
        <span className="font-display text-2xl font-bold leading-none">{day}</span>
        <span className="mt-1 text-xs font-semibold">{month}</span>
      </div>
      <div className="min-w-0 flex-1">
        <Badge variant="outline" className="mb-2 border-accent/50 text-xs">{KIND_LABEL[s(e.kind)] ?? 'رویداد'}</Badge>
        <h3 className="font-bold leading-7 group-hover:text-primary">{s(e.title)}</h3>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{faDate(e.startAt, true)}</span>
          {Boolean(e.location) && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{s(e.location)}</span>}
        </div>
      </div>
    </Link>
  );
}

export function AssociationCard({ a }: { a: Row }) {
  return (
    <Link to={`/associations/${s(a.slug)}`} className="group flex flex-col overflow-hidden rounded-2xl border bg-card transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]">
      <div className="relative aspect-[16/7]">
        <Cover src={a.coverUrl} alt={s(a.name)} label="انجمن" />
        <div className="absolute -bottom-6 end-5 h-14 w-14 overflow-hidden rounded-xl border-4 border-card bg-card">
          <Cover src={a.logoUrl} alt={`لوگوی ${s(a.name)}`} label={s(a.name).replace('انجمن علمی', '')} className="text-lg" />
        </div>
      </div>
      <div className="flex flex-1 flex-col p-5 pt-9">
        <h3 className="font-bold leading-7 group-hover:text-primary">{s(a.name)}</h3>
        {Boolean(a.facultyName) && <p className="mt-1 text-xs text-muted-foreground">{s(a.facultyName)}{a.majorName ? ` · ${s(a.majorName)}` : ''}</p>}
        {Boolean(a.shortDescription) && <p className="mt-3 line-clamp-2 text-sm leading-7 text-muted-foreground">{s(a.shortDescription)}</p>}
        <span className="mt-auto flex items-center gap-1 pt-4 text-sm font-semibold text-primary">مشاهده انجمن <ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-1" /></span>
      </div>
    </Link>
  );
}
