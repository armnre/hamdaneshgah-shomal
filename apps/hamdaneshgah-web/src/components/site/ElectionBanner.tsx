import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeft, Vote, CalendarClock, Users, Building2 } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { listPublicElections } from '../../lib/api';
import { useNow } from './ElectionUI';
import { faDate, faNum } from '../../lib/format';

/** Clean campaign banner for upcoming / open elections, under the home hero. */
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
    <section className="container-page relative z-10 mt-10" aria-label="انتخابات انجمن‌های علمی">
      <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-3xl bg-primary text-primary-foreground shadow-xl">
        <div aria-hidden className="girih-gold absolute inset-0 opacity-[0.06]" />
        <div className="relative grid gap-8 p-6 sm:p-10 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/10 px-3 py-1 text-xs font-semibold">
              <span className={`h-2 w-2 rounded-full ${open ? 'bg-accent motion-safe:animate-pulse' : 'bg-primary-foreground/60'}`} />
              {open ? 'رأی‌گیری هم‌اکنون باز است' : 'انتخابات پیش رو'}
            </span>
            <h2 className="font-display mt-4 text-3xl font-black leading-[1.4] sm:text-4xl">انتخابات انجمن‌های علمی <span className="text-accent">۱۴۰۵</span></h2>
            <p className="mt-2 max-w-lg leading-8 text-primary-foreground/80">نامزدهای انجمن رشته‌ات را بشناس و با شماره دانشجویی رأی بده.</p>
            <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-primary-foreground/85">
              <li className="flex items-center gap-1.5"><Building2 className="h-4 w-4 text-accent" aria-hidden />{faNum(live.length)} انجمن</li>
              <li className="flex items-center gap-1.5"><Users className="h-4 w-4 text-accent" aria-hidden />{faNum(cands)} نامزد</li>
              {start && <li className="flex items-center gap-1.5"><CalendarClock className="h-4 w-4 text-accent" aria-hidden />{faDate(start, true)}</li>}
            </ul>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild size="lg" className="h-12 rounded-full bg-accent px-7 font-bold text-accent-foreground hover:bg-accent/90">
                <Link to={open ? '/vote' : '/elections'}>{open ? <><Vote className="ms-2 h-5 w-5" />ورود به رأی‌گیری</> : <>مشاهده‌ی انتخابات<ArrowLeft className="me-2 h-4 w-4" /></>}</Link>
              </Button>
              {open && <Button asChild size="lg" variant="ghost" className="h-12 rounded-full px-5 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"><Link to="/elections">نامزدها</Link></Button>}
            </div>
          </div>
          {target && <BigCountdown to={target} label={open ? 'تا پایان رأی‌گیری' : 'تا شروع رأی‌گیری'} />}
        </div>
      </motion.div>
    </section>
  );
}

function BigCountdown({ to, label }: { to: string; label: string }) {
  const now = useNow();
  const left = Math.max(0, new Date(to).getTime() - now);
  const parts: [number, string][] = [[Math.floor(left / 864e5), 'روز'], [Math.floor(left / 36e5) % 24, 'ساعت'], [Math.floor(left / 6e4) % 60, 'دقیقه'], [Math.floor(left / 1e3) % 60, 'ثانیه']];
  return (
    <div className="rounded-2xl bg-primary-foreground/[0.07] p-5 ring-1 ring-primary-foreground/10">
      <p className="mb-3 text-center text-xs text-primary-foreground/70">{label}</p>
      <div className="flex justify-center gap-2" aria-live="off">
        {parts.map(([v, u]) => (
          <div key={u} className="w-16 rounded-xl bg-primary-foreground py-2.5 text-center text-primary">
            <span className="block text-2xl font-black tabular-nums leading-none">{faNum(v)}</span>
            <span className="mt-1 block text-[10px] text-muted-foreground">{u}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
