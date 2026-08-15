import { sql } from 'drizzle-orm';
import type { Cookies } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { acquisitionDaily } from '$lib/server/db/schema';

export const ACQUISITION_SOURCE_COOKIE = 'samvio_source';
export const ACQUISITION_INVITER_COOKIE = 'samvio_inviter';
export const ACQUISITION_SEEN_COOKIE = 'samvio_acquisition_seen';

const SOURCE_PATTERN = /^[a-z0-9_-]{1,40}$/;
const USERNAME_PATTERN = /^[a-z0-9_]{3,30}$/;
const cookieOptions = {
  path: '/',
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  maxAge: 60 * 60 * 24 * 30
};

export function normalizeAcquisitionSource(value: string | null | undefined, fallback = 'direct') {
  const source = value?.trim().toLowerCase();
  return source && SOURCE_PATTERN.test(source) ? source : fallback;
}

export function normalizeInviter(value: string | null | undefined) {
  const username = value?.trim().toLowerCase();
  return username && USERNAME_PATTERN.test(username) ? username : null;
}

export function rememberAcquisition(cookies: Cookies, source: string, inviter: string | null) {
  cookies.set(ACQUISITION_SOURCE_COOKIE, source, cookieOptions);
  if (inviter) cookies.set(ACQUISITION_INVITER_COOKIE, inviter, cookieOptions);
}

export function readAcquisition(cookies: Cookies) {
  return {
    source: normalizeAcquisitionSource(cookies.get(ACQUISITION_SOURCE_COOKIE)),
    inviter: normalizeInviter(cookies.get(ACQUISITION_INVITER_COOKIE))
  };
}

export async function recordLandingVisit(cookies: Cookies, source: string) {
  const marker = `${new Date().toISOString().slice(0, 10)}:${source}`;
  if (cookies.get(ACQUISITION_SEEN_COOKIE) === marker) return;
  const eventDate = marker.slice(0, 10);
  await db.insert(acquisitionDaily).values({ eventDate, source, visits: 1, registrations: 0 })
    .onDuplicateKeyUpdate({ set: { visits: sql`${acquisitionDaily.visits} + 1` } });
  cookies.set(ACQUISITION_SEEN_COOKIE, marker, { ...cookieOptions, maxAge: 60 * 60 * 24 });
}

export async function recordRegistration(source: string) {
  const eventDate = new Date().toISOString().slice(0, 10);
  await db.insert(acquisitionDaily).values({ eventDate, source, visits: 0, registrations: 1 })
    .onDuplicateKeyUpdate({ set: { registrations: sql`${acquisitionDaily.registrations} + 1` } });
}
