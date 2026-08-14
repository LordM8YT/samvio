import { and, desc, eq, sql } from 'drizzle-orm';
import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { postMedia, posts } from '$lib/server/db/schema';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) redirect(303, '/login?next=/minner');
  const today = new Date();
  const memories = await db.select({ id: posts.id, caption: posts.caption, createdAt: posts.createdAt, mediaId: postMedia.id })
    .from(posts).leftJoin(postMedia, eq(postMedia.postId, posts.id))
    .where(and(
      eq(posts.authorId, locals.user.id),
      sql`MONTH(${posts.createdAt}) = ${today.getMonth() + 1}`,
      sql`DAY(${posts.createdAt}) = ${today.getDate()}`,
      sql`YEAR(${posts.createdAt}) < ${today.getFullYear()}`
    )).orderBy(desc(posts.createdAt));
  return { memories, today };
};
