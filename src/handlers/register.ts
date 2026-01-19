import type { EventContext } from '../types/common';
import { parseDeviceInfo } from '../utils/parser';
import { validateDeviceToken } from '../utils/validator';
import { generateDeviceKey } from '../utils/uuid';
import { data, failed, success, jsonResponse } from '../utils/response';
import { getDeviceToken, saveDeviceToken, isKVAvailable } from '../utils/kv';
import { isEmpty } from '../utils/string';
import { getErrorMessage } from '../utils/error';
import { logError } from '../utils/logger';

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Handle device registration (POST /register)
 * Supports both modern and legacy field names
 */
export async function handleRegister(context: EventContext): Promise<Response> {
  let deviceKey = '';
  try {
    // Parse device info from request
    const info = await parseDeviceInfo(context.request);

    // Validate device token
    const validation = validateDeviceToken(info.device_token);
    if (!validation.valid) {
      return jsonResponse(failed(400, validation.error!), 400);
    }

    // Generate device key if empty
    deviceKey = info.device_key || '';
    if (isEmpty(deviceKey)) {
      deviceKey = generateDeviceKey();
    }

    // Check KV availability
    if (!isKVAvailable()) {
      return jsonResponse(failed(500, 'KV storage not configured'), 500);
    }

    // Store in KV
    await saveDeviceToken(deviceKey, info.device_token);

    // Return response with both old and new field names for compatibility
    return jsonResponse(
      data({
        key: deviceKey,
        device_key: deviceKey,
        device_token: info.device_token,
      })
    );
  } catch (error: any) {
    logError('handleRegister', error, { device_key: deviceKey }, context.env);
    return jsonResponse(failed(500, getErrorMessage(error)), 500);
  }
}

/**
 * Handle registration check (GET /register/:device_key)
 * Checks if a device key exists in storage
 */
export async function handleRegisterCheck(
  context: EventContext,
  deviceKey: string
): Promise<Response> {
  try {
    // Validate device key
    if (isEmpty(deviceKey)) {
      return jsonResponse(failed(400, 'device_key is required'), 400);
    }

    // Check KV availability
    if (!isKVAvailable()) {
      return jsonResponse(failed(500, 'KV storage not configured'), 500);
    }

    // Get device token
    const token = await getDeviceToken(deviceKey);
    if (!token) {
      return jsonResponse(failed(404, 'device key not found'), 404);
    }

    // Return success if exists
    return jsonResponse(success());
  } catch (error: any) {
    logError('handleRegisterCheck', error, { device_key: deviceKey }, context.env);
    return jsonResponse(failed(500, getErrorMessage(error)), 500);
  }
}
