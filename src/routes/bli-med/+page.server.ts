import { and, desc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { postMedia, posts, profiles } from '$lib/server/db/schema';
import { normalizeAcquisitionSource, normalizeInviter, recordLandingVisit, rememberAcquisition } from '$lib/server/acquisition';
import { isVippsLoginEnabled } from '$lib/server/vipps/config';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies, locals, url }) => {
  const source = normalizeAcquisitionSource(url.searchParams.get('fra'), 'tiktok');
  const inviter = normalizeInviter(url.searchParams.get('invitasjon'));
  rememberAcquisition(cookies, source, inviter);
  await recordLandingVisit(cookies, source).catch(() => undefined);

  const publicPosts = await db.select({
    id: posts.id,
    caption: posts.caption,
    authorName: profiles.realName,
    authorUsername: profiles.username,
    mediaId: postMedia.id
  }).from(posts)
    .innerJoin(profiles, eq(profiles.userId, posts.authorId))
    .leftJoin(postMedia, eq(postMedia.postId, posts.id))
    .where(and(eq(posts.visibility, 'public'), eq(posts.moderationStatus, 'visible')))
    .orderBy(desc(posts.createdAt), desc(posts.id))
    .limit(3)
    .catch(() => []);

  return {
    user: locals.user,
    source,
    inviter,
    vippsLoginEnabled: isVippsLoginEnabled(),
    publicPosts
  };
};
