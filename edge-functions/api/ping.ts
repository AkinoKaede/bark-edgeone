import type { EventContext } from '../../src/types/common';
import { success, jsonResponse } from '../../src/utils/response';

/**
 * Ping endpoint - Simple health check
 * GET /ping
 */
export async function onRequest(context: EventContext): Promise<Response> {
  return jsonResponse(success());
}
