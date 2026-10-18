import { Link } from 'react-router-dom';
import { Vote, ArrowLeft, CalendarRange, Users, Building2, Armchair } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import type { Election } from './ElectionCards';
import { DemoBadge, STAGE } from './ElectionCards';
import { useNow } from './ElectionUI';
import { CandidateAvatar } from './CandidateAvatar';
import { faDate, faNum } from '../../lib/format';

/** All associations vote in one shared window: derive it from the current round. */
export function currentRound(list: Election[]) {
  const live = list.filter((e) => !['Results Published', 'Archived'].includes(e.status));
  const round = live.length ? live : [];
  const starts = round.map((e) => e.votingStart).filter(Boolean) as string[];
  const ends = round.map((e) => e.votingEnd).filter(Boolean) as string[];
  return {
    round,
    start: starts.sort()[0] ?? null,
    end: ends.sort().at(-1) ?? null,
    open: round.some((e) => e.status === 'Voting Open'),
    canVote: round.some((e) => e.votingOpenNow),
    demo: round.some((e) => e.isDemo),
  };
}

function BigCountdown({ to, label }: { to: string; label: string }) {
  const now = useNow();
  const left = Math.max(0, new Date(to).getTime() - now);
  const parts: [number, string][] = [[Math.floor(left / 864e5), 'روز'], [Math.floor(left / 36e5) % 24, 'ساعت'], [Math.floor(left / 6e4) % 60, 'دقیقه'], [Math.floor(left / 1e3) % 60, 'ثانیه']];
  return (
    <div>
      <p className="text-sm font-semibold text-primary-foreground/80">{label}</p>
      <div className="mt-2 grid grid-cols-4 gap-2 sm:gap-3" aria-live="off">
        {parts.map(([v, u]) => (
          <div key={u} className="rounded-2xl border border-primary-foreground/15 bg-primary-foreground/10 px-1 py-3 text-center backdrop-blur-sm">
            <span className="block text-3xl font-black tabular-nums leading-none sm:text-4xl">{faNum(v)}</span>
            <span className="mt-1 block text-xs text-primary-foreground/75">{u}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function HomeElections({ list }: { list: Election[] }) {
  const r = currentRound(list);
  const past = list.filter((e) => ['Results Published', 'Archived'].includes(e.status)).slice(0, 3);
  const before = r.start && new Date(r.start).getTime() > Date.now();
  const candidates = r.round.reduce((n, e) => n + e.candidates.length, 0);
  const seats = r.round.reduce((n, e) => n + e.seats, 0);
  const year = r.round.find((e) => e.academicYear)?.academicYear;
  return (
    <div className="space-y-6">
      <div className="relative isolate overflow-hidden rounded-[2rem] bg-primary text-primary-foreground shadow-[var(--shadow-lg)]">
        <img src="https://images.fillout.com/896986/xxqkb8qduj/generated-images/u2fK9jeE9CoogQHQRTqihY/img_31qsOI13rC34dxnV.jpg" alt="" aria-hidden className="absolute inset-0 -z-10 h-full w-full object-cover opacity-70" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-l from-primary via-primary/90 to-primary/30" />
        <div className="grid gap-8 p-6 sm:p-10 lg:grid-cols-[1.2fr_1fr] lg:p-14">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-black text-accent-foreground">
                {r.open && <span className="h-2 w-2 rounded-full bg-accent-foreground motion-safe:animate-pulse" />}
                {r.open ? 'رأی‌گیری آغاز شد' : r.round.length ? 'به‌زودی' : 'انتخابات'}
              </span>
              {r.demo && <DemoBadge />}
            </div>
            <h2 id="home-elections" className="mt-5 text-3xl font-black leading-[1.35] sm:text-5xl">
              انتخابات انجمن‌های علمی{year && <span className="block text-accent">سال تحصیلی {year}</span>}
            </h2>
            <p className="mt-4 max-w-xl text-base leading-8 text-primary-foreground/85 sm:text-lg">
              {r.round.length ? 'همه‌ی رشته‌ها هم‌زمان رأی می‌دهند. با شماره‌ی دانشجویی و کد ملی وارد شوید و دبیر انجمن رشته‌ی خود را انتخاب کنید.' : 'زمان‌بندی دور بعدی انتخابات پس از تصویب در همین‌جا اعلام می‌شود.'}
            </p>
            {r.start && (
              <p className="mt-5 inline-flex flex-wrap items-center gap-2 rounded-xl bg-primary-foreground/10 px-4 py-2 text-sm font-semibold">
                <CalendarRange className="h-4 w-4 text-accent" aria-hidden />{faDate(r.start, true)} تا {faDate(r.end, true)}
              </p>
            )}
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              {r.canVote && <Button asChild size="lg" className="h-14 bg-accent px-8 text-base font-black text-accent-foreground hover:bg-accent/90"><Link to="/vote"><Vote className="ms-2 h-5 w-5" />ورود به رأی‌گیری</Link></Button>}
              <Button asChild size="lg" variant="outline" className="h-14 border-primary-foreground/30 bg-transparent px-8 text-base text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"><Link to="/elections">نامزدها و جزئیات<ArrowLeft className="me-2 h-4 w-4" /></Link></Button>
            </div>
            {r.open && !r.canVote && <p className="mt-3 text-xs text-primary-foreground/70">این دور نمایشی است و امکان رأی‌دادن ندارد.</p>}
          </div>
          <div className="flex flex-col justify-end gap-6">
            {r.end && <BigCountdown to={before ? r.start! : r.end} label={before ? 'تا آغاز رأی‌گیری' : 'تا پایان رأی‌گیری'} />}
            {r.round.length > 0 && (
              <dl className="grid grid-cols-3 gap-2 text-center sm:gap-3">
                {[[Building2, r.round.length, 'انجمن'], [Users, candidates, 'نامزد'], [Armchair, seats, 'کرسی']].map(([Icon, v, l]) => {
                  const I = Icon as typeof Users;
                  return (
                    <div key={String(l)} className="rounded-2xl bg-primary-foreground/10 p-3">
                      <I className="mx-auto h-5 w-5 text-accent" aria-hidden />
                      <dd className="mt-1 text-2xl font-black">{faNum(v)}</dd>
                      <dt className="text-xs text-primary-foreground/75">{String(l)}</dt>
                    </div>
                  );
                })}
              </dl>
            )}
          </div>
        </div>
      </div>

      {r.round.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {r.round.map((e) => (
            <Link key={e.id} to={`/elections/${e.id}`} className="group rounded-2xl border bg-card p-4 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[var(--shadow-md)] motion-reduce:hover:translate-y-0">
              <p className="text-xs font-semibold text-primary">{STAGE[e.status] ?? e.status}</p>
              <p className="mt-1 line-clamp-2 font-bold leading-7">{e.association ?? e.title}</p>
              <div className="mt-3 flex items-center justify-between">
                <div className="flex -space-x-2 space-x-reverse">
                  {e.candidates.slice(0, 4).map((c) => <CandidateAvatar key={c.id} name={c.fullName} photoUrl={c.photoUrl} className="h-9 w-9 ring-2 ring-card" />)}
                </div>
                <span className="text-xs text-muted-foreground">{faNum(e.candidates.length)} نامزد</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {past.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-semibold text-muted-foreground">نتایج گذشته:</span>
          {past.map((e) => <Link key={e.id} to={`/elections/${e.id}`} className="rounded-full border bg-card px-3 py-1.5 transition hover:border-primary/40 hover:text-primary">{e.title}</Link>)}
        </div>
      )}
    </div>
  );
}
