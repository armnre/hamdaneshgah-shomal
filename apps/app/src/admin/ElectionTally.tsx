import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminTally } from 'zitejs/api';
import { Label } from '@project/components/ui/label';
import { Skeleton } from '@project/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@project/components/ui/select';
import { useOptions } from './AdminApp';
import { errMsg, faNum } from '../lib/format';

export default function ElectionTally() {
  const opts = useOptions().data as { elections?: { id: string; name: string }[] } | undefined;
  const [id, setId] = useState('');
  const q = useQuery({ queryKey: ['tally', id], queryFn: () => adminTally({ electionId: id }), enabled: !!id });
  const max = Math.max(1, ...(q.data?.results ?? []).map((r) => r.votes));
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">شمارش آرا</h1>
        <p className="mt-2 text-sm text-muted-foreground">برای اعلام عمومی نتایج، مرحله‌ی انتخابات را در بخش «انتخابات» روی «نتایج اعلام‌شده» بگذارید.</p>
      </div>
      <div className="grid gap-2 rounded-2xl border bg-card p-5">
        <Label>انتخابات</Label>
        <Select value={id} onValueChange={setId}>
          <SelectTrigger><SelectValue placeholder="انتخاب کنید" /></SelectTrigger>
          <SelectContent>{(opts?.elections ?? []).map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      {q.isLoading && id && <Skeleton className="h-48 rounded-2xl" />}
      {q.isError && <p className="text-destructive">{errMsg(q.error)}</p>}
      {q.data && (
        <div className="space-y-4 rounded-2xl border bg-card p-5">
          <div className="grid grid-cols-3 gap-3 text-center">
            {[['واجدین', q.data.eligible], ['شرکت‌کنندگان', q.data.turnout], ['برگه‌های رأی', q.data.ballots]].map(([l, v]) => (
              <div key={l} className="rounded-xl bg-muted p-3"><p className="text-xs text-muted-foreground">{l}</p><p className="text-xl font-black">{faNum(Number(v))}</p></div>
            ))}
          </div>
          {q.data.turnout !== q.data.ballots && <p className="text-sm text-destructive">هشدار: تعداد شرکت‌کنندگان و برگه‌ها برابر نیست — گزارش رخدادها را بررسی کنید.</p>}
          <ul className="space-y-3">
            {q.data.results.map((r) => (
              <li key={r.id}>
                <div className="flex justify-between text-sm"><span className="font-semibold">{r.fullName}</span><span>{faNum(r.votes)}</span></div>
                <div className="mt-1 h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-primary" style={{ width: `${(r.votes / max) * 100}%` }} /></div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
