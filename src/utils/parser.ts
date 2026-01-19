import type { EventContext, PushParams } from '../types/common';

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
      // Ignore parse errors, params will be empty
    }
  } else if (contentType.includes('application/x-www-form-urlencoded')) {
    // Parse form data
    try {
      const formData = await request.formData();
      formData.forEach((value, key) => {
        params[key.toLowerCase()] = value;
      });
    } catch (error) {
      // Ignore parse errors
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
      try {
        // URL decode the parameter
        result[key.toLowerCase()] = decodeURIComponent(value);
      } catch {
        result[key.toLowerCase()] = value;
      }
    }
  }

  return result;
}

/**
 * Parse V1 API route parameters
 * Routes: /:device_key/:title/:body or /:device_key/:title/:subtitle/:body
 */
export function parseV1Route(route: string): PushParams | null {
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
