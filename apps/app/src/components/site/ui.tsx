import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AlertTriangle, ChevronLeft, ChevronRight, Inbox } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { cn } from '@project/components/lib/utils';
import { faNum } from '../../lib/format';

export function Cover({ src, alt, label, className }: { src?: unknown; alt: string; label?: string; className?: string }) {
  if (src) return <img src={String(src)} alt={alt} loading="lazy" className={cn('h-full w-full object-cover', className)} />;
  return (
    <div className={cn('pattern-forest flex h-full w-full items-center justify-center', className)} role="img" aria-label={alt}>
      <span className="text-3xl font-black text-primary-foreground/80">{(label ?? alt).trim().slice(0, 2)}</span>
    </div>
  );
}

export function SectionHeading({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="mb-2 text-sm font-semibold text-accent">{eyebrow}</p>}
        <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function PageHero({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <section className="pattern-forest text-primary-foreground">
      <div className="container-page py-14 sm:py-20">
        <h1 className="text-3xl font-black sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-3 max-w-2xl text-primary-foreground/80 leading-8">{subtitle}</p>}
        {children}
      </div>
    </section>
  );
}

export function EmptyState({ title, text, action }: { title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed bg-card px-6 py-14 text-center">
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
