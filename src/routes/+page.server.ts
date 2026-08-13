import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { and, desc, eq, inArray, or } from 'drizzle-orm';
import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { follows, postMedia, posts, profiles } from '$lib/server/db/schema';
import type { Actions, PageServerLoad } from './$types';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const allowedTypes = new Map([['image/jpeg', 'jpg'], ['image/png', 'png'], ['image/webp', 'webp']]);

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) return { user: null, posts: [] };

  try {
    const followedUsers = db.select({ id: follows.followedId }).from(follows)
      .where(and(eq(follows.followerId, locals.user.id), eq(follows.status, 'accepted')));
    const rows = await db.select({
      id: posts.id,
      caption: posts.caption,
      createdAt: posts.createdAt,
      authorName: profiles.realName,
      authorUsername: profiles.username,
      mediaId: postMedia.id
    }).from(posts)
      .innerJoin(profiles, eq(profiles.userId, posts.authorId))
      .leftJoin(postMedia, eq(postMedia.postId, posts.id))
      .where(or(eq(posts.authorId, locals.user.id), inArray(posts.authorId, followedUsers)))
      .orderBy(desc(posts.createdAt), desc(posts.id)).limit(30);
    return { user: locals.user, posts: rows };
  } catch {
    return { user: locals.user, posts: [] };
  }
};

export const actions: Actions = {
  createPost: async ({ request, locals }) => {
    if (!locals.user) redirect(303, '/login');
    const form = await request.formData();
    const file = form.get('image');
    const captionValue = form.get('caption');
    const caption = typeof captionValue === 'string' ? captionValue.trim().slice(0, 2200) : '';
    if (!(file instanceof File) || file.size === 0) return fail(400, { postError: 'Velg et bilde.' });
    const extension = allowedTypes.get(file.type);
    if (!extension || file.size > MAX_IMAGE_BYTES) return fail(400, { postError: 'Bruk JPG, PNG eller WebP på maks 10 MB.' });

    const postId = randomUUID();
    const mediaId = randomUUID();
    const storageKey = `${mediaId}.${extension}`;
    const uploadDir = path.resolve('uploads');
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, storageKey), Buffer.from(await file.arrayBuffer()), { flag: 'wx' });

    try {
      await db.transaction(async (tx) => {
        await tx.insert(posts).values({ id: postId, authorId: locals.user!.id, caption: caption || null });
        await tx.insert(postMedia).values({ id: mediaId, postId, mediaType: 'image', storageKey });
      });
    } catch {
      await unlink(path.join(uploadDir, storageKey)).catch(() => undefined);
      return fail(503, { postError: 'Innlegget kunne ikke lagres.' });
    }
    redirect(303, '/');
  }
};
