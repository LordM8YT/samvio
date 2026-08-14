import { randomUUID } from 'node:crypto';
import { and, asc, eq } from 'drizzle-orm';
import { error, fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { comments, follows, postMedia, posts, profiles, postReactions, users } from '$lib/server/db/schema';
import { consumeRateLimit } from '$lib/server/rate-limit';
import type { Actions, PageServerLoad } from './$types';

async function canView(postId: string, userId: string) {
  const [post] = await db.select({ authorId: posts.authorId }).from(posts).where(eq(posts.id, postId)).limit(1);
  if (!post) return false;
  if (post.authorId === userId) return true;
  const [relation] = await db.select({ status: follows.status }).from(follows).where(and(eq(follows.followerId, userId), eq(follows.followedId, post.authorId), eq(follows.status, 'accepted'))).limit(1);
  return !!relation;
}

export const load: PageServerLoad = async ({ params, locals }) => {
  if (!locals.user) redirect(303, `/login?next=/innlegg/${encodeURIComponent(params.id)}`);
  if (!(await canView(params.id, locals.user.id))) error(404, 'Innlegget finnes ikke.');
  const [post] = await db.select({ id: posts.id, caption: posts.caption, createdAt: posts.createdAt, authorName: profiles.realName, authorUsername: profiles.username, authorRole: users.accountRole, mediaId: postMedia.id })
    .from(posts).innerJoin(profiles, eq(profiles.userId, posts.authorId)).innerJoin(users, eq(users.id, posts.authorId)).leftJoin(postMedia, eq(postMedia.postId, posts.id)).where(eq(posts.id, params.id)).limit(1);
  const rows = await db.select({ id: comments.id, body: comments.body, createdAt: comments.createdAt, authorName: profiles.realName, authorUsername: profiles.username })
    .from(comments).innerJoin(profiles, eq(profiles.userId, comments.authorId)).where(eq(comments.postId, params.id)).orderBy(asc(comments.createdAt), asc(comments.id)).limit(300);
  const [reaction] = await db.select({ postId: postReactions.postId }).from(postReactions).where(and(eq(postReactions.postId, params.id), eq(postReactions.userId, locals.user.id))).limit(1);
  return { post: { ...post, liked: !!reaction }, comments: rows };
};

export const actions: Actions = {
  comment: async ({ params, request, locals, getClientAddress }) => {
    if (!locals.user) redirect(303, '/login');
    if (!(await canView(params.id, locals.user.id))) error(404, 'Innlegget finnes ikke.');
    const rate = consumeRateLimit(`comment:${locals.user.id}:${getClientAddress()}`, 12, 10 * 60_000);
    if (!rate.allowed) return fail(429, { commentError: 'Du kommenterer litt for raskt. Vent noen minutter.' });
    const value = (await request.formData()).get('comment');
    const body = typeof value === 'string' ? value.trim() : '';
    if (!body || body.length > 1000) return fail(400, { commentError: 'Kommentaren må inneholde 1–1000 tegn.' });
    await db.insert(comments).values({ id: randomUUID(), postId: params.id, authorId: locals.user.id, body });
    redirect(303, `/innlegg/${params.id}#kommentarer`);
  }
};
