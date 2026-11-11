import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeft, Vote, CalendarClock, Users, Building2 } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { listPublicElections } from '../../lib/api';
import { useNow } from './ElectionUI';
import { faDate, faNum } from '../../lib/format';

/** Election campaign banner shown under the home hero. */
export function ElectionBanner() {
  const q = useQuery({ queryKey: ['publicElections'], queryFn: () => listPublicElections({}) });
  const live = (q.data?.elections ?? []).filter((e) => !e.isDemo && ['Final List', 'Voting Open'].includes(e.status));
  if (!live.length) return null;
  const open = live.some((e) => e.votingOpenNow);
  const start = live.map((e) => e.votingStart).filter(Boolean).sort()[0];
  const end = live.map((e) => e.votingEnd).filter(Boolean).sort().slice(-1)[0];
  const cands = live.reduce((n, e) => n + e.candidates.length, 0);
  const target = open ? end : start;
  return (
    <section className="container-page relative z-10 mt-8 sm:mt-12" aria-label="انتخابات انجمن‌های علمی">
      <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}
        className="relative isolate overflow-hidden rounded-3xl bg-primary text-primary-foreground shadow-xl">
        <div aria-hidden className="absolute -start-20 -top-20 -z-10 h-64 w-64 rounded-full bg-accent/25 blur-3xl" />
        <div aria-hidden className="girih-gold absolute inset-0 -z-10 opacity-[0.07]" />
        <div className="grid gap-7 p-5 sm:p-10 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-12">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/10 px-3 py-1 text-xs font-semibold ring-1 ring-primary-foreground/15">
              <span className={`h-2 w-2 rounded-full ${open ? 'bg-accent motion-safe:animate-pulse' : 'bg-accent/70'}`} />
              {open ? 'رأی‌گیری هم‌اکنون باز است' : 'انتخابات پیش رو'}
            </span>
            <h2 className="font-display mt-4 text-2xl font-black leading-[1.5] sm:text-4xl">
              صدای تو، آینده‌ی انجمنت
              <span className="mt-1 block text-lg font-bold text-accent sm:text-2xl">انتخابات انجمن‌های علمی ۱۴۰۵</span>
            </h2>
            <div className="mt-5 flex flex-wrap gap-2 text-sm">
              <Chip icon={Building2}>{faNum(live.length)} انجمن</Chip>
              <Chip icon={Users}>{faNum(cands)} نامزد</Chip>
              {start && <Chip icon={CalendarClock}>{faDate(start)}</Chip>}
            </div>
            <div className="mt-6 grid gap-2 sm:flex sm:gap-3">
              <Button asChild size="lg" className="h-12 rounded-full bg-accent px-7 font-bold text-accent-foreground shadow-lg hover:bg-accent/90">
                <Link to={open ? '/vote' : '/elections'}>{open ? <><Vote className="ms-2 h-5 w-5" />ورود به رأی‌گیری</> : <>مشاهده‌ی نامزدها<ArrowLeft className="me-2 h-4 w-4" /></>}</Link>
              </Button>
            </div>
          </div>
          {target && <BigCountdown to={target} label={open ? 'تا پایان رأی‌گیری' : 'تا شروع رأی‌گیری'} sub={start ? `${faDate(start, true)} تا ${faDate(end, true)}` : undefined} />}
        </div>
      </motion.div>
    </section>
  );
}

function Chip({ icon: Icon, children }: { icon: typeof Users; children: React.ReactNode }) {
  return <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-foreground/10 px-3 py-1.5"><Icon className="h-4 w-4 text-accent" aria-hidden />{children}</span>;
}

function BigCountdown({ to, label, sub }: { to: string; label: string; sub?: string }) {
  const now = useNow();
  const left = Math.max(0, new Date(to).getTime() - now);
  const parts: [number, string][] = [[Math.floor(left / 864e5), 'روز'], [Math.floor(left / 36e5) % 24, 'ساعت'], [Math.floor(left / 6e4) % 60, 'دقیقه'], [Math.floor(left / 1e3) % 60, 'ثانیه']];
  return (
    <div className="rounded-2xl bg-primary-foreground/[0.08] p-4 ring-1 ring-primary-foreground/15 sm:p-6">
      <p className="text-center text-sm font-semibold text-primary-foreground/85">{label}</p>
      <div className="mt-3 grid grid-cols-4 gap-2 sm:gap-3" aria-live="off">
        {parts.map(([v, u]) => (
          <div key={u} className="rounded-xl bg-card px-1 py-3 text-center text-card-foreground shadow-md">
            <span className="block text-2xl font-black tabular-nums leading-none text-primary sm:text-4xl">{faNum(v)}</span>
            <span className="mt-1.5 block text-[11px] text-muted-foreground sm:text-xs">{u}</span>
          </div>
        ))}
      </div>
      {sub && <p className="mt-3 text-center text-xs text-primary-foreground/70">{sub}</p>}
    </div>
  );
}
