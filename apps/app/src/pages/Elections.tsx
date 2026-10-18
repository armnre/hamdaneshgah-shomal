import { Link, useParams } from 'react-router-dom';
import { Vote } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { PageHero, EmptyState, Crumbs } from '../components/site/ui';
import { useSettings } from '../components/site/PublicLayout';
import { useTitle } from '../lib/useTitle';

// The election module (phase 2–5) is not built yet; these routes exist so links and
// bookmarks resolve, and they say plainly that no election is open.
export function ElectionsList() {
  useTitle('انتخابات انجمن‌های علمی');
  const { data } = useSettings();
  const note = data?.settings?.electionNote;
  return (
    <>
      <PageHero image="/shomal/ai-workshop.webp" title="انتخابات انجمن‌های علمی" subtitle="انتخابات سال تحصیلی ۱۴۰۵-۱۴۰۶ در همین صفحه اعلام می‌شود." />
      <div className="container-page py-12">
        <EmptyState title="هنوز انتخاباتی اعلام نشده است" text={note || 'زمان ثبت‌نام نامزدها و رأی‌گیری پس از تصویب، در این صفحه منتشر می‌شود.'} />
      </div>
    </>
  );
}

export function ElectionDetail() {
  const { slug } = useParams();
  useTitle('انتخابات');
  return (
    <div className="container-page py-12">
      <Crumbs items={[{ to: '/', label: 'خانه' }, { to: '/elections', label: 'انتخابات' }, { label: slug ?? '' }]} />
      <EmptyState title="این انتخابات یافت نشد" text="ممکن است هنوز اعلام نشده یا نشانی اشتباه باشد." action={<Button asChild variant="outline"><Link to="/elections">همه انتخابات</Link></Button>} />
    </div>
  );
}

export function VotePage() {
  useTitle('رأی‌دهی', undefined, true);
  return (
    <div className="container-page grid min-h-[50vh] place-items-center py-12">
      <div className="max-w-md rounded-3xl border bg-card p-8 text-center">
        <Vote className="mx-auto h-8 w-8 text-primary" aria-hidden />
        <h1 className="mt-4 text-xl font-extrabold">رأی‌گیری فعالی وجود ندارد</h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">وقتی رأی‌گیری انجمن رشته‌ی شما آغاز شود، از همین صفحه می‌توانید وارد شوید و رأی بدهید.</p>
        <Button asChild variant="outline" className="mt-6"><Link to="/elections">مشاهده انتخابات</Link></Button>
      </div>
    </div>
  );
}
