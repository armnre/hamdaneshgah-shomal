// Single source for the product name and the imagery used across pages.
// Asset sources and licence status: docs/asset-inventory.md
export const SITE_NAME = 'هم‌دانشگاهی';
export const SITE_TAGLINE = 'شبکه انجمن‌ها و فعالیت‌های دانشجویی دانشگاه شمال';

export type Photo = { src: string; alt: string };

// AI-generated, fictional people (no real persons, no faculty, no text/logos)
export const AI_PHOTOS: Photo[] = [
  { src: '/shomal/ai-campus.webp', alt: 'دانشجویان در فضای سبز یک پردیس دانشگاهی در شمال ایران (تصویر تولیدشده با هوش مصنوعی)' },
  { src: '/shomal/ai-lab.webp', alt: 'دانشجویان مهندسی با روپوش آزمایشگاه در حال کار روی مدار الکترونیکی (تصویر تولیدشده با هوش مصنوعی)' },
  { src: '/shomal/ai-library.webp', alt: 'دانشجویان در حال مطالعه در کتابخانه دانشگاه (تصویر تولیدشده با هوش مصنوعی)' },
  { src: '/shomal/ai-volleyball.webp', alt: 'دانشجویان دختر در حال بازی والیبال در سالن ورزشی دانشگاه (تصویر تولیدشده با هوش مصنوعی)' },
  { src: '/shomal/ai-workshop.webp', alt: 'کارگاه آموزشی یک انجمن علمی دانشجویی (تصویر تولیدشده با هوش مصنوعی)' },
  { src: '/shomal/ai-group.webp', alt: 'عکس گروهی دانشجویان در فضای سبز پردیس (تصویر تولیدشده با هوش مصنوعی)' },
];

export const IMG = {
  emblem: '/shomal/emblem.webp', // university emblem — licence not yet confirmed
  campus: AI_PHOTOS[0].src,
  campusAlt: AI_PHOTOS[5].src,
  life: [AI_PHOTOS[1].src, AI_PHOTOS[2].src, AI_PHOTOS[4].src],
  engineering: AI_PHOTOS[1].src,
  humanities: AI_PHOTOS[2].src,
  sport: AI_PHOTOS[3].src,
};

export const altFor = (src: string) => AI_PHOTOS.find((p) => p.src === src)?.alt ?? '';

// Deterministic fallback photo for records without a cover image
export function fallbackPhoto(seed: string) {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return AI_PHOTOS[h % AI_PHOTOS.length].src;
}

export function facultyImage(name: string) {
  if (/فنی|مهندسی/.test(name)) return IMG.engineering;
  if (/انسانی|حقوق|مدیریت/.test(name)) return IMG.humanities;
  if (/ورزش|تربیت/.test(name)) return IMG.sport;
  return null;
}
