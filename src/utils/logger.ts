/**
 * Logging utilities with level support
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

// Default log level
const DEFAULT_LOG_LEVEL = LogLevel.INFO;

/**
 * Get log level from environment
 */
function getLogLevel(env?: any): LogLevel {
  const level = env?.LOG_LEVEL?.toUpperCase();
  switch (level) {
    case 'DEBUG':
      return LogLevel.DEBUG;
    case 'INFO':
      return LogLevel.INFO;
    case 'WARN':
      return LogLevel.WARN;
    case 'ERROR':
      return LogLevel.ERROR;
    default:
      return DEFAULT_LOG_LEVEL;
  }
}

/**
 * Check if should log at given level
 */
function shouldLog(level: LogLevel, env?: any): boolean {
  return level >= getLogLevel(env);
}

/**
 * Log debug message
 */
export function logDebug(context: string, message: string, data?: any, env?: any): void {
  if (shouldLog(LogLevel.DEBUG, env)) {
    console.debug(`[DEBUG][${context}]`, message, data || '');
  }
}

/**
 * Log info message
 */
export function logInfo(context: string, message: string, data?: any, env?: any): void {
  if (shouldLog(LogLevel.INFO, env)) {
    console.info(`[INFO][${context}]`, message, data || '');
  }
}

/**
 * Log warning message
 */
export function logWarn(context: string, message: string, data?: any, env?: any): void {
  if (shouldLog(LogLevel.WARN, env)) {
    console.warn(`[WARN][${context}]`, message, data || '');
  }
}

/**
 * Log error message
 */
export function logError(context: string, error: unknown, data?: any, env?: any): void {
  if (shouldLog(LogLevel.ERROR, env)) {
    console.error(`[ERROR][${context}]`, error, data || '');
  }
}
