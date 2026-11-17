import path from 'node:path';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import sharp from 'sharp';
import { getObjectBuffer, keyForPublicUrl } from '@/lib/r2';

/** A little above the 20MB upload limit, so any PDF uploaded here also fits. */
const MAX_PDF_BYTES = 25 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 20_000;
const MAX_REDIRECTS = 5;
/** Rendered width of the cover. The card shows it far smaller; this keeps it sharp on retina. */
const COVER_WIDTH = 1200;

export class PdfCoverError extends Error {}

/**
 * Turns common "share" links into links that return the file itself. A Google
 * Drive or Dropbox share link opens a viewer page (HTML), not the PDF.
 */
export function toDirectPdfUrl(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return raw;
  }

  if (url.hostname === 'drive.google.com') {
    const id = url.pathname.match(/\/file\/d\/([^/]+)/)?.[1] ?? url.searchParams.get('id');
    if (id) return `https://drive.google.com/uc?export=download&id=${encodeURIComponent(id)}`;
  }
  if (url.hostname.endsWith('dropbox.com')) {
    url.searchParams.delete('dl');
    url.searchParams.set('raw', '1');
    return url.toString();
  }
  return url.toString();
}

function isPrivateAddress(ip: string): boolean {
  if (isIP(ip) === 6) {
    const v = ip.toLowerCase();
    if (v.startsWith('::ffff:')) return isPrivateAddress(v.slice(7));
    return v === '::1' || v === '::' || v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe80');
  }
  const [a, b] = ip.split('.').map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    a >= 224
  );
}

/**
 * Refuses anything but a public http(s) host. The server fetches a URL an editor
 * typed, so without this a link could make it read internal services
 * (cloud metadata endpoints, the database, localhost admin ports).
 */
async function assertPublicHttpUrl(url: URL): Promise<void> {
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new PdfCoverError('The link must start with http:// or https://.');
  }
  const host = url.hostname.replace(/^\[|\]$/g, '');
  const addresses = isIP(host) ? [host] : (await lookup(host, { all: true }).catch(() => [])).map((a) => a.address);
  if (addresses.length === 0) throw new PdfCoverError(`Could not find the website "${url.hostname}".`);
  if (addresses.some(isPrivateAddress)) throw new PdfCoverError('That link points to a private network address.');
}

async function readCapped(res: Response): Promise<Buffer> {
  const declared = Number(res.headers.get('content-length') || 0);
  if (declared > MAX_PDF_BYTES) throw new PdfCoverError('The PDF is larger than 25MB.');
  if (!res.body) return Buffer.alloc(0);

  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of res.body as unknown as AsyncIterable<Uint8Array>) {
    total += chunk.byteLength;
    if (total > MAX_PDF_BYTES) throw new PdfCoverError('The PDF is larger than 25MB.');
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

async function fetchExternalPdf(rawUrl: string): Promise<Buffer> {
  let url = new URL(toDirectPdfUrl(rawUrl));

  // Redirects are followed by hand so every hop is checked, not just the first.
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublicHttpUrl(url);
    const res = await fetch(url, {
      redirect: 'manual',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { Accept: 'application/pdf,*/*;q=0.8', 'User-Agent': 'ACLPIT-CMS cover generator' },
    }).catch((err) => {
      console.warn(`PDF cover: fetching ${url} failed:`, err?.cause ?? err);
      throw new PdfCoverError(
        err?.name === 'TimeoutError' ? 'The link took too long to respond.' : 'Could not download the PDF from that link.'
      );
    });

    const location = res.headers.get('location');
    if (res.status >= 300 && res.status < 400 && location) {
      url = new URL(location, url);
      continue;
    }
    if (!res.ok) throw new PdfCoverError(`The link answered with an error (${res.status}).`);
    return readCapped(res);
  }
  throw new PdfCoverError('The link redirects too many times.');
}

async function loadPdf(pdfUrl: string): Promise<Buffer> {
  const key = keyForPublicUrl(pdfUrl);
  return key ? getObjectBuffer(key) : fetchExternalPdf(pdfUrl);
}

function assertLooksLikePdf(buf: Buffer): void {
  // The header may be preceded by a little junk; PDF readers allow 1KB of it.
  if (buf.subarray(0, 1024).indexOf('%PDF-') === -1) {
    throw new PdfCoverError(
      'That link does not lead to a PDF file. If it is a Google Drive link, make sure sharing is set to "Anyone with the link".'
    );
  }
}

const pdfjsDir = () => path.join(process.cwd(), 'node_modules', 'pdfjs-dist');

/** Renders page 1 to a PNG. pdfjs and its canvas are server-external (see next.config.ts). */
async function renderFirstPage(data: Buffer, width: number): Promise<Buffer> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const dir = pdfjsDir();
  const task = pdfjs.getDocument({
    data: new Uint8Array(data),
    standardFontDataUrl: path.join(dir, 'standard_fonts') + path.sep,
    cMapUrl: path.join(dir, 'cmaps') + path.sep,
    cMapPacked: true,
    wasmUrl: path.join(dir, 'wasm') + path.sep,
  });

  try {
    const doc = await task.promise.catch(() => {
      throw new PdfCoverError('The PDF could not be opened — it may be damaged or password-protected.');
    });
    const page = await doc.getPage(1);
    const scale = width / page.getViewport({ scale: 1 }).width;
    const viewport = page.getViewport({ scale });
    const { createCanvas } = await import('@napi-rs/canvas');
    const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    await page.render({
      canvas: canvas as unknown as HTMLCanvasElement,
      canvasContext: canvas.getContext('2d') as unknown as CanvasRenderingContext2D,
      viewport,
    }).promise;
    return canvas.toBuffer('image/png');
  } finally {
    await task.destroy();
  }
}

/**
 * Downloads a PDF (from this site's storage or any public link) and returns an
 * image of its first page, ready to store as a cover.
 */
export async function createPdfCover(pdfUrl: string): Promise<{ buffer: Buffer; contentType: string; extension: string }> {
  const pdf = await loadPdf(pdfUrl);
  assertLooksLikePdf(pdf);
  const png = await renderFirstPage(pdf, COVER_WIDTH);

  // Pages with no painted background render transparent — give them paper.
  const buffer = await sharp(png).flatten({ background: '#ffffff' }).webp({ quality: 82 }).toBuffer();
  return { buffer, contentType: 'image/webp', extension: 'webp' };
}

/** Width of a Media Library tile preview — tiles are ~200px, so this covers 2x screens. */
const THUMBNAIL_WIDTH = 480;

/**
 * A small preview of page 1 of a PDF already in this site's storage, for the
 * Media Library grid. Not stored anywhere — the route serving it lets the
 * browser cache it instead, so the bucket isn't cluttered with thumbnails that
 * would then need deleting alongside their PDFs.
 */
export async function createPdfThumbnail(key: string): Promise<Buffer> {
  const pdf = await getObjectBuffer(key);
  assertLooksLikePdf(pdf);
  const png = await renderFirstPage(pdf, THUMBNAIL_WIDTH);
  return sharp(png).flatten({ background: '#ffffff' }).webp({ quality: 75 }).toBuffer();
}
