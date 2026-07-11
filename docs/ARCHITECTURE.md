# 项目架构

## 1. 总览

智慧农业助手采用 uni-app Vue 3 构建前端，以 uniCloud 云函数承载登录、设备访问和 AI 请求。前端按照单向依赖组织：

```text
pages -> services -> domain/core -> uniCloud / local storage
```

- `pages/`：页面展示、交互状态和导航，不直接调用云函数。
- `services/`：业务用例与外部服务编排，包括登录、设备、AI、短信和文件处理。
- `domain/`：不依赖 uni-app 运行时的纯业务规则，可直接单元测试。
- `core/`：云函数客户端、本地存储等基础能力。
- `uniCloud-aliyun/`：可信服务端边界，第三方密钥只存在于云函数环境变量。

## 2. 核心数据流

### 登录

```text
登录页 -> auth-service -> login 云函数 -> users 表
                         -> session-service -> 本地会话
```

微信登录和手机号登录最终都通过 `session-service` 写入统一会话。页面不再分别维护 `token`、`userInfo` 和 `demo_mode`。

### 设备监测

```text
监测页 -> device-service -> get-device-property 云函数 -> OneNET
                        -> sensor-data 规范化
```

OneNET 返回的 `temp`、`moi`、`PH` 等字段只在服务边界被解析。页面统一使用：

```js
{
  temperature,
  moisture,
  ph,
  ec,
  nitrogen,
  phosphorus,
  potassium,
  light
}
```

更换设备平台时只需新增适配逻辑，不需要修改页面。

### AI 与图片识别

```text
选苗页 -> ai-service -> ai-analyze 云函数 -> AI API / 本地规则兜底
病害页 -> pest-service -> 云存储或 Base64 -> pest-detect 云函数 -> 视觉 API
```

前端只接收规范化结果，不持有任何第三方 API Key。选苗结果同时返回 `source`，用于区分云端 AI、本地规则和演示规则。

## 3. 演示模式

演示模式通过 `session-service.isDemoMode()` 统一判定。设备、AI 和病害服务在入口处选择真实实现或 `demo-service`，页面不包含散落的模拟分支。

该设计保证公开仓库在无密钥时仍能运行，同时真实模式沿用同一页面与领域模型。

## 4. 领域规则

- `sensor-data.js`：传感器字段规范化、阈值告警、土壤快照。
- `trend-predictor.js`：历史窗口、趋势预测和置信度估算。
- `growth-evaluation.js`：按作物和生长阶段计算动态评分与建议。

这些模块不访问 `uni` 或 `uniCloud`，因此可以使用 Node.js 内置测试框架验证。

## 5. 安全边界

- 微信 AppSecret、OneNET Access Key、AI Key 和短信密钥只配置在 uniCloud 环境变量。
- 设备 Access Key 在数据库中使用 AES-256-GCM 加密保存。
- 前端仓库只保留 `.env.example` 占位说明。
- 所有云函数响应由 `core/cloud-client.js` 统一检查，页面不直接信任原始响应。

## 6. 扩展约定

新增功能时遵循以下顺序：

1. 在 `domain/` 定义纯数据模型或规则。
2. 在 `services/` 编排云函数、存储和领域规则。
3. 页面仅调用服务并渲染结果。
4. 为领域规则和响应边界补充测试。

不要在页面中直接新增 `uniCloud.callFunction`、第三方字段映射或密钥配置。

## 7. 验证命令

```bash
npm test
npm run build:mp-weixin
```

测试覆盖云函数响应、传感器规范化、趋势预测和生长评估。微信小程序构建用于验证 uni-app 条件编译与页面依赖是否完整。
