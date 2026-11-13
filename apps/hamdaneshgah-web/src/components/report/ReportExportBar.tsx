// نوار دریافت گزارش: PDF (چاپ سند رسمی)، Excel، Word، CSV، JSON. سند رسمی پنهان در body رندر می‌شود تا چاپ فقط همان باشد.
import { useRef } from 'react';
import { createPortal } from 'react-dom';
import { FileText, FileSpreadsheet, FileType, FileDown, Braces } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@project/components/ui/button';
import OfficialReport, { REPORT_CSS } from './OfficialReport';
import { download, fileBase, reportSheets, toCsv, toJson, toWordHtml, toXlsx, type ElectionReport } from '../../lib/reportExport';

const PRINT_CSS = `
.rp-print-root{position:fixed;top:0;left:-10000px;width:210mm;visibility:hidden;pointer-events:none}
@media print{
  @page{size:A4;margin:0}
  body.rp-printing>*:not(.rp-print-root[data-active]){display:none!important}
  body.rp-printing .rp-print-root[data-active]{position:static;visibility:visible;width:auto}
}`;

type Format = 'pdf' | 'xlsx' | 'docx' | 'csv' | 'json';

export default function ReportExportBar({ reports, formats = ['pdf', 'xlsx', 'docx', 'csv', 'json'], size = 'sm' }: { reports: ElectionReport[]; formats?: Format[]; size?: 'sm' | 'default' }) {
  const ref = useRef<HTMLDivElement>(null);
  const empty = !reports.length;
  const base = fileBase(reports);

  const print = () => {
    ref.current?.setAttribute('data-active', '');
    document.body.classList.add('rp-printing');
    const done = () => { document.body.classList.remove('rp-printing'); ref.current?.removeAttribute('data-active'); window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    // تصویر نشان دانشگاه پیش از چاپ بارگذاری شود
    const imgs = [...(ref.current?.querySelectorAll('img') ?? [])].filter((i) => !i.complete);
    Promise.all(imgs.map((i) => new Promise((r) => { i.onload = i.onerror = r; }))).then(() => { window.print(); setTimeout(done, 1500); });
  };
  const run = (f: Format) => {
    try {
      if (f === 'pdf') return print();
      if (f === 'xlsx') download(toXlsx(reportSheets(reports)), `${base}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      if (f === 'csv') download(toCsv(reports), `${base}.csv`, 'text/csv;charset=utf-8');
      if (f === 'json') download(toJson(reports), `${base}.json`, 'application/json');
      if (f === 'docx') download(toWordHtml(ref.current?.innerHTML ?? '', REPORT_CSS, base), `${base}.doc`, 'application/msword');
      toast.success('گزارش آماده شد');
    } catch {
      toast.error('ساخت فایل گزارش ممکن نشد.');
    }
  };
  const items: Record<Format, [string, typeof FileText]> = { pdf: ['PDF / چاپ', FileText], xlsx: ['Excel', FileSpreadsheet], docx: ['Word', FileType], csv: ['CSV', FileDown], json: ['JSON', Braces] };
  return (
    <div className="flex flex-wrap gap-2">
      {formats.map((f) => {
        const [label, Icon] = items[f];
        return <Button key={f} size={size} variant={f === 'pdf' ? 'default' : 'outline'} disabled={empty} onClick={() => run(f)}><Icon className="ms-1.5 h-4 w-4" />{label}</Button>;
      })}
      {!empty && createPortal(<div className="rp-print-root" ref={ref} aria-hidden><style>{PRINT_CSS}</style><OfficialReport reports={reports} /></div>, document.body)}
    </div>
  );
}
