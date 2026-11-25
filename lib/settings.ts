import { DEFAULT_SHARE_PLATFORMS, sharePlatformsOf, type BooleanSettingKey, type SiteSettings } from '@/types';

/** The `content` doc the switches live in — read by the public site like any section. */
export const SETTINGS_SECTION = 'settings';

/**
 * What a site with no saved settings gets. Both switchable sections start off:
 * they were built before they were ready to announce, so they stay hidden until
 * someone deliberately switches them on. Services images start on, as the
 * page was designed with them. Keep in sync with the client's fallbackSettings.
 */
export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  publicationsEnabled: false,
  dialoguesEnabled: false,
  // On by default: the Services page was designed around its images.
  servicesImagesEnabled: true,
  // Sharing starts off, like the other new features, until someone turns it on.
  publicationSharingEnabled: false,
  publicationSharePlatforms: [...DEFAULT_SHARE_PLATFORMS],
};

/** The on/off switch names PUT /api/settings accepts. */
export const SETTING_KEYS = (Object.keys(DEFAULT_SITE_SETTINGS) as (keyof SiteSettings)[]).filter(
  (k): k is BooleanSettingKey => k !== 'publicationSharePlatforms'
);

/** Fills in any switch missing from a stored doc, so older docs read cleanly. */
export function withDefaults(stored: unknown): SiteSettings {
  const s = (stored && typeof stored === 'object' ? stored : {}) as Partial<SiteSettings>;
  const out = { ...DEFAULT_SITE_SETTINGS };
  for (const key of SETTING_KEYS) {
    if (typeof s[key] === 'boolean') out[key] = s[key];
  }
  out.publicationSharePlatforms = sharePlatformsOf(s.publicationSharePlatforms);
  return out;
}
