import { Link } from 'react-router-dom';
import { Button } from '@project/components/ui/button';
import { PageHero } from '../components/site/ui';
import { useTitle } from '../lib/useTitle';

const CONTENT = {
  privacy: {
    title: 'سیاست حریم خصوصی',
    body: [
      'این پلتفرم تنها اطلاعات لازم برای ارائه خدمات را نگهداری می‌کند: نشانی ایمیل کاربران واردشده، و اطلاعاتی که در فرم تماس ثبت می‌کنید.',
      'ورود با «لینک یک‌بارمصرف ایمیلی» انجام می‌شود و هیچ رمز عبوری ذخیره نمی‌شود.',
      'پیام‌های فرم تماس فقط برای مدیران مجاز قابل مشاهده است و در صفحات عمومی نمایش داده نمی‌شود.',
      'عملیات مدیریتی در گزارش رخدادها ثبت می‌شود تا قابل پیگیری باشد.',
      'برای درخواست حذف اطلاعات خود از طریق صفحه تماس با ما اقدام کنید.',
    ],
  },
  terms: {
    title: 'شرایط استفاده',
    body: [
      'محتوای منتشرشده توسط انجمن‌ها مسئولیت همان انجمن است و باید با مقررات دانشگاه همخوان باشد.',
      'این پلتفرم وب‌سایت رسمی دانشگاه شمال نیست؛ برای اطلاعات رسمی به shomal.ac.ir مراجعه کنید.',
      'هرگونه تلاش برای دسترسی غیرمجاز به بخش‌های مدیریتی ممنوع است و ثبت می‌شود.',
    ],
  },
};

export default function Legal({ kind }: { kind: 'privacy' | 'terms' }) {
  const c = CONTENT[kind];
  useTitle(c.title);
  return (
    <>
      <PageHero title={c.title} />
      <div className="container-page max-w-3xl py-12"><ul className="grid gap-4 leading-8">{c.body.map((b) => <li key={b} className="rounded-xl border bg-card p-4">{b}</li>)}</ul></div>
    </>
  );
}

export function NotFound() {
  useTitle('صفحه یافت نشد', undefined, true);
  return (
    <div className="container-page flex flex-col items-center py-28 text-center">
      <p className="text-7xl font-black text-primary">۴۰۴</p>
      <h1 className="mt-4 text-2xl font-extrabold">صفحه موردنظر یافت نشد</h1>
      <p className="mt-2 text-muted-foreground">ممکن است نشانی تغییر کرده یا حذف شده باشد.</p>
      <Button asChild className="mt-8"><Link to="/">بازگشت به خانه</Link></Button>
    </div>
  );
}
