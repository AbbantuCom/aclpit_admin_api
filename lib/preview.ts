import { createHmac, timingSafeEqual } from 'node:crypto';
import type { ContentSectionName } from '@/lib/content';

/**
 * Preview links let an editor view unpublished draft content on the real public
 * site. Two things are protected by the shared PREVIEW_SECRET (which must match
 * the value set in aclpit_client, exactly like REVALIDATE_SECRET):
 *
 *   1. The link handed to the browser carries a short-lived signed token, so a
 *      leaked URL stops working and nobody can mint their own.
 *   2. The client's server-side draft fetch sends the raw secret back to this API
 *      in the x-preview-secret header, which is what unlocks GET ?state=draft.
 *
 * The raw secret therefore never travels through the browser — only the token does.
 */

const TOKEN_TTL_SECONDS = 15 * 60;

function getSecret(): string {
  const secret = process.env.PREVIEW_SECRET;
  if (!secret) throw new Error('PREVIEW_SECRET environment variable is not set');
  return secret;
}

function base64url(input: string): string {
  return Buffer.from(input, 'utf8').toString('base64url');
}

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

/**
 * Mints a token binding a path to an expiry. The path is signed rather than passed
 * as a free-standing query param so the client can redirect to it without opening
 * an redirect hole — a tampered path invalidates the signature.
 */
export function signPreviewToken(path: string): string {
  const payload = base64url(JSON.stringify({ path, exp: Date.now() + TOKEN_TTL_SECONDS * 1000 }));
  return `${payload}.${sign(payload, getSecret())}`;
}

/** Constant-time comparison of the server-to-server draft-read secret. */
export function isValidPreviewSecret(candidate: string | null): boolean {
  if (!candidate) return false;

  const expected = Buffer.from(getSecret(), 'utf8');
  const actual = Buffer.from(candidate, 'utf8');
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

/**
 * Where each section is visible on the public site. Sections that render as part
 * of the home page point at an anchor on `/`.
 */
export const SECTION_PREVIEW_PATHS: Record<ContentSectionName, string> = {
  hero: '/',
  about: '/about',
  services: '/services',
  practiceAreas: '/practice-areas',
  publications: '/publications',
  dialogues: '/dialogues',
  contact: '/#contact',
  footer: '/',
};

/**
 * Whether this deployment can produce preview links at all. Callers use it to hide
 * the Preview button rather than erroring on a deployment with no public site
 * wired up yet.
 */
export function isPreviewConfigured(): boolean {
  return Boolean(process.env.CLIENT_URL && process.env.PREVIEW_SECRET);
}

/**
 * The public site's own preview entry point, carrying a freshly signed token.
 *
 * This is the URL the admin's preview screen loads *inside its iframe* — editors
 * are not handed it directly, so the token's 15-minute life starts when the frame
 * is rendered. Returns null when previewing is not configured.
 */
export function buildClientPreviewUrl(section: ContentSectionName): string | null {
  const clientUrl = process.env.CLIENT_URL;
  if (!clientUrl || !isPreviewConfigured()) return null;

  const path = SECTION_PREVIEW_PATHS[section];
  const token = signPreviewToken(path);
  return `${clientUrl.replace(/\/$/, '')}/api/preview?token=${encodeURIComponent(token)}`;
}

/**
 * Where the editor is sent when they click Preview: a screen inside the admin
 * panel, on the admin's own domain, which frames the public site.
 *
 * Deliberately relative — the admin does not reliably know its own public origin
 * behind a proxy, and the browser resolves this against the page the editor is
 * already on.
 */
export function buildAdminPreviewPath(section: ContentSectionName): string | null {
  return isPreviewConfigured() ? `/admin/preview/${section}` : null;
}
