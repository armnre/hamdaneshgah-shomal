// رشته‌ی دانشگاهی → انجمن علمی. تنها منبع حقیقت برای ورود فهرست رأی‌دهندگان (اسکریپت و پنل مدیریت).
// کپی نمایشی server/src/lib/majorMap.ts — تست server/tests/elections.test.ts یکی‌بودن آن‌ها را بررسی می‌کند.
// ترتیب قواعد مهم است: اولین قاعده‌ای که بخورد برنده است.

export type AssociationRule = {
  slug: string;          // Associations.slug
  association: string;   // نام نمایشی انجمن
  major: string;         // نام رشته‌ی سیستم (Majors.name) که رأی‌دهنده به آن وصل می‌شود
  match: string[];       // کلیدواژه‌ها (پس از نرمال‌سازی و حذف فاصله)
};

export const ASSOCIATION_RULES: AssociationRule[] = [
  { slug: 'electrical-engineering', association: 'مهندسی برق و مهندسی پزشکی', major: 'مهندسی پزشکی', match: ['مهندسی پزشکی'] },
  { slug: 'electrical-engineering', association: 'مهندسی برق و مهندسی پزشکی', major: 'مهندسی برق', match: ['برق', 'الکترونیک'] },
  { slug: 'computer-engineering', association: 'مهندسی کامپیوتر', major: 'مهندسی کامپیوتر', match: ['کامپیوتر'] },
  { slug: 'architecture', association: 'مهندسی معماری', major: 'مهندسی معماری', match: ['معماری'] },
  { slug: 'civil-engineering', association: 'مهندسی عمران', major: 'مهندسی عمران', match: ['عمران', 'نقشه برداری', 'شهرسازی'] },
  { slug: 'chemical-engineering', association: 'مهندسی شیمی', major: 'مهندسی شیمی', match: ['شیمی'] },
  { slug: 'industrial-engineering', association: 'مهندسی صنایع', major: 'مهندسی صنایع', match: ['صنایع'] },
  { slug: 'mechanical-engineering', association: 'مهندسی مکانیک', major: 'مهندسی مکانیک', match: ['مکانیک', 'مکاترونیک'] },
  { slug: 'law', association: 'حقوق', major: 'حقوق', match: ['حقوق', 'علوم قضایی'] },
  { slug: 'accounting', association: 'حسابداری', major: 'حسابداری', match: ['حسابداری', 'حسابرسی'] },
  { slug: 'sport-sciences', association: 'علوم ورزشی', major: 'علوم ورزشی', match: ['ورزش', 'تربیت بدنی'] },
  { slug: 'management', association: 'مدیریت', major: 'مدیریت', match: ['مدیریت'] },
  { slug: 'psychology', association: 'روان‌شناسی', major: 'روان‌شناسی', match: ['روانشناسی'] },
  { slug: 'educational-sciences', association: 'علوم تربیتی', major: 'علوم تربیتی', match: ['علوم تربیتی'] },
];

/** ی/ک عربی، اعراب، نیم‌فاصله و فاصله‌های تکراری را یکسان می‌کند. */
export function normalizeMajor(s: unknown) {
  return String(s ?? '').replace(/[يى]/g, 'ی').replace(/ك/g, 'ک').replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[\u200c\u200f\u200e]/g, ' ').replace(/\s+/g, ' ').trim();
}

/** قاعده‌ی انجمن یک رشته‌ی خام (از اکسل دانشگاه)، یا null اگر رشته انجمن ندارد. */
export function associationForMajor(raw: unknown): AssociationRule | null {
  const m = normalizeMajor(raw).replace(/ /g, '');
  if (!m) return null;
  return ASSOCIATION_RULES.find((r) => r.match.some((w) => m.includes(w.replace(/ /g, '')))) ?? null;
}

/** سه دانشکده‌ی دانشگاه شمال (Faculties.slug). */
export type FacultySlug = 'engineering' | 'humanities' | 'sport-sciences';
export const FACULTIES: Record<FacultySlug, string> = {
  engineering: 'دانشکده فنی و مهندسی',
  humanities: 'دانشکده علوم انسانی و اجتماعی',
  'sport-sciences': 'دانشکده علوم ورزشی',
};

/** دانشکده‌ی هر انجمن. */
export const ASSOCIATION_FACULTY: Record<string, FacultySlug> = {
  'electrical-engineering': 'engineering', 'computer-engineering': 'engineering', architecture: 'engineering',
  'civil-engineering': 'engineering', 'chemical-engineering': 'engineering', 'industrial-engineering': 'engineering',
  'mechanical-engineering': 'engineering',
  law: 'humanities', accounting: 'humanities', management: 'humanities', psychology: 'humanities', 'educational-sciences': 'humanities',
  'sport-sciences': 'sport-sciences',
};

/**
 * رشته‌هایی که انجمن مستقل ندارند: دانشجو در «یکی» از انجمن‌های دانشکده‌ی خودش (به انتخاب خودش) رأی می‌دهد.
 * رشته‌ی جدید بدون انجمن را این‌جا اضافه کنید.
 */
export const FACULTY_RULES: { faculty: FacultySlug; major: string; match: string[] }[] = [
  { faculty: 'engineering', major: 'علوم و مهندسی محیط زیست', match: ['محیط زیست'] },
];

/** نام دانشکده از ستون «دانشکده» اکسل (اختیاری). */
export function facultyFromName(raw: unknown): FacultySlug | null {
  const f = normalizeMajor(raw).replace(/ /g, '');
  if (!f) return null;
  if (f.includes('ورزش')) return 'sport-sciences';
  if (f.includes('فنی') || f.includes('مهندسی')) return 'engineering';
  if (f.includes('انسانی') || f.includes('اجتماعی')) return 'humanities';
  return null;
}

export type FacultyAssociation = { slug: string; association: string };
/** انجمن‌های یک دانشکده (به ترتیب جدول قواعد، بدون تکرار). */
export function facultyAssociations(faculty: FacultySlug): FacultyAssociation[] {
  const seen = new Map<string, string>();
  for (const r of ASSOCIATION_RULES) if (ASSOCIATION_FACULTY[r.slug] === faculty && !seen.has(r.slug)) seen.set(r.slug, r.association);
  return [...seen].map(([slug, association]) => ({ slug, association }));
}

export type Placement =
  | { kind: 'association'; rule: AssociationRule }
  | { kind: 'faculty'; faculty: FacultySlug; facultyName: string; major: string; associations: FacultyAssociation[] };

/**
 * جای رأی یک دانشجو، مستقل از مقطع (کاردانی تا دکتری) و گرایش:
 * ۱) رشته انجمن دارد → همان انجمن  ۲) رشته انجمن ندارد → انتخاب یکی از انجمن‌های دانشکده‌اش
 * (از FACULTY_RULES، ستون دانشکده‌ی اکسل، یا واژه‌ی «مهندسی» در نام رشته)  ۳) هیچ‌کدام → null
 */
export function placeVoter(rawMajor: unknown, rawFaculty?: unknown): Placement | null {
  const rule = associationForMajor(rawMajor);
  if (rule) return { kind: 'association', rule };
  const m = normalizeMajor(rawMajor).replace(/ /g, '');
  if (!m) return null;
  const fr = FACULTY_RULES.find((r) => r.match.some((w) => m.includes(w.replace(/ /g, ''))));
  const faculty = fr?.faculty ?? facultyFromName(rawFaculty) ?? (m.includes('مهندسی') ? 'engineering' : null);
  if (!faculty) return null;
  return { kind: 'faculty', faculty, facultyName: FACULTIES[faculty], major: fr?.major ?? normalizeMajor(rawMajor), associations: facultyAssociations(faculty) };
}

/** کلید گروه انتخاب: یک دانشجو در هر گروه فقط یک رأی دارد (تریگر 0014 هم تضمین می‌کند). */
export const choiceGroupKey = (faculty: FacultySlug, academicYear: string) => `faculty:${faculty}:${academicYear}`;

/** همه‌ی رشته‌های سیستمی که باید در Majors و AssociationMajors وجود داشته باشند. */
export const SYSTEM_MAJORS = [...new Set(ASSOCIATION_RULES.map((r) => `${r.slug}|${r.major}`))].map((k) => {
  const [slug, major] = k.split('|');
  return { slug, major };
});

/**
 * فهرست رسمی رشته‌های دانشگاه شمال (چارت سه دانشکده + فهرست آموزش، همه‌ی مقاطع).
 * مایگریشن 0015 همین فهرست را در Majors ثبت و به انجمن هر رشته (طبق placeVoter) نگاشت می‌کند.
 */
export const MAJOR_CATALOG: { name: string; faculty: FacultySlug }[] = [
  ...['مهندسی عمران', 'مهندسی عمران (حمل‌ونقل)', 'مهندسی معماری', 'مهندسی و علم کامپیوتر', 'مهندسی کامپیوتر', 'مهندسی برق', 'مهندسی پزشکی',
    'مهندسی مکاترونیک', 'مهندسی مکانیک', 'مهندسی شیمی', 'مهندسی صنایع', 'مهندسی صنایع و سیستم‌ها', 'معماری داخلی', 'مهندسی شهرسازی',
    'مهندسی نقشه‌برداری', 'علوم و مهندسی محیط زیست', 'مهندسی اجرایی عمران', 'مهندسی حرفه‌ای عمران', 'مهندسی حرفه‌ای معماری',
    'مهندسی حرفه‌ای الکترونیک کاربردی', 'مهندسی حرفه‌ای برق قدرت', 'مهندسی حرفه‌ای کامپیوتر نرم‌افزار'].map((name) => ({ name, faculty: 'engineering' as const })),
  ...['حسابداری', 'حسابرسی', 'حسابداری قضایی', 'حقوق', 'حقوق خصوصی', 'حقوق عمومی', 'حقوق بین‌الملل', 'حقوق کیفری و جرم‌شناسی',
    'حقوق جزا و جرم‌شناسی', 'علوم قضایی', 'مدیریت دولتی', 'مدیریت صنعتی', 'مدیریت کسب‌وکار', 'مدیریت بازرگانی', 'مدیریت مالی',
    'مدیریت امور بانکی', 'روان‌شناسی', 'علوم تربیتی'].map((name) => ({ name, faculty: 'humanities' as const })),
  ...['علوم ورزشی', 'تربیت بدنی', 'مدیریت ورزشی', 'آسیب‌شناسی ورزشی و تمرینات اصلاحی', 'فیزیولوژی ورزشی'].map((name) => ({ name, faculty: 'sport-sciences' as const })),
];
