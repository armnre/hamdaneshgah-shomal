import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FileUp, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { importVoters, ImportVotersOutputType } from 'zitejs/api';
import { Button } from '@project/components/ui/button';
import { Textarea } from '@project/components/ui/textarea';
import { Label } from '@project/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@project/components/ui/select';
import { useOptions } from './AdminApp';
import { errMsg, faNum } from '../lib/format';

type Row = { studentNumber: string; nationalId: string; fullName?: string; majorName?: string };

/** Accepts CSV (comma/semicolon) or tab-separated text pasted from Excel. Header row is skipped automatically. */
function parse(text: string): Row[] {
  return text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
    .map((l) => l.split(/\t|,|;/).map((c) => c.trim().replace(/^"|"$/g, '')))
    .filter((c, i) => !(i === 0 && !/[0-9۰-۹]/.test(c[0] ?? '')))
    .map(([studentNumber = '', nationalId = '', fullName, majorName]) => ({ studentNumber, nationalId, fullName, majorName }));
}

export default function VoterImport() {
  const opts = useOptions().data as { elections?: { id: string; name: string }[] } | undefined;
  const qc = useQueryClient();
  const [electionId, setElectionId] = useState('');
  const [text, setText] = useState('');
  const [report, setReport] = useState<(ImportVotersOutputType & { dry: boolean }) | null>(null);
  const rows = parse(text);

  const run = useMutation({
    mutationFn: (dryRun: boolean) => importVoters({ electionId, rows, dryRun }).then((r) => ({ ...r, dry: dryRun })),
    onSuccess: (r) => {
      setReport(r);
      if (!r.dry) { toast.success(`${faNum(r.imported)} نفر وارد شدند`); setText(''); qc.invalidateQueries({ queryKey: ['admin'] }); }
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  const onFile = async (f?: File) => {
    if (!f) return;
    if (!/\.(csv|txt|tsv)$/i.test(f.name)) { toast.error('فایل را در اکسل با قالب CSV (UTF-8) ذخیره کنید.'); return; }
    setText(await f.text()); setReport(null);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">ورود فهرست واجدین رأی</h1>
        <p className="mt-2 text-sm leading-7 text-muted-foreground">ستون‌ها به ترتیب: <b>شماره دانشجویی، کد ملی، نام، رشته</b>. می‌توانید ردیف‌ها را مستقیم از اکسل کپی کنید یا فایل CSV بارگذاری کنید. کد ملی خام ذخیره نمی‌شود؛ فقط نسخه‌ی رمزنگاری‌شده و ۴ رقم آخر.</p>
      </div>
      <div className="grid gap-4 rounded-2xl border bg-card p-5">
        <div className="grid gap-2">
          <Label>انتخابات</Label>
          <Select value={electionId} onValueChange={(v) => { setElectionId(v); setReport(null); }}>
            <SelectTrigger><SelectValue placeholder="انتخاب کنید" /></SelectTrigger>
            <SelectContent>{(opts?.elections ?? []).map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <div className="flex items-center justify-between"><Label htmlFor="rows">ردیف‌ها</Label>
            <label className="inline-flex cursor-pointer items-center gap-1 text-sm text-primary"><FileUp className="h-4 w-4" />بارگذاری CSV<input type="file" accept=".csv,.txt,.tsv" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} /></label>
          </div>
          <Textarea id="rows" dir="ltr" rows={10} className="font-mono text-xs" value={text} onChange={(e) => { setText(e.target.value); setReport(null); }} placeholder={'40112345\t0012345678\tعلی رضایی\tمهندسی کامپیوتر'} />
          <p className="text-xs text-muted-foreground">{faNum(rows.length)} ردیف شناسایی شد</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={!electionId || !rows.length || run.isPending} onClick={() => run.mutate(true)}>{run.isPending && <Loader2 className="ms-2 h-4 w-4 animate-spin" />}بررسی و پیش‌نمایش</Button>
          <Button disabled={!report?.dry || !report.valid || run.isPending} onClick={() => run.mutate(false)}>ورود {report?.dry ? faNum(report.valid) : ''} ردیف معتبر</Button>
        </div>
      </div>
      {report && <Report r={report} />}
    </div>
  );
}

function Report({ r }: { r: ImportVotersOutputType & { dry: boolean } }) {
  return (
    <div className="space-y-3 rounded-2xl border bg-card p-5">
      <p className="flex items-center gap-2 font-semibold"><CheckCircle2 className="h-5 w-5 text-primary" />{r.dry ? `${faNum(r.valid)} ردیف معتبر و آماده‌ی ورود` : `${faNum(r.imported)} ردیف وارد شد`}</p>
      {r.errors.length > 0 && (
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-destructive"><AlertTriangle className="h-4 w-4" />{faNum(r.errors.length)} ردیف رد شد</p>
          <ul className="mt-2 max-h-64 space-y-1 overflow-y-auto text-sm">
            {r.errors.slice(0, 300).map((e) => <li key={e.row}>ردیف {faNum(e.row)}: {e.message}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
