/**
 * KV storage utilities and constants
 */

/**
 * ListKey - Key item in list result
 */
interface ListKey {
  key: string;
}

/**
 * ListResult - Result of KV list operation
 */
interface ListResult {
  complete: boolean;
  cursor: string;
  keys: Array<ListKey>;
}

/**
 * KV_STORAGE is a global variable injected by EdgeOne
 * Official docs: https://pages.edgeone.ai/zh/document/kv-storage
 */
declare const KV_STORAGE: {
  /**
   * Get value by key
   * @param key The key to retrieve
   * @param object Optional type conversion (text, json, arrayBuffer, stream)
   * @returns The value or null if not found
   */
  get(
    key: string,
    object?: { type: string }
  ): Promise<string | object | ArrayBuffer | ReadableStream>;

  /**
   * Put (write or update) key-value pair
   * @param key The key (max 512 bytes, alphanumeric + underscores)
   * @param value The value (max 25 MB)
   */
  put(
    key: string,
    value: string | ArrayBuffer | ArrayBufferView | ReadableStream
  ): Promise<void>;

  /**
   * Delete key-value pair
   * @param key The key to delete
   */
  delete(key: string): Promise<void>;

  /**
   * List keys with pagination
   * @param options Filter and pagination options
   * @returns ListResult with keys, cursor, and completion status
   */
  list(options?: { prefix?: string; limit?: number; cursor?: string }): Promise<ListResult>;
};

/**
 * KV key prefixes for different data types
 */
export const KV_PREFIXES = {
  DEVICE: 'device:',
} as const;

/**
 * Build KV key for device token storage
 * @param deviceKey The device key (without prefix)
 * @returns Full KV key with prefix (e.g., "device:abc123")
 */
export function buildDeviceKey(deviceKey: string): string {
  return `${KV_PREFIXES.DEVICE}${deviceKey}`;
}

/**
 * Get device token from KV storage
 * @param deviceKey The device key (without prefix)
 * @returns Device token or null if not found
 */
export async function getDeviceToken(deviceKey: string): Promise<string | null> {
  if (typeof KV_STORAGE === 'undefined') {
    throw new Error('KV_STORAGE not available');
  }

  const token = await KV_STORAGE.get(buildDeviceKey(deviceKey), { type: 'text' });
  return (token as string) || null;
}

/**
 * Save device token to KV storage
 * @param deviceKey The device key (without prefix)
 * @param deviceToken The APNs device token
 */
export async function saveDeviceToken(deviceKey: string, deviceToken: string): Promise<void> {
  if (typeof KV_STORAGE === 'undefined') {
    throw new Error('KV_STORAGE not available');
  }

  await KV_STORAGE.put(buildDeviceKey(deviceKey), deviceToken);
}

/**
 * Delete device token from KV storage
 * @param deviceKey The device key (without prefix)
 */
export async function deleteDeviceToken(deviceKey: string): Promise<void> {
  if (typeof KV_STORAGE === 'undefined') {
    throw new Error('KV_STORAGE not available');
  }

  await KV_STORAGE.delete(buildDeviceKey(deviceKey));
}

/**
 * Check if KV_STORAGE is available
 */
export function isKVAvailable(): boolean {
  return typeof KV_STORAGE !== 'undefined';
}

/**
 * Count total number of registered devices
 * @returns Number of devices with device: prefix
 */
export async function countDevices(): Promise<number> {
  if (typeof KV_STORAGE === 'undefined') {
    return 0;
  }

  try {
    let count = 0;
    let cursor: string | undefined = undefined;

    // List all keys with device: prefix
    do {
      let options : any = {
        prefix: KV_PREFIXES.DEVICE,
        limit: 256,
      };

      if (cursor) {
        options.cursor = cursor as string;
      }

      const result = await KV_STORAGE.list(options);

      count += result.keys.length;
      cursor = result.complete ? undefined : result.cursor;
    } while (cursor);

    return count;
  } catch (error) {
    // If KV list fails, return 0
    console.error('Error counting devices:', error);
    return 0;
  }
}
