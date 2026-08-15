import { randomUUID } from 'node:crypto';
import { eq, and } from 'drizzle-orm';
import { isRedirect, redirect } from '@sveltejs/kit';
import { createSession, sessionCookieOptions, SESSION_COOKIE } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { profiles, userPreferences, users, verifications } from '$lib/server/db/schema';
import { exchangeVippsCode, getVippsUserInfo } from '$lib/server/vipps/login';
import type { RequestHandler } from './$types';

const safeNext = (value: string | undefined) => value?.startsWith('/') && !value.startsWith('//') ? value : '/';
const cookiePath = { path: '/auth/vipps' };

function ageFromBirthdate(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const birth = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(birth.getTime()) || birth > new Date()) return null;
  const today = new Date();
  let age = today.getUTCFullYear() - birth.getUTCFullYear();
  if (today.getUTCMonth() < birth.getUTCMonth() || (today.getUTCMonth() === birth.getUTCMonth() && today.getUTCDate() < birth.getUTCDate())) age--;
  return age;
}

async function availableUsername(name: string) {
  const base = name.toLowerCase().replace(/æ/g, 'ae').replace(/ø/g, 'o').replace(/å/g, 'a').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 22) || 'samvio';
  for (let attempt = 0; attempt < 20; attempt++) {
    const candidate = attempt === 0 && base.length >= 3 ? base : `${base.slice(0, 22)}_${randomUUID().slice(0, 6)}`;
    const [taken] = await db.select({ id: profiles.userId }).from(profiles).where(eq(profiles.username, candidate)).limit(1);
    if (!taken) return candidate;
  }
  throw new Error('Kunne ikke opprette et ledig brukernavn.');
}

export const GET: RequestHandler = async ({ url, cookies }) => {
  const state = url.searchParams.get('state');
  const code = url.searchParams.get('code');
  const expectedState = cookies.get('samvio_vipps_state');
  const nonce = cookies.get('samvio_vipps_nonce');
  const verifier = cookies.get('samvio_vipps_verifier');
  const next = safeNext(cookies.get('samvio_vipps_next'));
  for (const name of ['samvio_vipps_state', 'samvio_vipps_nonce', 'samvio_vipps_verifier', 'samvio_vipps_next']) cookies.delete(name, cookiePath);
  if (url.searchParams.get('error')) redirect(303, `/login?vipps_error=${encodeURIComponent(url.searchParams.get('error_description') ?? 'Innloggingen ble avbrutt.')}`);
  if (!code || !state || !expectedState || !nonce || !verifier || state !== expectedState) redirect(303, '/login?vipps_error=Ugyldig%20eller%20utl%C3%B8pt%20innloggingsfors%C3%B8k.');

  try {
    const tokens = await exchangeVippsCode(code, verifier, nonce);
    const info = await getVippsUserInfo(tokens.accessToken);
    if (tokens.subject !== info.sub) throw new Error('Vipps subject samsvarer ikke.');
    const email = info.email?.trim().toLowerCase();
    if (!email || info.email_verified === false) throw new Error('Vipps-kontoen må dele en verifisert e-postadresse.');
    const [linked] = await db.select({ userId: verifications.userId }).from(verifications).where(and(eq(verifications.provider, 'vipps'), eq(verifications.providerSubject, info.sub), eq(verifications.status, 'verified'))).limit(1);
    let userId = linked?.userId;
    if (!userId) {
      const [existingUser] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
      userId = existingUser?.id;
      if (userId) {
        const [otherVipps] = await db.select({ subject: verifications.providerSubject }).from(verifications).where(and(eq(verifications.userId, userId), eq(verifications.provider, 'vipps'))).limit(1);
        if (otherVipps && otherVipps.subject !== info.sub) throw new Error('Kontoen er allerede koblet til en annen Vipps-bruker.');
      } else {
        const age = ageFromBirthdate(info.birthdate);
        if (age !== null && age < 13) throw new Error('Samvio alpha er foreløpig bare tilgjengelig fra 13 år.');
        const ageBand = age === null || age < 18 ? 'teen' : 'adult';
        userId = randomUUID();
        const realName = (info.name?.trim() || email.split('@')[0]).slice(0, 120);
        const username = await availableUsername(realName);
        await db.transaction(async (tx) => {
          await tx.insert(users).values({ id: userId!, email, passwordHash: null, accountStatus: 'active' });
          await tx.insert(profiles).values({ userId: userId!, realName, username, ageBand });
          await tx.insert(userPreferences).values({ userId: userId!, hideCommercialContent: ageBand !== 'adult' });
        });
      }
      await db.insert(verifications).values({ id: randomUUID(), userId, provider: 'vipps', providerSubject: info.sub, status: 'verified', birthDate: info.birthdate ?? null, assuranceLevel: 'vipps-login', identityVerifiedAt: new Date(), providerMetadata: { emailVerified: info.email_verified ?? null } });
    }
    const session = await createSession(userId);
    cookies.set(SESSION_COOKIE, session, sessionCookieOptions);
    redirect(303, next);
  } catch (error) {
    if (isRedirect(error)) throw error;
    console.error('Vipps login callback failed', error instanceof Error ? error.message : error);
    redirect(303, `/login?vipps_error=${encodeURIComponent(error instanceof Error ? error.message : 'Vipps-innloggingen feilet.')}`);
  }
};
