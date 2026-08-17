import { createHash, randomBytes } from 'node:crypto';
import { and, eq, gt, lte } from 'drizzle-orm';
import { db } from './db';
import { profiles, sessions, users } from './db/schema';

export const SESSION_COOKIE = 'samvio_session';
const secureCookie = process.env.AUTH_COOKIE_SECURE === 'true'
  || (process.env.AUTH_COOKIE_SECURE !== 'false' && process.env.NODE_ENV === 'production');
export const sessionCookieOptions = { path: '/', httpOnly: true, sameSite: 'lax' as const, secure: secureCookie, maxAge: 60 * 60 * 24 * 30 };
const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export async function createSession(userId: string) {
  const token = randomBytes(32).toString('base64url');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + sessionCookieOptions.maxAge * 1000);
  await db.delete(sessions).where(and(eq(sessions.userId, userId), lte(sessions.expiresAt, now)));
  await db.insert(sessions).values({ id: hashToken(token), userId, expiresAt });
  return token;
}

export async function getSessionUser(token: string) {
  const [row] = await db.select({ id: users.id, email: users.email, username: profiles.username, realName: profiles.realName, role: users.accountRole, status: users.accountStatus, lastSeenAt: users.lastSeenAt })
    .from(sessions).innerJoin(users, eq(sessions.userId, users.id)).leftJoin(profiles, eq(profiles.userId, users.id))
    .where(and(eq(sessions.id, hashToken(token)), gt(sessions.expiresAt, new Date()))).limit(1);
  if (!row || row.status !== 'active') return null;
  if (!row.lastSeenAt || row.lastSeenAt.getTime() < Date.now() - 5 * 60_000) {
    try {
      await db.update(users).set({ lastSeenAt: new Date() }).where(eq(users.id, row.id));
    } catch (error) {
      console.warn(JSON.stringify({ event: 'last_seen_update_failed', errorName: error instanceof Error ? error.name : 'UnknownError' }));
    }
  }
  const { status: _status, lastSeenAt: _lastSeenAt, ...user } = row;
  return user;
}

export async function deleteSession(token: string) { await db.delete(sessions).where(eq(sessions.id, hashToken(token))); }
