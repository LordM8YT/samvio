import { randomUUID } from 'node:crypto';
import { and, desc, eq } from 'drizzle-orm';
import { error, fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { comments, follows, notifications, postMedia, posts, profiles, postReactions, userPreferences, users } from '$lib/server/db/schema';
import { consumeRateLimit } from '$lib/server/rate-limit';
import type { Actions, PageServerLoad } from './$types';

async function canView(postId: string, userId?: string) {
  const [post] = await db.select({ authorId: posts.authorId, visibility: posts.visibility }).from(posts).where(and(eq(posts.id, postId), eq(posts.moderationStatus, 'visible'))).limit(1);
  if (!post) return false;
  if (post.visibility === 'public') return true;
  if (!userId) return false;
  if (post.authorId === userId) return true;
  const [relation] = await db.select({ status: follows.status }).from(follows).where(and(eq(follows.followerId, userId), eq(follows.followedId, post.authorId), eq(follows.status, 'accepted'))).limit(1);
  return !!relation;
}

export const load: PageServerLoad = async ({ params, locals }) => {
  if (!(await canView(params.id, locals.user?.id))) {
    if (!locals.user) redirect(303, `/login?next=/innlegg/${encodeURIComponent(params.id)}`);
    error(404, 'Innlegget finnes ikke.');
  }
  const [post] = await db.select({ id: posts.id, caption: posts.caption, createdAt: posts.createdAt, isCommercial: posts.isCommercial, sponsorName: posts.sponsorName, authorName: profiles.realName, authorUsername: profiles.username, authorRole: users.accountRole, mediaId: postMedia.id })
    .from(posts).innerJoin(profiles, eq(profiles.userId, posts.authorId)).innerJoin(users, eq(users.id, posts.authorId)).leftJoin(postMedia, eq(postMedia.postId, posts.id)).where(eq(posts.id, params.id)).limit(1);
  const rows = await db.select({ id: comments.id, body: comments.body, createdAt: comments.createdAt, authorName: profiles.realName, authorUsername: profiles.username })
    .from(comments).innerJoin(profiles, eq(profiles.userId, comments.authorId)).where(and(eq(comments.postId, params.id), eq(comments.moderationStatus, 'visible'))).orderBy(desc(comments.createdAt), desc(comments.id)).limit(300);
  const [reaction] = locals.user
    ? await db.select({ postId: postReactions.postId }).from(postReactions).where(and(eq(postReactions.postId, params.id), eq(postReactions.userId, locals.user.id))).limit(1)
    : [];
  return { post: { ...post, liked: !!reaction }, comments: rows };
};

export const actions: Actions = {
  comment: async ({ params, request, locals, getClientAddress }) => {
    if (!locals.user) redirect(303, '/login');
    if (!(await canView(params.id, locals.user.id))) error(404, 'Innlegget finnes ikke.');
    const [account] = await db.select({ mutedUntil: users.mutedUntil }).from(users).where(eq(users.id, locals.user.id)).limit(1);
    if (account?.mutedUntil && account.mutedUntil > new Date()) return fail(403, { commentError: 'Kontoen er midlertidig dempet og kan ikke kommentere.' });
    const rate = consumeRateLimit(`comment:${locals.user.id}:${getClientAddress()}`, 12, 10 * 60_000);
    if (!rate.allowed) return fail(429, { commentError: 'Du kommenterer litt for raskt. Vent noen minutter.' });
    const value = (await request.formData()).get('comment');
    const body = typeof value === 'string' ? value.trim() : '';
    if (!body || body.length > 1000) return fail(400, { commentError: 'Kommentaren må inneholde 1–1000 tegn.' });
    const commentId = randomUUID();
    await db.insert(comments).values({ id: commentId, postId: params.id, authorId: locals.user.id, body });
    const [post] = await db.select({ authorId: posts.authorId }).from(posts).where(eq(posts.id, params.id)).limit(1);
    if (post && post.authorId !== locals.user.id) {
      const [preference] = await db.select({ enabled: userPreferences.notifyComments }).from(userPreferences).where(eq(userPreferences.userId, post.authorId)).limit(1);
      if (preference?.enabled !== false) await db.insert(notifications).values({ id: randomUUID(), recipientId: post.authorId, actorId: locals.user.id, type: 'comment', postId: params.id });
    }
    redirect(303, `/innlegg/${params.id}#kommentarer`);
  }
};
