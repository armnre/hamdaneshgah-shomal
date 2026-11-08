import { cn } from '@project/components/lib/utils';

// Eight-pointed star (shamseh) drawn from two squares — the base unit of girih ornament
export function Shamseh({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden className={cn('h-5 w-5', className)} fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="10" y="10" width="20" height="20" />
      <rect x="10" y="10" width="20" height="20" transform="rotate(45 20 20)" />
      <circle cx="20" cy="20" r="4" fill="currentColor" />
    </svg>
  );
}

export function OrnamentRule({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn('flex items-center gap-3 text-accent', className)}>
      <span className="h-px flex-1 bg-gradient-to-l from-transparent to-accent/70" />
      <Shamseh className="h-4 w-4" />
      <span className="h-px flex-1 bg-gradient-to-r from-transparent to-accent/70" />
    </div>
  );
}
