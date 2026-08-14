import { and, eq, inArray, like, ne, or } from 'drizzle-orm';
import { error, fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { follows, profiles } from '$lib/server/db/schema';
import { deleteSession, SESSION_COOKIE } from '$lib/server/auth';
import type { Actions, PageServerLoad } from './$types';

const publicSections = new Set(['om', 'personvern', 'vilkar', 'hjelp']);
const sections = new Set(['sok', 'utforsk', 'videoer', 'meldinger', 'varsler', 'profil', ...publicSections]);

export const load: PageServerLoad = async ({ params, url, locals }) => {
  if (!sections.has(params.section)) error(404, 'Siden finnes ikke');
  if (!locals.user && !publicSections.has(params.section)) redirect(303, `/login?next=/${params.section}`);

  const query = url.searchParams.get('q')?.trim().slice(0, 60) ?? '';
  let results: Array<{ userId: string; realName: string; username: string; isFollowing: boolean }> = [];
  if (params.section === 'sok' && query) {
    const matches = await db.select({ userId: profiles.userId, realName: profiles.realName, username: profiles.username })
      .from(profiles)
      .where(and(ne(profiles.userId, locals.user!.id), or(like(profiles.username, `%${query}%`), like(profiles.realName, `%${query}%`))))
      .limit(20);
    const followedIds = matches.length
      ? await db.select({ id: follows.followedId }).from(follows).where(and(eq(follows.followerId, locals.user!.id), inArray(follows.followedId, matches.map((match) => match.userId)), eq(follows.status, 'accepted')))
      : [];
    const following = new Set(followedIds.map((row) => row.id));
    results = matches.map((match) => ({ ...match, isFollowing: following.has(match.userId) }));
  }

  return { section: params.section, user: locals.user, query, results };
};

export const actions: Actions = {
  follow: async ({ request, locals }) => {
    if (!locals.user) redirect(303, '/login');
    const targetId = (await request.formData()).get('targetId');
    if (typeof targetId !== 'string' || targetId === locals.user.id) return fail(400, { followError: 'Ugyldig profil.' });
    const [target] = await db.select({ id: profiles.userId }).from(profiles).where(eq(profiles.userId, targetId)).limit(1);
    if (!target) return fail(404, { followError: 'Profilen finnes ikke.' });
    await db.insert(follows).values({ followerId: locals.user.id, followedId: targetId, status: 'accepted' })
      .onDuplicateKeyUpdate({ set: { status: 'accepted' } });
    return { followedId: targetId };
  },
  unfollow: async ({ request, locals }) => {
    if (!locals.user) redirect(303, '/login');
    const targetId = (await request.formData()).get('targetId');
    if (typeof targetId !== 'string') return fail(400, { followError: 'Ugyldig profil.' });
    await db.delete(follows).where(and(eq(follows.followerId, locals.user.id), eq(follows.followedId, targetId)));
    return { unfollowedId: targetId };
  },
  logout: async ({ cookies }) => {
    const token = cookies.get(SESSION_COOKIE);
    if (token) await deleteSession(token);
    cookies.delete(SESSION_COOKIE, { path: '/' });
    redirect(303, '/login');
  }
};
