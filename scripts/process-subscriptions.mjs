import { createHash, randomUUID } from 'node:crypto';
import mysql from 'mysql2/promise';

const DAY_MS = 24 * 60 * 60 * 1000;
const SCHEDULE_AHEAD_MS = 7 * DAY_MS;
const MIN_LEAD_DAYS = 2;
const RETRY_DAYS = 5;

if (process.env.VIPPS_PAYMENTS_ENABLED !== 'true') {
  console.log('Vipps-betalinger er deaktivert; abonnement-worker hopper over kjøring.');
  process.exit(0);
}

for (const name of [
  'DATABASE_URL',
  'VIPPS_CLIENT_ID',
  'VIPPS_CLIENT_SECRET',
  'VIPPS_SUBSCRIPTION_KEY',
  'VIPPS_MERCHANT_SERIAL_NUMBER'
]) {
  if (!process.env[name]) throw new Error(`${name} mangler.`);
}

const API_BASE_URL = process.env.VIPPS_API_BASE_URL ?? 'https://apitest.vipps.no';
const SYSTEM_NAME = process.env.VIPPS_SYSTEM_NAME ?? 'Samvio';
const SYSTEM_VERSION = process.env.VIPPS_SYSTEM_VERSION ?? '0.1.0';

class VippsApiError extends Error {
  constructor(status, detail) {
    super(`Vipps svarte ${status}: ${detail}`);
    this.name = 'VippsApiError';
    this.status = status;
  }
}

let cachedToken = null;

async function parseResponse(response) {
  if (response.status === 204) return undefined;
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = body && typeof body === 'object' ? JSON.stringify(body) : response.statusText;
    throw new VippsApiError(response.status, detail);
  }
  return body;
}

async function accessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;
  const response = await fetch(`${API_BASE_URL}/accesstoken/get`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      client_id: process.env.VIPPS_CLIENT_ID,
      client_secret: process.env.VIPPS_CLIENT_SECRET,
      'Ocp-Apim-Subscription-Key': process.env.VIPPS_SUBSCRIPTION_KEY,
      'Merchant-Serial-Number': process.env.VIPPS_MERCHANT_SERIAL_NUMBER,
      'Vipps-System-Name': SYSTEM_NAME,
      'Vipps-System-Version': SYSTEM_VERSION
    },
    body: ''
  });
  const token = await parseResponse(response);
  cachedToken = {
    value: token.access_token,
    expiresAt: Date.now() + Number(token.expires_in) * 1000
  };
  return cachedToken.value;
}

async function vippsRequest(path, init = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${await accessToken()}`,
      'Ocp-Apim-Subscription-Key': process.env.VIPPS_SUBSCRIPTION_KEY,
      'Merchant-Serial-Number': process.env.VIPPS_MERCHANT_SERIAL_NUMBER,
      'Vipps-System-Name': SYSTEM_NAME,
      'Vipps-System-Version': SYSTEM_VERSION,
      ...init.headers
    }
  });
  return parseResponse(response);
}

function getAgreement(agreementId) {
  return vippsRequest(`/recurring/v3/agreements/${encodeURIComponent(agreementId)}`);
}

function getCharge(agreementId, chargeId) {
  return vippsRequest(`/recurring/v3/agreements/${encodeURIComponent(agreementId)}/charges/${encodeURIComponent(chargeId)}`);
}

function createCharge(agreementId, { amountOre, due, orderId, description }) {
  return vippsRequest(`/recurring/v3/agreements/${encodeURIComponent(agreementId)}/charges`, {
    method: 'POST',
    headers: { 'Idempotency-Key': orderId },
    body: JSON.stringify({
      amount: amountOre,
      transactionType: 'DIRECT_CAPTURE',
      description,
      due,
      retryDays: RETRY_DAYS,
      type: 'RECURRING',
      orderId,
      externalId: orderId
    })
  });
}

function addCalendarMonth(date) {
  const value = new Date(date);
  const day = value.getUTCDate();
  value.setUTCDate(1);
  value.setUTCMonth(value.getUTCMonth() + 1);
  const lastDay = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + 1, 0)).getUTCDate();
  value.setUTCDate(Math.min(day, lastDay));
  return value;
}

function osloDate(date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Oslo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function dateAtLeastDaysFromNow(preferred, days) {
  const minimum = osloDate(new Date(Date.now() + days * DAY_MS));
  return preferred < minimum ? minimum : preferred;
}

function chargeKey(subscriptionId, periodEnd) {
  const digest = createHash('sha256')
    .update(`${subscriptionId}:${osloDate(periodEnd)}`)
    .digest('hex')
    .slice(0, 36);
  return `sv-${digest}`;
}

function planLabel(planCode) {
  return planCode === 'family' ? 'Familie' : 'Person';
}

function eventTypeForCharge(status) {
  switch (status) {
    case 'CHARGED': return 'recurring.charge.charged';
    case 'FAILED': return 'recurring.charge.failed';
    case 'CANCELLED': return 'recurring.charge.canceled';
    case 'REFUNDED':
    case 'PARTIALLY_REFUNDED': return 'recurring.charge.refunded';
    default: return 'recurring.charge.pending';
  }
}

function isTerminalCharge(status) {
  return ['CHARGED', 'FAILED', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED'].includes(status);
}

const connection = await mysql.createConnection({ uri: process.env.DATABASE_URL });
let processed = 0;
let activated = 0;
let scheduled = 0;
let renewed = 0;
let failed = 0;
const errors = [];

async function upsertPaymentEvent(subscriptionId, providerEventId, eventType, payload, terminal = false) {
  const [rows] = await connection.query(
    `SELECT id FROM payment_events WHERE provider = 'vipps' AND provider_event_id = ? LIMIT 1`,
    [providerEventId]
  );
  if (rows.length) {
    await connection.query(
      `UPDATE payment_events
       SET event_type = ?, payload = ?, processed_at = ?
       WHERE id = ?`,
      [eventType, JSON.stringify(payload), terminal ? new Date() : null, rows[0].id]
    );
    return rows[0].id;
  }

  const id = randomUUID();
  await connection.query(
    `INSERT INTO payment_events
      (id, subscription_id, provider, provider_event_id, event_type, payload, processed_at)
     VALUES (?, ?, 'vipps', ?, ?, ?, ?)`,
    [id, subscriptionId, providerEventId, eventType, JSON.stringify(payload), terminal ? new Date() : null]
  );
  return id;
}

async function ensureRenewalCharge(subscription) {
  const originalPeriodEnd = new Date(subscription.currentPeriodEnd);
  const preferredDue = osloDate(originalPeriodEnd);
  const due = dateAtLeastDaysFromNow(preferredDue, MIN_LEAD_DAYS);
  const orderId = chargeKey(subscription.id, originalPeriodEnd);
  const nextPeriodEnd = addCalendarMonth(originalPeriodEnd);
  const description = `Samvio ${planLabel(subscription.planCode)} - fornyelse`;

  let charge;
  try {
    charge = await getCharge(subscription.providerSubscriptionId, orderId);
  } catch (error) {
    if (!(error instanceof VippsApiError) || error.status !== 404) throw error;

    await upsertPaymentEvent(subscription.id, orderId, 'recurring.charge.creating', {
      agreementId: subscription.providerSubscriptionId,
      status: 'CREATING',
      amountOre: subscription.priceOre,
      due,
      periodStart: originalPeriodEnd.toISOString(),
      periodEnd: nextPeriodEnd.toISOString()
    });

    try {
      const created = await createCharge(subscription.providerSubscriptionId, {
        amountOre: subscription.priceOre,
        due,
        orderId,
        description
      });
      scheduled += 1;
      charge = { ...created, status: created?.status ?? 'PENDING' };
    } catch (createError) {
      if (!(createError instanceof VippsApiError) || createError.status !== 409) throw createError;
      charge = await getCharge(subscription.providerSubscriptionId, orderId);
    }
  }

  const status = charge?.status ?? 'PENDING';
  const payload = {
    ...charge,
    agreementId: subscription.providerSubscriptionId,
    chargeId: charge?.chargeId ?? orderId,
    status,
    amountOre: subscription.priceOre,
    due,
    periodStart: originalPeriodEnd.toISOString(),
    periodEnd: nextPeriodEnd.toISOString()
  };
  await upsertPaymentEvent(subscription.id, orderId, eventTypeForCharge(status), payload, isTerminalCharge(status));

  if (status === 'CHARGED') {
    const [result] = await connection.query(
      `UPDATE subscriptions
       SET status = 'active', current_period_start = ?, current_period_end = ?, cancel_at_period_end = FALSE
       WHERE id = ? AND current_period_end = ?`,
      [originalPeriodEnd, nextPeriodEnd, subscription.id, subscription.currentPeriodEnd]
    );
    if (result.affectedRows) renewed += 1;
  } else if (['FAILED', 'CANCELLED'].includes(status)) {
    await connection.query(
      `UPDATE subscriptions SET status = 'past_due' WHERE id = ? AND status <> 'canceled'`,
      [subscription.id]
    );
    failed += 1;
  } else if (originalPeriodEnd.getTime() <= Date.now() && subscription.status !== 'canceled') {
    await connection.query(`UPDATE subscriptions SET status = 'past_due' WHERE id = ?`, [subscription.id]);
  }
}

try {
  const [subscriptions] = await connection.query(`
    SELECT
      id,
      user_id AS userId,
      plan_code AS planCode,
      status,
      price_ore AS priceOre,
      provider_subscription_id AS providerSubscriptionId,
      current_period_start AS currentPeriodStart,
      current_period_end AS currentPeriodEnd,
      cancel_at_period_end AS cancelAtPeriodEnd
    FROM subscriptions
    WHERE provider = 'vipps'
      AND provider_subscription_id IS NOT NULL
      AND user_id IS NOT NULL
      AND plan_code IN ('person', 'family')
      AND status IN ('trialing', 'active', 'past_due', 'canceled')
  `);

  for (const subscription of subscriptions) {
    processed += 1;
    try {
      const agreement = await getAgreement(subscription.providerSubscriptionId);
      const agreementStatus = agreement?.status;

      if (subscription.status === 'trialing') {
        if (agreementStatus === 'ACTIVE') {
          const periodStart = agreement?.start ? new Date(agreement.start) : new Date();
          const periodEnd = addCalendarMonth(periodStart);
          await connection.query(
            `UPDATE subscriptions
             SET status = 'active', current_period_start = ?, current_period_end = ?
             WHERE id = ? AND status = 'trialing'`,
            [periodStart, periodEnd, subscription.id]
          );
          subscription.status = 'active';
          subscription.currentPeriodStart = periodStart;
          subscription.currentPeriodEnd = periodEnd;
          activated += 1;
        } else if (agreementStatus === 'STOPPED' || agreementStatus === 'EXPIRED') {
          await connection.query(`UPDATE subscriptions SET status = 'expired' WHERE id = ?`, [subscription.id]);
          continue;
        } else {
          continue;
        }
      }

      if (agreementStatus === 'STOPPED' || agreementStatus === 'EXPIRED') {
        await connection.query(
          `UPDATE subscriptions
           SET status = 'canceled', cancel_at_period_end = TRUE
           WHERE id = ? AND status <> 'expired'`,
          [subscription.id]
        );
        continue;
      }

      if (agreementStatus !== 'ACTIVE') continue;
      if (subscription.status === 'canceled' || subscription.cancelAtPeriodEnd) continue;

      if (!subscription.currentPeriodEnd) {
        const periodStart = subscription.currentPeriodStart ? new Date(subscription.currentPeriodStart) : new Date();
        const periodEnd = addCalendarMonth(periodStart);
        await connection.query(
          `UPDATE subscriptions SET current_period_start = ?, current_period_end = ? WHERE id = ?`,
          [periodStart, periodEnd, subscription.id]
        );
        subscription.currentPeriodStart = periodStart;
        subscription.currentPeriodEnd = periodEnd;
      }

      const periodEnd = new Date(subscription.currentPeriodEnd);
      if (periodEnd.getTime() <= Date.now() + SCHEDULE_AHEAD_MS || subscription.status === 'past_due') {
        await ensureRenewalCharge(subscription);
      }
    } catch (error) {
      errors.push({ subscriptionId: subscription.id, error });
      console.error(`Abonnement ${subscription.id} feilet:`, error);
    }
  }

  console.log(
    `Abonnement-worker ferdig: ${processed} sjekket, ${activated} aktivert, ${scheduled} fornyelser opprettet, ${renewed} fornyet, ${failed} feilet.`
  );
  if (errors.length) {
    console.error(`${errors.length} abonnement(er) kunne ikke behandles.`);
    process.exitCode = 1;
  }
} finally {
  await connection.end();
}
