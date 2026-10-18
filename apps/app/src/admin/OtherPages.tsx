import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { adminList, adminSave } from 'zitejs/api';
import { Input } from '@project/components/ui/input';
import { Textarea } from '@project/components/ui/textarea';
import { Label } from '@project/components/ui/label';
import { Button } from '@project/components/ui/button';
import { Skeleton } from '@project/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@project/components/ui/select';
import { Badge } from '@project/components/ui/badge';
import { ErrorState, EmptyState } from '../components/site/ui';
import { errMsg, faDate, STATUS_LABEL } from '../lib/format';

type Row = Record<string, unknown>;

const SETTING_LABELS: Record<string, { label: string; long?: boolean }> = {
  productName: { label: 'نام محصول' }, tagline: { label: 'عنوان توصیفی', long: true }, heroTitle: { label: 'عنوان بخش اصلی صفحه نخست', long: true },
  heroSubtitle: { label: 'زیرعنوان صفحه نخست', long: true }, electionStatus: { label: 'وضعیت انتخابات (none = غیرفعال)' },
  electionNote: { label: 'توضیح بخش انتخابات', long: true }, contactEmail: { label: 'ایمیل تماس با سامانه' },
};

export function SettingsPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['admin', 'settings'], queryFn: () => adminList({ entity: 'settings' }) });
  const [vals, setVals] = useState<Record<string, { id: string; value: string }>>({});
  useEffect(() => { const m: typeof vals = {}; ((q.data?.rows as Row[]) ?? []).forEach((r) => (m[String(r.key)] = { id: String(r.id), value: String(r.value ?? '') })); setVals(m); }, [q.data]);
  const save = useMutation({
    mutationFn: async () => { for (const [key, v] of Object.entries(vals)) await adminSave({ entity: 'settings', id: v.id, data: { key, value: v.value } }); },
    onSuccess: () => { toast.success('تنظیمات ذخیره شد'); qc.invalidateQueries(); }, onError: (e) => toast.error(errMsg(e)),
  });
  if (q.isError) return <ErrorState text={errMsg(q.error)} />;
  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-extrabold">تنظیمات عمومی</h1>
      <div className="mt-6 grid gap-5 rounded-2xl border bg-card p-6">
        {q.isLoading ? <Skeleton className="h-96" /> : Object.keys(vals).filter((k) => k !== 'mission').sort((a, b) => Object.keys(SETTING_LABELS).indexOf(a) - Object.keys(SETTING_LABELS).indexOf(b)).map((k) => {
          const meta = SETTING_LABELS[k] ?? { label: k };
          const on = (value: string) => setVals((p) => ({ ...p, [k]: { ...p[k], value } }));
          return <div key={k} className="grid gap-2"><Label htmlFor={k}>{meta.label}</Label>{meta.long ? <Textarea id={k} rows={2} value={vals[k].value} onChange={(e) => on(e.target.value)} /> : <Input id={k} value={vals[k].value} onChange={(e) => on(e.target.value)} />}</div>;
        })}
        <Button className="justify-self-start" onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending && <Loader2 className="ms-2 h-4 w-4 animate-spin" />}ذخیره تنظیمات</Button>
      </div>
    </div>
  );
}

export function AuditPage() {
  const q = useQuery({ queryKey: ['admin', 'audit'], queryFn: () => adminList({ entity: 'audit' }) });
  const rows = ((q.data?.rows as Row[]) ?? []).slice(0, 300);
  return (
    <div>
      <h1 className="text-2xl font-extrabold">گزارش رخدادهای مدیریتی</h1>
      <p className="mt-1 text-sm text-muted-foreground">آخرین ۳۰۰ رخداد. این گزارش فقط‌خواندنی است.</p>
      <div className="mt-6 grid gap-2">
        {q.isError ? <ErrorState text={errMsg(q.error)} /> : q.isLoading ? <Skeleton className="h-80" /> : rows.length === 0 ? <EmptyState title="رخدادی ثبت نشده" /> : rows.map((r) => (
          <div key={String(r.id)} className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border bg-card px-4 py-3 text-sm">
            <Badge variant="secondary">{String(r.action)}</Badge><span className="font-semibold">{String(r.entity)}</span>
            <span className="truncate text-xs text-muted-foreground">{String(r.details ?? '')}</span>
            <span dir="ltr" className="me-auto text-xs text-muted-foreground">{String(r.actorEmail ?? '')}</span>
            <span className="text-xs text-muted-foreground">{faDate(r.loggedAt, true)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MessagesPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['admin', 'messages'], queryFn: () => adminList({ entity: 'messages' }) });
  const upd = useMutation({ mutationFn: (p: { id: string; status: string }) => adminSave({ entity: 'messages', id: p.id, data: { status: p.status } }), onSuccess: () => qc.invalidateQueries({ queryKey: ['admin'] }), onError: (e) => toast.error(errMsg(e)) });
  const rows = (q.data?.rows as Row[]) ?? [];
  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-extrabold">پیام‌های تماس</h1>
      <div className="mt-6 grid gap-3">
        {q.isError ? <ErrorState text={errMsg(q.error)} /> : q.isLoading ? <Skeleton className="h-60" /> : rows.length === 0 ? <EmptyState title="پیامی دریافت نشده" /> : rows.map((m) => (
          <article key={String(m.id)} className="rounded-2xl border bg-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><h2 className="font-bold">{String(m.subject)}</h2><p className="text-xs text-muted-foreground">{String(m.senderName)} · <span dir="ltr">{String(m.senderEmail)}</span> · {faDate(m.receivedAt, true)}</p></div>
              <Select value={String(m.status ?? 'New')} onValueChange={(s) => upd.mutate({ id: String(m.id), status: s })}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>{['New', 'Read', 'Closed'].map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7">{String(m.message)}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
