import { and, eq } from 'drizzle-orm';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { follows, postReactions, posts } from '$lib/server/db/schema';
import { consumeRateLimit } from '$lib/server/rate-limit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, locals, getClientAddress }) => {
  if (!locals.user) error(401, 'Logg inn for å reagere.');
  const rate = consumeRateLimit(`reaction:${locals.user.id}:${getClientAddress()}`, 60, 60_000);
  if (!rate.allowed) error(429, 'Vent litt før du reagerer igjen.');

  const [post] = await db.select({ authorId: posts.authorId }).from(posts).where(eq(posts.id, params.id)).limit(1);
  if (!post) error(404, 'Innlegget finnes ikke.');
  if (post.authorId !== locals.user.id) {
    const [relation] = await db.select({ status: follows.status }).from(follows).where(and(
      eq(follows.followerId, locals.user.id), eq(follows.followedId, post.authorId), eq(follows.status, 'accepted')
    )).limit(1);
    if (!relation) error(404, 'Innlegget finnes ikke.');
  }

  const key = and(eq(postReactions.postId, params.id), eq(postReactions.userId, locals.user.id));
  const [existing] = await db.select({ postId: postReactions.postId }).from(postReactions).where(key).limit(1);
  if (existing) {
    await db.delete(postReactions).where(key);
    return json({ liked: false });
  }
  await db.insert(postReactions).values({ postId: params.id, userId: locals.user.id });
  return json({ liked: true });
};
