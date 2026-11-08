// File upload to the Fastify backend (stored on the server's disk, served from /api/file/:key).
import { useState } from 'react';
import { apiUrl } from './api';

export function useUpload() {
  const [isUploading, setUploading] = useState(false);
  async function upload(file: File): Promise<{ url: string }> {
    setUploading(true);
    try {
      const body = new FormData();
      body.append('file', file);
      const res = await fetch(apiUrl('/api/upload'), { method: 'POST', body, credentials: 'include' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw Object.assign(new Error(json?.error?.userFacingMessage ?? 'upload failed'), json?.error ?? {});
      return { url: json.url };
    } finally {
      setUploading(false);
    }
  }
  return { upload, isUploading };
}
