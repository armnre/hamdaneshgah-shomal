import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, IdCard, ListChecks, ReceiptText, ShieldCheck, ChevronLeft, Sparkles, HelpCircle, GraduationCap, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@project/components/lib/utils';
import { placeVoter, ASSOCIATION_RULES, FACULTY_RULES, FACULTIES } from '../../lib/majorMap';
import { faNum } from '../../lib/format';
import type { Election } from './ElectionCards';

const STEPS = [
  { icon: IdCard, t: 'شماره دانشجویی و کد ملی', d: 'لازم نیست انجمنت را پیدا کنی؛ سامانه خودش انتخابات رشته‌ات را می‌آورد.' },
  { icon: ListChecks, t: 'انتخاب نامزدها', d: 'تا سقف مجاز نامزد انتخاب کن، پیش از ثبت دوباره مرورشان کن.' },
  { icon: ReceiptText, t: 'ثبت و کد پیگیری', d: 'رأی بی‌نام ذخیره می‌شود و یک کد پیگیری مشارکت می‌گیری.' },
];

/** راهنمای سه‌مرحله‌ای: روی موبایل خط زمانی عمودی، روی دسکتاپ افقی. */
export function HowToVote() {
  return (
    <section aria-labelledby="how" className="rounded-3xl border bg-card p-5 sm:p-8">
      <div className="flex items-center gap-2 text-sm font-bold text-primary"><Sparkles className="h-4 w-4" />کمتر از یک دقیقه</div>
      <h2 id="how" className="mt-1 text-xl font-black sm:text-2xl">چطور رأی بدهم؟</h2>
      <ol className="relative mt-6 grid gap-6 md:grid-cols-3 md:gap-4">
        <span aria-hidden className="absolute bottom-6 start-5 top-6 w-px bg-border md:hidden" />
        <span aria-hidden className="absolute inset-x-[16%] top-5 hidden h-px bg-border md:block" />
        {STEPS.map(({ icon: Icon, t, d }, i) => (
          <motion.li key={t} initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
            className="relative flex gap-4 md:flex-col md:items-center md:text-center">
            <span className="relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground ring-4 ring-card"><Icon className="h-5 w-5" /></span>
            <div className="min-w-0">
              <span className="text-xs font-bold text-muted-foreground">مرحله‌ی {faNum(i + 1)}</span>
              <h3 className="font-extrabold leading-7">{t}</h3>
              <p className="mt-1 text-sm leading-7 text-muted-foreground">{d}</p>
            </div>
          </motion.li>
        ))}
      </ol>
      <p className="mt-6 flex items-start gap-2 rounded-2xl bg-muted/60 p-3 text-xs leading-6 text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />کد ملی ذخیره نمی‌شود و فقط برای تطبیق با فهرست واجدین به کار می‌رود. برگه‌ی رأی هیچ ارتباطی با هویت شما ندارد.
      </p>
    </section>
  );
}

/** «رشته‌ی من کدام انجمن است؟» — با نام رشته‌ی دانشگاهی (حتی گرایش) انجمن را نشان می‌دهد. */
export function MajorFinder({ elections }: { elections: Election[] }) {
  const [q, setQ] = useState('');
  const place = q.trim().length > 1 ? placeVoter(q) : null;
  const rule = place?.kind === 'association' ? place.rule : null;
  const target = rule ? elections.find((e) => e.associationSlug === rule.slug) : undefined;
  const groups = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const r of ASSOCIATION_RULES) { const s = m.get(r.association) ?? new Set(); r.match.forEach((w) => s.add(w)); m.set(r.association, s); }
    return [...m];
  }, []);
  return (
    <section id="finder" aria-labelledby="finder-h" className="scroll-mt-24 rounded-3xl bg-secondary/40 p-5 sm:p-8">
      <div className="flex items-center gap-2 text-sm font-bold text-primary"><GraduationCap className="h-4 w-4" />رشته‌ام کجاست؟</div>
      <h2 id="finder-h" className="mt-1 text-xl font-black sm:text-2xl">رشته‌ات را بنویس، انجمنت را ببین</h2>
      <div className="relative mt-4">
        <Search className="pointer-events-none absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="مثلاً حسابرسی، عمران-سازه، تربیت بدنی…" aria-label="نام رشته"
          className="h-14 w-full rounded-2xl border bg-background ps-12 pe-4 text-base outline-none ring-primary/30 transition focus:border-primary focus:ring-4" />
      </div>
      <div aria-live="polite" className="mt-3 min-h-[3.5rem]">
        {q.trim().length > 1 && (place?.kind === 'faculty' ? (
          <div className="rounded-2xl border bg-card p-4 text-sm leading-7">
            <p>رشته‌ی «{q.trim()}» انجمن مستقل ندارد؛ برای همین می‌توانی در <b>یکی از انجمن‌های {place.facultyName}</b> رأی بدهی. انتخابش هنگام رأی‌دادن با خودت است و فقط یک رأی داری.</p>
            <ul className="mt-2 flex flex-wrap gap-1.5">{place.associations.map((a) => {
              const e = elections.find((x) => x.associationSlug === a.slug);
              return <li key={a.slug}>{e ? <Link to={`/elections/${e.id}`} className="inline-block rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground hover:bg-secondary/70">{a.association}</Link> : <span className="inline-block rounded-full bg-muted px-3 py-1 text-xs">{a.association}</span>}</li>;
            })}</ul>
          </div>
        ) : rule ? (
          <div className="flex flex-col gap-3 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-7">رشته‌ی «{q.trim()}» در همه‌ی مقطع‌ها و گرایش‌ها در انتخابات <b>انجمن علمی {rule.association}</b> رأی می‌دهد.</p>
            {target && <Link to={`/elections/${target.id}`} className="inline-flex shrink-0 items-center gap-1 text-sm font-bold text-primary">دیدن نامزدها<ChevronLeft className="h-4 w-4" /></Link>}
          </div>
        ) : (
          <div className="rounded-2xl border border-accent/40 bg-accent/10 p-4 text-sm leading-7">
            <p className="flex items-center gap-2 font-bold"><Info className="h-4 w-4" />این نام رشته را نشناختیم</p>
            <p className="text-muted-foreground">نام رشته را همان‌طور که در کارنامه آمده بنویسید (مثلاً «مهندسی عمران» یا «مدیریت بازرگانی»). هر دانشجو یا در انجمن رشته‌اش رأی می‌دهد یا، اگر رشته‌اش انجمن ندارد، در یکی از انجمن‌های دانشکده‌اش. اگر باز هم مطمئن نیستید یا پیشنهاد تشکیل انجمن دارید، از <Link to="/contact" className="font-bold text-primary underline-offset-4 hover:underline">فرم تماس</Link> پیام بدهید.</p>
          </div>
        ))}
      </div>
      <details className="group mt-2">
        <summary className="flex cursor-pointer list-none items-center gap-1 text-sm font-semibold text-muted-foreground"><HelpCircle className="h-4 w-4" />فهرست کامل رشته‌ها و انجمن‌ها<ChevronLeft className="h-4 w-4 transition group-open:-rotate-90" /></summary>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {groups.map(([a, words]) => (
            <li key={a} className="rounded-xl bg-background p-3 text-sm"><b>{a}</b><span className="mt-1 block text-xs leading-6 text-muted-foreground">همه‌ی رشته‌ها و گرایش‌های شامل: {[...words].join('، ')}</span></li>
          ))}
          {FACULTY_RULES.map((r) => (
            <li key={r.major} className="rounded-xl border border-dashed bg-background p-3 text-sm"><b>{r.major}</b><span className="mt-1 block text-xs leading-6 text-muted-foreground">انجمن مستقل ندارد؛ رأی در یکی از انجمن‌های {FACULTIES[r.faculty]} (به انتخاب دانشجو)</span></li>
          ))}
        </ul>
      </details>
    </section>
  );
}

const FAQ = [
  ['رشته‌ام انجمن ندارد؛ چه کنم؟', 'نگران نباشید، شما هم رأی دارید. هنگام ورود به رأی‌گیری فهرست انجمن‌های دانشکده‌تان را می‌بینید و در یکی از آن‌ها (به انتخاب خودتان) رأی می‌دهید. هر نفر فقط یک رأی دارد.'],
  ['ارشد یا دکتری هستم؛ کجا رأی می‌دهم؟', 'مقطع فرقی نمی‌کند. دانشجوی کاردانی، کارشناسی، ارشد و دکتری با هر گرایشی در انجمن رشته‌ی اصلی خود رأی می‌دهد؛ مثلاً ارشد هوش مصنوعی در انجمن مهندسی کامپیوتر و همه‌ی رشته‌های مدیریت در انجمن مدیریت.'],
  ['گفت «در فهرست واجدین پیدا نشد»', 'شماره دانشجویی و کد ملی را دوباره بررسی کنید (اعداد فارسی هم قبول است). اگر باز هم پیدا نشد، با نام و شماره دانشجویی از فرم تماس پیگیری کنید؛ کد ملی را نفرستید.'],
  ['می‌توانم رأی‌ام را عوض کنم؟', 'نه. پیش از ثبت نهایی یک صفحه‌ی مرور دارید؛ پس از ثبت، رأی قابل تغییر نیست.'],
  ['کد پیگیری چه کاری می‌کند؟', 'فقط شرکت شما را تأیید می‌کند و هیچ اطلاعاتی درباره‌ی انتخاب‌هایتان ندارد.'],
];
export function ElectionFaq({ className }: { className?: string }) {
  return (
    <section className={cn('space-y-2', className)} aria-labelledby="faq">
      <h2 id="faq" className="text-xl font-black">پرسش‌های رایج</h2>
      {FAQ.map(([q, a]) => (
        <details key={q} className="group rounded-2xl border bg-card p-4">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-bold">{q}<ChevronLeft className="h-4 w-4 shrink-0 transition group-open:-rotate-90" /></summary>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">{a}</p>
        </details>
      ))}
    </section>
  );
}
