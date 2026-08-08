import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from '@ffmpeg-installer/ffmpeg';
import { mkdtemp, readFile, writeFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

ffmpeg.setFfmpegPath(ffmpegPath.path);

const MAX_WIDTH = 1280;

export async function optimizeVideo(input: Buffer): Promise<{ buffer: Buffer; contentType: string; extension: string }> {
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
