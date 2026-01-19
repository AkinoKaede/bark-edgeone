/**
 * Push Endpoint - V2 API
 *
 * POST /push - Send push notification with JSON body
 * GET /push - Send push notification with query parameters
 *
 * Supports:
 * - Single push via device_key
 * - Batch push via device_keys array
 *
 * Note: This endpoint REQUIRES authentication when enabled
 */

import { handlePushV2 } from '../../src/handlers/push';
import type { EventContext } from '../../src/types/common';
import { checkBasicAuth, unauthorizedResponse } from '../../src/utils/auth';

/**
 * Handle POST /push requests
 * Primary method for V2 API with JSON body
 */
export async function onRequestPost(context: EventContext): Promise<Response> {
  // Check authentication
  if (!checkBasicAuth(context.request, context.env)) {
    return unauthorizedResponse();
  }

  return handlePushV2(context);
}
