/**
 * APNs Reverse Proxy using Node.js HTTP/2
 *
 * Simple reverse proxy that forwards all requests to APNs via HTTP/2.
 * No business logic, just pure HTTP/2 transport.
 */

import http2 from 'http2';

const APNS_HOST = 'api.push.apple.com';
const APNS_PORT = 443;
const PROXY_AUTH_HEADER = 'x-apns-proxy-auth';

function constantTimeEquals(a: string, b: string): boolean {
  const maxLength = Math.max(a.length, b.length);
  let result = a.length ^ b.length;

  for (let i = 0; i < maxLength; i++) {
    const aCode = i < a.length ? a.charCodeAt(i) : 0;
    const bCode = i < b.length ? b.charCodeAt(i) : 0;
    result |= aCode ^ bCode;
  }

  return result === 0;
}

/**
 * Forward request to APNs via HTTP/2
 */
function forwardToAPNs(
  path: string,
  headers: Record<string, string>,
  body: string
): Promise<{ statusCode: number; headers: any; body: string }> {
  return new Promise((resolve, reject) => {
    const client = http2.connect(`https://${APNS_HOST}:${APNS_PORT}`);

    client.on('error', (err) => {
      client.close();
      reject(err);
    });

    // Build HTTP/2 headers
    const http2Headers: Record<string, string> = {
      ':method': 'POST',
      ':path': path,
      ':scheme': 'https',
    };

    // Forward all headers from request
    for (const [key, value] of Object.entries(headers)) {
      const lowerKey = key.toLowerCase();
      // Skip host header
      if (lowerKey !== 'host' && lowerKey !== PROXY_AUTH_HEADER) {
        http2Headers[lowerKey] = value;
      }
    }

    const req = client.request(http2Headers);

    let responseData = '';
    let statusCode = 0;
    let responseHeaders: any = {};

    req.on('response', (headers) => {
      statusCode = Number(headers[':status']);
      responseHeaders = headers;
    });

    req.on('data', (chunk) => {
      responseData += chunk;
    });

    req.on('end', () => {
      client.close();
      resolve({
        statusCode,
        headers: responseHeaders,
        body: responseData,
      });
    });

    req.on('error', (err) => {
      client.close();
      reject(err);
    });

    // Forward body
    if (body) {
      req.write(body);
    }
    req.end();
  });
}

/**
 * Node Function handler - Simple reverse proxy
 */
export async function onRequest(context: any): Promise<Response> {
  const { request } = context;

  try {
    const expectedSecret = context?.env?.APNS_PROXY_SECRET;
    if (expectedSecret) {
      const receivedSecret = request.headers.get(PROXY_AUTH_HEADER) || '';
      if (!receivedSecret || !constantTimeEquals(receivedSecret, expectedSecret)) {
        return new Response(JSON.stringify({ reason: 'Unauthorized' }), {
          status: 401,
          headers: { 'content-type': 'application/json' },
        });
      }
    }

    // Get path (remove /apns-proxy prefix if exists)
    const url = new URL(request.url);
    let path = url.pathname;

    // If path starts with /apns-proxy, remove it
    if (path.startsWith('/apns-proxy')) {
      path = path.substring('/apns-proxy'.length);
    }

    // Get all headers
    const headers: Record<string, string> = {};
    request.headers.forEach((value: string, key: string) => {
      headers[key] = value;
    });

    // Get body
    const body = await request.text();

    // Forward to APNs
    const result = await forwardToAPNs(path, headers, body);

    // Build response headers
    const responseHeaders: Record<string, string> = {
      'content-type': 'application/json',
    };

    // Forward apns-id if present
    if (result.headers['apns-id']) {
      responseHeaders['apns-id'] = result.headers['apns-id'];
    }

    // Return response
    return new Response(result.body, {
      status: result.statusCode,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('Proxy error:', error);

    return new Response(
      JSON.stringify({
        reason: error instanceof Error ? error.message : 'Proxy error',
      }),
      {
        status: 500,
        headers: { 'content-type': 'application/json' },
      }
    );
  }
}
