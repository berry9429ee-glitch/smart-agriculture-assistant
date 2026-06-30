// Runtime configuration shared by pages and utilities.
// Secrets must live in uniCloud environment variables, never in this file.
const config = {
  USE_MOCK: false,
  USE_SMS_MOCK: false,
  ENABLE_DEMO_LOGIN: true,
  ENABLE_PHONE_LOGIN: false,
  // AI 服务独立开关 — 设为 false 走真实 DeepSeek AI
  USE_AI_MOCK: false,
  CLOUD_FUNCTIONS: {
    deviceProperty: 'get-device-property',
    aiAnalyze: 'ai-analyze',
    pestDetect: 'pest-detect',
    sendSms: 'send-sms',
    login: 'login'
  }
};

export default config;
