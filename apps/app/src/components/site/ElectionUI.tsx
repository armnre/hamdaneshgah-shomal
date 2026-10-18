import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@project/components/lib/utils';
import { faNum } from '../../lib/format';

const STEPS = [
  { key: ['Candidacy Open'], label: 'ثبت‌نام' },
  { key: ['Candidate Review'], label: 'بررسی' },
  { key: ['Final List'], label: 'فهرست نهایی' },
  { key: ['Voting Open'], label: 'رأی‌گیری' },
  { key: ['Closed', 'Counting', 'Results Confirmed'], label: 'شمارش' },
  { key: ['Results Published', 'Archived'], label: 'نتایج' },
];

/** Horizontal stage timeline — where this election is in its lifecycle. */
export function StageTimeline({ status, compact }: { status: string; compact?: boolean }) {
  const cur = STEPS.findIndex((s) => s.key.includes(status));
  return (
    <ol className="flex items-center gap-1" aria-label="مراحل انتخابات">
      {STEPS.map((s, i) => {
        const done = i < cur, now = i === cur;
        return (
          <li key={s.label} className="flex flex-1 items-center gap-1" aria-current={now ? 'step' : undefined}>
            <div className="flex min-w-0 flex-col items-center gap-1">
              <span className={cn('grid h-6 w-6 shrink-0 place-items-center rounded-full border text-[10px] font-bold transition',
                done && 'border-primary bg-primary text-primary-foreground',
                now && 'border-primary bg-primary/10 text-primary ring-4 ring-primary/15',
                !done && !now && 'border-border bg-muted text-muted-foreground')}>
                {done ? <Check className="h-3.5 w-3.5" /> : faNum(i + 1)}
              </span>
              {!compact && <span className={cn('whitespace-nowrap text-[11px]', now ? 'font-bold text-primary' : 'hidden text-muted-foreground sm:block')}>{s.label}</span>}
            </div>
            {i < STEPS.length - 1 && <span className={cn('h-0.5 flex-1 rounded-full', i < cur ? 'bg-primary' : 'bg-border', !compact && '-mt-5')} />}
          </li>
        );
      })}
    </ol>
  );
}

export function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(t); }, [ms]);
  return now;
}

/** Live countdown to a timestamp (display only — the server decides what is open). */
export function Countdown({ to, label }: { to: string; label: string }) {
  const now = useNow();
  const left = Math.max(0, new Date(to).getTime() - now);
  const d = Math.floor(left / 864e5), h = Math.floor(left / 36e5) % 24, m = Math.floor(left / 6e4) % 60, s = Math.floor(left / 1e3) % 60;
  const parts = [d ? [d, 'روز'] : null, [h, 'ساعت'], [m, 'دقیقه'], [s, 'ثانیه']].filter(Boolean) as [number, string][];
  return (
    <div className="flex flex-wrap items-center gap-3" aria-live="off">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex gap-1.5">
        {parts.map(([v, u]) => (
          <span key={u} className="min-w-[3rem] rounded-2xl border bg-background px-2 py-1.5 text-center shadow-[var(--shadow-sm)] sm:min-w-[3.5rem]">
            <span className="block text-lg font-black tabular-nums leading-none">{faNum(v)}</span>
            <span className="text-[10px] text-muted-foreground">{u}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/** Small session timer for the ballot step. */
export function SessionTimer({ expiresAt, onExpire }: { expiresAt: string; onExpire: () => void }) {
  const now = useNow();
  const left = Math.max(0, new Date(expiresAt).getTime() - now);
  useEffect(() => { if (left === 0) onExpire(); }, [left, onExpire]);
  const m = Math.floor(left / 6e4), s = Math.floor(left / 1e3) % 60;
  return (
    <span className={cn('rounded-full px-3 py-1 text-xs font-bold tabular-nums', m < 3 ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary')}>
      {faNum(m)}:{s.toLocaleString('fa-IR', { minimumIntegerDigits: 2 })} باقی‌مانده
    </span>
  );
}
