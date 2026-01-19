import type { EventContext } from '../../src/types/common';
import { handleRegisterCheck } from '../../src/handlers/register';

/**
 * Check device registration
 * GET /register/:device_key
 *
 * This endpoint is always enabled (even when ENABLE_REGISTER=false)
 * It only checks if a device key exists, doesn't allow registration
 */
export async function onRequestGet(context: EventContext): Promise<Response> {
  // Get device_key from dynamic route parameter
  const deviceKey = context.params.device_key;

  return handleRegisterCheck(context, deviceKey);
}
