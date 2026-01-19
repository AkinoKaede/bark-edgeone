/**
 * Push Notification Handler
 *
 * Handles push notification requests for both V1 and V2 APIs.
 * Compatible with bark-server implementation.
 */

import type { EventContext, PushParams, PushMessage } from '../types/common';
import { push } from '../apns/client';
import { DEFAULT_SOUND } from '../apns/config';
import { getDeviceToken, deleteDeviceToken, saveDeviceToken } from '../utils/kv';
import { success, failed, data, jsonResponse, errorResponse } from '../utils/response';
import { parseParams, parseV1Route } from '../utils/parser';

/**
 * Maximum number of batch pushes allowed (-1 means no limit)
 */
const DEFAULT_MAX_BATCH_COUNT = -1;

/**
 * Build PushMessage from request parameters
 * Compatible with bark-server parameter handling
 */
function buildPushMessage(params: Record<string, any>): PushMessage {
  const msg: PushMessage = {
    id: '',
    deviceToken: '',
    deviceKey: '',
    title: '',
    subtitle: '',
    body: '',
    sound: DEFAULT_SOUND,
    extParams: {},
  };

  for (const [key, val] of Object.entries(params)) {
    const lowerKey = key.toLowerCase();

    if (typeof val === 'string') {
      switch (lowerKey) {
        case 'id':
          msg.id = val;
          msg.extParams['id'] = val;
          break;
        case 'device_key':
          msg.deviceKey = val;
          break;
        case 'subtitle':
          msg.subtitle = val;
          break;
        case 'title':
          msg.title = val;
          break;
        case 'body':
          msg.body = val;
          break;
        case 'sound':
          // Compatible with old parameters - add .caf if not present
          msg.sound = val.endsWith('.caf') ? val : `${val}.caf`;
          break;
        default:
          // All other parameters go to extParams (lowercase)
          msg.extParams[lowerKey] = val;
      }
    } else if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
      // Nested objects are merged into extParams
      for (const [k, v] of Object.entries(val)) {
        msg.extParams[k] = v;
      }
    } else {
      // Other types (numbers, booleans, arrays) go to extParams
      msg.extParams[lowerKey] = val;
    }
  }

  return msg;
}

/**
 * Check if message has empty alert content
 */
function isEmptyAlert(msg: PushMessage): boolean {
  return !msg.title && !msg.body && !msg.subtitle;
}

/**
 * Execute a single push notification
 */
async function executePush(
  params: Record<string, any>,
  env?: any
): Promise<{ code: number; error?: string }> {
  // Build push message from params
  const msg = buildPushMessage(params);

  // Validate device_key
  if (!msg.deviceKey) {
    return { code: 400, error: 'device key is empty' };
  }

  // For empty alerts, set default body (required for APNs)
  if (isEmptyAlert(msg)) {
    msg.body = 'Empty Message';
  }

  // Get device token from KV storage
  let deviceToken: string | null;
  try {
    deviceToken = await getDeviceToken(msg.deviceKey);
  } catch (error) {
    return {
      code: 400,
      error: `failed to get device token: ${error instanceof Error ? error.message : 'unknown error'}`,
    };
  }

  if (!deviceToken) {
    return { code: 400, error: 'device token not found' };
  }

  // Validate device token length
  if (deviceToken.length > 128) {
    // Remove invalid token
    try {
      await deleteDeviceToken(msg.deviceKey);
    } catch {
      // Ignore delete errors
    }
    return { code: 400, error: 'invalid device token, has been removed' };
  }

  msg.deviceToken = deviceToken;

  // Send push notification
  const result = await push(msg, env);

  // Handle invalid token responses - clear from database
  if (
    result.code === 410 ||
    (result.code === 400 && result.error?.includes('BadDeviceToken'))
  ) {
    try {
      // Save empty token to mark as invalid (same as bark-server)
      await saveDeviceToken(msg.deviceKey, '');
    } catch {
      // Ignore save errors
    }
  }

  if (result.code !== 200) {
    return { code: result.code, error: result.error };
  }

  return { code: 200 };
}

/**
 * Handle V2 API push request (POST /push with JSON body)
 */
export async function handlePushV2(context: EventContext): Promise<Response> {
  const { request, env } = context;

  // Parse all parameters
  let params: Record<string, any>;
  try {
    params = await parseParams(context);
  } catch (error) {
    return errorResponse(400, 'request bind failed');
  }

  // Check for batch push (device_keys array)
  let deviceKeys: string[] = [];

  if (params.device_keys) {
    const keys = params.device_keys;

    if (typeof keys === 'string') {
      // Comma-separated string
      deviceKeys = keys.split(',').map((k: string) => k.trim()).filter(Boolean);
    } else if (Array.isArray(keys)) {
      // Array of strings
      deviceKeys = keys.map((k: any) => String(k).trim()).filter(Boolean);
    } else {
      return errorResponse(400, 'invalid type for device_keys');
    }

    // Remove device_keys from params (will be set individually)
    delete params.device_keys;
  }

  // Single push
  if (deviceKeys.length === 0) {
    const result = await executePush(params, env);

    if (result.code !== 200) {
      return jsonResponse(failed(result.code, result.error || 'push failed'), result.code);
    }

    return jsonResponse(success());
  }

  // Batch push
  const maxBatchCount = parseInt(env?.MAX_BATCH_PUSH_COUNT || String(DEFAULT_MAX_BATCH_COUNT), 10);

  if (maxBatchCount > 0 && deviceKeys.length > maxBatchCount) {
    return errorResponse(400, `batch push count exceeds the maximum limit: ${maxBatchCount}`);
  }

  // Execute all pushes in parallel
  const results = await Promise.all(
    deviceKeys.map(async (deviceKey) => {
      const pushParams = { ...params, device_key: deviceKey };
      const result = await executePush(pushParams, env);

      const item: Record<string, any> = {
        code: result.code,
        device_key: deviceKey,
      };

      if (result.error) {
        item.message = result.error;
      }

      return item;
    })
  );

  return jsonResponse(data(results));
}

/**
 * Handle V1 API push request (GET/POST /:device_key/:title/:body)
 */
export async function handlePushV1(
  context: EventContext,
  pathParams?: Record<string, string>
): Promise<Response> {
  const { request, env } = context;

  // Start with path parameters
  const params: Record<string, any> = { ...pathParams };

  // Parse query parameters (lower priority than path)
  const url = new URL(request.url);
  url.searchParams.forEach((value, key) => {
    if (!params[key.toLowerCase()]) {
      params[key.toLowerCase()] = value;
    }
  });

  // Parse POST body if present
  if (request.method === 'POST') {
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('application/x-www-form-urlencoded')) {
      try {
        const formData = await request.formData();
        formData.forEach((value, key) => {
          // Form data has lower priority than path params
          if (!params[key.toLowerCase()]) {
            params[key.toLowerCase()] = value;
          }
        });
      } catch {
        // Ignore form parse errors
      }
    } else if (contentType.includes('multipart/form-data')) {
      try {
        const formData = await request.formData();
        formData.forEach((value, key) => {
          if (!params[key.toLowerCase()] && typeof value === 'string') {
            params[key.toLowerCase()] = value;
          }
        });
      } catch {
        // Ignore multipart parse errors
      }
    }
  }

  // Execute push
  const result = await executePush(params, env);

  if (result.code !== 200) {
    return jsonResponse(failed(result.code, result.error || 'push failed'), result.code);
  }

  return jsonResponse(success());
}

/**
 * Parse V1 route path and handle push
 * Used by the catch-all handler
 */
export async function handleV1Route(context: EventContext): Promise<Response> {
  const url = new URL(context.request.url);
  const path = url.pathname;

  // Parse path segments
  const pathParams = parseV1Route(path);

  if (!pathParams || !pathParams.device_key) {
    return errorResponse(400, 'device key is empty');
  }

  // Decode URL-encoded parameters
  const decodedParams: Record<string, string> = {};
  for (const [key, value] of Object.entries(pathParams)) {
    if (typeof value === 'string') {
      try {
        decodedParams[key] = decodeURIComponent(value);
      } catch {
        decodedParams[key] = value;
      }
    }
  }

  return handlePushV1(context, decodedParams);
}
