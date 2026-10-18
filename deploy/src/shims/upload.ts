// Frontend replacement for `zitejs/upload` on Netlify (stores files in Netlify Blobs).
import { useState } from 'react';

export function useUpload() {
  const [isUploading, setUploading] = useState(false);
  async function upload(file: File): Promise<{ url: string }> {
    setUploading(true);
    try {
      const body = new FormData();
      body.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body, credentials: 'same-origin' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw Object.assign(new Error(json?.error?.userFacingMessage ?? 'upload failed'), json?.error ?? {});
      return { url: json.url };
    } finally {
      setUploading(false);
    }
  }
  return { upload, isUploading };
}
