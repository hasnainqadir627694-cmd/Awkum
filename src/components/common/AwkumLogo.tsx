import React, { useState } from 'react';
import { GraduationCap } from 'lucide-react';
import { useBranding } from '../../context/BrandingContext';
import { getCachedBranding } from '../../lib/brandingService';

interface AwkumLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'light' | 'dark' | 'brand';
  showText?: boolean;
  subtitle?: string;
  customLogoUrl?: string;
}

/**
 * Universal Portal Emblem:
 * - Dynamically consumes multi-tier branding: when a custom logo is published or uploaded, renders it everywhere.
 * - Single source of truth across Login, Headers, Sidebars, Modals, and Portals.
 * - If no logo is configured, renders a clean neutral academic placeholder (NO hardcoded minaret silhouette).
 */
export const AwkumEmblem: React.FC<{
  className?: string;
  size?: number;
  overrideLogoUrl?: string;
}> = ({ className = '', size = 44, overrideLogoUrl }) => {
  const [imageFailed, setImageFailed] = useState(false);

  let brandingLogoUrl = '';
  try {
    const branding = useBranding();
    brandingLogoUrl = branding.logoUrl;
  } catch {
    // Graceful fallback if rendered outside BrandingProvider
  }

  const cached = getCachedBranding();
  const activeLogo = (overrideLogoUrl || brandingLogoUrl || cached.logoUrl || '/favicon.png').trim();

  if (activeLogo && !imageFailed) {
    return (
      <img
        src={activeLogo}
        alt="University Logo"
        style={{ width: size, height: size }}
        onError={() => setImageFailed(true)}
        className={`shrink-0 object-contain select-none pointer-events-none bg-transparent ${className}`}
      />
    );
  }

  // Clean, neutral academic placeholder when no logo is uploaded — NO hardcoded emblem!
  return (
    <div
      style={{ width: size, height: size }}
      className={`shrink-0 rounded-xl bg-[#493222]/10 border border-[#D8C7B4]/60 flex items-center justify-center text-[#493222] select-none ${className}`}
      aria-label="Portal Logo Placeholder"
    >
      <GraduationCap
        style={{
          width: Math.max(14, Math.round(size * 0.55)),
          height: Math.max(14, Math.round(size * 0.55)),
        }}
        className="opacity-75"
      />
    </div>
  );
};

// Alias for universal clarity
export const UniversalLogo = AwkumEmblem;

export const AwkumLogo: React.FC<AwkumLogoProps> = ({
  size = 'md',
  variant = 'brand',
  showText = true,
  subtitle = 'Abdul Wali Khan University Mardan',
  customLogoUrl,
}) => {
  const pixelSizes = {
    sm: 36,
    md: 44,
    lg: 56,
    xl: 72,
  };

  const textSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-xl',
    xl: 'text-2xl',
  };

  const isLight = variant === 'light';

  return (
    <div className="flex items-center gap-3 select-none">
      <AwkumEmblem size={pixelSizes[size]} overrideLogoUrl={customLogoUrl} />
      {showText && (
        <div className="flex flex-col">
          <div className="flex items-baseline gap-1.5 leading-none">
            <span
              className={`font-serif tracking-wider font-bold ${
                isLight ? 'text-white' : 'text-[#38271C]'
              } ${textSizes[size]}`}
            >
              AWKUM
            </span>
            <span
              className="text-xs font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#493222]/10 text-[#493222]"
            >
              ClassHub
            </span>
          </div>
          <span
            className={`text-[11px] font-medium tracking-tight mt-0.5 ${
              isLight ? 'text-white/80' : 'text-[#806A56]'
            }`}
          >
            {subtitle}
          </span>
        </div>
      )}
    </div>
  );
};
