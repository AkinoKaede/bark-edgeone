/**
 * V1 API Catch-all Handler
 *
 * Handles legacy V1 API routes:
 * - GET/POST /:device_key
 * - GET/POST /:device_key/:body
 * - GET/POST /:device_key/:title/:body
 * - GET/POST /:device_key/:title/:subtitle/:body
 *
 * This file uses [[default]] naming to catch all unmatched routes.
 * It has the lowest priority, so specific routes like /push, /register, etc.
 * will be handled by their dedicated handlers first.
 *
 * Note: This endpoint REQUIRES authentication when enabled
 */

import { handleV1Route } from '../../src/handlers/push';
import { errorResponse } from '../../src/utils/response';
import type { EventContext } from '../../src/types/common';
import { checkBasicAuth, unauthorizedResponse } from '../../src/utils/auth';

/**
 * Reserved paths that should not be handled by this catch-all
 */
const RESERVED_PATHS = ['/favicon.ico', '/robots.txt'];

/**
 * Check if path is reserved
 */
function isReservedPath(path: string): boolean {
  const normalizedPath = path.toLowerCase();
  return RESERVED_PATHS.some(
    (reserved) => normalizedPath === reserved || normalizedPath.startsWith(`${reserved}/`)
  );
}

/**
 * Handle all unmatched requests (V1 API compatibility)
 */
async function handleRequest(context: EventContext): Promise<Response> {
  const url = new URL(context.request.url);
  const path = url.pathname;

  // Skip reserved paths (should be handled by specific handlers)
  if (isReservedPath(path)) {
    return errorResponse(404, 'not found');
  }

  // Skip root path
  if (path === '/' || path === '') {
    return errorResponse(404, 'not found');
  }

  // Check authentication
  if (!checkBasicAuth(context.request, context.env)) {
    return unauthorizedResponse();
  }

  // Handle V1 API routes
  return handleV1Route(context);
}

/**
 * Handle GET requests
 */
export async function onRequestGet(context: EventContext): Promise<Response> {
  return handleRequest(context);
}

/**
 * Handle POST requests
 */
export async function onRequestPost(context: EventContext): Promise<Response> {
  return handleRequest(context);
}
