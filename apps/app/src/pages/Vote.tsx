import { useCallback, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Vote, CheckCircle2, Loader2, ShieldCheck, Copy, Check, ArrowRight, Lock, Sparkles, PartyPopper } from 'lucide-react';
import { toast } from 'sonner';
import { listPublicElections, castVote, verifyVoter } from 'zitejs/api';
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
const digits = (s: string) => s.replace(/[۰-۹]/g, (d) => String(FA.indexOf(d))).replace(/[٠-٩]/g, (d) => String(AR.indexOf(d))).replace(/\D/g, '');

const LABELS = ['احراز هویت', 'انتخاب نامزد', 'ثبت رأی'];
function Steps({ step }: { step: 1 | 2 | 3 }) {
  return (
    <ol className="grid grid-cols-3 gap-2" aria-label="مراحل رأی‌دهی">
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
    <div className="relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute -top-32 start-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-secondary blur-3xl" />
      <div className="container-page relative px-3 py-6 sm:py-12">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="mx-auto w-full max-w-xl">{children}</motion.div>
      </div>
    </div>
  );
}

const card = 'space-y-6 rounded-3xl border bg-card p-5 shadow-[var(--shadow-md)] sm:p-8';

export function VotePage() {
  useTitle('رأی‌دهی', undefined, true);
  const [params] = useSearchParams();
  const q = useQuery({ queryKey: ['publicElections'], queryFn: () => listPublicElections({}) });
  const all = q.data?.elections ?? [];
  const open = all.filter((e) => e.votingOpenNow);
  const wanted = params.get('e');
  const e = open.find((x) => x.id === wanted) ?? (!wanted && open.length === 1 ? open[0] : undefined);
  if (q.isLoading) return <Shell><Skeleton className="h-96 rounded-3xl" /></Shell>;
  if (q.isError) return <Shell><Notice title="اتصال برقرار نشد" text="اینترنت خود را بررسی کنید و دوباره تلاش کنید."><Button onClick={() => q.refetch()} className="rounded-full">تلاش دوباره</Button></Notice></Shell>;
  if (!e) {
    const closed = wanted ? all.find((x) => x.id === wanted) : undefined;
    return (
      <Shell>
        <Notice title={closed ? 'رأی‌گیری این انتخابات اکنون باز نیست' : open.length ? 'انتخابات خود را انتخاب کنید' : 'در حال حاضر رأی‌گیری فعالی نیست'}
          text={closed?.votingStart ? 'زمان رأی‌گیری: ' + faDate(closed.votingStart, true) + ' تا ' + faDate(closed.votingEnd, true) : open.length ? 'روی انجمن خود بزنید تا وارد برگه‌ی رأی شوید.' : 'زمان رأی‌گیری‌ها در صفحه‌ی انتخابات اعلام می‌شود.'}>
          {open.map((o) => (
            <Link key={o.id} to={'/vote?e=' + o.id} className="flex items-center justify-between gap-3 rounded-2xl border bg-background p-4 text-start transition hover:border-primary/50 hover:bg-secondary/40">
              <span><span className="block font-bold">{o.title}</span><span className="text-xs text-muted-foreground">{o.association}</span></span>
              <ArrowRight className="h-4 w-4 rotate-180 text-primary" />
            </Link>
          ))}
          <Button asChild variant="outline" className="rounded-full"><Link to="/elections">همه‌ی انتخابات</Link></Button>
        </Notice>
      </Shell>
    );
  }
  return <Ballot key={e.id} e={e} />;
}

function Notice({ title, text, children }: { title: string; text?: string; children?: React.ReactNode }) {
  return (
    <div className={cn(card, 'text-center')}>
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-secondary text-secondary-foreground"><Vote className="h-7 w-7" /></div>
      <div><h1 className="text-xl font-extrabold">{title}</h1>{text && <p className="mt-2 text-sm leading-7 text-muted-foreground">{text}</p>}</div>
      <div className="grid gap-2">{children}</div>
    </div>
  );
}

function Header({ e }: { e: Election }) {
  return (
    <div>
      {e.association && <span className="inline-flex rounded-full bg-secondary px-3 py-1 text-xs font-bold text-secondary-foreground">{e.association}</span>}
      <h1 className="mt-2 text-xl font-extrabold leading-9 sm:text-2xl">{e.title}</h1>
      <p className="mt-1 text-xs text-muted-foreground sm:text-sm">رأی‌گیری تا {faDate(e.votingEnd, true)} · هر نفر فقط یک‌بار</p>
    </div>
  );
}

function Ballot({ e }: { e: Election }) {
  const [session, setSession] = useState<{ token: string; expiresAt: string } | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const vote = useMutation({
    mutationFn: () => castVote({ sessionToken: session!.token, candidateIds: picked }),
    onSuccess: () => { setSession(null); window.scrollTo({ top: 0, behavior: 'smooth' }); },
    onError: (err) => { if (/منقضی|احراز/.test(errMsg(err))) { setSession(null); setPicked([]); } },
  });
  const expire = useCallback(() => { setSession(null); setPicked([]); toast.error('زمان نشست رأی‌دهی تمام شد؛ دوباره احراز هویت کنید.'); }, []);

  if (vote.isSuccess) return <Shell><Success e={e} code={vote.data.confirmationCode} /></Shell>;
  return (
    <Shell>
      <AnimatePresence mode="wait">
        {!session ? (
          <motion.div key="id" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }}>
            <Identify e={e} onOpen={(s) => { setSession(s); window.scrollTo({ top: 0, behavior: 'smooth' }); }} expiredError={vote.isError ? errMsg(vote.error) : undefined} />
          </motion.div>
        ) : (
          <motion.div key="pick" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }}>
            <Pick e={e} session={session} picked={picked} setPicked={setPicked} onExpire={expire} vote={vote} />
          </motion.div>
        )}
      </AnimatePresence>
    </Shell>
  );
}

function Identify({ e, onOpen, expiredError }: { e: Election; onOpen: (s: { token: string; expiresAt: string }) => void; expiredError?: string }) {
  const [sn, setSn] = useState('');
  const [nid, setNid] = useState('');
  const [touched, setTouched] = useState(false);
  const nidBad = nid.length > 0 && nid.length !== 10;
  const verify = useMutation({
    mutationFn: () => verifyVoter({ electionId: e.id, studentNumber: sn, nationalId: nid }),
    // Identifiers are dropped from memory as soon as the session is open
    onSuccess: (r) => { setSn(''); setNid(''); onOpen({ token: r.sessionToken, expiresAt: r.expiresAt }); },
  });
  return (
    <form className={card} onSubmit={(ev) => { ev.preventDefault(); setTouched(true); if (sn && nid.length === 10) verify.mutate(); }} noValidate>
      <Header e={e} />
      <Steps step={1} />
      {expiredError && !verify.isError && <p role="alert" className="rounded-2xl bg-destructive/10 p-3 text-sm text-destructive">{expiredError}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="sn">شماره دانشجویی</Label>
          <Input id="sn" dir="ltr" inputMode="numeric" autoComplete="off" autoFocus maxLength={14} placeholder="مثلاً ۴۰۱۱۲۳۴۵۶" value={sn} onChange={(x) => setSn(digits(x.target.value))} className="h-12 rounded-xl text-center text-lg tracking-widest" aria-invalid={touched && !sn} />
          {touched && !sn && <span className="text-xs text-destructive">شماره دانشجویی را وارد کنید.</span>}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="nid">کد ملی</Label>
          <Input id="nid" dir="ltr" inputMode="numeric" autoComplete="off" maxLength={10} placeholder="۱۰ رقم" value={nid} onChange={(x) => setNid(digits(x.target.value).slice(0, 10))} className="h-12 rounded-xl text-center text-lg tracking-widest" aria-invalid={(touched || nid.length === 10) && nidBad} />
          <span className={cn('text-xs', touched && (nidBad || !nid) ? 'text-destructive' : 'text-muted-foreground')}>{faNum(nid.length)} از ۱۰ رقم</span>
        </div>
      </div>
      {verify.isError && <p role="alert" className="rounded-2xl bg-destructive/10 p-3 text-sm leading-7 text-destructive">{errMsg(verify.error)}</p>}
      <Button type="submit" size="lg" className="h-12 w-full rounded-full text-base" disabled={verify.isPending}>
        {verify.isPending ? <><Loader2 className="ms-2 h-4 w-4 animate-spin" />در حال بررسی…</> : 'ادامه و ورود به برگه‌ی رأی'}
      </Button>
      <p className="flex items-start gap-2 rounded-2xl bg-muted/60 p-3 text-xs leading-6 text-muted-foreground"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />کد ملی ذخیره نمی‌شود و فقط برای تطبیق با فهرست واجدین به کار می‌رود. پس از ورود، ۲۰ دقیقه برای ثبت رأی فرصت دارید. اعداد فارسی هم پذیرفته می‌شوند.</p>
    </form>
  );
}

type VoteMut = { isPending: boolean; isError: boolean; error: unknown; mutate: () => void };
function Pick({ e, session, picked, setPicked, onExpire, vote }: { e: Election; session: { expiresAt: string }; picked: string[]; setPicked: (f: (p: string[]) => string[]) => void; onExpire: () => void; vote: VoteMut }) {
  const [confirm, setConfirm] = useState(false);
  const max = e.maxChoicesPerVoter;
  const toggle = (id: string) => setPicked((p) => {
    if (p.includes(id)) return p.filter((x) => x !== id);
    if (max === 1) return [id];
    if (p.length >= max) { toast.message('حداکثر ' + faNum(max) + ' نامزد می‌توانید انتخاب کنید. برای تغییر، ابتدا یکی را بردارید.'); return p; }
    return [...p, id];
  });
  const chosen = e.candidates.filter((c) => picked.includes(c.id));
  return (
    <form className={cn(card, 'pb-28 sm:pb-8')} onSubmit={(ev) => { ev.preventDefault(); if (picked.length) setConfirm(true); }}>
      <Header e={e} />
      <Steps step={2} />
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-muted/60 px-3 py-2">
        <span className="text-sm font-semibold">{max === 1 ? 'یک نامزد را انتخاب کنید' : 'تا ' + faNum(max) + ' نامزد انتخاب کنید'}</span>
        <SessionTimer expiresAt={session.expiresAt} onExpire={onExpire} />
      </div>
      <div role="group" aria-label="نامزدها" className="grid gap-2.5">
        {e.candidates.map((c) => {
          const on = picked.includes(c.id);
          return (
            <motion.button type="button" key={c.id} whileTap={{ scale: 0.98 }} onClick={() => toggle(c.id)} aria-pressed={on}
              className={cn('flex w-full items-center gap-3 rounded-2xl border-2 bg-background p-3 text-start transition-colors sm:p-4', on ? 'border-primary bg-secondary/50' : 'border-border hover:border-primary/40')}>
              <CandidateAvatar name={c.fullName} photoUrl={c.photoUrl} className="h-14 w-14 shrink-0 text-xl" />
              <span className="min-w-0 flex-1"><span className="block font-bold leading-7">{c.fullName}</span><span className="text-xs text-muted-foreground">نامزد {e.association ?? 'انجمن'}</span></span>
              <span className={cn('grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 transition', on ? 'border-primary bg-primary text-primary-foreground' : 'border-border')}>{on && <Check className="h-4 w-4" />}</span>
            </motion.button>
          );
        })}
      </div>
      {vote.isError && <p role="alert" className="rounded-2xl bg-destructive/10 p-3 text-sm text-destructive">{errMsg(vote.error)}</p>}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 p-3 backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:p-0" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
        <Button type="submit" size="lg" className="h-12 w-full rounded-full text-base" disabled={!picked.length || vote.isPending}>
          {vote.isPending ? <><Loader2 className="ms-2 h-4 w-4 animate-spin" />در حال ثبت…</> : picked.length ? 'بازبینی و ثبت رأی (' + faNum(picked.length) + ')' : 'ابتدا نامزد را انتخاب کنید'}
        </Button>
      </div>
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent className="max-w-[calc(100vw-1.5rem)] rounded-3xl sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><Lock className="h-5 w-5 text-primary" />ثبت نهایی رأی؟</AlertDialogTitle>
            <AlertDialogDescription>پس از ثبت، رأی قابل تغییر نیست. انتخاب‌های شما:</AlertDialogDescription>
          </AlertDialogHeader>
          <ul className="grid gap-2">{chosen.map((c) => <li key={c.id} className="flex items-center gap-3 rounded-2xl bg-secondary/50 p-2"><CandidateAvatar name={c.fullName} photoUrl={c.photoUrl} className="h-10 w-10" /><span className="font-bold">{c.fullName}</span></li>)}</ul>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-full">بازگشت و ویرایش</AlertDialogCancel>
            <AlertDialogAction className="rounded-full" onClick={() => vote.mutate()}>بله، رأی‌ام ثبت شود</AlertDialogAction>
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
        <p className="mt-2 text-sm leading-7 text-muted-foreground">ممنون که در انتخابات {e.association ?? 'انجمن'} شرکت کردید. این کد فقط «شرکت شما» را تأیید می‌کند و هیچ اطلاعاتی درباره‌ی انتخاب‌هایتان ندارد.</p>
      </div>
      <button type="button" onClick={copy} dir="ltr" className="mx-auto flex max-w-full items-center gap-3 break-all rounded-2xl border-2 border-dashed border-primary/40 bg-secondary/40 px-5 py-3 font-mono text-xl font-bold tracking-widest text-primary sm:text-2xl">
        {code}{copied ? <Check className="h-5 w-5 shrink-0" /> : <Copy className="h-5 w-5 shrink-0" />}
      </button>
      <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground"><Sparkles className="h-3.5 w-3.5" />نتایج پس از پایان رأی‌گیری و تأیید رسمی در صفحه‌ی انتخابات اعلام می‌شود.</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <Button asChild className="rounded-full"><Link to={'/elections/' + e.id}>صفحه‌ی انتخابات</Link></Button>
        <Button asChild variant="outline" className="rounded-full"><Link to="/">بازگشت به خانه</Link></Button>
      </div>
    </div>
  );
}
