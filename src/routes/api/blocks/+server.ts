import { and, eq, or } from 'drizzle-orm';
import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { follows, profiles, userBlocks } from '$lib/server/db/schema';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) return json({ error: 'Logg inn først.' }, { status: 401 });
  const body = await request.json().catch(() => null);
  const targetId = body?.targetId;
  if (typeof targetId !== 'string' || targetId === locals.user.id) return json({ error: 'Ugyldig bruker.' }, { status: 400 });
  const [target] = await db.select({ id: profiles.userId }).from(profiles).where(eq(profiles.userId, targetId)).limit(1);
  if (!target) return json({ error: 'Brukeren finnes ikke.' }, { status: 404 });
  await db.transaction(async (tx) => {
    await tx.insert(userBlocks).values({ blockerId: locals.user!.id, blockedId: targetId }).onDuplicateKeyUpdate({ set: { blockedId: targetId } });
    await tx.delete(follows).where(or(and(eq(follows.followerId, locals.user!.id), eq(follows.followedId, targetId)), and(eq(follows.followerId, targetId), eq(follows.followedId, locals.user!.id))));
  });
  return json({ ok: true });
};

export const DELETE: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) return json({ error: 'Logg inn først.' }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (typeof body?.targetId !== 'string') return json({ error: 'Ugyldig bruker.' }, { status: 400 });
  await db.delete(userBlocks).where(and(eq(userBlocks.blockerId, locals.user.id), eq(userBlocks.blockedId, body.targetId)));
  return json({ ok: true });
};
