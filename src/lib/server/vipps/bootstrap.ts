import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import { env } from '$env/dynamic/private';

const execFileAsync = promisify(execFile);
const ENV_FILE = '/etc/samvio/samvio.env';
const RETRY_AFTER_MS = 60_000;
const WORKER_INTERVAL_MS = 6 * 60 * 60 * 1000;

let bootstrapPromise: Promise<void> | null = null;
let lastAttemptAt = 0;
let runtimeReady = false;
let schedulerStarted = false;
let workerRunning = false;

function isProductionVippsConfiguration() {
  return env.NODE_ENV === 'production'
    && env.VIPPS_API_BASE_URL === 'https://api.vipps.no'
    && env.SAMVIO_PUBLIC_URL === 'https://samvio.no'
    && Boolean(env.VIPPS_CLIENT_ID)
    && Boolean(env.VIPPS_CLIENT_SECRET)
    && Boolean(env.VIPPS_SUBSCRIPTION_KEY)
    && Boolean(env.VIPPS_MERCHANT_SERIAL_NUMBER);
}

function parseEnvValue(contents: string, key: string) {
  const match = contents.match(new RegExp(`^${key}=(.*)$`, 'm'));
  if (!match) return undefined;
  const raw = match[1].trim();
  if (!raw) return '';
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'string' ? parsed : raw;
  } catch {
    return raw.replace(/^['"]|['"]$/g, '');
  }
}

async function refreshRuntimeEnvironment() {
  const contents = await readFile(ENV_FILE, 'utf8');
  const secret = parseEnvValue(contents, 'VIPPS_WEBHOOK_SECRET');
  const enabled = parseEnvValue(contents, 'VIPPS_PAYMENTS_ENABLED');
  if (secret) process.env.VIPPS_WEBHOOK_SECRET = secret;
  if (enabled) process.env.VIPPS_PAYMENTS_ENABLED = enabled;
}

function runSubscriptionWorker() {
  if (workerRunning || process.env.VIPPS_PAYMENTS_ENABLED !== 'true') return;
  workerRunning = true;
  execFile(
    process.execPath,
    ['scripts/process-subscriptions.mjs'],
    { cwd: process.cwd(), env: process.env, timeout: 10 * 60_000, maxBuffer: 1024 * 1024 },
    (error, stdout, stderr) => {
      workerRunning = false;
      if (stdout.trim()) console.log(stdout.trim());
      if (stderr.trim()) console.error(stderr.trim());
      if (error) console.error('Vipps subscription worker failed', error);
    }
  );
}

function startSubscriptionScheduler() {
  if (schedulerStarted || process.env.VIPPS_PAYMENTS_ENABLED !== 'true') return;
  schedulerStarted = true;
  runSubscriptionWorker();
  const timer = setInterval(runSubscriptionWorker, WORKER_INTERVAL_MS);
  timer.unref();
  console.log('Vipps subscription scheduler started in Samvio process.');
}

async function bootstrapVippsRuntime() {
  if (!isProductionVippsConfiguration()) return;

  if (env.VIPPS_PAYMENTS_ENABLED !== 'true' || !env.VIPPS_WEBHOOK_SECRET) {
    const { stdout, stderr } = await execFileAsync(
      process.execPath,
      [
        'scripts/register-vipps-webhook.mjs',
        `--write-env=${ENV_FILE}`,
        '--enable-payments'
      ],
      {
        cwd: process.cwd(),
        env: process.env,
        timeout: 45_000,
        maxBuffer: 1024 * 1024
      }
    );
    if (stdout.trim()) console.log(stdout.trim());
    if (stderr.trim()) console.error(stderr.trim());
    await refreshRuntimeEnvironment();
  }

  if (process.env.VIPPS_PAYMENTS_ENABLED === 'true' && process.env.VIPPS_WEBHOOK_SECRET) {
    runtimeReady = true;
    startSubscriptionScheduler();
    console.log('Vipps production payments are ready.');
  }
}

export async function ensureVippsRuntime() {
  if (runtimeReady) {
    startSubscriptionScheduler();
    return;
  }
  if (!isProductionVippsConfiguration()) return;
  if (bootstrapPromise) return bootstrapPromise;
  if (Date.now() - lastAttemptAt < RETRY_AFTER_MS) return;

  lastAttemptAt = Date.now();
  bootstrapPromise = bootstrapVippsRuntime()
    .catch((error) => {
      console.error('Vipps production bootstrap failed', error);
    })
    .finally(() => {
      bootstrapPromise = null;
    });
  return bootstrapPromise;
}
