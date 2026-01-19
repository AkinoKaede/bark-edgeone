# APNs 代理功能总结

## 核心特性

✅ **自动启用** - 默认启用代理，无需配置
✅ **自动检测** - 自动根据请求域名生成代理 URL
✅ **灵活配置** - 支持手动指定代理 URL 或禁用代理
✅ **纯粹代理** - Node Functions 只做 HTTP/2 转发，无业务逻辑

## 配置方式

### 1. 默认配置（推荐）⭐

**无需任何环境变量配置**

```
用户访问：https://bark.example.com/push
自动使用：https://bark.example.com/apns-proxy
```

**特点**：
- 零配置，开箱即用
- 自动适配任何域名
- 适合单域名部署

### 2. 手动指定代理

```env
ENABLE_APN_PROXY=true
APNS_PROXY_URL=https://custom-proxy.com/apns-proxy
```

**特点**：
- 使用独立代理服务器
- 适合多域名部署
- 适合 CDN 加速场景

### 3. 禁用代理

```env
ENABLE_APN_PROXY=false
```

**特点**：
- 直接连接 APNs
- 可能因不支持 HTTP/2 而失败
- 仅用于调试或特殊场景

### 4. 代理鉴权（可选）

```env
APNS_PROXY_SECRET=your-shared-secret
```

**特点**：
- Edge Functions 会附带 `x-apns-proxy-auth`
- Node Functions 会验证该头（不转发给 Apple）

## 工作流程

```
┌─────────────────────────────────────────────────────────────┐
│ 1. 用户请求 → Edge Functions                                 │
│    - 接收推送请求                                            │
│    - 验证参数                                                │
│    - 查询设备 token                                          │
│    - 生成 JWT token                                          │
│    - 构建 APNs payload                                       │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. 检测代理配置                                              │
│    - ENABLE_APN_PROXY !== 'false' ?                         │
│      Yes → 继续                                              │
│      No  → 直接连接 APNs (可能失败)                          │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. 确定代理 URL                                              │
│    - 已设置 APNS_PROXY_URL ?                                │
│      Yes → 使用指定的 URL                                    │
│      No  → 从 REQUEST_URL 自动生成                           │
│             https://example.com/push                        │
│             → https://example.com/apns-proxy                │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. 调用代理                                                  │
│    POST https://example.com/apns-proxy/3/device/xxx         │
│    Headers:                                                  │
│      - authorization: bearer {jwt}                          │
│      - apns-topic: me.fin.bark                              │
│      - apns-push-type: alert                                │
│      - x-apns-proxy-auth: {shared-secret} (可选)            │
│      - content-type: application/json                       │
│    Body: { aps: { alert: {...}, sound: "1107" } }          │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. Node Functions 代理 (apns-proxy.ts)                      │
│    - 接收请求                                                │
│    - 提取 path: /3/device/xxx                               │
│    - 提取 headers: authorization, apns-*                    │
│    - 提取 body: { aps: {...} }                              │
│    - 通过 HTTP/2 转发到 api.push.apple.com                  │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. APNs 处理并返回                                           │
│    - 接收推送请求                                            │
│    - 验证 JWT token                                          │
│    - 发送到设备                                              │
│    - 返回结果                                                │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 7. 返回给用户                                                │
│    - 代理转发响应                                            │
│    - Edge Functions 处理响应                                 │
│    - 返回给客户端                                            │
└─────────────────────────────────────────────────────────────┘
```

## 代码实现

### Edge Functions (src/apns/client.ts)

```typescript
export async function sendNotification(
  notification: APNsNotification,
  env?: any
): Promise<APNsResponse> {
  const config = getAPNsConfig(env);

  // 1. 检查是否启用代理（默认启用）
  const enableProxy = env?.ENABLE_APN_PROXY !== 'false';

  if (enableProxy) {
    // 2. 获取代理 URL
    let proxyUrl = env?.APNS_PROXY_URL;

    // 3. 如果未设置，自动生成
    if (!proxyUrl && env?.REQUEST_URL) {
      const requestUrl = new URL(env.REQUEST_URL);
      proxyUrl = `${requestUrl.protocol}//${requestUrl.host}/apns-proxy`;
    }

    // 4. 使用代理
    if (proxyUrl) {
      return await sendViaProxy(notification, proxyUrl, ...);
    }
  }

  // 5. 否则直接连接 APNs
  // ...
}
```

### Node Functions (node-functions/apns-proxy.ts)

```typescript
export async function onRequest(context: any): Promise<Response> {
  // 1. 提取请求信息
  const path = url.pathname;        // /3/device/xxx
  const headers = request.headers;  // 所有 headers
  const body = await request.text(); // 原始 body

  // 2. 转发到 APNs (HTTP/2)
  const result = await forwardToAPNs(path, headers, body);

  // 3. 返回响应
  return new Response(result.body, {
    status: result.statusCode,
    headers: result.headers
  });
}
```

## 优势

1. **零配置** - 默认启用，自动生成代理 URL
2. **灵活性** - 支持自定义代理 URL 或禁用
3. **简单性** - 代理只有 143 行代码
4. **透明性** - 完全透明的请求/响应转发
5. **高性能** - 纯转发，无额外处理

## 文件清单

```
bark-edgeone/
├── node-functions/
│   ├── apns-proxy.ts          # Node Functions 反向代理 (143 行)
│   ├── README.md              # 技术说明
│   └── USAGE.md               # 使用指南
├── src/apns/
│   ├── client.ts              # APNs 客户端（自动检测代理）
│   └── proxy-client.ts        # 代理调用适配器
├── src/handlers/
│   └── push.ts                # 推送处理器（传递 REQUEST_URL）
└── ENV.md                     # 环境变量配置指南
```

## 测试场景

### 场景 1：默认配置
```bash
# 无需环境变量
curl -X POST https://bark.example.com/push \
  -H "Content-Type: application/json" \
  -d '{"device_key":"test","title":"Hello","body":"World"}'

# 自动使用代理：https://bark.example.com/apns-proxy
```

### 场景 2：自定义代理
```bash
# 环境变量
ENABLE_APN_PROXY=true
APNS_PROXY_URL=https://proxy.example.com/apns

# 使用指定代理：https://proxy.example.com/apns
```

### 场景 3：禁用代理
```bash
# 环境变量
ENABLE_APN_PROXY=false

# 直接连接 APNs（可能失败）
```

## 部署清单

- [x] 创建 Node Functions 代理 (apns-proxy.ts)
- [x] 配置路由规则 (/apns-proxy)
- [x] Edge Functions 自动检测代理
- [x] 支持环境变量配置
- [x] 默认启用代理
- [x] 自动生成代理 URL
- [x] 编写文档

## 下一步

1. 部署 Node Functions 到 EdgeOne Pages
2. 测试默认配置（无需环境变量）
3. 验证 HTTP/2 连接是否成功
4. 监控代理性能和错误率
