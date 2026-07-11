# 智慧农业助手

这是一个基于 uni-app 的微信小程序项目，主要功能包括环境监测、智能选苗、病害检测和微信/手机号登录。

## 项目架构

前端采用 `pages -> services -> domain/core` 的单向依赖：

- 页面负责交互和展示，不直接调用云函数。
- 服务层统一处理登录会话、设备访问、AI、短信和文件上传。
- 领域层负责传感器规范化、趋势预测和生长评估，可脱离 uni-app 运行时测试。
- uniCloud 云函数保存第三方密钥，并代理微信、OneNET、AI 和短信服务。

完整的数据流、目录职责和扩展约定见 [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)。

## 推荐运行方式

1. 使用 HBuilderX 打开项目根目录。
2. 运行到微信开发者工具进行调试。
3. 如果使用命令行，则执行 `npm run build:mp-weixin`，生成 `dist/wechat-clean`。

`miniprogram/` 是微信云开发 QuickStart 示例目录，不是本项目正式源码。

## 命令行构建

已补充 npm scripts：

```bash
npm install
npm run dev:mp-weixin
npm run build:mp-weixin
npm test
```

命令行构建需要安装 uni-app Vue3/Vite 相关依赖。当前脚本已显式设置 `UNI_INPUT_DIR` 和 `UNI_OUTPUT_DIR`，会输出到干净目录 `dist/wechat-clean`，避免旧的微信云开发 QuickStart 文件残留。

## GitHub 使用方式

本项目支持两种使用方式，方便开源展示和真实部署分开：

### 1. 无密钥演示模式

适合公开仓库用户快速体验页面和核心流程。

1. 克隆项目并安装依赖：

```bash
npm install
```

2. 使用 HBuilderX 打开项目，或执行：

```bash
npm run dev:mp-weixin
```

3. 在微信开发者工具中运行后，登录页点击“游客体验”。

游客体验会使用本地模拟数据，不需要微信 AppSecret、OneNET、AI API Key 或短信服务。相关开关在 `config/index.js` 中：

```js
ENABLE_DEMO_LOGIN: true
```

真实接入时可以把它改为 `false`，避免对外展示游客入口。

### 2. 真实服务模式

适合接入自己的微信小程序、uniCloud、OneNET 和 AI 服务。

1. 在微信开发者工具 / HBuilderX 中替换自己的小程序 AppID。
2. 创建并关联 uniCloud 服务空间。
3. 部署 `uniCloud-aliyun/database` 下的数据库表结构。
4. 部署 `uniCloud-aliyun/cloudfunctions` 下的云函数。
5. 在 uniCloud 云函数环境变量中配置 `.env.example` 里列出的变量。
6. 重新运行或构建小程序。

真实 API Key 只放在 uniCloud 后台环境变量里，不能写入前端代码，也不能提交到 GitHub。

## uniCloud 环境变量

使用真实服务时，需要在 uniCloud 云函数环境变量中配置真实密钥。前端代码不能保存这些值。

本项目的 AI 能力采用“前端 → uniCloud 云函数 → 第三方 AI API”的调用链路：

- 小程序前端只调用 `ai-analyze`、`pest-detect` 等云函数。
- 真实 API Key 只配置在 uniCloud 云函数环境变量中，不写入 GitHub，也不会打包进小程序客户端。
- 仓库中只保留 `.env.example` 占位符，用于说明需要配置哪些变量。
- 如果发现密钥曾经写入本地文件、截图、构建产物或提交历史，应立即在对应平台后台轮换密钥。

微信登录：

- `WECHAT_APPID`
- `WECHAT_APPSECRET`
- `TOKEN_SECRET`

OneNet 设备数据：

- `ONENET_PRODUCT_ID`
- `ONENET_DEVICE_NAME`
- `ONENET_ACCESS_KEY`
- `ONENET_RESOURCE`，可选，默认 `products/${ONENET_PRODUCT_ID}`

AI 分析，可选：

- `AI_API_URL`
- `AI_API_KEY`
- `AI_MODEL`

病害识别：

- `VISION_API_URL`，可选，默认智谱视觉接口
- `VISION_API_KEY`
- `VISION_MODEL`，可选，默认 `glm-4v-flash`

腾讯短信登录，当前前端默认关闭。开通腾讯云短信并完成签名/模板审核后，可配置：

- `SMS_PROVIDER=tencent`
- `TENCENTCLOUD_SECRET_ID`
- `TENCENTCLOUD_SECRET_KEY`
- `TENCENT_SMS_SDK_APP_ID`
- `TENCENT_SMS_SIGN_NAME`
- `TENCENT_SMS_TEMPLATE_ID`

开发时可临时配置：

- `SMS_MOCK_MODE=true`
- `SMS_DEBUG_RETURN_CODE=true`，仅开发调试使用
- `SMS_FIXED_CODE`，可选

启用手机号登录前必须关闭 `SMS_MOCK_MODE` 和 `SMS_DEBUG_RETURN_CODE`，并把 `config/index.js` 中的 `ENABLE_PHONE_LOGIN` 改为 `true` 后重新构建。
