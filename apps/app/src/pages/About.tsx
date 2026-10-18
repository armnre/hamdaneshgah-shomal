import { Link } from 'react-router-dom';
import { CheckCircle2, CircleDashed } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { PageHero } from '../components/site/ui';
import { useSettings } from '../components/site/PublicLayout';
import { useTitle } from '../lib/useTitle';

const PHASES = [
  { t: 'فاز یک — هسته پلتفرم', done: true, items: ['انجمن‌های علمی، دانشکده‌ها و رشته‌ها', 'اخبار، اطلاعیه‌ها، رویدادها و دوره‌ها', 'پنل مدیریت با نقش‌های دسترسی و گزارش رخدادها'] },
  { t: 'فاز دو — سامانه انتخابات', done: false, items: ['ثبت‌نام و بررسی صلاحیت نامزدها', 'ورود امن فهرست دانشجویان', 'رأی‌گیری محرمانه، شمارش و ممیزی'] },
  { t: 'فاز سه — خدمات دانشجویی', done: false, items: ['عضویت در انجمن‌ها', 'انتخابات شورای صنفی و تشکل‌ها', 'اعلان‌ها و ثبت‌نام رویدادها'] },
];

export default function About() {
  useTitle('درباره پلتفرم');
  const { data } = useSettings();
  return (
    <>
      <PageHero title="درباره پردیس شمال" image="/shomal/banner-1.webp" subtitle={data?.settings.tagline} />
      <div className="container-page max-w-4xl py-12">
        <p className="text-lg leading-9">{data?.settings.mission}</p>
        <h2 className="mt-12 text-2xl font-extrabold">نقشه راه</h2>
        <div className="mt-6 grid gap-4">
          {PHASES.map((p) => (
            <div key={p.t} className="rounded-2xl border bg-card p-6">
              <h3 className="flex items-center gap-2 font-bold">{p.done ? <CheckCircle2 className="h-5 w-5 text-primary" /> : <CircleDashed className="h-5 w-5 text-muted-foreground" />}{p.t}<span className="mr-auto text-xs font-normal text-muted-foreground">{p.done ? 'فعال' : 'برنامه‌ریزی‌شده'}</span></h3>
              <ul className="mt-3 grid gap-1 pr-7 text-sm leading-7 text-muted-foreground">{p.items.map((i) => <li key={i}>• {i}</li>)}</ul>
            </div>
          ))}
        </div>
        <Button asChild className="mt-10"><Link to="/contact">ارتباط با تیم</Link></Button>
      </div>
    </>
  );
}
