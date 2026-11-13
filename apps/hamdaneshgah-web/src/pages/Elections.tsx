import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Vote, Trophy, Search, ScrollText, ArrowRight, ChevronLeft, ShieldCheck, GraduationCap, Users, Armchair, CalendarClock, Building2 } from 'lucide-react';
import { CandidateAvatar } from '../components/site/CandidateAvatar';
import { DemoBadge, STAGE, StatusPill, type Election } from '../components/site/ElectionCards';
import { StageTimeline, Countdown } from '../components/site/ElectionUI';
import { listPublicElections } from '../lib/api';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { Skeleton } from '@project/components/ui/skeleton';
import { EmptyState, ErrorState } from '../components/site/ui';
import { useSettings } from '../components/site/PublicLayout';
import { HowToVote, MajorFinder, ElectionFaq } from '../components/site/ElectionGuide';
import { useTitle } from '../lib/useTitle';
import { placeVoter } from '../lib/majorMap';
import { faDate, faNum } from '../lib/format';
import { getElectionReports } from '../lib/api';
import ReportExportBar from '../components/report/ReportExportBar';
import { shortPrint, type ElectionReport } from '../lib/reportExport';

const useElections = () => useQuery({ queryKey: ['publicElections'], queryFn: () => listPublicElections({}) });
const short = (e: Election) => (e.association ?? e.title).replace(/^انجمن علمی\s*/, '');

export function ElectionsList() {
  useTitle('انتخابات انجمن‌های علمی', 'زمان‌بندی، نامزدهای تأییدشده و نتایج رسمی انتخابات انجمن‌های علمی دانشگاه شمال');
  const { data: s } = useSettings();
  const q = useElections();
  const list = q.data?.elections ?? [];
  const [text, setText] = useState('');
  const place = text.trim().length > 1 ? placeVoter(text) : null;
  const slugs = place?.kind === 'association' ? [place.rule.slug] : place?.kind === 'faculty' ? place.associations.map((a) => a.slug) : [];
  const shown = list.filter((e) => !text.trim() || `${e.association ?? ''} ${e.title}`.includes(text.trim()) || slugs.includes(e.associationSlug ?? ''));
  const sum = useMemo(() => {
    const real = list.filter((e) => !e.isDemo);
    return {
      open: real.some((e) => e.votingOpenNow),
      start: real.map((e) => e.votingStart).filter(Boolean).sort()[0] as string | undefined,
      end: real.map((e) => e.votingEnd).filter(Boolean).sort().slice(-1)[0] as string | undefined,
      cands: real.reduce((n, e) => n + e.candidates.length, 0),
      count: real.length,
    };
  }, [list]);
  const before = sum.start && new Date(sum.start) > new Date();
  return (
    <>
      <section className="relative isolate overflow-hidden bg-primary text-primary-foreground">
        <div aria-hidden className="girih-gold absolute inset-0 -z-10 opacity-[0.07]" />
        <div aria-hidden className="absolute -end-24 -top-24 -z-10 h-72 w-72 rounded-full bg-accent/25 blur-3xl" />
        <div className="container-page grid min-w-0 gap-6 pb-16 pt-8 sm:pb-20 sm:pt-14 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold text-accent">سال تحصیلی ۱۴۰۵–۱۴۰۶</p>
            <h1 className="font-display mt-2 text-3xl font-black leading-[1.4] sm:text-5xl">انتخابات انجمن‌های علمی</h1>
            <p className="mt-4 max-w-lg leading-8 text-primary-foreground/80">همه‌ی انجمن‌ها هم‌زمان رأی می‌دهند. با شماره دانشجویی و کد ملی وارد شو؛ انجمن رشته‌ات خودکار پیدا می‌شود.</p>
            {sum.count > 0 && (
              <div className="mt-6 flex flex-wrap gap-2 text-sm">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-foreground/10 px-3 py-1.5"><Building2 className="h-4 w-4 text-accent" />{faNum(sum.count)} انجمن</span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-foreground/10 px-3 py-1.5"><Users className="h-4 w-4 text-accent" />{faNum(sum.cands)} نامزد</span>
                {sum.start && <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-foreground/10 px-3 py-1.5"><CalendarClock className="h-4 w-4 text-accent" />{faDate(sum.start)}</span>}
              </div>
            )}
            <div className="mt-7 flex flex-col gap-2 sm:flex-row">
              {sum.open && <Button asChild size="lg" className="h-12 rounded-full bg-accent px-8 font-bold text-accent-foreground hover:bg-accent/90"><Link to="/vote"><Vote className="ms-2 h-5 w-5" />ورود به رأی‌گیری</Link></Button>}
              <Button asChild size="lg" variant="ghost" className="h-12 rounded-full border border-primary-foreground/25 px-6 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"><a href="#finder"><GraduationCap className="ms-2 h-5 w-5" />رشته‌ام کدام انجمن است؟</a></Button>
            </div>
          </div>
          {sum.start && (
            <div className="min-w-0 rounded-2xl bg-card p-3 text-card-foreground shadow-xl sm:p-6">
              <Countdown to={(before ? sum.start : sum.end)!} label={before ? 'تا شروع رأی‌گیری' : 'تا پایان رأی‌گیری'} />
            </div>
          )}
        </div>
      </section>

      <div className="container-page space-y-12 py-10 sm:py-14">
        <div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div><h2 className="text-xl font-black sm:text-2xl">انجمن‌ها و نامزدها</h2><p className="mt-1 text-sm text-muted-foreground">روی هر انجمن بزن تا نامزدهایش را ببینی.</p></div>
          <div className="relative sm:w-72">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input aria-label="جست‌وجوی انجمن" placeholder="نام انجمن یا رشته…" value={text} onChange={(x) => setText(x.target.value)} className="h-11 rounded-full ps-9" />
          </div>
        </div>

        <div className="mt-5">
          {q.isLoading ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-36 rounded-2xl" />)}</div>
            : q.isError ? <ErrorState onRetry={() => q.refetch()} />
            : !list.length ? <EmptyState title="هنوز انتخاباتی اعلام نشده است" text={s?.settings?.electionNote || 'زمان ثبت‌نام نامزدها و رأی‌گیری پس از تصویب، در این صفحه منتشر می‌شود.'} />
            : !shown.length ? <EmptyState title="انجمنی با این نام یافت نشد" action={<Button variant="outline" onClick={() => setText('')}>پاک کردن جست‌وجو</Button>} />
            : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{shown.map((e, i) => <Tile key={e.id} e={e} i={i} />)}</div>}
        </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <HowToVote />
          <MajorFinder elections={list.filter((e) => !e.isDemo)} />
        </div>
        <ElectionFaq className="max-w-3xl" />
      </div>
    </>
  );
}

function Tile({ e, i }: { e: Election; i: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 10) * 0.03 }}>
      <Link to={`/elections/${e.id}`} className="group flex h-full flex-col rounded-2xl border bg-card p-4 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[var(--shadow-md)] motion-reduce:hover:translate-y-0 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="min-w-0 break-words font-extrabold leading-7">{short(e)}</h3>
          <StatusPill status={e.status} />
        </div>
        <div className="mt-auto flex items-center justify-between gap-2 pt-5">
          <div className="flex min-w-0 items-center">
            <div className="flex -space-x-2 space-x-reverse">
              {e.candidates.slice(0, 4).map((c) => <CandidateAvatar key={c.id} name={c.fullName} photoUrl={c.photoUrl} className="h-8 w-8 ring-2 ring-card" />)}
            </div>
            <span className="ms-2 truncate text-xs text-muted-foreground">{faNum(e.candidates.length)} نامزد · {faNum(e.seats)} کرسی</span>
          </div>
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground"><ChevronLeft className="h-4 w-4" /></span>
        </div>
        {e.isDemo && <DemoBadge className="mt-3 self-start" />}
      </Link>
    </motion.div>
  );
}

export function ElectionDetail() {
  const { slug } = useParams();
  const q = useElections();
  const { data: s } = useSettings();
  const e = q.data?.elections.find((x) => x.id === slug);
  const [text, setText] = useState('');
  useTitle(e?.title ?? 'انتخابات', e ? `${STAGE[e.status] ?? ''} — ${e.association ?? ''}` : undefined);
  if (q.isLoading) return <div className="container-page py-12"><Skeleton className="h-64 rounded-2xl" /></div>;
  if (!e) return (
    <div className="container-page py-12">
      <EmptyState title="این انتخابات یافت نشد" text="ممکن است هنوز اعلام نشده یا نشانی اشتباه باشد." action={<Button asChild variant="outline"><Link to="/elections">همه انتخابات</Link></Button>} />
    </div>
  );
  const published = e.resultsVisible;
  const rules = s?.settings?.electionRules;
  const cands = e.candidates.filter((c) => !text.trim() || c.fullName.includes(text.trim()));
  const target = e.status === 'Voting Open' ? e.votingEnd : e.status === 'Final List' && e.votingStart && new Date(e.votingStart) > new Date() ? e.votingStart : e.status === 'Candidacy Open' ? e.candidacyEnd : null;
  return (
    <>
      <section className="bg-primary text-primary-foreground">
        <div className="container-page pb-14 pt-6 sm:pt-10">
          <Link to="/elections" className="inline-flex items-center gap-1.5 text-sm text-primary-foreground/75 hover:text-primary-foreground"><ArrowRight className="h-4 w-4" />همه‌ی انجمن‌ها</Link>
          <div className="mt-4 flex flex-wrap items-center gap-2"><StatusPill status={e.status} />{e.isDemo && <DemoBadge />}</div>
          <h1 className="font-display mt-3 text-2xl font-black leading-[1.5] sm:text-4xl">{e.association ?? e.title}</h1>
          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-foreground/10 px-3 py-1.5"><Users className="h-4 w-4 text-accent" />{faNum(e.candidates.length)} نامزد</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-foreground/10 px-3 py-1.5"><Armchair className="h-4 w-4 text-accent" />{faNum(e.seats)} کرسی · حداکثر {faNum(e.maxChoicesPerVoter)} انتخاب</span>
            {e.votingStart && <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-foreground/10 px-3 py-1.5"><CalendarClock className="h-4 w-4 text-accent" />{faDate(e.votingStart, true)}</span>}
          </div>
        </div>
      </section>

      <div className="container-page -mt-8 space-y-8 pb-28 sm:pb-16">
        <div className="space-y-5 rounded-2xl border bg-card p-4 shadow-[var(--shadow-md)] sm:p-6">
          <StageTimeline status={e.status} />
          {target && <Countdown to={target} label={e.status === 'Voting Open' ? 'تا پایان رأی‌گیری:' : e.status === 'Candidacy Open' ? 'تا پایان ثبت‌نام:' : 'تا شروع رأی‌گیری:'} />}
          {e.votingOpenNow && <Button asChild size="lg" className="hidden h-12 rounded-full px-8 sm:inline-flex"><Link to={`/vote?e=${e.id}`}><Vote className="ms-2 h-5 w-5" />ورود به رأی‌گیری</Link></Button>}
        </div>
        {e.votingOpenNow && <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 p-3 backdrop-blur sm:hidden" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}><Button asChild size="lg" className="h-12 w-full rounded-full text-base"><Link to={`/vote?e=${e.id}`}><Vote className="ms-2 h-5 w-5" />ورود به رأی‌گیری</Link></Button></div>}

        {e.description && <p className="max-w-3xl whitespace-pre-line leading-8">{e.description}</p>}

        {published && (
          <section className="space-y-3">
            <h2 className="text-xl font-extrabold">{e.isDemo ? 'نتایج نمایشی (غیررسمی)' : 'نتایج رسمی'}</h2>
            <Turnout turnout={Number(e.turnout ?? 0)} eligible={Number(e.eligible ?? 0)} />
            {Number(e.blank ?? 0) > 0 && <p className="text-sm text-muted-foreground">رأی سفید: {faNum(e.blank)}</p>}
            {!e.isDemo && <PublicReport electionId={e.id} />}
          </section>
        )}

        <section>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl font-extrabold">{published ? 'آرای نامزدها' : 'نامزدهای تأییدشده'} <span className="text-base font-bold text-muted-foreground">({faNum(e.candidates.length)})</span></h2>
            {e.candidates.length > 8 && <div className="relative sm:w-64"><Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder="جست‌وجوی نام نامزد…" aria-label="جست‌وجوی نامزد" value={text} onChange={(x) => setText(x.target.value)} className="h-10 rounded-full ps-9" /></div>}
          </div>
          {!e.candidates.length ? <EmptyState title="هنوز نامزدی تأیید نشده است" text="فهرست نامزدها پس از بررسی صلاحیت منتشر می‌شود." /> : !cands.length ? <EmptyState title="نامزدی با این نام نیست" /> : (
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {cands.map((c, i) => (
                <article key={c.id} className={`flex items-center gap-3 rounded-xl border bg-card p-3 ${published && i < e.seats ? 'border-primary/50 bg-primary/[0.04]' : ''}`}>
                  <CandidateAvatar name={c.fullName} photoUrl={c.photoUrl} className="h-11 w-11" />
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-bold">{c.fullName}</h3>
                    {published && <><p className="flex items-center gap-1 text-xs font-bold text-primary">{i < e.seats && <Trophy className="h-3.5 w-3.5" aria-label="برگزیده" />}{faNum(c.votes ?? 0)} رأی</p><VoteBar votes={c.votes ?? 0} max={e.candidates[0]?.votes ?? 0} /></>}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <details className="group rounded-2xl border bg-card p-4 sm:p-6">
          <summary className="flex cursor-pointer list-none items-center justify-between font-extrabold"><span className="flex items-center gap-2"><ScrollText className="h-5 w-5 text-primary" />قوانین و شرایط</span><ChevronLeft className="h-4 w-4 transition group-open:-rotate-90" /></summary>
          {rules ? <p className="mt-3 whitespace-pre-line leading-8">{rules}</p> : (
            <ul className="mt-3 space-y-2 text-sm leading-7 text-muted-foreground">
              <li className="flex gap-2"><ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-primary" />فقط دانشجویان موجود در فهرست واجدین این انجمن حق رأی دارند؛ هر نفر یک‌بار.</li>
              <li className="flex gap-2"><ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-primary" />برگه‌ی رأی بدون هیچ شناسه‌ای ذخیره می‌شود و نتایج پیش از انتشار رسمی نمایش داده نمی‌شود.</li>
            </ul>
          )}
        </details>
      </div>
    </>
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
  return <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${max ? (votes / max) * 100 : 0}%` }} /></div>;
}

export { VotePage } from './Vote';

function PublicReport({ electionId }: { electionId: string }) {
  const q = useQuery({ queryKey: ['publicReport', electionId], queryFn: () => getElectionReports({ electionId }) as Promise<{ reports: ElectionReport[] }> });
  const reports = q.data?.reports ?? [];
  if (!reports.length) return null;
  return (
    <div className="flex flex-col gap-3 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
      <div><p className="font-bold">صورت‌جلسه‌ی رسمی نتایج</p><p className="text-xs text-muted-foreground">با اثر انگشت رمزنگاری‌شده برای راستی‌آزمایی: <code dir="ltr">{shortPrint(reports[0].fingerprint)}…</code></p></div>
      <ReportExportBar reports={reports} formats={['pdf', 'xlsx', 'csv']} />
    </div>
  );
}
