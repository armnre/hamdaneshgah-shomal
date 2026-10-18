import { useEffect } from 'react';

// Per-page title + description for SEO. Admin pages call with noindex.
export function useTitle(title: string, description?: string, noindex = false) {
  useEffect(() => {
    const base = 'هم‌دانشگاه شمال';
    document.title = title ? `${title} | ${base}` : `${base} — انجمن‌ها و فعالیت‌های دانشجویی دانشگاه شمال`;
    const set = (name: string, content: string) => {
      let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
      if (!el) { el = document.createElement('meta'); el.name = name; document.head.appendChild(el); }
      el.content = content;
    };
    if (description) set('description', description);
    set('robots', noindex ? 'noindex, nofollow' : 'index, follow');
  }, [title, description, noindex]);
}
