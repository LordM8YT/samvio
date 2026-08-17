import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = () => {
  const vippsReady = env.VIPPS_PAYMENTS_ENABLED === 'true' && Boolean(env.VIPPS_WEBHOOK_SECRET);
  return new Response(`ok\nvipps_payments=${vippsReady ? 'ready' : 'disabled'}\n`, {
    headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' }
  });
};
