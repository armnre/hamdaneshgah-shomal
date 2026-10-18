import { useState } from 'react';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Loader2, UserPlus, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { submitContact } from 'zitejs/api';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { Label } from '@project/components/ui/label';
import { Textarea } from '@project/components/ui/textarea';
import { errMsg } from '../../lib/format';

const schema = z.object({
  name: z.string().trim().min(2, 'نام را کامل وارد کنید'),
  email: z.string().trim().email('ایمیل معتبر نیست'),
  studentId: z.string().trim().regex(/^[0-9۰-۹]{6,12}$/, 'شماره دانشجویی ۶ تا ۱۲ رقم است'),
  motivation: z.string().trim().min(10, 'حداقل ۱۰ کاراکتر بنویسید').max(1500),
});
type F = z.infer<typeof schema>;

// Membership request — lands in the admin «پیام‌ها» inbox, tagged with the association name.
export default function JoinAssociation({ name }: { name: string }) {
  const [f, setF] = useState<F>({ name: '', email: '', studentId: '', motivation: '' });
  const [touched, setTouched] = useState(false);
  const parsed = schema.safeParse(f);
  const errs = parsed.success ? {} : Object.fromEntries(parsed.error.issues.map((i) => [i.path[0], i.message]));
  const m = useMutation({
    mutationFn: () => submitContact({ senderName: f.name, senderEmail: f.email, subject: `درخواست عضویت — ${name}`.slice(0, 150), message: `شماره دانشجویی: ${f.studentId}\n\n${f.motivation}` }),
    onError: (e) => toast.error(errMsg(e)),
  });

  if (m.isSuccess) return (
    <div className="rounded-2xl border bg-secondary/50 p-6 text-center">
      <CheckCircle2 className="mx-auto h-8 w-8 text-primary" />
      <p className="mt-3 font-bold">درخواست شما ثبت شد</p>
      <p className="mt-1 text-sm text-muted-foreground">مسئولان انجمن به‌زودی با شما تماس می‌گیرند.</p>
    </div>
  );

  const field = (k: keyof F, label: string, props: Record<string, unknown> = {}) => (
    <div className="grid gap-1.5">
      <Label htmlFor={`j-${k}`}>{label}</Label>
      <Input id={`j-${k}`} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} {...props} />
      {touched && errs[k] && <p className="text-xs text-destructive">{errs[k]}</p>}
    </div>
  );

  return (
    <form className="grid gap-3 rounded-2xl border bg-card p-5" noValidate
      onSubmit={(e) => { e.preventDefault(); setTouched(true); if (parsed.success) m.mutate(); }}>
      <div className="flex items-center gap-2 font-extrabold"><UserPlus className="h-5 w-5 text-primary" />عضویت در انجمن</div>
      {field('name', 'نام و نام خانوادگی')}
      {field('studentId', 'شماره دانشجویی', { dir: 'ltr', inputMode: 'numeric' })}
      {field('email', 'ایمیل', { dir: 'ltr', type: 'email' })}
      <div className="grid gap-1.5">
        <Label htmlFor="j-motivation">چرا می‌خواهید عضو شوید؟</Label>
        <Textarea id="j-motivation" rows={3} value={f.motivation} onChange={(e) => setF({ ...f, motivation: e.target.value })} />
        {touched && errs.motivation && <p className="text-xs text-destructive">{errs.motivation}</p>}
      </div>
      <Button type="submit" disabled={m.isPending || (touched && !parsed.success)}>{m.isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}ارسال درخواست</Button>
    </form>
  );
}
