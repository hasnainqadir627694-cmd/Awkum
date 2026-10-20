import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { BrandingConfig, DEFAULT_BRANDING } from '../data/adminData';
import { subscribeToBranding, getPublishedBranding } from '../lib/brandingService';

interface BrandingContextType {
  branding: BrandingConfig;
  logoUrl: string;
  bottomImageUrl: string;
  updateBrandingState: (newBranding: Partial<BrandingConfig>) => void;
}

const BrandingContext = createContext<BrandingContextType>({
  branding: DEFAULT_BRANDING,
  logoUrl: '',
  bottomImageUrl: DEFAULT_BRANDING.bottomImageUrl || '/images/awkum-admin-building.jpg',
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
        updateBrandingState,
      }}
    >
      {children}
    </BrandingContext.Provider>
  );
};

export const useBranding = () => useContext(BrandingContext);
