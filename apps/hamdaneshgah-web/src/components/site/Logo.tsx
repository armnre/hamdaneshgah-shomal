import { cn } from '@project/components/lib/utils';

// «هم‌دانشگاهی» mark: two overlapping arcs (two students side by side) forming
// an open book, crowned by a spark — community + learning.
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={cn('h-11 w-11', className)} role="img" aria-label="نشان هم‌دانشگاهی">
      <defs>
        <linearGradient id="hdg-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="hsl(var(--primary))" />
          <stop offset="1" stopColor="hsl(var(--primary) / 0.78)" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="46" height="46" rx="14" fill="url(#hdg-bg)" />
      <path d="M9 33c5-3 10-3 15 1 5-4 10-4 15-1V17c-5-3-10-3-15 1-5-4-10-4-15-1z" fill="none" stroke="white" strokeWidth="2.6" strokeLinejoin="round" />
      <path d="M24 18v16" stroke="white" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="16.5" cy="12" r="3" fill="white" />
      <circle cx="31.5" cy="12" r="3" fill="hsl(var(--accent))" />
      <path d="M24 5.5l1.2 2.6 2.6 1.2-2.6 1.2L24 13.1l-1.2-2.6-2.6-1.2 2.6-1.2z" fill="hsl(var(--accent))" />
    </svg>
  );
}

export function LogoWordmark({ light, className }: { light?: boolean; className?: string }) {
  return (
    <span className={cn('flex items-center gap-3', className)}>
      <LogoMark />
      <span className="leading-tight">
        <span className={cn('block text-xl font-black tracking-tight', light ? 'text-white' : 'text-foreground')}>
          هم‌<span className="text-accent">دانشگاهی</span>
        </span>
        <span className={cn('block text-[11px] font-medium', light ? 'text-white/70' : 'text-muted-foreground')}>شبکه دانشجویی دانشگاه شمال</span>
      </span>
    </span>
  );
}
