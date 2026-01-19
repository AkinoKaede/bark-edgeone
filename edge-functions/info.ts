import type { EventContext } from '../src/types/common';

/**
 * Info endpoint - Server information
 * GET /info
 *
 * Returns server version, architecture, and device count
 */
export async function onRequest(context: EventContext): Promise<Response> {
  const info = {
    version: 'v2.0.0',
    arch: 'edgeone/v8',
    commit: 'HEAD',
    devices: 0, // TODO: Implement db.CountAll() when database is ready
  };

  return new Response(JSON.stringify(info), {
    status: 200,
    headers: {
      'content-type': 'application/json',
    },
  });
}
