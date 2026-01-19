import type { EventContext, PushParams, DeviceInfo } from '../types/common';
import { safeDecodeURIComponent } from './string';
import { logDebug } from './logger';

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Parse request parameters from multiple sources
 * Priority: URL path params > Query params > JSON body
 */
export async function parseParams(context: EventContext): Promise<PushParams> {
  const params: any = {};
  const { request } = context;

  // Parse query parameters (lowest priority)
  const url = new URL(request.url);
  url.searchParams.forEach((value, key) => {
    params[key.toLowerCase()] = value;
  });

  // Parse body based on content type
  const contentType = request.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    // Parse JSON body (medium priority)
    try {
      const body = await request.json();
      Object.assign(params, body);
    } catch (error) {
      logDebug('parseParams', 'Failed to parse JSON body', { error }, context.env);
    }
  } else if (contentType.includes('application/x-www-form-urlencoded')) {
    // Parse form data
    try {
      const formData = await request.formData();
      formData.forEach((value, key) => {
        params[key.toLowerCase()] = value;
      });
    } catch (error) {
      logDebug('parseParams', 'Failed to parse form data', { error }, context.env);
    }
  }

  // Parse URL path parameters (highest priority)
  if (context.params) {
    // Handle dynamic route params
    const pathParams = extractPathParams(context.params);
    Object.assign(params, pathParams);
  }

  return params;
}

/**
 * Extract and decode path parameters
 */
function extractPathParams(params: any): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string') {
      // URL decode the parameter using safe decoder
      result[key.toLowerCase()] = safeDecodeURIComponent(value);
    }
  }

  return result;
}

/**
 * Parse V1 API route parameters
 * Routes: /:device_key/:title/:body or /:device_key/:title/:subtitle/:body
 */
export function parseV1Route(route: string): PushParams | null {
  // delete /api from path
  route = route.substring('/api'.length);

  // Remove leading/trailing slashes
  const parts = route.replace(/^\/+|\/+$/g, '').split('/');

  if (parts.length < 1) {
    return null;
  }

  const params: PushParams = {
    device_key: parts[0],
  };

  if (parts.length >= 2) {
    params.body = parts[1];
  }

  if (parts.length >= 3) {
    params.title = params.body;
    params.body = parts[2];
  }

  if (parts.length >= 4) {
    params.subtitle = params.title;
    params.title = parts[1];
    params.body = parts[3];
  }

  return params;
}

/**
 * Parse device information from request
 * Supports both POST JSON body and GET query parameters
 * Handles backward compatibility field names
 */
export async function parseDeviceInfo(request: Request): Promise<DeviceInfo> {
  const url = new URL(request.url);
  let info: Partial<DeviceInfo> = {};

  // Try JSON body first (for POST requests)
  if (request.method === 'POST') {
    try {
      const contentType = request.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const body = await request.json();
        if (typeof body === 'object' && body !== null) {
          info = body as Partial<DeviceInfo>;
        }
      }
    } catch (e) {
      // Not JSON or parsing failed, continue to query params
    }
  }

  // Fall back to query parameters (for GET /register legacy support)
  if (Object.keys(info).length === 0) {
    const device_key =
      url.searchParams.get('device_key') || url.searchParams.get('key') || undefined;
    const device_token =
      url.searchParams.get('device_token') || url.searchParams.get('devicetoken') || '';
    info = { device_key, device_token };
  }

  // Normalize backward compatibility fields
  if (!info.device_key && info.key) {
    info.device_key = info.key;
  }
  if (!info.device_token && info.devicetoken) {
    info.device_token = info.devicetoken;
  }

  return info as DeviceInfo;
}
