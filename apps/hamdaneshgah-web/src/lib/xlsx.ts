// خواننده‌ی سبک xlsx در مرورگر (بدون کتابخانه): فقط اولین شیت، به صورت آرایه‌ای از ردیف‌ها.
async function inflateRaw(data: Uint8Array) {
  const ds = new DecompressionStream('deflate-raw');
  const stream = new Blob([data.slice() as Uint8Array<ArrayBuffer>]).stream().pipeThrough(ds);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function unzip(buf: Uint8Array) {
  const v = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let eocd = buf.length - 22;
  while (eocd >= 0 && v.getUint32(eocd, true) !== 0x06054b50) eocd--;
  if (eocd < 0) throw new Error('فایل xlsx معتبر نیست');
  const count = v.getUint16(eocd + 10, true);
  let p = v.getUint32(eocd + 16, true);
  const files: Record<string, () => Promise<string>> = {};
  const dec = new TextDecoder();
  for (let i = 0; i < count; i++) {
    const method = v.getUint16(p + 10, true), size = v.getUint32(p + 20, true);
    const nameLen = v.getUint16(p + 28, true), extraLen = v.getUint16(p + 30, true), commentLen = v.getUint16(p + 32, true);
    const local = v.getUint32(p + 42, true);
    const name = dec.decode(buf.subarray(p + 46, p + 46 + nameLen));
    const start = local + 30 + v.getUint16(local + 26, true) + v.getUint16(local + 28, true);
    const data = buf.subarray(start, start + size);
    files[name] = async () => dec.decode(method === 8 ? await inflateRaw(data) : data);
    p += 46 + nameLen + extraLen + commentLen;
  }
  return files;
}

const xmlText = (s: string) => s.replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
const colIndex = (ref: string) => [...ref.replace(/\d+/g, '')].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;

export async function readXlsx(file: File): Promise<string[][]> {
  const z = await unzip(new Uint8Array(await file.arrayBuffer()));
  const shared = z['xl/sharedStrings.xml'] ? [...(await z['xl/sharedStrings.xml']()).matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => xmlText(m[1])) : [];
  const sheet = Object.keys(z).filter((n) => /^xl\/worksheets\/sheet\d+\.xml$/.test(n)).sort()[0];
  if (!sheet) throw new Error('شیتی در فایل پیدا نشد');
  const rows: string[][] = [];
  for (const r of (await z[sheet]()).matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
    const row: string[] = [];
    for (const c of r[1].matchAll(/<c ([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const ref = /r="([A-Z]+\d+)"/.exec(c[1])?.[1]; const t = /t="(\w+)"/.exec(c[1])?.[1];
      const body = c[2] ?? ''; const val = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1];
      row[ref ? colIndex(ref) : row.length] = t === 's' ? shared[Number(val)] ?? '' : t === 'inlineStr' ? xmlText(body) : val != null ? xmlText(val) : '';
    }
    rows.push(Array.from(row, (x) => x ?? ''));
  }
  return rows;
}

const norm = (s: string) => s.replace(/[يى]/g, 'ی').replace(/ك/g, 'ک').replace(/[\u200c\s]/g, '');

/** ستون‌های فهرست دانشگاه را از روی سرستون پیدا می‌کند. */
export function studentRows(table: string[][]) {
  const head = (table[0] ?? []).map((h) => norm(String(h)));
  const col = (...n: string[]) => head.findIndex((h) => n.some((x) => h === norm(x)));
  const C = { sn: col('شماره دانشجو', 'شماره دانشجویی'), last: col('نام خانوادگی'), first: col('نام'), nid: col('شماره ملی', 'کد ملی'), major: col('نام رشته تحصیلی', 'رشته') };
  const missing = Object.entries(C).filter(([, v]) => v < 0).map(([k]) => ({ sn: 'شماره دانشجو', last: 'نام خانوادگی', first: 'نام', nid: 'شماره ملی', major: 'نام رشته تحصیلی' })[k as keyof typeof C]);
  if (missing.length) throw new Error('این ستون‌ها پیدا نشد: ' + missing.join('، '));
  const fac = col('دانشکده', 'نام دانشکده'); // اختیاری: برای رشته‌های بدون انجمن
  return table.slice(1).filter((r) => r.some((x) => String(x).trim())).map((r) => ({
    studentNumber: String(r[C.sn] ?? ''), nationalId: String(r[C.nid] ?? ''),
    fullName: `${r[C.first] ?? ''} ${r[C.last] ?? ''}`.trim(), majorName: String(r[C.major] ?? ''),
    ...(fac >= 0 ? { facultyName: String(r[fac] ?? '') } : {}),
  }));
}
