import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { env } from '$env/dynamic/private';
import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { paymentEvents, subscriptions } from '$lib/server/db/schema';
import type { RequestHandler } from './$types';

type VippsWebhookPayload = {
  agreementId?: string;
  agreementExternalId?: string | null;
  chargeId?: string;
  chargeExternalId?: string | null;
  chargeType?: 'INITIAL' | 'RECURRING' | 'UNSCHEDULED' | string;
  transactionId?: string | null;
  amount?: number;
  amountCaptured?: number;
  eventType?: string;
  occurred?: string;
  actor?: string | null;
  msn?: string | number;
  [key: string]: unknown;
};

const supportedEvents = new Set([
  'recurring.agreement-activated.v1',
  'recurring.agreement-rejected.v1',
  'recurring.agreement-stopped.v1',
  'recurring.agreement-expired.v1',
  'recurring.charge-reserved.v1',
  'recurring.charge-captured.v1',
  'recurring.charge-canceled.v1',
  'recurring.charge-refunded.v1',
  'recurring.charge-failed.v1',
  'recurring.charge-creation-failed.v1'
]);

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function verifyWebhook(request: Request, url: URL, rawBody: Buffer) {
  const secret = env.VIPPS_WEBHOOK_SECRET;
  const date = request.headers.get('x-ms-date');
  const contentHash = request.headers.get('x-ms-content-sha256');
  const authorization = request.headers.get('authorization');
  const host = request.headers.get('host');
  if (!secret || !date || !contentHash || !authorization || !host) return false;

  const expectedContentHash = createHash('sha256').update(rawBody).digest('base64');
  if (!safeEqual(contentHash, expectedContentHash)) return false;

  const pathAndQuery = `${url.pathname}${url.search}`;
  const signed = `${request.method.toUpperCase()}\n${pathAndQuery}\n${date};${host};${contentHash}`;
  const signature = createHmac('sha256', secret).update(signed).digest('base64');
  const expectedAuthorization = `HMAC-SHA256 SignedHeaders=x-ms-date;host;x-ms-content-sha256&Signature=${signature}`;
  return safeEqual(authorization, expectedAuthorization);
}

function addCalendarMonth(date: Date) {
  const result = new Date(date);
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + 1);
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
}

function validDate(value: unknown) {
  if (typeof value !== 'string') return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function findSubscription(payload: VippsWebhookPayload) {
  if (payload.agreementId) {
    const [row] = await db.select().from(subscriptions)
      .where(and(eq(subscriptions.provider, 'vipps'), eq(subscriptions.providerSubscriptionId, payload.agreementId)))
      .limit(1);
    if (row) return row;
  }

  if (payload.agreementExternalId) {
    const [row] = await db.select().from(subscriptions)
      .where(and(eq(subscriptions.provider, 'vipps'), eq(subscriptions.id, payload.agreementExternalId)))
      .limit(1);
    if (row) return row;
  }
  return null;
}

async function reserveEvent(subscriptionId: string, eventKey: string, eventType: string, payload: VippsWebhookPayload) {
  const [existing] = await db.select({ id: paymentEvents.id, processedAt: paymentEvents.processedAt })
    .from(paymentEvents)
    .where(and(eq(paymentEvents.provider, 'vipps'), eq(paymentEvents.providerEventId, eventKey)))
    .limit(1);
  if (existing) return { ...existing, duplicate: Boolean(existing.processedAt) };

  const id = randomUUID();
  try {
    await db.insert(paymentEvents).values({
      id,
      subscriptionId,
      provider: 'vipps',
      providerEventId: eventKey,
      eventType,
      payload
    });
    return { id, processedAt: null, duplicate: false };
  } catch (error) {
    const [raced] = await db.select({ id: paymentEvents.id, processedAt: paymentEvents.processedAt })
      .from(paymentEvents)
      .where(and(eq(paymentEvents.provider, 'vipps'), eq(paymentEvents.providerEventId, eventKey)))
      .limit(1);
    if (raced) return { ...raced, duplicate: Boolean(raced.processedAt) };
    throw error;
  }
}

async function renewalPeriodFromScheduler(chargeExternalId: string | null | undefined) {
  if (!chargeExternalId) return null;
  const [event] = await db.select({ payload: paymentEvents.payload }).from(paymentEvents)
    .where(and(eq(paymentEvents.provider, 'vipps'), eq(paymentEvents.providerEventId, chargeExternalId)))
    .limit(1);
  if (!event?.payload || typeof event.payload !== 'object' || Array.isArray(event.payload)) return null;
  const payload = event.payload as Record<string, unknown>;
  const periodStart = validDate(payload.periodStart);
  const periodEnd = validDate(payload.periodEnd);
  return periodStart && periodEnd ? { periodStart, periodEnd } : null;
}

async function processEvent(subscription: typeof subscriptions.$inferSelect, payload: VippsWebhookPayload) {
  const eventType = payload.eventType ?? '';
  const now = new Date();

  if (eventType === 'recurring.agreement-rejected.v1') {
    if (!subscription.currentPeriodEnd || subscription.currentPeriodEnd <= now) {
      await db.update(subscriptions).set({ status: 'expired' }).where(eq(subscriptions.id, subscription.id));
    }
    return;
  }

  if (eventType === 'recurring.agreement-stopped.v1' || eventType === 'recurring.agreement-expired.v1') {
    const hasPaidTimeLeft = Boolean(subscription.currentPeriodEnd && subscription.currentPeriodEnd > now);
    await db.update(subscriptions).set({
      status: hasPaidTimeLeft ? 'canceled' : 'expired',
      cancelAtPeriodEnd: true
    }).where(eq(subscriptions.id, subscription.id));
    return;
  }

  if (eventType === 'recurring.charge-captured.v1') {
    const capturedAmount = Number(payload.amountCaptured ?? payload.amount ?? 0);
    if (!Number.isFinite(capturedAmount) || capturedAmount < subscription.priceOre) return;

    const occurred = validDate(payload.occurred) ?? now;
    if (payload.chargeType === 'INITIAL') {
      const existingEnd = subscription.currentPeriodEnd;
      const start = subscription.currentPeriodStart ?? occurred;
      const end = existingEnd && existingEnd > occurred ? existingEnd : addCalendarMonth(start);
      await db.update(subscriptions).set({
        status: 'active',
        currentPeriodStart: start,
        currentPeriodEnd: end,
        cancelAtPeriodEnd: false
      }).where(eq(subscriptions.id, subscription.id));
      return;
    }

    if (payload.chargeType === 'RECURRING') {
      const scheduledPeriod = await renewalPeriodFromScheduler(payload.chargeExternalId);
      const periodStart = scheduledPeriod?.periodStart ?? subscription.currentPeriodEnd ?? occurred;
      const periodEnd = scheduledPeriod?.periodEnd ?? addCalendarMonth(periodStart);
      if (!subscription.currentPeriodEnd || periodEnd > subscription.currentPeriodEnd) {
        await db.update(subscriptions).set({
          status: 'active',
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: false
        }).where(eq(subscriptions.id, subscription.id));
      } else if (subscription.status === 'past_due') {
        await db.update(subscriptions).set({ status: 'active' }).where(eq(subscriptions.id, subscription.id));
      }
    }
    return;
  }

  if ((eventType === 'recurring.charge-failed.v1' || eventType === 'recurring.charge-creation-failed.v1') && payload.chargeType === 'RECURRING') {
    if (subscription.status === 'active' || subscription.status === 'past_due') {
      await db.update(subscriptions).set({ status: 'past_due' }).where(eq(subscriptions.id, subscription.id));
    }
  }
}

export const POST: RequestHandler = async ({ request, url }) => {
  if (!env.VIPPS_WEBHOOK_SECRET) return new Response('Webhook not configured', { status: 503 });

  const rawBody = Buffer.from(await request.arrayBuffer());
  if (!verifyWebhook(request, url, rawBody)) return new Response('Unauthorized', { status: 401 });

  let payload: VippsWebhookPayload;
  try {
    payload = JSON.parse(rawBody.toString('utf8')) as VippsWebhookPayload;
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  if (!payload.eventType || !supportedEvents.has(payload.eventType)) return new Response(null, { status: 204 });
  if (env.VIPPS_MERCHANT_SERIAL_NUMBER && String(payload.msn ?? '') !== env.VIPPS_MERCHANT_SERIAL_NUMBER) {
    return new Response('Merchant mismatch', { status: 403 });
  }

  const subscription = await findSubscription(payload);
  if (!subscription) {
    console.warn('Vipps webhook for unknown agreement', { eventType: payload.eventType, agreementId: payload.agreementId });
    return new Response(null, { status: 204 });
  }

  const eventKey = `webhook:${createHash('sha256').update(rawBody).digest('hex')}`;
  const event = await reserveEvent(subscription.id, eventKey, payload.eventType, payload);
  if (event.duplicate) return new Response(null, { status: 204 });

  try {
    await processEvent(subscription, payload);
    await db.update(paymentEvents).set({ processedAt: new Date() }).where(eq(paymentEvents.id, event.id));
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('Vipps webhook processing failed', error);
    return new Response('Temporary processing error', { status: 500 });
  }
};
