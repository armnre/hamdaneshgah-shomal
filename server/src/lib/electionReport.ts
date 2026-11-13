// گزارش رسمی نتایج یک انتخابات — محاسبه‌ی خالص (بدون پایگاه داده) تا کامل تست شود.
// ورودی: مشخصات انتخابات، نامزدهای تأییدشده، برگه‌های رأی (فهرست شناسه‌ی نامزدها) و آمار مشارکت.
// خروجی: رتبه‌بندی، منتخبان، علی‌البدل‌ها، تساوی‌های مرزی، کنترل‌های صحت و اثر انگشت SHA-256.

export const ALTERNATES = 2; // اعضای علی‌البدل طبق آیین‌نامه‌ی انجمن‌های علمی

export type ReportInput = {
  election: { id: string; title: string; association: string | null; academicYear: string | null; status: string; seats: number; maxChoicesPerVoter: number; votingStart: string | null; votingEnd: string | null };
  candidates: { id: string; fullName: string }[];
  ballots: string[][];
  eligible: number;
  turnout: number;
  generatedAt: string;
};

export type Outcome = 'elected' | 'alternate' | 'not-elected';

export type ElectionReport = {
  election: ReportInput['election'];
  generatedAt: string;
  stats: {
    eligible: number; turnout: number; turnoutPercent: number; ballots: number; blank: number; validBallots: number;
    totalVotes: number; averageChoices: number;
  };
  rows: { rank: number; id: string; fullName: string; votes: number; percentOfBallots: number; outcome: Outcome; tie: boolean }[];
  elected: string[];
  alternates: string[];
  integrity: { ok: boolean; checks: { key: string; label: string; ok: boolean; detail: string }[] };
  warnings: string[];
  fingerprint: string;
};

const round1 = (n: number) => Math.round(n * 10) / 10;

export async function sha256Hex(s: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function buildElectionReport(input: ReportInput): Promise<ElectionReport> {
  const { election, candidates, ballots } = input;
  const known = new Set(candidates.map((c) => c.id));
  const tally = new Map<string, number>(candidates.map((c) => [c.id, 0]));
  let blank = 0, unknown = 0, overLimit = 0, duplicates = 0, totalVotes = 0;
  for (const b of ballots) {
    const ids = b.filter(Boolean);
    if (!ids.length) { blank++; continue; }
    if (ids.length > election.maxChoicesPerVoter) overLimit++;
    if (new Set(ids).size !== ids.length) duplicates++;
    for (const id of new Set(ids)) {
      if (!known.has(id)) { unknown++; continue; }
      tally.set(id, (tally.get(id) ?? 0) + 1);
      totalVotes++;
    }
  }

  // ترتیب: رأی بیشتر، سپس نام (فقط برای ثبات نمایش؛ تساوی جداگانه علامت می‌خورد)
  const sorted = candidates.map((c) => ({ id: c.id, fullName: c.fullName, votes: tally.get(c.id) ?? 0 }))
    .sort((a, b) => b.votes - a.votes || a.fullName.localeCompare(b.fullName, 'fa'));
  const seats = Math.max(1, election.seats);
  const rows = sorted.map((c, i) => {
    // رتبه‌ی رقابتی: هم‌رأی‌ها رتبه‌ی یکسان دارند
    const rank = sorted.findIndex((x) => x.votes === c.votes) + 1;
    const outcome: Outcome = c.votes > 0 && i < seats ? 'elected' : c.votes > 0 && i < seats + ALTERNATES ? 'alternate' : 'not-elected';
    return { rank, ...c, percentOfBallots: ballots.length ? round1((c.votes / ballots.length) * 100) : 0, outcome, tie: false };
  });

  // تساوی روی مرز «منتخب/علی‌البدل» یا «علی‌البدل/غیرمنتخب» → نیاز به تصمیم کمیته (قرعه)
  const warnings: string[] = [];
  for (const cut of [seats, seats + ALTERNATES]) {
    const a = rows[cut - 1], b = rows[cut];
    if (a && b && a.votes > 0 && a.votes === b.votes) {
      for (const r of rows) if (r.votes === a.votes) r.tie = true;
      warnings.push(`تساوی آرا (${a.votes} رأی) در مرز ${cut === seats ? 'منتخبان و علی‌البدل' : 'علی‌البدل و سایر نامزدها'}؛ تعیین تکلیف با کمیته‌ی نظارت (قرعه‌کشی).`);
    }
  }
  const electedCount = rows.filter((r) => r.outcome === 'elected').length;
  if (electedCount < seats) warnings.push(`فقط ${electedCount} نامزد رأی دارند؛ ${seats - electedCount} کرسی خالی می‌ماند.`);

  const checks = [
    { key: 'turnout', label: 'برابری تعداد شرکت‌کنندگان و برگه‌های رأی', ok: input.turnout === ballots.length, detail: `${input.turnout} شرکت‌کننده / ${ballots.length} برگه` },
    { key: 'eligible', label: 'شرکت‌کنندگان بیشتر از واجدین نیستند', ok: input.turnout <= input.eligible, detail: `${input.turnout} از ${input.eligible}` },
    { key: 'unknown', label: 'همه‌ی آرا به نامزدهای تأییدشده داده شده', ok: unknown === 0, detail: unknown ? `${unknown} رأی نامعتبر` : 'بدون مورد' },
    { key: 'limit', label: 'هیچ برگه‌ای بیش از سقف انتخاب ندارد', ok: overLimit === 0, detail: overLimit ? `${overLimit} برگه` : `سقف ${election.maxChoicesPerVoter}` },
    { key: 'dup', label: 'هیچ برگه‌ای نام تکراری ندارد', ok: duplicates === 0, detail: duplicates ? `${duplicates} برگه` : 'بدون مورد' },
  ];
  for (const c of checks) if (!c.ok) warnings.push(`کنترل صحت: ${c.label} — ${c.detail}`);

  const validBallots = ballots.length - blank;
  const stats = {
    eligible: input.eligible, turnout: input.turnout,
    turnoutPercent: input.eligible ? round1((input.turnout / input.eligible) * 100) : 0,
    ballots: ballots.length, blank, validBallots, totalVotes,
    averageChoices: validBallots ? round1(totalVotes / validBallots) : 0,
  };
  // اثر انگشت فقط از داده‌ی نتیجه (نه زمان تولید) — هر نسخه‌ی گزارش از یک نتیجه، اثر یکسان دارد
  const fingerprint = await sha256Hex(JSON.stringify({ e: election.id, s: election.seats, st: stats, r: rows.map((r) => [r.id, r.votes]) }));
  return {
    election, generatedAt: input.generatedAt, stats, rows,
    elected: rows.filter((r) => r.outcome === 'elected').map((r) => r.fullName),
    alternates: rows.filter((r) => r.outcome === 'alternate').map((r) => r.fullName),
    integrity: { ok: checks.every((c) => c.ok), checks }, warnings, fingerprint,
  };
}
