# استقرار روی Plesk (Node 22 + PostgreSQL)

## ۱. پیش‌نیازها در Plesk
- افزونه‌ی **Node.js** (از Extensions) با نسخه‌ی **22**.
- **PostgreSQL** در Tools & Settings → Database Servers.
- یک دامنه یا ساب‌دامنه با **SSL (Let's Encrypt)** — کوکی ورود فقط روی HTTPS کار می‌کند.

## ۲. دیتابیس
Domains → دامنه → **Databases → Add Database**
- نوع: PostgreSQL، نام: `hamdaneshgah`، یک کاربر با رمز قوی بسازید.
- مایگریشن اول `CREATE EXTENSION pgcrypto` اجرا می‌کند. اگر کاربر دیتابیس اجازه‌ی آن را نداشت، یک‌بار با کاربر postgres اجرا کنید:
  `sudo -u postgres psql -d hamdaneshgah -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"`

## ۳. دریافت کد
Domains → دامنه → **Git** → Add Repository
- Repository: `https://github.com/armnre/hamdaneshgah-shomal.git`
- Deployment path: `httpdocs/app` (یا هر پوشه‌ای؛ در ادامه `APP` می‌نامیم)
- Additional deployment actions: `bash deploy.sh`

## ۴. فایل تنظیمات
در ترمینال SSH (`/modules/ssh-terminal/`):
```bash
cd ~/httpdocs/app/server
cp .env.example .env
nano .env
```
حداقل این‌ها را پر کنید:
| متغیر | مقدار |
|---|---|
| `DATABASE_URL` | `postgres://USER:PASS@localhost:5432/hamdaneshgah` |
| `SESSION_SECRET` | خروجی `openssl rand -base64 48` |
| `SITE_URL` | `https://دامنه‌ی-شما` |
| `ZITE_VOTER_PEPPER` | خروجی دیگری از `openssl rand -base64 48` |
| `ZITE_BOOTSTRAP_ADMIN_EMAILS` | ایمیل مدیر کل اول |
| `MAIL_FROM`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | یک صندوق ایمیل Plesk (Mail → Create Email) — معمولاً `SMTP_HOST=localhost` و پورت `587` |

## ۵. ساخت و مایگریشن
```bash
cd ~/httpdocs/app
bash deploy.sh
```
این اسکریپت فرانت را در `web/dist` می‌سازد، سرور را در `server/dist/server.mjs` باندل می‌کند، تست‌ها و مایگریشن‌ها را اجرا می‌کند.

## ۶. تنظیم Node.js در Plesk
Domains → دامنه → **Node.js**
| فیلد | مقدار |
|---|---|
| Node.js Version | 22.x |
| Package Manager | npm |
| Document Root | `/httpdocs/app/web/dist` |
| Application Mode | production |
| Application Root | `/httpdocs/app/server` |
| Application Startup File | `app.cjs` |

**Enable Node.js** و سپس **Restart App** را بزنید. (متغیرهای محیطی را می‌توانید به‌جای `.env` در همین صفحه هم وارد کنید.)

## ۷. بررسی
- `https://دامنه/healthz` باید `{"ok":true}` برگرداند.
- `https://دامنه/admin` → ایمیل مدیر → پیوند ورود → «ثبت من به‌عنوان مدیر کل».

## به‌روزرسانی‌های بعدی
Git را Pull کنید (یا Deploy در صفحه‌ی Git) — `deploy.sh` خودکار اجرا و اپ ری‌استارت می‌شود.

## اجرای بدون Passenger (اختیاری، pm2)
```bash
cd ~/httpdocs/app/server && npx pm2 start dist/server.mjs --name hamdaneshgah --node-args="--env-file=.env"
```
و در Apache & nginx Settings یک `proxy_pass http://127.0.0.1:3000;` اضافه کنید.

## پشتیبان‌گیری
- دیتابیس: Plesk → Backup Manager یا `pg_dump`.
- فایل‌های آپلودی: پوشه‌ی `server/storage/uploads`.
