import { useEffect, useState } from 'react';
import { useUpload } from 'zitejs/upload';
import { toast } from 'sonner';
import { Loader2, Upload } from 'lucide-react';
import { Input } from '@project/components/ui/input';
import { Textarea } from '@project/components/ui/textarea';
import { Label } from '@project/components/ui/label';
import { Checkbox } from '@project/components/ui/checkbox';
import { Button } from '@project/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@project/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@project/components/ui/sheet';
import { cn } from '@project/components/lib/utils';
import { Field, Resource } from './resources';
import { useOptions } from './AdminApp';
import { faDate, fromLocalInput, toLocalInput } from '../lib/format';

type Vals = Record<string, unknown>;

function validate(fields: Field[], v: Vals) {
  const e: Record<string, string> = {};
  for (const f of fields) {
    const val = v[f.name];
    if (f.required && (val === undefined || val === null || val === '')) e[f.name] = 'این فیلد الزامی است';
    if (val && (f.type === 'url' || f.type === 'image') && !/^https?:\/\/.+/.test(String(val))) e[f.name] = 'نشانی باید با http(s) شروع شود';
    if (val && f.type === 'email' && !/^\S+@\S+\.\S+$/.test(String(val))) e[f.name] = 'ایمیل معتبر نیست';
  }
  return e;
}

function ImageInput({ value, onChange, id }: { value: string; onChange: (v: string) => void; id: string }) {
  const { upload, isUploading } = useUpload();
  return (
    <div className="grid gap-2">
      <div className="flex gap-2">
        <Input id={id} dir="ltr" value={value} onChange={(e) => onChange(e.target.value)} placeholder="https://…" />
        <Button type="button" variant="outline" disabled={isUploading} asChild>
          <label className="cursor-pointer">{isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
              const file = e.target.files?.[0]; if (!file) return;
              try { const { url } = await upload(file); onChange(url); } catch { toast.error('بارگذاری ناموفق بود'); }
            }} />
          </label>
        </Button>
      </div>
      {value && <img src={value} alt="" className="h-28 w-full rounded-lg border object-cover" />}
    </div>
  );
}

export default function FormSheet({ res, open, initial, onClose, onSave, saving }: {
  res: Resource; open: boolean; initial: Vals | null; onClose: () => void; onSave: (v: Vals) => void; saving: boolean;
}) {
  const [v, setV] = useState<Vals>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const opts = useOptions().data as Record<string, { id: string; name: string; facultyId?: string }[]> | undefined;
  useEffect(() => { if (open) { setV(initial ?? { ...(res.defaults ?? {}) }); setErrors({}); } }, [open, initial, res]);
  const set = (k: string, val: unknown) => setV((p) => ({ ...p, [k]: val }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate(res.fields, v); setErrors(errs);
    if (Object.keys(errs).length) return;
    const data: Vals = {};
    for (const f of res.fields) data[f.name] = f.type === 'number' ? (v[f.name] === '' || v[f.name] == null ? null : Number(v[f.name])) : f.type === 'checkbox' ? Boolean(v[f.name]) : v[f.name] ?? null;
    onSave(data);
  };

  const render = (f: Field) => {
    const val = v[f.name];
    const common = { id: f.name, 'aria-invalid': !!errors[f.name] };
    switch (f.type) {
      case 'textarea': return <Textarea {...common} rows={3} value={String(val ?? '')} onChange={(e) => set(f.name, e.target.value)} />;
      case 'markdown': return <Textarea {...common} rows={10} className="font-mono text-sm leading-7" value={String(val ?? '')} onChange={(e) => set(f.name, e.target.value)} />;
      case 'image': return <ImageInput id={f.name} value={String(val ?? '')} onChange={(x) => set(f.name, x)} />;
      case 'checkbox': return null;
      case 'datetime': return (<div className="grid gap-1"><Input {...common} type="datetime-local" dir="ltr" value={toLocalInput(val)} onChange={(e) => set(f.name, fromLocalInput(e.target.value))} />{Boolean(val) && <span className="text-xs text-muted-foreground">{faDate(val, true)} (به وقت تهران)</span>}</div>);
      case 'select': {
        let options = f.options ?? (opts?.[f.source!] ?? []).map((o) => ({ value: o.id, label: o.name }));
        if (f.source === 'majors' && v.faculty) options = (opts?.majors ?? []).filter((m) => m.facultyId === v.faculty).map((o) => ({ value: o.id, label: o.name }));
        return (
          <div className="flex gap-2">
            <Select value={val ? String(val) : undefined} onValueChange={(x) => set(f.name, x)}>
              <SelectTrigger id={f.name} aria-invalid={!!errors[f.name]}><SelectValue placeholder="انتخاب کنید" /></SelectTrigger>
              <SelectContent>{options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
            </Select>
            {!f.required && Boolean(val) && <Button type="button" variant="ghost" size="sm" onClick={() => set(f.name, null)}>حذف</Button>}
          </div>
        );
      }
      default: return <Input {...common} dir={f.dir} type={f.type === 'number' ? 'number' : f.type === 'email' ? 'email' : 'text'} value={String(val ?? '')} onChange={(e) => set(f.name, e.target.value)} />;
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="left" className="flex w-full flex-col gap-0 p-0 sm:max-w-2xl">
        <SheetHeader className="border-b p-6"><SheetTitle>{initial?.id ? `ویرایش ${res.singular}` : `${res.singular} جدید`}</SheetTitle></SheetHeader>
        <form id="resform" onSubmit={submit} className="flex-1 overflow-y-auto p-6" noValidate>
          <div className="grid gap-5 sm:grid-cols-2">
            {res.fields.filter((f) => f.type !== 'checkbox').map((f) => (
              <div key={f.name} className={cn('grid gap-2', f.wide && 'sm:col-span-2')}>
                <Label htmlFor={f.name}>{f.label}{f.required && <span className="text-destructive"> *</span>}</Label>
                {render(f)}
                {errors[f.name] ? <p role="alert" className="text-xs text-destructive">{errors[f.name]}</p> : f.hint && <p className="text-xs text-muted-foreground">{f.hint}</p>}
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-6">
            {res.fields.filter((f) => f.type === 'checkbox').map((f) => (
              <label key={f.name} className="flex items-center gap-2 text-sm"><Checkbox checked={Boolean(v[f.name])} onCheckedChange={(c) => set(f.name, c === true)} />{f.label}</label>
            ))}
          </div>
        </form>
        <SheetFooter className="gap-2 border-t p-4 sm:justify-start">
          <Button type="submit" form="resform" disabled={saving}>{saving && <Loader2 className="ms-2 h-4 w-4 animate-spin" />}ذخیره</Button>
          <Button type="button" variant="outline" onClick={onClose}>انصراف</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
