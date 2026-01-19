import type { EventContext } from '../src/types/common';
import { countDevices } from '../src/utils/kv';

/**
 * Info endpoint - Server information
 * GET /info
 *
 * Returns server version, architecture, and device count (if enabled)
 *
 * Environment variables:
 * - ENABLE_DEVICE_COUNT: Set to "true" or "1" to enable device counting (default: disabled)
 *   Note: Device counting requires listing all KV keys, which can be expensive for large datasets
 */
export async function onRequest(context: EventContext): Promise<Response> {
  // Check if device counting is enabled via environment variable
  const enableDeviceCount = context.env.ENABLE_DEVICE_COUNT === 'true' || context.env.ENABLE_DEVICE_COUNT === '1';

  const info: any = {
    version: 'v2.0.0',
    arch: 'edgeone/v8',
    commit: 'HEAD',
  };

  // Only include devices field if enabled (expensive operation)
  if (enableDeviceCount) {
    info.devices = await countDevices();
  }

  return new Response(JSON.stringify(info), {
    status: 200,
    headers: {
      'content-type': 'application/json',
    },
  });
}
