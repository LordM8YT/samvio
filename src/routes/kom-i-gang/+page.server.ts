import { and, count, desc, eq, inArray, ne, or } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { fail, redirect } from '@sveltejs/kit';
import { readAcquisition } from '$lib/server/acquisition';
import { db } from '$lib/server/db';
import { follows, profiles, userBlocks, users } from '$lib/server/db/schema';
import { removeUpload, saveUpload } from '$lib/server/storage';
import type { Actions, PageServerLoad } from './$types';

const allowedTypes = new Map([['image/jpeg', 'jpg'], ['image/png', 'png'], ['image/webp', 'webp']]);

export const load: PageServerLoad = async ({ cookies, locals, url }) => {
  if (!locals.user) redirect(303, '/login?ny=1&next=/kom-i-gang');
  const [profile] = await db.select({
    userId: profiles.userId,
    realName: profiles.realName,
    username: profiles.username,
    bio: profiles.bio,
    avatarPath: profiles.avatarPath,
    profileVisibility: profiles.profileVisibility,
    onboardingCompletedAt: profiles.onboardingCompletedAt,
    updatedAt: profiles.updatedAt
  }).from(profiles).where(eq(profiles.userId, locals.user.id)).limit(1);
  if (!profile) redirect(303, '/login');

  const blockRows = await db.select({ blockerId: userBlocks.blockerId, blockedId: userBlocks.blockedId }).from(userBlocks)
    .where(or(eq(userBlocks.blockerId, locals.user.id), eq(userBlocks.blockedId, locals.user.id)));
  const blockedIds = new Set(blockRows.map((row) => row.blockerId === locals.user!.id ? row.blockedId : row.blockerId));
  const candidateRows = await db.select({
    userId: profiles.userId,
    realName: profiles.realName,
    username: profiles.username,
    bio: profiles.bio,
    avatarPath: profiles.avatarPath,
    profileVisibility: profiles.profileVisibility,
    updatedAt: profiles.updatedAt,
    role: users.accountRole
  }).from(profiles).innerJoin(users, eq(users.id, profiles.userId))
    .where(and(ne(profiles.userId, locals.user.id), eq(users.accountStatus, 'active')))
    .orderBy(desc(users.lastSeenAt), desc(users.createdAt)).limit(24);
  const visibleCandidates = candidateRows.filter((candidate) => !blockedIds.has(candidate.userId)).slice(0, 12);
  const relationRows = visibleCandidates.length ? await db.select({ followedId: follows.followedId, status: follows.status }).from(follows)
    .where(and(eq(follows.followerId, locals.user.id), inArray(follows.followedId, visibleCandidates.map((candidate) => candidate.userId)))) : [];
  const relationById = new Map(relationRows.map((row) => [row.followedId, row.status]));
  const { inviter } = readAcquisition(cookies);
  const suggestions = visibleCandidates.map((candidate) => ({ ...candidate, followStatus: relationById.get(candidate.userId) ?? null }))
    .sort((a, b) => Number(b.username === inviter) - Number(a.username === inviter));
  const [following] = await db.select({ value: count() }).from(follows).where(and(eq(follows.followerId, locals.user.id), eq(follows.status, 'accepted')));

  return {
    user: locals.user,
    profile,
    suggestions,
    followingCount: following.value,
    inviter,
    startStep: Math.min(4, Math.max(1, Number(url.searchParams.get('steg')) || 1)),
    inviteUrl: `${url.origin}/bli-med?fra=invitasjon&invitasjon=${profile.username}`
  };
};

export const actions: Actions = {
  updateProfile: async ({ request, locals }) => {
    if (!locals.user) redirect(303, '/login');
    const form = await request.formData();
    const bioValue = form.get('bio');
    const visibility = form.get('profileVisibility');
    if (typeof bioValue !== 'string' || !['private', 'public'].includes(String(visibility))) return fail(400, { onboardingError: 'Kontroller profilvalgene.' });
    const bio = bioValue.trim();
    if (bio.length > 300) return fail(400, { onboardingError: 'Profilteksten kan være maks 300 tegn.' });
    const [current] = await db.select({ avatarPath: profiles.avatarPath }).from(profiles).where(eq(profiles.userId, locals.user.id)).limit(1);
    const file = form.get('avatar');
    let avatarPath: string | undefined;
    if (file instanceof File && file.size > 0) {
      const extension = allowedTypes.get(file.type);
      if (!extension || file.size > 25 * 1024 * 1024) return fail(400, { onboardingError: 'Bruk JPG, PNG eller WebP på maks 25 MB.' });
      avatarPath = `${randomUUID()}.${extension}`;
      await saveUpload(avatarPath, new Uint8Array(await file.arrayBuffer()));
    }
    try {
      await db.update(profiles).set({ bio: bio || null, profileVisibility: visibility as 'private' | 'public', ...(avatarPath ? { avatarPath } : {}) }).where(eq(profiles.userId, locals.user.id));
      if (avatarPath && current?.avatarPath) await removeUpload(current.avatarPath).catch(() => undefined);
      return { profileSaved: true };
    } catch {
      if (avatarPath) await removeUpload(avatarPath).catch(() => undefined);
      return fail(503, { onboardingError: 'Profilen kunne ikke lagres akkurat nå.' });
    }
  },
  follow: async ({ request, locals }) => {
    if (!locals.user) redirect(303, '/login');
    const targetId = (await request.formData()).get('targetId');
    if (typeof targetId !== 'string' || targetId === locals.user.id) return fail(400, { followError: 'Ugyldig profil.' });
    const [target] = await db.select({ visibility: profiles.profileVisibility }).from(profiles).innerJoin(users, eq(users.id, profiles.userId))
      .where(and(eq(profiles.userId, targetId), eq(users.accountStatus, 'active'))).limit(1);
    if (!target) return fail(404, { followError: 'Profilen finnes ikke.' });
    const [block] = await db.select({ blockerId: userBlocks.blockerId }).from(userBlocks).where(or(and(eq(userBlocks.blockerId, locals.user.id), eq(userBlocks.blockedId, targetId)), and(eq(userBlocks.blockerId, targetId), eq(userBlocks.blockedId, locals.user.id)))).limit(1);
    if (block) return fail(403, { followError: 'Denne profilen kan ikke følges.' });
    const status = target.visibility === 'public' ? 'accepted' : 'pending';
    await db.insert(follows).values({ followerId: locals.user.id, followedId: targetId, status }).onDuplicateKeyUpdate({ set: { status } });
    return { followedId: targetId, followStatus: status };
  },
  complete: async ({ request, locals }) => {
    if (!locals.user) redirect(303, '/login');
    const next = (await request.formData()).get('next');
    await db.update(profiles).set({ onboardingCompletedAt: new Date() }).where(eq(profiles.userId, locals.user.id));
    redirect(303, next === 'post' ? '/?opprett=1' : '/');
  }
};
