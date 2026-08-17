import { compare, hash } from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { fail, isRedirect, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { createSession, sessionCookieOptions, SESSION_COOKIE } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { profiles, userPreferences, users } from '$lib/server/db/schema';
import { consumeRateLimit } from '$lib/server/rate-limit';
import { isVippsLoginEnabled } from '$lib/server/vipps/config';
import { readAcquisition, recordLandingVisit, recordRegistration } from '$lib/server/acquisition';
import type { Actions, PageServerLoad } from './$types';

const loginSchema = z.object({ email: z.string().trim().email().transform((v) => v.toLowerCase()), password: z.string().min(8).max(128) });
const registerSchema = loginSchema.extend({ realName: z.string().trim().min(2).max(120), username: z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,30}$/), birthDate: z.coerce.date().max(new Date()) });
const nextPath = (url: URL, fallback = '/') => { const next = url.searchParams.get('next'); return next?.startsWith('/') && !next.startsWith('//') ? next : fallback; };

export const load: PageServerLoad = async ({ cookies, locals, url }) => {
  if (locals.user) redirect(303, nextPath(url));
  const registerMode = url.searchParams.get('ny') === '1';
  if (registerMode) {
    const acquisition = readAcquisition(cookies);
    await recordLandingVisit(cookies, acquisition.source).catch(() => undefined);
  }
  return { vippsLoginEnabled: isVippsLoginEnabled(), vippsError: url.searchParams.get('vipps_error'), next: nextPath(url), registerMode };
};

export const actions: Actions = {
  login: async ({ request, cookies, getClientAddress, url }) => {
    const parsed = loginSchema.safeParse(Object.fromEntries(await request.formData()));
    if (!parsed.success) return fail(400, { mode: 'login', message: 'Kontroller e-post og passord.' });
    const rate = consumeRateLimit(`login:${getClientAddress()}:${parsed.data.email}`, 5, 15 * 60_000);
    if (!rate.allowed) return fail(429, { mode: 'login', message: 'For mange forsøk. Vent litt og prøv igjen.' });
    try {
      const [user] = await db.select().from(users).where(eq(users.email, parsed.data.email)).limit(1);
      if (!user?.passwordHash || !(await compare(parsed.data.password, user.passwordHash))) return fail(400, { mode: 'login', message: 'Feil e-post eller passord.' });
      if (user.accountStatus !== 'active') return fail(403, { mode: 'login', message: 'Denne kontoen kan ikke logge inn akkurat nå.' });
      const token = await createSession(user.id); cookies.set(SESSION_COOKIE, token, sessionCookieOptions); redirect(303, nextPath(url));
    } catch (error) { if (isRedirect(error)) throw error; return fail(503, { mode: 'login', message: 'Databasen er ikke tilgjengelig akkurat nå.' }); }
  },
  register: async ({ request, cookies, getClientAddress, url }) => {
    const rate = consumeRateLimit(`register:${getClientAddress()}`, 3, 60 * 60_000);
    if (!rate.allowed) return fail(429, { mode: 'register', message: 'For mange registreringsforsøk. Prøv igjen senere.' });
    const parsed = registerSchema.safeParse(Object.fromEntries(await request.formData()));
    if (!parsed.success) return fail(400, { mode: 'register', message: 'Kontroller alle feltene. Brukernavn må være små bokstaver.' });
    const age = Math.floor((Date.now() - parsed.data.birthDate.getTime()) / 31557600000);
    if (age < 13) return fail(400, { mode: 'register', message: 'Samvio alpha er foreløpig bare tilgjengelig fra 13 år.' });
    const ageBand = age < 13 ? 'child' : age < 18 ? 'teen' : 'adult';
    const id = randomUUID();
    const acquisition = readAcquisition(cookies);
    try {
      const [referrer] = acquisition.inviter ? await db.select({ userId: profiles.userId }).from(profiles).where(eq(profiles.username, acquisition.inviter)).limit(1) : [];
      await db.transaction(async (tx) => {
        await tx.insert(users).values({ id, email: parsed.data.email, passwordHash: await hash(parsed.data.password, 12), accountStatus: 'active', acquisitionSource: acquisition.source, referredByUserId: referrer?.userId ?? null });
        await tx.insert(profiles).values({ userId: id, realName: parsed.data.realName, username: parsed.data.username, ageBand });
        await tx.insert(userPreferences).values({ userId: id, hideCommercialContent: ageBand !== 'adult' });
      });
      await recordRegistration(acquisition.source).catch(() => undefined);
      const token = await createSession(id); cookies.set(SESSION_COOKIE, token, sessionCookieOptions); redirect(303, nextPath(url, '/kom-i-gang'));
    } catch (error) { if (isRedirect(error)) throw error; return fail(409, { mode: 'register', message: 'E-post eller brukernavn er allerede i bruk, eller databasen mangler.' }); }
  }
};
