# هم‌دانشگاهی — شبکه دانشجویی دانشگاه شمال

پلتفرم فارسی و راست‌چین فعالیت‌های دانشجویی دانشگاه شمال آمل: انجمن‌های علمی، دانشکده‌ها، اخبار، رویدادها، انتخابات و پنل مدیریت نقش‌محور.

## معماری

| بخش | مسیر | فناوری |
|---|---|---|
| فرانت‌اند (کد منبع) | `apps/<app>/src` | React 18 + Vite + Tailwind — در Zite نگهداری می‌شود |
| ساخت مستقل فرانت | `web/` | Vite → `web/dist` (کد را از `apps/*/src` و `packages/components` برمی‌دارد) |
| بک‌اند | `server/` | Fastify 5 روی Node 22 — اندپوینت‌ها در `server/src/api`، `POST /api/rpc/<name>` |
| دیتابیس | `server/db/migrations` | PostgreSQL ۱۴+ — مایگریشن‌های شماره‌دار، هرکدام یک‌بار |
| فایل‌ها | `server/storage/uploads` | دیسک محلی (`/api/upload`، `/api/file/:key`) |
| ورود مدیران | `server/src/platform/auth.ts` | پیوند ایمیلی یک‌بارمصرف + کوکی امضاشده HttpOnly، ارسال با SMTP |
| ساعت انتخابات | `server/src/index.ts` | هر دقیقه انتخابات سررسیده را باز/بسته می‌کند |

سرور Fastify هم API را پاسخ می‌دهد و هم فایل‌های ساخته‌شده‌ی `web/dist` را (با fallback برای SPA)، پس روی Plesk فقط **یک** اپلیکیشن Node لازم است.

## توسعه محلی
```bash
cp server/.env.example server/.env   # مقادیر را پر کنید
(cd server && npm install && npm run migrate && npm run dev)   # http://localhost:3000
(cd web && npm install && npm run dev)                          # http://localhost:5173 (پروکسی /api)
```

## استقرار روی Plesk
راهنمای کامل گام‌به‌گام: [`docs/plesk-deploy.md`](docs/plesk-deploy.md). خلاصه: `bash deploy.sh` در ریشه‌ی مخزن.

## تست
```bash
cd server && npm test               # قواعد مجوز و محرمانگی رأی
cd server && npm run test:migrations # مایگریشن‌ها روی Postgres درون‌پردازه‌ای
```

## امنیت
- هیچ کلید یا رمزی در مخزن نیست؛ همه از `server/.env` یا متغیرهای محیطی Plesk خوانده می‌شوند.
- پیوند ورود یک‌بارمصرف و ۱۵ دقیقه‌ای است و فقط هش آن ذخیره می‌شود؛ GET فقط صفحه‌ی تأیید نشان می‌دهد.
- محدودیت نرخ در جدول `rateLimits`، ورودی نامعتبر با ۴۰۰ رد می‌شود، درخواست‌های تغییر فقط از همان مبدأ.
- هدرهای امنیتی (CSP، HSTS روی HTTPS، X-Frame-Options و …) در خود سرور تنظیم شده‌اند.
