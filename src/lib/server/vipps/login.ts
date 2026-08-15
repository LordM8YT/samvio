import { createRemoteJWKSet, jwtVerify } from 'jose';
import { getVippsLoginConfig } from './config';

type Discovery = {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint: string;
  jwks_uri: string;
};

export type VippsUserInfo = {
  sub: string;
  name?: string;
  email?: string;
  email_verified?: boolean;
  birthdate?: string;
  phone_number?: string;
};

let cachedDiscovery: { value: Discovery; expiresAt: number } | null = null;

const vippsHeaders = () => {
  const config = getVippsLoginConfig();
  return {
    'Vipps-System-Name': config.systemName,
    'Vipps-System-Version': config.systemVersion,
    ...(config.merchantSerialNumber ? { 'Merchant-Serial-Number': config.merchantSerialNumber } : {})
  };
};

export async function getLoginDiscovery() {
  if (cachedDiscovery && cachedDiscovery.expiresAt > Date.now()) return cachedDiscovery.value;
  const config = getVippsLoginConfig();
  const response = await fetch(`${config.apiBaseUrl}/access-management-1.0/access/.well-known/openid-configuration`, { headers: vippsHeaders() });
  if (!response.ok) throw new Error(`Vipps discovery feilet (${response.status}).`);
  const value = await response.json() as Discovery;
  if (!value.issuer || !value.authorization_endpoint || !value.token_endpoint || !value.userinfo_endpoint || !value.jwks_uri) throw new Error('Vipps returnerte ufullstendig OIDC-konfigurasjon.');
  cachedDiscovery = { value, expiresAt: Date.now() + 60 * 60_000 };
  return value;
}

export async function exchangeVippsCode(code: string, codeVerifier: string, expectedNonce: string) {
  const config = getVippsLoginConfig();
  const discovery = await getLoginDiscovery();
  const body = new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: config.redirectUri, code_verifier: codeVerifier });
  const response = await fetch(discovery.token_endpoint, {
    method: 'POST',
    headers: { ...vippsHeaders(), authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')}`, 'content-type': 'application/x-www-form-urlencoded' },
    body
  });
  if (!response.ok) throw new Error(`Vipps tokenutveksling feilet (${response.status}).`);
  const tokens = await response.json() as { access_token?: string; id_token?: string };
  if (!tokens.access_token || !tokens.id_token) throw new Error('Vipps returnerte ikke nødvendige tokens.');
  const jwks = createRemoteJWKSet(new URL(discovery.jwks_uri));
  const verified = await jwtVerify(tokens.id_token, jwks, { issuer: discovery.issuer, audience: config.clientId });
  if (verified.payload.nonce !== expectedNonce) throw new Error('Vipps nonce samsvarer ikke.');
  return { accessToken: tokens.access_token, subject: String(verified.payload.sub ?? '') };
}

export async function getVippsUserInfo(accessToken: string) {
  const discovery = await getLoginDiscovery();
  const response = await fetch(discovery.userinfo_endpoint, { headers: { ...vippsHeaders(), authorization: `Bearer ${accessToken}` } });
  if (!response.ok) throw new Error(`Vipps brukerprofil feilet (${response.status}).`);
  const userInfo = await response.json() as VippsUserInfo;
  if (!userInfo.sub) throw new Error('Vipps brukerprofil mangler subject.');
  return userInfo;
}
