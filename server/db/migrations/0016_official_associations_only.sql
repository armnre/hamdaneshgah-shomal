-- 0016: فقط ۱۳ انجمن رسمی دانشگاه (همان‌هایی که انتخابات ۱۴۰۵ دارند) فعال می‌مانند.
-- انجمن‌های دیگر (داده‌ی قدیمی / ساخته‌شده به ازای هر رشته) حذف نمی‌شوند، فقط غیرفعال می‌شوند تا در آمار و فهرست سایت نیایند.
-- فهرست با ASSOCIATION_FACULTY در server/src/lib/majorMap.ts هم‌خوان است (تست دارد). Idempotent.
UPDATE "Associations" SET "active" = false, "featured" = false
WHERE "active" = true AND COALESCE("slug", '') NOT IN (
  'electrical-engineering', 'computer-engineering', 'architecture', 'civil-engineering', 'chemical-engineering',
  'industrial-engineering', 'mechanical-engineering', 'law', 'accounting', 'management', 'psychology',
  'educational-sciences', 'sport-sciences');
UPDATE "Associations" SET "active" = true
WHERE "slug" IN (
  'electrical-engineering', 'computer-engineering', 'architecture', 'civil-engineering', 'chemical-engineering',
  'industrial-engineering', 'mechanical-engineering', 'law', 'accounting', 'management', 'psychology',
  'educational-sciences', 'sport-sciences');
