import { eq } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { profiles } from '$lib/server/db/schema';
import { readUpload } from '$lib/server/storage';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals }) => {
  if (!locals.user) error(401, 'Logg inn');
  if (params.kind !== 'avatar' && params.kind !== 'cover') error(404, 'Fant ikke bildet');
  const [profile] = await db.select({ avatarPath: profiles.avatarPath, coverPath: profiles.coverPath })
    .from(profiles).where(eq(profiles.username, params.username.toLowerCase())).limit(1);
  const storageKey = params.kind === 'avatar' ? profile?.avatarPath : profile?.coverPath;
  if (!storageKey) error(404, 'Fant ikke bildet');
  const bytes = await readUpload(storageKey).catch(() => null);
  if (!bytes) error(404, 'Fant ikke bildet');
  const extension = storageKey.split('.').pop();
  const contentType = extension === 'jpg' ? 'image/jpeg' : extension === 'png' ? 'image/png' : 'image/webp';
  return new Response(bytes, { headers: { 'content-type': contentType, 'cache-control': 'private, no-cache' } });
};
