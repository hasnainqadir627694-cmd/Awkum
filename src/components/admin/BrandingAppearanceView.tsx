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
  const [bottomImageEnabled, setBottomImageEnabled] = useState<boolean>(true);
  const [bottomImageScale, setBottomImageScale] = useState<number>(100);
  const [bgImagePreview, setBgImagePreview] = useState<string>('');
  const [bgImageEnabled, setBgImageEnabled] = useState<boolean>(false);
  const [bgImageScale, setBgImageScale] = useState<number>(100);
  const [pendingLogoFile, setPendingLogoFile] = useState<File | null>(null);
  const [pendingBottomFile, setPendingBottomFile] = useState<File | null>(null);
  const [pendingBgFile, setPendingBgFile] = useState<File | null>(null);

  const [isPublishing, setIsPublishing] = useState(false);
  const [isRollingBack, setIsRollingBack] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load published configuration on mount
  useEffect(() => {
    getPublishedBranding().then((cfg) => {
      setCurrentBranding(cfg);
      setLogoPreview(cfg.logoUrl || '');
      setBottomImagePreview(cfg.bottomImageUrl || '/images/awkum-admin-building.jpg');
      setBottomImageEnabled(cfg.bottomImageEnabled !== false);
      setBottomImageScale(cfg.bottomImageScale || 100);
      setBgImagePreview(cfg.bgImageUrl || '');
      setBgImageEnabled(cfg.bgImageEnabled || false);
      setBgImageScale(cfg.bgImageScale || 100);
    });
  }, []);

  // Handle Logo file selection
  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStatusMessage(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      // Validate size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        setStatusMessage({
          type: 'error',
          text: 'Logo image exceeds 2MB limit. Please upload a smaller PNG/JPG/WebP file.',
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

  // Handle Background Image file selection
  const handleBgImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStatusMessage(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      if (file.size > 5 * 1024 * 1024) {
        setStatusMessage({
          type: 'error',
          text: 'Background image exceeds 5MB limit. Please select a smaller file.',
        });
        return;
      }

      const validTypes = ['image/png', 'image/jpeg', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        setStatusMessage({
          type: 'error',
          text: 'Invalid format. Supported formats: PNG, JPG, WebP.',
        });
        return;
      }

      setPendingBgFile(file);
      setBgImagePreview(URL.createObjectURL(file));
      setBgImageEnabled(true);
      setStatusMessage({
        type: 'success',
        text: 'Custom login background image selected! Click "Publish Branding" to make it live platform-wide.',
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

  const handleResetBgImage = () => {
    setPendingBgFile(null);
    setBgImagePreview('');
    setBgImageEnabled(false);
  };

  // Publish to Cloudinary & Firestore
  const handlePublish = async () => {
    setIsPublishing(true);
    setStatusMessage(null);

    try {
      let finalLogoUrl = currentBranding.logoUrl || '';
      let finalBottomUrl = currentBranding.bottomImageUrl || '/images/awkum-admin-building.jpg';
      let finalBgUrl = currentBranding.bgImageUrl || '';
      let finalBgEnabled = bgImageEnabled;

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

      // 3. Upload Background image if changed
      if (pendingBgFile) {
        const uploadRes = await uploadBrandingAsset(pendingBgFile, 'awkum_classhub/branding/login-bg');
        finalBgUrl = uploadRes.secureUrl;
      } else if (!bgImageEnabled) {
        finalBgUrl = '';
      }

      // 4. Publish to Firestore
      const published = await publishBranding(
        {
          logoUrl: finalLogoUrl,
          bottomImageUrl: finalBottomUrl,
          bottomImageEnabled,
          bottomImageScale,
          bgImageUrl: finalBgUrl,
          bgImageEnabled: finalBgEnabled,
          bgImageScale,
        },
        adminEmail
      );

      setCurrentBranding(published);
      updateBrandingState(published);
      setPendingLogoFile(null);
      setPendingBottomFile(null);
      setPendingBgFile(null);

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
      setBottomImageEnabled(rolledBack.bottomImageEnabled !== false);
      setBottomImageScale(rolledBack.bottomImageScale || 100);
      setBgImagePreview(rolledBack.bgImageUrl || '');
      setBgImageEnabled(rolledBack.bgImageEnabled || false);
      setBgImageScale(rolledBack.bgImageScale || 100);
      setPendingLogoFile(null);
      setPendingBottomFile(null);
      setPendingBgFile(null);

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
    pendingBgFile !== null ||
    logoPreview !== (currentBranding.logoUrl || '') ||
    bottomImagePreview !== (currentBranding.bottomImageUrl || '/images/awkum-admin-building.jpg') ||
    bottomImageEnabled !== (currentBranding.bottomImageEnabled !== false) ||
    bottomImageScale !== (currentBranding.bottomImageScale || 100) ||
    bgImagePreview !== (currentBranding.bgImageUrl || '') ||
    bgImageEnabled !== (currentBranding.bgImageEnabled || false) ||
    bgImageScale !== (currentBranding.bgImageScale || 100);

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
              Recommended: PNG transparent, JPG, WebP. Max 2MB. Square or arched crest format.
            </p>
          </div>
        </div>
      </div>

      {/* 3. Login Page Bottom Image Section with ON/OFF Toggle & Scale Adjustment */}
      <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-[#38271C]">Login Page Bottom Image</h2>
            <p className="text-xs text-[#806A56] mt-0.5">
              Architectural hero visual anchored to the bottom section of the public login screen
            </p>
          </div>

          {/* ON / OFF Toggle Switch for Bottom Image */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#806A56]">
              {bottomImageEnabled ? 'ON' : 'OFF'}
            </span>
            <button
              type="button"
              onClick={() => setBottomImageEnabled(!bottomImageEnabled)}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                bottomImageEnabled ? 'bg-[#668064]' : 'bg-[#D8C7B4]'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  bottomImageEnabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {bottomImageEnabled && (
          <div className="space-y-4 p-4 bg-white border border-[#E6D8C7] rounded-2xl animate-in fade-in">
            {/* Live Preview Container with Real Warm Cream Background & Gradient Transition */}
            <div className="relative w-full h-48 sm:h-56 bg-[#F8F0E5] rounded-xl overflow-hidden border border-[#E6D8C7] flex items-end justify-center">
              {/* Top gradient mask */}
              <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[#F8F0E5] via-[#F8F0E5]/80 to-transparent z-10" />

              <img
                src={bottomImagePreview}
                alt="Bottom Architecture Preview"
                style={{
                  transform: `scale(${bottomImageScale / 100})`,
                  transformOrigin: 'bottom center',
                }}
                className="w-full max-h-full object-cover object-bottom transition-transform duration-200"
              />

              <span className="absolute top-3 right-3 z-20 px-2 py-0.5 bg-[#493222]/80 backdrop-blur-xs text-[#FFF9F1] text-[10px] font-bold rounded-md">
                Live Preview ({bottomImageScale}%)
              </span>
            </div>

            {/* Adjustment Scale Slider */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FFF9F1] p-3 rounded-xl border border-[#E6D8C7]">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#38271C]">Adjustment Scale:</span>
                <span className="text-xs font-semibold text-[#668064]">{bottomImageScale}%</span>
              </div>
              <div className="flex items-center gap-3 flex-1 max-w-xs">
                <input
                  type="range"
                  min="50"
                  max="200"
                  step="5"
                  value={bottomImageScale}
                  onChange={(e) => setBottomImageScale(Number(e.target.value))}
                  className="w-full accent-[#493222] cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => setBottomImageScale(100)}
                  className="px-2.5 py-1 bg-white border border-[#D8C7B4] text-[10px] font-semibold text-[#806A56] hover:text-[#38271C] rounded-lg cursor-pointer"
                >
                  Reset
                </button>
              </div>
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
                Full HD quality saturated image. No blur or low opacity.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 4. Login Background Image (BG Image) Section with ON/OFF Toggle & Scale */}
      <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-[#38271C]">Login Background Image (BG Image)</h2>
            <p className="text-xs text-[#806A56] mt-0.5">
              Display a custom background image on the public login page in real-time for all users
            </p>
          </div>

          {/* ON / OFF Toggle Switch Button */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#806A56]">
              {bgImageEnabled ? 'ON' : 'OFF'}
            </span>
            <button
              type="button"
              onClick={() => setBgImageEnabled(!bgImageEnabled)}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                bgImageEnabled ? 'bg-[#668064]' : 'bg-[#D8C7B4]'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  bgImageEnabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {bgImageEnabled && (
          <div className="space-y-4 p-4 bg-white border border-[#E6D8C7] rounded-2xl animate-in fade-in">
            <div className="relative w-full h-40 sm:h-48 bg-[#F8F0E5] rounded-xl overflow-hidden border border-[#E6D8C7] flex items-center justify-center">
              {bgImagePreview ? (
                <img
                  src={bgImagePreview}
                  alt="Login Background Preview"
                  style={{
                    transform: `scale(${bgImageScale / 100})`,
                  }}
                  className="w-full h-full object-cover transition-transform duration-200"
                />
              ) : (
                <div className="text-xs text-[#806A56] flex flex-col items-center gap-1">
                  <ImageIcon className="w-6 h-6 opacity-50" />
                  <span>No background image uploaded yet. Upload a PNG, JPG, or WebP.</span>
                </div>
              )}
              <span className="absolute top-3 right-3 z-20 px-2 py-0.5 bg-[#493222]/80 backdrop-blur-xs text-[#FFF9F1] text-[10px] font-bold rounded-md">
                Live BG Preview ({bgImageScale}%)
              </span>
            </div>

            {/* BG Image Adjustment Scale Slider */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FFF9F1] p-3 rounded-xl border border-[#E6D8C7]">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#38271C]">Adjustment Scale:</span>
                <span className="text-xs font-semibold text-[#668064]">{bgImageScale}%</span>
              </div>
              <div className="flex items-center gap-3 flex-1 max-w-xs">
                <input
                  type="range"
                  min="50"
                  max="200"
                  step="5"
                  value={bgImageScale}
                  onChange={(e) => setBgImageScale(Number(e.target.value))}
                  className="w-full accent-[#493222] cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => setBgImageScale(100)}
                  className="px-2.5 py-1 bg-white border border-[#D8C7B4] text-[10px] font-semibold text-[#806A56] hover:text-[#38271C] rounded-lg cursor-pointer"
                >
                  Reset
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <label className="px-4 py-2 bg-[#493222] hover:bg-[#38271C] text-[#FFF9F1] text-xs font-bold rounded-xl cursor-pointer transition-colors inline-flex items-center gap-1.5 shadow-2xs">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload BG Image (PNG/JPG)</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleBgImageSelect}
                    className="hidden"
                  />
                </label>

                {bgImagePreview && (
                  <button
                    type="button"
                    onClick={handleResetBgImage}
                    className="px-3.5 py-2 bg-white border border-[#D8C7B4] hover:bg-[#F8F0E5] text-xs font-semibold text-[#C84B31] rounded-xl transition-colors cursor-pointer"
                  >
                    Remove BG Image
                  </button>
                )}
              </div>

              <span className="text-[11px] text-[#806A56]">
                Supports PNG, JPG, WebP. Full HD quality, crisp & saturated.
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
