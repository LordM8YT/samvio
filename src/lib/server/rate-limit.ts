type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 50_000;
const SWEEP_INTERVAL_MS = 60_000;
let nextSweepAt = 0;

function sweepExpiredBuckets(now: number) {
  if (now < nextSweepAt && buckets.size < MAX_BUCKETS) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
  nextSweepAt = now + SWEEP_INTERVAL_MS;
}

export function consumeRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  sweepExpiredBuckets(now);
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    if (!current && buckets.size >= MAX_BUCKETS) {
      return { allowed: false, retryAfterSeconds: Math.ceil(SWEEP_INTERVAL_MS / 1000) };
    }
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }
  if (current.count >= limit) return { allowed: false, retryAfterSeconds: Math.ceil((current.resetAt - now) / 1000) };
  current.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}
