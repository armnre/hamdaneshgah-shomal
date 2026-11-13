// سند رسمی صورت‌جلسه‌ی نتایج — یک منبع برای چاپ/PDF و Word. سبک‌ها در REPORT_CSS تا در Word هم همان بماند.
import { faNum, faDate } from '../../lib/format';
import { OUTCOME_LABEL, STATUS_FA, reportName, shortPrint, type ElectionReport } from '../../lib/reportExport';

export const REPORT_CSS = `
.rp-doc{font-family:Vazirmatn,Tahoma,sans-serif;color:#111;direction:rtl;font-size:11pt;line-height:1.75;background:#fff}
.rp-page{padding:14mm 14mm 12mm;page-break-after:always;break-after:page}
.rp-page:last-child{page-break-after:auto;break-after:auto}
.rp-head{display:flex;align-items:center;justify-content:space-between;border-bottom:2.5pt solid #0f3b5f;padding-bottom:8pt;margin-bottom:12pt}
.rp-brand{display:flex;align-items:center;gap:10pt}
.rp-brand img{width:46pt;height:46pt;object-fit:contain}
.rp-brand b{display:block;font-size:13pt;color:#0f3b5f}
.rp-brand span{font-size:9pt;color:#555}
.rp-meta{font-size:9pt;color:#333;text-align:left;line-height:1.9}
.rp-title{text-align:center;margin:4pt 0 2pt;font-size:16pt;font-weight:800;color:#0f3b5f}
.rp-sub{text-align:center;font-size:10pt;color:#444;margin-bottom:12pt}
.rp-stats{width:100%;border-collapse:collapse;margin-bottom:12pt}
.rp-stats td{border:1pt solid #c9d3dc;padding:5pt 8pt;text-align:center;width:16.6%}
.rp-stats td small{display:block;color:#555;font-size:8.5pt}
.rp-stats td b{font-size:12.5pt}
.rp-table{width:100%;border-collapse:collapse;font-size:10.5pt}
.rp-table th{background:#0f3b5f;color:#fff;padding:5pt 6pt;font-weight:700;border:1pt solid #0f3b5f}
.rp-table td{border:1pt solid #c9d3dc;padding:4pt 6pt;text-align:center}
.rp-table td.n{text-align:right}
.rp-table tr.el td{background:#eaf3ea;font-weight:700}
.rp-table tr.al td{background:#fbf6e6}
.rp-h{font-size:11.5pt;font-weight:800;color:#0f3b5f;margin:12pt 0 4pt}
.rp-list{margin:0;padding-right:16pt}
.rp-warn{border:1pt solid #d9a400;background:#fff8e1;padding:6pt 9pt;margin-top:8pt;font-size:10pt}
.rp-ok{color:#1b6b2a;font-weight:700}.rp-bad{color:#a11;font-weight:700}
.rp-checks{width:100%;border-collapse:collapse;font-size:9.5pt;margin-top:4pt}
.rp-checks td{border:1pt solid #e1e6ea;padding:3pt 6pt}
.rp-sign{width:100%;border-collapse:collapse;margin-top:18pt}
.rp-sign td{width:33.3%;text-align:center;vertical-align:top;height:62pt;border:1pt dashed #9aa8b4;font-size:9.5pt;padding-top:5pt}
.rp-foot{margin-top:10pt;border-top:1pt solid #c9d3dc;padding-top:5pt;font-size:8.5pt;color:#555;display:flex;justify-content:space-between;gap:8pt}
.rp-fp{font-family:monospace;direction:ltr;letter-spacing:.5pt}
`;

const docNo = (r: ElectionReport) => `ER-${r.fingerprint.slice(0, 8).toUpperCase()}`;

function ReportPage({ r, logo }: { r: ElectionReport; logo: string }) {
  const s = r.stats;
  return (
    <section className="rp-page">
      <div className="rp-head">
        <div className="rp-brand"><img src={logo} alt="" /><div><b>دانشگاه شمال</b><span>کمیته‌ی برگزاری و نظارت انتخابات انجمن‌های علمی دانشجویی</span></div></div>
        <div className="rp-meta">شماره: <span className="rp-fp">{docNo(r)}</span><br />تاریخ تهیه: {faDate(r.generatedAt, true)}<br />وضعیت: {STATUS_FA[r.election.status] ?? r.election.status}</div>
      </div>
      <h1 className="rp-title">صورت‌جلسه‌ی رسمی نتایج انتخابات</h1>
      <p className="rp-sub">{reportName(r)} — سال تحصیلی {r.election.academicYear ?? '—'}{r.election.votingStart ? ` — رأی‌گیری: ${faDate(r.election.votingStart, true)} تا ${faDate(r.election.votingEnd, true)}` : ''}</p>
      <table className="rp-stats"><tbody><tr>
        {[['واجدین شرایط', faNum(s.eligible)], ['شرکت‌کنندگان', faNum(s.turnout)], ['درصد مشارکت', `٪${faNum(s.turnoutPercent)}`], ['برگه‌های رأی', faNum(s.ballots)], ['آرای ثبت‌شده', faNum(s.totalVotes)], ['کرسی‌ها', `${faNum(r.election.seats)} (+${faNum(2)} علی‌البدل)`]].map(([l, v]) => <td key={l}><small>{l}</small><b>{v}</b></td>)}
      </tr></tbody></table>
      <table className="rp-table">
        <thead><tr><th>رتبه</th><th>نام و نام خانوادگی نامزد</th><th>تعداد آرا</th><th>درصد از برگه‌ها</th><th>نتیجه</th></tr></thead>
        <tbody>{r.rows.map((x) => (
          <tr key={x.id} className={x.outcome === 'elected' ? 'el' : x.outcome === 'alternate' ? 'al' : ''}>
            <td>{faNum(x.rank)}</td><td className="n">{x.fullName}{x.tie ? ' *' : ''}</td><td>{faNum(x.votes)}</td><td>٪{faNum(x.percentOfBallots)}</td><td>{OUTCOME_LABEL[x.outcome]}</td>
          </tr>
        ))}</tbody>
      </table>
      {r.rows.some((x) => x.tie) && <p style={{ fontSize: '9pt' }}>* تساوی آرا در مرز کرسی‌ها؛ تعیین تکلیف با کمیته‌ی نظارت.</p>}
      <p className="rp-h">منتخبان (به ترتیب آرا)</p>
      {r.elected.length ? <ol className="rp-list">{r.elected.map((n) => <li key={n}>{n}</li>)}</ol> : <p>—</p>}
      <p className="rp-h">اعضای علی‌البدل</p>
      {r.alternates.length ? <ol className="rp-list">{r.alternates.map((n) => <li key={n}>{n}</li>)}</ol> : <p>—</p>}
      {r.warnings.length > 0 && <div className="rp-warn">{r.warnings.map((w) => <div key={w}>⚠ {w}</div>)}</div>}
      <p className="rp-h">کنترل صحت شمارش: <span className={r.integrity.ok ? 'rp-ok' : 'rp-bad'}>{r.integrity.ok ? 'همه‌ی کنترل‌ها سالم' : 'نیازمند بررسی'}</span></p>
      <table className="rp-checks"><tbody>{r.integrity.checks.map((c) => <tr key={c.key}><td>{c.ok ? '✔' : '✖'} {c.label}</td><td>{c.detail}</td></tr>)}</tbody></table>
      <table className="rp-sign"><tbody><tr><td>رئیس کمیته‌ی نظارت<br />نام، امضا و تاریخ</td><td>نماینده‌ی معاونت فرهنگی و دانشجویی<br />نام، امضا و تاریخ</td><td>دبیر کمیته‌ی برگزاری<br />نام، امضا و تاریخ</td></tr></tbody></table>
      <div className="rp-foot"><span>رأی‌گیری الکترونیکی بی‌نام؛ برگه‌ها بدون هیچ شناسه‌ی رأی‌دهنده ذخیره و شمرده شده‌اند.</span><span>اثر انگشت نتیجه (SHA-256): <span className="rp-fp">{shortPrint(r.fingerprint)}…</span></span></div>
    </section>
  );
}

export default function OfficialReport({ reports }: { reports: ElectionReport[] }) {
  const logo = `${typeof window !== 'undefined' ? window.location.origin : ''}/shomal/emblem.webp`;
  return (
    <div className="rp-doc">
      <style>{REPORT_CSS}</style>
      {reports.map((r) => <ReportPage key={r.election.id} r={r} logo={logo} />)}
    </div>
  );
}
