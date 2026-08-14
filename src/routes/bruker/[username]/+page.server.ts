import { and, desc, eq } from 'drizzle-orm';
import { error, fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { follows, postMedia, posts, profiles, users } from '$lib/server/db/schema';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
  if (!locals.user) redirect(303, `/login?next=/bruker/${encodeURIComponent(params.username)}`);
  const [profile] = await db.select({ userId: profiles.userId, realName: profiles.realName, username: profiles.username, bio: profiles.bio, verified: profiles.isIdentityVerified, role: users.accountRole })
    .from(profiles).innerJoin(users, eq(users.id, profiles.userId)).where(eq(profiles.username, params.username.toLowerCase())).limit(1);
  if (!profile) error(404, 'Profilen finnes ikke');

  const isOwnProfile = profile.userId === locals.user.id;
  const [relation] = isOwnProfile ? [] : await db.select({ status: follows.status }).from(follows)
    .where(and(eq(follows.followerId, locals.user.id), eq(follows.followedId, profile.userId))).limit(1);
  const canSeePosts = isOwnProfile || relation?.status === 'accepted';
  const moments = canSeePosts ? await db.select({ id: posts.id, caption: posts.caption, createdAt: posts.createdAt, mediaId: postMedia.id })
    .from(posts).leftJoin(postMedia, eq(postMedia.postId, posts.id)).where(eq(posts.authorId, profile.userId))
    .orderBy(desc(posts.createdAt), desc(posts.id)).limit(100) : [];

  return { profile, isOwnProfile, followStatus: relation?.status ?? null, canSeePosts, moments };
};

export const actions: Actions = {
  follow: async ({ params, locals }) => {
    if (!locals.user) redirect(303, '/login');
    const [target] = await db.select({ id: profiles.userId }).from(profiles).where(eq(profiles.username, params.username.toLowerCase())).limit(1);
    if (!target || target.id === locals.user.id) return fail(400, { followError: 'Ugyldig profil.' });
    const [existing] = await db.select({ status: follows.status }).from(follows)
      .where(and(eq(follows.followerId, locals.user.id), eq(follows.followedId, target.id))).limit(1);
    if (existing?.status === 'blocked') return fail(403, { followError: 'Denne profilen kan ikke følges.' });
    await db.insert(follows).values({ followerId: locals.user.id, followedId: target.id, status: 'accepted' })
      .onDuplicateKeyUpdate({ set: { status: 'accepted' } });
  },
  unfollow: async ({ params, locals }) => {
    if (!locals.user) redirect(303, '/login');
    const [target] = await db.select({ id: profiles.userId }).from(profiles).where(eq(profiles.username, params.username.toLowerCase())).limit(1);
    if (target) await db.delete(follows).where(and(eq(follows.followerId, locals.user.id), eq(follows.followedId, target.id), eq(follows.status, 'accepted')));
  }
};
