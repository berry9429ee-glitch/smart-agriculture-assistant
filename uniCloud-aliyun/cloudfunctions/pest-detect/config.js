'use strict';

// GLM-4V-Flash — 智谱视觉模型，国内直连无需代理。
// 生产环境请在 uniCloud 控制台配置环境变量 VISION_API_KEY
const ZHIPU_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';

module.exports = {
  get apiUrl() {
    return process.env.VISION_API_URL || ZHIPU_URL;
  },
  get apiKey() {
    return process.env.VISION_API_KEY || '';
  },
  get model() {
    return process.env.VISION_MODEL || 'glm-4v-flash';
  },
  get temperature() {
    return Number(process.env.VISION_TEMPERATURE || 0.2);
  },
  get maxTokens() {
    return Number(process.env.VISION_MAX_TOKENS || 900);
  }
};
