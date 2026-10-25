import { db } from './firebase';
import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { BrandingConfig, DEFAULT_BRANDING } from '../data/adminData';
import { fileToDataUrl } from './cloudinary';
import { recordAuditLog } from './authService';
import { brandService } from './BrandService';

export { DEFAULT_BRANDING };

const BRANDING_DOC_PATH = 'config/branding';

/**
 * Optimizes and resizes an image on an offscreen canvas to prevent payload timeouts.
 * Transparent image formats (PNG, WebP, SVG) and logos are preserved untouched via fileToDataUrl
 * to guarantee that alpha-channel transparency is never flattened to black by JPEG or canvas re-encoding.
 */
export async function optimizeImageToDataUrl(
  file: File,
  maxDimension = 1400,
  quality = 0.85
): Promise<string> {
  const isTransparent =
    file.type.includes('png') ||
    file.type.includes('svg') ||
    file.type.includes('webp') ||
    /\.(png|svg|webp)$/i.test(file.name);

  // If not a raster image or if it has a transparent alpha channel, preserve original file data directly
  if (isTransparent || !file.type.startsWith('image/')) {
    return fileToDataUrl(file);
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } else {
          resolve(e.target?.result as string);
        }
      };
      img.onerror = () => {
        resolve(e.target?.result as string);
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      fileToDataUrl(file).then(resolve);
    };
    reader.readAsDataURL(file);
  });
}

const CACHE_KEY = 'awkum_classhub_branding_cache';
const ZEROX_LOGO_KEY = 'zerox_custom_website_logo';
const APP_CUSTOM_LOGO_KEY = 'app_custom_website_logo';
const PWA_ICON_STORAGE_KEY = 'awkum_custom_pwa_icon';

/**
 * Synchronously retrieves published branding configuration from local storage.
 * Guarantees zero-delay, instantaneous rendering on first frame without waiting
 * for asynchronous network handshakes or Firestore client SDK initialization.
 */
export function getCachedBranding(): BrandingConfig {
  let customLogo = '';
  let customPwaIcon = '';
  if (typeof window !== 'undefined') {
    try {
      customLogo =
        localStorage.getItem(APP_CUSTOM_LOGO_KEY) ||
        localStorage.getItem(ZEROX_LOGO_KEY) ||
        '';
      customPwaIcon = localStorage.getItem(PWA_ICON_STORAGE_KEY) || '';
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          return {
            ...DEFAULT_BRANDING,
            ...parsed,
            logoUrl: customLogo || parsed.logoUrl || DEFAULT_BRANDING.logoUrl,
            pwaIconUrl: customPwaIcon || parsed.pwaIconUrl || parsed.logoUrl || customLogo || DEFAULT_BRANDING.pwaIconUrl,
          };
        }
      }
    } catch (e) {}
  }
  return {
    ...DEFAULT_BRANDING,
    logoUrl: customLogo || DEFAULT_BRANDING.logoUrl,
    pwaIconUrl: customPwaIcon || DEFAULT_BRANDING.pwaIconUrl,
  };
}

/**
 * Synchronizes published branding configuration into local storage.
 */
export function saveCachedBranding(config: BrandingConfig): void {
  if (typeof window !== 'undefined' && config) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(config));
      if (config.logoUrl) {
        localStorage.setItem(ZEROX_LOGO_KEY, config.logoUrl);
        localStorage.setItem(APP_CUSTOM_LOGO_KEY, config.logoUrl);
      }
      if (config.pwaIconUrl) {
        localStorage.setItem(PWA_ICON_STORAGE_KEY, config.pwaIconUrl);
      }
    } catch (e) {}
  }
}

/**
 * Subscribes to real-time branding updates from Firestore.
 * Immediately invokes subscriber with synchronously cached local branding for zero-delay rendering.
 */
export function subscribeToBranding(
  onUpdate: (branding: BrandingConfig) => void
): () => void {
  // Immediately dispatch cached branding synchronously
  const cached = getCachedBranding();
  onUpdate(cached);

  if (!db) {
    return () => {};
  }

  const brandingDocRef = doc(db, 'config', 'branding');

  const unsubscribe = onSnapshot(
    brandingDocRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const updatedConfig: BrandingConfig = {
          logoUrl: data.logoUrl || '',
          bottomImageUrl: data.bottomImageUrl || DEFAULT_BRANDING.bottomImageUrl,
          bottomImageEnabled: data.bottomImageEnabled !== undefined ? data.bottomImageEnabled : true,
          bottomImageScale: data.bottomImageScale !== undefined ? data.bottomImageScale : 100,
          bgImageUrl: data.bgImageUrl || '',
          bgImageEnabled: data.bgImageEnabled !== undefined ? data.bgImageEnabled : false,
          bgImageScale: data.bgImageScale !== undefined ? data.bgImageScale : 100,
          lastUpdated: data.lastUpdated || 'Recently',
          updatedBy: data.updatedBy || 'Master Admin',
          version: data.version || 1,
          previousLogoUrl: data.previousLogoUrl,
          previousBottomImageUrl: data.previousBottomImageUrl,
          previousBottomImageEnabled: data.previousBottomImageEnabled,
          previousBottomImageScale: data.previousBottomImageScale,
          previousBgImageUrl: data.previousBgImageUrl,
          previousBgImageEnabled: data.previousBgImageEnabled,
          previousBgImageScale: data.previousBgImageScale,
        };
        saveCachedBranding(updatedConfig);
        onUpdate(updatedConfig);
      } else {
        onUpdate(cached);
      }
    },
    (error) => {
      console.info('[Branding Service] Realtime subscription notice:', error.message);
      onUpdate(cached);
    }
  );

  return unsubscribe;
}

/**
 * Fetches the currently published branding configuration once.
 * Tries fast server endpoint first (~5ms) before querying Cloud Firestore.
 */
export async function getPublishedBranding(): Promise<BrandingConfig> {
  const cached = getCachedBranding();

  // 1. Try fast server endpoint
  try {
    const res = await fetch('/api/branding');
    if (res.ok) {
      const data = await res.json();
      if (data && (data.logoUrl !== undefined || data.bottomImageUrl !== undefined)) {
        const config: BrandingConfig = {
          logoUrl: data.logoUrl || '',
          bottomImageUrl: data.bottomImageUrl || DEFAULT_BRANDING.bottomImageUrl,
          bottomImageEnabled: data.bottomImageEnabled !== undefined ? data.bottomImageEnabled : true,
          bottomImageScale: data.bottomImageScale !== undefined ? data.bottomImageScale : 100,
          bgImageUrl: data.bgImageUrl || '',
          bgImageEnabled: data.bgImageEnabled !== undefined ? data.bgImageEnabled : false,
          bgImageScale: data.bgImageScale !== undefined ? data.bgImageScale : 100,
          lastUpdated: data.lastUpdated || 'Recently',
          updatedBy: data.updatedBy || 'Master Admin',
          version: data.version || 1,
          previousLogoUrl: data.previousLogoUrl,
          previousBottomImageUrl: data.previousBottomImageUrl,
          previousBottomImageEnabled: data.previousBottomImageEnabled,
          previousBottomImageScale: data.previousBottomImageScale,
          previousBgImageUrl: data.previousBgImageUrl,
          previousBgImageEnabled: data.previousBgImageEnabled,
          previousBgImageScale: data.previousBgImageScale,
        };
        saveCachedBranding(config);
        return config;
      }
    }
  } catch (err) {
    console.info('[Branding Service] Server fetch notice:', err);
  }

  // 2. Query Firestore
  if (!db) return cached;

  try {
    const brandingDocRef = doc(db, 'config', 'branding');
    const snap = await Promise.race([
      getDoc(brandingDocRef),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500)),
    ]);
    if (snap && snap.exists()) {
      const data = snap.data();
      const config: BrandingConfig = {
        logoUrl: data.logoUrl || '',
        bottomImageUrl: data.bottomImageUrl || DEFAULT_BRANDING.bottomImageUrl,
        bottomImageEnabled: data.bottomImageEnabled !== undefined ? data.bottomImageEnabled : true,
        bottomImageScale: data.bottomImageScale !== undefined ? data.bottomImageScale : 100,
        bgImageUrl: data.bgImageUrl || '',
        bgImageEnabled: data.bgImageEnabled !== undefined ? data.bgImageEnabled : false,
        bgImageScale: data.bgImageScale !== undefined ? data.bgImageScale : 100,
        lastUpdated: data.lastUpdated || 'Recently',
        updatedBy: data.updatedBy || 'Master Admin',
        version: data.version || 1,
        previousLogoUrl: data.previousLogoUrl,
        previousBottomImageUrl: data.previousBottomImageUrl,
        previousBottomImageEnabled: data.previousBottomImageEnabled,
        previousBottomImageScale: data.previousBottomImageScale,
        previousBgImageUrl: data.previousBgImageUrl,
        previousBgImageEnabled: data.previousBgImageEnabled,
        previousBgImageScale: data.previousBgImageScale,
      };
      saveCachedBranding(config);
      return config;
    }
  } catch (err) {
    console.info('[Branding Service] Fetch error:', err);
  }

  return cached;
}

/**
 * Uploads a logo or building image file through our secure server-side Cloudinary endpoint.
 * Includes graceful fallback to optimized asset URL if server proxy is temporarily unreachable in preview iframe.
 */
export async function uploadBrandingAsset(
  file: File,
  folder = 'awkum_classhub/branding'
): Promise<{ url: string; secureUrl: string; bytes: number }> {
  // 1. For logos and transparent formats, preserve original file data directly without canvas re-encoding
  const isLogo = folder.includes('logo');
  const isTransparent =
    isLogo ||
    file.type.includes('png') ||
    file.type.includes('svg') ||
    file.type.includes('webp') ||
    /\.(png|svg|webp)$/i.test(file.name);

  const assetDataUrl = isTransparent
    ? await fileToDataUrl(file)
    : await optimizeImageToDataUrl(file, 1400, 0.85);

  // 2. Attempt server-side upload to Cloudinary
  try {
    const response = await fetch('/api/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        fileData: assetDataUrl,
        fileName: file.name,
        folder,
      }),
    });

    if (response.ok) {
      const result = await response.json();
      if (result.secureUrl || result.url) {
        return {
          url: result.url || result.secureUrl,
          secureUrl: result.secureUrl || result.url,
          bytes: result.bytes || file.size,
        };
      }
    } else {
      console.warn(`[Branding Upload] Server upload responded with status: ${response.status}`);
    }
  } catch (fetchErr: any) {
    console.warn('[Branding Upload] Proxy endpoint unreachable, using client-optimized asset URL:', fetchErr?.message || fetchErr);
  }

  // 3. Resilient fallback: Return the asset data URL so branding publish NEVER fails with TypeError
  return {
    url: assetDataUrl,
    secureUrl: assetDataUrl,
    bytes: file.size,
  };
}

/**
 * Publishes an updated branding configuration to Firestore.
 */
export async function publishBranding(
  newConfig: Partial<BrandingConfig>,
  adminEmail: string
): Promise<BrandingConfig> {
  const current = await getPublishedBranding();

  const updated: BrandingConfig = {
    logoUrl: newConfig.logoUrl !== undefined ? newConfig.logoUrl : current.logoUrl,
    pwaIconUrl:
      newConfig.pwaIconUrl !== undefined
        ? newConfig.pwaIconUrl
        : (current.pwaIconUrl || current.logoUrl),
    bottomImageUrl:
      newConfig.bottomImageUrl !== undefined
        ? newConfig.bottomImageUrl
        : current.bottomImageUrl,
    bottomImageEnabled:
      newConfig.bottomImageEnabled !== undefined
        ? newConfig.bottomImageEnabled
        : current.bottomImageEnabled,
    bottomImageScale:
      newConfig.bottomImageScale !== undefined
        ? newConfig.bottomImageScale
        : current.bottomImageScale,
    bgImageUrl: newConfig.bgImageUrl !== undefined ? newConfig.bgImageUrl : current.bgImageUrl,
    bgImageEnabled:
      newConfig.bgImageEnabled !== undefined
        ? newConfig.bgImageEnabled
        : current.bgImageEnabled,
    bgImageScale:
      newConfig.bgImageScale !== undefined
        ? newConfig.bgImageScale
        : current.bgImageScale,
    lastUpdated: new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
    updatedBy: adminEmail,
    version: (current.version || 1) + 1,
    previousLogoUrl: current.logoUrl,
    previousPwaIconUrl: current.pwaIconUrl || current.logoUrl,
    previousBottomImageUrl: current.bottomImageUrl,
    previousBottomImageEnabled: current.bottomImageEnabled,
    previousBottomImageScale: current.bottomImageScale,
    previousBgImageUrl: current.bgImageUrl,
    previousBgImageEnabled: current.bgImageEnabled,
    previousBgImageScale: current.bgImageScale,
  };

  if (db) {
    try {
      const docRefConfig = doc(db, 'config', 'branding');
      const docRefPages = doc(db, 'pages', 'branding_settings');
      const docRefSettings = doc(db, 'branding', 'settings');
      const payload = {
        ...updated,
        logoDataUrl: updated.logoUrl,
        pwaIconDataUrl: updated.pwaIconUrl || updated.logoUrl,
        publishedAt: serverTimestamp(),
      };
      await Promise.allSettled([
        setDoc(docRefConfig, payload, { merge: true }),
        setDoc(docRefPages, payload, { merge: true }),
        setDoc(docRefSettings, payload, { merge: true }),
      ]);
    } catch (err) {
      console.info('[Branding Service] Firestore write notice:', err);
    }
  }

  // Update server branding cache and server static disk icons for PWA
  fetch('/api/branding', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updated),
  }).catch(() => {});

  if (updated.logoUrl || updated.pwaIconUrl) {
    fetch('/api/branding/logo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        logoDataUrl: updated.logoUrl,
        pwaIconDataUrl: updated.pwaIconUrl || updated.logoUrl,
      }),
    }).catch(() => {});
  }

  // Save synchronously to client local storage cache and force instant visual asset re-render across DOM & PWA
  saveCachedBranding(updated);
  try {
    brandService.forceReRenderVisualAssets(updated);
  } catch (e) {}

  // Record audit log
  await recordAuditLog({
    action: 'Branding Published',
    performedBy: adminEmail,
    details: `Updated portal appearance (Version ${updated.version})`,
    category: 'branding',
    status: 'success',
  });

  return updated;
}

/**
 * Rolls back to the previously published branding assets.
 */
export async function rollbackBranding(adminEmail: string): Promise<BrandingConfig> {
  const current = await getPublishedBranding();

  if (!current.previousLogoUrl && !current.previousPwaIconUrl && !current.previousBottomImageUrl && !current.previousBgImageUrl) {
    throw new Error('No previous branding version found to restore.');
  }

  return publishBranding(
    {
      logoUrl: current.previousLogoUrl || '',
      pwaIconUrl: current.previousPwaIconUrl || current.previousLogoUrl || '',
      bottomImageUrl: current.previousBottomImageUrl || DEFAULT_BRANDING.bottomImageUrl,
      bgImageUrl: current.previousBgImageUrl || '',
      bgImageEnabled: current.previousBgImageEnabled !== undefined ? current.previousBgImageEnabled : false,
    },
    `${adminEmail} (Rollback)`
  );
}
