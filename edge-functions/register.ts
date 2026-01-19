import type { EventContext } from '../src/types/common';
import { handleRegister, handleRegisterCheck } from '../src/handlers/register';
import { jsonResponse, failed } from '../src/utils/response';

/**
 * Register endpoint
 * - POST /register - Register a new device or update existing
 * - GET /register (with query params) - Legacy registration support
 * - GET /register/:device_key - Check if device key exists
 *
 * Environment variables:
 * - ENABLE_REGISTER: Set to "false" or "0" to disable registration (default: enabled)
 *   Note: When disabled, only registration check (GET /register/:device_key) is allowed
 */
export async function onRequest(context: EventContext): Promise<Response> {
  const request = context.request;
  const url = new URL(request.url);
  const path = url.pathname;

  // Check if registration is enabled via environment variable (default: enabled)
  const enableRegister = context.env.ENABLE_REGISTER !== 'false' && context.env.ENABLE_REGISTER !== '0';

  // POST /register - modern registration
  if (request.method === 'POST' && path === '/register') {
    if (!enableRegister) {
      return jsonResponse(failed(403, 'Registration is disabled'), 403);
    }
    return handleRegister(context);
  }

  // GET /register with query params - legacy compatibility
  if (request.method === 'GET' && path === '/register' && url.searchParams.size > 0) {
    if (!enableRegister) {
      return jsonResponse(failed(403, 'Registration is disabled'), 403);
    }
    return handleRegister(context);
  }

  // GET /register/:device_key - check registration (always allowed)
  if (request.method === 'GET' && path.startsWith('/register/')) {
    const deviceKey = path.substring('/register/'.length);
    if (deviceKey) {
      return handleRegisterCheck(context, deviceKey);
    }
  }

  return jsonResponse(failed(404, 'Not found'), 404);
}
