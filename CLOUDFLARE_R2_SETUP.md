# Cloudflare R2 Storage — Setup & Troubleshooting

This project stores all admin-uploaded images and videos in **Cloudflare R2**
(migrated off Firebase Storage). Files are optimized server-side before
storage: images are resized/converted to WebP via `sharp`, videos are
transcoded/compressed via `ffmpeg`.

## How uploads work

Direct browser → our Next.js server → R2 would hit Vercel's ~4.5MB request
body limit on serverless functions, so uploads go through a 3-step flow that
never sends the raw file through our own server:

1. **Presign** — browser asks `/api/upload/presign` for a one-time signed PUT
   URL. ([app/api/upload/presign/route.ts](app/api/upload/presign/route.ts))
2. **Direct upload** — browser PUTs the raw file straight to R2 using that
   signed URL (with progress, via `XMLHttpRequest`).
   ([lib/upload-client.ts](lib/upload-client.ts))
3. **Process** — browser calls `/api/upload/process`, which downloads the raw
   object from R2, optimizes it (`sharp` for images, `ffmpeg` for videos),
   uploads the optimized result to its final key, deletes the raw upload, and
   returns the public URL.
   ([app/api/upload/process/route.ts](app/api/upload/process/route.ts))

Relevant code:
- [lib/r2.ts](lib/r2.ts) — S3-compatible client (R2) + presign/get/put/delete helpers
- [lib/image-optimize.ts](lib/image-optimize.ts) — resize to max 1920px, WebP, quality 80
- [lib/video-optimize.ts](lib/video-optimize.ts) — scale to max 1280px width, H.264 CRF 28, AAC audio
- [components/admin/ImageUpload.tsx](components/admin/ImageUpload.tsx) / [VideoUpload.tsx](components/admin/VideoUpload.tsx) — admin upload widgets

Firebase Auth (admin login) is untouched — only **Storage** was replaced.

## One-time Cloudflare setup

1. **Create the bucket** — Cloudflare dashboard → R2 → Create bucket (this
   project uses `site-images-videos`).
2. **Create an API token** — R2 → Manage API Tokens → Create API Token, with
   read/write access scoped to the bucket. This gives you:
   - Access Key ID
   - Secret Access Key
   - Account ID (also visible in the R2 overview page / dashboard URL)
3. **Enable public access** so uploaded files can actually be viewed in a
   browser — bucket → **Settings** → **Public Access** → under
   **R2.dev subdomain**, click **Allow Access**. Copy the resulting URL
   (looks like `https://pub-xxxxxxxxxxxxxxxx.r2.dev`).
   - For production, prefer connecting a **custom domain** instead — see
     [Connecting a custom domain](#connecting-a-custom-domain-production)
     below. Better caching, no `r2.dev` rate limits, and your own branding.
4. **Add a CORS policy** — bucket → **Settings** → **CORS Policy** → Add
   policy. The browser uploads directly to R2 in step 2 above, so R2 must
   allow cross-origin `PUT` from your app's origin(s):

   ```json
   [
     {
       "AllowedOrigins": [
         "http://localhost:3000",
         "https://your-production-domain.com"
       ],
       "AllowedMethods": ["PUT", "GET", "HEAD"],
       "AllowedHeaders": ["*"],
       "ExposeHeaders": ["ETag"],
       "MaxAgeSeconds": 3000
     }
   ]
   ```

   Add every origin you'll ever upload from (prod domain, preview
   deployments, localhost, etc.).

## Connecting a custom domain (production)

A custom domain (e.g. `media.yoursite.com`) is better than the `r2.dev`
subdomain for production: no shared-domain rate limits, your own branding,
and it can sit behind Cloudflare's CDN/cache. This needs two things: the
domain must be **on Cloudflare** (DNS managed by Cloudflare), and then it
needs to be **connected to the R2 bucket**.

### Step 1 — Get the domain onto Cloudflare (skip if it already is)

1. Cloudflare dashboard → **Add a Site** → enter your domain
   (e.g. `yoursite.com`).
2. Pick a plan (Free is fine for DNS + R2 custom domains).
3. Cloudflare scans existing DNS records and shows you a pair of
   **nameservers** (e.g. `xxx.ns.cloudflare.com`, `yyy.ns.cloudflare.com`).
4. Go to your domain **registrar** (GoDaddy, Namecheap, etc.) and replace the
   existing nameservers with the two Cloudflare gave you.
5. Wait for propagation — Cloudflare emails you once the domain is active
   (usually minutes to a few hours, can take up to 24-48h in rare cases).
   You can check status anytime in the dashboard's site overview.

> If the domain (or a subdomain you control via existing DNS, e.g. a Vercel
> custom domain) is already on Cloudflare, skip straight to Step 2.

### Step 2 — Connect the domain to the R2 bucket

1. R2 → your bucket → **Settings** → **Public Access** → **Custom Domains**
   → **Connect Domain**.
2. Enter the (sub)domain you want to use for media, e.g. `media.yoursite.com`.
   Don't reuse your main site's apex/root domain — pick a dedicated
   subdomain.
3. Cloudflare automatically creates the required DNS record (a proxied CNAME)
   in that zone, since the domain is already on Cloudflare from Step 1. No
   manual DNS edits needed.
4. Wait for the status to flip to **Active** (usually near-instant once DNS
   propagates).
5. Your public base URL is now `https://media.yoursite.com`.

### Step 3 — Point the app at it

1. Update `.env.local` (and your production environment variables):
   ```
   R2_PUBLIC_URL=https://media.yoursite.com
   ```
2. **Restart the dev server** (or redeploy in production) — `next.config.ts`
   reads `R2_PUBLIC_URL` at startup to allowlist the domain for `next/image`.
3. Any URLs already saved in MongoDB under the old `r2.dev` domain will keep
   working (R2.dev access isn't disabled by adding a custom domain) — but new
   uploads will use the custom domain going forward. Re-upload old assets if
   you want everything on one domain.

## Environment variables

Set in `.env.local` (see `.env.local.example`):

```
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=https://pub-xxxxxxxxxxxxxxxx.r2.dev   # or your custom domain
```

`R2_PUBLIC_URL` must be the **public-access** URL (r2.dev or custom domain) —
**not** the private S3 API endpoint (`https://<account-id>.r2.cloudflarestorage.com`).
The private endpoint requires signed requests and isn't readable directly by
browsers/`<img>` tags.

`next.config.ts` reads `R2_PUBLIC_URL` at server startup to allowlist that
domain for `next/image`. **Any change to `R2_PUBLIC_URL` requires a full dev
server restart** — Fast Refresh / HMR does not pick up `next.config.ts`
changes.

## Issues hit during setup, and the fix

### 1. CORS error on upload: `No 'Access-Control-Allow-Origin' header`

```
Access to XMLHttpRequest at 'https://...r2.cloudflarestorage.com/...' from
origin 'http://localhost:3000' has been blocked by CORS policy
```

**Cause:** R2 buckets have no CORS policy by default, and the browser PUTs
the file directly to R2 (not through our server), so R2 itself must allow it.

**Fix:** add the CORS policy above to the bucket (see step 4).

### 2. Presigned URL had extra checksum query params and signature issues

AWS SDK v3 adds "flexible checksum" query params
(`x-amz-checksum-crc32`, `x-amz-sdk-checksum-algorithm`) to requests by
default. R2 doesn't reliably support these on presigned browser PUTs.

**Fix:** in [lib/r2.ts](lib/r2.ts), the `S3Client` is constructed with:

```ts
requestChecksumCalculation: 'WHEN_REQUIRED',
responseChecksumValidation: 'WHEN_REQUIRED',
```

### 3. Image uploaded fine but preview was a broken image / never rendered

**Cause:** `R2_PUBLIC_URL` was set to the *private* S3 endpoint
(`https://<account-id>.r2.cloudflarestorage.com`) instead of a real public
URL. That endpoint requires signed requests, so a plain `<img src=...>` or
`next/image` fetch to it fails silently (broken image icon).

**Fix:** enable R2.dev public access (or a custom domain) on the bucket, and
set `R2_PUBLIC_URL` to that public URL instead — then **restart the dev
server** so `next.config.ts` re-reads the env var.

### 4. `next/image` runtime crash: "hostname is not configured"

```
Invalid src prop (https://...r2.cloudflarestorage.com/...) on `next/image`,
hostname "...r2.cloudflarestorage.com" is not configured under images in
your next.config.js
```

**Cause:** content saved in MongoDB *before* `R2_PUBLIC_URL` was fixed still
contained the old private-endpoint URL. Once `next.config.ts`'s
`images.remotePatterns` only allowlisted the new public domain (correctly —
the private endpoint was never a real public image host), `next/image`
refused to render the stale URL — and since this throws synchronously, it
crashed the entire admin page on mount, blocking the admin from even reaching
the "remove image" button to fix it.

**Fix, two parts:**
- **Made admin upload previews resilient:** [components/admin/ImageUpload.tsx](components/admin/ImageUpload.tsx)
  now renders the preview thumbnail with a plain `<img>` tag instead of
  `next/image`. Admin preview thumbnails don't need Next's image
  optimization, and a plain `<img>` just shows a broken-image icon for a bad
  URL instead of crashing the page — so the admin can always reach the ✕
  button to clear and re-upload.
- **Re-uploaded the affected fields** so MongoDB stores the new public URL
  instead of the stale private one.

If you ever see this error again: it almost always means a URL stored in the
database predates your current `R2_PUBLIC_URL` / `remotePatterns` config.
Clear and re-upload that field.

### 5. Console warning after clearing an image: "An empty string was passed to the src attribute"

**Cause:** several **public-facing** section components
(`Sustainability.tsx`, `About.tsx`, `Impact.tsx`, `Hero.tsx`, `Contact.tsx`)
rendered `<Image>`/`<img>`/`<source>` **unconditionally** with the
admin-configured URL. Clearing a field in the admin (saving `""`) made the
public page pass an empty string as `src`, which both React and the browser
warn about (and can trigger a needless refetch of the current page as a
relative URL).

**Fix:** every such field is now guarded — the image/video element only
renders when the URL is non-empty; otherwise a neutral placeholder
(`bg-linen`) is shown so layout doesn't shift. (Services, Equipment, and
Projects already had this guard via their per-card "has image" ternary.)

## Quick troubleshooting checklist

- **Upload fails with CORS error** → check the bucket's CORS policy includes
  your current origin.
- **Upload "succeeds" but image doesn't render** → check `R2_PUBLIC_URL` is
  the public r2.dev/custom-domain URL, not the `*.r2.cloudflarestorage.com`
  endpoint.
- **Changed `R2_PUBLIC_URL` and it's still not working** → restart the dev
  server (or redeploy) — `next.config.ts` only reads it at startup.
- **`next/image` "hostname not configured" crash** → a stale URL from before
  a `R2_PUBLIC_URL` change is still saved in MongoDB for that field. Clear and
  re-upload it from the admin panel.
- **Video upload times out / fails on a long video** → the `/api/upload/process`
  route has `maxDuration = 60` (see the file) for ffmpeg transcoding, clamped
  by your hosting plan's serverless function duration limit. Keep hero/background
  videos short, or raise `maxDuration` if your plan allows it.
