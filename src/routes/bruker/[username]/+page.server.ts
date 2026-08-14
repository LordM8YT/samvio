import { and, count, desc, eq, inArray } from 'drizzle-orm';
import { error, fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { follows, postMedia, postReactions, posts, profiles, users } from '$lib/server/db/schema';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
  if (!locals.user) redirect(303, `/login?next=/bruker/${encodeURIComponent(params.username)}`);
  const [profile] = await db.select({ userId: profiles.userId, realName: profiles.realName, username: profiles.username, bio: profiles.bio, avatarPath: profiles.avatarPath, coverPath: profiles.coverPath, profileUpdatedAt: profiles.updatedAt, verified: profiles.isIdentityVerified, role: users.accountRole })
    .from(profiles).innerJoin(users, eq(users.id, profiles.userId)).where(eq(profiles.username, params.username.toLowerCase())).limit(1);
  if (!profile) error(404, 'Profilen finnes ikke');

  const isOwnProfile = profile.userId === locals.user.id;
  const [relation] = isOwnProfile ? [] : await db.select({ status: follows.status }).from(follows)
    .where(and(eq(follows.followerId, locals.user.id), eq(follows.followedId, profile.userId))).limit(1);
  const canSeePosts = isOwnProfile || relation?.status === 'accepted';
  const moments = canSeePosts ? await db.select({ id: posts.id, caption: posts.caption, createdAt: posts.createdAt, mediaId: postMedia.id })
    .from(posts).leftJoin(postMedia, eq(postMedia.postId, posts.id)).where(eq(posts.authorId, profile.userId))
    .orderBy(desc(posts.createdAt), desc(posts.id)).limit(100) : [];
  const likedRows = moments.length ? await db.select({ postId: postReactions.postId }).from(postReactions)
    .where(and(eq(postReactions.userId, locals.user.id), inArray(postReactions.postId, moments.map((moment) => moment.id)))) : [];
  const likedIds = new Set(likedRows.map((row) => row.postId));
  const profilePosts = moments.map((moment) => ({ ...moment, authorName: profile.realName, authorUsername: profile.username, authorRole: profile.role, liked: likedIds.has(moment.id) }));
  const [[postCount], [followerCount], [followingCount]] = await Promise.all([
    db.select({ value: count() }).from(posts).where(eq(posts.authorId, profile.userId)),
    db.select({ value: count() }).from(follows).where(and(eq(follows.followedId, profile.userId), eq(follows.status, 'accepted'))),
    db.select({ value: count() }).from(follows).where(and(eq(follows.followerId, profile.userId), eq(follows.status, 'accepted')))
  ]);

  return { profile, isOwnProfile, followStatus: relation?.status ?? null, canSeePosts, moments: profilePosts, stats: { posts: postCount.value, followers: followerCount.value, following: followingCount.value } };
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
