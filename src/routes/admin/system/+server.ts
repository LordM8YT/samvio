import { statfs } from 'node:fs/promises';
import { arch, cpus, freemem, hostname, loadavg, platform, release, totalmem, uptime } from 'node:os';
import { error, json } from '@sveltejs/kit';
import { uploadDirectory } from '$lib/server/storage';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.user || locals.user.role !== 'admin') error(403, 'Ingen tilgang');
  const disk = await statfs(uploadDirectory()).catch(() => null);
  return json({
    hostname: hostname(), platform: platform(), release: release(), arch: arch(),
    uptimeSeconds: uptime(), cpuCount: cpus().length, cpuModel: cpus()[0]?.model ?? 'Ukjent CPU',
    load: loadavg(), memoryTotal: totalmem(), memoryFree: freemem(), processMemory: process.memoryUsage().rss,
    diskTotal: disk ? disk.blocks * disk.bsize : 0, diskFree: disk ? disk.bavail * disk.bsize : 0,
    nodeVersion: process.version,
    measuredAt: new Date().toISOString()
  }, { headers: { 'cache-control': 'no-store' } });
};
