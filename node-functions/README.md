# APNs Reverse Proxy - Node Functions

纯粹的 HTTP/2 反向代理，将所有请求转发到 Apple Push Notification Service。

## 工作原理

```
Edge Functions                    Node Functions                APNs
     |                                  |                         |
     | POST /apns-proxy/3/device/xxx    |                         |
     | Headers: authorization, apns-*   |                         |
     | Body: { aps: {...} }             |                         |
     |--------------------------------->|                         |
     |                                  | POST /3/device/xxx      |
     |                                  | (via HTTP/2)            |
     |                                  |------------------------>|
     |                                  |                         |
     |                                  |<------------------------|
     |<---------------------------------|                         |
     | 200 OK                           |                         |
     | apns-id: xxx                     |                         |
```

**反向代理职责**：
- 接收请求
- 通过 HTTP/2 转发到 APNs
- 返回响应

**不做任何业务逻辑处理**。

## 使用方式

### Edge Functions 调用

```typescript
// 直接调用代理，就像调用 APNs 一样
const response = await fetch('https://your-domain.com/apns-proxy/3/device/xxx', {
  method: 'POST',
  headers: {
    'authorization': 'bearer xxx',  // JWT token
    'apns-topic': 'me.fin.bark',
    'apns-push-type': 'alert',
    'apns-expiration': '0',
    'apns-priority': '10',
    'x-apns-proxy-auth': 'your-shared-secret', // 可选
    'content-type': 'application/json',
  },
  body: JSON.stringify({
    aps: {
      alert: {
        title: 'Hello',
        body: 'World'
      },
      sound: '1107'
    }
  })
});
```

### 路由规则

代理会自动处理路径：

- 请求：`/apns-proxy/3/device/xxx` → 转发到 APNs：`/3/device/xxx`
- 请求：`/3/device/xxx` → 转发到 APNs：`/3/device/xxx`

## 部署配置

### 1. 部署 Node Function

在 EdgeOne Pages 中部署 `node-functions/apns-proxy.ts`，路由设置为 `/apns-proxy`。

### 2. 配置环境变量（可选）

```env
# 是否启用代理（默认：启用）
# 设置为 false 禁用代理，直接使用 Fetch API 连接 APNs
ENABLE_APN_PROXY=true

# 代理 URL（可选）
# 如果不设置，会自动根据请求域名生成（推荐）
# 例如：请求 https://example.com/push 时，自动使用 https://example.com/apns-proxy
APNS_PROXY_URL=https://your-domain.com/apns-proxy
```

### 3. 配置说明

**默认行为（推荐）**：
- 不设置任何环境变量
- 代理自动启用
- 代理 URL 自动根据请求域名生成

**手动指定代理 URL**：
```env
ENABLE_APN_PROXY=true
APNS_PROXY_URL=https://custom-domain.com/apns-proxy
```

**禁用代理（直接连接 APNs）**：
```env
ENABLE_APN_PROXY=false
```

### 3. 代理鉴权（可选）

配置共享密钥后，Edge Functions 会自动添加 `x-apns-proxy-auth` 头，Node Functions 会验证该头并拒绝未授权请求（不转发给 Apple）。

```env
APNS_PROXY_SECRET=your-shared-secret
```

请求示例：
```http
x-apns-proxy-auth: your-shared-secret
```

### 4. 自动使用

代码会自动检测并使用代理，无需修改代码。

## 技术细节

### 纯粹的反向代理

```typescript
// 接收请求
const path = url.pathname; // /3/device/xxx
const headers = request.headers; // 所有 headers
const body = await request.text(); // 原始 body

// 转发到 APNs (HTTP/2)
const result = await forwardToAPNs(path, headers, body);

// 返回响应
return new Response(result.body, {
  status: result.statusCode,
  headers: result.headers
});
```

### HTTP/2 实现

使用 Node.js 原生 `http2` 模块：

```typescript
const client = http2.connect('https://api.push.apple.com:443');
const req = client.request({
  ':method': 'POST',
  ':path': path,
  ...headers  // 转发所有 headers
});
req.write(body);  // 转发 body
```

## 优势

1. **简单** - 只有 ~130 行代码
2. **透明** - 完全透明的转发，不修改请求/响应
3. **无状态** - 不保存任何数据
4. **高性能** - 纯转发，无额外处理
