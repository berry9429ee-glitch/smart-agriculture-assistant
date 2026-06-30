'use strict';

const config = require('./config.js');

function getVisionConfig() {
  return {
    apiUrl: config.apiUrl,
    apiKey: config.apiKey,
    model: config.model,
    temperature: config.temperature,
    maxTokens: config.maxTokens
  };
}

async function getImageUrl(fileID) {
  const res = await uniCloud.getTempFileURL({
    fileList: [fileID]
  });
  const item = res.fileList && res.fileList[0];
  const url = item && (item.tempFileURL || item.url);

  if (!url) {
    throw new Error('获取图片临时访问地址失败');
  }

  return url;
}

function getImageSource(event = {}) {
  if (event.imageBase64) {
    const mimeType = event.mimeType || 'image/jpeg';
    const cleanBase64 = String(event.imageBase64).replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '');
    return {
      imageUrl: `data:${mimeType};base64,${cleanBase64}`,
      displayUrl: '',
      fileID: '',
      source: 'base64'
    };
  }

  if (!event.fileID) {
    throw new Error('缺少图片 fileID');
  }

  return {
    fileID: event.fileID,
    source: 'cloud'
  };
}

function extractJson(text = '') {
  const clean = String(text)
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim();

  try {
    return JSON.parse(clean);
  } catch (err) {
    const match = clean.match(/\{[\s\S]*\}/);
    if (!match) throw err;
    return JSON.parse(match[0]);
  }
}

function normalizeBoolean(value) {
  if (typeof value === 'boolean') return value;
  const text = String(value || '').toLowerCase();
  return ['true', 'yes', '1', '是', '有', '发现'].some((item) => text.includes(item));
}

function normalizeResult(parsed, rawText, imageUrl, fileID, displayUrl = imageUrl) {
  const hasPest = normalizeBoolean(parsed.hasPest ?? parsed.hasDisease ?? parsed.detected);
  const pestName = parsed.pestName || parsed.diseaseName || parsed.name || (hasPest ? '疑似病虫害' : '健康');
  const severity = parsed.severity || parsed.level || (hasPest ? '中等' : '健康');
  const confidence = Number(parsed.confidence ?? parsed.score ?? 0);
  const suggestion = parsed.suggestion || parsed.advice || parsed.treatment || (hasPest ? '建议隔离观察，并请农技人员复核。' : '继续保持正常养护和巡检。');

  return {
    success: true,
    hasPest,
    pestName,
    severity,
    confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(100, Math.round(confidence))) : 0,
    suggestion,
    symptoms: parsed.symptoms || '',
    treatment: parsed.treatment || suggestion,
    prevention: parsed.prevention || '',
    rawAnalysis: parsed.rawAnalysis || rawText,
    imageURL: displayUrl || '',
    imagePath: displayUrl || '',
    fileID,
    source: 'vision-ai',
    timestamp: new Date().toISOString()
  };
}

async function analyzeWithVisionModel({ imageUrl, displayUrl, fileID }) {
  const config = getVisionConfig();
  if (!config.apiKey) {
    throw new Error('请在 pest-detect 云函数环境变量中配置 VISION_API_KEY');
  }

  const prompt = [
    '你是一位专业的作物病虫害图像识别专家。',
    '请观察图片中的植物、叶片、茎秆、病斑、虫害痕迹和整体生长状态。',
    '只返回严格 JSON，不要返回 Markdown，不要额外解释。',
    'JSON 字段：',
    '{',
    '  "hasPest": boolean,',
    '  "pestName": "病害或虫害名称；健康则填健康",',
    '  "severity": "健康/轻微/中等/严重",',
    '  "confidence": 0-100,',
    '  "symptoms": "可见症状",',
    '  "suggestion": "一句话处理建议",',
    '  "treatment": "具体防治措施",',
    '  "prevention": "后续预防建议"',
    '}'
  ].join('\n');

  const response = await uniCloud.httpclient.request(config.apiUrl, {
    method: 'POST',
    dataType: 'json',
    contentType: 'json',
    timeout: Number(process.env.VISION_REQUEST_TIMEOUT || 45000),
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json'
    },
    data: {
      model: config.model,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: imageUrl
              }
            },
            {
              type: 'text',
              text: prompt
            }
          ]
        }
      ],
      temperature: config.temperature,
      max_tokens: config.maxTokens
    }
  });

  const body = response.data || {};
  const text = body.choices && body.choices[0] && body.choices[0].message && body.choices[0].message.content;

  if (!text) {
    throw new Error(body.message || body.error?.message || 'AI 没有返回分析结果');
  }

  return normalizeResult(extractJson(text), text, imageUrl, fileID, displayUrl);
}

exports.main = async (event = {}, context) => {
  try {
    const source = getImageSource(event);
    const imageUrl = source.imageUrl || await getImageUrl(source.fileID);

    return await analyzeWithVisionModel({
      imageUrl,
      displayUrl: Object.prototype.hasOwnProperty.call(source, 'displayUrl') ? source.displayUrl : imageUrl,
      fileID: source.fileID
    });
  } catch (err) {
    return {
      success: false,
      message: err.message || '病害识别失败'
    };
  }
};
