import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Calendar, MapPin, Clock, ExternalLink, Users } from 'lucide-react';
import { getEvent } from 'zitejs/api';
import { Skeleton } from '@project/components/ui/skeleton';
import { Badge } from '@project/components/ui/badge';
import { Button } from '@project/components/ui/button';
import { Cover, Crumbs, ErrorState, Md } from '../components/site/ui';
import { errMsg, faDate, KIND_LABEL } from '../lib/format';
import { useTitle } from '../lib/useTitle';

export default function EventDetail() {
  const { slug = '' } = useParams();
  const q = useQuery({ queryKey: ['event', slug], queryFn: () => getEvent({ slug }), retry: false });
  const e = q.data?.event as Record<string, unknown> | undefined;
  useTitle(e ? String(e.title) : 'رویداد', e?.summary ? String(e.summary) : undefined);

  if (q.isLoading) return <div className="container-page py-10"><Skeleton className="h-72 rounded-3xl" /></div>;
  if (q.isError || !e) return <div className="container-page py-16"><ErrorState text={errMsg(q.error)} /></div>;
  const isCourse = e.kind === 'Course';
  const past = new Date(String(e.endAt ?? e.startAt)) < new Date();

  return (
    <div className="container-page py-8">
      <Crumbs items={[{ to: '/', label: 'خانه' }, { to: '/events', label: isCourse ? 'دوره‌ها' : 'رویدادها' }, { label: String(e.title) }]} />
      <div className="grid gap-10 lg:grid-cols-[1fr_340px]">
        <article className="min-w-0">
          <div className="aspect-[16/8] overflow-hidden rounded-3xl"><Cover src={e.coverUrl} alt={String(e.title)} label={KIND_LABEL[String(e.kind)]} /></div>
          <Badge variant="outline" className="mt-6 border-accent/50">{KIND_LABEL[String(e.kind)]}</Badge>
          <h1 className="mt-3 text-2xl font-black leading-[1.6] sm:text-3xl">{String(e.title)}</h1>
          {Boolean(e.summary) && <p className="mt-3 text-lg leading-9 text-muted-foreground">{String(e.summary)}</p>}
          <div className="mt-6"><Md>{e.body}</Md></div>
        </article>
        <aside className="h-fit rounded-3xl border bg-card p-6 lg:sticky lg:top-24">
          <ul className="grid gap-4 text-sm">
            <li className="flex gap-3"><Calendar className="h-5 w-5 text-primary" /><div><p className="text-muted-foreground">شروع</p><p className="font-semibold">{faDate(e.startAt, true)}</p></div></li>
            {Boolean(e.endAt) && <li className="flex gap-3"><Clock className="h-5 w-5 text-primary" /><div><p className="text-muted-foreground">پایان</p><p className="font-semibold">{faDate(e.endAt, true)}</p></div></li>}
            {Boolean(e.location) && <li className="flex gap-3"><MapPin className="h-5 w-5 text-primary" /><div><p className="text-muted-foreground">مکان</p><p className="font-semibold">{String(e.location)}</p></div></li>}
            {Boolean(e.associationSlug) && <li className="flex gap-3"><Users className="h-5 w-5 text-primary" /><div><p className="text-muted-foreground">برگزارکننده</p><Link to={`/associations/${e.associationSlug}`} className="font-semibold text-primary">{String(e.associationName)}</Link></div></li>}
          </ul>
          {past ? <p className="mt-6 rounded-xl bg-muted p-3 text-center text-sm text-muted-foreground">این برنامه برگزار شده است.</p> :
            Boolean(e.registrationUrl) && <Button asChild className="mt-6 w-full"><a href={String(e.registrationUrl)} target="_blank" rel="noreferrer">ثبت‌نام<ExternalLink className="me-2 h-4 w-4" /></a></Button>}
        </aside>
      </div>
    </div>
  );
}
