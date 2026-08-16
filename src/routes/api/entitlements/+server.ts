import { json } from '@sveltejs/kit';
import { getUserEntitlements } from '$lib/server/subscriptions';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.user) {
    return json({ planCode: 'free', originalImageQuality: false });
  }
  const entitlements = await getUserEntitlements(locals.user.id);
  return json({ planCode: entitlements.planCode, originalImageQuality: entitlements.originalImageQuality });
};
