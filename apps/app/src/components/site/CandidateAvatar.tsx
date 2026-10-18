import { UserRound } from 'lucide-react';
import { cn } from '@project/components/lib/utils';

// Stable tint per name so placeholder avatars look intentional, not empty.
const TINTS = ['from-primary to-primary/70', 'from-accent to-accent/70', 'from-chart-2 to-chart-2/70', 'from-chart-3 to-chart-3/70'];

export function CandidateAvatar({ name, photoUrl, className }: { name: string; photoUrl?: string | null; className?: string }) {
  if (photoUrl) return <img src={photoUrl} alt={name} loading="lazy" className={cn('shrink-0 rounded-full object-cover', className)} />;
  const tint = TINTS[[...name].reduce((n, c) => n + c.charCodeAt(0), 0) % TINTS.length];
  const initial = name.replace(/\(.*?\)/g, '').trim()[0] ?? '';
  return (
    <span role="img" aria-label={name} className={cn('relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br text-white', tint, className)}>
      <UserRound className="absolute -bottom-[15%] h-[85%] w-[85%] opacity-25" aria-hidden />
      <span className="relative text-[0.9em] font-black">{initial}</span>
    </span>
  );
}
