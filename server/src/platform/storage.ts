// Uploaded files live on local disk (UPLOAD_DIR, default ./storage/uploads) with a JSON sidecar for metadata.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const dir = () => resolve(process.env.UPLOAD_DIR ?? 'storage/uploads');

export async function putFile(key: string, data: ArrayBuffer, meta: Record<string, string>) {
  await mkdir(dir(), { recursive: true });
  await writeFile(resolve(dir(), key), Buffer.from(data));
  await writeFile(resolve(dir(), `${key}.json`), JSON.stringify(meta));
}

export async function getFile(key: string) {
  try {
    const [data, meta] = await Promise.all([readFile(resolve(dir(), key)), readFile(resolve(dir(), `${key}.json`), 'utf8')]);
    return { data, meta: JSON.parse(meta) as Record<string, string> };
  } catch {
    return null;
  }
}
