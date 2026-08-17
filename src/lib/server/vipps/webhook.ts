import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { getVippsWebhookSecret } from './config';

function safeEqualText(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function verifyVippsWebhook(request: Request, rawBody: string) {
  const date = request.headers.get('x-ms-date');
  const contentHash = request.headers.get('x-ms-content-sha256');
  const authorization = request.headers.get('authorization');
  const host = request.headers.get('host');
  if (!date || !contentHash || !authorization || !host) return false;

  const actualContentHash = createHash('sha256').update(rawBody).digest('base64');
  if (!safeEqualText(contentHash, actualContentHash)) return false;

  const url = new URL(request.url);
  const pathAndQuery = `${url.pathname}${url.search}`;
  const signed = `POST\n${pathAndQuery}\n${date};${host};${contentHash}`;
  const signature = createHmac('sha256', getVippsWebhookSecret()).update(signed).digest('base64');
  const expected = `HMAC-SHA256 SignedHeaders=x-ms-date;host;x-ms-content-sha256&Signature=${signature}`;
  return safeEqualText(authorization, expected);
}
