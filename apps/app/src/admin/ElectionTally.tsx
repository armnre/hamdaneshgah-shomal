import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { adminTally, adminElectionStage } from 'zitejs/api';
import { Button } from '@project/components/ui/button';
import { ELECTION_STATUS } from './resources';
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
        <p className="mt-2 text-sm text-muted-foreground">شمارش فقط پس از پایان رأی‌گیری نمایش داده می‌شود. مراحل به ترتیب: پایان رأی‌گیری ← شمارش ← تأیید نتایج ← اعلام عمومی ← بایگانی.</p>
      </div>
      <div className="grid gap-2 rounded-2xl border bg-card p-5">
        <Label>انتخابات</Label>
        <Select value={id} onValueChange={setId}>
          <SelectTrigger><SelectValue placeholder="انتخاب کنید" /></SelectTrigger>
          <SelectContent>{(opts?.elections ?? []).map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      {id && <StageBar id={id} status={q.data?.status} />}
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

const NEXT: Record<string, { to: 'Closed' | 'Counting' | 'Results Confirmed' | 'Results Published' | 'Archived'; label: string }> = {
  Closed: { to: 'Counting', label: 'شروع شمارش' },
  Counting: { to: 'Results Confirmed', label: 'تأیید نتایج' },
  'Results Confirmed': { to: 'Results Published', label: 'اعلام عمومی نتایج' },
  'Results Published': { to: 'Archived', label: 'بایگانی' },
};

function StageBar({ id, status }: { id: string; status?: string }) {
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: (to: (typeof NEXT)[string]['to']) => adminElectionStage({ electionId: id, to }),
    onSuccess: () => { toast.success('مرحله به‌روزرسانی شد'); qc.invalidateQueries({ queryKey: ['tally', id] }); qc.invalidateQueries({ queryKey: ['admin'] }); },
    onError: (e) => toast.error(errMsg(e)),
  });
  const next = status ? NEXT[status] : undefined;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4">
      <p className="text-sm">مرحله‌ی فعلی: <span className="font-bold">{status ? ELECTION_STATUS[status as keyof typeof ELECTION_STATUS] ?? status : 'رأی‌گیری یا پیش از آن'}</span></p>
      <div className="flex gap-2">
        {!status && <Button variant="outline" size="sm" disabled={m.isPending} onClick={() => m.mutate('Closed')}>پایان رأی‌گیری</Button>}
        {next && <Button size="sm" disabled={m.isPending} onClick={() => m.mutate(next.to)}>{next.label}</Button>}
      </div>
    </div>
  );
}
