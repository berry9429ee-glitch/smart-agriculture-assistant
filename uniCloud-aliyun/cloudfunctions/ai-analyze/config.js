'use strict';

// 生产环境请在 uniCloud 控制台配置环境变量 AI_API_KEY
module.exports = {
  get apiUrl() {
    return process.env.AI_API_URL || 'https://api.deepseek.com/v1/chat/completions';
  },
  get apiKey() {
    return process.env.AI_API_KEY || '';
  },
  get model() {
    return process.env.AI_MODEL || 'deepseek-chat';
  }
};
