// Single source for the product name and the university imagery used across pages.
export const SITE_NAME = 'پردیس شمال';
export const SITE_TAGLINE = 'شبکه رسمی انجمن‌ها و فعالیت‌های دانشجویی دانشگاه شمال';

export const IMG = {
  emblem: '/shomal/emblem.webp',
  campus: '/shomal/banner-1.webp',
  campusAlt: '/shomal/banner-2.webp',
  life: ['/shomal/life-1.webp', '/shomal/life-2.webp', '/shomal/life-3.webp'],
  engineering: '/shomal/faculty-engineering.webp',
  humanities: '/shomal/faculty-humanities.webp',
  sport: '/shomal/faculty-sport.webp',
};

// Deterministic fallback photo for records without a cover image
export function fallbackPhoto(seed: string) {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return IMG.life[h % IMG.life.length];
}

export function facultyImage(name: string) {
  if (/فنی|مهندسی/.test(name)) return IMG.engineering;
  if (/انسانی|حقوق|مدیریت/.test(name)) return IMG.humanities;
  if (/ورزش|تربیت/.test(name)) return IMG.sport;
  return null;
}
