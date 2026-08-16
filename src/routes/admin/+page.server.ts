import { readdir, stat, statfs } from 'node:fs/promises';
import { arch, cpus, freemem, hostname, loadavg, platform, release, totalmem, uptime } from 'node:os';
import { and, count, desc, eq, gte, inArray, like, or } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { acquisitionDaily, comments, contentReports, postMedia, posts, profiles, subscriptions, users } from '$lib/server/db/schema';
import { removeUpload, uploadDirectory } from '$lib/server/storage';
import type { Actions, PageServerLoad } from './$types';

async function directorySize(path: string): Promise<number> {
  const entries = await readdir(path, { withFileTypes: true }).catch(() => []);
  const sizes = await Promise.all(entries.map(async (entry) => {
    const fullPath = `${path}/${entry.name}`;
    return entry.isDirectory() ? directorySize(fullPath) : (await stat(fullPath).catch(() => null))?.size ?? 0;
  }));
  return sizes.reduce((sum, size) => sum + size, 0);
}

export const load: PageServerLoad = async ({ url }) => {
  const query = url.searchParams.get('q')?.trim().slice(0, 80) ?? '';
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const acquisitionSince = new Date(Date.now() - 13 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const userFilter = query ? or(like(profiles.realName, `%${query}%`), like(profiles.username, `%${query}%`), like(users.email, `%${query}%`)) : undefined;

  const [statsRows, userRows, reportRows, storageBytes, disk, acquisitionRows] = await Promise.all([
    Promise.all([
      db.select({ value: count() }).from(users).where(gte(users.lastSeenAt, since)),
      db.select({ value: count() }).from(posts),
      db.select({ value: count() }).from(contentReports).where(eq(contentReports.status, 'open')),
      db.select({ value: count() }).from(users)
    ]),
    db.select({ id: users.id, email: users.email, status: users.accountStatus, role: users.accountRole, mutedUntil: users.mutedUntil, lastSeenAt: users.lastSeenAt, createdAt: users.createdAt, realName: profiles.realName, username: profiles.username })
      .from(users).innerJoin(profiles, eq(profiles.userId, users.id)).where(userFilter).orderBy(desc(users.createdAt)).limit(100),
    db.select({ id: contentReports.id, targetType: contentReports.targetType, targetId: contentReports.targetId, reason: contentReports.reason, details: contentReports.details, status: contentReports.status, createdAt: contentReports.createdAt, reporterName: profiles.realName, reporterUsername: profiles.username })
      .from(contentReports).innerJoin(profiles, eq(profiles.userId, contentReports.reporterId)).orderBy(desc(contentReports.createdAt)).limit(100),
    directorySize(uploadDirectory()),
    statfs(uploadDirectory()).catch(() => null),
    db.select().from(acquisitionDaily).where(gte(acquisitionDaily.eventDate, acquisitionSince)).orderBy(desc(acquisitionDaily.eventDate))
  ]);

  const userIds = userRows.map((user) => user.id);
  const subscriberRows = userIds.length ? await db.select({ userId: subscriptions.userId }).from(subscriptions)
    .where(and(inArray(subscriptions.userId, userIds), inArray(subscriptions.status, ['trialing', 'active']))) : [];
  const subscribers = new Set(subscriberRows.flatMap((row) => row.userId ? [row.userId] : []));

  const postIds = reportRows.filter((report) => report.targetType === 'post').map((report) => report.targetId);
  const commentIds = reportRows.filter((report) => report.targetType === 'comment').map((report) => report.targetId);
  const targetUserIds = reportRows.filter((report) => report.targetType === 'user').map((report) => report.targetId);
  const [postTargets, commentTargets, userTargets] = await Promise.all([
    postIds.length ? db.select({ id: posts.id, text: posts.caption, author: profiles.realName }).from(posts).innerJoin(profiles, eq(profiles.userId, posts.authorId)).where(inArray(posts.id, postIds)) : [],
    commentIds.length ? db.select({ id: comments.id, text: comments.body, author: profiles.realName }).from(comments).innerJoin(profiles, eq(profiles.userId, comments.authorId)).where(inArray(comments.id, commentIds)) : [],
    targetUserIds.length ? db.select({ id: profiles.userId, text: profiles.username, author: profiles.realName }).from(profiles).where(inArray(profiles.userId, targetUserIds)) : []
  ]);
  const targets = new Map([...postTargets, ...commentTargets, ...userTargets].map((target) => [target.id, target]));
  const acquisitionBySource = new Map<string, { visits: number; registrations: number }>();
  for (const row of acquisitionRows) {
    const current = acquisitionBySource.get(row.source) ?? { visits: 0, registrations: 0 };
    current.visits += row.visits;
    current.registrations += row.registrations;
    acquisitionBySource.set(row.source, current);
  }
  const acquisition = [...acquisitionBySource]
    .map(([source, values]) => ({ source, ...values, conversion: values.visits ? values.registrations / values.visits * 100 : null }))
    .sort((a, b) => b.visits - a.visits || b.registrations - a.registrations);
  const acquisitionSummary = acquisition.reduce((summary, source) => ({
    visits: summary.visits + source.visits,
    registrations: summary.registrations + source.registrations,
    sources: summary.sources + 1
  }), { visits: 0, registrations: 0, sources: 0 });

  return {
    query,
    stats: { active24: statsRows[0][0].value, posts: statsRows[1][0].value, reports: statsRows[2][0].value, users: statsRows[3][0].value },
    acquisition,
    acquisitionSummary,
    users: userRows.map((user) => ({ ...user, subscriber: subscribers.has(user.id) })),
    reports: reportRows.map((report) => ({ ...report, target: targets.get(report.targetId) ?? null })),
    storage: { bytes: storageBytes, limitBytes: disk ? disk.blocks * disk.bsize : 38 * 1024 * 1024 * 1024 },
    system: {
      hostname: hostname(), platform: platform(), release: release(), arch: arch(),
      uptimeSeconds: uptime(), cpuCount: cpus().length, cpuModel: cpus()[0]?.model ?? 'Ukjent CPU',
      load: loadavg(), memoryTotal: totalmem(), memoryFree: freemem(), processMemory: process.memoryUsage().rss,
      diskTotal: disk ? disk.blocks * disk.bsize : 0, diskFree: disk ? disk.bavail * disk.bsize : 0,
      nodeVersion: process.version
    }
  };
};

export const actions: Actions = {
  userAction: async ({ request, locals }) => {
    if (!locals.user || locals.user.role !== 'admin') return fail(403, { adminError: 'Ingen tilgang.' });
    const form = await request.formData();
    const userId = form.get('userId');
    const operation = form.get('operation');
    if (typeof userId !== 'string' || typeof operation !== 'string') return fail(400, { adminError: 'Ugyldig handling.' });
    if (userId === locals.user.id && ['ban', 'role'].includes(operation)) return fail(400, { adminError: 'Du kan ikke sperre eller endre din egen administratorrolle.' });
    if (operation === 'mute') await db.update(users).set({ mutedUntil: new Date(Date.now() + 24 * 60 * 60 * 1000) }).where(eq(users.id, userId));
    else if (operation === 'unmute') await db.update(users).set({ mutedUntil: null }).where(eq(users.id, userId));
    else if (operation === 'ban') await db.update(users).set({ accountStatus: 'suspended' }).where(eq(users.id, userId));
    else if (operation === 'unban') await db.update(users).set({ accountStatus: 'active' }).where(eq(users.id, userId));
    else if (operation === 'role') {
      const role = form.get('role');
      if (role !== 'user' && role !== 'moderator' && role !== 'admin') return fail(400, { adminError: 'Ugyldig rolle.' });
      await db.update(users).set({ accountRole: role }).where(eq(users.id, userId));
    } else return fail(400, { adminError: 'Ukjent handling.' });
    return { adminSuccess: 'Brukeren ble oppdatert.' };
  },
  moderate: async ({ request, locals }) => {
    if (!locals.user || locals.user.role !== 'admin') return fail(403, { adminError: 'Ingen tilgang.' });
    const form = await request.formData();
    const reportId = form.get('reportId');
    const operation = form.get('operation');
    if (typeof reportId !== 'string' || !['approve', 'hide', 'delete'].includes(String(operation))) return fail(400, { adminError: 'Ugyldig modereringshandling.' });
    const [report] = await db.select({ targetType: contentReports.targetType, targetId: contentReports.targetId }).from(contentReports).where(eq(contentReports.id, reportId)).limit(1);
    if (!report) return fail(404, { adminError: 'Rapporten finnes ikke.' });
    if (operation === 'delete' && report.targetType === 'post') {
      const media = await db.select({ storageKey: postMedia.storageKey }).from(postMedia).where(eq(postMedia.postId, report.targetId));
      await db.delete(posts).where(eq(posts.id, report.targetId));
      await Promise.allSettled(media.map((item) => removeUpload(item.storageKey)));
    } else if (operation === 'delete' && report.targetType === 'comment') await db.delete(comments).where(eq(comments.id, report.targetId));
    else if (operation === 'delete' && report.targetType === 'user') await db.update(users).set({ accountStatus: 'suspended' }).where(eq(users.id, report.targetId));
    else if (report.targetType === 'post') await db.update(posts).set({ moderationStatus: operation === 'hide' ? 'hidden' : 'visible' }).where(eq(posts.id, report.targetId));
    else if (report.targetType === 'comment') await db.update(comments).set({ moderationStatus: operation === 'hide' ? 'hidden' : 'visible' }).where(eq(comments.id, report.targetId));
    const reportStatus = operation === 'approve' ? 'approved' : operation === 'hide' ? 'hidden' : 'deleted';
    await db.update(contentReports).set({ status: reportStatus, resolvedBy: locals.user.id, resolvedAt: new Date() }).where(eq(contentReports.id, reportId));
    return { adminSuccess: 'Rapporten er behandlet.' };
  }
};
