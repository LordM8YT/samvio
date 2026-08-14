import { eq } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { postMedia } from '$lib/server/db/schema';
import { readUpload } from '$lib/server/storage';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals }) => {
  if (!locals.user) error(401, 'Innlogging kreves');
  const [media] = await db.select({ storageKey: postMedia.storageKey }).from(postMedia).where(eq(postMedia.id, params.id)).limit(1);
  if (!media || !/^[a-f0-9-]+\.(jpg|png|webp)$/.test(media.storageKey)) error(404, 'Fant ikke bildet');
  const bytes = await readUpload(media.storageKey).catch(() => null);
  if (!bytes) error(404, 'Fant ikke bildet');
  const extension = media.storageKey.split('.').pop();
  const contentType = extension === 'png' ? 'image/png' : extension === 'webp' ? 'image/webp' : 'image/jpeg';
  return new Response(bytes, { headers: { 'content-type': contentType, 'cache-control': 'private, max-age=3600', 'x-content-type-options': 'nosniff' } });
};
