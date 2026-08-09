'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { contentQueryKey, useSectionMeta, type ContentEnvelope } from './useSectionContent';
import { contentStatusQueryKey } from './useContentStatus';

export interface SectionWorkflow {
  saving: boolean;
  saved: boolean;
  error: string;
  publishing: boolean;
  publishedJustNow: boolean;
  publishError: string;
  discarding: boolean;
  hasUnpublishedChanges: boolean;
  publishedAt: string | null;
  neverPublished: boolean;
  publish: () => void;
  discard: () => void;
  getPreviewUrl: () => Promise<string | null>;
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

/**
 * The save → preview → publish workflow for one section.
 *
 * Saving only ever writes the draft, so nothing an editor does here reaches the
 * public site until publish() is called. discard() is the undo: it throws the
 * draft away and resets it to whatever is currently live.
 *
 * Returns `save` plus a SectionWorkflow bundle shaped for `<SaveBar {...rest} />`.
 */
export function useContentSave(section: string) {
  const queryClient = useQueryClient();
  const { data: meta } = useSectionMeta(section);
  const [saved, setSaved] = useState(false);
  const [publishedJustNow, setPublishedJustNow] = useState(false);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: contentQueryKey(section) });
    queryClient.invalidateQueries({ queryKey: contentStatusQueryKey() });
  }

  const saveMutation = useMutation({
    mutationFn: async (data: unknown) => {
      const res = await fetch(`/api/content/${section}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json() as Promise<{ hasUnpublishedChanges: boolean }>;
    },
    onSuccess: (result, variables) => {
      // Write the result straight into the cache so the "unpublished changes"
      // pill flips the instant the save lands, rather than after the refetch.
      queryClient.setQueryData<ContentEnvelope>(contentQueryKey(section), (prev) =>
        prev
          ? { ...prev, data: variables, hasUnpublishedChanges: result.hasUnpublishedChanges }
          : prev
      );
      invalidate();
      setSaved(true);
    },
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/content/${section}/publish`, { method: 'POST' });
      if (!res.ok) throw new Error(await res.text());
      return res.json() as Promise<{ publishedAt: string | null }>;
    },
    onSuccess: (result) => {
      queryClient.setQueryData<ContentEnvelope>(contentQueryKey(section), (prev) =>
        prev
          ? {
              ...prev,
              hasUnpublishedChanges: false,
              neverPublished: false,
              publishedAt: result.publishedAt ?? prev.publishedAt,
            }
          : prev
      );
      invalidate();
      setPublishedJustNow(true);
    },
  });

  const discardMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/content/${section}/discard`, { method: 'POST' });
      if (!res.ok) throw new Error(await res.text());
      return res.json() as Promise<{ data: unknown }>;
    },
    onSuccess: (result) => {
      queryClient.setQueryData<ContentEnvelope>(contentQueryKey(section), (prev) =>
        prev ? { ...prev, data: result.data, hasUnpublishedChanges: false } : prev
      );
      invalidate();
    },
  });

  useEffect(() => {
    if (!saved) return;
    const timer = setTimeout(() => setSaved(false), 3000);
    return () => clearTimeout(timer);
  }, [saved]);

  useEffect(() => {
    if (!publishedJustNow) return;
    const timer = setTimeout(() => setPublishedJustNow(false), 4000);
    return () => clearTimeout(timer);
  }, [publishedJustNow]);

  /**
   * Saves the draft and resolves true once it is persisted. Preview awaits this so
   * an editor always previews what is on screen, not the last thing they saved.
   */
  async function save(data: unknown): Promise<boolean> {
    setSaved(false);
    try {
      await saveMutation.mutateAsync(data);
      return true;
    } catch {
      return false;
    }
  }

  async function getPreviewUrl(): Promise<string | null> {
    const res = await fetch(`/api/content/${section}/preview-link`);
    if (!res.ok) return null;
    const json = (await res.json()) as { url: string | null };
    return json.url;
  }

  const workflow: SectionWorkflow = {
    saving: saveMutation.isPending,
    saved,
    error: saveMutation.isError ? errorMessage(saveMutation.error, 'Save failed') : '',
    publishing: publishMutation.isPending,
    publishedJustNow,
    publishError: publishMutation.isError
      ? errorMessage(publishMutation.error, 'Publish failed')
      : discardMutation.isError
        ? errorMessage(discardMutation.error, 'Discard failed')
        : '',
    discarding: discardMutation.isPending,
    hasUnpublishedChanges: meta?.hasUnpublishedChanges ?? false,
    publishedAt: meta?.publishedAt ?? null,
    neverPublished: meta?.neverPublished ?? false,
    publish: () => publishMutation.mutate(),
    discard: () => discardMutation.mutate(),
    getPreviewUrl,
  };

  return { save, ...workflow };
}
