import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { brandService } from '../lib/BrandService';

const LOCAL_STORAGE_KEY = 'zerox_custom_website_logo';
const APP_STORAGE_KEY = 'app_custom_website_logo';

/**
 * Custom hook implementing the 5-tier branding logo sync architecture:
 * Tier 1: Instant 0ms Local Cache (localStorage key: app_custom_website_logo & zerox_custom_website_logo)
 * Tier 2: Real-time window CustomEvent synchronization ('website_logo_updated')
 * Tier 3: DOM-level Favicon & Apple-Touch-Icon cache buster injection
 * Tier 4: Server-Side Disk & PWA Sync (/api/branding/logo & Express routes)
 * Tier 5: Cloud Persistence via Firestore Single Document (pages/branding_settings & branding/settings)
 */
export function useWebsiteLogo() {
  const [logoUrl, setLogoUrl] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored =
          localStorage.getItem(APP_STORAGE_KEY) ||
          localStorage.getItem(LOCAL_STORAGE_KEY);
        if (stored) return stored;
      } catch {
        // Fallback gracefully
      }
    }
    return brandService.getCurrentConfig().logoUrl || '/favicon.png';
  });

  useEffect(() => {
    // 1. Initialize BrandService singleton
    brandService.init();

    // 2. Subscribe to BrandService changes
    const unsubscribe = brandService.subscribe((config) => {
      if (config.logoUrl !== undefined) {
        setLogoUrl(config.logoUrl || '');
      }
    });

    // 3. Listen to window event for instant same-frame updates
    const handleLogoEvent = (e: any) => {
      const url = e.detail?.logoUrl || e.detail?.logoDataUrl;
      if (url) {
        setLogoUrl(url);
      }
    };
    window.addEventListener('website_logo_updated', handleLogoEvent);

    return () => {
      unsubscribe();
      window.removeEventListener('website_logo_updated', handleLogoEvent);
    };
  }, []);

  // Method to trigger full 5-tier sync across local cache, server disk, and Firestore
  const updateWebsiteLogo = async (newLogoDataUrl: string) => {
    if (!newLogoDataUrl) return;

    // Tier 1 & DOM re-rendering via BrandService
    setLogoUrl(newLogoDataUrl);
    const currentConfig = brandService.getCurrentConfig();
    const updatedConfig = {
      ...currentConfig,
      logoUrl: newLogoDataUrl,
    };
    brandService.forceReRenderVisualAssets(updatedConfig);

    // Tier 4: Express API POST /api/branding/logo to write static files on disk
    try {
      await fetch('/api/branding/logo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logoDataUrl: newLogoDataUrl }),
      });
    } catch (err) {
      console.warn('[useWebsiteLogo] Tier 4 Server sync notice:', err);
    }

    // Tier 5: Sync to Cloud Firestore Single Document
    if (db) {
      try {
        const docRefPages = doc(db, 'pages', 'branding_settings');
        const docRefBranding = doc(db, 'config', 'branding');
        const docRefSettings = doc(db, 'branding', 'settings');

        const payload = {
          logoUrl: newLogoDataUrl,
          logoDataUrl: newLogoDataUrl,
          updatedAt: serverTimestamp(),
        };

        await Promise.allSettled([
          setDoc(docRefPages, payload, { merge: true }),
          setDoc(docRefBranding, payload, { merge: true }),
          setDoc(docRefSettings, payload, { merge: true }),
        ]);
      } catch (err) {
        console.warn('[useWebsiteLogo] Tier 5 Firestore write notice:', err);
      }
    }
  };

  return {
    logoUrl,
    updateWebsiteLogo,
  };
}

