import { eq } from 'drizzle-orm';
import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) redirect(303, '/login?next=/inviter');
  if (!locals.user.username) redirect(303, '/kom-i-gang');

  const invitedUsers = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.referredByUserId, locals.user.id))
    .catch(() => []);

  return {
    user: { ...locals.user, username: locals.user.username },
    invitedCount: invitedUsers.length
  };
};
