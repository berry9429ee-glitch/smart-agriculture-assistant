import config from '@/config/index.js';

export const AI_CONFIG = {
  USE_MOCK: config.USE_AI_MOCK,
  cloudFunction: config.CLOUD_FUNCTIONS.aiAnalyze
};

class CloudAIService {
  async chat(systemPrompt, userMessage, extra = {}) {
    if (typeof uniCloud === 'undefined' || !uniCloud.callFunction) {
      throw new Error('当前环境不支持 uniCloud');
    }

    const { result } = await uniCloud.callFunction({
      name: AI_CONFIG.cloudFunction,
      data: {
        systemPrompt,
        userMessage,
        ...extra
      }
    });

    if (!result || result.success === false) {
      throw new Error(result?.message || 'AI 云函数调用失败');
    }

    return result.analysis || result.content || result.data?.analysis || '';
  }
}

class AIService {
  constructor() {
    this.cloudService = new CloudAIService();
  }

  async analyzeSoil(soilData, onMessage = null) {
    const systemPrompt = `你是一位专业的农业专家，擅长发财树种植和幼苗选育。
请根据提供的土壤数据，分析是否适合培育优质发财树幼苗，并给出专业的种植建议。
回答要简洁专业，控制在300字以内，包含以下方面：
1. 土壤条件评估
2. 需要调整的参数
3. 选苗建议
4. 养护注意事项`;

    const userMessage = `当前土壤数据：
- pH值: ${soilData.ph}
- 湿度: ${soilData.moisture}%
- 温度: ${soilData.temperature}°C
- 土壤状态: ${soilData.status}

请分析当前土壤条件是否适合发财树幼苗生长，并给出具体建议。`;

    return this.chat(systemPrompt, userMessage, onMessage, {
      type: 'soil',
      soilData
    });
  }

  async analyzePest(description, onMessage = null) {
    const systemPrompt = `你是一位专业的植物病虫害专家。
请根据用户描述的症状，分析可能的病虫害类型，并给出防治建议。
回答要专业简洁，控制在200字以内。`;

    return this.chat(systemPrompt, description, onMessage, { type: 'pest-text' });
  }

  async chat(systemPrompt, userMessage, onMessage = null, extra = {}) {
    if (AI_CONFIG.USE_MOCK) {
      return this.mockChat(userMessage);
    }
    return this.cloudService.chat(systemPrompt, userMessage, extra);
  }

  mockChat(message) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(`模拟 AI 回复。\n\n您的问题: ${String(message).substring(0, 30)}...\n\n建议：土壤条件良好，适合种植。`);
      }, 1000);
    });
  }
}

export default new AIService();
