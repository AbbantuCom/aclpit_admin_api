'use client';

import { useQuery } from '@tanstack/react-query';

export function contentQueryKey(section: string) {
  return ['content', section] as const;
}

/** What GET /api/content/:section?state=draft returns, narrowed to what the UI uses. */
export interface ContentEnvelope {
  data: unknown;
  hasUnpublishedChanges: boolean;
  publishedAt: string | null;
  neverPublished: boolean;
}

export interface SectionMeta {
  hasUnpublishedChanges: boolean;
  publishedAt: string | null;
  neverPublished: boolean;
}

/**
 * Shared request for a section. The admin panel always edits the *draft* copy —
 * the published copy is what the public site reads and only changes on publish.
 *
 * Both hooks below use these same options so a section is fetched once and its
 * content and publish state stay in sync in the cache.
 */
function contentQueryOptions(section: string) {
  return {
    queryKey: contentQueryKey(section),
    queryFn: async (): Promise<ContentEnvelope> => {
      const res = await fetch(`/api/content/${section}?state=draft`);
      if (!res.ok) throw new Error(`Failed to load "${section}" content`);
      const json = await res.json();
      return {
        data: json.data ?? null,
        hasUnpublishedChanges: Boolean(json.hasUnpublishedChanges),
        publishedAt: json.publishedAt ?? null,
        neverPublished: Boolean(json.neverPublished),
      };
    },
  };
}

/**
 * The section's draft content, falling back to the seed defaults when nothing has
 * been saved yet. The fallback is applied in `select` rather than in the fetch so
 * every caller shares one cache entry regardless of which fallback it passes.
 */
export function useSectionContent<T>(section: string, fallback: T) {
  return useQuery({
    ...contentQueryOptions(section),
    select: (envelope: ContentEnvelope): T => (envelope.data as T | null) ?? fallback,
  });
}

/** Publish state for the same section, served from the same cached request. */
export function useSectionMeta(section: string) {
  return useQuery({
    ...contentQueryOptions(section),
    select: (envelope: ContentEnvelope): SectionMeta => ({
      hasUnpublishedChanges: envelope.hasUnpublishedChanges,
      publishedAt: envelope.publishedAt,
      neverPublished: envelope.neverPublished,
    }),
  });
}
