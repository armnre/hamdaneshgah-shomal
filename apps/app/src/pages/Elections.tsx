import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useCallback } from 'react';
import { Vote, CheckCircle2, Loader2, Trophy, ShieldCheck, Copy, Search, ScrollText, Building2 } from 'lucide-react';
import { useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@project/components/ui/select';
import { CandidateAvatar } from '../components/site/CandidateAvatar';
import { ElectionCard, DemoBadge, STAGE, type Election } from '../components/site/ElectionCards';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@project/components/ui/alert-dialog';
import { StageTimeline, Countdown, SessionTimer } from '../components/site/ElectionUI';
import { listPublicElections, castVote, verifyVoter } from 'zitejs/api';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { Label } from '@project/components/ui/label';
import { Checkbox } from '@project/components/ui/checkbox';
import { Skeleton } from '@project/components/ui/skeleton';
import { PageHero, EmptyState, ErrorState, Crumbs } from '../components/site/ui';
import { useSettings } from '../components/site/PublicLayout';
import { useTitle } from '../lib/useTitle';
import { errMsg, faDate, faNum } from '../lib/format';

const useElections = () => useQuery({ queryKey: ['publicElections'], queryFn: () => listPublicElections({}) });
const ALL = '__all';

export function ElectionsList() {
  useTitle('انتخابات انجمن‌های علمی', 'زمان‌بندی، نامزدهای تأییدشده و نتایج رسمی انتخابات انجمن‌های علمی دانشگاه شمال');
  const { data: s } = useSettings();
  const q = useElections();
  const list = q.data?.elections ?? [];
  const [status, setStatus] = useState(ALL);
  const [assoc, setAssoc] = useState(ALL);
  const [year, setYear] = useState(ALL);
  const [text, setText] = useState('');
  const opts = useMemo(() => ({
    status: [...new Set(list.map((e) => e.status))],
    assoc: [...new Set(list.map((e) => e.association).filter(Boolean))] as string[],
    year: [...new Set(list.map((e) => e.academicYear).filter(Boolean))] as string[],
  }), [list]);
  const shown = list.filter((e) => (status === ALL || e.status === status) && (assoc === ALL || e.association === assoc) && (year === ALL || e.academicYear === year) && (!text || e.title.includes(text)));
  const reset = () => { setStatus(ALL); setAssoc(ALL); setYear(ALL); setText(''); };
  return (
    <>
      <PageHero image="/shomal/campus-grounds-4.jpg" title="انتخابات انجمن‌های علمی" subtitle="زمان‌بندی، نامزدها و نتایج انتخابات انجمن‌ها" />
      <div className="container-page py-10">
        <Crumbs items={[{ to: '/', label: 'خانه' }, { label: 'انتخابات' }]} />
        {list.length > 0 && (
          <div className="mb-6 grid gap-3 rounded-2xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative"><Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden /><Input aria-label="جست‌وجو در عنوان" placeholder="جست‌وجو…" value={text} onChange={(x) => setText(x.target.value)} className="ps-9" /></div>
            <Filter label="وضعیت" value={status} onChange={setStatus} items={opts.status.map((v) => [v, STAGE[v] ?? v])} />
            <Filter label="انجمن" value={assoc} onChange={setAssoc} items={opts.assoc.map((v) => [v, v])} />
            <Filter label="سال تحصیلی" value={year} onChange={setYear} items={opts.year.map((v) => [v, v])} />
          </div>
        )}
        {q.isLoading ? <div className="grid gap-4 md:grid-cols-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-56 rounded-2xl" />)}</div>
          : q.isError ? <ErrorState onRetry={() => q.refetch()} />
          : !list.length ? <EmptyState title="هنوز انتخاباتی اعلام نشده است" text={s?.settings?.electionNote || 'زمان ثبت‌نام نامزدها و رأی‌گیری پس از تصویب، در این صفحه منتشر می‌شود.'} />
          : !shown.length ? <EmptyState title="انتخاباتی با این فیلترها یافت نشد" action={<Button variant="outline" onClick={reset}>حذف فیلترها</Button>} />
          : <><p className="mb-3 text-sm text-muted-foreground">{faNum(shown.length)} انتخابات</p><div className="grid gap-4 md:grid-cols-2">{shown.map((e) => <ElectionCard key={e.id} e={e} />)}</div></>}
      </div>
    </>
  );
}

function Filter({ label, value, onChange, items }: { label: string; value: string; onChange: (v: string) => void; items: string[][] }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={label}><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>همه‌ی {label}‌ها</SelectItem>
        {items.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
      </SelectContent>
    </Select>
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
      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Fact k="کرسی‌ها" v={faNum(e.seats)} />
        <Fact k="حداکثر انتخاب هر رأی‌دهنده" v={faNum(e.maxChoicesPerVoter)} />
        <Fact k="انجمن" v={e.association ?? '—'} />
        <Fact k="رأی‌گیری هم‌زمان همه‌ی رشته‌ها (وقت تهران)" v={e.votingStart ? `${faDate(e.votingStart, true)} تا ${faDate(e.votingEnd, true)}` : 'اعلام نشده'} />
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {e.candidates.map((c, i) => (
              <article key={c.id} className={`rounded-2xl border bg-card p-5 ${published && i < e.seats ? 'border-primary/50 bg-primary/[0.03]' : ''}`}>
                <div className="flex items-center gap-4">
                  <CandidateAvatar name={c.fullName} photoUrl={c.photoUrl} className="h-16 w-16 text-2xl sm:h-20 sm:w-20" />
                  <div className="min-w-0">
                    <h3 className="text-base font-extrabold leading-7">{c.fullName}</h3>
                    <p className="text-xs text-muted-foreground">نامزد دبیری {e.association ?? 'انجمن'}</p>
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
