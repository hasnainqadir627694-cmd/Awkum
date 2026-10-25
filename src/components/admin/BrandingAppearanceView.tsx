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
  Building,
  Eye,
  EyeOff,
  Sliders,
  Trash2,
  Info,
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

  // 1. Website Logo State
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [pendingLogoFile, setPendingLogoFile] = useState<File | null>(null);

  // 2. Dedicated PWA / Mobile App Icon State
  const [pwaIconPreview, setPwaIconPreview] = useState<string>('');
  const [pendingPwaIconFile, setPendingPwaIconFile] = useState<File | null>(null);

  // 3. Login Bottom Campus Building Image State
  const [bottomImagePreview, setBottomImagePreview] = useState<string>('');
  const [pendingBottomImageFile, setPendingBottomImageFile] = useState<File | null>(null);
  const [bottomImageEnabled, setBottomImageEnabled] = useState<boolean>(false);
  const [bottomImageScale, setBottomImageScale] = useState<number>(100);
  const [previewFitMode, setPreviewFitMode] = useState<'fit' | 'grounding'>('fit');

  const [isPublishing, setIsPublishing] = useState(false);
  const [isRollingBack, setIsRollingBack] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load published configuration on mount
  useEffect(() => {
    getPublishedBranding().then((cfg) => {
      setCurrentBranding(cfg);
      setLogoPreview(cfg.logoUrl || '');
      setPwaIconPreview(cfg.pwaIconUrl || cfg.logoUrl || '');
      setBottomImagePreview(cfg.bottomImageUrl || '');
      setBottomImageEnabled(cfg.bottomImageEnabled ?? false);
      setBottomImageScale(cfg.bottomImageScale || 100);
    });
  }, []);

  // Handle Website Logo file selection
  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStatusMessage(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      if (file.size > 5 * 1024 * 1024) {
        setStatusMessage({
          type: 'error',
          text: 'Website Logo image exceeds 5MB limit. Please upload a smaller image file.',
        });
        return;
      }

      const validTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
      if (!validTypes.includes(file.type)) {
        setStatusMessage({
          type: 'error',
          text: 'Invalid format. Please upload a PNG, JPG, SVG, or WebP image.',
        });
        return;
      }

      setPendingLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
      setStatusMessage({
        type: 'success',
        text: 'New Website Logo selected! Click "Publish All Branding Live" to deploy.',
      });
    }
  };

  // Reset Website Logo
  const handleResetLogo = () => {
    setPendingLogoFile(null);
    setLogoPreview('');
  };

  // Handle Dedicated PWA Icon file selection
  const handlePwaIconSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStatusMessage(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      if (file.size > 5 * 1024 * 1024) {
        setStatusMessage({
          type: 'error',
          text: 'PWA Icon image exceeds 5MB limit. Please upload a smaller image file.',
        });
        return;
      }

      const validTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
      if (!validTypes.includes(file.type)) {
        setStatusMessage({
          type: 'error',
          text: 'Invalid format. Please upload a PNG, JPG, SVG, or WebP image.',
        });
        return;
      }

      setPendingPwaIconFile(file);
      setPwaIconPreview(URL.createObjectURL(file));
      setStatusMessage({
        type: 'success',
        text: 'New Mobile App / PWA Icon selected! Click "Publish All Branding Live" to update.',
      });
    }
  };

  // Reset PWA Icon (reverts back to Website Logo)
  const handleResetPwaIcon = () => {
    setPendingPwaIconFile(null);
    setPwaIconPreview(logoPreview || currentBranding.logoUrl || '');
  };

  // Handle Login Bottom Campus Image file selection
  const handleBottomImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStatusMessage(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      if (file.size > 8 * 1024 * 1024) {
        setStatusMessage({
          type: 'error',
          text: 'Campus photo exceeds 8MB limit. Please select a smaller photo.',
        });
        return;
      }

      const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        setStatusMessage({
          type: 'error',
          text: 'Invalid format. Please upload a JPG, PNG, or WebP photograph.',
        });
        return;
      }

      setPendingBottomImageFile(file);
      setBottomImagePreview(URL.createObjectURL(file));
      setBottomImageEnabled(true);
      setStatusMessage({
        type: 'success',
        text: 'New campus building photograph staged! Enabled and ready to deploy.',
      });
    }
  };

  const handleUseCampusBuilding = () => {
    setPendingBottomImageFile(null);
    setBottomImagePreview('/images/awkum-campus-building.jpg');
    setBottomImageEnabled(true);
    setStatusMessage({
      type: 'success',
      text: 'AWKUM Campus Building selected! Click "Publish All Branding Live" to deploy.',
    });
  };

  const handleUseAdminBuilding = () => {
    setPendingBottomImageFile(null);
    setBottomImagePreview('/images/awkum-admin-building.jpg');
    setBottomImageEnabled(true);
    setStatusMessage({
      type: 'success',
      text: 'AWKUM Admin Building selected! Click "Publish All Branding Live" to deploy.',
    });
  };

  const handleRemoveBottomImage = () => {
    setPendingBottomImageFile(null);
    setBottomImagePreview('');
    setBottomImageEnabled(false);
  };

  // Publish both Logos and Bottom Campus Image live
  const handlePublish = async () => {
    setIsPublishing(true);
    setStatusMessage(null);

    try {
      let finalLogoUrl = currentBranding.logoUrl || '';
      let finalPwaIconUrl = currentBranding.pwaIconUrl || finalLogoUrl;
      let finalBottomImageUrl = bottomImagePreview;

      // 1. Upload Website Logo if updated
      if (pendingLogoFile) {
        const uploadRes = await uploadBrandingAsset(pendingLogoFile, 'awkum_classhub/branding/logos');
        finalLogoUrl = uploadRes.secureUrl;
      } else if (logoPreview === '') {
        finalLogoUrl = '';
      }

      // 2. Upload PWA Icon if updated
      if (pendingPwaIconFile) {
        const uploadPwaRes = await uploadBrandingAsset(pendingPwaIconFile, 'awkum_classhub/branding/pwa_icons');
        finalPwaIconUrl = uploadPwaRes.secureUrl;
      } else if (pwaIconPreview === '') {
        finalPwaIconUrl = finalLogoUrl;
      } else if (!pendingPwaIconFile && pwaIconPreview) {
        finalPwaIconUrl = pwaIconPreview;
      }

      // 3. Upload Bottom Building Image if updated
      if (pendingBottomImageFile) {
        const uploadBottomRes = await uploadBrandingAsset(pendingBottomImageFile, 'awkum_classhub/branding/bottom');
        finalBottomImageUrl = uploadBottomRes.secureUrl;
      }

      const published = await publishBranding(
        {
          logoUrl: finalLogoUrl,
          pwaIconUrl: finalPwaIconUrl || finalLogoUrl,
          bottomImageUrl: finalBottomImageUrl,
          bottomImageEnabled: bottomImageEnabled,
          bottomImageScale: bottomImageScale,
        },
        adminEmail
      );

      if (finalLogoUrl) {
        await updateWebsiteLogo(finalLogoUrl);
      }

      // Sync to server backend disk icons
      await fetch('/api/branding/logo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logoDataUrl: finalLogoUrl,
          pwaIconDataUrl: finalPwaIconUrl || finalLogoUrl,
        }),
      }).catch(() => {});

      setCurrentBranding(published);
      updateBrandingState(published);
      setPendingLogoFile(null);
      setPendingPwaIconFile(null);
      setPendingBottomImageFile(null);

      setStatusMessage({
        type: 'success',
        text: `Branding successfully published (v${published.version})! The Website Logo, PWA Icon, and Login Page Bottom Campus Image are now active.`,
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
      setPwaIconPreview(rolledBack.pwaIconUrl || rolledBack.logoUrl || '');
      setBottomImagePreview(rolledBack.bottomImageUrl || '');
      setBottomImageEnabled(rolledBack.bottomImageEnabled ?? false);
      setBottomImageScale(rolledBack.bottomImageScale || 100);
      setPendingLogoFile(null);
      setPendingPwaIconFile(null);
      setPendingBottomImageFile(null);

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
    pendingPwaIconFile !== null ||
    pendingBottomImageFile !== null ||
    logoPreview !== (currentBranding.logoUrl || '') ||
    pwaIconPreview !== (currentBranding.pwaIconUrl || currentBranding.logoUrl || '') ||
    bottomImageEnabled !== (currentBranding.bottomImageEnabled ?? false) ||
    bottomImageScale !== (currentBranding.bottomImageScale || 100) ||
    bottomImagePreview !== (currentBranding.bottomImageUrl || '');

  return (
    <div className="space-y-6 max-w-4xl">
      {/* 1. Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#38271C]">Branding & Visual Identity</h1>
          <p className="text-xs text-[#806A56] mt-0.5">
            Configure the website logo, mobile PWA launcher icon, and login page campus building image.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {currentBranding.previousLogoUrl || currentBranding.previousBottomImageUrl ? (
            <button
              onClick={handleRollback}
              disabled={isRollingBack}
              className="px-3.5 py-2 bg-white border border-[#E6D8C7] hover:bg-[#F8F0E5] text-xs font-semibold text-[#806A56] hover:text-[#38271C] rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isRollingBack ? 'animate-spin' : ''}`} />
              <span>Rollback</span>
            </button>
          ) : null}

          <button
            onClick={handlePublish}
            disabled={isPublishing || !hasUnpublishedChanges}
            className="px-5 py-2.5 bg-[#493222] hover:bg-[#38271C] text-xs font-bold text-[#FFF9F1] rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPublishing ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            <span>Publish All Branding Live</span>
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
          <span>Live Version: <strong className="text-[#38271C]">v{currentBranding.version}</strong></span>
          <span>· Last Updated: <strong className="text-[#38271C]">{currentBranding.lastUpdated}</strong></span>
          <span>· By: <strong className="text-[#38271C]">{currentBranding.updatedBy}</strong></span>
        </div>
        {hasUnpublishedChanges && (
          <span className="px-2.5 py-0.5 bg-[#FFF3CD] text-[#B78103] font-bold text-[10px] rounded-full animate-pulse">
            Unpublished Changes Ready to Deploy
          </span>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: WEBSITE & PORTAL LOGO */}
      {/* ========================================================================= */}
      <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl p-6 shadow-2xs space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100/70 border border-amber-200 text-[#493222] flex items-center justify-center shrink-0">
              <Globe className="w-5 h-5 text-[#493222]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#38271C]">1. Website & Portal Logo</h2>
              <p className="text-xs text-[#806A56] mt-0.5">
                Displays across the web application: login and registration card, top navigation headers, sidebars, and desktop browser tab favicons.
              </p>
            </div>
          </div>
          {pendingLogoFile && (
            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-bold rounded-full">
              New File Staged
            </span>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-6 p-5 bg-white border border-[#E6D8C7] rounded-2xl">
          {/* Live Preview — Pure, uncropped, zero extra borders */}
          <div className="flex flex-col items-center gap-1.5 shrink-0">
            <div
              className="w-24 h-24 flex items-center justify-center bg-transparent select-none overflow-hidden"
              title="Website Logo Preview (As-is, no forced border)"
            >
              <AwkumEmblem size={88} overrideLogoUrl={logoPreview || undefined} />
            </div>
            <span className="text-[10px] font-medium text-[#806A56]">Web Preview</span>
          </div>

          <div className="space-y-2.5 flex-1 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
              <label className="px-4 py-2.5 bg-[#493222] hover:bg-[#38271C] text-[#FFF9F1] text-xs font-bold rounded-xl cursor-pointer transition-colors inline-flex items-center gap-1.5 shadow-2xs">
                <Upload className="w-4 h-4" />
                <span>Upload Website Logo</span>
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
                  Revert to Default
                </button>
              )}
            </div>

            <p className="text-[11px] text-[#806A56] leading-relaxed">
              Recommended: Transparent PNG, SVG, or high-res JPG. Displays naturally with zero artificial borders or container padding.
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 2: DEDICATED PWA / MOBILE APP LAUNCHER ICON */}
      {/* ========================================================================= */}
      <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl p-6 shadow-2xs space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100/70 border border-emerald-200 text-emerald-800 flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5 text-emerald-800" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#38271C]">2. Mobile App / PWA Icon</h2>
              <p className="text-xs text-[#806A56] mt-0.5">
                Specifically applied when students or teachers install the app on their Android or iPhone. Configured uncropped without safe-zone cuts.
              </p>
            </div>
          </div>
          {pendingPwaIconFile && (
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
              New PWA Icon Staged
            </span>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-6 p-5 bg-white border border-[#E6D8C7] rounded-2xl">
          {/* Live Mobile App Launcher Simulation — No forced cropping, no extra border */}
          <div className="flex flex-col items-center gap-1.5 shrink-0">
            <div
              className="w-24 h-24 flex items-center justify-center bg-transparent select-none p-1"
              title="Mobile App Launcher Icon Preview"
            >
              {pwaIconPreview ? (
                <img
                  src={pwaIconPreview}
                  alt="PWA App Icon"
                  className="w-full h-full object-contain select-none pointer-events-none"
                />
              ) : (
                <AwkumEmblem size={88} overrideLogoUrl={logoPreview || undefined} />
              )}
            </div>
            <span className="text-[10px] font-medium text-[#806A56]">Phone Launcher Icon</span>
          </div>

          <div className="space-y-2.5 flex-1 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
              <label className="px-4 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-[#FFF9F1] text-xs font-bold rounded-xl cursor-pointer transition-colors inline-flex items-center gap-1.5 shadow-2xs">
                <Upload className="w-4 h-4" />
                <span>Upload Mobile App (PWA) Icon</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={handlePwaIconSelect}
                  className="hidden"
                />
              </label>

              {pwaIconPreview && (
                <button
                  type="button"
                  onClick={handleResetPwaIcon}
                  className="px-3.5 py-2.5 bg-white border border-[#D8C7B4] hover:bg-[#F8F0E5] text-xs font-semibold text-[#806A56] hover:text-[#C84B31] rounded-xl transition-colors cursor-pointer"
                >
                  Use Website Logo
                </button>
              )}
            </div>

            <div className="p-3 bg-[#F8F0E5]/70 rounded-xl border border-[#E6D8C7] flex items-start gap-2 text-[11px] text-[#806A56] leading-relaxed">
              <Info className="w-4 h-4 text-[#493222] shrink-0 mt-0.5" />
              <span>
                <strong>Zero-Cropping Guarantee:</strong> The uploaded image is deployed with full-frame display (<code className="font-mono text-[#38271C]">purpose: any</code>) directly to <code className="font-mono text-[#38271C]">icon-192.png</code>, <code className="font-mono text-[#38271C]">icon-512.png</code>, and Apple Touch Icon. Android and iOS will never clip the sides or add artificial borders.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 3: LOGIN PAGE BOTTOM CAMPUS / BUILDING IMAGE */}
      {/* ========================================================================= */}
      <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl p-6 shadow-2xs space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-100/70 border border-purple-200 text-purple-900 flex items-center justify-center shrink-0">
              <Building className="w-5 h-5 text-purple-800" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#38271C]">3. Login Page Bottom Campus Image</h2>
              <p className="text-xs text-[#806A56] mt-0.5">
                Displays an authentic photograph of the university campus building at the bottom of the login and registration page.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setBottomImageEnabled(!bottomImageEnabled)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                bottomImageEnabled
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {bottomImageEnabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span>{bottomImageEnabled ? 'Enabled' : 'Disabled'}</span>
            </button>
            {pendingBottomImageFile && (
              <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-[10px] font-bold rounded-full">
                New Photo Staged
              </span>
            )}
          </div>
        </div>

        <div className="space-y-4 p-5 bg-white border border-[#E6D8C7] rounded-2xl">
          {/* Controls: Upload, Default Building, Remove, Slider */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <label className="px-4 py-2.5 bg-[#493222] hover:bg-[#38271C] text-[#FFF9F1] text-xs font-bold rounded-xl cursor-pointer transition-colors inline-flex items-center gap-1.5 shadow-2xs">
                <Upload className="w-4 h-4" />
                <span>Upload Custom Building Photo</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleBottomImageSelect}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                onClick={handleUseCampusBuilding}
                className="px-3.5 py-2.5 bg-[#FFF9F1] border border-[#E6D8C7] hover:bg-[#F8F0E5] text-xs font-semibold text-[#493222] rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Building className="w-4 h-4 text-[#806A56]" />
                <span>Use AWKUM Campus Building</span>
              </button>

              <button
                type="button"
                onClick={handleUseAdminBuilding}
                className="px-3.5 py-2.5 bg-[#FFF9F1] border border-[#E6D8C7] hover:bg-[#F8F0E5] text-xs font-semibold text-[#806A56] rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Building className="w-4 h-4 text-[#806A56]" />
                <span>Use Admin Building</span>
              </button>

              {bottomImagePreview && (
                <button
                  type="button"
                  onClick={handleRemoveBottomImage}
                  className="px-3.5 py-2.5 bg-white border border-[#D8C7B4] hover:bg-red-50 text-xs font-semibold text-[#C84B31] rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Remove Image</span>
                </button>
              )}
            </div>

            {/* Scale Slider & Fit Mode Controls */}
            {bottomImageEnabled && bottomImagePreview && (
              <div className="flex flex-wrap items-center gap-3 bg-[#F8F0E5]/70 border border-[#E6D8C7] px-3.5 py-2 rounded-xl">
                <div className="flex items-center gap-2">
                  <Sliders className="w-3.5 h-3.5 text-[#806A56]" />
                  <span className="text-[11px] font-medium text-[#806A56]">Scale:</span>
                  <input
                    type="range"
                    min="50"
                    max="150"
                    step="5"
                    value={bottomImageScale}
                    onChange={(e) => setBottomImageScale(Number(e.target.value))}
                    className="w-24 sm:w-28 accent-[#493222] cursor-pointer"
                  />
                  <span className="text-xs font-mono font-bold text-[#38271C] w-12 text-right">
                    {bottomImageScale}%
                  </span>
                  {bottomImageScale !== 100 && (
                    <button
                      type="button"
                      onClick={() => setBottomImageScale(100)}
                      className="px-2 py-0.5 text-[10px] font-semibold text-[#806A56] hover:text-[#493222] bg-white border border-[#D8C7B4] rounded-md cursor-pointer transition-colors"
                      title="Reset scale to 100%"
                    >
                      Reset
                    </button>
                  )}
                </div>

                <div className="h-4 w-px bg-[#D8C7B4] hidden sm:block" />

                {/* View Mode Toggle */}
                <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-[#D8C7B4] text-[11px]">
                  <button
                    type="button"
                    onClick={() => setPreviewFitMode('fit')}
                    className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                      previewFitMode === 'fit'
                        ? 'bg-[#493222] text-[#FFF9F1] font-bold'
                        : 'text-[#806A56] hover:text-[#38271C]'
                    }`}
                  >
                    Full Landscape Fit
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewFitMode('grounding')}
                    className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                      previewFitMode === 'grounding'
                        ? 'bg-[#493222] text-[#FFF9F1] font-bold'
                        : 'text-[#806A56] hover:text-[#38271C]'
                    }`}
                  >
                    Login Screen View
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Live Preview (Full Landscape Visibility & Login Grounding) */}
          {bottomImagePreview ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#38271C]">
                  Live Preview: {previewFitMode === 'fit' ? 'Full Landscape (Entire Image Visible)' : 'Login Screen Grounding'}
                </span>
                <span className="text-[11px] text-[#806A56] font-medium hidden sm:inline">
                  {previewFitMode === 'fit' ? '100% photo area visible without clipping' : 'Anchored to bottom with top fade'}
                </span>
              </div>

              <div
                className={`relative rounded-2xl overflow-hidden border border-[#E6D8C7] bg-[#F8F0E5] shadow-xs transition-all flex items-end justify-center min-h-[260px] sm:min-h-[340px] md:min-h-[380px] max-h-[460px] ${
                  !bottomImageEnabled ? 'opacity-40 grayscale' : ''
                }`}
              >
                {/* Subtle top edge fade — elevated at very top so building is never covered */}
                <div className="absolute inset-x-0 top-0 h-6 sm:h-8 bg-linear-to-b from-[#F8F0E5] to-transparent z-10 pointer-events-none" />

                <div className="w-full h-full flex items-end justify-center overflow-hidden">
                  <img
                    src={bottomImagePreview}
                    alt="Login Bottom Campus Building"
                    className={`w-full transition-transform duration-200 block select-none pointer-events-none ${
                      previewFitMode === 'fit'
                        ? 'h-auto max-h-[420px] object-contain object-bottom'
                        : 'h-auto min-h-[260px] sm:min-h-[340px] md:min-h-[380px] max-h-[460px] object-cover object-bottom'
                    }`}
                    style={{
                      transform:
                        bottomImageScale && bottomImageScale !== 100
                          ? `scale(${bottomImageScale / 100})`
                          : undefined,
                      transformOrigin: 'bottom center',
                    }}
                  />
                </div>
              </div>

              {!bottomImageEnabled && (
                <p className="text-[11px] text-amber-700 italic">
                  Image is currently disabled. Toggle &quot;Enabled&quot; above to make it visible on the login screen.
                </p>
              )}
              {bottomImageEnabled && (
                <p className="text-[11px] text-[#806A56]">
                  Landscape photographs fit best. The building stays grounded at the bottom with a subtle top edge fade. Use the scale slider above to adjust its display size.
                </p>
              )}
            </div>
          ) : (
            <div className="p-6 border border-dashed border-[#D8C7B4] rounded-2xl text-center space-y-1.5 bg-[#F8F0E5]/30">
              <Building className="w-8 h-8 text-[#806A56]/60 mx-auto" />
              <p className="text-xs font-semibold text-[#806A56]">No Bottom Building Image Configured</p>
              <p className="text-[11px] text-[#806A56]/80">
                Click &quot;Use AWKUM Campus Building&quot; or upload your custom campus photograph to display it on the login page.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
