/**
 * Push Endpoint - V2 API
 *
 * POST /push - Send push notification with JSON body
 * GET /push - Send push notification with query parameters
 *
 * Supports:
 * - Single push via device_key
 * - Batch push via device_keys array
 */

import { handlePushV2 } from '../../src/handlers/push';
import type { EventContext } from '../../src/types/common';

/**
 * Handle POST /push requests
 * Primary method for V2 API with JSON body
 */
export async function onRequestPost(context: EventContext): Promise<Response> {
  return handlePushV2(context);
}
