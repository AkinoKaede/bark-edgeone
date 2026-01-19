import type { Environment } from './environment';

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Common response structure for all API endpoints
 */
export interface CommonResp {
  code: number;
  message: string;
  data?: any;
  timestamp: number;
}

/**
 * Push notification parameters
 */
export interface PushParams {
  // Required fields
  device_key?: string;
  device_keys?: string[];

  // Message content
  title?: string;
  subtitle?: string;
  body?: string;

  // Notification settings
  sound?: string;
  badge?: number;
  level?: 'critical' | 'active' | 'timeSensitive' | 'passive';
  volume?: string;

  // Behavior
  call?: string;
  autoCopy?: string;
  copy?: string;
  isArchive?: string;
  url?: string;
  action?: string;

  // Metadata
  icon?: string;
  group?: string;
  ciphertext?: string;
  id?: string;

  // Extension parameters (any additional fields)
  [key: string]: any;
}

/**
 * Device registration information
 */
export interface DeviceInfo {
  device_key?: string;
  device_token: string;

  // Backward compatibility
  key?: string;
  devicetoken?: string;
}

/**
 * APNs push message structure
 */
export interface PushMessage {
  id?: string;
  deviceToken: string;
  deviceKey: string;

  title: string;
  subtitle: string;
  body: string;
  sound: string;

  extParams: Record<string, any>;
}

/**
 * EdgeOne Event Context
 */
export interface EventContext {
  request: Request;
  params: any;
  env: Environment;
  waitUntil: (promise: Promise<any>) => void;
}
