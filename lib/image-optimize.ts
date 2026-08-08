import sharp from 'sharp';

const MAX_DIMENSION = 1920;
const WEBP_QUALITY = 80;

export async function optimizeImage(input: Buffer): Promise<{ buffer: Buffer; contentType: string; extension: string }> {
  const buffer = await sharp(input)
    .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();

  return { buffer, contentType: 'image/webp', extension: 'webp' };
}
