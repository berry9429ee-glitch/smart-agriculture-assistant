import config from '../config/index.js';
import { callCloudFunction } from '../core/cloud-client.js';
import { analyzeDemoSoil } from './demo-service.js';
import sessionService from './session-service.js';

const SOURCE_LABELS = Object.freeze({
  'cloud-ai': '云端 AI',
  'local-rule': '本地规则',
  'demo-rule': '演示规则'
});

function normalizeAnalysisResult(result) {
  const analysis = result.analysis || result.content || result.data?.analysis || '';
  if (!analysis) throw new Error('AI 未返回分析内容');
  const source = result.source || 'cloud-ai';
  return {
    analysis,
    source,
    sourceLabel: SOURCE_LABELS[source] || 'AI 分析',
    timestamp: result.timestamp || new Date().toISOString()
  };
}

export async function chat(systemPrompt, userMessage, extra = {}) {
  const result = await callCloudFunction(config.CLOUD_FUNCTIONS.aiAnalyze, {
    systemPrompt,
    userMessage,
    ...extra
  }, { fallbackMessage: 'AI 分析失败' });
  return normalizeAnalysisResult(result);
}

export async function analyzeSoil(soilData) {
  if (config.USE_AI_MOCK === true || sessionService.isDemoMode()) {
    return analyzeDemoSoil(soilData);
  }

  const systemPrompt = [
    '你是一位专业农业专家，擅长幼苗选育和土壤管理。',
    '请根据土壤数据评估幼苗生长条件，并给出简洁、可执行的建议。',
    '回答包含土壤条件、参数调整、选苗和养护四个方面，控制在 500 字以内。'
  ].join('\n');
  const userMessage = [
    `pH 值：${soilData.ph}`,
    `湿度：${soilData.moisture}%`,
    `温度：${soilData.temperature}°C`,
    `土壤状态：${soilData.status}`
  ].join('\n');

  return chat(systemPrompt, userMessage, { type: 'soil', soilData });
}

export async function analyzePestText(description) {
  const systemPrompt = '你是一位植物病虫害专家。请根据症状描述分析可能类型，并给出简洁、可执行的防治建议。';
  return chat(systemPrompt, description, { type: 'pest-text' });
}

export default { chat, analyzeSoil, analyzePestText };
