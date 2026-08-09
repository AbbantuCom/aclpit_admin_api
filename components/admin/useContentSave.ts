'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { contentQueryKey } from './useSectionContent';

export function useContentSave(section: string) {
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState(false);

  const mutation = useMutation({
    mutationFn: async (data: unknown) => {
      const res = await fetch(`/api/content/${section}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contentQueryKey(section) });
      setSaved(true);
    },
  });

  useEffect(() => {
    if (!saved) return;
    const timer = setTimeout(() => setSaved(false), 3000);
    return () => clearTimeout(timer);
  }, [saved]);

  return {
    save: (data: unknown) => {
      setSaved(false);
      mutation.mutate(data);
    },
    saving: mutation.isPending,
    saved,
    error: mutation.isError ? (mutation.error instanceof Error ? mutation.error.message : 'Save failed') : '',
  };
}
