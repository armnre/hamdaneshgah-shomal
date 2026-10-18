import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2, Mail } from 'lucide-react';
import { submitContact } from 'zitejs/api';
import { Input } from '@project/components/ui/input';
import { Textarea } from '@project/components/ui/textarea';
import { Label } from '@project/components/ui/label';
import { Button } from '@project/components/ui/button';
import { PageHero } from '../components/site/ui';
import { useSettings } from '../components/site/PublicLayout';
import { errMsg } from '../lib/format';
import { useTitle } from '../lib/useTitle';

const schema = z.object({
  senderName: z.string().trim().min(2, 'نام را وارد کنید'),
  senderEmail: z.string().trim().email('ایمیل معتبر نیست'),
  subject: z.string().trim().min(3, 'موضوع حداقل ۳ حرف'),
  message: z.string().trim().min(10, 'پیام حداقل ۱۰ حرف').max(3000, 'پیام طولانی است'),
  website: z.string().optional(),
});
type F = z.infer<typeof schema>;

export default function Contact() {
  useTitle('تماس با ما');
  const { data } = useSettings();
  const st = data?.settings ?? {};
  const { register, handleSubmit, reset, formState: { errors, isSubmitting, isValid } } = useForm<F>({ resolver: zodResolver(schema), mode: 'onChange' });
  const onSubmit = async (v: F) => {
    try { await submitContact(v); toast.success('پیام شما ثبت شد.'); reset(); } catch (e) { toast.error(errMsg(e)); }
  };
  const field = (name: keyof F, label: string, el: JSX.Element) => (
    <div className="grid gap-2"><Label htmlFor={name}>{label}</Label>{el}{errors[name] && <p className="text-sm text-destructive" role="alert">{errors[name]?.message}</p>}</div>
  );
  return (
    <>
      <PageHero image="/shomal/campus-view-4.jpg" title="تماس با ما" subtitle="پیشنهادها، گزارش خطا یا درخواست همکاری خود را با تیم پلتفرم در میان بگذارید." />
      <div className="container-page grid gap-10 py-12 lg:grid-cols-[1fr_1.4fr]">
        <div className="grid h-fit gap-4">
          {st.contactEmail && <div className="flex gap-3 rounded-2xl border bg-card p-5"><Mail className="h-5 w-5 text-primary" /><div><p className="font-bold">ایمیل سامانه</p><a dir="ltr" href={`mailto:${st.contactEmail}`} className="mt-1 block text-sm text-muted-foreground">{st.contactEmail}</a></div></div>}
          <p className="text-xs text-muted-foreground leading-6">این فرم به تیم سامانه هم‌دانشگاهی می‌رسد، نه به دانشگاه. برای امور اداری دانشگاه به خود دانشگاه مراجعه کنید.</p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-5 rounded-3xl border bg-card p-6 sm:p-8" noValidate>
          <div className="grid gap-5 sm:grid-cols-2">
            {field('senderName', 'نام و نام خانوادگی', <Input id="senderName" {...register('senderName')} />)}
            {field('senderEmail', 'ایمیل', <Input id="senderEmail" dir="ltr" type="email" {...register('senderEmail')} />)}
          </div>
          {field('subject', 'موضوع', <Input id="subject" {...register('subject')} />)}
          {field('message', 'پیام', <Textarea id="message" rows={6} {...register('message')} />)}
          <input type="text" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden {...register('website')} />
          <Button type="submit" disabled={!isValid || isSubmitting} className="justify-self-start">{isSubmitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}ارسال پیام</Button>
        </form>
      </div>
    </>
  );
}
