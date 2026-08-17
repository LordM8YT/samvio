import { randomUUID } from 'node:crypto';
import { compare, hash } from 'bcryptjs';
import { and, desc, eq, gt } from 'drizzle-orm';
import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { postMedia, posts, profiles, sessions, userBlocks, userPreferences, users } from '$lib/server/db/schema';
import { deleteSession, SESSION_COOKIE } from '$lib/server/auth';
import { removeUploadChecked, saveUpload } from '$lib/server/storage';
import { getUserEntitlements, getUserStorageUsage } from '$lib/server/subscriptions';
import { consumeRateLimit } from '$lib/server/rate-limit';
import type { Actions, PageServerLoad } from './$types';

const settingsCategories = new Set([
  'oversikt',
  'profil',
  'konto',
  'personvern',
  'sikkerhet',
  'varsler',
  'feed',
  'blokkering',
  'lagring',
  'data',
  'tilgjengelighet',
  'hjelp',
  'kontoadministrasjon'
]);

async function cleanupUploads(storageKeys: string[], event: string) {
  if (!storageKeys.length) return 0;
  const results = await Promise.allSettled(storageKeys.map((storageKey) => removeUploadChecked(storageKey)));
  const failed = results.filter((result) => result.status === 'rejected').length;
  if (failed) console.warn(JSON.stringify({ event, failed, total: storageKeys.length }));
  return failed;
}

export const load: PageServerLoad = async ({ locals, url }) => {
  if (!locals.user) redirect(303, '/login?next=/innstillinger');

  const requestedCategory = url.searchParams.get('kategori') ?? 'oversikt';
  const category = settingsCategories.has(requestedCategory) ? requestedCategory : 'oversikt';

  const [profile, savedPreferences, entitlements, blockedUsers, activeSessions] = await Promise.all([
    db.select({
      bio: profiles.bio,
      avatarPath: profiles.avatarPath,
      coverPath: profiles.coverPath,
      profileVisibility: profiles.profileVisibility
    }).from(profiles).where(eq(profiles.userId, locals.user.id)).limit(1).then((rows) => rows[0]),
    db.select().from(userPreferences).where(eq(userPreferences.userId, locals.user.id)).limit(1).then((rows) => rows[0]),
    getUserEntitlements(locals.user.id),
    db.select({
      userId: profiles.userId,
      realName: profiles.realName,
      username: profiles.username,
      createdAt: userBlocks.createdAt
    }).from(userBlocks)
      .innerJoin(profiles, eq(profiles.userId, userBlocks.blockedId))
      .where(eq(userBlocks.blockerId, locals.user.id))
      .orderBy(desc(userBlocks.createdAt))
      .limit(200),
    db.select({ createdAt: sessions.createdAt, expiresAt: sessions.expiresAt })
      .from(sessions)
      .where(and(eq(sessions.userId, locals.user.id), gt(sessions.expiresAt, new Date())))
      .orderBy(desc(sessions.createdAt))
      .limit(50)
  ]);

  const storageUsage = category === 'oversikt' || category === 'lagring'
    ? await getUserStorageUsage(locals.user.id)
    : null;

  return {
    user: locals.user,
    category,
    profileBio: profile?.bio ?? null,
    profileVisibility: profile?.profileVisibility ?? 'private',
    profileImages: { avatar: !!profile?.avatarPath, cover: !!profile?.coverPath },
    preferences: {
      hideCommercialContent: savedPreferences?.hideCommercialContent ?? false,
      notifyFollows: savedPreferences?.notifyFollows ?? true,
      notifyComments: savedPreferences?.notifyComments ?? true,
      notifyReactions: savedPreferences?.notifyReactions ?? true
    },
    blockedUsers,
    activeSessions,
    entitlements,
    storageUsage
  };
};

export const actions: Actions = {
  updateProfile: async ({ request, locals }) => {
    if (!locals.user) redirect(303, '/login');
    const form = await request.formData();
    const bioValue = form.get('bio');
    if (typeof bioValue !== 'string') return fail(400, { profileError: 'Ugyldig profiltekst.' });

    const bio = bioValue.trim();
    if (bio.length > 300) return fail(400, { profileError: 'Profilteksten kan være maks 300 tegn.' });

    const [current] = await db.select({ avatarPath: profiles.avatarPath, coverPath: profiles.coverPath })
      .from(profiles).where(eq(profiles.userId, locals.user.id)).limit(1);
    const allowedTypes = new Map([['image/jpeg', 'jpg'], ['image/png', 'png'], ['image/webp', 'webp']]);
    const uploads: Array<{ field: 'avatarPath' | 'coverPath'; file: File; oldPath: string | null; storageKey: string }> = [];

    for (const [name, field, oldPath] of [['avatar', 'avatarPath', current?.avatarPath], ['cover', 'coverPath', current?.coverPath]] as const) {
      const file = form.get(name);
      if (!(file instanceof File) || file.size === 0) continue;
      const extension = allowedTypes.get(file.type);
      if (!extension || file.size > 25 * 1024 * 1024) return fail(400, { profileError: 'Bruk JPG, PNG eller WebP på maks 25 MB.' });
      uploads.push({ field, file, oldPath: oldPath ?? null, storageKey: `${randomUUID()}.${extension}` });
    }

    const savedKeys: string[] = [];
    try {
      for (const item of uploads) {
        await saveUpload(item.storageKey, new Uint8Array(await item.file.arrayBuffer()));
        savedKeys.push(item.storageKey);
      }
      const imageValues = Object.fromEntries(uploads.map((item) => [item.field, item.storageKey]));
      await db.update(profiles).set({ bio: bio || null, ...imageValues }).where(eq(profiles.userId, locals.user.id));
    } catch (error) {
      const cleanupFailures = await cleanupUploads(savedKeys, 'profile_upload_rollback_failed');
      console.error(JSON.stringify({
        event: 'profile_update_failed',
        cleanupFailures,
        error: error instanceof Error ? error.message : 'unknown'
      }));
      return fail(503, { profileError: 'Profilen kunne ikke lagres akkurat nå. Prøv igjen.' });
    }

    await cleanupUploads(
      uploads.flatMap((item) => item.oldPath ? [item.oldPath] : []),
      'profile_old_media_cleanup_failed'
    );
    return { profileSaved: true };
  },

  updateIdentity: async ({ request, locals }) => {
    if (!locals.user) redirect(303, '/login');
    const form = await request.formData();
    const realNameValue = form.get('realName');
    const usernameValue = form.get('username');
    if (typeof realNameValue !== 'string' || typeof usernameValue !== 'string') return fail(400, { accountError: 'Kontroller navn og brukernavn.' });

    const realName = realNameValue.trim();
    const username = usernameValue.trim().toLowerCase();
    if (realName.length < 2 || realName.length > 120) return fail(400, { accountError: 'Navnet må være mellom 2 og 120 tegn.' });
    if (!/^[a-z0-9_]{3,30}$/.test(username)) return fail(400, { accountError: 'Brukernavn må være 3–30 tegn og kan bare inneholde små bokstaver, tall og _.' });

    try {
      await db.update(profiles).set({ realName, username }).where(eq(profiles.userId, locals.user.id));
      return { accountSaved: true };
    } catch {
      return fail(409, { accountError: 'Kunne ikke lagre. Brukernavnet kan allerede være i bruk.' });
    }
  },

  updatePrivacy: async ({ request, locals }) => {
    if (!locals.user) redirect(303, '/login');
    const profileVisibility = (await request.formData()).get('profileVisibility');
    if (profileVisibility !== 'private' && profileVisibility !== 'public') return fail(400, { privacyError: 'Velg en gyldig profilinnstilling.' });
    await db.update(profiles).set({ profileVisibility }).where(eq(profiles.userId, locals.user.id));
    return { privacySaved: true };
  },

  updateNotifications: async ({ request, locals }) => {
    if (!locals.user) redirect(303, '/login');
    const form = await request.formData();
    const values = {
      notifyFollows: form.get('notifyFollows') === 'on',
      notifyComments: form.get('notifyComments') === 'on',
      notifyReactions: form.get('notifyReactions') === 'on'
    };
    await db.insert(userPreferences).values({ userId: locals.user.id, ...values })
      .onDuplicateKeyUpdate({ set: values });
    return { notificationsSaved: true };
  },

  updateFeed: async ({ request, locals }) => {
    if (!locals.user) redirect(303, '/login');
    const form = await request.formData();
    const values = { hideCommercialContent: form.get('hideCommercialContent') === 'on' };
    await db.insert(userPreferences).values({ userId: locals.user.id, ...values })
      .onDuplicateKeyUpdate({ set: values });
    return { feedSaved: true };
  },

  unblock: async ({ request, locals }) => {
    if (!locals.user) redirect(303, '/login');
    const targetId = (await request.formData()).get('targetId');
    if (typeof targetId !== 'string') return fail(400, { unblockError: 'Ugyldig bruker.' });
    await db.delete(userBlocks).where(and(eq(userBlocks.blockerId, locals.user.id), eq(userBlocks.blockedId, targetId)));
    return { unblocked: true };
  },

  changePassword: async ({ request, locals, cookies, getClientAddress }) => {
    if (!locals.user) redirect(303, '/login');
    const rate = consumeRateLimit(`password-change:${locals.user.id}:${getClientAddress()}`, 5, 15 * 60_000);
    if (!rate.allowed) return fail(429, { passwordError: 'For mange forsøk. Vent litt og prøv igjen.' });

    const form = await request.formData();
    const currentPassword = form.get('currentPassword');
    const newPassword = form.get('newPassword');
    const confirmPassword = form.get('confirmPassword');
    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string' || typeof confirmPassword !== 'string') return fail(400, { passwordError: 'Fyll ut alle passordfeltene.' });
    if (newPassword.length < 8 || newPassword.length > 128) return fail(400, { passwordError: 'Nytt passord må være mellom 8 og 128 tegn.' });
    if (newPassword !== confirmPassword) return fail(400, { passwordError: 'De nye passordene er ikke like.' });
    if (currentPassword === newPassword) return fail(400, { passwordError: 'Velg et nytt passord.' });

    const [account] = await db.select({ passwordHash: users.passwordHash }).from(users).where(eq(users.id, locals.user.id)).limit(1);
    if (!account?.passwordHash) return fail(400, { passwordError: 'Denne kontoen bruker ikke passordinnlogging.' });
    if (!(await compare(currentPassword, account.passwordHash))) return fail(400, { passwordError: 'Nåværende passord er feil.' });

    const passwordHash = await hash(newPassword, 12);
    await db.transaction(async (tx) => {
      await tx.update(users).set({ passwordHash }).where(eq(users.id, locals.user!.id));
      await tx.delete(sessions).where(eq(sessions.userId, locals.user!.id));
    });
    cookies.delete(SESSION_COOKIE, { path: '/' });
    redirect(303, '/login?password_changed=1');
  },

  logoutAll: async ({ locals, cookies }) => {
    if (!locals.user) redirect(303, '/login');
    await db.delete(sessions).where(eq(sessions.userId, locals.user.id));
    cookies.delete(SESSION_COOKIE, { path: '/' });
    redirect(303, '/login?logged_out=all');
  },

  logout: async ({ cookies }) => {
    const token = cookies.get(SESSION_COOKIE);
    if (token) await deleteSession(token);
    cookies.delete(SESSION_COOKIE, { path: '/' });
    redirect(303, '/login');
  },

  deleteAccount: async ({ request, locals, cookies }) => {
    if (!locals.user) redirect(303, '/login');
    const confirmation = (await request.formData()).get('confirmation');
    if (confirmation !== 'SLETT') return fail(400, { deleteError: 'Skriv SLETT for å bekrefte.' });

    const [media, profile] = await Promise.all([
      db.select({ storageKey: postMedia.storageKey }).from(postMedia)
        .innerJoin(posts, eq(posts.id, postMedia.postId)).where(eq(posts.authorId, locals.user.id)),
      db.select({ avatarPath: profiles.avatarPath, coverPath: profiles.coverPath })
        .from(profiles).where(eq(profiles.userId, locals.user.id)).limit(1).then((rows) => rows[0])
    ]);
    const files = [...media.map((item) => item.storageKey), profile?.avatarPath, profile?.coverPath].filter((value): value is string => !!value);

    await db.delete(users).where(eq(users.id, locals.user.id));
    await cleanupUploads(files, 'account_media_cleanup_failed');
    cookies.delete(SESSION_COOKIE, { path: '/' });
    redirect(303, '/login?deleted=1');
  }
};
