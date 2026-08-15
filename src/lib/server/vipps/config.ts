import { env } from '$env/dynamic/private';

export type VippsConfig = {
  apiBaseUrl: string; clientId: string; clientSecret: string;
  subscriptionKey: string; merchantSerialNumber: string;
  systemName: string; systemVersion: string; publicUrl: string;
};

export const isVippsEnabled = () => env.VIPPS_PAYMENTS_ENABLED === 'true';
export const isVippsLoginEnabled = () => env.VIPPS_LOGIN_ENABLED === 'true';

export type VippsLoginConfig = {
  apiBaseUrl: string; clientId: string; clientSecret: string;
  merchantSerialNumber?: string; systemName: string; systemVersion: string;
  publicUrl: string; redirectUri: string;
};

export function getVippsLoginConfig(): VippsLoginConfig {
  const publicUrlValue = env.SAMVIO_PUBLIC_URL;
  const clientId = env.VIPPS_LOGIN_CLIENT_ID ?? env.VIPPS_CLIENT_ID;
  const clientSecret = env.VIPPS_LOGIN_CLIENT_SECRET ?? env.VIPPS_CLIENT_SECRET;
  if (!publicUrlValue || !clientId || !clientSecret) throw new Error('Vipps Logg inn mangler URL eller klientnøkler.');
  const publicUrl = new URL(publicUrlValue);
  if (publicUrl.protocol !== 'https:' && publicUrl.hostname !== 'localhost') throw new Error('SAMVIO_PUBLIC_URL må bruke HTTPS.');
  return {
    apiBaseUrl: (env.VIPPS_LOGIN_API_BASE_URL ?? env.VIPPS_API_BASE_URL ?? 'https://apitest.vipps.no').replace(/\/$/, ''),
    clientId,
    clientSecret,
    merchantSerialNumber: env.VIPPS_MERCHANT_SERIAL_NUMBER,
    systemName: env.VIPPS_SYSTEM_NAME ?? 'Samvio',
    systemVersion: env.VIPPS_SYSTEM_VERSION ?? '0.1.0',
    publicUrl: publicUrl.origin,
    redirectUri: `${publicUrl.origin}/auth/vipps/callback`
  };
}

export function getVippsConfig(): VippsConfig {
  const config = {
    apiBaseUrl: env.VIPPS_API_BASE_URL ?? 'https://apitest.vipps.no',
    clientId: env.VIPPS_CLIENT_ID, clientSecret: env.VIPPS_CLIENT_SECRET,
    subscriptionKey: env.VIPPS_SUBSCRIPTION_KEY,
    merchantSerialNumber: env.VIPPS_MERCHANT_SERIAL_NUMBER,
    systemName: env.VIPPS_SYSTEM_NAME ?? 'Samvio', systemVersion: env.VIPPS_SYSTEM_VERSION ?? '0.1.0',
    publicUrl: env.SAMVIO_PUBLIC_URL
  };
  if (!config.clientId || !config.clientSecret || !config.subscriptionKey || !config.merchantSerialNumber || !config.publicUrl) {
    throw new Error('Vipps Recurring er ikke konfigurert. Legg testnøkler i .env.');
  }
  const publicUrl = new URL(config.publicUrl);
  if (publicUrl.protocol !== 'https:' && publicUrl.hostname !== 'localhost') throw new Error('SAMVIO_PUBLIC_URL må bruke HTTPS.');
  config.publicUrl = publicUrl.origin;
  return config as VippsConfig;
}
