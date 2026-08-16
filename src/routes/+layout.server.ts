import { getRetentionWarning } from '$lib/server/retention';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
  const retentionWarning = locals.user
    ? await getRetentionWarning(locals.user.id).catch(() => null)
    : null;
  return { user: locals.user, retentionWarning };
};
