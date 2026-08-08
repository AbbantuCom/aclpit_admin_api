'use client';

import { useQuery } from '@tanstack/react-query';

export function contentQueryKey(section: string) {
  return ['content', section] as const;
}

export function useSectionContent<T>(section: string, fallback: T) {
  return useQuery({
    queryKey: contentQueryKey(section),
    queryFn: async (): Promise<T> => {
      const res = await fetch(`/api/content/${section}`);
      if (!res.ok) throw new Error(`Failed to load "${section}" content`);
      const json = await res.json();
      return (json.data as T | null) ?? fallback;
    },
  });
}
