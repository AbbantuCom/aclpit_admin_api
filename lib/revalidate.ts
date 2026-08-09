/**
 * Tells the public client site to drop its cache for a section. Best-effort:
 * the publish has already succeeded and persisted, so a client that's unreachable
 * (down, misconfigured CLIENT_URL, etc.) should never fail the publish. The site
 * picks the change up on its next hourly revalidation regardless.
 */
export async function notifyClientRevalidate(section: string): Promise<void> {
  const clientUrl = process.env.CLIENT_URL;
  if (!clientUrl) return;

  try {
    const res = await fetch(`${clientUrl.replace(/\/$/, '')}/api/revalidate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: process.env.REVALIDATE_SECRET, tag: section }),
    });
    if (!res.ok) {
      console.warn(`Revalidate request for "${section}" failed with status ${res.status}`);
    }
  } catch (err) {
    console.warn(`Revalidate request for "${section}" failed:`, err);
  }
}
