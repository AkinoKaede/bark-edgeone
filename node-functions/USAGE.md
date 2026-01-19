# APNs Node Functions 代理使用指南

## 快速开始

### 1. 部署 Node Function

在 EdgeOne Pages 控制台中：

1. 进入 **Node Functions** 配置
2. 创建新函数，命名为 `apns-proxy`
3. 上传 `node-functions/apns-proxy.ts`
4. 设置路由规则：`/apns-proxy`

### 2. 配置 Edge Functions（可选）

**方式一：默认配置（推荐）**

不设置任何环境变量，代理会自动启用并根据请求域名生成代理 URL。

例如：
- 用户访问 `https://example.com/push`
- 自动使用代理 `https://example.com/apns-proxy`

**方式二：手动指定代理 URL**

```env
ENABLE_APN_PROXY=true
APNS_PROXY_URL=https://custom-domain.com/apns-proxy
```

**方式三：禁用代理（直接连接 APNs）**

```env
ENABLE_APN_PROXY=false
```

注意：Edge Functions 的 Fetch API 可能不支持 HTTP/2，禁用代理可能导致无法连接 APNs。

### 3. 测试连接

```bash
# 使用 curl 测试代理
curl -X POST https://your-domain.com/apns-proxy \
  -H "Content-Type: application/json" \
  -d '{
    "device_token": "your-test-device-token",
    "payload": {
      "aps": {
        "alert": {
          "title": "Test",
          "body": "Testing HTTP/2 connection"
        },
        "sound": "1107"
      }
    },
    "headers": {
      "authorization": "bearer your-jwt-token",
      "apns-topic": "me.fin.bark",
      "apns-push-type": "alert",
      "apns-expiration": "0",
      "apns-priority": "10"
    }
  }'
```

预期响应（成功）：
```json
{
  "statusCode": 200,
  "apnsId": "xxx-xxx-xxx"
}
```

预期响应（失败）：
```json
{
  "statusCode": 400,
  "reason": "BadDeviceToken",
  "apnsId": "xxx-xxx-xxx"
}
```

## 与现有代码集成

代码已经自动集成，无需修改。在 `src/apns/client.ts` 中：

```typescript
export async function sendNotification(
  notification: APNsNotification,
  env?: any
): Promise<APNsResponse> {
  const config = getAPNsConfig(env);

  // 自动检测代理配置
  const proxyUrl = env?.APNS_PROXY_URL;
  if (proxyUrl) {
    // 使用 Node Functions 代理
    return await sendViaProxy(
      notification,
      proxyUrl,
      config.keyId,
      config.teamId,
      config.privateKey
    );
  }

  // 否则使用直接的 Fetch API
  // ...
}
```

## 工作原理

```
用户 → Edge Functions → Node Functions → APNs
       ↓
    1. 接收请求
    2. 验证数据
    3. 查询数据库
    4. 生成 JWT token (Web Crypto API)
    5. 构建 payload
       ↓
                    → 6. HTTP/2 转发
                    ← 7. 返回响应
       ↓
    8. 返回给用户
```

## 故障排查

### 代理返回 400 错误

检查请求格式：
- `device_token` 是否存在
- `payload` 是否存在
- `headers.authorization` 是否存在

### 代理返回 500 错误

检查日志：
- Node Functions 日志
- 网络连接是否正常
- APNs 服务器是否可达

### APNs 返回 403 Forbidden

- JWT token 可能过期或无效
- 检查 Key ID 和 Team ID 是否正确
- 检查私钥是否正确

### APNs 返回 400 BadDeviceToken

- 设备 token 格式不正确
- 设备 token 可能已过期
- 环境不匹配（生产/沙盒）

## 性能优化

### JWT Token 缓存

Edge Functions 会自动缓存 JWT token 50 分钟：

```typescript
// src/apns/jwt.ts
let cachedToken: string | null = null;
let tokenExpiry: number = 0;

export async function getToken(...): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken; // 使用缓存
  }
  // 生成新 token
}
```

### 连接复用

Node Functions 会自动复用 HTTP/2 连接（如果实例保持活跃）。

### 监控建议

监控以下指标：
- 代理响应时间（目标：< 100ms）
- 代理失败率（目标：< 0.1%）
- APNs 返回的 statusCode 分布
- Node Functions 冷启动频率

## 成本估算

假设每天 10,000 次推送：

| 项目 | 成本 |
|------|------|
| Node Functions 请求 | 10,000 × 单价 |
| Edge Functions 请求 | 10,000 × 单价（通常更便宜） |
| KV 读取 | 10,000 × 单价 |

**优化建议**：
- 批量推送可以减少请求次数
- KV 缓存可以减少数据库查询
