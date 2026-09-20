import { readJsonResponse } from '@/lib/api-response';

interface UploadOptions {
  file: File;
  folder: string;
  type: 'image' | 'video';
  onProgress?: (percent: number) => void;
}

function putWithProgress(url: string, file: File, contentType: string, onProgress?: (percent: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', contentType);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 90));
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : // Storage answers with XML, not JSON — quote the status so a CORS or
          // expired-signature rejection is distinguishable from a network drop.
          reject(new Error(`Upload to storage failed (${xhr.status} ${xhr.statusText}).`));
    xhr.onerror = () =>
      reject(new Error('Upload to storage failed: the browser could not reach storage (network or CORS).'));
    xhr.send(file);
  });
}

export async function uploadToR2({ file, folder, type, onProgress }: UploadOptions): Promise<string> {
  // Auth rides on the httpOnly session cookie, sent automatically same-origin.
  const headers = { 'Content-Type': 'application/json' };

  const presignRes = await fetch('/api/upload/presign', {
    method: 'POST',
    headers,
    body: JSON.stringify({ filename: file.name, contentType: file.type, folder }),
  });
  const { uploadUrl, key } = await readJsonResponse<{ uploadUrl: string; key: string }>(
    presignRes,
    'Preparing the upload'
  );

  await putWithProgress(uploadUrl, file, file.type, onProgress);
  onProgress?.(90);

  const processRes = await fetch('/api/upload/process', {
    method: 'POST',
    headers,
    body: JSON.stringify({ key, type, folder }),
  });
  const { url } = await readJsonResponse<{ url: string }>(processRes, 'Processing the upload');

  onProgress?.(100);
  return url;
}
