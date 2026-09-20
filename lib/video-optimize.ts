import type FfmpegCommand from 'fluent-ffmpeg';
import { mkdtemp, readFile, writeFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

/**
 * Loads ffmpeg on first use rather than at import.
 *
 * `@ffmpeg-installer/ffmpeg` resolves — and verifies — a platform binary inside
 * its module body, throwing outright when that binary is not on disk. A hosting
 * platform that does not bundle the binary into the deployed function therefore
 * makes merely *importing* this file fail, which takes down the whole upload
 * route before any handler runs: the request comes back as the platform's HTML
 * error page instead of JSON. Loading it lazily keeps that failure inside the
 * one code path that actually needs video, where it can be caught and reported.
 */
let ffmpegLoader: Promise<typeof FfmpegCommand> | null = null;

function loadFfmpeg(): Promise<typeof FfmpegCommand> {
  if (!ffmpegLoader) {
    ffmpegLoader = (async () => {
      const [{ default: ffmpeg }, { default: ffmpegPath }] = await Promise.all([
        import('fluent-ffmpeg'),
        import('@ffmpeg-installer/ffmpeg'),
      ]);
      ffmpeg.setFfmpegPath(ffmpegPath.path);
      return ffmpeg;
    })().catch((err) => {
      // Don't cache a rejected promise — a later request should retry.
      ffmpegLoader = null;
      throw new Error(
        `Video processing is unavailable on this deployment: ffmpeg could not be loaded (${
          err instanceof Error ? err.message : String(err)
        })`
      );
    });
  }
  return ffmpegLoader;
}

const MAX_WIDTH = 1280;

export async function optimizeVideo(input: Buffer): Promise<{ buffer: Buffer; contentType: string; extension: string }> {
  const ffmpeg = await loadFfmpeg();

  const dir = await mkdtemp(join(tmpdir(), 'upload-'));
  const inputPath = join(dir, 'input');
  const outputPath = join(dir, 'output.mp4');

  try {
    await writeFile(inputPath, input);

    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .videoFilters(`scale='min(${MAX_WIDTH},iw)':-2`)
        .videoCodec('libx264')
        .outputOptions(['-crf', '28', '-preset', 'veryfast', '-movflags', '+faststart'])
        .audioCodec('aac')
        .audioBitrate('128k')
        .output(outputPath)
        .on('end', () => resolve())
        .on('error', reject)
        .run();
    });

    const buffer = await readFile(outputPath);
    return { buffer, contentType: 'video/mp4', extension: 'mp4' };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
