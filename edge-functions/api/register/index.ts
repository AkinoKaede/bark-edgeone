import type { EventContext } from '../../../src/types/common';
import { handleRegister } from '../../../src/handlers/register';
import { jsonResponse, failed } from '../../../src/utils/response';

/**
 * Register endpoint
 * - POST /register - Register a new device or update existing
 * - GET /register (with query params) - Legacy registration support
 *
 * Environment variables:
 * - ENABLE_REGISTER: Set to "false" or "0" to disable registration (default: enabled)
 * 
 * Note: This endpoint does NOT require authentication
 */

/**
 * Handle POST /register - Modern registration
 */
export async function onRequestPost(context: EventContext): Promise<Response> {
  // Check if registration is enabled via environment variable (default: enabled)
  const enableRegister = context.env.ENABLE_REGISTER !== 'false' && context.env.ENABLE_REGISTER !== '0';

  if (!enableRegister) {
    return jsonResponse(failed(403, 'Registration is disabled'), 403);
  }

  return handleRegister(context);
}

/**
 * Handle GET /register - Legacy registration with query params
 */
export async function onRequestGet(context: EventContext): Promise<Response> {
  const url = new URL(context.request.url);

  // Only handle if there are query parameters (legacy registration)
  if (url.searchParams.size === 0) {
    return jsonResponse(failed(400, 'Missing parameters'), 400);
  }

  // Check if registration is enabled via environment variable (default: enabled)
  const enableRegister = context.env.ENABLE_REGISTER !== 'false' && context.env.ENABLE_REGISTER !== '0';

  if (!enableRegister) {
    return jsonResponse(failed(403, 'Registration is disabled'), 403);
  }

  return handleRegister(context);
}
