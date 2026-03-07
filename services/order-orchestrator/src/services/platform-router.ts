import { IGroceryPlatformAdapter } from '../adapters/platform.interface';
import { SwiggyInstamartAdapter } from '../adapters/swiggy';
import { BlinkitAdapter } from '../adapters/blinkit';

type PlatformName = 'swiggy_instamart' | 'blinkit' | 'zepto';

/**
 * PlatformRouter — selects and manages grocery platform adapters.
 *
 * Strategy:
 * 1. Uses user's preferred platform first
 * 2. Falls back to next available platform if item unavailable
 * 3. For MVP: always returns Swiggy Instamart mock adapter
 */
export class PlatformRouter {
  private adapters: Map<PlatformName, IGroceryPlatformAdapter>;

  /** Platform priority order for fallback */
  private static readonly FALLBACK_ORDER: PlatformName[] = [
    'swiggy_instamart',
    'blinkit',
    'zepto',
  ];

  constructor() {
    this.adapters = new Map();
    this.adapters.set('swiggy_instamart', new SwiggyInstamartAdapter());
    this.adapters.set('blinkit', new BlinkitAdapter());
    // Zepto adapter not implemented yet — will be added post-MVP
  }

  /**
   * Get the adapter for a specific platform.
   * Throws if platform is not supported.
   */
  getAdapter(platform: PlatformName): IGroceryPlatformAdapter {
    const adapter = this.adapters.get(platform);
    if (!adapter) {
      throw new Error(`Platform '${platform}' is not supported yet`);
    }
    return adapter;
  }

  /**
   * Get the primary adapter based on user's preferred platform.
   * Maps user preference ('swiggy' | 'blinkit' | 'zepto') to full platform name.
   */
  getPreferredAdapter(userPreference?: string): IGroceryPlatformAdapter {
    const platformMap: Record<string, PlatformName> = {
      swiggy: 'swiggy_instamart',
      swiggy_instamart: 'swiggy_instamart',
      blinkit: 'blinkit',
      zepto: 'zepto',
    };

    const platform = platformMap[userPreference ?? 'swiggy'] ?? 'swiggy_instamart';

    try {
      return this.getAdapter(platform);
    } catch {
      // Fall back to Swiggy if preferred platform unavailable
      console.warn(
        `[PlatformRouter] Preferred platform '${platform}' unavailable, falling back to swiggy_instamart`
      );
      return this.getAdapter('swiggy_instamart');
    }
  }

  /**
   * Get ordered list of adapters for fallback searching.
   * Preferred platform is first, then others in standard order.
   */
  getAdaptersWithFallback(preferredPlatform?: PlatformName): IGroceryPlatformAdapter[] {
    const ordered: IGroceryPlatformAdapter[] = [];

    // Add preferred first
    if (preferredPlatform && this.adapters.has(preferredPlatform)) {
      ordered.push(this.adapters.get(preferredPlatform)!);
    }

    // Add remaining in fallback order
    for (const platform of PlatformRouter.FALLBACK_ORDER) {
      if (platform !== preferredPlatform && this.adapters.has(platform)) {
        ordered.push(this.adapters.get(platform)!);
      }
    }

    return ordered;
  }

  /**
   * List all available platform names.
   */
  getAvailablePlatforms(): PlatformName[] {
    return Array.from(this.adapters.keys());
  }
}

/** Singleton instance */
let routerInstance: PlatformRouter | null = null;

export function getPlatformRouter(): PlatformRouter {
  if (!routerInstance) {
    routerInstance = new PlatformRouter();
  }
  return routerInstance;
}
