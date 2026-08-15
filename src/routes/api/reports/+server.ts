import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { comments, contentReports, posts, profiles } from '$lib/server/db/schema';
import { consumeRateLimit } from '$lib/server/rate-limit';
import type { RequestHandler } from './$types';

const reasons = new Set(['spam', 'harassment', 'sexual', 'violence', 'privacy', 'other']);

export const POST: RequestHandler = async ({ request, locals, getClientAddress }) => {
  if (!locals.user) return json({ error: 'Logg inn for å rapportere.' }, { status: 401 });
  const rate = consumeRateLimit(`report:${locals.user.id}:${getClientAddress()}`, 10, 60 * 60_000);
  if (!rate.allowed) return json({ error: 'Du har sendt mange rapporter. Vent litt.' }, { status: 429 });
  const body = await request.json().catch(() => null);
  const targetType = body?.targetType;
  const targetId = body?.targetId;
  const reason = body?.reason;
  const details = typeof body?.details === 'string' ? body.details.trim().slice(0, 500) : '';
  if (!['post', 'comment', 'user'].includes(targetType) || typeof targetId !== 'string' || !reasons.has(reason)) return json({ error: 'Ugyldig rapport.' }, { status: 400 });
  const exists = targetType === 'post'
    ? await db.select({ id: posts.id }).from(posts).where(eq(posts.id, targetId)).limit(1)
    : targetType === 'comment'
      ? await db.select({ id: comments.id }).from(comments).where(eq(comments.id, targetId)).limit(1)
      : await db.select({ id: profiles.userId }).from(profiles).where(eq(profiles.userId, targetId)).limit(1);
  if (!exists.length) return json({ error: 'Innholdet finnes ikke.' }, { status: 404 });
  const [duplicate] = await db.select({ id: contentReports.id }).from(contentReports).where(and(eq(contentReports.reporterId, locals.user.id), eq(contentReports.targetType, targetType), eq(contentReports.targetId, targetId), eq(contentReports.status, 'open'))).limit(1);
  if (duplicate) return json({ ok: true, duplicate: true });
  await db.insert(contentReports).values({ id: randomUUID(), reporterId: locals.user.id, targetType, targetId, reason, details: details || null });
  return json({ ok: true }, { status: 201 });
};
