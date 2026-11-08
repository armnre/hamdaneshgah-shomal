import { Cpu, Code2, Zap, Cog, Building2, Calculator, Briefcase, Scale, Brain, Languages, BookOpen, Dumbbell, Palette, FlaskConical, Leaf, LineChart, Globe2, HardHat, GraduationCap, type LucideIcon } from 'lucide-react';

// Keyword → icon for a major/association name (Persian). First match wins.
const RULES: [RegExp, LucideIcon][] = [
  [/کامپیوتر|نرم‌?افزار|رایانه|فناوری اطلاعات|هوش مصنوعی/, Code2],
  [/برق|الکترونیک/, Zap],
  [/مکانیک|صنایع/, Cog],
  [/عمران|سازه/, HardHat],
  [/معماری|شهرسازی/, Building2],
  [/ریاضی|آمار/, Calculator],
  [/حسابداری|اقتصاد|مالی/, LineChart],
  [/مدیریت|بازرگانی/, Briefcase],
  [/حقوق/, Scale],
  [/روان/, Brain],
  [/زبان|ترجمه|ادبیات انگلیسی/, Languages],
  [/ادبیات|الهیات|تاریخ|فلسفه/, BookOpen],
  [/ورزش|تربیت بدنی/, Dumbbell],
  [/هنر|گرافیک|طراحی/, Palette],
  [/شیمی|فیزیک|زیست/, FlaskConical],
  [/محیط|کشاورزی|منابع طبیعی/, Leaf],
  [/جغرافیا|گردشگری|جهانگردی/, Globe2],
  [/مخابرات|سخت‌?افزار/, Cpu],
];

export function majorIcon(name: string): LucideIcon {
  const n = name.replace(/[يى]/g, 'ی').replace(/ك/g, 'ک');
  return RULES.find(([re]) => re.test(n))?.[1] ?? GraduationCap;
}

export function MajorChip({ name, className = '' }: { name: string; className?: string }) {
  const Icon = majorIcon(name);
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-lg border bg-background px-2.5 py-1.5 text-sm ${className}`}>
      <Icon className="h-4 w-4 text-primary" aria-hidden />{name}
    </span>
  );
}
