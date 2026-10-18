# آزمون‌ها

| آزمون | دستور | وضعیت |
|---|---|---|
| مایگریشن‌ها و قیود (PGlite) | `cd deploy && npm run test:migrations` | پاس |
| تست‌های سیاست/امنیت/محرمانگی | `cd apps/app && npm test` (۲۹ تست) | پاس |
| xmin/ctid پس از بستن (PGlite) | بخش 0005 در `deploy/db/test-migrations.mjs` | پاس |
| **همروندی واقعی رأی (Neon)** | زیر را ببینید | **آزموده نشد** |

## آزمون همروندی واقعی — آزموده نشد

در محیط ساخت به Postgres/Neon واقعی دسترسی نیست (هیچ `DATABASE_URL` آزمایشی تنظیم نشده)، پس این آزمون اجرا نشده است.

اجرا روی یک **شاخه‌ی دورریختنی Neon** (هرگز روی تولید؛ برگه‌ها حذف‌ناپذیرند):

```bash
cd deploy
npm install
DATABASE_URL="<branch-url>" npm run migrate        # اعمال 0001..0005 روی شاخه
TEST_DATABASE_URL="<branch-url>" node db/test-concurrency.mjs
```

آزمون ۲۰ تراکنش هم‌زمان روی ۲۰ اتصال جدای pool با یک نشست از **یک** رأی‌دهنده اجرا می‌کند (همان SQL فایل `server/voteSql.mjs`).
معیار قبولی: دقیقاً ۱ رکورد مشارکت، ۱ برگه‌ی Pending، ۰ نشست باز، و فقط یک پاسخ `ok` — خروجی `CONCURRENCY TEST PASSED`.
