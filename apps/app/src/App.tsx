import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@project/components/ui/sonner';
import PublicLayout from './components/site/PublicLayout';
import Home from './pages/Home';
import Associations from './pages/Associations';
import AssociationDetail from './pages/AssociationDetail';
import Faculties from './pages/Faculties';
import NewsList from './pages/NewsList';
import NewsDetail from './pages/NewsDetail';
import Events from './pages/Events';
import EventDetail from './pages/EventDetail';
import Contact from './pages/Contact';
import Legal, { NotFound } from './pages/Legal';
import AdminApp from './admin/AdminApp';
import Dashboard from './admin/Dashboard';
import ResourcePage from './admin/ResourcePage';
import { AuditPage, MessagesPage, SettingsPage } from './admin/OtherPages';

const qc = new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } } });

export default function App() {
  useEffect(() => {
    document.documentElement.lang = 'fa';
    document.documentElement.dir = 'rtl';
  }, []);
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/associations" element={<Associations />} />
            <Route path="/associations/:slug" element={<AssociationDetail />} />
            <Route path="/faculties" element={<Faculties />} />
            <Route path="/news" element={<NewsList />} />
            <Route path="/news/:slug" element={<NewsDetail />} />
            <Route path="/events" element={<Events />} />
            <Route path="/events/:slug" element={<EventDetail />} />
            <Route path="/courses" element={<Events courses />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/privacy" element={<Legal kind="privacy" />} />
            <Route path="/terms" element={<Legal kind="terms" />} />
            <Route path="*" element={<NotFound />} />
          </Route>
          <Route path="/admin" element={<AdminApp />}>
            <Route index element={<Dashboard />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="audit" element={<AuditPage />} />
            <Route path="messages" element={<MessagesPage />} />
            <Route path=":entity" element={<ResourcePage />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster position="top-center" dir="rtl" />
    </QueryClientProvider>
  );
}
