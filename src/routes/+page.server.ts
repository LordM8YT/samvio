import { randomUUID } from 'node:crypto';
import { and, desc, eq, gt, inArray, lte, notInArray, or } from 'drizzle-orm';
import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { follows, postMedia, postReactions, posts, profiles, userBlocks, userFeedState, userPreferences, users } from '$lib/server/db/schema';
import { removeUpload, saveUpload } from '$lib/server/storage';
import { consumeRateLimit } from '$lib/server/rate-limit';
import type { Actions, PageServerLoad } from './$types';

const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
const allowedTypes = new Map([['image/jpeg', 'jpg'], ['image/png', 'png'], ['image/webp', 'webp']]);

export const load: PageServerLoad = async ({ locals, url }) => {
  const openComposer = url.searchParams.get('opprett') === '1';
  if (!locals.user) return { user: null, posts: [], openComposer, caughtUpAt: null, feedWindowEnd: null, peopleCount: 0 };

  try {
    const feedWindowEnd = new Date();
    const [[state], [preference], blockRows] = await Promise.all([
      db.select({ caughtUpAt: userFeedState.caughtUpAt }).from(userFeedState).where(eq(userFeedState.userId, locals.user.id)).limit(1),
      db.select({ hideCommercial: userPreferences.hideCommercialContent }).from(userPreferences).where(eq(userPreferences.userId, locals.user.id)).limit(1),
      db.select({ blockerId: userBlocks.blockerId, blockedId: userBlocks.blockedId }).from(userBlocks).where(or(eq(userBlocks.blockerId, locals.user.id), eq(userBlocks.blockedId, locals.user.id)))
    ]);
    const blockedIds = blockRows.map((row) => row.blockerId === locals.user!.id ? row.blockedId : row.blockerId);
    const followedUsers = db.select({ id: follows.followedId }).from(follows)
      .where(and(eq(follows.followerId, locals.user.id), eq(follows.status, 'accepted')));
    const audience = or(eq(posts.authorId, locals.user.id), inArray(posts.authorId, followedUsers))!;
    const visibilityFilters = [eq(posts.moderationStatus, 'visible'), ...(blockedIds.length ? [notInArray(posts.authorId, blockedIds)] : []), ...(preference?.hideCommercial ? [eq(posts.isCommercial, false)] : [])];
    const feedFilter = state?.caughtUpAt
      ? and(audience, ...visibilityFilters, gt(posts.createdAt, state.caughtUpAt), lte(posts.createdAt, feedWindowEnd))
      : and(audience, ...visibilityFilters, lte(posts.createdAt, feedWindowEnd));
    const rows = await db.select({
      id: posts.id,
      caption: posts.caption,
      createdAt: posts.createdAt,
      authorName: profiles.realName,
      authorUsername: profiles.username,
      authorRole: users.accountRole,
      isCommercial: posts.isCommercial,
      sponsorName: posts.sponsorName,
      mediaId: postMedia.id
    }).from(posts)
      .innerJoin(profiles, eq(profiles.userId, posts.authorId))
      .innerJoin(users, eq(users.id, posts.authorId))
      .leftJoin(postMedia, eq(postMedia.postId, posts.id))
      .where(feedFilter)
      .orderBy(desc(posts.createdAt), desc(posts.id)).limit(500);
    const likedRows = rows.length ? await db.select({ postId: postReactions.postId }).from(postReactions).where(and(eq(postReactions.userId, locals.user.id), inArray(postReactions.postId, rows.map((post) => post.id)))) : [];
    const likedIds = new Set(likedRows.map((row) => row.postId));
    const feedPosts = rows.map((post) => ({ ...post, liked: likedIds.has(post.id) }));
    const peopleCount = new Set(rows.map((post) => post.authorUsername)).size;
    return { user: locals.user, posts: feedPosts, openComposer, caughtUpAt: state?.caughtUpAt ?? null, feedWindowEnd: rows.length < 500 ? feedWindowEnd : null, peopleCount };
  } catch {
    return { user: locals.user, posts: [], openComposer, caughtUpAt: null, feedWindowEnd: null, peopleCount: 0, feedError: true };
  }
};

export const actions: Actions = {
  markCaughtUp: async ({ request, locals }) => {
    if (!locals.user) return fail(401, { feedError: 'Logg inn for å oppdatere feeden.' });
    const value = (await request.formData()).get('feedWindowEnd');
    const caughtUpAt = typeof value === 'string' ? new Date(value) : new Date('invalid');
    if (Number.isNaN(caughtUpAt.getTime()) || caughtUpAt.getTime() > Date.now() + 60_000) return fail(400, { feedError: 'Ugyldig feed-markør.' });
    await db.insert(userFeedState).values({ userId: locals.user.id, caughtUpAt })
      .onDuplicateKeyUpdate({ set: { caughtUpAt } });
    return { caughtUp: true };
  },
  createPost: async ({ request, locals, getClientAddress }) => {
    if (!locals.user) redirect(303, '/login');
    const [account] = await db.select({ mutedUntil: users.mutedUntil }).from(users).where(eq(users.id, locals.user.id)).limit(1);
    if (account?.mutedUntil && account.mutedUntil > new Date()) return fail(403, { postError: 'Kontoen er midlertidig dempet og kan ikke publisere.' });
    const rate = consumeRateLimit(`post:${locals.user.id}:${getClientAddress()}`, 10, 10 * 60_000);
    if (!rate.allowed) return fail(429, { postError: 'Du deler litt for raskt. Vent noen minutter.' });
    const form = await request.formData();
    const file = form.get('image');
    const captionValue = form.get('caption');
    const caption = typeof captionValue === 'string' ? captionValue.trim().slice(0, 2200) : '';
    const isCommercial = form.get('isCommercial') === 'on';
    const sponsorValue = form.get('sponsorName');
    const sponsorName = typeof sponsorValue === 'string' ? sponsorValue.trim().slice(0, 120) : '';
    if (isCommercial && sponsorName.length < 2) return fail(400, { postError: 'Oppgi hvem innlegget reklamerer for.' });
    if (!(file instanceof File) || file.size === 0) return fail(400, { postError: 'Velg et bilde.' });
    const extension = allowedTypes.get(file.type);
    if (!extension || file.size > MAX_IMAGE_BYTES) return fail(400, { postError: 'Bruk JPG, PNG eller WebP på maks 25 MB.' });

    const postId = randomUUID();
    const mediaId = randomUUID();
    const storageKey = `${mediaId}.${extension}`;
    await saveUpload(storageKey, new Uint8Array(await file.arrayBuffer()));

    try {
      await db.transaction(async (tx) => {
        await tx.insert(posts).values({ id: postId, authorId: locals.user!.id, caption: caption || null, isCommercial, sponsorName: isCommercial ? sponsorName : null });
        await tx.insert(postMedia).values({ id: mediaId, postId, mediaType: 'image', storageKey });
      });
    } catch {
      await removeUpload(storageKey);
      return fail(503, { postError: 'Innlegget kunne ikke lagres.' });
    }
    redirect(303, '/');
  }
};
