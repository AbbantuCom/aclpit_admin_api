interface UploadOptions {
  file: File;
  folder: string;
  type: 'image' | 'video';
  token: string | undefined;
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
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error('Upload to storage failed')));
    xhr.onerror = () => reject(new Error('Upload to storage failed'));
    xhr.send(file);
  });
}

export async function uploadToR2({ file, folder, type, token, onProgress }: UploadOptions): Promise<string> {
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const presignRes = await fetch('/api/upload/presign', {
    method: 'POST',
    headers,
    body: JSON.stringify({ filename: file.name, contentType: file.type, folder }),
  });
  if (!presignRes.ok) throw new Error((await presignRes.json()).error || 'Failed to start upload');
  const { uploadUrl, key } = await presignRes.json();

  await putWithProgress(uploadUrl, file, file.type, onProgress);
  onProgress?.(90);

  const processRes = await fetch('/api/upload/process', {
    method: 'POST',
    headers,
    body: JSON.stringify({ key, type, folder }),
  });
  if (!processRes.ok) throw new Error((await processRes.json()).error || 'Failed to process upload');
  const { url } = await processRes.json();

  onProgress?.(100);
  return url;
}
