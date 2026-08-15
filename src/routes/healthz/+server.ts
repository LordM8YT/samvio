import type { RequestHandler } from './$types';

export const GET: RequestHandler = () => new Response('ok', {
  headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' }
});
