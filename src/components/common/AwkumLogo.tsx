import React from 'react';
import { useBranding } from '../../context/BrandingContext';

interface AwkumLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'light' | 'dark' | 'brand';
  showText?: boolean;
  subtitle?: string;
  customLogoUrl?: string;
}

/**
 * Clean AWKUM Emblem:
 * - Dynamically consumes multi-tier branding: if a custom logo is published, renders it everywhere.
 * - Sits freely with NO enclosing border, cage, or background box.
 */
export const AwkumEmblem: React.FC<{
  className?: string;
  size?: number;
  overrideLogoUrl?: string;
}> = ({ className = '', size = 44, overrideLogoUrl }) => {
  let brandingLogoUrl = '';
  try {
    const branding = useBranding();
    brandingLogoUrl = branding.logoUrl;
  } catch {
    // Graceful fallback if rendered outside BrandingProvider
  }

  const activeLogo = overrideLogoUrl || brandingLogoUrl;

  if (activeLogo) {
    return (
      <img
        src={activeLogo}
        alt="AWKUM Logo"
        style={{ width: size, height: size }}
        className={`shrink-0 object-contain select-none pointer-events-none ${className}`}
      />
    );
  }

  // Pure SVG emblem silhouette — NO enclosing box, NO border, NO cage!
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 select-none ${className}`}
      aria-label="AWKUM University Emblem"
    >
      {/* Central University Grand Arch / Minarets silhouette */}
      <g fill="currentColor" className="text-[#493222]">
        {/* Central Dome & Crescent Spire */}
        <path d="M50 14 C44 20 40 25 40 32 L60 32 C60 25 56 20 50 14 Z" />
        <rect x="42" y="33" width="16" height="4" rx="1" />
        <circle cx="50" cy="11" r="2.5" />

        {/* Main Grand Archway */}
        <path
          d="M32 40 C32 34 36 32 42 32 L58 32 C64 32 68 34 68 40 L68 76 L60 76 L60 52 C60 45 55 40 50 40 C45 40 40 45 40 52 L40 76 L32 76 Z"
        />

        {/* Left Minaret & Spire */}
        <path d="M22 26 L26 26 L26 76 L20 76 L20 26 Z" />
        <polygon points="23,17 27,26 19,26" />
        <rect x="18" y="38" width="8" height="2.5" rx="0.5" />
        <rect x="18" y="56" width="8" height="2.5" rx="0.5" />

        {/* Right Minaret & Spire */}
        <path d="M78 26 L82 26 L82 76 L76 76 L76 26 Z" />
        <polygon points="79,17 83,26 75,26" />
        <rect x="74" y="38" width="8" height="2.5" rx="0.5" />
        <rect x="74" y="56" width="8" height="2.5" rx="0.5" />

        {/* Base Steps Foundation */}
        <rect x="14" y="78" width="72" height="4" rx="1.5" />
        <rect x="22" y="83" width="56" height="3.5" rx="1" />
      </g>
    </svg>
  );
};

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
