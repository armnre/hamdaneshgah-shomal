import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { Brand, NAV, useSettings } from './PublicLayout';
import { OrnamentRule } from './Ornaments';

export default function Footer() {
  const { data } = useSettings();
  const st = data?.settings ?? {};
  return (
    <footer className="relative mt-24 overflow-hidden bg-sidebar text-sidebar-foreground">
      <div aria-hidden className="girih-gold pointer-events-none absolute inset-0 opacity-20" />
      <OrnamentRule className="container-page relative pt-10" />
      <div className="container-page relative grid gap-10 py-14 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="text-sidebar-accent-foreground"><Brand light /></div>
          <p className="mt-4 max-w-md text-sm leading-7">{st.tagline}</p>
          <p className="mt-3 text-xs text-sidebar-foreground/60">هم‌دانشگاهی یک شبکه دانشجویی مستقل است و وب‌سایت دانشگاه شمال نیست.</p>
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
            {st.contactEmail && <li className="flex items-center gap-2"><Mail className="h-4 w-4" /><a href={`mailto:${st.contactEmail}`} dir="ltr" className="hover:text-sidebar-primary">{st.contactEmail}</a></li>}
            <li><Link to="/contact" className="hover:text-sidebar-primary">فرم تماس با سامانه</Link></li>
          </ul>
        </div>
      </div>
      <div className="relative border-t border-sidebar-border">
        <div className="container-page flex flex-wrap justify-between gap-3 py-5 text-xs text-sidebar-foreground/70">
          <span>© {new Date().toLocaleDateString('fa-IR-u-ca-persian', { year: 'numeric' })} {st.productName}</span>
          <span className="flex gap-4"><Link to="/privacy">حریم خصوصی</Link><Link to="/terms">شرایط استفاده</Link></span>
        </div>
      </div>
    </footer>
  );
}
