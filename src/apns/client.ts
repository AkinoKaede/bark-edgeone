/**
 * APNs Client
 *
 * HTTP/2 client for sending push notifications to Apple Push Notification Service.
 * Uses the Fetch API which supports HTTP/2 in EdgeOne Edge Functions.
 */

import type { APNsPayload, APNsResponse, APNsNotification } from '../types/apns';
import type { PushMessage } from '../types/common';
import { getToken, clearTokenCache } from './jwt';
import { getAPNsConfig, DEFAULT_SOUND } from './config';
import { buildAlertPayload, buildSilentPayload } from './payload';
import { sendViaProxy } from './proxy-client';

/**
 * Push type for APNs
 */
export type PushType = 'alert' | 'background' | 'voip' | 'complication' | 'fileprovider' | 'mdm';

/**
 * Send a push notification to APNs
 *
 * @param notification - The notification to send
 * @param env - Environment variables (for APNs config)
 * @returns APNs response with status code and reason
 */
export async function sendNotification(
  notification: APNsNotification,
  env?: any
): Promise<APNsResponse> {
  const config = getAPNsConfig(env);

  // Check if proxy is enabled (default: enabled)
  const enableProxy = env?.ENABLE_APN_PROXY !== '0' && env?.ENABLE_APN_PROXY !== 'false';

  if (enableProxy) {
    // Get proxy URL from env or auto-generate from current domain
    let proxyUrl = env?.APNS_PROXY_URL;

    if (!proxyUrl && env?.REQUEST_URL) {
      // Auto-generate proxy URL from request URL
      try {
        const requestUrl = new URL(env.REQUEST_URL);
        proxyUrl = `${requestUrl.protocol}//${requestUrl.host}/apns-proxy`;
      } catch (error) {
        console.warn('Failed to auto-generate proxy URL:', error);
      }
    }

    if (proxyUrl) {
      // Use Node Functions proxy for HTTP/2 support
      return await sendViaProxy(
        notification,
        proxyUrl,
        config.keyId,
        config.teamId,
        config.privateKey
      );
    }
  }

  // Use direct Fetch API (may not work with HTTP/2 on Edge Functions)

  // Build request URL
  const url = `${config.host}/3/device/${notification.deviceToken}`;

  // Build headers
  const baseHeaders: Record<string, string> = {
    'apns-topic': notification.topic || config.topic,
    'apns-push-type': notification.pushType,
    'apns-expiration': String(notification.expiration || 0),
    'content-type': 'application/json',
  };

  // Add optional headers
  if (notification.collapseId) {
    baseHeaders['apns-collapse-id'] = notification.collapseId;
  }

  if (notification.priority) {
    baseHeaders['apns-priority'] = String(notification.priority);
  }

  // Get JWT token (cached if valid)
  let token: string;
  try {
    token = await getToken(config.keyId, config.teamId, config.privateKey);
  } catch (error) {
    return {
      statusCode: 500,
      reason: error instanceof Error ? error.message : 'Failed to generate APNs token',
    };
  }

  const headers: Record<string, string> = {
    ...baseHeaders,
    authorization: `bearer ${token}`,
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(notification.payload),
    });

    const result: APNsResponse = {
      statusCode: response.status,
    };

    // Parse response body for error details
    if (response.status !== 200) {
      const rawBody = await response.text();
      let reason: string | undefined;

      try {
        const parsed = JSON.parse(rawBody) as { reason?: string };
        reason = parsed?.reason;
      } catch {
        // Keep raw body as-is when not JSON
      }

      // If token expired or invalid, clear cache for next request
      if (response.status === 403 && reason === 'ExpiredProviderToken') {
        clearTokenCache();
      }

      result.reason = rawBody || reason;
    }

    // Get apns-id from response headers
    const apnsId = response.headers.get('apns-id');
    if (apnsId) {
      result.apnsId = apnsId;
    }

    return result;
  } catch (error) {
    return {
      statusCode: 500,
      reason: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check if a push message is a delete/silent notification
 */
function isDeletePush(extParams: Record<string, any>): boolean {
  const val = extParams.delete;
  return val === '1' || val === 1 || val === true;
}

/**
 * Check if a push message has empty alert content
 */
function isEmptyAlert(title: string, subtitle: string, body: string): boolean {
  return !title && !subtitle && !body;
}

/**
 * Send a push notification using PushMessage format (compatible with bark-server)
 *
 * @param msg - Push message in bark-server format
 * @param env - Environment variables
 * @returns Status code and error (if any)
 */
export async function push(
  msg: PushMessage,
  env?: any
): Promise<{ code: number; error?: string }> {
  const config = getAPNsConfig(env);

  let payload: APNsPayload;
  let pushType: PushType;

  if (isDeletePush(msg.extParams)) {
    // Silent/background push for delete
    payload = buildSilentPayload(msg.extParams);
    pushType = 'background';
  } else {
    // Regular alert push
    let { title, subtitle, body, sound } = msg;

    // For empty alerts, set a default body (required for APNs)
    if (isEmptyAlert(title, subtitle, body)) {
      body = 'Empty Message';
    }

    // Default sound
    if (!sound) {
      sound = DEFAULT_SOUND;
    }

    payload = buildAlertPayload(title, subtitle, body, sound, msg.extParams);
    pushType = 'alert';
  }

  // Calculate expiration (24 hours from now)
  const expiration = Math.floor(Date.now() / 1000) + 24 * 60 * 60;

  const notification: APNsNotification = {
    deviceToken: msg.deviceToken,
    payload,
    topic: config.topic,
    expiration,
    pushType,
    priority: pushType === 'background' ? 5 : 10,
  };

  // Add collapse ID if provided
  if (msg.id) {
    notification.collapseId = msg.id;
  }

  const response = await sendNotification(notification, env);

  if (response.statusCode !== 200) {
    return {
      code: response.statusCode,
      error: response.reason || 'Push failed',
    };
  }

  return { code: 200 };
}

/**
 * Export for index
 */
export { getAPNsConfig } from './config';
export { getToken, clearTokenCache } from './jwt';
export { PayloadBuilder, newPayload, buildAlertPayload, buildSilentPayload } from './payload';
