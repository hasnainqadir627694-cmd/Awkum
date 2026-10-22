import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { BrandingConfig, DEFAULT_BRANDING } from '../data/adminData';
import { subscribeToBranding, getPublishedBranding } from '../lib/brandingService';

interface BrandingContextType {
  branding: BrandingConfig;
  logoUrl: string;
  bottomImageUrl: string;
  bottomImageEnabled: boolean;
  bottomImageScale: number;
  bgImageUrl: string;
  bgImageEnabled: boolean;
  bgImageScale: number;
  updateBrandingState: (newBranding: Partial<BrandingConfig>) => void;
}

const BrandingContext = createContext<BrandingContextType>({
  branding: DEFAULT_BRANDING,
  logoUrl: '',
  bottomImageUrl: DEFAULT_BRANDING.bottomImageUrl || '',
  bottomImageEnabled: true,
  bottomImageScale: 100,
  bgImageUrl: '',
  bgImageEnabled: false,
  bgImageScale: 100,
  updateBrandingState: () => {},
});

export const BrandingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [branding, setBranding] = useState<BrandingConfig>(DEFAULT_BRANDING);

  useEffect(() => {
    // 1. Initial fetch
    getPublishedBranding().then((initial) => {
      setBranding(initial);
    });

    // 2. Real-time Firestore subscription for multi-tier platform-wide sync
    const unsubscribe = subscribeToBranding((updated) => {
      setBranding(updated);
    });

    return () => unsubscribe();
  }, []);

  // Update dynamic browser favicon & apple-touch-icon whenever custom logo changes
  useEffect(() => {
    const activeLogo = branding.logoUrl;
    if (activeLogo) {
      let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      link.href = activeLogo;

      let appleLink: HTMLLinkElement | null = document.querySelector("link[rel~='apple-touch-icon']");
      if (!appleLink) {
        appleLink = document.createElement('link');
        appleLink.rel = 'apple-touch-icon';
        document.getElementsByTagName('head')[0].appendChild(appleLink);
      }
      appleLink.href = activeLogo;
    }
  }, [branding.logoUrl]);

  const updateBrandingState = (newBranding: Partial<BrandingConfig>) => {
    setBranding((prev) => ({
      ...prev,
      ...newBranding,
    }));
  };

  return (
    <BrandingContext.Provider
      value={{
        branding,
        logoUrl: branding.logoUrl || '',
        bottomImageUrl: branding.bottomImageUrl || '/images/awkum-admin-building.jpg',
        bottomImageEnabled: branding.bottomImageEnabled !== false,
        bottomImageScale: branding.bottomImageScale || 100,
        bgImageUrl: branding.bgImageUrl || '',
        bgImageEnabled: branding.bgImageEnabled || false,
        bgImageScale: branding.bgImageScale || 100,
        updateBrandingState,
      }}
    >
      {children}
    </BrandingContext.Provider>
  );
};

export const useBranding = () => useContext(BrandingContext);
