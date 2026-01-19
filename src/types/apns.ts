/**
 * APNs APS payload structure
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface APNsAPS {
  alert?: {
    title?: string;
    subtitle?: string;
    body?: string;
  };
  sound?: string;
  badge?: number;
  'thread-id'?: string;
  category?: string;
  'mutable-content'?: number;
  'content-available'?: number;
  'interruption-level'?: 'passive' | 'active' | 'time-sensitive' | 'critical';
  'relevance-score'?: number;
}

/**
 * APNs notification payload
 */
export interface APNsPayload {
  aps: APNsAPS;
  [key: string]: any;
}

/**
 * APNs notification structure
 */
export interface APNsNotification {
  deviceToken: string;
  payload: APNsPayload;
  topic: string;
  expiration: number;
  collapseId?: string;
  pushType: 'alert' | 'background' | 'voip' | 'complication' | 'fileprovider' | 'mdm';
  priority?: number;
}

/**
 * APNs response
 */
export interface APNsResponse {
  statusCode: number;
  reason?: string;
  apnsId?: string;
}

/**
 * APNs client configuration
 */
export interface APNsConfig {
  keyId: string;
  teamId: string;
  topic: string;
  privateKey: string;
  production?: boolean;
}

/**
 * JWT header for APNs authentication
 */
export interface JWTHeader {
  alg: string;
  kid: string;
}

/**
 * JWT payload for APNs authentication
 */
export interface JWTPayload {
  iss: string;
  iat: number;
}
