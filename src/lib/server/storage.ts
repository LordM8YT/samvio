import { env } from '$env/dynamic/private';
import { mkdir, readFile, stat, unlink, writeFile } from 'node:fs/promises';
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

export async function uploadSize(storageKey: string) {
  return (await stat(safePath(storageKey))).size;
}

export async function removeUploadChecked(storageKey: string) {
  try {
    await unlink(safePath(storageKey));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
}

// Keep best-effort cleanup for callers where a stale file is safer than masking
// the primary operation. Critical cleanup paths can use removeUploadChecked.
export async function removeUpload(storageKey: string) {
  await removeUploadChecked(storageKey).catch(() => undefined);
}

export function uploadDirectory() {
  return storageRoot;
}
