/**
 * APNs Module
 *
 * Apple Push Notification Service client for EdgeOne Edge Functions.
 */

// Configuration
export {
  APNS_TOPIC,
  APNS_KEY_ID,
  APNS_TEAM_ID,
  APNS_HOST_PRODUCTION,
  APNS_HOST_DEVELOPMENT,
  PAYLOAD_MAXIMUM,
  DEFAULT_SOUND,
  JWT_TOKEN_VALIDITY_MS,
  getAPNsConfig,
} from './config';

// JWT Token
export { generateJWT, getToken, clearTokenCache } from './jwt';

// Payload Builder
export {
  PayloadBuilder,
  newPayload,
  buildAlertPayload,
  buildSilentPayload,
} from './payload';

// Client
export { sendNotification, push } from './client';
export type { PushType } from './client';
