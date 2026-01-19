import type { EventContext } from '../src/types/common';

/**
 * Healthz endpoint - Health check (Kubernetes style)
 * GET /healthz
 *
 * Returns plain text "ok" for health check
 */
export async function onRequest(context: EventContext): Promise<Response> {
  return new Response('ok', {
    status: 200,
    headers: {
      'content-type': 'text/plain',
    },
  });
}
