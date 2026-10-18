import { Link } from 'react-router-dom';
import { ArrowLeft, CalendarClock, Users, Vote, FlaskConical, Armchair } from 'lucide-react';
import type { ListPublicElectionsOutputType } from 'zitejs/api';
import { Button } from '@project/components/ui/button';
import { StageTimeline, Countdown } from './ElectionUI';
import { faDate, faNum } from '../../lib/format';

export type Election = ListPublicElectionsOutputType['elections'][0];

export const STAGE: Record<string, string> = {
  'Candidacy Open': 'ثبت‌نام نامزدها', 'Candidate Review': 'بررسی صلاحیت نامزدها', 'Final List': 'فهرست نهایی نامزدها',
  'Voting Open': 'رأی‌گیری', Closed: 'پایان رأی‌گیری — در انتظار اعلام نتایج', Counting: 'در حال شمارش',
  'Results Confirmed': 'نتایج تأیید شد', 'Results Published': 'نتایج اعلام شد', Archived: 'بایگانی‌شده',
};

export function DemoBadge({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border border-accent/50 bg-accent/15 px-2 py-0.5 text-[11px] font-bold text-accent-foreground ${className}`}>
      <FlaskConical className="h-3 w-3" aria-hidden />نمایشی
    </span>
  );
}

export function ElectionCard({ e }: { e: Election }) {
  const live = e.status === 'Voting Open';
  return (
    <Link to={`/elections/${e.id}`} className="group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-card p-6 shadow-[var(--shadow-sm)] transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[var(--shadow-md)] motion-reduce:transition-none motion-reduce:hover:translate-y-0">
      {live && <span className="absolute inset-x-0 top-0 h-1 bg-primary" />}
      <div className="flex items-center justify-between gap-3">
        <span className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${live ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'}`}>
            {live && <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground motion-safe:animate-pulse" />}{STAGE[e.status] ?? e.status}
          </span>
          {e.isDemo && <DemoBadge />}
        </span>
        <ArrowLeft className="h-4 w-4 text-muted-foreground transition group-hover:-translate-x-1 group-hover:text-primary" aria-hidden />
      </div>
      <h3 className="mt-3 text-lg font-extrabold leading-8">{e.title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{[e.association, e.academicYear && `سال تحصیلی ${e.academicYear}`].filter(Boolean).join(' · ')}</p>
      <div className="mt-5"><StageTimeline status={e.status} compact /></div>
      <div className="mt-auto flex flex-wrap gap-x-4 gap-y-1 pt-4 text-sm text-muted-foreground">
        {e.votingStart && <span className="flex items-center gap-1.5"><CalendarClock className="h-4 w-4 text-primary" aria-hidden />{faDate(e.votingStart, true)} تا {faDate(e.votingEnd, true)}</span>}
        <span className="flex items-center gap-1.5"><Users className="h-4 w-4 text-primary" aria-hidden />{faNum(e.candidates.length)} نامزد</span>
        <span className="flex items-center gap-1.5"><Armchair className="h-4 w-4 text-primary" aria-hidden />{faNum(e.seats)} کرسی</span>
      </div>
    </Link>
  );
}

/** Home-page feature: the live election up front, otherwise upcoming + archive. */
export function HomeElections({ list }: { list: Election[] }) {
  const live = list.find((e) => e.status === 'Voting Open');
  const rest = list.filter((e) => e !== live).slice(0, live ? 2 : 3);
  return (
    <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
      {live ? (
        <div className="relative overflow-hidden rounded-3xl bg-primary p-7 text-primary-foreground sm:p-9">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-foreground/15 px-3 py-1 text-xs font-bold"><span className="h-1.5 w-1.5 rounded-full bg-accent motion-safe:animate-pulse" />رأی‌گیری در جریان است</span>
            {live.isDemo && <DemoBadge />}
          </div>
          <h3 className="mt-4 text-2xl font-black leading-10 sm:text-3xl">{live.title}</h3>
          <p className="mt-2 text-primary-foreground/80">{live.association}</p>
          <div className="mt-6 rounded-2xl bg-primary-foreground/10 p-4 [&_*]:text-primary-foreground">{live.votingEnd && <Countdown to={live.votingEnd} label="تا پایان رأی‌گیری:" />}</div>
          <div className="mt-6 flex flex-wrap gap-3">
            {live.votingOpenNow
              ? <Button asChild size="lg" variant="secondary"><Link to={`/vote?e=${live.id}`}><Vote className="ms-2 h-5 w-5" />ورود به رأی‌گیری</Link></Button>
              : <span className="rounded-lg bg-primary-foreground/10 px-4 py-2 text-sm">رأی‌گیری نمایشی — امکان رأی‌دادن ندارد</span>}
            <Button asChild size="lg" variant="ghost" className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"><Link to={`/elections/${live.id}`}>نامزدها و جزئیات</Link></Button>
          </div>
        </div>
      ) : (
        <div className="rounded-3xl border bg-card p-7 sm:p-9">
          <Vote className="h-8 w-8 text-primary" aria-hidden />
          <h3 className="mt-4 text-xl font-extrabold">در حال حاضر رأی‌گیری فعالی نیست</h3>
          <p className="mt-3 leading-8 text-muted-foreground">زمان‌بندی انتخابات آینده و نتایج انتخابات گذشته در بخش انتخابات منتشر می‌شود.</p>
          <Button asChild variant="outline" className="mt-5"><Link to="/elections">همه‌ی انتخابات</Link></Button>
        </div>
      )}
      <div className="grid gap-4">{rest.map((e) => <ElectionCard key={e.id} e={e} />)}</div>
    </div>
  );
}
