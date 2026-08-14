import { createHash, randomBytes } from 'node:crypto';
import { and, eq, gt } from 'drizzle-orm';
import { db } from './db';
import { profiles, sessions, users } from './db/schema';

export const SESSION_COOKIE = 'samvio_session';
export const sessionCookieOptions = { path: '/', httpOnly: true, sameSite: 'lax' as const, secure: process.env.AUTH_COOKIE_SECURE === 'true', maxAge: 60 * 60 * 24 * 30 };
const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export async function createSession(userId: string) {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + sessionCookieOptions.maxAge * 1000);
  await db.insert(sessions).values({ id: hashToken(token), userId, expiresAt });
  return token;
}

export async function getSessionUser(token: string) {
  const [row] = await db.select({ id: users.id, email: users.email, username: profiles.username, realName: profiles.realName, role: users.accountRole })
    .from(sessions).innerJoin(users, eq(sessions.userId, users.id)).leftJoin(profiles, eq(profiles.userId, users.id))
    .where(and(eq(sessions.id, hashToken(token)), gt(sessions.expiresAt, new Date()))).limit(1);
  return row ?? null;
}

export async function deleteSession(token: string) { await db.delete(sessions).where(eq(sessions.id, hashToken(token))); }
