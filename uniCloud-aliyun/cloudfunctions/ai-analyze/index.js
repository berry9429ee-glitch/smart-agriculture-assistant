'use strict';

const config = require('./config.js');

// DeepSeek OpenAI 兼容接口 — 已在 config.js 中配置
// 切换到其他 AI（通义千问/Gemini/Ollama）只需修改 config.js 或环境变量

function localSoilAdvice(soilData = {}) {
  const ph = Number(soilData.ph);
  const moisture = Number(soilData.moisture);
  const temperature = Number(soilData.temperature);
  const notes = [];

  if (!Number.isNaN(ph)) {
    if (ph < 5.5) notes.push('土壤偏酸，建议少量施用石灰或更换部分基质。');
    else if (ph > 7.5) notes.push('土壤偏碱，可补充腐殖质或酸性调理剂。');
    else notes.push('pH 值处于适宜区间。');
  }
  if (!Number.isNaN(moisture)) {
    if (moisture < 40) notes.push('湿度偏低，需提高浇水频率并保持基质湿润。');
    else if (moisture > 80) notes.push('湿度偏高，应减少浇水并加强通风。');
    else notes.push('土壤湿度较适宜。');
  }
  if (!Number.isNaN(temperature)) {
    if (temperature < 15) notes.push('温度偏低，幼苗应注意保温。');
    else if (temperature > 30) notes.push('温度偏高，建议遮阴降温。');
    else notes.push('温度适合发财树幼苗生长。');
  }

  return `基础模型分析：${notes.join('')} 选苗建议选择株高15-20cm、叶色浓绿、根系完整且无病斑的幼苗；后续保持散射光、通风和见干见湿的浇水节奏。`;
}

async function callOpenAICompatible(event) {
  const apiKey = config.apiKey;
  const apiUrl = config.apiUrl;
  const model = config.model;

  if (!apiKey) {
    return null;
  }

  const res = await uniCloud.httpclient.request(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    data: {
      model,
      messages: [
        { role: 'system', content: event.systemPrompt || '你是一位专业农业助手。' },
        { role: 'user', content: event.userMessage || '' }
      ],
      temperature: 0.7,
      max_tokens: 1000
    },
    dataType: 'json',
    timeout: 30000
  });

  return res.data?.choices?.[0]?.message?.content || '';
}

exports.main = async (event = {}, context) => {
  try {
    const cloudText = await callOpenAICompatible(event);
    const analysis = cloudText || localSoilAdvice(event.soilData);

    return {
      success: true,
      analysis,
      timestamp: new Date().toISOString(),
      source: cloudText ? 'cloud-ai' : 'local-rule'
    };
  } catch (err) {
    return {
      success: false,
      message: err.message || 'AI 分析失败'
    };
  }
};
