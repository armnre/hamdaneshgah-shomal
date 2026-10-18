import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AlertTriangle, ChevronLeft, ChevronRight, Inbox } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { cn } from '@project/components/lib/utils';
import { faNum } from '../../lib/format';
import { IMG, fallbackPhoto } from '../../lib/brand';
import { Shamseh } from './Ornaments';

export function Cover({ src, alt, label, className }: { src?: unknown; alt: string; label?: string; className?: string }) {
  if (src) return <img src={String(src)} alt={alt} loading="lazy" className={cn('h-full w-full object-cover', className)} />;
  return (
    <div className={cn('relative h-full w-full overflow-hidden bg-primary', className)} role="img" aria-label={alt}>
      <img src={fallbackPhoto(alt)} alt="" loading="lazy" className="h-full w-full object-cover opacity-60 mix-blend-luminosity" />
      <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/40 to-transparent" />
      {label && <span className="absolute bottom-3 end-3 rounded-full bg-background/90 px-2.5 py-0.5 text-[11px] font-bold text-primary">{label.trim().slice(0, 18)}</span>}
    </div>
  );
}

export function SectionHeading({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: ReactNode }) {
  return (
    <div className="mb-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          {eyebrow && <p className="mb-3 flex items-center gap-2 text-xs font-bold tracking-wide text-accent"><Shamseh className="h-3.5 w-3.5" />{eyebrow}</p>}
          <h2 className="font-display text-2xl font-bold leading-snug sm:text-[2rem]">{title}</h2>
        </div>
        {action}
      </div>
      <div aria-hidden className="mt-5 flex items-center gap-2"><span className="h-[3px] w-12 bg-accent" /><span className="h-px flex-1 bg-border" /></div>
    </div>
  );
}

export function PageHero({ title, subtitle, children, image = IMG.campusAlt }: { title: string; subtitle?: string; children?: ReactNode; image?: string }) {
  return (
    <section className="relative isolate overflow-hidden bg-primary text-primary-foreground">
      <img src={image} alt="" className="absolute inset-0 -z-30 h-full w-full object-cover opacity-35 mix-blend-luminosity" />
      <div className="absolute inset-0 -z-20 bg-gradient-to-l from-primary via-primary/85 to-primary/40" />
      <div aria-hidden className="girih-gold absolute inset-y-0 end-0 -z-10 w-1/2 opacity-70 [mask-image:linear-gradient(to_right,black,transparent)]" />
      <div aria-hidden className="pointer-events-none absolute inset-3 -z-10 border border-accent/25 sm:inset-5" />
      <div className="container-page relative py-16 sm:py-24">
        <div className="mb-5 flex items-center gap-3 text-xs font-bold tracking-wide text-accent"><Shamseh className="h-4 w-4" />دانشگاه شمال<span className="h-px w-16 bg-accent/60" /></div>
        <h1 className="font-display max-w-3xl text-3xl font-bold leading-snug sm:text-[2.8rem] sm:leading-[1.4]">{title}</h1>
        {subtitle && <p className="mt-5 max-w-2xl leading-8 text-primary-foreground/80">{subtitle}</p>}
        {children}
      </div>
      <div aria-hidden className="h-1.5 bg-accent" />
    </section>
  );
}

export function EmptyState({ title, text, action }: { title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center girih-ink rounded-lg border border-dashed bg-card px-6 py-14 text-center">
      <div className="mb-4 rounded-full bg-secondary p-4 text-primary"><Inbox className="h-6 w-6" /></div>
      <p className="font-bold">{title}</p>
      {text && <p className="mt-2 max-w-md text-sm text-muted-foreground leading-7">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ text, onRetry }: { text?: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center rounded-2xl border border-destructive/30 bg-destructive/5 px-6 py-12 text-center">
      <AlertTriangle className="mb-3 h-7 w-7 text-destructive" />
      <p className="font-bold">بارگذاری اطلاعات ممکن نشد</p>
      <p className="mt-1 text-sm text-muted-foreground">{text ?? 'اتصال به سرور برقرار نشد.'}</p>
      {onRetry && <Button variant="outline" className="mt-4" onClick={onRetry}>تلاش دوباره</Button>}
    </div>
  );
}

export function Pagination({ page, pages, onChange }: { page: number; pages: number; onChange: (p: number) => void }) {
  if (pages <= 1) return null;
  return (
    <nav aria-label="صفحه‌بندی" className="mt-10 flex items-center justify-center gap-3">
      <Button variant="outline" size="icon" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="صفحه قبل"><ChevronRight className="h-4 w-4" /></Button>
      <span className="text-sm text-muted-foreground">صفحه {faNum(page)} از {faNum(pages)}</span>
      <Button variant="outline" size="icon" disabled={page >= pages} onClick={() => onChange(page + 1)} aria-label="صفحه بعد"><ChevronLeft className="h-4 w-4" /></Button>
    </nav>
  );
}

export function Md({ children }: { children?: unknown }) {
  return <div className="prose-fa"><ReactMarkdown remarkPlugins={[remarkGfm]}>{String(children ?? '')}</ReactMarkdown></div>;
}

export function Crumbs({ items }: { items: { to?: string; label: string }[] }) {
  return (
    <nav aria-label="مسیر" className="mb-6 flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
      {items.map((it, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <ChevronLeft className="h-3 w-3" />}
          {it.to ? <Link to={it.to} className="hover:text-foreground">{it.label}</Link> : <span className="text-foreground">{it.label}</span>}
        </span>
      ))}
    </nav>
  );
}
