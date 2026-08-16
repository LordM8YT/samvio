import { and, asc, eq, isNotNull } from 'drizzle-orm';
import { db } from './db';
import { posts } from './db/schema';

export const RETENTION_GRACE_DAYS = 30;

export async function getRetentionWarning(userId: string) {
  const rows = await db.select({ deleteAfter: posts.retentionDeleteAfter })
    .from(posts)
    .where(and(eq(posts.authorId, userId), isNotNull(posts.retentionDeleteAfter)))
    .orderBy(asc(posts.retentionDeleteAfter));

  if (!rows.length || !rows[0].deleteAfter) return null;
  return { count: rows.length, earliestDeleteAt: rows[0].deleteAfter };
}
