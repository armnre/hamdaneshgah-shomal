import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@/index.css';
import App from '@/App';
import LoginPage from './LoginPage';

document.documentElement.lang = 'fa';
document.documentElement.dir = 'rtl';

createRoot(document.getElementById('root')!).render(
  <StrictMode>{window.location.pathname === '/login' ? <LoginPage /> : <App />}</StrictMode>,
);
