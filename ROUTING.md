# Bark EdgeOne - Routing Structure

## EdgeOne Routing Rules

Based on EdgeOne Pages documentation:

1. **File-based routing**: Directory structure determines URL paths
   - `edge-functions/push.ts` → `/push`
   - `edge-functions/api/users.ts` → `/api/users`

2. **Dynamic routes**: Single brackets `[id]` match one path segment
   - `edge-functions/register/[device_key].ts` → `/register/:device_key`
   - Access via `context.params.device_key`

3. **Catch-all routes**: Double brackets `[[default]]` match multiple segments
   - `edge-functions/api/[[default]].ts` → `/api/*` (all paths under /api)
   - `edge-functions/[[default]].ts` → `/*` (all unmatched root paths)

4. **Priority**: Specific files > Dynamic routes > Catch-all routes

## Bark EdgeOne Routing Implementation

### Final Route Structure

```
edge-functions/
├── push.ts                  # /push (V2 API)
├── register.ts              # /register and /register/* (handles both paths)
├── ping.ts                  # /ping
├── healthz.ts               # /healthz
├── info.ts                  # /info
└── [[default]].ts           # /* (V1 API catch-all)
```

**Note:** Due to EdgeOne's routing limitations with dynamic route parameters, we use single files that parse the URL path internally to handle multiple routes (e.g., `register.ts` handles both `/register` and `/register/:device_key`).

### Route Matching Examples

| Request | Matched Route | Handler |
|---------|---------------|---------|
| `POST /push` | `push.ts` | V2 API with JSON body |
| `GET /push?device_key=abc&body=test` | `push.ts` | V2 API with query params |
| `POST /register` | `register.ts` | Device registration |
| `GET /register/abc123` | `register.ts` | Check registration status (parses path) |
| `GET /ping` | `ping.ts` | Health check |
| `GET /healthz` | `healthz.ts` | Health check |
| `GET /info` | `info.ts` | Server info |
| `GET /abc123` | `[[default]].ts` | V1 API - device_key |
| `GET /abc123/hello` | `[[default]].ts` | V1 API - device_key + body |
| `GET /abc123/title/hello` | `[[default]].ts` | V1 API - device_key + title + body |
| `POST /abc123/title/hello` | `[[default]].ts` | V1 API - supports POST too |

### Why This Structure?

1. **Backward Compatibility**: The catch-all `[[default]].ts` handles V1 API routes that don't have a `/push` prefix
2. **Clean V2 API**: Explicit routes for V2 endpoints provide clear, RESTful paths
3. **Route Priority**: Specific routes (push, register, ping) are matched before the catch-all
4. **Flexibility**: Supports both GET and POST for push operations

### V1 API Compatibility

The original bark-server supports these V1 formats:
- `GET /:device_key`
- `GET /:device_key/:body`
- `GET /:device_key/:title/:body`
- `GET /:device_key/:title/:subtitle/:body`
- `POST` variants of all above

The `[[default]].ts` catch-all handler parses the path segments and extracts parameters accordingly.

### Implementation Notes

1. **Path Parsing in [[default]].ts**:
   ```typescript
   const segments = path.split('/').filter(s => s);
   // segments[0] = device_key
   // segments[1] = body OR title
   // segments[2] = body (if segments[1] is title)
   // segments[3] = body (if segments[1] is title, segments[2] is subtitle)
   ```

2. **Priority ensures no conflicts**:
   - `/push` is always handled by `push.ts`, never by `[[default]].ts`
   - `/register/abc` is handled by `register/[device_key].ts`
   - `/abc` is handled by `[[default]].ts`

3. **Query parameters** work on all routes:
   - `/push?device_key=abc&body=test`
   - `/abc123?title=hello&sound=default`

## Migration from Incorrect Structure

### Old (Incorrect) Structure
```
edge-functions/
├── push/
│   └── [[route]].ts     # ❌ Would match /push/* but we want /push
└── health/
    ├── ping.ts          # ❌ Would be /health/ping, not /ping
```

### New (Correct) Structure
```
edge-functions/
├── push.ts              # ✅ Matches /push exactly
├── ping.ts              # ✅ Matches /ping exactly
└── [[default]].ts       # ✅ Matches everything else
```

## References

- [EdgeOne Edge Functions Routing](https://pages.edgeone.ai/document/edge-functions)
- EdgeOne routing syntax matches Vercel Edge Functions / Next.js App Router conventions
