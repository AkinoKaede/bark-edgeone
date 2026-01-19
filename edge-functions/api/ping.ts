import type { EventContext } from '../../src/types/common';
import { success, jsonResponse } from '../../src/utils/response';

/**
 * Ping endpoint - Simple health check
 * GET /ping
 *
 * Note: This endpoint does NOT require authentication
 */
export async function onRequest(_context: EventContext): Promise<Response> {
  return jsonResponse(success());
}
