import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Vote, CheckCircle2, Loader2, ShieldCheck, Copy, Check, Lock, Sparkles, PartyPopper, Search, X, UserRoundX, CalendarClock, GraduationCap, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { listPublicElections, castVote, verifyVoter, findMyElection } from '../lib/api';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { Label } from '@project/components/ui/label';
import { Skeleton } from '@project/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@project/components/ui/alert-dialog';
import { cn } from '@project/components/lib/utils';
import { CandidateAvatar } from '../components/site/CandidateAvatar';
import { SessionTimer } from '../components/site/ElectionUI';
import type { Election } from '../components/site/ElectionCards';
import { useTitle } from '../lib/useTitle';
import { errMsg, faDate, faNum } from '../lib/format';

const FA = '۰۱۲۳۴۵۶۷۸۹', AR = '٠١٢٣٤٥٦٧٨٩';
/** Accepts Persian/Arabic digits and strips everything that is not a digit. */
export const digits = (s: string) => s.replace(/[۰-۹]/g, (d) => String(FA.indexOf(d))).replace(/[٠-٩]/g, (d) => String(AR.indexOf(d))).replace(/\D/g, '');

const LABELS = ['احراز هویت', 'انتخاب نامزد', 'کد پیگیری'];
function Steps({ step }: { step: 1 | 2 | 3 }) {
  return (
    <ol className="grid grid-cols-3 gap-2" aria-label={`مرحله‌ی ${faNum(step)} از ۳`}>
      {LABELS.map((l, i) => {
        const n = i + 1, done = n < step || step === 3, now = n === step;
        return (
          <li key={l} aria-current={now ? 'step' : undefined} className="space-y-1.5">
            <div className={cn('h-1.5 rounded-full transition-colors duration-500', done || now ? 'bg-primary' : 'bg-muted')} />
            <div className={cn('flex items-center gap-1.5 text-[11px] font-semibold sm:text-xs', now ? 'text-foreground' : 'text-muted-foreground')}>
              <span className={cn('grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px]', done ? 'bg-primary text-primary-foreground' : now ? 'bg-secondary text-secondary-foreground' : 'bg-muted')}>{done ? <Check className="h-3 w-3" /> : faNum(n)}</span>
              <span className="truncate">{l}</span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-[70vh] overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute -top-32 start-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-secondary blur-3xl" />
      <div className="container-page relative px-3 py-5 sm:py-12">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="mx-auto w-full max-w-xl">{children}</motion.div>
      </div>
    </div>
  );
}

const card = 'space-y-6 rounded-3xl border bg-card p-5 shadow-[var(--shadow-md)] sm:p-8';

type Session = { token: string; expiresAt: string };
type Option = { electionId: string; association: string | null; votingOpenNow: boolean };
type Found = { majorName: string | null; choice: boolean; facultyName: string | null; votedIn: { electionId: string; association: string | null } | null; options: Option[] };
type BlockedInfo = { kind: 'voted'; association: string | null; e?: Election } | { kind: 'closed'; association: string | null; e?: Election };

export function VotePage() {
  useTitle('رأی‌دهی', undefined, true);
  const q = useQuery({ queryKey: ['publicElections'], queryFn: () => listPublicElections({}) });
  const [state, setState] = useState<{ e: Election; session: Session } | null>(null);
  const [blocked, setBlocked] = useState<BlockedInfo | null>(null);
  const all: Election[] = q.data?.elections ?? [];
  const open = all.filter((e) => e.votingOpenNow);

  if (q.isLoading) return <Shell><Skeleton className="h-[28rem] rounded-3xl" /></Shell>;
  if (q.isError) return <Shell><Notice icon={Vote} title="اتصال برقرار نشد" text="اینترنت خود را بررسی کنید و دوباره تلاش کنید."><Button onClick={() => q.refetch()} className="h-12 rounded-full">تلاش دوباره</Button></Notice></Shell>;
  if (state) return <Ballot key={state.e.id} e={state.e} session={state.session} onExit={() => setState(null)} />;
  if (blocked) return <Shell><Blocked {...blocked} onBack={() => setBlocked(null)} /></Shell>;
  if (!open.length) {
    const next = all.filter((e) => !e.isDemo && e.votingStart && new Date(e.votingStart) > new Date()).sort((a, b) => String(a.votingStart).localeCompare(String(b.votingStart)))[0];
    return (
      <Shell>
        <Notice icon={CalendarClock} title={next ? 'رأی‌گیری هنوز شروع نشده است' : 'در حال حاضر رأی‌گیری فعالی نیست'}
          text={next ? `رأی‌گیری از ${faDate(next.votingStart, true)} تا ${faDate(next.votingEnd, true)} باز است. همین صفحه را در آن زمان باز کنید.` : 'زمان رأی‌گیری‌ها در صفحه‌ی انتخابات اعلام می‌شود.'}>
          <Button asChild className="h-12 rounded-full"><Link to="/elections">صفحه‌ی انتخابات و نامزدها</Link></Button>
        </Notice>
      </Shell>
    );
  }
  return (
    <Shell>
      <Identify
        onReady={(e, session) => { setState({ e, session }); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
        onBlocked={setBlocked}
        elections={all}
      />
    </Shell>
  );
}

function Notice({ icon: Icon, title, text, children, tone }: { icon: typeof Vote; title: string; text?: React.ReactNode; children?: React.ReactNode; tone?: 'warn' }) {
  return (
    <div className={cn(card, 'text-center')}>
      <div className={cn('mx-auto grid h-14 w-14 place-items-center rounded-2xl', tone === 'warn' ? 'bg-accent/20 text-accent-foreground' : 'bg-secondary text-secondary-foreground')}><Icon className="h-7 w-7" /></div>
      <div><h1 className="text-xl font-extrabold leading-9">{title}</h1>{text && <p className="mt-2 text-sm leading-7 text-muted-foreground">{text}</p>}</div>
      {children && <div className="grid gap-2">{children}</div>}
    </div>
  );
}

function Blocked({ kind, association, e, onBack }: BlockedInfo & { onBack: () => void }) {
  const name = association ?? e?.association ?? 'انجمن';
  if (kind === 'voted') return (
    <Notice icon={CheckCircle2} title="شما قبلاً رأی داده‌اید" text={`رأی شما در انتخابات ${name} ثبت شده است و هر نفر فقط یک‌بار رأی می‌دهد. نتایج پس از تأیید رسمی اعلام می‌شود.`}>
      {e && <Button asChild className="h-12 rounded-full"><Link to={`/elections/${e.id}`}>صفحه‌ی انتخابات {name}</Link></Button>}
    </Notice>
  );
  return (
    <Notice icon={CalendarClock} tone="warn" title={`رأی‌گیری ${name} اکنون باز نیست`}
      text={e?.votingStart ? `زمان رأی‌گیری: ${faDate(e.votingStart, true)} تا ${faDate(e.votingEnd, true)}` : undefined}>
      <Button variant="outline" className="h-12 rounded-full" onClick={onBack}><RotateCcw className="ms-2 h-4 w-4" />بازگشت</Button>
    </Notice>
  );
}

function Identify({ onReady, onBlocked, elections }: { onReady: (e: Election, s: Session) => void; onBlocked: (b: BlockedInfo) => void; elections: Election[] }) {
  const [sn, setSn] = useState('');
  const [nid, setNid] = useState('');
  const [touched, setTouched] = useState(false);
  const [phase, setPhase] = useState<'find' | 'open' | null>(null);
  const [choose, setChoose] = useState<{ found: Found; options: Election[] } | null>(null);
  const [error, setError] = useState<{ msg: string; notFound: boolean } | null>(null);
  const nidRef = useRef<HTMLInputElement>(null);
  const snOk = sn.length >= 5, nidOk = nid.length >= 8; // صفرهای ابتدایی جاافتاده را سرور هم تکمیل می‌کند
  const nid10 = nid.padStart(10, '0');

  const submit = async () => {
    setTouched(true); setError(null);
    if (!snOk) return;
    if (!nidOk) { nidRef.current?.focus(); return; }
    try {
      setPhase('find');
      const found: Found = await findMyElection({ studentNumber: sn, nationalId: nid10 });
      const byId = (id: string) => elections.find((x) => x.id === id);
      if (found.votedIn) { setSn(''); setNid(''); onBlocked({ kind: 'voted', association: found.votedIn.association, e: byId(found.votedIn.electionId) }); return; }
      const open = found.options.filter((o) => o.votingOpenNow).map((o) => byId(o.electionId)).filter((x): x is Election => !!x);
      if (!open.length) { const o = found.options[0]; setSn(''); setNid(''); onBlocked({ kind: 'closed', association: found.choice ? found.facultyName : o?.association ?? null, e: o && byId(o.electionId) }); return; }
      if (found.choice) { setChoose({ found, options: open }); return; }
      await openBallot(open[0]);
    } catch (err) { report(err); } finally { setPhase(null); }
  };
  const openBallot = async (e: Election) => {
    setPhase('open'); setError(null);
    const r = await verifyVoter({ electionId: e.id, studentNumber: sn, nationalId: nid10 });
    setSn(''); setNid(''); setChoose(null); // شناسه‌ها پس از باز شدن نشست از حافظه پاک می‌شوند
    onReady(e, { token: r.sessionToken, expiresAt: r.expiresAt });
  };
  const report = (err: unknown) => {
    {
      const msg = errMsg(err);
      setError({ msg, notFound: /پیدا نشد|مطابقت ندارد/.test(msg) });
    }
  };
  const busy = phase !== null;
  if (choose) return (
    <ChooseAssociation found={choose.found} options={choose.options} busy={busy} error={error?.msg}
      onBack={() => { setChoose(null); setError(null); }}
      onPick={async (e) => { try { await openBallot(e); } catch (err) { report(err); } finally { setPhase(null); } }} />
  );
  return (
    <form className={card} onSubmit={(ev) => { ev.preventDefault(); submit(); }} noValidate>
      <div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary"><span className="h-1.5 w-1.5 rounded-full bg-primary motion-safe:animate-pulse" />رأی‌گیری باز است</span>
        <h1 className="mt-3 text-2xl font-black leading-10">ورود به رأی‌گیری</h1>
        <p className="mt-1 text-sm leading-7 text-muted-foreground">انجمن رشته‌ات خودکار پیدا می‌شود. اگر رشته‌ات انجمن مستقل ندارد، از میان انجمن‌های دانشکده‌ات یکی را انتخاب می‌کنی.</p>
      </div>
      <Steps step={1} />
      <div className="grid gap-4">
        <Field id="sn" label="شماره دانشجویی" error={touched && !snOk ? 'شماره دانشجویی را کامل وارد کنید.' : undefined}>
          <Input id="sn" dir="ltr" inputMode="numeric" enterKeyHint="next" autoComplete="off" autoFocus maxLength={16} placeholder="مثلاً ۴۰۱۱۲۳۴۵۶" value={sn}
            onChange={(x) => setSn(digits(x.target.value))} onKeyDown={(k) => { if (k.key === 'Enter' && snOk) { k.preventDefault(); nidRef.current?.focus(); } }}
            className="h-14 rounded-2xl text-center text-xl tracking-[0.2em]" aria-invalid={touched && !snOk} disabled={busy} />
        </Field>
        <Field id="nid" label="کد ملی" hint={`${faNum(nid.length)} از ۱۰ رقم`} error={touched && !nidOk ? 'کد ملی باید ۱۰ رقم باشد.' : undefined}>
          <Input ref={nidRef} id="nid" dir="ltr" inputMode="numeric" enterKeyHint="go" autoComplete="off" maxLength={10} placeholder="۱۰ رقم" value={nid}
            onChange={(x) => setNid(digits(x.target.value).slice(0, 10))} className="h-14 rounded-2xl text-center text-xl tracking-[0.2em]" aria-invalid={touched && !nidOk} disabled={busy} />
        </Field>
      </div>
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} role="alert" className="overflow-hidden">
            <div className="rounded-2xl bg-destructive/10 p-4 text-sm leading-7 text-destructive">
              <p className="flex items-start gap-2 font-semibold"><UserRoundX className="mt-1 h-4 w-4 shrink-0" />{error.msg}</p>
              {error.notFound && <ul className="mt-2 list-disc space-y-1 ps-6 text-xs text-foreground/75">
                <li>ارقام را دوباره بررسی کنید؛ صفرهای ابتدای کد ملی را هم بنویسید.</li>
                <li>رشته‌ها در همه‌ی مقطع‌ها رأی دارند؛ برای دیدن انجمن رشته‌تان <Link to="/elections#finder" className="font-bold text-primary underline">رشته را بررسی کنید</Link>.</li>
                <li>اگر مطمئنید باید در فهرست باشید، از <Link to="/contact" className="font-bold text-primary underline">فرم تماس</Link> پیگیری کنید (کد ملی را نفرستید).</li>
              </ul>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <Button type="submit" size="lg" className="h-14 w-full rounded-full text-base font-bold" disabled={busy}>
        {busy ? <><Loader2 className="ms-2 h-5 w-5 animate-spin" />{phase === 'find' ? 'در حال پیدا کردن انجمن شما…' : 'در حال باز کردن برگه‌ی رأی…'}</> : 'ادامه'}
      </Button>
      <p className="flex items-start gap-2 rounded-2xl bg-muted/60 p-3 text-xs leading-6 text-muted-foreground"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />کد ملی ذخیره نمی‌شود و فقط برای تطبیق است. پس از ورود ۲۰ دقیقه فرصت دارید. اعداد فارسی هم پذیرفته می‌شوند.</p>
    </form>
  );
}

function ChooseAssociation({ found, options, busy, error, onBack, onPick }: { found: Found; options: Election[]; busy: boolean; error?: string; onBack: () => void; onPick: (e: Election) => void }) {
  const [sel, setSel] = useState<Election | null>(null);
  return (
    <div className={card}>
      <div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-bold text-secondary-foreground"><GraduationCap className="h-3.5 w-3.5" />{found.facultyName ?? 'دانشکده‌ی شما'}</span>
        <h1 className="mt-3 text-2xl font-black leading-10">انجمن خودت را انتخاب کن</h1>
        <p className="mt-1 text-sm leading-7 text-muted-foreground">رشته‌ی {found.majorName ? <b className="text-foreground">«{found.majorName}»</b> : 'شما'} انجمن مستقل ندارد؛ پس می‌توانی در <b className="text-foreground">یکی</b> از انجمن‌های دانشکده‌ات رأی بدهی. پس از ثبت رأی، در انجمن‌های دیگر نمی‌توانی رأی بدهی.</p>
      </div>
      <Steps step={1} />
      <div role="radiogroup" aria-label="انجمن‌های دانشکده" className="grid gap-2.5 sm:grid-cols-2">
        {options.map((e) => {
          const on = sel?.id === e.id;
          return (
            <motion.button type="button" role="radio" aria-checked={on} key={e.id} whileTap={{ scale: 0.98 }} disabled={busy} onClick={() => setSel(e)}
              className={cn('flex min-h-[4rem] items-center justify-between gap-3 rounded-2xl border-2 bg-background p-4 text-start transition', on ? 'border-primary bg-secondary/50' : 'border-border hover:border-primary/40')}>
              <span className="min-w-0"><span className="block font-bold leading-7">{(e.association ?? e.title).replace(/^انجمن علمی\s*/, '')}</span><span className="text-xs text-muted-foreground">{faNum(e.candidates.length)} نامزد</span></span>
              <span className={cn('grid h-7 w-7 shrink-0 place-items-center rounded-full border-2', on ? 'border-primary bg-primary text-primary-foreground' : 'border-border')}>{on && <Check className="h-4 w-4" />}</span>
            </motion.button>
          );
        })}
      </div>
      {error && <p role="alert" className="rounded-2xl bg-destructive/10 p-3 text-sm leading-7 text-destructive">{error}</p>}
      <div className="grid gap-2">
        <Button size="lg" className="h-14 w-full rounded-full text-base font-bold" disabled={!sel || busy} onClick={() => sel && onPick(sel)}>
          {busy ? <><Loader2 className="ms-2 h-5 w-5 animate-spin" />در حال باز کردن برگه‌ی رأی…</> : sel ? `رأی در انجمن ${(sel.association ?? sel.title).replace(/^انجمن علمی\s*/, '')}` : 'یک انجمن را انتخاب کنید'}
        </Button>
        <Button variant="ghost" className="h-11 rounded-full" disabled={busy} onClick={onBack}><RotateCcw className="ms-2 h-4 w-4" />بازگشت</Button>
      </div>
    </div>
  );
}

function Field({ id, label, hint, error, children }: { id: string; label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2">
      <div className="flex items-baseline justify-between"><Label htmlFor={id} className="text-sm font-bold">{label}</Label>{hint && <span className="text-xs tabular-nums text-muted-foreground">{hint}</span>}</div>
      {children}
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}

function Ballot({ e, session, onExit }: { e: Election; session: Session; onExit: () => void }) {
  const [picked, setPicked] = useState<string[]>([]);
  const vote = useMutation({
    mutationFn: () => castVote({ sessionToken: session.token, candidateIds: picked }),
    onSuccess: () => window.scrollTo({ top: 0, behavior: 'smooth' }),
    onError: (err) => { if (/منقضی|احراز/.test(errMsg(err))) { toast.error(errMsg(err)); onExit(); } },
  });
  const expire = useCallback(() => { toast.error('زمان نشست رأی‌دهی تمام شد؛ دوباره وارد شوید.'); onExit(); }, [onExit]);
  // هشدار خروج تا رأی ثبت نشده
  useEffect(() => {
    if (vote.isSuccess) return;
    const h = (ev: BeforeUnloadEvent) => { ev.preventDefault(); };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [vote.isSuccess]);
  if (vote.isSuccess) return <Shell><Success e={e} code={vote.data.confirmationCode} /></Shell>;
  return <Shell><Pick e={e} session={session} picked={picked} setPicked={setPicked} onExpire={expire} vote={vote} /></Shell>;
}

type VoteMut = { isPending: boolean; isError: boolean; error: unknown; mutate: () => void };
function Pick({ e, session, picked, setPicked, onExpire, vote }: { e: Election; session: Session; picked: string[]; setPicked: (f: (p: string[]) => string[]) => void; onExpire: () => void; vote: VoteMut }) {
  const [confirm, setConfirm] = useState(false);
  const [text, setText] = useState('');
  const max = e.maxChoicesPerVoter;
  const toggle = (id: string) => setPicked((p) => {
    if (p.includes(id)) return p.filter((x) => x !== id);
    if (max === 1) return [id];
    if (p.length >= max) { toast.message(`حداکثر ${faNum(max)} نامزد. برای تغییر، ابتدا یکی را بردارید.`); return p; }
    return [...p, id];
  });
  const chosen = e.candidates.filter((c) => picked.includes(c.id));
  const list = e.candidates.filter((c) => !text.trim() || c.fullName.includes(text.trim()));
  const full = picked.length >= max;
  return (
    <form className={cn(card, 'pb-36 sm:pb-8')} onSubmit={(ev) => { ev.preventDefault(); if (picked.length) setConfirm(true); }}>
      <div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-bold text-secondary-foreground"><GraduationCap className="h-3.5 w-3.5" />{e.association ?? e.title}</span>
        <h1 className="mt-2 text-xl font-black leading-9 sm:text-2xl">برگه‌ی رأی</h1>
      </div>
      <Steps step={2} />
      <div className="sticky top-2 z-30 -mx-2 flex items-center justify-between gap-2 rounded-2xl border bg-background/95 px-3 py-2 shadow-[var(--shadow-sm)] backdrop-blur">
        <span className="text-sm font-bold">{max === 1 ? 'یک نامزد' : <>انتخاب‌شده <span className="tabular-nums text-primary">{faNum(picked.length)}</span> از {faNum(max)}</>}</span>
        <SessionTimer expiresAt={session.expiresAt} onExpire={onExpire} />
      </div>
      {e.candidates.length > 8 && (
        <div className="relative">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input aria-label="جست‌وجوی نامزد" placeholder="جست‌وجوی نام نامزد…" value={text} onChange={(x) => setText(x.target.value)} className="h-12 rounded-2xl ps-9" />
        </div>
      )}
      <div role="group" aria-label="نامزدها" className="grid gap-2.5">
        {list.map((c) => {
          const on = picked.includes(c.id), dim = full && !on && max > 1;
          return (
            <motion.button type="button" key={c.id} whileTap={{ scale: 0.98 }} onClick={() => toggle(c.id)} aria-pressed={on}
              className={cn('flex min-h-[4.5rem] w-full items-center gap-3 rounded-2xl border-2 bg-background p-3 text-start transition sm:p-4', on ? 'border-primary bg-secondary/50' : 'border-border hover:border-primary/40', dim && 'opacity-55')}>
              <CandidateAvatar name={c.fullName} photoUrl={c.photoUrl} className="h-14 w-14 shrink-0 text-xl" />
              <span className="min-w-0 flex-1"><span className="block font-bold leading-7">{c.fullName}</span>{c.statement && <span className="line-clamp-2 text-xs leading-6 text-muted-foreground">{c.statement}</span>}</span>
              <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 transition', on ? 'border-primary bg-primary text-primary-foreground' : 'border-border')}>{on && <Check className="h-4 w-4" />}</span>
            </motion.button>
          );
        })}
        {!list.length && <p className="py-6 text-center text-sm text-muted-foreground">نامزدی با این نام نیست.</p>}
      </div>
      {vote.isError && <p role="alert" className="rounded-2xl bg-destructive/10 p-3 text-sm text-destructive">{errMsg(vote.error)}</p>}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 p-3 backdrop-blur sm:sticky sm:bottom-3 sm:rounded-2xl sm:border" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
        {chosen.length > 0 && (
          <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1">
            {chosen.map((c) => <button type="button" key={c.id} onClick={() => toggle(c.id)} className="inline-flex shrink-0 items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground">{c.fullName}<X className="h-3 w-3" aria-label="برداشتن" /></button>)}
          </div>
        )}
        <Button type="submit" size="lg" className="h-12 w-full rounded-full text-base font-bold" disabled={!picked.length || vote.isPending}>
          {vote.isPending ? <><Loader2 className="ms-2 h-4 w-4 animate-spin" />در حال ثبت…</> : picked.length ? `مرور و ثبت رأی (${faNum(picked.length)})` : 'ابتدا نامزد را انتخاب کنید'}
        </Button>
      </div>
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent className="max-w-[calc(100vw-1.5rem)] rounded-3xl sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><Lock className="h-5 w-5 text-primary" />ثبت نهایی رأی؟</AlertDialogTitle>
            <AlertDialogDescription>پس از ثبت، رأی قابل تغییر نیست. انتخاب‌های شما ({faNum(chosen.length)} از {faNum(max)}):</AlertDialogDescription>
          </AlertDialogHeader>
          <ul className="grid max-h-[45vh] gap-2 overflow-y-auto">{chosen.map((c) => <li key={c.id} className="flex items-center gap-3 rounded-2xl bg-secondary/50 p-2"><CandidateAvatar name={c.fullName} photoUrl={c.photoUrl} className="h-10 w-10" /><span className="font-bold">{c.fullName}</span></li>)}</ul>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="h-11 rounded-full">بازگشت و ویرایش</AlertDialogCancel>
            <AlertDialogAction className="h-11 rounded-full" onClick={() => vote.mutate()}>بله، رأی‌ام ثبت شود</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}

function Success({ e, code }: { e: Election; code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(code); setCopied(true); toast.success('کد کپی شد'); setTimeout(() => setCopied(false), 2000); }
    catch { toast.message('کد را یادداشت کنید: ' + code); }
  };
  return (
    <div className={cn(card, 'text-center')}>
      <Steps step={3} />
      <motion.div initial={{ scale: 0.4, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 14 }} className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-secondary text-secondary-foreground">
        <CheckCircle2 className="h-11 w-11" />
      </motion.div>
      <div>
        <h1 className="flex items-center justify-center gap-2 text-2xl font-black">رأی شما ثبت شد <PartyPopper className="h-6 w-6 text-accent" /></h1>
        <p className="mt-2 text-sm leading-7 text-muted-foreground">ممنون که در انتخابات {e.association ?? 'انجمن'} شرکت کردید. این کد فقط «شرکت شما» را تأیید می‌کند و چیزی درباره‌ی انتخاب‌هایتان ندارد. از آن عکس بگیرید یا کپی‌اش کنید.</p>
      </div>
      <button type="button" onClick={copy} dir="ltr" aria-label="کپی کد پیگیری" className="mx-auto flex max-w-full items-center gap-3 break-all rounded-2xl border-2 border-dashed border-primary/40 bg-secondary/40 px-5 py-3 font-mono text-xl font-bold tracking-widest text-primary sm:text-2xl">
        {code}{copied ? <Check className="h-5 w-5 shrink-0" /> : <Copy className="h-5 w-5 shrink-0" />}
      </button>
      <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground"><Sparkles className="h-3.5 w-3.5" />نتایج پس از پایان رأی‌گیری و تأیید رسمی اعلام می‌شود.</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <Button asChild className="h-12 rounded-full"><Link to={'/elections/' + e.id}>صفحه‌ی انتخابات</Link></Button>
        <Button asChild variant="outline" className="h-12 rounded-full"><Link to="/">بازگشت به خانه</Link></Button>
      </div>
    </div>
  );
}
