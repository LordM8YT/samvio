import { sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
  try {
    await db.execute(sql`SELECT 1`);
    return new Response('ready', { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } });
  } catch {
    return new Response('not ready', { status: 503, headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } });
  }
};
