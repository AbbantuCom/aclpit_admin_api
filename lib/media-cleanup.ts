import type { Db } from 'mongodb';
import { deleteObject, keyForPublicUrl } from '@/lib/r2';
import { recordAudit } from '@/lib/audit';
import type { PublicAdminUser } from '@/types';

/**
 * Removing a publication removes its files — the PDF and its cover — from the
 * Media Library, but only once nothing on the site can still show them.
 *
 * "Nothing" means no draft and no published copy of any section mentions the
 * file's URL. Deleting a publication in the editor only changes the draft, so
 * while the live site still lists it the PDF stays; the publish that takes it
 * off the site is what finally frees the file. The same check protects a file
 * reused elsewhere (say, the same PDF linked from two publications).
 */

interface PublicationLike {
  id?: unknown;
  fileUrl?: unknown;
  coverImage?: unknown;
}

function filesById(items: unknown): Map<string, string[]> {
  const map = new Map<string, string[]>();
  if (!Array.isArray(items)) return map;
  for (const raw of items as PublicationLike[]) {
    if (!raw || typeof raw.id !== 'string') continue;
    const files = [raw.fileUrl, raw.coverImage].filter((u): u is string => typeof u === 'string' && u.trim() !== '');
    map.set(raw.id, files);
  }
  return map;
}

/** URLs of the files belonging to publications present in `before` but gone from `after`. */
export function filesOfRemovedPublications(before: unknown, after: unknown): string[] {
  const remaining = filesById(after);
  const urls: string[] = [];
  for (const [id, files] of filesById(before)) {
    if (!remaining.has(id)) urls.push(...files);
  }
  return [...new Set(urls)];
}

/**
 * Deletes each URL's file from storage if it is one of ours and no content still
 * references it. Returns the keys actually deleted. Best-effort: a storage error
 * is logged, never thrown — the content change that triggered this has already
 * been saved and must not be reported as failed over a leftover file.
 */
export async function deleteUnreferencedMedia(
  db: Db,
  urls: string[],
  actor: PublicAdminUser,
  reason: string
): Promise<string[]> {
  const candidates = [...new Set(urls)]
    .map((url) => ({ url, key: keyForPublicUrl(url) }))
    .filter((c): c is { url: string; key: string } => c.key !== null);
  if (candidates.length === 0) return [];

  // Same test the Media Library uses for its "In use" badge.
  const contentBlob = JSON.stringify(await db.collection('content').find({}).toArray());
  const deleted: string[] = [];

  for (const { url, key } of candidates) {
    if (contentBlob.includes(url)) continue;
    try {
      await deleteObject(key);
      deleted.push(key);
      await recordAudit({ actor, action: 'media.delete', target: key, details: { reason } });
    } catch (err) {
      console.warn(`Could not delete "${key}" during cleanup:`, err);
    }
  }
  return deleted;
}
