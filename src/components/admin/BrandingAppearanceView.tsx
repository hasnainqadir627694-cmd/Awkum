import React, { useState, useEffect } from 'react';
import {
  Upload,
  RotateCcw,
  Check,
  AlertCircle,
  ShieldCheck,
  RefreshCw,
  Smartphone,
  Globe,
} from 'lucide-react';
import { AwkumEmblem } from '../common/AwkumLogo';
import { BrandingConfig } from '../../data/adminData';
import {
  DEFAULT_BRANDING,
  getPublishedBranding,
  publishBranding,
  rollbackBranding,
  uploadBrandingAsset,
} from '../../lib/brandingService';
import { useBranding } from '../../context/BrandingContext';
import { useWebsiteLogo } from '../../hooks/useWebsiteLogo';

interface BrandingAppearanceViewProps {
  adminEmail: string;
}

export const BrandingAppearanceView: React.FC<BrandingAppearanceViewProps> = ({
  adminEmail,
}) => {
  const { updateBrandingState } = useBranding();
  const { updateWebsiteLogo } = useWebsiteLogo();
  const [currentBranding, setCurrentBranding] = useState<BrandingConfig>(DEFAULT_BRANDING);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [pendingLogoFile, setPendingLogoFile] = useState<File | null>(null);

  const [isPublishing, setIsPublishing] = useState(false);
  const [isRollingBack, setIsRollingBack] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load published configuration on mount
  useEffect(() => {
    getPublishedBranding().then((cfg) => {
      setCurrentBranding(cfg);
      setLogoPreview(cfg.logoUrl || '');
    });
  }, []);

  // Handle Logo file selection
  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStatusMessage(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      // Validate size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setStatusMessage({
          type: 'error',
          text: 'Logo image exceeds 5MB limit. Please upload a smaller PNG/JPG/WebP file.',
        });
        return;
      }

      // Validate format
      const validTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
      if (!validTypes.includes(file.type)) {
        setStatusMessage({
          type: 'error',
          text: 'Invalid logo format. Please upload a PNG, JPG, SVG, or WebP image.',
        });
        return;
      }

      setPendingLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
      setStatusMessage({
        type: 'success',
        text: 'New logo selected! Preview updated. Click "Publish Branding Live" to sync across the web app, PWA icons, and mobile home screen shortcuts.',
      });
    }
  };

  // Reset to default vector emblem
  const handleResetLogo = () => {
    setPendingLogoFile(null);
    setLogoPreview('');
  };

  // Publish to Cloudinary & Firestore & Server PWA Disk
  const handlePublish = async () => {
    setIsPublishing(true);
    setStatusMessage(null);

    try {
      let finalLogoUrl = currentBranding.logoUrl || '';

      if (pendingLogoFile) {
        const uploadRes = await uploadBrandingAsset(pendingLogoFile, 'awkum_classhub/branding/logos');
        finalLogoUrl = uploadRes.secureUrl;
      } else if (logoPreview === '') {
        finalLogoUrl = '';
      }

      const published = await publishBranding(
        {
          logoUrl: finalLogoUrl,
        },
        adminEmail
      );

      if (finalLogoUrl) {
        await updateWebsiteLogo(finalLogoUrl);
      }

      setCurrentBranding(published);
      updateBrandingState(published);
      setPendingLogoFile(null);

      setStatusMessage({
        type: 'success',
        text: `Universal Branding successfully published (v${published.version})! The new logo is now active across all website headers, browser tabs, PWA install icons, and mobile home screen shortcuts in real time.`,
      });
    } catch (err: any) {
      console.error('[Branding Publish Error]:', err);
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Failed to publish branding to live configuration.',
      });
    } finally {
      setIsPublishing(false);
    }
  };

  // Rollback to previous version
  const handleRollback = async () => {
    setIsRollingBack(true);
    setStatusMessage(null);

    try {
      const rolledBack = await rollbackBranding(adminEmail);
      setCurrentBranding(rolledBack);
      updateBrandingState(rolledBack);
      setLogoPreview(rolledBack.logoUrl || '');
      setPendingLogoFile(null);

      setStatusMessage({
        type: 'success',
        text: `Successfully rolled back to previous branding configuration (v${rolledBack.version})!`,
      });
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Rollback failed. No previous version available.',
      });
    } finally {
      setIsRollingBack(false);
    }
  };

  const hasUnpublishedChanges =
    pendingLogoFile !== null ||
    logoPreview !== (currentBranding.logoUrl || '');

  return (
    <div className="space-y-6 max-w-4xl">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#38271C]">Universal Logo & PWA Branding</h1>
          <p className="text-xs text-[#806A56] mt-0.5">
            Update the university logo once to instantly synchronize across the website, browser favicons, PWA app icons, and installed mobile shortcuts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {currentBranding.previousLogoUrl ? (
            <button
              onClick={handleRollback}
              disabled={isRollingBack}
              className="px-3.5 py-1.5 bg-white border border-[#E6D8C7] hover:bg-[#F8F0E5] text-xs font-semibold text-[#806A56] hover:text-[#38271C] rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isRollingBack ? 'animate-spin' : ''}`} />
              <span>Rollback</span>
            </button>
          ) : null}

          <button
            onClick={handlePublish}
            disabled={isPublishing || !hasUnpublishedChanges}
            className="px-5 py-2 bg-[#493222] hover:bg-[#38271C] text-xs font-bold text-[#FFF9F1] rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPublishing ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            <span>Publish Branding Live</span>
          </button>
        </div>
      </div>

      {/* Status Alert Banner */}
      {statusMessage && (
        <div
          className={`p-4 rounded-2xl flex items-start gap-3 text-xs leading-relaxed ${
            statusMessage.type === 'success'
              ? 'bg-[#EAF2E9] border border-[#C5DEC3] text-[#668064]'
              : 'bg-[#FDE8E4] border border-[#F5C2B8] text-[#C84B31]'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <Check className="w-4 h-4 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Version Status Pill */}
      <div className="flex items-center justify-between p-3.5 bg-[#FFF9F1] border border-[#E6D8C7] rounded-2xl text-xs">
        <div className="flex items-center gap-2 text-[#806A56]">
          <ShieldCheck className="w-4 h-4 text-[#668064]" />
          <span>Live Published Version: <strong className="text-[#38271C]">v{currentBranding.version}</strong></span>
          <span>· Last Updated: <strong className="text-[#38271C]">{currentBranding.lastUpdated}</strong></span>
          <span>· By: <strong className="text-[#38271C]">{currentBranding.updatedBy}</strong></span>
        </div>
        {hasUnpublishedChanges && (
          <span className="px-2.5 py-0.5 bg-[#FFF3CD] text-[#B78103] font-bold text-[10px] rounded-full animate-pulse">
            Unpublished Changes Staged
          </span>
        )}
      </div>

      {/* Multi-Layer Sync Info Card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 bg-[#FFF9F1] border border-[#E6D8C7] rounded-2xl space-y-1.5">
          <div className="flex items-center gap-2 text-[#493222] font-bold text-xs">
            <Globe className="w-4 h-4 text-[#668064]" />
            <span>1. Instant Web UI & DOM</span>
          </div>
          <p className="text-[11px] text-[#806A56] leading-relaxed">
            Updates website headers, sidebar emblems, login page, browser tab favicons, and OpenGraph share previews instantly.
          </p>
        </div>

        <div className="p-4 bg-[#FFF9F1] border border-[#E6D8C7] rounded-2xl space-y-1.5">
          <div className="flex items-center gap-2 text-[#493222] font-bold text-xs">
            <Smartphone className="w-4 h-4 text-[#668064]" />
            <span>2. PWA App & Manifest</span>
          </div>
          <p className="text-[11px] text-[#806A56] leading-relaxed">
            Overwrites static icon files on disk (`icon-192.png`, `icon-512.png`, `apple-touch-icon.png`) and updates dynamic `/manifest.json`.
          </p>
        </div>

        <div className="p-4 bg-[#FFF9F1] border border-[#E6D8C7] rounded-2xl space-y-1.5">
          <div className="flex items-center gap-2 text-[#493222] font-bold text-xs">
            <ShieldCheck className="w-4 h-4 text-[#668064]" />
            <span>3. Cloud Persistence</span>
          </div>
          <p className="text-[11px] text-[#806A56] leading-relaxed">
            Synced to Firestore `config/branding` and `pages/branding_settings` so all visitors worldwide receive your custom logo.
          </p>
        </div>
      </div>

      {/* University / Application Logo Section */}
      <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl p-6 shadow-2xs space-y-4">
        <div>
          <h2 className="text-sm font-bold text-[#38271C]">Universal University Logo</h2>
          <p className="text-xs text-[#806A56] mt-0.5">
            Upload your official university logo. This will represent the application everywhere (headers, login, and installed PWA app icon).
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-6 p-5 bg-white border border-[#E6D8C7] rounded-2xl">
          {/* Live Preview */}
          <div className="w-24 h-24 flex items-center justify-center shrink-0 bg-[#F8F0E5]/50 rounded-2xl border border-[#E6D8C7]">
            <AwkumEmblem size={72} overrideLogoUrl={logoPreview || undefined} />
          </div>

          <div className="space-y-2.5 flex-1 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
              <label className="px-4 py-2.5 bg-[#493222] hover:bg-[#38271C] text-[#FFF9F1] text-xs font-bold rounded-xl cursor-pointer transition-colors inline-flex items-center gap-1.5 shadow-2xs">
                <Upload className="w-4 h-4" />
                <span>Upload New Logo Image</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={handleLogoSelect}
                  className="hidden"
                />
              </label>

              {logoPreview && (
                <button
                  type="button"
                  onClick={handleResetLogo}
                  className="px-3.5 py-2.5 bg-white border border-[#D8C7B4] hover:bg-[#F8F0E5] text-xs font-semibold text-[#C84B31] rounded-xl transition-colors cursor-pointer"
                >
                  Restore Vector Emblem
                </button>
              )}
            </div>

            <p className="text-[11px] text-[#806A56] leading-relaxed">
              Recommended: High-resolution square PNG with transparent background (alpha channel preserved), JPG, or SVG. Max 5MB.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
