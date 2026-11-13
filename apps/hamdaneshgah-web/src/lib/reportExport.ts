// خروجی‌های گزارش رسمی نتایج: Excel (xlsx واقعی، راست‌به‌چپ)، CSV (UTF-8 با BOM برای اکسل)، Word، JSON.
// PDF با چاپ همان سند رسمی (OfficialReport) ساخته می‌شود تا فونت و چینش فارسی دقیق بماند.

export type ReportRow = { rank: number; id: string; fullName: string; votes: number; percentOfBallots: number; outcome: 'elected' | 'alternate' | 'not-elected'; tie: boolean };
export type ElectionReport = {
  election: { id: string; title: string; association: string | null; academicYear: string | null; status: string; seats: number; maxChoicesPerVoter: number; votingStart: string | null; votingEnd: string | null };
  generatedAt: string;
  stats: { eligible: number; turnout: number; turnoutPercent: number; ballots: number; blank: number; validBallots: number; totalVotes: number; averageChoices: number };
  rows: ReportRow[];
  elected: string[];
  alternates: string[];
  integrity: { ok: boolean; checks: { key: string; label: string; ok: boolean; detail: string }[] };
  warnings: string[];
  fingerprint: string;
};

export const OUTCOME_LABEL: Record<ReportRow['outcome'], string> = { elected: 'منتخب', alternate: 'علی‌البدل', 'not-elected': '—' };
export const STATUS_FA: Record<string, string> = {
  Closed: 'پایان رأی‌گیری', Counting: 'در حال شمارش', 'Results Confirmed': 'نتایج تأییدشده', 'Results Published': 'نتایج اعلام‌شده', Archived: 'بایگانی',
};
export const reportName = (r: ElectionReport) => r.election.association ?? r.election.title;
export const shortPrint = (fp: string) => fp.slice(0, 16).toUpperCase().replace(/(.{4})/g, '$1 ').trim();

type Cell = string | number;

/** جدول‌های گزارش: یک برگه‌ی خلاصه + یک برگه برای هر انتخابات. */
export function reportSheets(reports: ElectionReport[]): { name: string; rows: Cell[][] }[] {
  const summary: Cell[][] = [
    ['انجمن', 'سال تحصیلی', 'وضعیت', 'کرسی', 'واجدین', 'شرکت‌کنندگان', 'درصد مشارکت', 'برگه‌ها', 'آرای ثبت‌شده', 'منتخبان', 'علی‌البدل', 'کنترل صحت', 'اثر انگشت'],
    ...reports.map((r) => [reportName(r), r.election.academicYear ?? '', STATUS_FA[r.election.status] ?? r.election.status, r.election.seats, r.stats.eligible, r.stats.turnout, r.stats.turnoutPercent, r.stats.ballots, r.stats.totalVotes, r.elected.join('، '), r.alternates.join('، '), r.integrity.ok ? 'سالم' : 'هشدار', r.fingerprint]),
  ];
  const used = new Set<string>(['خلاصه']);
  const sheets = reports.map((r) => {
    let name = reportName(r).replace(/^انجمن علمی\s*/, '').replace(/[\\/?*[\]:]/g, ' ').slice(0, 28) || 'انتخابات';
    for (let i = 2; used.has(name); i++) name = `${name.slice(0, 25)} ${i}`;
    used.add(name);
    return {
      name,
      rows: [
        [reportName(r)], [`سال تحصیلی ${r.election.academicYear ?? '—'} · ${r.election.seats} کرسی · حداکثر ${r.election.maxChoicesPerVoter} انتخاب`], [],
        ['واجدین', r.stats.eligible, 'شرکت‌کنندگان', r.stats.turnout, 'درصد مشارکت', r.stats.turnoutPercent],
        ['برگه‌ها', r.stats.ballots, 'آرای ثبت‌شده', r.stats.totalVotes, 'میانگین انتخاب در هر برگه', r.stats.averageChoices], [],
        ['رتبه', 'نام نامزد', 'آرا', 'درصد از برگه‌ها', 'نتیجه', 'تساوی مرزی'],
        ...r.rows.map((x) => [x.rank, x.fullName, x.votes, x.percentOfBallots, OUTCOME_LABEL[x.outcome], x.tie ? 'بله' : '']),
        [], ...r.warnings.map((w) => ['هشدار', w]), ['اثر انگشت SHA-256', r.fingerprint],
      ] as Cell[][],
    };
  });
  return [{ name: 'خلاصه', rows: summary }, ...sheets];
}

/** CSV یک‌جا (همه‌ی نامزدهای همه‌ی انتخابات) — UTF-8 با BOM تا اکسل فارسی را درست باز کند. */
export function toCsv(reports: ElectionReport[]) {
  const esc = (v: Cell) => { const s = String(v); return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const rows: Cell[][] = [['انجمن', 'سال تحصیلی', 'رتبه', 'نام نامزد', 'آرا', 'درصد از برگه‌ها', 'نتیجه', 'تساوی مرزی', 'واجدین', 'شرکت‌کنندگان', 'درصد مشارکت', 'اثر انگشت']];
  for (const r of reports) for (const x of r.rows) rows.push([reportName(r), r.election.academicYear ?? '', x.rank, x.fullName, x.votes, x.percentOfBallots, OUTCOME_LABEL[x.outcome], x.tie ? 'بله' : '', r.stats.eligible, r.stats.turnout, r.stats.turnoutPercent, r.fingerprint]);
  return '\uFEFF' + rows.map((r) => r.map(esc).join(',')).join('\r\n') + '\r\n';
}

export const toJson = (reports: ElectionReport[]) => JSON.stringify({ format: 'hamdaneshgah.election-report/v1', generatedAt: new Date().toISOString(), reports }, null, 2);

// ───────── xlsx (Office Open XML) بدون کتابخانه: zip ذخیره‌شده + CRC32 ─────────
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
export function crc32(b: Uint8Array) { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }

export function zipStore(files: { name: string; data: Uint8Array }[]) {
  const enc = new TextEncoder(), parts: Uint8Array[] = [], central: Uint8Array[] = [];
  let offset = 0;
  for (const f of files) {
    const name = enc.encode(f.name), crc = crc32(f.data), size = f.data.length;
    const h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
    h.setUint32(14, crc, true); h.setUint32(18, size, true); h.setUint32(22, size, true); h.setUint16(26, name.length, true);
    parts.push(new Uint8Array(h.buffer), name, f.data);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true);
    c.setUint32(16, crc, true); c.setUint32(20, size, true); c.setUint32(24, size, true); c.setUint16(28, name.length, true); c.setUint32(42, offset, true);
    central.push(new Uint8Array(c.buffer), name);
    offset += 30 + name.length + size;
  }
  const cdSize = central.reduce((s, p) => s + p.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true); end.setUint32(12, cdSize, true); end.setUint32(16, offset, true);
  const all = [...parts, ...central, new Uint8Array(end.buffer)];
  const out = new Uint8Array(all.reduce((s, p) => s + p.length, 0));
  let p = 0; for (const a of all) { out.set(a, p); p += a.length; }
  return out;
}

const xml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
const col = (i: number) => { let s = ''; for (i++; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + ((i - 1) % 26)) + s; return s; };

export function toXlsx(sheets: { name: string; rows: Cell[][] }[]) {
  const enc = new TextEncoder();
  const sheetXml = (rows: Cell[][]) => {
    const width = Math.max(1, ...rows.map((r) => r.length));
    const cols = Array.from({ length: width }, (_, i) => `<col min="${i + 1}" max="${i + 1}" width="${Math.min(60, Math.max(10, ...rows.map((r) => String(r[i] ?? '').length + 2)))}" customWidth="1"/>`).join('');
    const body = rows.map((r, ri) => `<row r="${ri + 1}">${r.map((v, ci) => {
      const ref = `${col(ci)}${ri + 1}`, style = ri === 0 ? ' s="1"' : '';
      return typeof v === 'number' && Number.isFinite(v) ? `<c r="${ref}"${style}><v>${v}</v></c>` : `<c r="${ref}" t="inlineStr"${style}><is><t xml:space="preserve">${xml(String(v))}</t></is></c>`;
    }).join('')}</row>`).join('');
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView rightToLeft="1" workbookViewId="0"/></sheetViews><cols>${cols}</cols><sheetData>${body}</sheetData></worksheet>`;
  };
  const files = [
    { name: '[Content_Types].xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>` },
    { name: '_rels/.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
    { name: 'xl/workbook.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((s, i) => `<sheet name="${xml(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>` },
    { name: 'xl/_rels/workbook.xml.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
    { name: 'xl/styles.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Tahoma"/></font><font><b/><sz val="11"/><name val="Tahoma"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="2"><xf fontId="0"/><xf fontId="1" applyFont="1"/></cellXfs></styleSheet>` },
    ...sheets.map((s, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, data: sheetXml(s.rows) })),
  ];
  return zipStore(files.map((f) => ({ name: f.name, data: enc.encode(f.data) })));
}

/** سند Word (HTML با فضای نام Office) از همان سند رسمی چاپی. */
export function toWordHtml(innerHtml: string, css: string, title: string) {
  return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>${xml(title)}</title><style>${css}</style></head><body dir="rtl">${innerHtml}</body></html>`;
}

export function download(data: BlobPart, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export const fileBase = (reports: ElectionReport[]) => {
  const d = new Date().toISOString().slice(0, 10);
  return reports.length === 1 ? `گزارش-نتایج-${reportName(reports[0]).replace(/\s+/g, '-')}-${d}` : `گزارش-نتایج-انتخابات-انجمن‌ها-${d}`;
};
