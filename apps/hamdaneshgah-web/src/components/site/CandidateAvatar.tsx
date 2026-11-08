import { Sparkles, Star, Lightbulb, Rocket, Compass, Feather, Gem, Atom, Flame, Leaf, Award, Zap } from 'lucide-react';
import { cn } from '@project/components/lib/utils';

// Each candidate gets a stable, distinct gradient + emblem derived from their name.
const TINTS = [
  'from-primary via-primary/85 to-chart-2',
  'from-accent via-accent/80 to-chart-3',
  'from-chart-2 via-chart-2/80 to-primary',
  'from-chart-3 via-chart-3/80 to-accent',
  'from-chart-4 via-chart-4/80 to-primary',
  'from-chart-5 via-chart-5/80 to-chart-2',
];
const ICONS = [Sparkles, Star, Lightbulb, Rocket, Compass, Feather, Gem, Atom, Flame, Leaf, Award, Zap];

export function CandidateAvatar({ name, photoUrl, className }: { name: string; photoUrl?: string | null; className?: string }) {
  if (photoUrl) return <img src={photoUrl} alt={name} loading="lazy" className={cn('shrink-0 rounded-full object-cover', className)} />;
  const h = [...name].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7);
  const Icon = ICONS[h % ICONS.length];
  const tint = TINTS[(h >> 4) % TINTS.length];
  return (
    <span role="img" aria-label={name} className={cn('relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br text-white shadow-md ring-1 ring-white/30', tint, className)}>
      <span aria-hidden className="absolute -end-1/4 -top-1/4 h-3/4 w-3/4 rounded-full bg-white/20 blur-md" />
      <span aria-hidden className="absolute inset-[12%] rounded-full border border-white/25" />
      <Icon className="relative h-[46%] w-[46%] drop-shadow-sm" strokeWidth={1.8} aria-hidden />
    </span>
  );
}
