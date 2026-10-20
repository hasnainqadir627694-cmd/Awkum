import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { BrandingProvider } from './context/BrandingContext';

createRoot(document.getElementById('root')!).render(
  <BrandingProvider>
    <App />
  </BrandingProvider>
);

// Register Service Worker for offline caching & instant speed rendering
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.info('ServiceWorker registration notice:', err);
    });
  });
}

