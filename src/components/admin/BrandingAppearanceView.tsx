import React, { useState, useEffect } from 'react';
import {
  Upload,
  RotateCcw,
  Check,
  AlertCircle,
  Eye,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  Image as ImageIcon,
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

interface BrandingAppearanceViewProps {
  adminEmail: string;
}

export const BrandingAppearanceView: React.FC<BrandingAppearanceViewProps> = ({
  adminEmail,
}) => {
  const { updateBrandingState } = useBranding();
  const [currentBranding, setCurrentBranding] = useState<BrandingConfig>(DEFAULT_BRANDING);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [bottomImagePreview, setBottomImagePreview] = useState<string>('/images/awkum-admin-building.jpg');
  const [pendingLogoFile, setPendingLogoFile] = useState<File | null>(null);
  const [pendingBottomFile, setPendingBottomFile] = useState<File | null>(null);

  const [isPublishing, setIsPublishing] = useState(false);
  const [isRollingBack, setIsRollingBack] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load published configuration on mount
  useEffect(() => {
    getPublishedBranding().then((cfg) => {
      setCurrentBranding(cfg);
      setLogoPreview(cfg.logoUrl || '');
      setBottomImagePreview(cfg.bottomImageUrl || '/images/awkum-admin-building.jpg');
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
        text: 'New logo selected! Preview updated. Click "Publish Branding" to make it live for all students.',
      });
    }
  };

  // Handle Bottom Image file selection
  const handleBottomImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStatusMessage(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      // Validate size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setStatusMessage({
          type: 'error',
          text: 'Bottom background image exceeds 5MB limit. Please select an optimized JPG/PNG/WebP file.',
        });
        return;
      }

      const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        setStatusMessage({
          type: 'error',
          text: 'Invalid image format. Supported formats: JPG, PNG, WebP.',
        });
        return;
      }

      setPendingBottomFile(file);
      setBottomImagePreview(URL.createObjectURL(file));
      setStatusMessage({
        type: 'success',
        text: 'New campus bottom image selected! Preview updated. Click "Publish Branding" to push live.',
      });
    }
  };

  // Reset to default
  const handleResetLogo = () => {
    setPendingLogoFile(null);
    setLogoPreview('');
  };

  const handleResetBottomImage = () => {
    setPendingBottomFile(null);
    setBottomImagePreview('/images/awkum-admin-building.jpg');
  };

  // Publish to Cloudinary & Firestore
  const handlePublish = async () => {
    setIsPublishing(true);
    setStatusMessage(null);

    try {
      let finalLogoUrl = currentBranding.logoUrl || '';
      let finalBottomUrl = currentBranding.bottomImageUrl || '/images/awkum-admin-building.jpg';

      // 1. Upload Logo if changed
      if (pendingLogoFile) {
        const uploadRes = await uploadBrandingAsset(pendingLogoFile, 'awkum_classhub/branding/logos');
        finalLogoUrl = uploadRes.secureUrl;
      } else if (logoPreview === '') {
        finalLogoUrl = '';
      }

      // 2. Upload Bottom image if changed
      if (pendingBottomFile) {
        const uploadRes = await uploadBrandingAsset(pendingBottomFile, 'awkum_classhub/branding/backgrounds');
        finalBottomUrl = uploadRes.secureUrl;
      } else if (bottomImagePreview === '/images/awkum-admin-building.jpg') {
        finalBottomUrl = '/images/awkum-admin-building.jpg';
      }

      // 3. Publish to Firestore
      const published = await publishBranding(
        {
          logoUrl: finalLogoUrl,
          bottomImageUrl: finalBottomUrl,
        },
        adminEmail
      );

      setCurrentBranding(published);
      updateBrandingState(published);
      setPendingLogoFile(null);
      setPendingBottomFile(null);

      setStatusMessage({
        type: 'success',
        text: `Branding successfully published (v${published.version})! Connected login pages across the university will update in real time without requiring a redeploy.`,
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
      setBottomImagePreview(rolledBack.bottomImageUrl || '/images/awkum-admin-building.jpg');
      setPendingLogoFile(null);
      setPendingBottomFile(null);

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
    pendingBottomFile !== null ||
    logoPreview !== (currentBranding.logoUrl || '') ||
    bottomImagePreview !== (currentBranding.bottomImageUrl || '/images/awkum-admin-building.jpg');

  return (
    <div className="space-y-6 max-w-4xl">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#38271C]">Branding & Login Appearance</h1>
          <p className="text-xs text-[#806A56] mt-0.5">
            Update the university logo and login page bottom image live for all users without redeployment
          </p>
        </div>

        <div className="flex items-center gap-2">
          {currentBranding.previousLogoUrl || currentBranding.previousBottomImageUrl ? (
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

      {/* 2. University / Application Logo Section (Matching Mockup 12) */}
      <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl p-6 shadow-2xs space-y-4">
        <div>
          <h2 className="text-sm font-bold text-[#38271C]">University / Application Logo</h2>
          <p className="text-xs text-[#806A56] mt-0.5">
            Appears on the top of the shared login page and student portal headers
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-6 p-4 bg-white border border-[#E6D8C7] rounded-2xl">
          {/* Live Preview (Clean, borderless) */}
          <div className="w-20 h-20 flex items-center justify-center shrink-0">
            <AwkumEmblem size={64} overrideLogoUrl={logoPreview || undefined} />
          </div>

          <div className="space-y-2 flex-1 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
              <label className="px-4 py-2 bg-[#493222] hover:bg-[#38271C] text-[#FFF9F1] text-xs font-bold rounded-xl cursor-pointer transition-colors inline-flex items-center gap-1.5 shadow-2xs">
                <Upload className="w-3.5 h-3.5" />
                <span>Upload New Logo</span>
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
                  className="px-3.5 py-2 bg-white border border-[#D8C7B4] hover:bg-[#F8F0E5] text-xs font-semibold text-[#C84B31] rounded-xl transition-colors cursor-pointer"
                >
                  Restore Vector Emblem
                </button>
              )}
            </div>

            <p className="text-[11px] text-[#806A56]">
              Recommended: PNG transparent (alpha preserved), JPG, WebP, SVG. Max 5MB. Square or arched crest format.
            </p>
          </div>
        </div>
      </div>

      {/* 3. Login Page Bottom Image Section (Matching Mockup 12) */}
      <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl p-6 shadow-2xs space-y-4">
        <div>
          <h2 className="text-sm font-bold text-[#38271C]">Login Page Bottom Image</h2>
          <p className="text-xs text-[#806A56] mt-0.5">
            Architectural hero visual anchored to the bottom section of the public login screen
          </p>
        </div>

        <div className="space-y-4 p-4 bg-white border border-[#E6D8C7] rounded-2xl">
          {/* Live Preview Container with Real Warm Cream Background & Gradient Transition */}
          <div className="relative w-full h-48 sm:h-56 bg-[#F8F0E5] rounded-xl overflow-hidden border border-[#E6D8C7] flex items-end justify-center">
            {/* Top gradient mask */}
            <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[#F8F0E5] via-[#F8F0E5]/80 to-transparent z-10" />

            <img
              src={bottomImagePreview}
              alt="Bottom Architecture Preview"
              className="w-full max-h-full object-cover object-bottom"
            />

            <span className="absolute top-3 right-3 z-20 px-2 py-0.5 bg-[#493222]/80 backdrop-blur-xs text-[#FFF9F1] text-[10px] font-bold rounded-md">
              Live Preview
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <label className="px-4 py-2 bg-[#493222] hover:bg-[#38271C] text-[#FFF9F1] text-xs font-bold rounded-xl cursor-pointer transition-colors inline-flex items-center gap-1.5 shadow-2xs">
                <Upload className="w-3.5 h-3.5" />
                <span>Upload New Image</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleBottomImageSelect}
                  className="hidden"
                />
              </label>

              {bottomImagePreview !== '/images/awkum-admin-building.jpg' && (
                <button
                  type="button"
                  onClick={handleResetBottomImage}
                  className="px-3.5 py-2 bg-white border border-[#D8C7B4] hover:bg-[#F8F0E5] text-xs font-semibold text-[#C84B31] rounded-xl transition-colors cursor-pointer"
                >
                  Restore AWKUM Admin Building
                </button>
              )}
            </div>

            <span className="text-[11px] text-[#806A56]">
              Recommended: JPG, PNG, WebP. Landscape (16:9). Max 5MB.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
