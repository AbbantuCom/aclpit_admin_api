import { notFound, redirect } from 'next/navigation';
import AdminHeader from '@/components/admin/AdminHeader';
import PreviewFrame from '@/components/admin/PreviewFrame';
import { requireRole } from '@/lib/session';
import { isContentSection, SECTION_LABELS, type ContentSectionName } from '@/lib/content';
import { buildClientPreviewUrl } from '@/lib/preview';
import { CONTENT_ROLES } from '@/types';

/** Editor each section is edited in, for the "Back to …" link. */
const SECTION_EDITOR_PATHS: Record<ContentSectionName, string> = {
  hero: '/admin/hero',
  about: '/admin/about',
  services: '/admin/services',
  practiceAreas: '/admin/practice-areas',
  publications: '/admin/publications',
  dialogues: '/admin/dialogues',
  contact: '/admin/contact',
  // No footer editor is mounted yet — send editors back to the dashboard.
  footer: '/admin',
};

// The token embedded below is minted per request and lives 15 minutes, so this
// page must never be cached or prerendered.
export const dynamic = 'force-dynamic';

/**
 * Preview, rendered inside the admin panel.
 *
 * The signed token is minted here, server-side, which is why this page checks the
 * session itself: the admin layout's guard runs in the browser, so relying on it
 * alone would hand a valid draft token to anyone who requested this HTML.
 */
export default async function PreviewPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!isContentSection(section)) notFound();

  const auth = await requireRole(CONTENT_ROLES);
  if ('failure' in auth) redirect('/auth');

  const src = buildClientPreviewUrl(section);
  const label = SECTION_LABELS[section];

  return (
    <div className="flex flex-col h-screen">
      <AdminHeader title={`Preview — ${label}`} />
      {src ? (
        <PreviewFrame src={src} editorHref={SECTION_EDITOR_PATHS[section]} sectionLabel={label} />
      ) : (
        <div className="flex-1 flex items-center justify-center p-8">
          <p className="text-sm text-gray-500 max-w-md text-center">
            Preview is not configured on this deployment. Set <code>CLIENT_URL</code> and{' '}
            <code>PREVIEW_SECRET</code> to point it at the public site.
          </p>
        </div>
      )}
    </div>
  );
}
