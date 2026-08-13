import { like, or } from 'drizzle-orm';
import { error, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { profiles } from '$lib/server/db/schema';
import { deleteSession, SESSION_COOKIE } from '$lib/server/auth';
import type { Actions, PageServerLoad } from './$types';

const sections = new Set(['sok', 'utforsk', 'videoer', 'meldinger', 'varsler', 'profil']);

export const load: PageServerLoad = async ({ params, url, locals }) => {
  if (!sections.has(params.section)) error(404, 'Siden finnes ikke');
  if (!locals.user) redirect(303, `/login?next=/${params.section}`);

  const query = url.searchParams.get('q')?.trim().slice(0, 60) ?? '';
  let results: Array<{ userId: string; realName: string; username: string }> = [];
  if (params.section === 'sok' && query) {
    results = await db.select({ userId: profiles.userId, realName: profiles.realName, username: profiles.username })
      .from(profiles)
      .where(or(like(profiles.username, `%${query}%`), like(profiles.realName, `%${query}%`)))
      .limit(20);
  }

  return { section: params.section, user: locals.user, query, results };
};

export const actions: Actions = {
  logout: async ({ cookies }) => {
    const token = cookies.get(SESSION_COOKIE);
    if (token) await deleteSession(token);
    cookies.delete(SESSION_COOKIE, { path: '/' });
    redirect(303, '/login');
  }
};
