import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Vote, CheckCircle2, Loader2, Trophy, CalendarClock } from 'lucide-react';
import { listPublicElections, castVote, ListPublicElectionsOutputType } from 'zitejs/api';
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
const STAGE: Record<string, string> = { 'Candidacy Open': 'ثبت‌نام نامزدها', 'Candidate Review': 'بررسی صلاحیت نامزدها', 'Voting Open': 'رأی‌گیری', Closed: 'پایان رأی‌گیری — در انتظار اعلام نتایج', 'Results Published': 'نتایج اعلام شد' };
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
  return (
    <Link to={`/elections/${e.id}`} className="block rounded-2xl border bg-card p-6 transition hover:shadow-[var(--shadow-md)]">
      <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{STAGE[e.status] ?? e.status}</span>
      <h2 className="mt-3 text-lg font-extrabold">{e.title}</h2>
      {e.association && <p className="mt-1 text-sm text-muted-foreground">{e.association}</p>}
      {e.votingStart && <p className="mt-3 flex items-center gap-2 text-sm"><CalendarClock className="h-4 w-4 text-primary" />رأی‌گیری: {faDate(e.votingStart, true)} تا {faDate(e.votingEnd, true)}</p>}
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
      {e.description && <p className="max-w-3xl whitespace-pre-line leading-8">{e.description}</p>}
      {published && <p className="rounded-xl bg-muted p-4 text-sm">مشارکت: {faNum(e.turnout ?? 0)} از {faNum(e.eligible ?? 0)} واجد شرایط</p>}
      <section>
        <h2 className="mb-4 text-xl font-extrabold">{published ? 'نتایج' : 'نامزدهای تأییدشده'}</h2>
        {!e.candidates.length ? <EmptyState title="هنوز نامزدی تأیید نشده است" /> : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {e.candidates.map((c, i) => (
              <div key={c.id} className="rounded-2xl border bg-card p-5">
                <div className="flex items-center gap-3">
                  {c.photoUrl ? <img src={c.photoUrl} alt={c.fullName} className="h-14 w-14 rounded-full object-cover" /> : <div className="grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-lg font-bold text-primary">{c.fullName[0]}</div>}
                  <div>
                    <p className="font-bold">{c.fullName}</p>
                    {published && <p className="flex items-center gap-1 text-sm text-primary">{i < e.seats && <Trophy className="h-4 w-4" />}{faNum(c.votes ?? 0)} رأی</p>}
                  </div>
                </div>
                {c.statement && <p className="mt-3 line-clamp-5 text-sm leading-7 text-muted-foreground">{c.statement}</p>}
              </div>
            ))}
          </div>
        )}
      </section>
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
  const [picked, setPicked] = useState<string[]>([]);
  const vote = useMutation({ mutationFn: () => castVote({ electionId: e.id, studentNumber: sn, nationalId: nid, candidateIds: picked }) });
  const toggle = (id: string) => setPicked((p) => p.includes(id) ? p.filter((x) => x !== id) : p.length < e.maxChoicesPerVoter ? [...p, id] : p);

  if (vote.isSuccess) return (
    <div className="container-page grid min-h-[50vh] place-items-center py-12">
      <div className="max-w-md rounded-3xl border bg-card p-8 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-primary" />
        <h1 className="mt-4 text-xl font-extrabold">رأی شما ثبت شد</h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">رأی بدون نام ذخیره شده است. کد رسید شما:</p>
        <p dir="ltr" className="mt-2 font-mono text-2xl font-bold tracking-widest">{vote.data.receipt}</p>
      </div>
    </div>
  );
  return (
    <div className="container-page py-12">
      <form className="mx-auto max-w-xl space-y-6 rounded-3xl border bg-card p-6 sm:p-8" onSubmit={(ev) => { ev.preventDefault(); vote.mutate(); }}>
        <div>
          <h1 className="text-2xl font-extrabold">{e.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">رأی‌گیری تا {faDate(e.votingEnd, true)} · هر نفر فقط یک‌بار</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2"><Label htmlFor="sn">شماره دانشجویی</Label><Input id="sn" dir="ltr" inputMode="numeric" autoComplete="off" value={sn} onChange={(x) => setSn(x.target.value)} required /></div>
          <div className="grid gap-2"><Label htmlFor="nid">کد ملی</Label><Input id="nid" dir="ltr" inputMode="numeric" autoComplete="off" value={nid} onChange={(x) => setNid(x.target.value)} required /></div>
        </div>
        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-semibold">نامزدها را انتخاب کنید ({faNum(picked.length)} از حداکثر {faNum(e.maxChoicesPerVoter)})</legend>
          {e.candidates.map((c) => (
            <label key={c.id} className="flex cursor-pointer items-center gap-3 rounded-xl border p-3 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
              <Checkbox checked={picked.includes(c.id)} onCheckedChange={() => toggle(c.id)} disabled={!picked.includes(c.id) && picked.length >= e.maxChoicesPerVoter} />
              <span className="font-medium">{c.fullName}</span>
            </label>
          ))}
        </fieldset>
        {vote.isError && <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{errMsg(vote.error)}</p>}
        <Button type="submit" size="lg" className="w-full" disabled={!sn || !nid || !picked.length || vote.isPending}>
          {vote.isPending && <Loader2 className="ms-2 h-4 w-4 animate-spin" />}ثبت نهایی رأی
        </Button>
        <p className="text-xs leading-6 text-muted-foreground">پس از ثبت، رأی قابل تغییر نیست. برگه‌ی رأی بدون هیچ شناسه‌ای از شما ذخیره می‌شود؛ فقط «رأی داده است» برای شما ثبت می‌شود.</p>
      </form>
    </div>
  );
}
