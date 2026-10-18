import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Users, Building2, BookOpen, CalendarDays, MapPin, ShieldCheck } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { Skeleton } from '@project/components/ui/skeleton';
import { faNum } from '../../lib/format';
import { IMG, altFor } from '../../lib/brand';

type Props = { title?: string; subtitle?: string; stats?: Record<string, unknown>; loading: boolean };

const STATS = [
  { k: 'faculties', l: 'دانشکده', i: Building2 },
  { k: 'majors', l: 'رشته تحصیلی', i: BookOpen },
  { k: 'associations', l: 'انجمن فعال', i: Users },
  { k: 'events', l: 'رویداد', i: CalendarDays },
];

const fade = (d = 0) => ({ initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.6, delay: d, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } });

export default function HomeHero({ title, subtitle, stats, loading }: Props) {
  return (
    <section className="relative isolate overflow-hidden bg-primary text-primary-foreground">
      <motion.img
        src="/shomal/campus-aerial-1.jpg" alt="نمای هوایی پردیس دانشگاه شمال در دامنه جنگل، آمل" fetchPriority="high"
        initial={{ scale: 1.08 }} animate={{ scale: 1 }} transition={{ duration: 1.6, ease: 'easeOut' }}
        className="absolute inset-0 -z-20 h-full w-full object-cover"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-l from-primary via-primary/80 to-primary/40" />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-t from-primary to-transparent" />
      <div aria-hidden className="girih-gold absolute inset-y-0 start-0 -z-10 w-2/5 opacity-25 [mask-image:linear-gradient(to_left,black,transparent)]" />
      <div aria-hidden className="pointer-events-none absolute inset-3 -z-10 border border-accent/30 sm:inset-5" />

      <div className="container-page grid gap-12 pb-24 pt-14 sm:pt-20 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:pb-32">
        <div>
          <motion.div {...fade()} className="mb-6 inline-flex items-center gap-3 rounded-full border border-primary-foreground/20 bg-primary-foreground/10 py-1.5 pe-4 ps-1.5 backdrop-blur">
            <img src={IMG.emblem} alt="نشان دانشگاه شمال" className="h-8 w-8 rounded-full bg-white object-contain p-0.5" />
            <span className="text-xs font-semibold sm:text-sm">دانشگاه شمال · آمل</span>
          </motion.div>
          <motion.div {...fade(0.08)}>
            {loading ? <Skeleton className="h-28 w-full bg-primary-foreground/10" /> : (
              <h1 className="font-display text-balance text-4xl font-bold leading-[1.35] sm:text-5xl lg:text-[3.4rem]">
                {title || 'خانه‌ی مشترک دانشجویان دانشگاه شمال'}
              </h1>
            )}
          </motion.div>
          <motion.p {...fade(0.16)} className="mt-6 max-w-xl text-base leading-8 text-primary-foreground/85 sm:text-lg">
            {subtitle || 'انجمن‌های علمی، رویدادها، دوره‌ها و اخبار دانشجویی — همه در یک جا.'}
          </motion.p>
          <motion.div {...fade(0.24)} className="mt-9 flex flex-wrap gap-3">
            <Button asChild size="lg" className="h-12 bg-accent px-6 text-accent-foreground shadow-lg hover:bg-accent/90">
              <Link to="/associations">کاوش انجمن‌ها<ArrowLeft className="ms-2 h-4 w-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 border-primary-foreground/30 bg-primary-foreground/5 px-6 text-primary-foreground backdrop-blur hover:bg-primary-foreground/15 hover:text-primary-foreground">
              <Link to="/events">رویدادهای پیش رو</Link>
            </Button>
          </motion.div>
          <motion.div {...fade(0.3)} className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-primary-foreground/65">
            <span className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" /> آمل، مازندران</span>
            <span className="flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5" /> محتوای تأییدشده توسط انجمن‌ها</span>
          </motion.div>
        </div>

        <motion.div {...fade(0.2)} className="relative hidden lg:block">
          <div className="grid grid-cols-5 grid-rows-2 gap-3">
            <Photo src="/shomal/campus-aerial-3.jpg" alt="نمای هوایی ساختمان‌های پردیس دانشگاه شمال" className="col-span-5 aspect-[16/7]" />
            <Photo src={IMG.life[0]} alt={altFor(IMG.life[0])} className="col-span-3 aspect-[4/3]" />
            <Photo src="/shomal/campus-grounds-3.jpg" alt="فضای سبز پردیس دانشگاه شمال" className="col-span-2 aspect-[4/3]" />
          </div>
          <div className="absolute -bottom-10 start-6 end-6 grid grid-cols-4 gap-2 rounded-2xl border border-primary-foreground/15 bg-primary/85 p-3 shadow-2xl backdrop-blur-md">
            {STATS.map(({ k, l, i: Icon }) => <Stat key={k} label={l} value={stats?.[k]} Icon={Icon} />)}
          </div>
        </motion.div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:hidden">
          {STATS.map(({ k, l, i: Icon }) => (
            <div key={k} className="rounded-2xl border border-primary-foreground/15 bg-primary-foreground/10 p-3 backdrop-blur">
              <Stat label={l} value={stats?.[k]} Icon={Icon} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Photo({ src, alt, className }: { src: string; alt: string; className: string }) {
  return (
    <div className={`frame-double overflow-hidden rounded-md border border-accent/40 shadow-xl ${className}`}>
      <img src={src} alt={alt} loading="lazy" className="h-full w-full object-cover transition duration-700 hover:scale-105" />
    </div>
  );
}

function Stat({ label, value, Icon }: { label: string; value: unknown; Icon: typeof Users }) {
  return (
    <div className="text-center">
      <Icon className="mx-auto h-4 w-4 text-accent" />
      <div className="mt-1 text-2xl font-black">{value === undefined ? '…' : faNum(value)}</div>
      <div className="text-[11px] text-primary-foreground/70">{label}</div>
    </div>
  );
}
