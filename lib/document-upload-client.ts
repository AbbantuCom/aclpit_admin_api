import { readJsonResponse } from '@/lib/api-response';

interface UploadOptions {
  file: File;
  folder: string;
  onProgress?: (percent: number) => void;
}

function putWithProgress(url: string, file: File, contentType: string, onProgress?: (percent: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', contentType);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`Upload to storage failed (${xhr.status} ${xhr.statusText}).`));
    xhr.onerror = () =>
      reject(new Error('Upload to storage failed: the browser could not reach storage (network or CORS).'));
    xhr.send(file);
  });
}

export async function uploadDocumentToR2({ file, folder, onProgress }: UploadOptions): Promise<string> {
  // Auth rides on the httpOnly session cookie, sent automatically same-origin.
  const headers = { 'Content-Type': 'application/json' };

  const presignRes = await fetch('/api/documents/presign', {
    method: 'POST',
    headers,
    body: JSON.stringify({ filename: file.name, contentType: file.type, folder }),
  });
  const { uploadUrl, url } = await readJsonResponse<{ uploadUrl: string; url: string }>(
    presignRes,
    'Preparing the upload'
  );

  await putWithProgress(uploadUrl, file, file.type, onProgress);
  onProgress?.(100);
  return url;
}
