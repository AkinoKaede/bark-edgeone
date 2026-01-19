/**
 * APNs Payload Builder
 *
 * Builds the JSON payload for Apple Push Notification Service.
 * Follows the APNs payload format specification.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { APNsPayload } from '../types/apns';
import { PAYLOAD_MAXIMUM } from './config';
import { normalizeSound } from '../utils/string';

/**
 * Payload builder class with fluent interface
 */
export class PayloadBuilder {
  private payload: APNsPayload = {
    aps: {},
  };

  /**
   * Set alert title
   */
  alertTitle(title: string): this {
    if (!this.payload.aps.alert || typeof this.payload.aps.alert === 'string') {
      this.payload.aps.alert = {};
    }
    this.payload.aps.alert.title = title;
    return this;
  }

  /**
   * Set alert subtitle
   */
  alertSubtitle(subtitle: string): this {
    if (!this.payload.aps.alert || typeof this.payload.aps.alert === 'string') {
      this.payload.aps.alert = {};
    }
    this.payload.aps.alert.subtitle = subtitle;
    return this;
  }

  /**
   * Set alert body
   */
  alertBody(body: string): this {
    if (!this.payload.aps.alert || typeof this.payload.aps.alert === 'string') {
      this.payload.aps.alert = {};
    }
    this.payload.aps.alert.body = body;
    return this;
  }

  /**
   * Set notification sound
   * Automatically appends .caf extension if not present
   */
  sound(sound: string): this {
    this.payload.aps.sound = normalizeSound(sound);
    return this;
  }

  /**
   * Set badge number
   */
  badge(badge: number): this {
    this.payload.aps.badge = badge;
    return this;
  }

  /**
   * Set thread ID for notification grouping
   */
  threadId(threadId: string): this {
    this.payload.aps['thread-id'] = threadId;
    return this;
  }

  /**
   * Set category for notification actions
   */
  category(category: string): this {
    this.payload.aps.category = category;
    return this;
  }

  /**
   * Enable mutable content (for notification service extension)
   */
  mutableContent(): this {
    this.payload.aps['mutable-content'] = 1;
    return this;
  }

  /**
   * Enable content available (for background push)
   */
  contentAvailable(): this {
    this.payload.aps['content-available'] = 1;
    return this;
  }

  /**
   * Set interruption level (iOS 15+)
   * - passive: No sound, no vibration, no screen wake
   * - active: Default behavior
   * - time-sensitive: Breaks through Focus mode
   * - critical: Breaks through Do Not Disturb (requires entitlement)
   */
  interruptionLevel(level: 'passive' | 'active' | 'time-sensitive' | 'critical'): this {
    this.payload.aps['interruption-level'] = level;
    return this;
  }

  /**
   * Set relevance score (0.0 to 1.0) for notification summary
   */
  relevanceScore(score: number): this {
    this.payload.aps['relevance-score'] = Math.max(0, Math.min(1, score));
    return this;
  }

  /**
   * Add custom key-value pair to payload
   */
  custom(key: string, value: any): this {
    // Don't overwrite aps
    if (key !== 'aps') {
      this.payload[key] = value;
    }
    return this;
  }

  /**
   * Build and return the payload object
   */
  build(): APNsPayload {
    return this.payload;
  }

  /**
   * Build and return the payload as JSON string
   */
  toJSON(): string {
    return JSON.stringify(this.payload);
  }

  /**
   * Check if payload size exceeds maximum
   */
  isOversize(): boolean {
    return new TextEncoder().encode(this.toJSON()).length > PAYLOAD_MAXIMUM;
  }

  /**
   * Get payload size in bytes
   */
  getSize(): number {
    return new TextEncoder().encode(this.toJSON()).length;
  }
}

/**
 * Create a new payload builder instance
 */
export function newPayload(): PayloadBuilder {
  return new PayloadBuilder();
}

/**
 * Build a standard alert notification payload
 */
export function buildAlertPayload(
  title: string,
  subtitle: string,
  body: string,
  sound: string,
  extParams: Record<string, any> = {}
): APNsPayload {
  const builder = newPayload()
    .mutableContent()
    .alertBody(body)
    .sound(sound)
    .category('myNotificationCategory');

  if (title) {
    builder.alertTitle(title);
  }

  if (subtitle) {
    builder.alertSubtitle(subtitle);
  }

  // Handle group/thread-id
  if (extParams.group) {
    builder.threadId(String(extParams.group));
  }

  // Handle interruption level
  if (extParams.level) {
    const level = String(extParams.level).toLowerCase();
    if (['passive', 'active', 'time-sensitive', 'critical'].includes(level)) {
      builder.interruptionLevel(level as any);
    }
  }

  // Handle badge
  if (extParams.badge !== undefined) {
    const badge = parseInt(String(extParams.badge), 10);
    if (!isNaN(badge)) {
      builder.badge(badge);
    }
  }

  // Add all custom parameters (lowercase keys)
  for (const [key, value] of Object.entries(extParams)) {
    builder.custom(key.toLowerCase(), String(value));
  }

  return builder.build();
}

/**
 * Build a silent/background push notification payload
 */
export function buildSilentPayload(extParams: Record<string, any> = {}): APNsPayload {
  const builder = newPayload().mutableContent().contentAvailable();

  // Add all custom parameters (lowercase keys)
  for (const [key, value] of Object.entries(extParams)) {
    builder.custom(key.toLowerCase(), String(value));
  }

  return builder.build();
}
