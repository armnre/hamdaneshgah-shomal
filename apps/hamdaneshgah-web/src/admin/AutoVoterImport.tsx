import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FileSpreadsheet, Loader2, CheckCircle2, AlertTriangle, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { importVotersAuto } from '../lib/api';
import { readXlsx, studentRows } from '../lib/xlsx';
import { Button } from '@project/components/ui/button';
import { errMsg, faNum } from '../lib/format';

type Rows = ReturnType<typeof studentRows>;
type Report = {
  total: number; ready: number; imported: number; alreadyPresent: number; invalidStudentNumber: number; invalidNationalId: number; duplicateInFile: number;
  perAssociation: { association: string; status: string; inFile: number; alreadyPresent: number; toAdd: number; locked: boolean }[];
  noAssociation: { majorName: string; count: number }[]; missingElection: { association: string; count: number }[];
  facultyPools: { faculty: string; associations: number; students: number; toAdd: number; majors: { majorName: string; count: number }[] }[];
};

/** کل فهرست اکسل دانشگاه را یک‌جا به انتخابات همه‌ی انجمن‌ها می‌فرستد (هر دانشجو به انجمن رشته‌اش). */
export default function AutoVoterImport() {
  const qc = useQueryClient();
  const [rows, setRows] = useState<Rows>([]);
  const [fileName, setFileName] = useState('');
  const [report, setReport] = useState<(Report & { dry: boolean }) | null>(null);
  const run = useMutation({
    mutationFn: (dryRun: boolean) => importVotersAuto({ academicYear: '1405-1406', rows, dryRun }).then((r: Report) => ({ ...r, dry: dryRun })),
    onSuccess: (r) => { setReport(r); if (!r.dry) { toast.success(`${faNum(r.imported)} رأی‌دهنده‌ی جدید ثبت شد`); qc.invalidateQueries({ queryKey: ['admin'] }); } },
    onError: (e) => toast.error(errMsg(e)),
  });
  const onFile = async (f?: File) => {
    if (!f) return;
    try {
      const r = studentRows(await readXlsx(f));
      setRows(r); setFileName(f.name); setReport(null);
      run.mutate(true);
    } catch (e) { toast.error(e instanceof Error ? e.message : 'خواندن فایل ممکن نشد'); }
  };
  return (
    <div className="space-y-4 rounded-2xl border-2 border-primary/30 bg-card p-5">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-extrabold"><FileSpreadsheet className="h-5 w-5 text-primary" />ورود کل فهرست دانشگاه (پیشنهادی)</h2>
        <p className="mt-1 text-sm leading-7 text-muted-foreground">فایل اکسل آموزش را همان‌طور که هست انتخاب کنید (ستون‌های شماره دانشجو، نام، نام خانوادگی، شماره ملی، نام رشته تحصیلی؛ ستون «دانشکده» اختیاری). هر دانشجو در هر مقطعی خودکار به انتخابات انجمن رشته‌اش می‌رود؛ رشته‌های بدون انجمن به انجمن‌های دانشکده‌ی خودشان (با یک رأی)، تکراری‌ها رد می‌شوند و فایل از مرورگر خارج نمی‌شود مگر ردیف‌ها برای ثبت.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border bg-background px-4 py-2 text-sm font-semibold hover:border-primary/50">
          <FileSpreadsheet className="h-4 w-4" />{fileName || 'انتخاب فایل xlsx'}
          <input type="file" accept=".xlsx" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        </label>
        {rows.length > 0 && <span className="text-sm text-muted-foreground">{faNum(rows.length)} ردیف خوانده شد</span>}
        {run.isPending && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
      </div>
      {report && <AutoReport r={report} />}
      {report?.dry && report.ready > 0 && (
        <Button disabled={run.isPending} onClick={() => run.mutate(false)}>{run.isPending && <Loader2 className="ms-2 h-4 w-4 animate-spin" />}ثبت {faNum(report.ready)} رأی‌دهنده‌ی جدید</Button>
      )}
    </div>
  );
}

function AutoReport({ r }: { r: Report & { dry: boolean } }) {
  const bad = r.invalidStudentNumber + r.invalidNationalId + r.duplicateInFile;
  return (
    <div className="space-y-4 text-sm">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="کل ردیف‌ها" v={r.total} />
        <Stat label="از قبل ثبت‌شده" v={r.alreadyPresent} />
        <Stat label={r.dry ? 'آماده‌ی ثبت' : 'ثبت شد'} v={r.dry ? r.ready : r.imported} strong />
        <Stat label="ردشده" v={bad} />
      </div>
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-start">
          <thead className="bg-muted/60 text-xs text-muted-foreground"><tr><th className="p-2 text-start">انجمن</th><th className="p-2">در فایل</th><th className="p-2">از قبل</th><th className="p-2">جدید</th></tr></thead>
          <tbody>{r.perAssociation.map((p) => (
            <tr key={p.association} className="border-t"><td className="p-2 font-semibold">{p.association}{p.locked && <span className="ms-2 inline-flex items-center gap-1 text-xs text-destructive"><Lock className="h-3 w-3" />قفل ({p.status})</span>}</td>
              <td className="p-2 text-center tabular-nums">{faNum(p.inFile)}</td><td className="p-2 text-center tabular-nums">{faNum(p.alreadyPresent)}</td><td className="p-2 text-center font-bold tabular-nums text-primary">{faNum(p.toAdd)}</td></tr>
          ))}</tbody>
        </table>
      </div>
      {bad > 0 && <p className="text-muted-foreground">شماره دانشجویی نامعتبر: {faNum(r.invalidStudentNumber)} · کد ملی نامعتبر: {faNum(r.invalidNationalId)} · تکراری در فایل: {faNum(r.duplicateInFile)}</p>}
      {r.facultyPools.map((f) => (
        <div key={f.faculty} className="rounded-xl border border-primary/30 bg-secondary/40 p-3">
          <p className="font-semibold">رشته‌های بدون انجمن در {f.faculty}: {faNum(f.students)} نفر</p>
          <p className="mt-1 text-xs leading-6 text-muted-foreground">این دانشجویان هنگام رأی‌دادن خودشان یکی از {faNum(f.associations)} انجمن این دانشکده را انتخاب می‌کنند و فقط یک رأی دارند. برای هر نفر در فهرست همه‌ی این انجمن‌ها یک ردیف ثبت می‌شود ({faNum(f.toAdd)} ردیف جدید، جزو عدد «آماده‌ی ثبت»).</p>
          <ul className="mt-2 flex flex-wrap gap-1.5">{f.majors.map((m) => <li key={m.majorName} className="rounded-full bg-background px-2 py-0.5 text-xs">{m.majorName} ({faNum(m.count)})</li>)}</ul>
        </div>
      ))}
      {r.noAssociation.length > 0 && (
        <div className="rounded-xl bg-accent/10 p-3">
          <p className="flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4" />رشته‌های بدون انجمن ({faNum(r.noAssociation.reduce((a, b) => a + b.count, 0))} نفر) — وارد نشدند</p>
          <p className="mt-1 text-xs leading-6 text-muted-foreground">دانشکده‌ی این رشته‌ها معلوم نشد. ستون «دانشکده» را به فایل اضافه کنید یا رشته را در majorMap (ASSOCIATION_RULES یا FACULTY_RULES) تعریف کنید.</p>
          <ul className="mt-2 flex flex-wrap gap-1.5">{r.noAssociation.map((m) => <li key={m.majorName} className="rounded-full bg-background px-2 py-0.5 text-xs">{m.majorName} ({faNum(m.count)})</li>)}</ul>
        </div>
      )}
      {r.missingElection.length > 0 && <p className="text-destructive">انتخابات این انجمن‌ها در سامانه نیست: {r.missingElection.map((m) => `${m.association} (${faNum(m.count)})`).join('، ')}</p>}
      {!r.dry && <p className="flex items-center gap-2 font-semibold text-primary"><CheckCircle2 className="h-4 w-4" />ثبت انجام شد. اجرای دوباره، رأی‌دهنده‌ی تکراری نمی‌سازد.</p>}
    </div>
  );
}

const Stat = ({ label, v, strong }: { label: string; v: number; strong?: boolean }) => (
  <div className="rounded-xl bg-muted/50 p-3"><div className="text-xs text-muted-foreground">{label}</div><div className={`text-xl font-black tabular-nums ${strong ? 'text-primary' : ''}`}>{faNum(v)}</div></div>
);
