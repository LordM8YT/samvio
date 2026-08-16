import { desc, eq } from 'drizzle-orm';
import { personalPlanEntitlements, type PersonalPlanCode } from '$lib/plans';
import { db } from './db';
import { postMedia, posts, subscriptions } from './db/schema';
import { uploadSize } from './storage';

export type UserEntitlements = {
  planCode: PersonalPlanCode;
  subscriptionId: string | null;
  originalImageQuality: boolean;
  fullArchive: boolean;
  storageLimitBytes: number;
  retentionDays: number;
};

const priority: Record<PersonalPlanCode, number> = { free: 0, person: 1, family: 2 };

function hasPaidAccess(row: { status: string; currentPeriodEnd: Date | null }, now: Date) {
  if (!['active', 'past_due', 'canceled'].includes(row.status)) return false;
  // Never grant paid features from an agreement alone. A paid period must exist.
  return !!row.currentPeriodEnd && row.currentPeriodEnd > now;
}

export async function getUserEntitlements(userId: string): Promise<UserEntitlements> {
  const now = new Date();
  const rows = await db.select({
    id: subscriptions.id,
    planCode: subscriptions.planCode,
    status: subscriptions.status,
    currentPeriodEnd: subscriptions.currentPeriodEnd,
    createdAt: subscriptions.createdAt
  }).from(subscriptions).where(eq(subscriptions.userId, userId)).orderBy(desc(subscriptions.createdAt));

  let selected: PersonalPlanCode = 'free';
  let subscriptionId: string | null = null;
  for (const row of rows) {
    if (row.planCode !== 'person' && row.planCode !== 'family') continue;
    if (!hasPaidAccess(row, now)) continue;
    if (priority[row.planCode] > priority[selected]) {
      selected = row.planCode;
      subscriptionId = row.id;
    }
  }

  return { planCode: selected, subscriptionId, ...personalPlanEntitlements[selected] };
}

export async function getUserStorageUsage(userId: string) {
  const media = await db.select({ storageKey: postMedia.storageKey, metadata: postMedia.metadata })
    .from(postMedia).innerJoin(posts, eq(posts.id, postMedia.postId)).where(eq(posts.authorId, userId));

  const sizes = await Promise.all(media.map(async (item) => {
    const metadata = item.metadata && typeof item.metadata === 'object' && !Array.isArray(item.metadata)
      ? item.metadata as Record<string, unknown>
      : null;
    const storedBytes = metadata?.bytes;
    if (typeof storedBytes === 'number' && Number.isFinite(storedBytes) && storedBytes >= 0) return storedBytes;
    return uploadSize(item.storageKey).catch(() => 0);
  }));

  return sizes.reduce((total, value) => total + value, 0);
}
