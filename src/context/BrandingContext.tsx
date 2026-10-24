import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { BrandingConfig, DEFAULT_BRANDING } from '../data/adminData';
import { getCachedBranding } from '../lib/brandingService';
import { brandService } from '../lib/BrandService';

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
  forceReRenderVisualAssets: (config: BrandingConfig) => void;
}

const BrandingContext = createContext<BrandingContextType>({
  branding: DEFAULT_BRANDING,
  logoUrl: '',
  bottomImageUrl: '',
  bottomImageEnabled: false,
  bottomImageScale: 100,
  bgImageUrl: '',
  bgImageEnabled: false,
  bgImageScale: 100,
  updateBrandingState: () => {},
  forceReRenderVisualAssets: () => {},
});

export const BrandingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Synchronous initialization from local storage cache prevents default branding flash on initial mount
  const [branding, setBranding] = useState<BrandingConfig>(() => getCachedBranding());

  useEffect(() => {
    // 1. Initialize BrandService real-time listeners across Firestore docs & DOM meta tags
    brandService.init();

    // 2. Subscribe to BrandService updates for immediate UI state synchronization
    const unsubscribe = brandService.subscribe((updated) => {
      setBranding(updated);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const updateBrandingState = (newBranding: Partial<BrandingConfig>) => {
    const merged: BrandingConfig = {
      ...branding,
      ...newBranding,
    };
    setBranding(merged);
    brandService.forceReRenderVisualAssets(merged);
  };

  const forceReRenderVisualAssets = (config: BrandingConfig) => {
    brandService.forceReRenderVisualAssets(config);
  };

  return (
    <BrandingContext.Provider
      value={{
        branding,
        logoUrl: branding.logoUrl || '',
        bottomImageUrl: branding.bottomImageUrl || '',
        bottomImageEnabled: branding.bottomImageEnabled || false,
        bottomImageScale: branding.bottomImageScale || 100,
        bgImageUrl: branding.bgImageUrl || '',
        bgImageEnabled: branding.bgImageEnabled || false,
        bgImageScale: branding.bgImageScale || 100,
        updateBrandingState,
        forceReRenderVisualAssets,
      }}
    >
      {children}
    </BrandingContext.Provider>
  );
};

export const useBranding = () => useContext(BrandingContext);

