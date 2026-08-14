import { randomUUID } from 'node:crypto';
import { and, eq, inArray, like, ne, or } from 'drizzle-orm';
import { error, fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { follows, postMedia, posts, profiles, users } from '$lib/server/db/schema';
import { deleteSession, SESSION_COOKIE } from '$lib/server/auth';
import { removeUpload, saveUpload } from '$lib/server/storage';
import type { Actions, PageServerLoad } from './$types';

const publicSections = new Set(['om', 'personvern', 'vilkar', 'hjelp']);
const sections = new Set(['sok', 'utforsk', 'videoer', 'meldinger', 'varsler', 'profil', 'innstillinger', ...publicSections]);

export const load: PageServerLoad = async ({ params, url, locals }) => {
  if (!sections.has(params.section)) error(404, 'Siden finnes ikke');
  if (!locals.user && !publicSections.has(params.section)) redirect(303, `/login?next=/${params.section}`);
  if (params.section === 'profil' && locals.user) redirect(303, `/bruker/${locals.user.username}`);

  const query = url.searchParams.get('q')?.trim().slice(0, 60) ?? '';
  let results: Array<{ userId: string; realName: string; username: string; followStatus: 'pending' | 'accepted' | 'blocked' | null }> = [];
  if (params.section === 'sok' && query) {
    const matches = await db.select({ userId: profiles.userId, realName: profiles.realName, username: profiles.username })
      .from(profiles)
      .where(and(ne(profiles.userId, locals.user!.id), or(like(profiles.username, `%${query}%`), like(profiles.realName, `%${query}%`))))
      .limit(20);
    const relations = matches.length
      ? await db.select({ id: follows.followedId, status: follows.status }).from(follows).where(and(eq(follows.followerId, locals.user!.id), inArray(follows.followedId, matches.map((match) => match.userId))))
      : [];
    const relationByUser = new Map(relations.map((row) => [row.id, row.status]));
    results = matches.map((match) => ({ ...match, followStatus: relationByUser.get(match.userId) ?? null }));
  }

  let profileBio: string | null = null;
  let profileImages = { avatar: false, cover: false };
  if (params.section === 'innstillinger' && locals.user) {
    const [profile] = await db.select({ bio: profiles.bio, avatarPath: profiles.avatarPath, coverPath: profiles.coverPath }).from(profiles).where(eq(profiles.userId, locals.user.id)).limit(1);
    profileBio = profile?.bio ?? null;
    profileImages = { avatar: !!profile?.avatarPath, cover: !!profile?.coverPath };
  }

  return { section: params.section, user: locals.user, query, results, profileBio, profileImages };
};

export const actions: Actions = {
  updateProfile: async ({ request, locals }) => {
    if (!locals.user) redirect(303, '/login');
    const form = await request.formData();
    const bioValue = form.get('bio');
    if (typeof bioValue !== 'string') return fail(400, { profileError: 'Ugyldig profiltekst.' });
    const bio = bioValue.trim();
    if (bio.length > 300) return fail(400, { profileError: 'Profilteksten kan være maks 300 tegn.' });
    const [current] = await db.select({ avatarPath: profiles.avatarPath, coverPath: profiles.coverPath }).from(profiles).where(eq(profiles.userId, locals.user.id)).limit(1);
    const allowedTypes = new Map([['image/jpeg', 'jpg'], ['image/png', 'png'], ['image/webp', 'webp']]);
    const uploads: Array<{ field: 'avatarPath' | 'coverPath'; file: File; oldPath: string | null; storageKey: string }> = [];
    for (const [name, field, oldPath] of [['avatar', 'avatarPath', current?.avatarPath], ['cover', 'coverPath', current?.coverPath]] as const) {
      const file = form.get(name);
      if (!(file instanceof File) || file.size === 0) continue;
      const extension = allowedTypes.get(file.type);
      if (!extension || file.size > 25 * 1024 * 1024) return fail(400, { profileError: 'Bruk JPG, PNG eller WebP på maks 25 MB.' });
      uploads.push({ field, file, oldPath: oldPath ?? null, storageKey: `${randomUUID()}.${extension}` });
    }
    await Promise.all(uploads.map(async (item) => saveUpload(item.storageKey, new Uint8Array(await item.file.arrayBuffer()))));
    const imageValues = Object.fromEntries(uploads.map((item) => [item.field, item.storageKey]));
    await db.update(profiles).set({ bio: bio || null, ...imageValues }).where(eq(profiles.userId, locals.user.id));
    await Promise.allSettled(uploads.flatMap((item) => item.oldPath ? [removeUpload(item.oldPath)] : []));
    return { profileSaved: true };
  },
  deleteAccount: async ({ request, locals, cookies }) => {
    if (!locals.user) redirect(303, '/login');
    const confirmation = (await request.formData()).get('confirmation');
    if (confirmation !== 'SLETT') return fail(400, { deleteError: 'Skriv SLETT for å bekrefte.' });
    const media = await db.select({ storageKey: postMedia.storageKey }).from(postMedia)
      .innerJoin(posts, eq(posts.id, postMedia.postId)).where(eq(posts.authorId, locals.user.id));
    await db.delete(users).where(eq(users.id, locals.user.id));
    await Promise.allSettled(media.map((item) => removeUpload(item.storageKey)));
    cookies.delete(SESSION_COOKIE, { path: '/' });
    redirect(303, '/login?deleted=1');
  },
  follow: async ({ request, locals }) => {
    if (!locals.user) redirect(303, '/login');
    const targetId = (await request.formData()).get('targetId');
    if (typeof targetId !== 'string' || targetId === locals.user.id) return fail(400, { followError: 'Ugyldig profil.' });
    const [target] = await db.select({ id: profiles.userId }).from(profiles).where(eq(profiles.userId, targetId)).limit(1);
    if (!target) return fail(404, { followError: 'Profilen finnes ikke.' });
    const [existing] = await db.select({ status: follows.status }).from(follows)
      .where(and(eq(follows.followerId, locals.user.id), eq(follows.followedId, targetId))).limit(1);
    if (existing?.status === 'blocked') return fail(403, { followError: 'Denne profilen kan ikke følges.' });
    if (existing?.status === 'pending') return { requestedId: targetId };
    await db.insert(follows).values({ followerId: locals.user.id, followedId: targetId, status: 'accepted' })
      .onDuplicateKeyUpdate({ set: { status: 'accepted' } });
    return { followedId: targetId };
  },
  unfollow: async ({ request, locals }) => {
    if (!locals.user) redirect(303, '/login');
    const targetId = (await request.formData()).get('targetId');
    if (typeof targetId !== 'string') return fail(400, { followError: 'Ugyldig profil.' });
    await db.delete(follows).where(and(eq(follows.followerId, locals.user.id), eq(follows.followedId, targetId), ne(follows.status, 'blocked')));
    return { unfollowedId: targetId };
  },
  logout: async ({ cookies }) => {
    const token = cookies.get(SESSION_COOKIE);
    if (token) await deleteSession(token);
    cookies.delete(SESSION_COOKIE, { path: '/' });
    redirect(303, '/login');
  }
};
