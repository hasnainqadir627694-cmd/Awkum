import { db } from './firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { BrandingConfig, DEFAULT_BRANDING } from '../data/adminData';
import { getCachedBranding, saveCachedBranding } from './brandingService';

export type BrandingChangeListener = (config: BrandingConfig) => void;

/**
 * BrandService Singleton
 * Encapsulates real-time FirestoreListeners, DOM visual asset updates (favicon, apple-touch-icon, theme-color),
 * local storage caching, custom cross-window/component event dispatching, and server disk icon sync.
 */
export class BrandService {
  private static instance: BrandService;
  private listeners: Set<BrandingChangeListener> = new Set();
  private isInitialized = false;
  private currentConfig: BrandingConfig | null = null;
  private unsubscribes: Array<() => void> = [];

  private constructor() {}

  public static getInstance(): BrandService {
    if (!BrandService.instance) {
      BrandService.instance = new BrandService();
    }
    return BrandService.instance;
  }

  /**
   * Initializes real-time listeners across all branding documents in Firestore
   * and applies immediate DOM & local storage visual token updates.
   */
  public init(): void {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Apply immediate synchronous visual DOM updates from cached config
    const config = this.getCurrentConfig();
    this.forceReRenderVisualAssets(config);

    if (!db) return;

    // Attach real-time listeners on all branding document paths for complete UI parity
    const docPaths = [
      { collection: 'config', docName: 'branding' },
      { collection: 'pages', docName: 'branding_settings' },
      { collection: 'branding', docName: 'settings' },
    ];

    docPaths.forEach(({ collection, docName }) => {
      try {
        const docRef = doc(db, collection, docName);
        const unsub = onSnapshot(
          docRef,
          (snapshot) => {
            if (snapshot.exists()) {
              const data = snapshot.data();
              const updatedConfig: BrandingConfig = {
                logoUrl: data.logoUrl || data.logoDataUrl || '',
                bottomImageUrl: data.bottomImageUrl || DEFAULT_BRANDING.bottomImageUrl,
                bottomImageEnabled:
                  data.bottomImageEnabled !== undefined ? data.bottomImageEnabled : true,
                bottomImageScale:
                  data.bottomImageScale !== undefined ? data.bottomImageScale : 100,
                bgImageUrl: data.bgImageUrl || '',
                bgImageEnabled:
                  data.bgImageEnabled !== undefined ? data.bgImageEnabled : false,
                bgImageScale:
                  data.bgImageScale !== undefined ? data.bgImageScale : 100,
                lastUpdated: data.lastUpdated || 'Recently',
                updatedBy: data.updatedBy || 'Master Admin',
                version: data.version || 1,
              };
              this.forceReRenderVisualAssets(updatedConfig);
            }
          },
          (error) => {
            console.info(`[BrandService] Snapshot notice for ${collection}/${docName}:`, error.message);
          }
        );
        this.unsubscribes.push(unsub);
      } catch (err) {
        console.info(`[BrandService] Setup notice for ${collection}/${docName}:`, err);
      }
    });

    // Listen for custom global window events
    if (typeof window !== 'undefined') {
      window.addEventListener('awkum:branding-updated', ((e: CustomEvent<BrandingConfig>) => {
        if (e.detail) {
          this.notifyListeners(e.detail);
        }
      }) as EventListener);
    }
  }

  public getCurrentConfig(): BrandingConfig {
    if (!this.currentConfig) {
      this.currentConfig = getCachedBranding();
    }
    return this.currentConfig;
  }

  /**
   * Subscribes a React component or service to branding updates.
   * Immediately fires subscriber with current cached branding configuration.
   */
  public subscribe(listener: BrandingChangeListener): () => void {
    this.listeners.add(listener);
    // Fire subscriber with initial cached state
    try {
      listener(this.getCurrentConfig());
    } catch (e) {
      console.error('[BrandService] Initial subscriber notification error:', e);
    }

    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Forces re-rendering of all visual assets across DOM, PWA meta tags,
   * local cache, global custom event dispatch, and server-side icon files.
   */
  public forceReRenderVisualAssets(config: BrandingConfig): void {
    this.currentConfig = config;

    // 1. Persist to local storage cache for 0ms initial load time
    saveCachedBranding(config);

    if (typeof window === 'undefined') return;

    const logoUrl = config.logoUrl || '';
    const pwaIconUrl = config.pwaIconUrl || logoUrl;
    const timestamp = Date.now();
    const logoWithBuster = logoUrl
      ? logoUrl.startsWith('data:')
        ? logoUrl
        : `${logoUrl}${logoUrl.includes('?') ? '&' : '?'}v=${timestamp}`
      : '';
    const pwaWithBuster = pwaIconUrl
      ? pwaIconUrl.startsWith('data:')
        ? pwaIconUrl
        : `${pwaIconUrl}${pwaIconUrl.includes('?') ? '&' : '?'}v=${timestamp}`
      : logoWithBuster;

    // 2. Imperatively update Favicon, Apple Touch Icon, and Shortcut Icons
    if (logoWithBuster) {
      this.updateLinkTag("link[rel~='icon']", 'icon', logoWithBuster);
      this.updateLinkTag("link[rel='shortcut icon']", 'shortcut icon', logoWithBuster);
      this.updateMetaTag("meta[property='og:image']", 'og:image', logoWithBuster);
      this.updateMetaTag("meta[name='twitter:image']", 'twitter:image', logoWithBuster);
    }
    if (pwaWithBuster) {
      this.updateLinkTag("link[rel~='apple-touch-icon']", 'apple-touch-icon', pwaWithBuster);
    }

    // 3. Update PWA status bar & theme color meta tags
    this.updateMetaTag("meta[name='theme-color']", 'theme-color', '#493222');
    this.updateMetaTag("meta[name='apple-mobile-web-app-status-bar-style']", 'apple-mobile-web-app-status-bar-style', 'black-translucent');
    this.updateMetaTag("meta[name='msapplication-TileColor']", 'msapplication-TileColor', '#493222');

    // 4. Update splash screen image if present in DOM
    const splashImg = document.querySelector<HTMLImageElement>('#pwa-splash-logo');
    if (splashImg && pwaIconUrl) {
      splashImg.src = pwaIconUrl;
    }

    // 5. Dispatch global window custom events for cross-module synchronization
    try {
      window.dispatchEvent(
        new CustomEvent<BrandingConfig>('awkum:branding-updated', {
          detail: config,
        })
      );
      window.dispatchEvent(
        new CustomEvent('website_logo_updated', {
          detail: { logoUrl, pwaIconUrl },
        })
      );
    } catch (e) {}

    // 6. Notify server endpoint to rewrite static PWA icons on disk if base64 logo provided
    const payload: Record<string, string> = {};
    if (logoUrl) payload.logoDataUrl = logoUrl;
    if (pwaIconUrl) payload.pwaIconDataUrl = pwaIconUrl;
    if (Object.keys(payload).length > 0) {
      fetch('/api/branding/logo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => {});
    }

    // 7. Notify all active React listeners
    this.notifyListeners(config);
  }

  private updateLinkTag(selector: string, rel: string, href: string): void {
    if (typeof document === 'undefined') return;
    let link = document.querySelector<HTMLLinkElement>(selector);
    if (!link) {
      link = document.createElement('link');
      link.rel = rel;
      document.head.appendChild(link);
    }
    if (link.href !== href) {
      link.href = href;
    }
  }

  private updateMetaTag(selector: string, name: string, content: string): void {
    if (typeof document === 'undefined') return;
    let meta = document.querySelector<HTMLMetaElement>(selector);
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = name;
      document.head.appendChild(meta);
    }
    meta.content = content;
  }

  private notifyListeners(config: BrandingConfig): void {
    this.listeners.forEach((listener) => {
      try {
        listener(config);
      } catch (err) {
        console.error('[BrandService] Listener notification error:', err);
      }
    });
  }

  public destroy(): void {
    this.unsubscribes.forEach((unsub) => unsub());
    this.unsubscribes = [];
    this.listeners.clear();
    this.isInitialized = false;
  }
}

export const brandService = BrandService.getInstance();
