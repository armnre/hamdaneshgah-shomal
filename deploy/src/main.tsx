import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@/index.css';
import App from '@/App';

document.documentElement.lang = 'fa';
document.documentElement.dir = 'rtl';

if (window.location.pathname === '/login') window.location.replace('/admin');

createRoot(document.getElementById('root')!).render(
  <StrictMode><App /></StrictMode>,
);
