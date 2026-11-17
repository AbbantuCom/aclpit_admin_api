import type { SiteSettings } from '@/types';

/** The `content` doc the switches live in — read by the public site like any section. */
export const SETTINGS_SECTION = 'settings';

/**
 * What a site with no saved settings gets. Publications starts off: the page was
 * built before it was ready to announce, so it stays hidden until someone
 * deliberately switches it on. Keep in sync with the client's fallbackSettings.
 */
export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  publicationsEnabled: false,
};

/** Fills in any switch missing from a stored doc, so older docs read cleanly. */
export function withDefaults(stored: unknown): SiteSettings {
  const s = (stored && typeof stored === 'object' ? stored : {}) as Partial<SiteSettings>;
  return {
    publicationsEnabled:
      typeof s.publicationsEnabled === 'boolean'
        ? s.publicationsEnabled
        : DEFAULT_SITE_SETTINGS.publicationsEnabled,
  };
}
