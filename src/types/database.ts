/**
 * Database interface for device token storage
 */
export interface Database {
  /**
   * Get total count of registered devices
   */
  countAll(): Promise<number>;

  /**
   * Get device token by device key
   * @throws Error if device key not found
   */
  deviceTokenByKey(key: string): Promise<string>;

  /**
   * Save or update device token by key
   * @param key Device key (if empty, a new UUID will be generated)
   * @param token APNs device token
   * @returns The device key (generated or provided)
   */
  saveDeviceTokenByKey(key: string, token: string): Promise<string>;

  /**
   * Delete device by key
   */
  deleteDeviceByKey(key: string): Promise<void>;

  /**
   * Close database connection (no-op for serverless)
   */
  close(): Promise<void>;
}

/**
 * KV Namespace interface (EdgeOne KV)
 */
export interface KVNamespace {
  get(key: string, options?: { type?: 'text' | 'json' | 'arrayBuffer' | 'stream' }): Promise<any>;
  put(key: string, value: string, options?: { expirationTtl?: number; expiration?: number }): Promise<void>;
  delete(key: string): Promise<void>;
  list(options?: { prefix?: string; limit?: number; cursor?: string }): Promise<{
    keys: Array<{ name: string; expiration?: number }>;
    list_complete: boolean;
    cursor?: string;
  }>;
}
