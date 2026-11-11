import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Vote, Trophy, Search, ScrollText, Building2, CalendarClock } from 'lucide-react';
import { CandidateAvatar } from '../components/site/CandidateAvatar';
import { ElectionCard, DemoBadge, STAGE } from '../components/site/ElectionCards';
import { StageTimeline, Countdown } from '../components/site/ElectionUI';
import { listPublicElections } from '../lib/api';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { Skeleton } from '@project/components/ui/skeleton';
import { PageHero, EmptyState, ErrorState, Crumbs } from '../components/site/ui';
import { useSettings } from '../components/site/PublicLayout';
import { useTitle } from '../lib/useTitle';
import { faDate, faNum } from '../lib/format';

const useElections = () => useQuery({ queryKey: ['publicElections'], queryFn: () => listPublicElections({}) });

export function ElectionsList() {
  useTitle('انتخابات انجمن‌های علمی', 'زمان‌بندی، نامزدهای تأییدشده و نتایج رسمی انتخابات انجمن‌های علمی دانشگاه شمال');
  const { data: s } = useSettings();
  const q = useElections();
  const list = q.data?.elections ?? [];
  const [text, setText] = useState('');
  const shown = list.filter((e) => !text || `${e.association ?? ''} ${e.title}`.includes(text.trim()));
  const summary = useMemo(() => {
    const real = list.filter((e) => !e.isDemo);
    return {
      open: real.some((e) => e.votingOpenNow),
      start: real.map((e) => e.votingStart).filter(Boolean).sort()[0],
      end: real.map((e) => e.votingEnd).filter(Boolean).sort().slice(-1)[0],
      cands: real.reduce((n, e) => n + e.candidates.length, 0),
      count: real.length,
    };
  }, [list]);
  return (
    <>
      <PageHero image="/shomal/campus-grounds-4.jpg" title="انتخابات انجمن‌های علمی" subtitle="انجمن رشته‌ات را پیدا کن و نامزدها را ببین" />
      <div className="container-page max-w-4xl py-10">
        <Crumbs items={[{ to: '/', label: 'خانه' }, { label: 'انتخابات' }]} />
        {q.isLoading ? <div className="space-y-2">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
          : q.isError ? <ErrorState onRetry={() => q.refetch()} />
          : !list.length ? <EmptyState title="هنوز انتخاباتی اعلام نشده است" text={s?.settings?.electionNote || 'زمان ثبت‌نام نامزدها و رأی‌گیری پس از تصویب، در این صفحه منتشر می‌شود.'} />
          : (
            <>
              {summary.start && (
                <div className="mb-6 flex flex-col gap-4 rounded-2xl border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="flex items-center gap-2 text-sm text-muted-foreground"><CalendarClock className="h-4 w-4 text-primary" aria-hidden />زمان رأی‌گیری (همه‌ی انجمن‌ها هم‌زمان)</p>
                    <p className="mt-1 font-bold">{faDate(summary.start, true)} تا {faDate(summary.end, true)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{faNum(summary.count)} انجمن · {faNum(summary.cands)} نامزد</p>
                  </div>
                  {summary.open && <Button asChild size="lg" className="rounded-full"><Link to="/vote"><Vote className="ms-2 h-5 w-5" />ورود به رأی‌گیری</Link></Button>}
                </div>
              )}
              <div className="relative mb-4">
                <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Input aria-label="جست‌وجوی انجمن" placeholder="جست‌وجوی انجمن یا رشته…" value={text} onChange={(x) => setText(x.target.value)} className="h-11 ps-9" />
              </div>
              {!shown.length ? <EmptyState title="انجمنی با این نام یافت نشد" action={<Button variant="outline" onClick={() => setText('')}>پاک کردن جست‌وجو</Button>} />
                : <div className="space-y-2">{shown.map((e) => <ElectionCard key={e.id} e={e} />)}</div>}
            </>
          )}
      </div>
    </>
  );
}

function Fact({ k, v }: { k: string; v: string }) {
  return <div className="rounded-xl bg-muted/60 p-3"><dt className="text-xs text-muted-foreground">{k}</dt><dd className="mt-1 font-bold">{v}</dd></div>;
}

export function ElectionDetail() {
  const { slug } = useParams();
  const q = useElections();
  const { data: s } = useSettings();
  const e = q.data?.elections.find((x) => x.id === slug);
  useTitle(e?.title ?? 'انتخابات', e ? `${STAGE[e.status] ?? ''} — ${e.association ?? ''}` : undefined);
  if (q.isLoading) return <div className="container-page py-12"><Skeleton className="h-64 rounded-2xl" /></div>;
  if (!e) return (
    <div className="container-page py-12">
      <Crumbs items={[{ to: '/', label: 'خانه' }, { to: '/elections', label: 'انتخابات' }, { label: 'یافت نشد' }]} />
      <EmptyState title="این انتخابات یافت نشد" text="ممکن است هنوز اعلام نشده یا نشانی اشتباه باشد." action={<Button asChild variant="outline"><Link to="/elections">همه انتخابات</Link></Button>} />
    </div>
  );
  const published = e.resultsVisible;
  const rules = s?.settings?.electionRules;
  return (
    <div className="container-page space-y-8 py-10 pb-28 sm:pb-10">
      <Crumbs items={[{ to: '/', label: 'خانه' }, { to: '/elections', label: 'انتخابات' }, { label: e.title }]} />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2"><span className="text-sm font-semibold text-primary">{STAGE[e.status]}</span>{e.isDemo && <DemoBadge />}</div>
          <h1 className="mt-1 text-3xl font-black leading-[1.4]">{e.title}</h1>
          {e.association && <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground"><Building2 className="h-4 w-4" aria-hidden />{e.associationSlug ? <Link className="underline-offset-4 hover:underline" to={`/associations/${e.associationSlug}`}>{e.association}</Link> : e.association}{e.academicYear && ` · سال تحصیلی ${e.academicYear}`}</p>}
        </div>
        {e.votingOpenNow && <Button asChild size="lg" className="hidden rounded-full sm:inline-flex"><Link to={`/vote?e=${e.id}`}><Vote className="ms-2 h-5 w-5" />ورود به رأی‌گیری</Link></Button>}
        {e.votingOpenNow && <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 p-3 backdrop-blur sm:hidden" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}><Button asChild size="lg" className="h-12 w-full rounded-full text-base"><Link to={`/vote?e=${e.id}`}><Vote className="ms-2 h-5 w-5" />ورود به رأی‌گیری</Link></Button></div>}
        {e.isDemo && e.status === 'Voting Open' && <span className="rounded-lg border border-dashed px-4 py-2 text-sm text-muted-foreground">انتخابات نمایشی — امکان رأی‌دادن ندارد</span>}
      </div>
      <div className="space-y-5 rounded-2xl border bg-card p-5 sm:p-6">
        <StageTimeline status={e.status} />
        {e.status === 'Candidacy Open' && e.candidacyEnd && <Countdown to={e.candidacyEnd} label="تا پایان ثبت‌نام نامزدها:" />}
        {e.status === 'Final List' && e.votingStart && new Date(e.votingStart) > new Date() && <Countdown to={e.votingStart} label="تا شروع رأی‌گیری:" />}
        {e.status === 'Voting Open' && e.votingEnd && <Countdown to={e.votingEnd} label="تا پایان رأی‌گیری:" />}
      </div>
      <dl className="grid gap-3 sm:grid-cols-3">
        <Fact k="کرسی‌ها" v={faNum(e.seats)} />
        <Fact k="حداکثر انتخاب هر رأی‌دهنده" v={faNum(e.maxChoicesPerVoter)} />
        <Fact k="زمان رأی‌گیری" v={e.votingStart ? `${faDate(e.votingStart, true)} تا ${faDate(e.votingEnd, true)}` : 'اعلام نشده'} />
      </dl>
      {e.description && <p className="max-w-3xl whitespace-pre-line leading-8">{e.description}</p>}
      {published && (
        <section aria-labelledby="res" className="space-y-4">
          <div className="flex flex-wrap items-center gap-2"><h2 id="res" className="text-xl font-extrabold">{e.isDemo ? 'نتایج نمایشی (غیررسمی)' : 'نتایج رسمی'}</h2>{e.isDemo && <DemoBadge />}</div>
          {e.isDemo && <p className="rounded-xl border border-dashed border-accent/60 bg-accent/10 p-3 text-sm">این اعداد ساختگی‌اند و فقط برای پیش‌نمایش ظاهر صفحه ساخته شده‌اند؛ هیچ اعتبار رسمی ندارند.</p>}
          <Turnout turnout={Number(e.turnout ?? 0)} eligible={Number(e.eligible ?? 0)} />
          {Number(e.blank ?? 0) > 0 && <p className="text-sm text-muted-foreground">رأی سفید: {faNum(e.blank)}</p>}
        </section>
      )}
      <section>
        <h2 className="mb-4 text-xl font-extrabold">{published ? 'آرای نامزدها' : 'نامزدهای تأییدشده'}</h2>
        {!e.candidates.length ? <EmptyState title="هنوز نامزدی تأیید نشده است" text="فهرست نامزدها پس از بررسی صلاحیت منتشر می‌شود." /> : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {e.candidates.map((c, i) => (
              <article key={c.id} className={`rounded-xl border bg-card p-4 ${published && i < e.seats ? 'border-primary/50 bg-primary/[0.03]' : ''}`}>
                <div className="flex items-center gap-4">
                  <CandidateAvatar name={c.fullName} photoUrl={c.photoUrl} className="h-12 w-12" />
                  <div className="min-w-0">
                    <h3 className="font-bold leading-7">{c.fullName}</h3>
                                        {published && <p className="mt-1 flex items-center gap-1 text-sm font-bold text-primary">{i < e.seats && <Trophy className="h-4 w-4" aria-label="برگزیده" />}{faNum(c.votes ?? 0)} رأی</p>}
                  </div>
                </div>
                {published && <VoteBar votes={c.votes ?? 0} max={e.candidates[0]?.votes ?? 0} />}
              </article>
            ))}
          </div>
        )}
      </section>
      <section className="rounded-2xl border bg-card p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-lg font-extrabold"><ScrollText className="h-5 w-5 text-primary" aria-hidden />قوانین و شرایط</h2>
        {rules ? <p className="mt-3 whitespace-pre-line leading-8">{rules}</p> : (
          <ul className="mt-3 list-disc space-y-1 ps-5 leading-8 text-muted-foreground">
            <li>فقط دانشجویان موجود در فهرست واجدین این انجمن حق رأی دارند؛ هر نفر یک‌بار.</li>
            <li>برگه‌ی رأی بدون هیچ شناسه‌ای ذخیره می‌شود و نتایج پیش از پایان رأی‌گیری و انتشار رسمی نمایش داده نمی‌شود.</li>
            <li>قواعد صلاحیت نامزدها و روش تعیین برنده: <strong>نیازمند تأیید رسمی دانشگاه</strong>.</li>
          </ul>
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

export { VotePage } from './Vote';
