/**
 * APNs Proxy Client for Edge Functions
 *
 * Sends requests to the reverse proxy which forwards to APNs via HTTP/2.
 */

import type { APNsResponse, APNsNotification } from '../types/apns';
import { getToken } from './jwt';

/**
 * Send APNs notification via reverse proxy
 *
 * @param notification - APNs notification to send
 * @param proxyUrl - URL of the reverse proxy (e.g., https://domain.com/apns-proxy)
 * @param keyId - APNs Key ID
 * @param teamId - Apple Team ID
 * @param privateKey - APNs private key
 * @returns APNs response
 */
export async function sendViaProxy(
  notification: APNsNotification,
  proxyUrl: string,
  keyId: string,
  teamId: string,
  privateKey: string,
  proxySecret?: string
): Promise<APNsResponse> {
  // Generate JWT token
  let token: string;
  try {
    token = await getToken(keyId, teamId, privateKey);
  } catch (error) {
    return {
      statusCode: 500,
      reason: error instanceof Error ? error.message : 'Failed to generate token',
    };
  }

  // Build APNs path
  const path = `/3/device/${notification.deviceToken}`;

  // Build full URL (proxy URL + APNs path)
  const url = proxyUrl.endsWith('/') ? proxyUrl.slice(0, -1) : proxyUrl;
  const fullUrl = `${url}${path}`;

  // Build headers
  const headers: Record<string, string> = {
    'authorization': `bearer ${token}`,
    'apns-topic': notification.topic,
    'apns-push-type': notification.pushType,
    'apns-expiration': String(notification.expiration || 0),
    'content-type': 'application/json',
  };

  if (notification.priority) {
    headers['apns-priority'] = String(notification.priority);
  }

  if (notification.collapseId) {
    headers['apns-collapse-id'] = notification.collapseId;
  }

  if (proxySecret) {
    headers['x-apns-proxy-auth'] = proxySecret;
  }

  try {
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(notification.payload),
    });

    const result: APNsResponse = {
      statusCode: response.status,
    };

    // Get apns-id from response headers
    const apnsId = response.headers.get('apns-id');
    if (apnsId) {
      result.apnsId = apnsId;
    }

    // Parse error response
    if (response.status !== 200) {
      const text = await response.text();
      try {
        const parsed = JSON.parse(text);
        result.reason = parsed.reason || text;
      } catch {
        result.reason = text;
      }
    }

    return result;
  } catch (error) {
    return {
      statusCode: 500,
      reason: error instanceof Error ? error.message : 'Proxy request failed',
    };
  }
}
