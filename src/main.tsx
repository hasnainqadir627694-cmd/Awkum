import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { BrandingProvider } from './context/BrandingContext';

createRoot(document.getElementById('root')!).render(
  <BrandingProvider>
    <App />
  </BrandingProvider>
);
