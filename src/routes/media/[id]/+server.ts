import { and, eq } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { follows, postMedia, posts } from '$lib/server/db/schema';
import { readUpload } from '$lib/server/storage';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals }) => {
  const [media] = await db.select({ storageKey: postMedia.storageKey, authorId: posts.authorId, visibility: posts.visibility, moderationStatus: posts.moderationStatus })
    .from(postMedia).innerJoin(posts, eq(posts.id, postMedia.postId)).where(eq(postMedia.id, params.id)).limit(1);
  if (!media || !/^[a-f0-9-]+\.(jpg|png|webp)$/.test(media.storageKey)) error(404, 'Fant ikke bildet');
  if (media.moderationStatus !== 'visible') error(404, 'Fant ikke bildet');
  const isPublic = media.visibility === 'public';
  if (!isPublic) {
    if (!locals.user) error(401, 'Innlogging kreves');
    if (media.authorId !== locals.user.id) {
      const [relation] = await db.select({ status: follows.status }).from(follows).where(and(eq(follows.followerId, locals.user.id), eq(follows.followedId, media.authorId), eq(follows.status, 'accepted'))).limit(1);
      if (!relation) error(404, 'Fant ikke bildet');
    }
  }
  const bytes = await readUpload(media.storageKey).catch(() => null);
  if (!bytes) error(404, 'Fant ikke bildet');
  const extension = media.storageKey.split('.').pop();
  const contentType = extension === 'png' ? 'image/png' : extension === 'webp' ? 'image/webp' : 'image/jpeg';
  return new Response(bytes, { headers: { 'content-type': contentType, 'cache-control': isPublic ? 'public, max-age=86400' : 'private, max-age=3600', 'x-content-type-options': 'nosniff' } });
};
