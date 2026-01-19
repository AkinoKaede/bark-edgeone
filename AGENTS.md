# Agent Guidelines for Bark EdgeOne

This document provides coding guidelines and conventions for AI agents working on the Bark EdgeOne codebase.

## Project Overview

Bark EdgeOne is a push notification server implementation for EdgeOne Pages Edge Functions, providing APNs integration with global edge deployment.

**Tech Stack:** TypeScript, EdgeOne Pages, Vitest, ESLint, Prettier

## Build, Test, and Lint Commands

### Build
```bash
npm run build              # Compile TypeScript to dist/
npm run type-check         # Type check without emitting files
```

### Testing
```bash
npm test                   # Run all tests once
npm run test:watch         # Run tests in watch mode
npm run test:coverage      # Run tests with coverage report

# Run a single test file
npx vitest run src/utils/__tests__/string.test.ts

# Run tests matching a pattern
npx vitest run -t "isEmpty"
```

### Linting and Formatting
```bash
npm run lint               # Check for linting errors
npm run lint:fix           # Auto-fix linting errors
npm run format             # Format all files
npm run format:check       # Check formatting without changes
```

### Local Development
```bash
npx edgeone pages dev          # Start local dev server on http://localhost:8788
```

### Deploy to EdgeOne Pages
```bash
npx edgeone pages deploy          # Start local dev server on http://localhost:8088
```

## Project Structure

```
bark-edgeone/
├── src/                   # Core source code
│   ├── apns/             # APNs integration (JWT, payload, push)
│   ├── handlers/         # Business logic handlers
│   ├── types/            # TypeScript type definitions
│   └── utils/            # Utility functions
├── edge-functions/        # EdgeOne edge function endpoints
│   └── api/              # API route handlers
├── node-functions/        # Node.js serverless functions
├── dist/                 # Compiled output
└── __tests__/            # Test files (co-located with source)
```

## Code Style Guidelines

### Imports
- Use ES6 import syntax
- Import types with `type` keyword: `import type { Foo } from './types'`
- Group imports: external packages first, then internal modules
- Use relative paths for local imports

```typescript
import type { EventContext } from '../../src/types/common';
import { success, jsonResponse } from '../../src/utils/response';
```

### Formatting
- **Indentation:** 2 spaces (no tabs)
- **Line length:** 100 characters max
- **Quotes:** Single quotes for strings (except to avoid escaping)
- **Semicolons:** Always required
- **Trailing commas:** ES5 style (objects, arrays)
- **Arrow functions:** Always use parentheses around parameters
- **Line endings:** LF (Unix style)

### TypeScript
- **Strict mode:** Enabled - all strict checks are enforced
- **Target:** ES2020
- **Module:** CommonJS
- **Type annotations:** Prefer explicit return types for exported functions
- **Any usage:** Avoid `any`; use `unknown` or proper types. If `any` is necessary, add `/* eslint-disable @typescript-eslint/no-explicit-any */` with justification
- **Unused vars:** Prefix with underscore if intentionally unused: `_context`

```typescript
// Good
export async function getToken(keyId: string): Promise<string> {
  // ...
}

// Acceptable with comment
/* eslint-disable @typescript-eslint/no-explicit-any */
export interface CommonResp {
  data?: any; // Dynamic response data
}
```

### Naming Conventions
- **Files:** kebab-case (`push-handler.ts`, `string.test.ts`)
- **Functions:** camelCase (`generateJWT`, `normalizeSound`)
- **Classes:** PascalCase (if used)
- **Interfaces/Types:** PascalCase (`EventContext`, `PushParams`)
- **Constants:** UPPER_SNAKE_CASE (`APNS_KEY_ID`, `JWT_TOKEN_VALIDITY_MS`)
- **Private/unused params:** Prefix with underscore (`_context`, `_unused`)

### Functions and Documentation
- Add JSDoc comments for exported functions and complex logic
- Include parameter descriptions and return types
- Document edge cases and important behavior

```typescript
/**
 * Generate JWT token for APNs authentication
 *
 * @param keyId - APNs Key ID (default from config)
 * @param teamId - Apple Developer Team ID (default from config)
 * @param privateKey - P8 private key in PEM format (default from config)
 * @returns JWT token string
 */
export async function generateJWT(
  keyId: string = APNS_KEY_ID,
  teamId: string = APNS_TEAM_ID,
  privateKey: string = APNS_PRIVATE_KEY
): Promise<string> {
  // Implementation
}
```

### Error Handling
- Use try-catch for async operations
- Extract error messages with utility functions: `getErrorMessage(error)`
- Return structured error responses using response utilities
- Check error types before accessing properties

```typescript
try {
  await someAsyncOperation();
} catch (error) {
  const message = getErrorMessage(error);
  return jsonResponse(failure(message, 500));
}
```

### Testing
- Use Vitest for all tests
- Place tests in `__tests__` directories next to source files
- Name test files: `*.test.ts`
- Use descriptive test names with `describe` and `it`
- Test edge cases, error conditions, and happy paths

```typescript
import { describe, it, expect } from 'vitest';

describe('isEmpty', () => {
  it('should return true for undefined', () => {
    expect(isEmpty(undefined)).toBe(true);
  });

  it('should return false for non-empty string', () => {
    expect(isEmpty('hello')).toBe(false);
  });
});
```

## EdgeOne Specifics

### Edge Function Structure
- Export `onRequest` function for edge function handlers
- Accept `EventContext` parameter containing request, env, params
- Return `Response` objects using response utilities

```typescript
export async function onRequest(context: EventContext): Promise<Response> {
  return jsonResponse(success());
}
```

### Environment Variables
- Access via `context.env` in edge functions
- Define types in `src/types/environment.ts`
- Never commit `.env` files

## Common Patterns

### Response Handling
Use utility functions from `src/utils/response.ts`:
- `success(data?, message?)` - Success response
- `failure(message, code?)` - Error response
- `jsonResponse(data, status?)` - JSON response wrapper

### String Utilities
- `isEmpty(str)` - Check for empty/whitespace strings
- `safeDecodeURIComponent(str)` - Safe URI decoding
- `normalizeSound(sound)` - Normalize sound file names

## Important Notes

- **No console restrictions:** `console.log` is allowed for debugging
- **Explicit any:** Warn on `any` usage but don't block
- **Function return types:** Not required but recommended for exports
- **Coverage exclusions:** Types, config files, and dist/ are excluded from coverage
