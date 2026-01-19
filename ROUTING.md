# Bark EdgeOne - Routing Structure

## ⚠️ 重要更新：路由结构调整

**问题**：Edge Functions 的 catch-all 路由会拦截 Node Functions 的请求

**解决方案**：将所有 Edge Functions 移到 `/api` 路径下

## 新的路由结构

```
bark-edgeone/
├── edge-functions/
│   └── api/                      # 所有 Edge Functions 在 /api 下
│       ├── push.ts               # /api/push
│       ├── register/             # /api/register/*
│       │   └── [[key]].ts
│       ├── ping.ts               # /api/ping
│       ├── healthz.ts            # /api/healthz
│       ├── info.ts               # /api/info
│       └── [[default]].ts        # /api/* (V1 API)
│
└── node-functions/
    └── apns-proxy.ts             # /apns-proxy (独立路径)
```

## API 端点

### Edge Functions API

| 功能 | 路径 | 说明 |
|------|------|------|
| V2 推送 | `POST /api/push` | JSON 格式推送 |
| 注册设备 | `POST /api/register` | 注册设备 token |
| 查询注册 | `GET /api/register/:key` | 查询设备状态 |
| 健康检查 | `GET /api/ping` | 健康检查 |
| 健康检查 | `GET /api/healthz` | 健康检查 |
| 服务信息 | `GET /api/info` | 服务器信息 |
| V1 推送 | `GET /api/:key/:body` | V1 API |
| V1 推送 | `GET /api/:key/:title/:body` | V1 API |

### Node Functions

| 功能 | 路径 | 说明 |
|------|------|------|
| APNs 代理 | `/apns-proxy` | HTTP/2 反向代理 |

## 路由优先级

EdgeOne Pages 路由匹配：

1. **精确匹配** > **动态路由** > **Catch-all**
2. **不同类型的 Functions 独立匹配**

结果：
- `/apns-proxy` → Node Functions ✓
- `/api/*` → Edge Functions ✓
- 不会互相冲突 ✓

## 使用示例

### V2 API 推送

```bash
curl -X POST https://bark.example.com/api/push \
  -H "Content-Type: application/json" \
  -d '{
    "device_key": "your_key",
    "title": "Hello",
    "body": "World"
  }'
```

### V1 API 推送（兼容模式）

```bash
# GET 方式
curl https://bark.example.com/api/your_key/Hello/World

# 带标题
curl https://bark.example.com/api/your_key/Title/Hello
```

### 注册设备

```bash
curl -X POST https://bark.example.com/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "device_token": "your_token",
    "key": "custom_key"
  }'
```

### 健康检查

```bash
curl https://bark.example.com/api/ping
```

## 迁移指南

### 旧 API 路径

```
POST /push              → POST /api/push
POST /register          → POST /api/register
GET  /register/:key     → GET  /api/register/:key
GET  /ping              → GET  /api/ping
GET  /healthz           → GET  /api/healthz
GET  /info              → GET  /api/info
GET  /:key/:body        → GET  /api/:key/:body
```

### 兼容性处理

**方案 1：EdgeOne 重定向规则**

在 EdgeOne Pages 配置重定向：
```
/push → /api/push (301)
/register → /api/register (301)
```

**方案 2：通知客户端升级**

发布公告，给予过渡期。

## 自动代理 URL 生成

代理 URL 生成逻辑：

```typescript
// 用户请求：https://bark.example.com/api/push
// REQUEST_URL: https://bark.example.com/api/push
//
// 提取域名：bark.example.com
// 生成代理：https://bark.example.com/apns-proxy ✓
```

代理 URL 格式：`{protocol}://{host}/apns-proxy`

**与 API 路径无关**，无需修改代理逻辑。

## EdgeOne Routing Rules

Based on EdgeOne Pages documentation:

1. **File-based routing**: Directory structure determines URL paths
   - `edge-functions/api/push.ts` → `/api/push`
   - `edge-functions/api/register/[[key]].ts` → `/api/register/*`

2. **Dynamic routes**: Single brackets `[id]` match one path segment
   - Access via `context.params.id`

3. **Catch-all routes**: Double brackets `[[default]]` match multiple segments
   - `edge-functions/api/[[default]].ts` → `/api/*`

4. **Priority**: Specific files > Dynamic routes > Catch-all routes

## V1 API Compatibility

The `[[default]].ts` catch-all handler parses path segments:

```typescript
// /api/device_key → params = { device_key }
// /api/device_key/body → params = { device_key, body }
// /api/device_key/title/body → params = { device_key, title, body }
```

## Implementation Notes

### Path Parsing

```typescript
// edge-functions/api/[[default]].ts
const path = new URL(context.request.url).pathname;
const segments = path.replace('/api/', '').split('/').filter(s => s);

// segments[0] = device_key
// segments[1] = body OR title
// segments[2] = body (if segments[1] is title)
```

### Register Route Handling

```typescript
// edge-functions/api/register/[[key]].ts
const path = new URL(context.request.url).pathname;

if (path === '/api/register') {
  // POST /api/register
  return handleRegister(context);
} else {
  // GET /api/register/:key
  const key = path.replace('/api/register/', '');
  return handleRegisterCheck(context, key);
}
```

## References

- [EdgeOne Edge Functions Routing](https://pages.edgeone.ai/document/edge-functions)
- EdgeOne routing syntax matches Vercel Edge Functions / Next.js App Router conventions
