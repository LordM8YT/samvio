import { createHash, randomBytes } from 'node:crypto';
import { error, redirect } from '@sveltejs/kit';
import { getVippsLoginConfig, isVippsLoginEnabled } from '$lib/server/vipps/config';
import { getLoginDiscovery } from '$lib/server/vipps/login';
import type { RequestHandler } from './$types';

const oauthCookie = { path: '/auth/vipps', httpOnly: true, sameSite: 'lax' as const, secure: process.env.AUTH_COOKIE_SECURE === 'true', maxAge: 10 * 60 };
const safeNext = (value: string | null) => value?.startsWith('/') && !value.startsWith('//') ? value : '/';

export const GET: RequestHandler = async ({ cookies, url, locals }) => {
  if (locals.user) redirect(303, safeNext(url.searchParams.get('next')));
  if (!isVippsLoginEnabled()) error(503, 'Vipps Logg inn er ikke aktivert ennå.');
  const config = getVippsLoginConfig();
  const discovery = await getLoginDiscovery();
  const state = randomBytes(32).toString('base64url');
  const nonce = randomBytes(32).toString('base64url');
  const verifier = randomBytes(64).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  cookies.set('samvio_vipps_state', state, oauthCookie);
  cookies.set('samvio_vipps_nonce', nonce, oauthCookie);
  cookies.set('samvio_vipps_verifier', verifier, oauthCookie);
  cookies.set('samvio_vipps_next', safeNext(url.searchParams.get('next')), oauthCookie);
  const authorizationUrl = new URL(discovery.authorization_endpoint);
  authorizationUrl.search = new URLSearchParams({
    client_id: config.clientId,
    response_type: 'code',
    scope: 'openid name email birthDate',
    state,
    nonce,
    redirect_uri: config.redirectUri,
    code_challenge: challenge,
    code_challenge_method: 'S256'
  }).toString();
  redirect(303, authorizationUrl.toString());
};
