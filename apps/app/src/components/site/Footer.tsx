import { Link } from 'react-router-dom';
import { Mail, MapPin, ExternalLink, Send } from 'lucide-react';
import { Brand, NAV, useSettings } from './PublicLayout';

export default function Footer() {
  const { data } = useSettings();
  const st = data?.settings ?? {};
  return (
    <footer className="mt-20 bg-sidebar text-sidebar-foreground">
      <div className="container-page grid gap-10 py-14 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="text-sidebar-accent-foreground"><Brand light /></div>
          <p className="mt-4 max-w-md text-sm leading-7">{st.tagline}</p>
          <p className="mt-3 text-xs text-sidebar-foreground/60">این پلتفرم در حال توسعه است و وب‌سایت رسمی دانشگاه نیست.</p>
        </div>
        <div>
          <h2 className="mb-4 font-bold text-sidebar-accent-foreground">بخش‌ها</h2>
          <ul className="grid gap-2 text-sm">
            {NAV.map((n) => <li key={n.to}><Link to={n.to} className="hover:text-sidebar-primary">{n.label}</Link></li>)}
            <li><Link to="/contact" className="hover:text-sidebar-primary">تماس با ما</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="mb-4 font-bold text-sidebar-accent-foreground">ارتباط</h2>
          <ul className="grid gap-3 text-sm">
            {st.contactAddress && <li className="flex gap-2 leading-6"><MapPin className="mt-1 h-4 w-4 shrink-0" />{st.contactAddress}</li>}
            {st.contactEmail && <li className="flex items-center gap-2"><Mail className="h-4 w-4" /><a href={`mailto:${st.contactEmail}`} dir="ltr">{st.contactEmail}</a></li>}
            {st.universityUrl && <li><a href={st.universityUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-sidebar-primary"><ExternalLink className="h-4 w-4" />وب‌سایت رسمی دانشگاه</a></li>}
            {st.telegramUrl && <li><a href={st.telegramUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-sidebar-primary"><Send className="h-4 w-4" />کانال رسمی تلگرام</a></li>}
          </ul>
        </div>
      </div>
      <div className="border-t border-sidebar-border">
        <div className="container-page flex flex-wrap justify-between gap-3 py-5 text-xs text-sidebar-foreground/70">
          <span>© {new Date().toLocaleDateString('fa-IR-u-ca-persian', { year: 'numeric' })} {st.productName}</span>
          <span className="flex gap-4"><Link to="/privacy">حریم خصوصی</Link><Link to="/terms">شرایط استفاده</Link></span>
        </div>
      </div>
    </footer>
  );
}
