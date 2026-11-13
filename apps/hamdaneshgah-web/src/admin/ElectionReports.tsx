// گزارش‌گیری رسمی نتایج: به محض پایان رأی‌گیری هر انتخابات خودکار آماده است؛ تک‌انتخابات یا همه با هم، در چند قالب.
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, AlertTriangle, Trophy, Users, Percent, Vote, ShieldCheck } from 'lucide-react';
import { adminElectionReports } from '../lib/api';
import { Skeleton } from '@project/components/ui/skeleton';
import { Badge } from '@project/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@project/components/ui/select';
import { errMsg, faNum, faDate } from '../lib/format';
import { OUTCOME_LABEL, STATUS_FA, reportName, shortPrint, type ElectionReport } from '../lib/reportExport';
import ReportExportBar from '../components/report/ReportExportBar';

const ALL = '__all__';

export default function ElectionReports() {
  const [id, setId] = useState(ALL);
  const q = useQuery({ queryKey: ['reports'], queryFn: () => adminElectionReports({}) as Promise<{ reports: ElectionReport[] }>, refetchInterval: 60_000 });
  const all = q.data?.reports ?? [];
  const shown = useMemo(() => (id === ALL ? all : all.filter((r) => r.election.id === id)), [all, id]);
  const totals = useMemo(() => shown.reduce((t, r) => ({ eligible: t.eligible + r.stats.eligible, turnout: t.turnout + r.stats.turnout, elected: t.elected + r.elected.length, warn: t.warn + (r.integrity.ok && !r.warnings.length ? 0 : 1) }), { eligible: 0, turnout: 0, elected: 0, warn: 0 }), [shown]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">گزارش رسمی نتایج</h1>
        <p className="mt-2 text-sm leading-7 text-muted-foreground">گزارش هر انتخابات به محض پایان رأی‌گیری خودکار ساخته می‌شود: رتبه‌بندی، منتخبان و علی‌البدل‌ها، تساوی‌های مرزی، کنترل صحت شمارش و اثر انگشت رمزنگاری‌شده. خروجی رسمی با جای امضای کمیته در قالب‌های PDF، Excel، Word، CSV و JSON.</p>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <Select value={id} onValueChange={setId}>
          <SelectTrigger className="sm:w-80"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>همه‌ی انتخابات پایان‌یافته ({faNum(all.length)})</SelectItem>
            {all.map((r) => <SelectItem key={r.election.id} value={r.election.id}>{reportName(r)}</SelectItem>)}
          </SelectContent>
        </Select>
        <ReportExportBar reports={shown} />
      </div>

      {q.isLoading && <Skeleton className="h-64 rounded-2xl" />}
      {q.isError && <p className="text-destructive">{errMsg(q.error)}</p>}
      {q.data && !all.length && <p className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">هنوز رأی‌گیری هیچ انتخاباتی پایان نیافته است. گزارش‌ها پس از پایان رأی‌گیری خودکار این‌جا می‌آیند.</p>}

      {shown.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[[Users, 'واجدین', faNum(totals.eligible)], [Vote, 'شرکت‌کنندگان', faNum(totals.turnout)], [Percent, 'مشارکت کل', `٪${faNum(totals.eligible ? Math.round((totals.turnout / totals.eligible) * 1000) / 10 : 0)}`], [Trophy, 'منتخبان', faNum(totals.elected)]].map(([Icon, l, v]) => {
            const I = Icon as typeof Users;
            return <div key={String(l)} className="rounded-2xl border bg-card p-4"><I className="h-4 w-4 text-primary" /><p className="mt-2 text-xs text-muted-foreground">{String(l)}</p><p className="text-2xl font-black">{String(v)}</p></div>;
          })}
        </div>
      )}

      <div className="space-y-4">{shown.map((r) => <ReportCard key={r.election.id} r={r} />)}</div>
    </div>
  );
}

function ReportCard({ r }: { r: ElectionReport }) {
  const clean = r.integrity.ok && !r.warnings.length;
  return (
    <article className="overflow-hidden rounded-2xl border bg-card">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b p-4">
        <div>
          <h2 className="font-extrabold">{reportName(r)}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{r.election.academicYear} · {faNum(r.election.seats)} کرسی · {STATUS_FA[r.election.status] ?? r.election.status} · تهیه: {faDate(r.generatedAt, true)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={clean ? 'secondary' : 'destructive'} className="gap-1">{clean ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}{clean ? 'صحت شمارش تأیید شد' : 'نیازمند بررسی'}</Badge>
          <ReportExportBar reports={[r]} formats={['pdf', 'xlsx', 'docx']} />
        </div>
      </header>
      <div className="grid grid-cols-3 gap-px bg-border text-center sm:grid-cols-6">
        {[['واجدین', r.stats.eligible], ['شرکت‌کنندگان', r.stats.turnout], ['مشارکت ٪', r.stats.turnoutPercent], ['برگه‌ها', r.stats.ballots], ['آرا', r.stats.totalVotes], ['میانگین انتخاب', r.stats.averageChoices]].map(([l, v]) => (
          <div key={String(l)} className="bg-card p-3"><p className="text-[11px] text-muted-foreground">{l}</p><p className="font-black">{faNum(v)}</p></div>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-xs text-muted-foreground"><tr><th className="p-2">رتبه</th><th className="p-2 text-start">نامزد</th><th className="p-2">آرا</th><th className="p-2">٪ برگه‌ها</th><th className="p-2">نتیجه</th></tr></thead>
          <tbody>{r.rows.map((x) => (
            <tr key={x.id} className={`border-t ${x.outcome === 'elected' ? 'bg-primary/[0.06] font-semibold' : ''}`}>
              <td className="p-2 text-center">{faNum(x.rank)}</td>
              <td className="p-2">{x.fullName}{x.tie && <Badge variant="outline" className="ms-2 text-[10px]">تساوی مرزی</Badge>}</td>
              <td className="p-2 text-center">{faNum(x.votes)}</td>
              <td className="p-2 text-center">{faNum(x.percentOfBallots)}</td>
              <td className="p-2 text-center">{x.outcome === 'not-elected' ? <span className="text-muted-foreground">—</span> : <Badge variant={x.outcome === 'elected' ? 'default' : 'secondary'}>{OUTCOME_LABEL[x.outcome]}</Badge>}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      {r.warnings.length > 0 && <ul className="space-y-1 border-t bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">{r.warnings.map((w) => <li key={w} className="flex gap-2"><AlertTriangle className="mt-1 h-4 w-4 shrink-0" />{w}</li>)}</ul>}
      <footer className="flex flex-wrap items-center gap-2 border-t p-3 text-xs text-muted-foreground"><ShieldCheck className="h-4 w-4 text-primary" />اثر انگشت نتیجه: <code dir="ltr" className="font-mono">{shortPrint(r.fingerprint)}…</code></footer>
    </article>
  );
}
