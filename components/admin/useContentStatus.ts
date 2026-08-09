'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function contentStatusQueryKey() {
  return ['content-status'] as const;
}

export interface SectionStatus {
  section: string;
  label: string;
  hasUnpublishedChanges: boolean;
  neverPublished: boolean;
  draftUpdatedAt: string | null;
  draftUpdatedBy: string | null;
  draftUpdatedByName: string | null;
  publishedAt: string | null;
}

export interface ContentStatus {
  sections: SectionStatus[];
  pendingCount: number;
}

/** Publish state for every section — drives the sidebar badge and review screen. */
export function useContentStatus() {
  return useQuery({
    queryKey: contentStatusQueryKey(),
    queryFn: async (): Promise<ContentStatus> => {
      const res = await fetch('/api/content/status');
      if (!res.ok) throw new Error('Failed to load publish status');
      return res.json();
    },
    // Drafts saved by other editors should surface in the sidebar without a reload,
    // matching how the unread-messages badge polls.
    refetchInterval: 60_000,
  });
}

/** Publishes every section with pending changes, then refreshes all content queries. */
export function usePublishAll() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/content/publish-all', { method: 'POST' });
      if (!res.ok) throw new Error(await res.text());
      return res.json() as Promise<{ published: string[]; publishedCount: number }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contentStatusQueryKey() });
      queryClient.invalidateQueries({ queryKey: ['content'] });
    },
  });
}
