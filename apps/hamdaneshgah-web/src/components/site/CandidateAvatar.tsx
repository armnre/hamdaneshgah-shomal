import { UserRound } from 'lucide-react';
import { cn } from '@project/components/lib/utils';

/** One simple, identical avatar for every candidate (photo if provided). */
export function CandidateAvatar({ name, photoUrl, className }: { name: string; photoUrl?: string | null; className?: string }) {
  if (photoUrl) return <img src={photoUrl} alt={name} loading="lazy" className={cn('shrink-0 rounded-full object-cover', className)} />;
  return (
    <span role="img" aria-label={name} className={cn('grid shrink-0 place-items-center rounded-full bg-primary/10 text-primary', className)}>
      <UserRound className="h-1/2 w-1/2" strokeWidth={1.75} aria-hidden />
    </span>
  );
}
