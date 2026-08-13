import { env } from '$env/dynamic/private';

export type VippsConfig = {
  apiBaseUrl: string; clientId: string; clientSecret: string;
  subscriptionKey: string; merchantSerialNumber: string;
  systemName: string; systemVersion: string;
};

export function getVippsConfig(): VippsConfig {
  const config = {
    apiBaseUrl: env.VIPPS_API_BASE_URL ?? 'https://apitest.vipps.no',
    clientId: env.VIPPS_CLIENT_ID, clientSecret: env.VIPPS_CLIENT_SECRET,
    subscriptionKey: env.VIPPS_SUBSCRIPTION_KEY,
    merchantSerialNumber: env.VIPPS_MERCHANT_SERIAL_NUMBER,
    systemName: env.VIPPS_SYSTEM_NAME ?? 'Samvio', systemVersion: env.VIPPS_SYSTEM_VERSION ?? '0.1.0'
  };
  if (!config.clientId || !config.clientSecret || !config.subscriptionKey || !config.merchantSerialNumber) {
    throw new Error('Vipps Recurring er ikke konfigurert. Legg testnøkler i .env.');
  }
  return config as VippsConfig;
}
