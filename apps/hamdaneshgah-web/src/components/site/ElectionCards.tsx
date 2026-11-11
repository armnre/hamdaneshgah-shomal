import { Link } from 'react-router-dom';
import { ChevronLeft, FlaskConical } from 'lucide-react';
import type { ListPublicElectionsOutputType } from '../../lib/api';
import { faNum } from '../../lib/format';

export type Election = ListPublicElectionsOutputType['elections'][0];

export const STAGE: Record<string, string> = {
  'Candidacy Open': 'ثبت‌نام نامزدها', 'Candidate Review': 'بررسی صلاحیت', 'Final List': 'فهرست نهایی',
  'Voting Open': 'رأی‌گیری باز است', Closed: 'پایان رأی‌گیری', Counting: 'در حال شمارش',
  'Results Confirmed': 'نتایج تأیید شد', 'Results Published': 'نتایج اعلام شد', Archived: 'بایگانی‌شده',
};

export function DemoBadge({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border border-accent/50 bg-accent/15 px-2 py-0.5 text-[11px] font-bold text-accent-foreground ${className}`}>
      <FlaskConical className="h-3 w-3" aria-hidden />نمایشی
    </span>
  );
}

export function StatusPill({ status }: { status: string }) {
  const live = status === 'Voting Open';
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${live ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
      {live && <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground motion-safe:animate-pulse" />}{STAGE[status] ?? status}
    </span>
  );
}

/** Compact, single-row election item. */
export function ElectionCard({ e }: { e: Election }) {
  const name = (e.association ?? e.title).replace(/^انجمن علمی\s*/, '');
  return (
    <Link to={`/elections/${e.id}`} className="group flex items-center gap-4 rounded-xl border bg-card px-4 py-3.5 transition hover:border-primary/40 hover:bg-primary/[0.03]">
      <div className="min-w-0 flex-1">
        <h3 className="truncate font-bold">{name}</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">{faNum(e.candidates.length)} نامزد · {faNum(e.seats)} کرسی</p>
      </div>
      {e.isDemo && <DemoBadge />}
      <StatusPill status={e.status} />
      <ChevronLeft className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:-translate-x-0.5 group-hover:text-primary" aria-hidden />
    </Link>
  );
}
