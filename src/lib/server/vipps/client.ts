import { getVippsConfig } from './config';

type AccessTokenResponse = { access_token: string; expires_in: string };
export type VippsAgreement = {
  agreementId: string;
  vippsConfirmationUrl?: string;
  chargeId?: string;
  status?: string;
  start?: string;
};

let cachedToken: { value: string; expiresAt: number } | null = null;

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = body && typeof body === 'object' ? JSON.stringify(body) : response.statusText;
    throw new Error(`Vipps svarte ${response.status}: ${detail}`);
  }
  return body as T;
}

async function accessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;
  const config = getVippsConfig();
  const response = await fetch(`${config.apiBaseUrl}/accesstoken/get`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      client_id: config.clientId,
      client_secret: config.clientSecret,
      'Ocp-Apim-Subscription-Key': config.subscriptionKey,
      'Merchant-Serial-Number': config.merchantSerialNumber,
      'Vipps-System-Name': config.systemName,
      'Vipps-System-Version': config.systemVersion
    },
    body: ''
  });
  const token = await parseResponse<AccessTokenResponse>(response);
  cachedToken = { value: token.access_token, expiresAt: Date.now() + Number(token.expires_in) * 1000 };
  return cachedToken.value;
}

async function vippsRequest<T>(path: string, init: RequestInit = {}) {
  const config = getVippsConfig();
  const response = await fetch(`${config.apiBaseUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${await accessToken()}`,
      'Ocp-Apim-Subscription-Key': config.subscriptionKey,
      'Merchant-Serial-Number': config.merchantSerialNumber,
      'Vipps-System-Name': config.systemName,
      'Vipps-System-Version': config.systemVersion,
      ...init.headers
    }
  });
  return parseResponse<T>(response);
}

export function createAgreement(input: {
  amountOre: number;
  productName: string;
  redirectUrl: string;
  agreementUrl: string;
  idempotencyKey: string;
}) {
  return vippsRequest<VippsAgreement>('/recurring/v3/agreements', {
    method: 'POST',
    headers: { 'Idempotency-Key': input.idempotencyKey },
    body: JSON.stringify({
      initialCharge: {
        amount: input.amountOre,
        currency: 'NOK',
        description: `${input.productName} – første måned`,
        transactionType: 'DIRECT_CAPTURE',
        orderId: input.idempotencyKey
      },
      interval: { unit: 'MONTH', count: 1 },
      pricing: { amount: input.amountOre, currency: 'NOK' },
      merchantRedirectUrl: input.redirectUrl,
      merchantAgreementUrl: input.agreementUrl,
      productName: input.productName,
      externalId: input.idempotencyKey
    })
  });
}

export function getAgreement(agreementId: string) {
  return vippsRequest<VippsAgreement>(`/recurring/v3/agreements/${encodeURIComponent(agreementId)}`);
}

export function stopAgreement(agreementId: string, idempotencyKey: string) {
  return vippsRequest<void>(`/recurring/v3/agreements/${encodeURIComponent(agreementId)}`, {
    method: 'PATCH',
    headers: { 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify({ status: 'STOPPED' })
  });
}
