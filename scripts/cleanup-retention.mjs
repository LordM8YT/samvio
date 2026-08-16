import { unlink } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import mysql from 'mysql2/promise';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL mangler.');

const DAY_MS = 24 * 60 * 60 * 1000;
const FREE_RETENTION_DAYS = 365;
const PAID_RETENTION_DAYS = 5 * 365;
const GRACE_DAYS = 30;
const UPLOAD_DIR = resolve(process.env.UPLOAD_DIR ?? '/var/lib/samvio/uploads');
const dryRun = process.argv.includes('--dry-run');

const connection = await mysql.createConnection({ uri: process.env.DATABASE_URL });

function chunks(values, size = 100) {
  const result = [];
  for (let i = 0; i < values.length; i += size) result.push(values.slice(i, i + size));
  return result;
}

function placeholders(values) {
  return values.map(() => '?').join(',');
}

try {
  const now = new Date();
  const [paidRows] = await connection.query(`
    SELECT DISTINCT user_id AS userId
    FROM subscriptions
    WHERE user_id IS NOT NULL
      AND plan_code IN ('person', 'family')
      AND status IN ('active', 'past_due', 'canceled')
      AND current_period_end IS NOT NULL
      AND current_period_end > NOW()
  `);
  const paidUsers = new Set(paidRows.map((row) => row.userId));

  const [candidateRows] = await connection.query(`
    SELECT id, author_id AS authorId, created_at AS createdAt, retention_delete_after AS deleteAfter
    FROM posts
    WHERE created_at <= DATE_SUB(NOW(), INTERVAL 365 DAY)
       OR retention_delete_after IS NOT NULL
  `);

  const toSchedule = [];
  const toClear = [];
  const toDelete = [];

  for (const row of candidateRows) {
    const retentionDays = paidUsers.has(row.authorId) ? PAID_RETENTION_DAYS : FREE_RETENTION_DAYS;
    const retentionEnd = new Date(row.createdAt).getTime() + retentionDays * DAY_MS;
    const expiredByPolicy = retentionEnd <= now.getTime();
    const deleteAfter = row.deleteAfter ? new Date(row.deleteAfter) : null;

    if (!expiredByPolicy && deleteAfter) {
      toClear.push(row.id);
      continue;
    }
    if (!expiredByPolicy) continue;
    if (!deleteAfter) {
      toSchedule.push(row.id);
      continue;
    }
    if (deleteAfter.getTime() <= now.getTime()) toDelete.push(row.id);
  }

  console.log(`Retention: ${toSchedule.length} planlegges, ${toClear.length} kanselleres, ${toDelete.length} slettes.`);
  if (dryRun) {
    console.log('Dry-run: ingen data er endret.');
    process.exitCode = 0;
  } else {
    await connection.beginTransaction();
    try {
      for (const group of chunks(toSchedule)) {
        await connection.query(
          `UPDATE posts SET retention_delete_after = DATE_ADD(NOW(), INTERVAL ${GRACE_DAYS} DAY) WHERE retention_delete_after IS NULL AND id IN (${placeholders(group)})`,
          group
        );
      }
      for (const group of chunks(toClear)) {
        await connection.query(
          `UPDATE posts SET retention_delete_after = NULL WHERE id IN (${placeholders(group)})`,
          group
        );
      }
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    }

    const filesToDelete = [];
    for (const group of chunks(toDelete)) {
      const marks = placeholders(group);
      const [mediaRows] = await connection.query(`SELECT storage_key AS storageKey FROM post_media WHERE post_id IN (${marks})`, group);
      filesToDelete.push(...mediaRows.map((row) => row.storageKey));

      await connection.beginTransaction();
      try {
        await connection.query(`
          DELETE cr FROM content_reports cr
          INNER JOIN comments c ON c.id = cr.target_id
          WHERE cr.target_type = 'comment' AND c.post_id IN (${marks})
        `, group);
        await connection.query(`DELETE FROM content_reports WHERE target_type = 'post' AND target_id IN (${marks})`, group);
        await connection.query(`DELETE FROM posts WHERE id IN (${marks})`, group);
        await connection.commit();
      } catch (error) {
        await connection.rollback();
        throw error;
      }
    }

    const fileErrors = [];
    for (const storageKey of filesToDelete) {
      const filePath = resolve(UPLOAD_DIR, storageKey);
      if (!filePath.startsWith(`${UPLOAD_DIR}${sep}`)) {
        fileErrors.push(new Error(`Ugyldig storage key ved retention-sletting: ${storageKey}`));
        continue;
      }
      try {
        await unlink(filePath);
      } catch (error) {
        if (error?.code !== 'ENOENT') fileErrors.push(error);
      }
    }

    console.log(`Retention ferdig: ${toSchedule.length} fikk minst ${GRACE_DAYS} dagers frist, ${toClear.length} planlagte slettinger ble kansellert, ${toDelete.length} innlegg ble slettet.`);
    if (fileErrors.length) throw new AggregateError(fileErrors, `${fileErrors.length} mediefiler kunne ikke slettes.`);
  }
} finally {
  await connection.end();
}
