import { env } from '$env/dynamic/private';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

const storageRoot = path.resolve(env.UPLOAD_DIR || (process.env.NODE_ENV === 'production' ? '/var/lib/samvio/uploads' : './uploads'));

function safePath(storageKey: string) {
  if (!/^[a-f0-9-]+\.(jpg|png|webp)$/.test(storageKey)) throw new Error('Invalid storage key');
  return path.join(storageRoot, storageKey);
}

export async function saveUpload(storageKey: string, bytes: Uint8Array) {
  await mkdir(storageRoot, { recursive: true });
  await writeFile(safePath(storageKey), bytes, { flag: 'wx' });
}

export async function readUpload(storageKey: string) {
  return readFile(safePath(storageKey));
}

export async function removeUpload(storageKey: string) {
  await unlink(safePath(storageKey)).catch(() => undefined);
}

export function uploadDirectory() {
  return storageRoot;
}
