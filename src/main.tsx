import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { BrandingProvider } from './context/BrandingContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <BrandingProvider>
      <App />
    </BrandingProvider>
  </ErrorBoundary>
);

// Register Service Worker for offline caching & instant speed rendering
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.info('ServiceWorker registration notice:', err);
    });
  });
}

