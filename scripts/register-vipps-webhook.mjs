import { readFile, writeFile } from 'node:fs/promises';

const recurringEvents = [
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
];

const writeEnvArg = process.argv.find((value) => value.startsWith('--write-env='));
const enablePayments = process.argv.includes('--enable-payments');
const envFile = writeEnvArg?.slice('--write-env='.length) || null;

for (const key of [
  'VIPPS_CLIENT_ID',
  'VIPPS_CLIENT_SECRET',
  'VIPPS_SUBSCRIPTION_KEY',
  'VIPPS_MERCHANT_SERIAL_NUMBER',
  'SAMVIO_PUBLIC_URL'
]) {
  if (!process.env[key]) throw new Error(`${key} mangler.`);
}

const apiBaseUrl = (process.env.VIPPS_API_BASE_URL ?? 'https://apitest.vipps.no').replace(/\/$/, '');
const publicUrl = new URL(process.env.SAMVIO_PUBLIC_URL);
if (publicUrl.protocol !== 'https:') throw new Error('SAMVIO_PUBLIC_URL må bruke HTTPS for webhook.');
const callbackUrl = `${publicUrl.origin}/api/webhooks/vipps`;
const systemName = process.env.VIPPS_SYSTEM_NAME ?? 'Samvio';
const systemVersion = process.env.VIPPS_SYSTEM_VERSION ?? '0.1.0';

async function parseResponse(response) {
  if (response.status === 204) return undefined;
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = body && typeof body === 'object' ? JSON.stringify(body) : response.statusText;
    throw new Error(`Vipps svarte ${response.status}: ${detail}`);
  }
  return body;
}

async function accessToken() {
  const response = await fetch(`${apiBaseUrl}/accesstoken/get`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      client_id: process.env.VIPPS_CLIENT_ID,
      client_secret: process.env.VIPPS_CLIENT_SECRET,
      'Ocp-Apim-Subscription-Key': process.env.VIPPS_SUBSCRIPTION_KEY,
      'Merchant-Serial-Number': process.env.VIPPS_MERCHANT_SERIAL_NUMBER,
      'Vipps-System-Name': systemName,
      'Vipps-System-Version': systemVersion
    },
    body: ''
  });
  const token = await parseResponse(response);
  return token.access_token;
}

const token = await accessToken();
const commonHeaders = {
  Authorization: `Bearer ${token}`,
  'Ocp-Apim-Subscription-Key': process.env.VIPPS_SUBSCRIPTION_KEY,
  'Merchant-Serial-Number': process.env.VIPPS_MERCHANT_SERIAL_NUMBER,
  'Vipps-System-Name': systemName,
  'Vipps-System-Version': systemVersion
};

async function listWebhooks() {
  const response = await fetch(`${apiBaseUrl}/webhooks/v1/webhooks`, { headers: commonHeaders });
  return parseResponse(response);
}

async function deleteWebhook(id) {
  const response = await fetch(`${apiBaseUrl}/webhooks/v1/webhooks/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: commonHeaders
  });
  await parseResponse(response);
}

async function createWebhook() {
  const response = await fetch(`${apiBaseUrl}/webhooks/v1/webhooks`, {
    method: 'POST',
    headers: { ...commonHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: callbackUrl, events: recurringEvents })
  });
  return parseResponse(response);
}

function hasAllEvents(webhook) {
  const events = new Set(Array.isArray(webhook.events) ? webhook.events : []);
  return recurringEvents.every((event) => events.has(event));
}

const registered = await listWebhooks();
const matches = (registered?.webhooks ?? []).filter((webhook) => webhook.url === callbackUrl);
const existingComplete = matches.find(hasAllEvents);

if (existingComplete && process.env.VIPPS_WEBHOOK_SECRET) {
  console.log(`Vipps webhook er allerede registrert for ${callbackUrl}.`);
  process.exit(0);
}

for (const webhook of matches) {
  console.log(`Erstatter eksisterende Vipps webhook ${webhook.id} for å få en kjent secret.`);
  await deleteWebhook(webhook.id);
}

const created = await createWebhook();
if (!created?.id || !created?.secret) throw new Error('Vipps returnerte ikke webhook-id og secret.');

if (!envFile) {
  await deleteWebhook(created.id).catch(() => undefined);
  throw new Error('Webhook ble ikke beholdt fordi --write-env=<fil> mangler. Secret skrives aldri til stdout.');
}

const original = await readFile(envFile, 'utf8');
function setEnv(content, key, value) {
  const line = `${key}=${JSON.stringify(String(value))}`;
  const pattern = new RegExp(`^${key}=.*$`, 'm');
  return pattern.test(content) ? content.replace(pattern, line) : `${content.replace(/\s*$/, '')}\n${line}\n`;
}

let updated = setEnv(original, 'VIPPS_WEBHOOK_SECRET', created.secret);
if (enablePayments) updated = setEnv(updated, 'VIPPS_PAYMENTS_ENABLED', 'true');
await writeFile(envFile, updated, { mode: 0o600 });

console.log(`Vipps Recurring webhook registrert: ${callbackUrl}`);
console.log(`Webhook-id: ${created.id}`);
console.log(`Secret er lagret i ${envFile} og ble ikke skrevet til output.`);
if (enablePayments) console.log('VIPPS_PAYMENTS_ENABLED er satt til true.');
