import { and, desc, eq, gt, inArray, lt, or } from 'drizzle-orm';
import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { follows, postMedia, postReactions, posts, profiles, users } from '$lib/server/db/schema';
import type { PageServerLoad } from './$types';

const PAGE_SIZE = 24;

function periodStart(period: string) {
  const now = new Date();
  if (period === 'week') return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
  if (period === 'month') return new Date(now.getFullYear(), now.getMonth(), 1);
  if (period === 'year') return new Date(now.getFullYear(), 0, 1);
  return null;
}

export const load: PageServerLoad = async ({ locals, url }) => {
  if (!locals.user) redirect(303, '/login?next=/historikk');
  const period = ['week', 'month', 'year', 'older'].includes(url.searchParams.get('periode') ?? '') ? url.searchParams.get('periode')! : 'month';
  const cursorValue = url.searchParams.get('foer');
  const [cursorDateValue, cursorId] = cursorValue?.split('|') ?? [];
  const cursorDate = cursorDateValue ? new Date(cursorDateValue) : null;
  const followedUsers = db.select({ id: follows.followedId }).from(follows)
    .where(and(eq(follows.followerId, locals.user.id), eq(follows.status, 'accepted')));
  const audience = or(eq(posts.authorId, locals.user.id), inArray(posts.authorId, followedUsers))!;
  const start = periodStart(period);
  const timeFilter = cursorDate && cursorId && !Number.isNaN(cursorDate.getTime())
    ? or(lt(posts.createdAt, cursorDate), and(eq(posts.createdAt, cursorDate), lt(posts.id, cursorId)))
    : period === 'older'
      ? lt(posts.createdAt, new Date(new Date().getFullYear(), 0, 1))
      : start
        ? and(lt(posts.createdAt, new Date()), gt(posts.createdAt, start))
        : undefined;
  const rows = await db.select({
    id: posts.id, caption: posts.caption, createdAt: posts.createdAt, isCommercial: posts.isCommercial, sponsorName: posts.sponsorName,
    authorName: profiles.realName, authorUsername: profiles.username, authorRole: users.accountRole, mediaId: postMedia.id
  }).from(posts)
    .innerJoin(profiles, eq(profiles.userId, posts.authorId))
    .innerJoin(users, eq(users.id, posts.authorId))
    .leftJoin(postMedia, eq(postMedia.postId, posts.id))
    .where(timeFilter ? and(audience, eq(posts.moderationStatus, 'visible'), timeFilter) : and(audience, eq(posts.moderationStatus, 'visible')))
    .orderBy(desc(posts.createdAt), desc(posts.id)).limit(PAGE_SIZE + 1);
  const hasMore = rows.length > PAGE_SIZE;
  const page = rows.slice(0, PAGE_SIZE);
  const likedRows = page.length ? await db.select({ postId: postReactions.postId }).from(postReactions)
    .where(and(eq(postReactions.userId, locals.user.id), inArray(postReactions.postId, page.map((post) => post.id)))) : [];
  const likedIds = new Set(likedRows.map((row) => row.postId));
  const historyPosts = page.map((post) => ({ ...post, liked: likedIds.has(post.id) }));
  const last = page.at(-1);
  return { period, posts: historyPosts, nextCursor: hasMore && last ? `${last.createdAt.toISOString()}|${last.id}` : null };
};
