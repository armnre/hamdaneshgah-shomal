import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
import AdminLogin from './admin/AdminLogin';
import { ElectionsList, ElectionDetail, VotePage } from './pages/Elections';

// Admin panel is code-split so public visitors never download it.
const AdminApp = lazy(() => import('./admin/AdminApp'));
const Dashboard = lazy(() => import('./admin/Dashboard'));
const ResourcePage = lazy(() => import('./admin/ResourcePage'));
const AuditPage = lazy(() => import('./admin/OtherPages').then((m) => ({ default: m.AuditPage })));
const MessagesPage = lazy(() => import('./admin/OtherPages').then((m) => ({ default: m.MessagesPage })));
const SettingsPage = lazy(() => import('./admin/OtherPages').then((m) => ({ default: m.SettingsPage })));
const Loading = () => <div className="flex min-h-screen items-center justify-center text-muted-foreground" role="status">در حال بارگذاری…</div>;

const qc = new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } } });

export default function App() {
  useEffect(() => {
    document.documentElement.lang = 'fa';
    document.documentElement.dir = 'rtl';
  }, []);
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <Suspense fallback={<Loading />}>
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
            <Route path="/courses" element={<Navigate to="/events" replace />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/privacy" element={<Legal kind="privacy" />} />
            <Route path="/terms" element={<Legal kind="terms" />} />
            <Route path="/elections" element={<ElectionsList />} />
            <Route path="/elections/:slug" element={<ElectionDetail />} />
            <Route path="/vote" element={<VotePage />} />
            <Route path="*" element={<NotFound />} />
          </Route>
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/login" element={<Navigate to="/admin/login" replace />} />
          <Route path="/signin" element={<Navigate to="/admin/login" replace />} />
          <Route path="/admin" element={<AdminApp />}>
            <Route index element={<Dashboard />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="audit" element={<AuditPage />} />
            <Route path="messages" element={<MessagesPage />} />
            <Route path=":entity" element={<ResourcePage />} />
          </Route>
        </Routes>
        </Suspense>
      </BrowserRouter>
      <Toaster position="top-center" dir="rtl" />
    </QueryClientProvider>
  );
}
