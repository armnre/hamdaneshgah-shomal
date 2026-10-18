import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useCallback } from 'react';
import { Vote, CheckCircle2, Loader2, Trophy, CalendarClock, ShieldCheck, Users, ArrowLeft, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@project/components/ui/alert-dialog';
import { StageTimeline, Countdown, SessionTimer } from '../components/site/ElectionUI';
import { listPublicElections, castVote, verifyVoter, ListPublicElectionsOutputType } from 'zitejs/api';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { Label } from '@project/components/ui/label';
import { Checkbox } from '@project/components/ui/checkbox';
import { Skeleton } from '@project/components/ui/skeleton';
import { PageHero, EmptyState, Crumbs } from '../components/site/ui';
import { useSettings } from '../components/site/PublicLayout';
import { useTitle } from '../lib/useTitle';
import { errMsg, faDate, faNum } from '../lib/format';

type Election = ListPublicElectionsOutputType['elections'][0];
const STAGE: Record<string, string> = { 'Final List': 'فهرست نهایی نامزدها', Counting: 'در حال شمارش', 'Results Confirmed': 'نتایج تأیید شد', Archived: 'بایگانی‌شده', 'Candidacy Open': 'ثبت‌نام نامزدها', 'Candidate Review': 'بررسی صلاحیت نامزدها', 'Voting Open': 'رأی‌گیری', Closed: 'پایان رأی‌گیری — در انتظار اعلام نتایج', 'Results Published': 'نتایج اعلام شد' };
const useElections = () => useQuery({ queryKey: ['publicElections'], queryFn: () => listPublicElections({}) });

export function ElectionsList() {
  useTitle('انتخابات انجمن‌های علمی');
  const { data: s } = useSettings();
  const q = useElections();
  const list = q.data?.elections ?? [];
  return (
    <>
      <PageHero image="/shomal/ai-workshop.webp" title="انتخابات انجمن‌های علمی" subtitle="زمان‌بندی، نامزدها و نتایج انتخابات انجمن‌ها" />
      <div className="container-page py-12">
        {q.isLoading ? <div className="grid gap-4 md:grid-cols-2">{[0, 1].map((i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}</div>
          : !list.length ? <EmptyState title="هنوز انتخاباتی اعلام نشده است" text={s?.settings?.electionNote || 'زمان ثبت‌نام نامزدها و رأی‌گیری پس از تصویب، در این صفحه منتشر می‌شود.'} />
          : <div className="grid gap-4 md:grid-cols-2">{list.map((e) => <ElectionCard key={e.id} e={e} />)}</div>}
      </div>
    </>
  );
}

function ElectionCard({ e }: { e: Election }) {
  const live = e.votingOpenNow;
  return (
    <Link to={`/elections/${e.id}`} className="group relative block overflow-hidden rounded-2xl border bg-card p-6 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[var(--shadow-md)]">
      {live && <span className="absolute inset-x-0 top-0 h-1 bg-primary" />}
      <div className="flex items-center justify-between gap-3">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${live ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'}`}>
          {live && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary-foreground" />}{STAGE[e.status] ?? e.status}
        </span>
        <ArrowLeft className="h-4 w-4 text-muted-foreground transition group-hover:-translate-x-1 group-hover:text-primary" />
      </div>
      <h2 className="mt-3 text-lg font-extrabold">{e.title}</h2>
      {e.association && <p className="mt-1 text-sm text-muted-foreground">{e.association}</p>}
      <div className="mt-5"><StageTimeline status={e.status} compact /></div>
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
        {e.votingStart && <span className="flex items-center gap-1.5"><CalendarClock className="h-4 w-4 text-primary" />{faDate(e.votingStart, true)}</span>}
        <span className="flex items-center gap-1.5"><Users className="h-4 w-4 text-primary" />{faNum(e.candidates.length)} نامزد · {faNum(e.seats)} کرسی</span>
      </div>
    </Link>
  );
}

export function ElectionDetail() {
  const { slug } = useParams();
  const q = useElections();
  const e = q.data?.elections.find((x) => x.id === slug);
  useTitle(e?.title ?? 'انتخابات');
  if (q.isLoading) return <div className="container-page py-12"><Skeleton className="h-64 rounded-2xl" /></div>;
  if (!e) return (
    <div className="container-page py-12">
      <Crumbs items={[{ to: '/', label: 'خانه' }, { to: '/elections', label: 'انتخابات' }, { label: 'یافت نشد' }]} />
      <EmptyState title="این انتخابات یافت نشد" text="ممکن است هنوز اعلام نشده یا نشانی اشتباه باشد." action={<Button asChild variant="outline"><Link to="/elections">همه انتخابات</Link></Button>} />
    </div>
  );
  const published = e.status === 'Results Published';
  return (
    <div className="container-page space-y-8 py-12">
      <Crumbs items={[{ to: '/', label: 'خانه' }, { to: '/elections', label: 'انتخابات' }, { label: e.title }]} />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="text-sm font-semibold text-primary">{STAGE[e.status]}</span>
          <h1 className="mt-1 text-3xl font-black">{e.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{faNum(e.seats)} کرسی · هر رأی‌دهنده حداکثر {faNum(e.maxChoicesPerVoter)} انتخاب{e.votingStart && ` · رأی‌گیری ${faDate(e.votingStart, true)} تا ${faDate(e.votingEnd, true)}`}</p>
        </div>
        {e.votingOpenNow && <Button asChild size="lg"><Link to={`/vote?e=${e.id}`}><Vote className="ms-2 h-5 w-5" />ورود به رأی‌گیری</Link></Button>}
      </div>
      <div className="space-y-5 rounded-2xl border bg-card p-5 sm:p-6">
        <StageTimeline status={e.status} />
        {e.status === 'Final List' && e.votingStart && new Date(e.votingStart) > new Date() && <Countdown to={e.votingStart} label="تا شروع رأی‌گیری:" />}
        {e.votingOpenNow && e.votingEnd && <Countdown to={e.votingEnd} label="تا پایان رأی‌گیری:" />}
      </div>
      {e.description && <p className="max-w-3xl whitespace-pre-line leading-8">{e.description}</p>}
      {published && <Turnout turnout={Number(e.turnout ?? 0)} eligible={Number(e.eligible ?? 0)} />}
      <section>
        <h2 className="mb-4 text-xl font-extrabold">{published ? 'نتایج' : 'نامزدهای تأییدشده'}</h2>
        {!e.candidates.length ? <EmptyState title="هنوز نامزدی تأیید نشده است" /> : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {e.candidates.map((c, i) => (
              <div key={c.id} className={`rounded-2xl border bg-card p-5 ${published && i < e.seats ? 'border-primary/50 bg-primary/[0.03]' : ''}`}>
                <div className="flex items-center gap-3">
                  {c.photoUrl ? <img src={c.photoUrl} alt={c.fullName} className="h-14 w-14 rounded-full object-cover" /> : <div className="grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-lg font-bold text-primary">{c.fullName[0]}</div>}
                  <div>
                    <p className="font-bold">{c.fullName}</p>
                    {published && <p className="flex items-center gap-1 text-sm text-primary">{i < e.seats && <Trophy className="h-4 w-4" />}{faNum(c.votes ?? 0)} رأی</p>}
                  </div>
                </div>
                {published && <VoteBar votes={c.votes ?? 0} max={e.candidates[0]?.votes ?? 0} />}
                {c.statement && <p className="mt-3 line-clamp-5 text-sm leading-7 text-muted-foreground">{c.statement}</p>}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Turnout({ turnout, eligible }: { turnout: number; eligible: number }) {
  const pct = eligible ? Math.round((turnout / eligible) * 100) : 0;
  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="flex items-baseline justify-between"><span className="font-bold">میزان مشارکت</span><span className="text-2xl font-black text-primary">{faNum(pct)}٪</span></div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${pct}%` }} /></div>
      <p className="mt-2 text-xs text-muted-foreground">{faNum(turnout)} نفر از {faNum(eligible)} واجد شرایط</p>
    </div>
  );
}

function VoteBar({ votes, max }: { votes: number; max: number }) {
  return <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${max ? (votes / max) * 100 : 0}%` }} /></div>;
}

function Steps({ step }: { step: 1 | 2 }) {
  return (
    <div className="flex items-center gap-2 text-xs font-semibold">
      {['احراز هویت', 'انتخاب نامزد'].map((l, i) => (
        <span key={l} className="flex items-center gap-2">
          <span className={`grid h-6 w-6 place-items-center rounded-full ${i + 1 <= step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>{faNum(i + 1)}</span>
          <span className={i + 1 === step ? 'text-foreground' : 'text-muted-foreground'}>{l}</span>
          {i === 0 && <span className={`h-px w-8 ${step === 2 ? 'bg-primary' : 'bg-border'}`} />}
        </span>
      ))}
    </div>
  );
}

export function VotePage() {
  useTitle('رأی‌دهی', undefined, true);
  const [params] = useSearchParams();
  const q = useElections();
  const open = (q.data?.elections ?? []).filter((e) => e.votingOpenNow);
  const e = open.find((x) => x.id === params.get('e')) ?? (open.length === 1 ? open[0] : undefined);
  if (q.isLoading) return <div className="container-page py-12"><Skeleton className="mx-auto h-80 max-w-xl rounded-3xl" /></div>;
  if (!e) return (
    <div className="container-page grid min-h-[50vh] place-items-center py-12">
      <div className="max-w-md rounded-3xl border bg-card p-8 text-center">
        <Vote className="mx-auto h-8 w-8 text-primary" aria-hidden />
        <h1 className="mt-4 text-xl font-extrabold">{open.length ? 'انتخابات خود را انتخاب کنید' : 'رأی‌گیری فعالی وجود ندارد'}</h1>
        <div className="mt-6 grid gap-2">
          {open.map((o) => <Button key={o.id} asChild variant="outline"><Link to={`/vote?e=${o.id}`}>{o.title}</Link></Button>)}
          {!open.length && <Button asChild variant="outline"><Link to="/elections">مشاهده انتخابات</Link></Button>}
        </div>
      </div>
    </div>
  );
  return <Ballot e={e} />;
}

function Ballot({ e }: { e: Election }) {
  const [sn, setSn] = useState('');
  const [nid, setNid] = useState('');
  const [session, setSession] = useState<{ token: string; expiresAt: string } | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const verify = useMutation({
    mutationFn: () => verifyVoter({ electionId: e.id, studentNumber: sn, nationalId: nid }),
    // Identifiers are dropped from memory as soon as the session is open
    onSuccess: (r) => { setSession({ token: r.sessionToken, expiresAt: r.expiresAt }); setSn(''); setNid(''); },
  });
  const vote = useMutation({
    mutationFn: () => castVote({ sessionToken: session!.token, candidateIds: picked }),
    onSuccess: () => setSession(null),
    onError: () => { if (session && new Date(session.expiresAt) < new Date()) setSession(null); },
  });
  const [confirm, setConfirm] = useState(false);
  const expire = useCallback(() => { setSession(null); setPicked([]); toast.error('زمان نشست رأی‌دهی تمام شد؛ دوباره احراز هویت کنید.'); }, []);
  const toggle = (id: string) => setPicked((p) => p.includes(id) ? p.filter((x) => x !== id) : p.length < e.maxChoicesPerVoter ? [...p, id] : p);

  if (vote.isSuccess) return (
    <div className="container-page grid min-h-[50vh] place-items-center py-12">
      <div className="max-w-md rounded-3xl border bg-card p-8 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-primary/10"><CheckCircle2 className="h-9 w-9 text-primary" /></div>
        <h1 className="mt-4 text-xl font-extrabold">رأی شما ثبت شد</h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">برگه‌ی رأی بدون هیچ شناسه‌ای از شما ذخیره شده است. این کد فقط «شرکت شما در رأی‌گیری» را تأیید می‌کند و هیچ اطلاعاتی درباره‌ی انتخاب‌هایتان ندارد:</p>
        <button type="button" onClick={() => { navigator.clipboard.writeText(vote.data.confirmationCode); toast.success('کد کپی شد'); }} dir="ltr" className="mx-auto mt-3 flex items-center gap-2 rounded-xl border border-dashed border-primary/40 bg-primary/5 px-4 py-2 font-mono text-2xl font-bold tracking-widest text-primary">
          {vote.data.confirmationCode}<Copy className="h-4 w-4" />
        </button>
        <Button asChild variant="outline" className="mt-6"><Link to={`/elections/${e.id}`}>بازگشت به صفحه‌ی انتخابات</Link></Button>
      </div>
    </div>
  );
  const header = (
    <div>
      <h1 className="text-2xl font-extrabold">{e.title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">رأی‌گیری تا {faDate(e.votingEnd, true)} · هر نفر فقط یک‌بار</p>
    </div>
  );
  if (!session) return (
    <div className="container-page py-12">
      <form className="mx-auto max-w-xl space-y-6 rounded-3xl border bg-card p-6 shadow-[var(--shadow-md)] sm:p-8" onSubmit={(ev) => { ev.preventDefault(); verify.mutate(); }}>
        {header}
        <Steps step={1} />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2"><Label htmlFor="sn">شماره دانشجویی</Label><Input id="sn" dir="ltr" inputMode="numeric" autoComplete="off" value={sn} onChange={(x) => setSn(x.target.value)} required /></div>
          <div className="grid gap-2"><Label htmlFor="nid">کد ملی</Label><Input id="nid" dir="ltr" inputMode="numeric" autoComplete="off" value={nid} onChange={(x) => setNid(x.target.value)} required /></div>
        </div>
        {verify.isError && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{errMsg(verify.error)}</p>}
        <Button type="submit" size="lg" className="w-full" disabled={!sn || !nid || verify.isPending}>
          {verify.isPending && <Loader2 className="ms-2 h-4 w-4 animate-spin" />}ادامه
        </Button>
        <p className="flex items-start gap-2 text-xs leading-6 text-muted-foreground"><ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-primary" />کد ملی شما ذخیره نمی‌شود و فقط برای تطبیق با فهرست واجدین به کار می‌رود. پس از احراز هویت، ۲۰ دقیقه برای ثبت رأی فرصت دارید.</p>
      </form>
    </div>
  );
  return (
    <div className="container-page py-12">
      <form className="mx-auto max-w-xl space-y-6 rounded-3xl border bg-card p-6 shadow-[var(--shadow-md)] sm:p-8" onSubmit={(ev) => { ev.preventDefault(); setConfirm(true); }}>
        {header}
        <div className="flex flex-wrap items-center justify-between gap-2"><Steps step={2} /><SessionTimer expiresAt={session.expiresAt} onExpire={expire} /></div>
        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-semibold">نامزدها را انتخاب کنید ({faNum(picked.length)} از حداکثر {faNum(e.maxChoicesPerVoter)})</legend>
          {e.candidates.map((c) => (
            <label key={c.id} className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-3 transition ${picked.includes(c.id) ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:border-primary/40'}`}>
              <Checkbox checked={picked.includes(c.id)} onCheckedChange={() => toggle(c.id)} disabled={!picked.includes(c.id) && picked.length >= e.maxChoicesPerVoter} />
              {c.photoUrl ? <img src={c.photoUrl} alt="" className="h-11 w-11 rounded-full object-cover" /> : <span className="grid h-11 w-11 place-items-center rounded-full bg-primary/10 font-bold text-primary">{c.fullName[0]}</span>}
              <span className="font-semibold">{c.fullName}</span>
            </label>
          ))}
        </fieldset>
        {vote.isError && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{errMsg(vote.error)}</p>}
        <Button type="submit" size="lg" className="w-full" disabled={!picked.length || vote.isPending}>
          {vote.isPending && <Loader2 className="ms-2 h-4 w-4 animate-spin" />}ثبت نهایی رأی
        </Button>
        <AlertDialog open={confirm} onOpenChange={setConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>ثبت نهایی رأی؟</AlertDialogTitle>
              <AlertDialogDescription>انتخاب‌های شما: {e.candidates.filter((c) => picked.includes(c.id)).map((c) => c.fullName).join('، ')}. پس از ثبت، رأی قابل تغییر نیست.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>بازبینی</AlertDialogCancel>
              <AlertDialogAction onClick={() => vote.mutate()}>بله، ثبت شود</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <p className="text-xs leading-6 text-muted-foreground">پس از ثبت، رأی قابل تغییر نیست. برگه‌ی رأی بدون هیچ شناسه‌ای از شما ذخیره می‌شود؛ فقط «رأی داده است» (بدون ساعت) برای شما ثبت می‌شود.</p>
      </form>
    </div>
  );
}
