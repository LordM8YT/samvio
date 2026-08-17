import { randomUUID } from 'node:crypto';
import type { Handle, HandleServerError } from '@sveltejs/kit';
import { getSessionUser, SESSION_COOKIE } from '$lib/server/auth';
import { ensureVippsRuntime } from '$lib/server/vipps/bootstrap';

export const handle: Handle = async ({ event, resolve }) => {
  event.locals.requestId = randomUUID();
  await ensureVippsRuntime();

  const token = event.cookies.get(SESSION_COOKIE);
  event.locals.user = null;

  if (token) {
    try {
      event.locals.user = await getSessionUser(token);
    } catch (error) {
      console.error(JSON.stringify({
        event: 'session_lookup_failed',
        requestId: event.locals.requestId,
        method: event.request.method,
        route: event.route.id ?? 'unmatched',
        errorName: error instanceof Error ? error.name : 'UnknownError'
      }));
    }
  }

  const response = await resolve(event);
  response.headers.set('x-request-id', event.locals.requestId);
  return response;
};

export const handleError: HandleServerError = ({ error, event, status, message }) => {
  console.error(JSON.stringify({
    event: 'server_error',
    requestId: event.locals.requestId,
    method: event.request.method,
    route: event.route.id ?? 'unmatched',
    status,
    errorName: error instanceof Error ? error.name : 'UnknownError',
    errorMessage: error instanceof Error ? error.message : message
  }));

  return {
    message: 'En uventet feil oppstod.',
    requestId: event.locals.requestId
  };
};
