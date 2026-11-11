import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeft, Vote, Sparkles, CalendarClock } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { listPublicElections } from '../../lib/api';
import { CandidateAvatar } from './CandidateAvatar';
import { Countdown } from './ElectionUI';
import { faDate, faNum } from '../../lib/format';

/** Campaign banner for the upcoming / open elections, shown right under the home hero. */
export function ElectionBanner() {
  const q = useQuery({ queryKey: ['publicElections'], queryFn: () => listPublicElections({}) });
  const live = (q.data?.elections ?? []).filter((e) => !e.isDemo && ['Final List', 'Voting Open'].includes(e.status));
  if (!live.length) return null;
  const open = live.some((e) => e.votingOpenNow);
  const start = live.map((e) => e.votingStart).filter(Boolean).sort()[0];
  const end = live.map((e) => e.votingEnd).filter(Boolean).sort()[0];
  const cands = live.flatMap((e) => e.candidates);
  return (
    <section className="container-page relative z-10 mt-8 sm:mt-10" aria-label="تبلیغ انتخابات">
      <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
        className="relative overflow-hidden rounded-[2rem] bg-primary p-6 text-primary-foreground shadow-2xl sm:p-10">
        <div aria-hidden className="absolute -end-24 -top-24 h-72 w-72 rounded-full bg-accent/30 blur-3xl" />
        <div aria-hidden className="absolute -bottom-32 start-10 h-72 w-72 rounded-full bg-primary-foreground/10 blur-3xl" />
        <div aria-hidden className="girih-gold absolute inset-0 opacity-10" />
        <div className="relative grid gap-8 lg:grid-cols-[1.3fr_1fr] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-bold text-accent-foreground">
              <Sparkles className="h-3.5 w-3.5" />{open ? 'رأی‌گیری هم‌اکنون باز است' : 'انتخابات پیش رو'}
            </span>
            <h2 className="font-display mt-4 text-2xl font-black leading-[1.5] sm:text-4xl">
              صدای تو، آینده‌ی انجمنت.<br /><span className="text-accent">انتخابات انجمن‌های علمی ۱۴۰۵</span>
            </h2>
            <p className="mt-3 max-w-xl leading-8 text-primary-foreground/80">
              {faNum(cands.length)} نامزد در {faNum(live.length)} انجمن علمی. برنامه‌ها را ببین، نامزدت را بشناس و در روز رأی‌گیری با شماره دانشجویی رأی بده.
            </p>
            {start && <p className="mt-4 flex items-center gap-2 text-sm text-primary-foreground/75"><CalendarClock className="h-4 w-4 text-accent" />{faDate(start, true)} تا {faDate(end, true)}</p>}
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild size="lg" className="h-12 rounded-full bg-accent px-6 text-accent-foreground hover:bg-accent/90">
                <Link to={open ? '/vote' : '/elections'}>{open ? <><Vote className="ms-2 h-5 w-5" />ورود به رأی‌گیری</> : <>مشاهده‌ی نامزدها<ArrowLeft className="me-2 h-4 w-4" /></>}</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 rounded-full border-primary-foreground/30 bg-transparent px-6 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
                <Link to="/elections#candidates">همه‌ی نامزدها</Link>
              </Button>
            </div>
          </div>
          <div className="space-y-5 rounded-3xl border border-primary-foreground/15 bg-primary-foreground/5 p-5 backdrop-blur">
            {!open && start && <Countdown to={start} label="تا شروع رأی‌گیری:" />}
            {open && end && <Countdown to={end} label="تا پایان رأی‌گیری:" />}
            <div className="flex -space-x-3 space-x-reverse">
              {cands.slice(0, 9).map((c) => <CandidateAvatar key={c.id} name={c.fullName} photoUrl={c.photoUrl} className="h-11 w-11 text-sm ring-2 ring-primary" />)}
              {cands.length > 9 && <span className="grid h-11 w-11 place-items-center rounded-full bg-accent text-xs font-bold text-accent-foreground ring-2 ring-primary">+{faNum(cands.length - 9)}</span>}
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
