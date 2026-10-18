// Display helpers. Dates are stored as ISO (UTC) and shown in Jalali, Asia/Tehran.
const TZ = 'Asia/Tehran';

export function faDate(iso?: unknown, withTime = false) {
  if (!iso) return '';
  const d = new Date(String(iso));
  if (isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
    timeZone: TZ, year: 'numeric', month: 'long', day: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(d);
}

export function faDayMonth(iso?: unknown) {
  if (!iso) return { day: '—', month: '' };
  const d = new Date(String(iso));
  const f = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('fa-IR-u-ca-persian', { timeZone: TZ, ...o }).format(d);
  return { day: f({ day: 'numeric' }), month: f({ month: 'short' }) };
}

export const faNum = (n: unknown) => Number(n ?? 0).toLocaleString('fa-IR');

export const KIND_LABEL: Record<string, string> = { Event: 'رویداد', Conference: 'همایش', Course: 'دوره آموزشی', Call: 'فراخوان' };
export const STATUS_LABEL: Record<string, string> = { Draft: 'پیش‌نویس', Published: 'منتشرشده', Archived: 'بایگانی', New: 'جدید', Read: 'خوانده‌شده', Closed: 'بسته' };
export const ROLE_LABEL: Record<string, string> = { 'Super Admin': 'مدیر کل', 'Content Editor': 'ویراستار محتوا', 'Association Manager': 'مدیر انجمن' };

// ISO -> value for <input type="datetime-local"> in local time
export function toLocalInput(iso?: unknown) {
  if (!iso) return '';
  const d = new Date(String(iso));
  if (isNaN(d.getTime())) return '';
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}
export const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : null);

export function errMsg(e: unknown) {
  const x = e as { userFacingMessage?: string; message?: string };
  return x?.userFacingMessage || 'خطایی رخ داد. لطفاً دوباره تلاش کنید.';
}
